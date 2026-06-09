import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import {
  db,
  corretoras,
  usuarios,
  auditLogs,
  subscriptions,
} from '@ecotech/shared/database';
import { storageClient, resolveStoredFileUrl } from '@ecotech/shared/storage';
import { requireAdmin } from '@ecotech/plugins/authorization';
import { ValidationError, NotFoundError } from '@ecotech/shared/utils';

const updateCorretoraSchema = z.object({
  nomeFantasia: z.string().trim().min(1).max(256).optional(),
  razaoSocial: z.string().trim().min(1).max(256).optional(),
  emailContato: z.string().trim().email().max(256).optional().nullable(),
  telefone: z.string().trim().max(20).optional().nullable(),
  cep: z
    .string()
    .trim()
    .regex(/^\d{8}$/, 'CEP deve conter 8 dígitos')
    .optional()
    .nullable(),
  logradouro: z.string().trim().max(256).optional().nullable(),
  numero: z.string().trim().max(20).optional().nullable(),
  complemento: z.string().trim().max(100).optional().nullable(),
  bairro: z.string().trim().max(100).optional().nullable(),
  cidade: z.string().trim().max(100).optional().nullable(),
  uf: z
    .string()
    .trim()
    .length(2)
    .toUpperCase()
    .optional()
    .nullable(),
});

type CorretoraUpdate = z.infer<typeof updateCorretoraSchema>;

const EDITABLE_FIELDS: Array<keyof CorretoraUpdate> = [
  'nomeFantasia',
  'razaoSocial',
  'emailContato',
  'telefone',
  'cep',
  'logradouro',
  'numero',
  'complemento',
  'bairro',
  'cidade',
  'uf',
];

const ALLOWED_LOGO_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2MB

function diffFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): { antes: Record<string, unknown>; depois: Record<string, unknown> } {
  const antes: Record<string, unknown> = {};
  const depois: Record<string, unknown> = {};
  for (const key of Object.keys(after)) {
    if (before[key] !== after[key]) {
      antes[key] = before[key] ?? null;
      depois[key] = after[key] ?? null;
    }
  }
  return { antes, depois };
}

async function recordCorretoraAudit(params: {
  corretoraId: string;
  usuarioId: string;
  acao: string;
  dadosAnteriores?: Record<string, unknown> | null;
  dadosNovos?: Record<string, unknown> | null;
  ipAddress?: string;
  userAgent?: string;
}) {
  const usuario = await db.query.usuarios.findFirst({
    where: eq(usuarios.id, params.usuarioId),
    columns: { nome: true, email: true },
  });

  await db.insert(auditLogs).values({
    corretoraId: params.corretoraId,
    usuarioId: params.usuarioId,
    usuarioNome: usuario?.nome ?? null,
    usuarioEmail: usuario?.email ?? null,
    acao: params.acao,
    entidade: 'corretora',
    entidadeId: params.corretoraId,
    dadosAnteriores: params.dadosAnteriores ?? null,
    dadosNovos: params.dadosNovos ?? null,
    ipAddress: params.ipAddress ?? null,
    userAgent: params.userAgent ?? null,
  });
}

function logoR2Key(corretoraId: string, fileName: string) {
  const ext = (fileName.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
  return `corretoras/${corretoraId}/branding/logo-${uuidv4()}.${ext || 'png'}`;
}

function validateLogoMagicBytes(buffer: Buffer, mimeType: string): void {
  if (buffer.length < 12) {
    throw new ValidationError('Arquivo de logo inválido');
  }
  const head = buffer.slice(0, 12).toString('hex').toUpperCase();
  const ok =
    (mimeType === 'image/png' && head.startsWith('89504E47')) ||
    (mimeType === 'image/jpeg' && /^FFD8FF/.test(head)) ||
    (mimeType === 'image/webp' &&
      head.startsWith('52494646') &&
      head.slice(16, 24) === '57454250');
  if (!ok) {
    throw new ValidationError(
      'Conteúdo do arquivo não corresponde ao tipo declarado',
    );
  }
}

const corretoraConfigRoutes: FastifyPluginAsyncZod = async function (fastify) {
  fastify.addHook('preHandler', fastify.authenticate);

  /**
   * GET /api/configuracoes/corretora
   * Retorna os dados completos da corretora ativa do usuário.
   */
  fastify.get(
    '/',
    {
      schema: {
        tags: ['Configurações - Corretora'],
        summary: 'Obter dados da corretora ativa',
      },
    },
    async (request, reply) => {
      const corretora = request.corretora;
      const [logoUrl, sub] = await Promise.all([
        resolveStoredFileUrl(corretora.logoUrl),
        db.query.subscriptions.findFirst({
          where: eq(subscriptions.corretoraId, corretora.id),
          columns: { modulosAtivos: true },
        }),
      ]);
      return reply.send({
        success: true,
        data: { ...corretora, logoUrl, modulosAtivos: sub?.modulosAtivos ?? ['crm'] },
      });
    },
  );

  /**
   * PATCH /api/configuracoes/corretora
   * Atualiza dados da corretora. Apenas administradores.
   */
  fastify.patch(
    '/',
    {
      schema: {
        tags: ['Configurações - Corretora'],
        summary: 'Atualizar dados da corretora',
      },
      preHandler: [requireAdmin()],
    },
    async (request, reply) => {
      const parsed = updateCorretoraSchema.parse(request.body ?? {});

      const updates: Record<string, unknown> = {};
      for (const field of EDITABLE_FIELDS) {
        if (parsed[field] !== undefined) {
          updates[field] = parsed[field];
        }
      }

      if (Object.keys(updates).length === 0) {
        throw new ValidationError('Nenhum campo para atualizar');
      }

      const corretoraId = request.corretora.id;

      const before = await db.query.corretoras.findFirst({
        where: eq(corretoras.id, corretoraId),
      });
      if (!before) throw new NotFoundError('Corretora');

      const [updated] = await db
        .update(corretoras)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(corretoras.id, corretoraId))
        .returning();

      const beforeSubset: Record<string, unknown> = {};
      const afterSubset: Record<string, unknown> = {};
      for (const key of Object.keys(updates)) {
        beforeSubset[key] = (before as any)[key] ?? null;
        afterSubset[key] = (updated as any)[key] ?? null;
      }

      const diff = diffFields(beforeSubset, afterSubset);

      if (Object.keys(diff.depois).length > 0) {
        await recordCorretoraAudit({
          corretoraId,
          usuarioId: request.user.sub,
          acao: 'corretora_atualizada',
          dadosAnteriores: diff.antes,
          dadosNovos: diff.depois,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        });
      }

      const logoUrl = await resolveStoredFileUrl(updated.logoUrl);
      return reply.send({
        success: true,
        data: { ...updated, logoUrl },
      });
    },
  );

  /**
   * POST /api/configuracoes/corretora/logo
   * Upload do logo da corretora. Apenas administradores.
   * Substitui o logo anterior (deleta do R2) e registra histórico.
   */
  fastify.post(
    '/logo',
    {
      schema: {
        tags: ['Configurações - Corretora'],
        summary: 'Upload do logo da corretora',
      },
      preHandler: [requireAdmin()],
    },
    async (request, reply) => {
      const corretoraId = request.corretora.id;

      const parts = request.parts();
      let fileBuffer: Buffer | null = null;
      let fileMime = '';
      let fileName = '';

      for await (const part of parts) {
        if (part.type === 'file') {
          fileBuffer = await part.toBuffer();
          fileMime = part.mimetype;
          fileName = part.filename;
          break;
        }
      }

      if (!fileBuffer) {
        throw new ValidationError('Nenhum arquivo enviado');
      }

      if (!ALLOWED_LOGO_MIME_TYPES.includes(fileMime)) {
        throw new ValidationError(
          `Tipo de arquivo não permitido: ${fileMime}. Aceitos: PNG, JPEG, WebP.`,
        );
      }
      if (fileBuffer.length > MAX_LOGO_SIZE) {
        throw new ValidationError(
          `Arquivo muito grande: máximo ${(MAX_LOGO_SIZE / 1024 / 1024).toFixed(0)}MB`,
        );
      }
      validateLogoMagicBytes(fileBuffer, fileMime);

      const before = await db.query.corretoras.findFirst({
        where: eq(corretoras.id, corretoraId),
        columns: { logoUrl: true },
      });

      const newKey = logoR2Key(corretoraId, fileName);
      await storageClient.upload(newKey, fileBuffer, fileMime);

      const [updated] = await db
        .update(corretoras)
        .set({ logoUrl: newKey, updatedAt: new Date() })
        .where(eq(corretoras.id, corretoraId))
        .returning();

      // Best-effort: remover o logo antigo do R2 se era uma chave nossa
      const previous = before?.logoUrl;
      if (previous && !/^https?:\/\//i.test(previous) && previous !== newKey) {
        try {
          await storageClient.delete(previous);
        } catch (err) {
          fastify.log.warn(
            { err, key: previous },
            'Falha ao remover logo antigo do R2',
          );
        }
      }

      await recordCorretoraAudit({
        corretoraId,
        usuarioId: request.user.sub,
        acao: 'logo_atualizado',
        dadosAnteriores: { logoUrl: previous ?? null },
        dadosNovos: { logoUrl: newKey },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });

      const logoUrl = await resolveStoredFileUrl(updated.logoUrl);
      return reply.send({
        success: true,
        data: { logoUrl },
      });
    },
  );

  /**
   * DELETE /api/configuracoes/corretora/logo
   * Remove o logo atual.
   */
  fastify.delete(
    '/logo',
    {
      schema: {
        tags: ['Configurações - Corretora'],
        summary: 'Remover logo da corretora',
      },
      preHandler: [requireAdmin()],
    },
    async (request, reply) => {
      const corretoraId = request.corretora.id;
      const before = await db.query.corretoras.findFirst({
        where: eq(corretoras.id, corretoraId),
        columns: { logoUrl: true },
      });

      if (!before?.logoUrl) {
        return reply.send({ success: true, data: { logoUrl: null } });
      }

      await db
        .update(corretoras)
        .set({ logoUrl: null, updatedAt: new Date() })
        .where(eq(corretoras.id, corretoraId));

      if (!/^https?:\/\//i.test(before.logoUrl)) {
        try {
          await storageClient.delete(before.logoUrl);
        } catch (err) {
          fastify.log.warn(
            { err, key: before.logoUrl },
            'Falha ao remover logo do R2',
          );
        }
      }

      await recordCorretoraAudit({
        corretoraId,
        usuarioId: request.user.sub,
        acao: 'logo_removido',
        dadosAnteriores: { logoUrl: before.logoUrl },
        dadosNovos: { logoUrl: null },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return reply.send({ success: true, data: { logoUrl: null } });
    },
  );

  /**
   * GET /api/configuracoes/corretora/historico
   * Lista o histórico de alterações da corretora ativa.
   */
  fastify.get(
    '/history',
    {
      schema: {
        tags: ['Configurações - Corretora'],
        summary: 'Histórico de alterações da corretora',
      },
      preHandler: [requireAdmin()],
    },
    async (request, reply) => {
      const corretoraId = request.corretora.id;
      const limitRaw = (request.query as { limit?: string })?.limit;
      const parsed = Number(limitRaw);
      const limit = Number.isFinite(parsed)
        ? Math.min(Math.max(Math.trunc(parsed), 1), 200)
        : 50;

      const logs = await db
        .select({
          id: auditLogs.id,
          acao: auditLogs.acao,
          usuarioId: auditLogs.usuarioId,
          usuarioNome: auditLogs.usuarioNome,
          usuarioEmail: auditLogs.usuarioEmail,
          dadosAnteriores: auditLogs.dadosAnteriores,
          dadosNovos: auditLogs.dadosNovos,
          ipAddress: auditLogs.ipAddress,
          createdAt: auditLogs.createdAt,
        })
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.corretoraId, corretoraId),
            eq(auditLogs.entidade, 'corretora'),
            eq(auditLogs.entidadeId, corretoraId),
          ),
        )
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit);

      return reply.send({ success: true, data: logs });
    },
  );
};

export default corretoraConfigRoutes;
