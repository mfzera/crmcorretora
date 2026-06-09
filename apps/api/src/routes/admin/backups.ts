import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db } from '@ecotech/shared/database';
import { backups, backupSchedules, corretoras } from '@ecotech/shared/database';
import { BackupService } from '@ecotech/shared/storage';
import { eq, desc, and, gte, count, sum, lt } from 'drizzle-orm';

// Backups marcados em_progresso há mais que este limite são considerados
// órfãos (worker crashou) e reclassificados como 'falhou' ao consultar.
const BACKUP_STUCK_TIMEOUT_MS = 30 * 60 * 1000;

async function markStuckBackupsAsFailed(): Promise<void> {
  const cutoff = new Date(Date.now() - BACKUP_STUCK_TIMEOUT_MS);
  await db
    .update(backups)
    .set({
      status: 'falhou',
      finalizadoEm: new Date(),
      erro: 'Timeout: backup presumivelmente abandonado (worker inativo)',
    })
    .where(and(eq(backups.status, 'em_progresso'), lt(backups.iniciadoEm, cutoff)));
}

// fast-json-stringify serializa Date como {} em schemas genéricos { type: 'object' }.
// Esta função converte todos os campos Date para ISO string antes de retornar.
function serializeBackup(backup: Record<string, any>) {
  const dateFields = ['iniciadoEm', 'finalizadoEm', 'verificadoEm'];
  const out: Record<string, any> = { ...backup };
  for (const field of dateFields) {
    if (out[field] instanceof Date) out[field] = out[field].toISOString();
    else if (out[field] == null) out[field] = null;
  }
  // Garante que campos numéricos nulos virem 0 e não undefined
  out.totalArquivos = out.totalArquivos ?? 0;
  out.totalBytes = out.totalBytes ?? 0;
  out.arquivosNovos = out.arquivosNovos ?? 0;
  return out;
}

const backupsRoutes: FastifyPluginAsyncZod = async (fastify) => {
  // GET /api/admin/backups - Listar todos os backups
  fastify.get(
    '/backups',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Listar backups do sistema',
        description:
          'Lista todos os backups criados, com opções de filtro por tipo (incremental/completo), status e limite de resultados. Inclui nome do tenant e ordenação por data mais recente.',
        querystring: z.object({
          tipo: z.enum(['incremental', 'completo']).optional(),
          status: z.enum(['em_progresso', 'concluido', 'falhou']).optional(),
          limit: z.coerce.number().min(1).max(200).default(50),
        }),
        response: {
          200: z.object({
            backups: z.array(z.unknown()),
            total: z.number(),
          }),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['manage_backups', 'view_backups']),
    },
    async (request, reply) => {
      const { tipo, status, limit } = request.query;

      await markStuckBackupsAsFailed();

      const filters = [
        tipo ? eq(backups.tipo, tipo) : undefined,
        status ? eq(backups.status, status) : undefined,
      ].filter(Boolean);

      const whereClause = filters.length ? and(...(filters as any[])) : undefined;

      const rows = await db
        .select({ backup: backups, tenantName: corretoras.razaoSocial })
        .from(backups)
        .leftJoin(corretoras, eq(backups.corretoraId, corretoras.id))
        .where(whereClause as any)
        .orderBy(desc(backups.iniciadoEm))
        .limit(limit);

      const backupsWithTenantInfo = rows.map(({ backup, tenantName }) => ({
        ...backup,
        tenantName: tenantName || null,
      }));

      await fastify.auditService.logViewBackupList(
        request.admin!.id,
        request.admin!.email,
        request,
      );

      return {
        backups: backupsWithTenantInfo.map(serializeBackup),
        total: backupsWithTenantInfo.length,
      };
    },
  );

  // POST /api/admin/backups - Criar um novo backup
  fastify.post(
    '/backups',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Criar novo backup',
        description:
          'Inicia processo de backup do sistema. Pode ser incremental (apenas mudanças) ou completo (tudo). Opcionalmente específico para um tenant. Registra ação em audit log.',
        body: z.object({
          tipo: z.enum(['incremental', 'completo']),
          corretoraId: z.string().uuid().optional(),
          descricao: z.string().max(500).optional(),
        }),
        response: {
          200: z.object({
            backup: z.unknown(),
            neonBranch: z.unknown().nullable(),
            message: z.string(),
          }),
          400: z.object({ error: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['manage_backups']),
    },
    async (request, reply) => {
      const { tipo, corretoraId, descricao } = request.body;

      // Validar tipo de backup (schema já garante enum válido, esta é uma guarda extra)
      /* v8 ignore next 3 */
      if (!['incremental', 'completo'].includes(tipo)) {
        return reply.status(400).send({ error: 'Tipo de backup inválido' });
      }

      // Se corretoraId for fornecido, verificar se existe
      if (corretoraId) {
        const [corretora] = await db
          .select()
          .from(corretoras)
          .where(eq(corretoras.id, corretoraId));

        if (!corretora) {
          return reply.status(404).send({ error: 'Tenant não encontrado' });
        }
      }

      // Criar backup de arquivos (R2)
      const backup = await BackupService.createBackup({
        tipo,
        corretoraId: corretoraId || undefined,
      });

      // Backup completo também snapshot do banco via Neon branch.
      // Só para backup global (sem corretoraId) — branch Neon é do projeto todo.
      let neonBranch: Awaited<ReturnType<typeof BackupService.createDatabaseBackup>> = null;
      if (tipo === 'completo' && !corretoraId) {
        try {
          neonBranch = await BackupService.createDatabaseBackup();
        } catch (err: any) {
          request.log.error({ err }, 'Falha ao criar branch Neon no backup manual');
        }
      }

      // Log de auditoria
      await fastify.auditService.logBackupCreated(
        request.admin!.id,
        request.admin!.email,
        backup.backupId,
        tipo,
        corretoraId || null,
        request,
      );

      return {
        backup,
        neonBranch,
        message: neonBranch
          ? 'Backup iniciado (arquivos + branch Neon criada)'
          : 'Backup iniciado com sucesso',
      };
    },
  );

  // POST /api/admin/backups/:id/verify - Verificar integridade de um backup
  fastify.post(
    '/backups/:id/verify',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Verificar integridade de backup',
        description:
          'Executa verificação de integridade em um backup concluído. Valida checksums e estrutura de arquivos. Atualiza status de verificação no registro. Requer backup em status concluído.',
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          200: z.object({
            backupId: z.string(),
            isValid: z.boolean(),
            message: z.string(),
          }),
          400: z.object({ error: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['manage_backups']),
    },
    async (request, reply) => {
      const { id } = request.params;

      // Verificar se o backup existe
      const [backup] = await db
        .select()
        .from(backups)
        .where(eq(backups.id, id));

      if (!backup) {
        return reply.status(404).send({ error: 'Backup não encontrado' });
      }

      if (backup.status !== 'concluido') {
        return reply
          .status(400)
          .send({ error: 'Apenas backups concluídos podem ser verificados' });
      }

      // Verificar backup
      const isValid = await BackupService.verifyBackup(id);

      // Log de auditoria
      await fastify.auditService.logBackupVerified(
        request.admin!.id,
        request.admin!.email,
        id,
        isValid,
        request,
      );

      return {
        backupId: id,
        isValid,
        /* v8 ignore next 3 */
        message: isValid
          ? 'Backup verificado com sucesso'
          : 'Backup corrompido ou inválido',
      };
    },
  );

  // POST /api/admin/backups/:id/restore - Restaurar um backup
  fastify.post(
    '/backups/:id/restore',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Restaurar backup',
        description:
          'Restaura dados de um backup verificado. OPERAÇÃO CRÍTICA que sobrescreve dados atuais. Requer header X-Confirm-Restore: RESTAURAR com o ID do backup. Registra ação em audit log.',
        params: z.object({
          id: z.string().uuid(),
        }),
        headers: z.object({
          'x-confirm-restore': z.string(),
        }),
        response: {
          200: z.object({
            backupId: z.string(),
            message: z.string(),
          }),
          400: z.object({ error: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['manage_backups']),
    },
    async (request, reply) => {
      const { id } = request.params;

      const confirmHeader = request.headers['x-confirm-restore'];
      if (confirmHeader !== id) {
        return reply.status(400).send({
          error: `Restauração requer o header X-Confirm-Restore com o ID do backup (${id})`,
        });
      }

      // Verificar se o backup existe
      const [backup] = await db
        .select()
        .from(backups)
        .where(eq(backups.id, id));

      if (!backup) {
        return reply.status(404).send({ error: 'Backup não encontrado' });
      }

      if (backup.status !== 'concluido') {
        return reply
          .status(400)
          .send({ error: 'Apenas backups concluídos podem ser restaurados' });
      }

      if (!backup.verificado) {
        return reply.status(400).send({
          error:
            'Backup não foi verificado. Execute a verificação antes de restaurar',
        });
      }

      await BackupService.restoreBackup(backup.id);

      // Log de auditoria
      await fastify.auditService.logBackupRestored(
        request.admin!.id,
        backup.id,
        backup.corretoraId || undefined,
        request,
      );

      return {
        backupId: id,
        message: 'Restauração de backup concluída com sucesso',
      };
    },
  );

  // GET /api/admin/backups/stats - Resumo de saúde dos backups
  fastify.get(
    '/backups/stats',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Estatísticas de backup',
        description: 'Retorna resumo de saúde: último backup de cada tipo, falhas recentes, storage total e próximas execuções.',
        response: {
          200: z.unknown(),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['manage_backups', 'view_backups']),
    },
    async (request, reply) => {
      await markStuckBackupsAsFailed();

      const agora = new Date();
      const sete_dias_atras = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000);

      const [ultimoIncremental, ultimoCompleto, falhas7dRow, incrementaisBytesRow] = await Promise.all([
        db.query.backups.findFirst({
          where: and(eq(backups.tipo, 'incremental'), eq(backups.status, 'concluido')),
          orderBy: [desc(backups.iniciadoEm)],
        }),
        db.query.backups.findFirst({
          where: and(eq(backups.tipo, 'completo'), eq(backups.status, 'concluido')),
          orderBy: [desc(backups.iniciadoEm)],
        }),
        db
          .select({ falhas7d: count(backups.id) })
          .from(backups)
          .where(and(eq(backups.status, 'falhou'), gte(backups.iniciadoEm, sete_dias_atras))),
        // Backups completos usam prefixo fixo (sobrescritos in-place) — só o último conta.
        // Somamos apenas os incrementais, que têm prefixo único por timestamp.
        db
          .select({ total: sum(backups.totalBytes) })
          .from(backups)
          .where(and(eq(backups.status, 'concluido'), eq(backups.tipo, 'incremental'))),
      ]);

      // Próximo incremental: hoje 02:00 se ainda não passou, senão amanhã 02:00.
      const proximoIncremental = new Date(agora);
      proximoIncremental.setHours(2, 0, 0, 0);
      if (proximoIncremental.getTime() <= agora.getTime()) {
        proximoIncremental.setDate(proximoIncremental.getDate() + 1);
      }

      // Próximo completo: próximo domingo 03:00, inclusive hoje se ainda não passou.
      const proximoCompleto = new Date(agora);
      proximoCompleto.setHours(3, 0, 0, 0);
      const diasParaDomingo = (7 - proximoCompleto.getDay()) % 7;
      proximoCompleto.setDate(proximoCompleto.getDate() + diasParaDomingo);
      if (proximoCompleto.getTime() <= agora.getTime()) {
        proximoCompleto.setDate(proximoCompleto.getDate() + 7);
      }

      return {
        ultimoIncremental: ultimoIncremental
          ? serializeBackup({
              id: ultimoIncremental.id,
              status: ultimoIncremental.status,
              iniciadoEm: ultimoIncremental.iniciadoEm,
              finalizadoEm: ultimoIncremental.finalizadoEm,
              totalArquivos: ultimoIncremental.totalArquivos,
              totalBytes: ultimoIncremental.totalBytes,
              duracaoSegundos: ultimoIncremental.duracaoSegundos,
              erro: ultimoIncremental.erro,
            })
          : null,
        ultimoCompleto: ultimoCompleto
          ? serializeBackup({
              id: ultimoCompleto.id,
              status: ultimoCompleto.status,
              iniciadoEm: ultimoCompleto.iniciadoEm,
              finalizadoEm: ultimoCompleto.finalizadoEm,
              totalArquivos: ultimoCompleto.totalArquivos,
              totalBytes: ultimoCompleto.totalBytes,
              duracaoSegundos: ultimoCompleto.duracaoSegundos,
              erro: ultimoCompleto.erro,
            })
          : null,
        falhas7d: Number(falhas7dRow[0]?.falhas7d ?? 0),
        // Storage real = último completo (prefixo fixo) + soma de todos os incrementais (prefixos únicos)
        totalBytesBackup:
          Number(ultimoCompleto?.totalBytes ?? 0) +
          Number(incrementaisBytesRow[0]?.total ?? 0),
        proximoIncremental: proximoIncremental.toISOString(),
        proximoCompleto: proximoCompleto.toISOString(),
      };
    },
  );

  // GET /api/admin/backups/neon-branches - Listar branches de backup do Neon
  fastify.get(
    '/backups/neon-branches',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Branches de backup Neon',
        description: 'Lista branches criadas pelo sistema de backup via Neon Branching API.',
        response: {
          200: z.unknown(),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['manage_backups', 'view_backups']),
    },
    async (request, reply) => {
      const projectId = process.env.NEON_PROJECT_ID;
      const apiKey = process.env.NEON_API_KEY;

      if (!projectId || !apiKey) {
        return { branches: [], configured: false };
      }

      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 10_000);
        let response: Response;
        try {
          response = await fetch(
            `https://console.neon.tech/api/v2/projects/${projectId}/branches`,
            { headers: { Authorization: `Bearer ${apiKey}` }, signal: controller.signal },
          );
        } finally {
          clearTimeout(timer);
        }

        if (!response.ok) {
          return { branches: [], configured: true, error: 'Erro ao consultar Neon API' };
        }

        const data = await response.json() as any;
        const backupBranches = (data.branches || [])
          .filter((b: any) => b.name?.startsWith('backup-'))
          .map((b: any) => ({
            id: b.id,
            name: b.name,
            createdAt: b.created_at,
            updatedAt: b.updated_at,
            logicalSize: b.logical_size,
          }))
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return { branches: backupBranches, configured: true };
      } catch (error: any) {
        return { branches: [], configured: true, error: error.message };
      }
    },
  );

  // GET /api/admin/backups/schedules - Listar agendamentos de backup
  fastify.get(
    '/backups/schedules',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Listar agendamentos de backup',
        description:
          'Retorna todos os agendamentos ativos de backup automático. Inclui frequência, tipo, último backup realizado e próximo backup programado.',
        response: {
          200: z.object({
            schedules: z.array(z.unknown()),
            total: z.number(),
          }),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['manage_backups', 'view_backups']),
    },
    async (request, reply) => {
      const schedules = await db
        .select()
        .from(backupSchedules)
        .where(eq(backupSchedules.ativo, true));

      // Buscar informações das corretoras
      const schedulesWithTenantInfo = await Promise.all(
        schedules.map(async (schedule) => {
          if (!schedule.corretoraId) {
            return { ...schedule, tenantName: null };
          }

          const [corretora] = await db
            .select({ nome: corretoras.razaoSocial })
            .from(corretoras)
            .where(eq(corretoras.id, schedule.corretoraId));

          return {
            ...schedule,
            /* v8 ignore next */
            tenantName: corretora?.nome || null,
          };
        }),
      );

      return {
        schedules: schedulesWithTenantInfo,
        total: schedulesWithTenantInfo.length,
      };
    },
  );

  // DELETE /api/admin/backups/:id - Deletar backup antigo
  fastify.delete(
    '/backups/:id',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Deletar backup antigo',
        description:
          'Remove backup do sistema e do armazenamento. Útil para gerenciar espaço de armazenamento de backups. Registra ação em audit log. Não pode ser desfeito.',
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          200: z.object({ message: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['manage_backups']),
    },
    async (request, reply) => {
      const { id } = request.params;

      // Verificar se o backup existe
      const [backup] = await db
        .select()
        .from(backups)
        .where(eq(backups.id, id));

      if (!backup) {
        return reply.status(404).send({ error: 'Backup não encontrado' });
      }

      await BackupService.deleteBackup(id);

      // Log de auditoria
      await fastify.auditService.logBackupDeleted(
        request.admin!.id,
        request.admin!.email,
        id,
        request,
      );

      return {
        message: 'Backup deletado com sucesso',
      };
    },
  );
};

export default backupsRoutes;
