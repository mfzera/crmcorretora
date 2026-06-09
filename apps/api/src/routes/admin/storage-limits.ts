import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db } from '@ecotech/shared/database';
import { corretoras, storageLimits } from '@ecotech/shared/database';
import { eq } from 'drizzle-orm';

const idParams = z.object({ id: z.string().uuid() });

const storageLimitsRoutes: FastifyPluginAsyncZod = async (fastify) => {
  // GET /api/admin/tenants/:id/limits - Obter limites de armazenamento de um tenant
  fastify.get(
    '/tenants/:id/limits',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Obter limites de armazenamento de um tenant',
        description:
          'Retorna limites configurados de armazenamento para uma corretora: limite de arquivos, bytes total e por tipo (cotações, documentos, chat). Retorna null se sem limites configurados.',
        params: idParams,
        response: {
          200: z.unknown(),
          404: z.object({ error: z.string() }),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['view_usage', 'manage_limits']),
    },
    async (request, reply) => {
      const { id } = request.params;

      // Verificar se a corretora existe
      const [corretora] = await db
        .select()
        .from(corretoras)
        .where(eq(corretoras.id, id));

      if (!corretora) {
        return reply.status(404).send({ error: 'Tenant não encontrado' });
      }

      // Buscar limites configurados
      const [limits] = await db
        .select()
        .from(storageLimits)
        .where(eq(storageLimits.corretoraId, id));

      return {
        tenant: {
          id: corretora.id,
          nome: corretora.razaoSocial,
        },
        limits: limits || {
          limiteArquivos: null,
          limiteBytes: null,
          limiteBytesCotacoes: null,
          limiteBytesDocumentos: null,
          limiteBytesChat: null,
          alertasAtivos: true,
        },
      };
    },
  );

  // PUT /api/admin/tenants/:id/limits - Atualizar limites de armazenamento de um tenant
  fastify.put(
    '/tenants/:id/limits',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Atualizar limites de armazenamento de um tenant',
        description:
          'Define ou atualiza limites de armazenamento para uma corretora. Valores null removem o limite. Valida que valores não sejam negativos. Registra ação em audit log.',
        params: idParams,
        body: z.object({
          limiteArquivos: z.number().min(0).nullable().optional(),
          limiteBytes: z.number().min(0).nullable().optional(),
          limiteBytesCotacoes: z.number().min(0).nullable().optional(),
          limiteBytesDocumentos: z.number().min(0).nullable().optional(),
          limiteBytesChat: z.number().min(0).nullable().optional(),
          alertasAtivos: z.boolean().optional(),
        }),
        response: {
          200: z.unknown(),
          400: z.object({ error: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['manage_limits']),
    },
    async (request, reply) => {
      const { id } = request.params;
      const {
        limiteArquivos,
        limiteBytes,
        limiteBytesCotacoes,
        limiteBytesDocumentos,
        limiteBytesChat,
        alertasAtivos,
      } = request.body;

      // Verificar se a corretora existe
      const [corretora] = await db
        .select()
        .from(corretoras)
        .where(eq(corretoras.id, id));

      if (!corretora) {
        return reply.status(404).send({ error: 'Tenant não encontrado' });
      }

      // Verificar se já existe um registro de limites
      const [existingLimits] = await db
        .select()
        .from(storageLimits)
        .where(eq(storageLimits.corretoraId, id));

      let updatedLimits;

      if (existingLimits) {
        // Atualizar limites existentes
        [updatedLimits] = await db
          .update(storageLimits)
          .set({
            limiteArquivos:
              limiteArquivos !== undefined
                ? limiteArquivos
                : existingLimits.limiteArquivos,
            limiteBytes:
              limiteBytes !== undefined
                ? limiteBytes
                : existingLimits.limiteBytes,
            limiteBytesCotacoes:
              limiteBytesCotacoes !== undefined
                ? limiteBytesCotacoes
                : existingLimits.limiteBytesCotacoes,
            limiteBytesDocumentos:
              limiteBytesDocumentos !== undefined
                ? limiteBytesDocumentos
                : existingLimits.limiteBytesDocumentos,
            limiteBytesChat:
              limiteBytesChat !== undefined
                ? limiteBytesChat
                : existingLimits.limiteBytesChat,
            alertasAtivos:
              alertasAtivos !== undefined
                ? alertasAtivos
                : existingLimits.alertasAtivos,
          })
          .where(eq(storageLimits.corretoraId, id))
          .returning();
      } else {
        // Criar novo registro de limites
        [updatedLimits] = await db
          .insert(storageLimits)
          .values({
            corretoraId: id,
            limiteArquivos: limiteArquivos ?? null,
            limiteBytes: limiteBytes ?? null,
            limiteBytesCotacoes: limiteBytesCotacoes ?? null,
            limiteBytesDocumentos: limiteBytesDocumentos ?? null,
            limiteBytesChat: limiteBytesChat ?? null,
            alertasAtivos: alertasAtivos ?? true,
          })
          .returning();
      }

      // Log de auditoria
      await fastify.auditService.logUpdateStorageLimit(
        request.admin!.id,
        request.admin!.email,
        id,
        corretora.razaoSocial,
        {
          limiteArquivos: updatedLimits.limiteArquivos,
          limiteBytes: updatedLimits.limiteBytes,
          limiteBytesCotacoes: updatedLimits.limiteBytesCotacoes,
          limiteBytesDocumentos: updatedLimits.limiteBytesDocumentos,
          limiteBytesChat: updatedLimits.limiteBytesChat,
          alertasAtivos: updatedLimits.alertasAtivos,
        },
        request,
      );

      return {
        tenant: {
          id: corretora.id,
          nome: corretora.razaoSocial,
        },
        limits: updatedLimits,
      };
    },
  );
};

export default storageLimitsRoutes;
