# 09 - API Administrativa

**Navegação**: [← 08. Backup Service](./08-BACKUP-SERVICE.md) | [Índice](./00-INDICE.md) | [10. Frontend Anexos →](./10-FRONTEND-ANEXOS.md)

---

## Visão Geral

Rotas administrativas para super-admins gerenciarem o sistema multi-tenant:

- Visualizar uso de storage de todos os tenants
- Gerenciar limites de storage
- Criar e restaurar backups
- Visualizar logs de auditoria
- Limpar arquivos órfãos
- Estatísticas globais do sistema

**Base URL**: `/api/admin/*`

**Autenticação**: JWT admin (diferente do JWT tenant)

---

## Estrutura de Arquivos

```
apps/api/src/routes/admin/
├── index.ts          # Registro de rotas
├── auth.ts           # Login (já documentado em 06)
├── tenants.ts        # Gestão de tenants
├── backups.ts        # Gestão de backups
├── audit.ts          # Logs de auditoria
├── limits.ts         # Gestão de limites
└── middleware.ts     # Auth admin (já documentado em 06)
```

---

## 1. Rotas de Tenants

### `GET /api/admin/tenants`

Lista todos os tenants com uso de storage.

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Query params:**
```typescript
{
  page?: number;     // Padrão: 1
  limit?: number;    // Padrão: 50
  ordenarPor?: 'nome' | 'uso' | 'percentual'; // Padrão: 'nome'
  ordem?: 'asc' | 'desc'; // Padrão: 'asc'
  busca?: string;    // Busca por nome
}
```

**Response 200:**
```typescript
{
  success: true,
  data: {
    tenants: [
      {
        corretoraId: string,
        nomeFantasia: string,
        uso: {
          totalArquivos: number,
          totalBytes: string,
          byType: {
            cotacoes: { count: number, bytes: string },
            documentos: { count: number, bytes: string },
            chat: { count: number, bytes: string }
          }
        },
        limites: {
          limiteBytes: string,
          limiteArquivos: number | null,
          percentUsed: number,
          shouldAlert: boolean,
          shouldBlock: boolean
        },
        ultimoBackup: {
          tipo: 'incremental' | 'completo',
          iniciadoEm: string,
          status: string
        } | null,
        custoEstimadoMensal: number
      }
    ],
    pagination: {
      page: number,
      limit: number,
      total: number,
      totalPages: number
    }
  }
}
```

**Implementação:**

```typescript
// apps/api/src/routes/admin/tenants.ts

import { FastifyPluginAsync } from 'fastify';
import { db } from '@ecotech/database';
import { corretoras, storageLimits, backups } from '@ecotech/database/schema';
import { storageMetrics } from '@ecotech/storage';
import { desc, like, or, eq } from 'drizzle-orm';
import { requireAdminPermission } from './middleware.js';

const tenantsRoutes: FastifyPluginAsync = async (fastify) => {
  // Listar tenants
  fastify.get('/', {
    preHandler: [requireAdminPermission('view_all_tenants')],
  }, async (request, reply) => {
    const {
      page = 1,
      limit = 50,
      ordenarPor = 'nome',
      ordem = 'asc',
      busca,
    } = request.query as any;

    // Buscar corretoras
    let query = db.query.corretoras.findMany({
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
    });

    if (busca) {
      query = db.query.corretoras.findMany({
        where: or(
          like(corretoras.nomeFantasia, `%${busca}%`),
          like(corretoras.cnpj, `%${busca}%`)
        ),
        limit: Number(limit),
        offset: (Number(page) - 1) * Number(limit),
      });
    }

    const corretorasList = await query;

    // Calcular uso e limites para cada corretora
    const tenants = await Promise.all(
      corretorasList.map(async (corretora) => {
        const [uso, limitStatus, custos, ultimoBackup] = await Promise.all([
          storageMetrics.calculateUsage(corretora.id),
          storageMetrics.checkLimits(corretora.id),
          storageMetrics.calculateCosts(corretora.id),
          db.query.backups.findFirst({
            where: eq(backups.corretoraId, corretora.id),
            orderBy: [desc(backups.iniciadoEm)],
          }),
        ]);

        return {
          corretoraId: corretora.id,
          nomeFantasia: corretora.nomeFantasia,
          uso: {
            totalArquivos: uso.totalArquivos,
            totalBytes: uso.totalBytes.toString(),
            byType: {
              cotacoes: {
                count: uso.byType.cotacoes.count,
                bytes: uso.byType.cotacoes.bytes.toString(),
              },
              documentos: {
                count: uso.byType.documentos.count,
                bytes: uso.byType.documentos.bytes.toString(),
              },
              chat: {
                count: uso.byType.chat.count,
                bytes: uso.byType.chat.bytes.toString(),
              },
            },
          },
          limites: {
            limiteBytes: limitStatus.bytesLimit.toString(),
            limiteArquivos: limitStatus.arquivosLimit,
            percentUsed: limitStatus.percentUsed,
            shouldAlert: limitStatus.shouldAlert,
            shouldBlock: limitStatus.shouldBlock,
          },
          ultimoBackup: ultimoBackup ? {
            tipo: ultimoBackup.tipo,
            iniciadoEm: ultimoBackup.iniciadoEm.toISOString(),
            status: ultimoBackup.status,
          } : null,
          custoEstimadoMensal: custos.totalCostMonthly,
        };
      })
    );

    // Ordenar
    if (ordenarPor === 'uso') {
      tenants.sort((a, b) => {
        const diff = Number(a.uso.totalBytes) - Number(b.uso.totalBytes);
        return ordem === 'asc' ? diff : -diff;
      });
    } else if (ordenarPor === 'percentual') {
      tenants.sort((a, b) => {
        const diff = a.limites.percentUsed - b.limites.percentUsed;
        return ordem === 'asc' ? diff : -diff;
      });
    } else {
      tenants.sort((a, b) => {
        const diff = a.nomeFantasia.localeCompare(b.nomeFantasia);
        return ordem === 'asc' ? diff : -diff;
      });
    }

    // Contar total
    const totalQuery = busca
      ? await db.query.corretoras.findMany({
          where: or(
            like(corretoras.nomeFantasia, `%${busca}%`),
            like(corretoras.cnpj, `%${busca}%`)
          ),
        })
      : await db.query.corretoras.findMany();

    const total = totalQuery.length;

    return {
      success: true,
      data: {
        tenants,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    };
  });

  // Detalhes de um tenant
  fastify.get('/:corretoraId', {
    preHandler: [requireAdminPermission('view_all_tenants')],
  }, async (request, reply) => {
    const { corretoraId } = request.params as { corretoraId: string };

    const corretora = await db.query.corretoras.findFirst({
      where: eq(corretoras.id, corretoraId),
    });

    if (!corretora) {
      return reply.status(404).send({
        success: false,
        error: 'Corretora não encontrada',
      });
    }

    const [uso, limitStatus, custos, history] = await Promise.all([
      storageMetrics.calculateUsage(corretoraId),
      storageMetrics.checkLimits(corretoraId),
      storageMetrics.calculateCosts(corretoraId),
      storageMetrics.getUsageHistory(corretoraId, 30),
    ]);

    return {
      success: true,
      data: {
        corretora: {
          id: corretora.id,
          nomeFantasia: corretora.nomeFantasia,
          cnpj: corretora.cnpj,
        },
        uso: {
          totalArquivos: uso.totalArquivos,
          totalBytes: uso.totalBytes.toString(),
          byType: {
            cotacoes: {
              count: uso.byType.cotacoes.count,
              bytes: uso.byType.cotacoes.bytes.toString(),
            },
            documentos: {
              count: uso.byType.documentos.count,
              bytes: uso.byType.documentos.bytes.toString(),
            },
            chat: {
              count: uso.byType.chat.count,
              bytes: uso.byType.chat.bytes.toString(),
            },
          },
          byMimeType: Object.entries(uso.byMimeType).map(([mime, data]) => ({
            mimeType: mime,
            count: data.count,
            bytes: data.bytes.toString(),
          })),
          largestFiles: uso.largestFiles.map(f => ({
            ...f,
            tamanho: f.tamanho.toString(),
          })),
        },
        limites: limitStatus,
        custos: custos,
        historico: history.map(h => ({
          data: h.data.toISOString(),
          totalBytes: h.totalBytes.toString(),
          totalArquivos: h.totalArquivos,
          crescimentoBytes: h.crescimentoBytes.toString(),
          crescimentoArquivos: h.crescimentoArquivos,
        })),
      },
    };
  });

  // Estatísticas globais
  fastify.get('/stats/global', {
    preHandler: [requireAdminPermission('view_usage')],
  }, async (request, reply) => {
    const stats = await storageMetrics.getGlobalStats();

    return {
      success: true,
      data: {
        totalCorretoras: stats.totalCorretoras,
        totalArquivos: stats.totalArquivos,
        totalBytes: stats.totalBytes.toString(),
        totalBytesCotacoes: stats.totalBytesCotacoes.toString(),
        totalBytesDocumentos: stats.totalBytesDocumentos.toString(),
        totalBytesChat: stats.totalBytesChat.toString(),
        custoEstimadoMensal: stats.custoEstimadoMensal,
        crescimentoUltimos30Dias: stats.crescimentoUltimos30Dias.toString(),
        corretorasProximasLimite: stats.corretorasProximasLimite,
      },
    };
  });
};

export default tenantsRoutes;
```

---

## 2. Rotas de Limites

### `GET /api/admin/limits`

Lista limites configurados.

**Response 200:**
```typescript
{
  success: true,
  data: {
    limits: [
      {
        id: string,
        corretoraId: string,
        nomeFantasia: string,
        limiteBytes: string,
        limiteArquivos: number | null,
        alertarEm: number,
        bloquearUploadEm: number,
        ativo: boolean,
        status: {
          percentUsed: number,
          shouldAlert: boolean,
          shouldBlock: boolean
        }
      }
    ]
  }
}
```

### `POST /api/admin/limits`

Criar ou atualizar limite.

**Body:**
```typescript
{
  corretoraId: string,
  limiteBytes: string,        // Ex: "10737418240" (10GB)
  limiteArquivos?: number,    // Ex: 10000
  alertarEm?: number,         // Padrão: 80 (%)
  bloquearUploadEm?: number,  // Padrão: 95 (%)
  ativo?: boolean            // Padrão: true
}
```

**Response 200:**
```typescript
{
  success: true,
  data: {
    limite: { /* ... */ },
    message: 'Limite configurado com sucesso'
  }
}
```

**Implementação:**

```typescript
// apps/api/src/routes/admin/limits.ts

import { FastifyPluginAsync } from 'fastify';
import { db } from '@ecotech/database';
import { storageLimits, corretoras, adminAuditLogs } from '@ecotech/database/schema';
import { storageMetrics } from '@ecotech/storage';
import { eq } from 'drizzle-orm';
import { requireAdminPermission } from './middleware.js';

const limitsRoutes: FastifyPluginAsync = async (fastify) => {
  // Listar limites
  fastify.get('/', {
    preHandler: [requireAdminPermission('view_usage')],
  }, async (request, reply) => {
    const limits = await db.query.storageLimits.findMany({
      with: {
        corretora: true,
      },
    });

    const limitsWithStatus = await Promise.all(
      limits.map(async (limit) => {
        const status = await storageMetrics.checkLimits(limit.corretoraId);

        return {
          id: limit.id,
          corretoraId: limit.corretoraId,
          nomeFantasia: limit.corretora.nomeFantasia,
          limiteBytes: limit.limiteBytes,
          limiteArquivos: limit.limiteArquivos,
          alertarEm: limit.alertarEm,
          bloquearUploadEm: limit.bloquearUploadEm,
          ativo: limit.ativo,
          status: {
            percentUsed: status.percentUsed,
            shouldAlert: status.shouldAlert,
            shouldBlock: status.shouldBlock,
          },
        };
      })
    );

    return {
      success: true,
      data: {
        limits: limitsWithStatus,
      },
    };
  });

  // Criar ou atualizar limite
  fastify.post('/', {
    preHandler: [requireAdminPermission('manage_limits')],
  }, async (request, reply) => {
    const {
      corretoraId,
      limiteBytes,
      limiteArquivos,
      alertarEm = 80,
      bloquearUploadEm = 95,
      ativo = true,
    } = request.body as any;

    // Verificar se corretora existe
    const corretora = await db.query.corretoras.findFirst({
      where: eq(corretoras.id, corretoraId),
    });

    if (!corretora) {
      return reply.status(404).send({
        success: false,
        error: 'Corretora não encontrada',
      });
    }

    // Verificar se já existe limite
    const existente = await db.query.storageLimits.findFirst({
      where: eq(storageLimits.corretoraId, corretoraId),
    });

    let limite;

    if (existente) {
      // Atualizar
      [limite] = await db
        .update(storageLimits)
        .set({
          limiteBytes,
          limiteArquivos,
          alertarEm,
          bloquearUploadEm,
          ativo,
        })
        .where(eq(storageLimits.id, existente.id))
        .returning();
    } else {
      // Criar
      [limite] = await db
        .insert(storageLimits)
        .values({
          corretoraId,
          limiteBytes,
          limiteArquivos,
          alertarEm,
          bloquearUploadEm,
          ativo,
        })
        .returning();
    }

    // Log de auditoria
    await db.insert(adminAuditLogs).values({
      adminId: request.admin!.sub,
      acao: existente ? 'limite_atualizado' : 'limite_criado',
      detalhes: { corretoraId, limiteBytes, limiteArquivos },
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    });

    return {
      success: true,
      data: {
        limite,
        message: 'Limite configurado com sucesso',
      },
    };
  });

  // Deletar limite
  fastify.delete('/:limitId', {
    preHandler: [requireAdminPermission('manage_limits')],
  }, async (request, reply) => {
    const { limitId } = request.params as { limitId: string };

    const limite = await db.query.storageLimits.findFirst({
      where: eq(storageLimits.id, limitId),
    });

    if (!limite) {
      return reply.status(404).send({
        success: false,
        error: 'Limite não encontrado',
      });
    }

    await db.delete(storageLimits).where(eq(storageLimits.id, limitId));

    // Log de auditoria
    await db.insert(adminAuditLogs).values({
      adminId: request.admin!.sub,
      acao: 'limite_removido',
      detalhes: { limitId, corretoraId: limite.corretoraId },
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    });

    return {
      success: true,
      message: 'Limite removido com sucesso',
    };
  });
};

export default limitsRoutes;
```

---

## 3. Rotas de Backups

### `GET /api/admin/backups`

Lista backups.

**Query params:**
```typescript
{
  corretoraId?: string,
  tipo?: 'incremental' | 'completo',
  status?: 'em_progresso' | 'concluido' | 'falhou',
  limit?: number,
  page?: number
}
```

### `POST /api/admin/backups`

Criar backup manualmente.

**Body:**
```typescript
{
  corretoraId: string,
  tipo: 'incremental' | 'completo'
}
```

### `POST /api/admin/backups/:backupId/restore`

Restaurar backup.

**Body:**
```typescript
{
  targetCorretoraId?: string,  // Se omitido, restaura na mesma corretora
  overwriteExisting?: boolean, // Padrão: false
  dryRun?: boolean            // Padrão: false
}
```

**Implementação:**

```typescript
// apps/api/src/routes/admin/backups.ts

import { FastifyPluginAsync } from 'fastify';
import { db } from '@ecotech/database';
import { backups, adminAuditLogs } from '@ecotech/database/schema';
import { backupService } from '@ecotech/storage';
import { eq, and, desc } from 'drizzle-orm';
import { requireAdminPermission } from './middleware.js';

const backupsRoutes: FastifyPluginAsync = async (fastify) => {
  // Listar backups
  fastify.get('/', {
    preHandler: [requireAdminPermission('view_usage')],
  }, async (request, reply) => {
    const {
      corretoraId,
      tipo,
      status,
      limit = 50,
      page = 1,
    } = request.query as any;

    let whereClause: any[] = [];
    if (corretoraId) whereClause.push(eq(backups.corretoraId, corretoraId));
    if (tipo) whereClause.push(eq(backups.tipo, tipo));
    if (status) whereClause.push(eq(backups.status, status));

    const backupsList = await db.query.backups.findMany({
      where: whereClause.length > 0 ? and(...whereClause) : undefined,
      orderBy: [desc(backups.iniciadoEm)],
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
      with: {
        corretora: {
          columns: {
            nomeFantasia: true,
          },
        },
      },
    });

    return {
      success: true,
      data: {
        backups: backupsList.map(b => ({
          id: b.id,
          corretoraId: b.corretoraId,
          nomeFantasia: b.corretora.nomeFantasia,
          tipo: b.tipo,
          status: b.status,
          iniciadoEm: b.iniciadoEm.toISOString(),
          finalizadoEm: b.finalizadoEm?.toISOString(),
          totalArquivos: b.totalArquivos,
          totalBytes: b.totalBytes,
          verificado: b.verificado,
          erro: b.erro,
        })),
      },
    };
  });

  // Criar backup manual
  fastify.post('/', {
    preHandler: [requireAdminPermission('manage_backups')],
  }, async (request, reply) => {
    const { corretoraId, tipo } = request.body as any;

    if (!['incremental', 'completo'].includes(tipo)) {
      return reply.status(400).send({
        success: false,
        error: 'Tipo deve ser "incremental" ou "completo"',
      });
    }

    // Log de auditoria
    await db.insert(adminAuditLogs).values({
      adminId: request.admin!.sub,
      acao: 'backup_iniciado',
      detalhes: { corretoraId, tipo },
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    });

    // Criar backup (assíncrono, não esperar)
    const backupPromise =
      tipo === 'completo'
        ? backupService.createFullBackup(corretoraId, request.admin!.sub)
        : backupService.createIncrementalBackup(corretoraId, request.admin!.sub);

    // Retornar imediatamente (backup roda em background)
    backupPromise.catch(err => {
      console.error('[Admin] Erro ao criar backup:', err);
    });

    return {
      success: true,
      message: 'Backup iniciado em background',
    };
  });

  // Verificar backup
  fastify.post('/:backupId/verify', {
    preHandler: [requireAdminPermission('manage_backups')],
  }, async (request, reply) => {
    const { backupId } = request.params as { backupId: string };

    const result = await backupService.verifyBackup(backupId);

    // Log de auditoria
    await db.insert(adminAuditLogs).values({
      adminId: request.admin!.sub,
      acao: 'backup_verificado',
      detalhes: { backupId, valid: result.valid },
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    });

    return {
      success: true,
      data: result,
    };
  });

  // Restaurar backup
  fastify.post('/:backupId/restore', {
    preHandler: [requireAdminPermission('manage_backups')],
  }, async (request, reply) => {
    const { backupId } = request.params as { backupId: string };
    const { targetCorretoraId, overwriteExisting, dryRun } = request.body as any;

    // Log de auditoria
    await db.insert(adminAuditLogs).values({
      adminId: request.admin!.sub,
      acao: dryRun ? 'backup_restore_dry_run' : 'backup_restore_iniciado',
      detalhes: { backupId, targetCorretoraId, overwriteExisting, dryRun },
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    });

    const result = await backupService.restoreBackup(backupId, {
      targetCorretoraId,
      overwriteExisting,
      dryRun,
    });

    return {
      success: result.success,
      data: {
        arquivosRestaurados: result.arquivosRestaurados,
        bytesRestaurados: result.bytesRestaurados.toString(),
        erros: result.erros,
      },
    };
  });
};

export default backupsRoutes;
```

---

## 4. Rotas de Auditoria

### `GET /api/admin/audit`

Lista logs de auditoria admin.

**Query params:**
```typescript
{
  adminId?: string,
  acao?: string,
  dataInicio?: string, // ISO 8601
  dataFim?: string,
  limit?: number,
  page?: number
}
```

**Implementação:**

```typescript
// apps/api/src/routes/admin/audit.ts

import { FastifyPluginAsync } from 'fastify';
import { db } from '@ecotech/database';
import { adminAuditLogs } from '@ecotech/database/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { requireAdminPermission } from './middleware.js';

const auditRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', {
    preHandler: [requireAdminPermission('view_audit_logs')],
  }, async (request, reply) => {
    const {
      adminId,
      acao,
      dataInicio,
      dataFim,
      limit = 100,
      page = 1,
    } = request.query as any;

    let whereClause: any[] = [];
    if (adminId) whereClause.push(eq(adminAuditLogs.adminId, adminId));
    if (acao) whereClause.push(eq(adminAuditLogs.acao, acao));
    if (dataInicio) whereClause.push(gte(adminAuditLogs.criadoEm, new Date(dataInicio)));
    if (dataFim) whereClause.push(lte(adminAuditLogs.criadoEm, new Date(dataFim)));

    const logs = await db.query.adminAuditLogs.findMany({
      where: whereClause.length > 0 ? and(...whereClause) : undefined,
      orderBy: [desc(adminAuditLogs.criadoEm)],
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
      with: {
        admin: {
          columns: {
            nome: true,
            email: true,
          },
        },
      },
    });

    return {
      success: true,
      data: {
        logs: logs.map(log => ({
          id: log.id,
          adminId: log.adminId,
          adminNome: log.admin.nome,
          adminEmail: log.admin.email,
          acao: log.acao,
          detalhes: log.detalhes,
          ip: log.ip,
          userAgent: log.userAgent,
          criadoEm: log.criadoEm.toISOString(),
        })),
      },
    };
  });
};

export default auditRoutes;
```

---

## 5. Rotas de Limpeza

### `POST /api/admin/cleanup/orphaned-files`

Busca arquivos órfãos (no R2 mas não no DB).

**Body:**
```typescript
{
  corretoraId?: string,  // Se omitido, busca em todos
  deleteFiles?: boolean  // Padrão: false (apenas lista)
}
```

**Implementação:**

```typescript
// apps/api/src/routes/admin/cleanup.ts

import { FastifyPluginAsync } from 'fastify';
import { storageMetrics } from '@ecotech/storage';
import { requireAdminPermission } from './middleware.js';

const cleanupRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/orphaned-files', {
    preHandler: [requireAdminPermission('cleanup_files')],
  }, async (request, reply) => {
    const { corretoraId, deleteFiles = false } = request.body as any;

    const orphanedKeys = await storageMetrics.findOrphanedFiles(corretoraId);

    if (deleteFiles) {
      // TODO: Implementar remoção segura
      return {
        success: false,
        error: 'Remoção automática não implementada (por segurança)',
        message: 'Use o painel para revisar e remover arquivos órfãos individualmente',
      };
    }

    return {
      success: true,
      data: {
        totalOrphaned: orphanedKeys.length,
        orphanedKeys: orphanedKeys.slice(0, 100), // Limitar resposta
      },
    };
  });
};

export default cleanupRoutes;
```

---

## 6. Registro Completo das Rotas

```typescript
// apps/api/src/routes/admin/index.ts

import { FastifyPluginAsync } from 'fastify';
import adminAuthRoutes from './auth.js';
import tenantsRoutes from './tenants.js';
import limitsRoutes from './limits.js';
import backupsRoutes from './backups.js';
import auditRoutes from './audit.js';
import cleanupRoutes from './cleanup.js';
import { authenticateAdmin } from './middleware.js';

const adminRoutes: FastifyPluginAsync = async (fastify) => {
  // Auth público (sem middleware)
  await fastify.register(adminAuthRoutes, { prefix: '/auth' });

  // Todas as outras rotas requerem autenticação
  fastify.addHook('preHandler', authenticateAdmin);

  await fastify.register(tenantsRoutes, { prefix: '/tenants' });
  await fastify.register(limitsRoutes, { prefix: '/limits' });
  await fastify.register(backupsRoutes, { prefix: '/backups' });
  await fastify.register(auditRoutes, { prefix: '/audit' });
  await fastify.register(cleanupRoutes, { prefix: '/cleanup' });
};

export default adminRoutes;
```

```typescript
// apps/api/src/app.ts

import adminRoutes from './routes/admin/index.js';

// ...

// Registrar rotas admin
await app.register(adminRoutes, { prefix: '/api/admin' });
```

---

## Testes com cURL

### 1. Login Admin

```bash
curl -X POST http://localhost:3000/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@ecotech.com",
    "senha": "senha-segura"
  }'

# Salvar token
export ADMIN_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 2. Listar Tenants

```bash
curl http://localhost:3000/api/admin/tenants \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### 3. Ver Detalhes de Tenant

```bash
curl http://localhost:3000/api/admin/tenants/{corretoraId} \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### 4. Criar Limite

```bash
curl -X POST http://localhost:3000/api/admin/limits \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "corretoraId": "uuid-corretora",
    "limiteBytes": "10737418240",
    "limiteArquivos": 10000,
    "alertarEm": 80,
    "bloquearUploadEm": 95
  }'
```

### 5. Criar Backup Manual

```bash
curl -X POST http://localhost:3000/api/admin/backups \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "corretoraId": "uuid-corretora",
    "tipo": "completo"
  }'
```

### 6. Buscar Arquivos Órfãos

```bash
curl -X POST http://localhost:3000/api/admin/cleanup/orphaned-files \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "corretoraId": "uuid-corretora",
    "deleteFiles": false
  }'
```

---

## Segurança

1. **Autenticação Separada**: JWT admin com secret diferente
2. **Permissões Granulares**: Cada rota valida permissão específica
3. **Auditoria Completa**: Todas as ações são logadas
4. **Rate Limiting**: Limitar tentativas de login
5. **HTTPS Obrigatório**: Apenas produção com HTTPS
6. **IP Whitelist**: Opcional, configurar no Cloudflare

---

## Próximos Passos

- [10. Frontend Anexos →](./10-FRONTEND-ANEXOS.md) - Componentes React para tenant app
- [11. Frontend Admin →](./11-FRONTEND-ADMIN.md) - Aplicação admin completa
- [18. Segurança →](./18-SEGURANCA.md) - Considerações de segurança

---

**Navegação**: [← 08. Backup Service](./08-BACKUP-SERVICE.md) | [Índice](./00-INDICE.md) | [10. Frontend Anexos →](./10-FRONTEND-ANEXOS.md)
