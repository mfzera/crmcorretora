import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { eq, and, isNull } from 'drizzle-orm';
import { db, documentosApolice, documentosVenda } from '@ecotech/shared/database';
import { authenticatePortal } from './auth.js';
import { NotFoundError } from '@ecotech/shared/utils';

const portalDocumentosRoutes: FastifyPluginAsyncZod = async function (fastify) {
  fastify.addHook('preHandler', async (request, reply) => {
    await authenticatePortal(fastify, request, reply);
  });

  // GET /api/portal/documents/:policyId — lista documentos de uma apólice
  fastify.get(
    '/documents/:policyId',
    {
      schema: {
        tags: ['Portal Segurado'],
        summary: 'Listar documentos de uma apólice',
      },
    },
    async (request) => {
      const { clienteId, corretoraId } = request.portalCliente;
      const { policyId } = request.params as { policyId: string };

      // Verifica que a apólice pertence ao segurado
      const apolice = await db.query.documentosVenda.findFirst({
        where: and(
          eq(documentosVenda.id, policyId),
          eq(documentosVenda.clienteId, clienteId),
          eq(documentosVenda.corretoraId, corretoraId),
          isNull(documentosVenda.deletedAt),
        ),
        columns: { id: true },
      });

      if (!apolice) {
        throw new NotFoundError('Apólice não encontrada');
      }

      const documentos = await db.query.documentosApolice.findMany({
        where: and(
          eq(documentosApolice.documentoVendaId, policyId),
          eq(documentosApolice.clienteId, clienteId),
          isNull(documentosApolice.deletedAt),
        ),
        columns: {
          id: true,
          nome: true,
          tipo: true,
          mimeType: true,
          tamanhoBytes: true,
          createdAt: true,
        },
        orderBy: (t, { desc }) => [desc(t.createdAt)],
      });

      return { success: true, data: documentos };
    },
  );

  // GET /api/portal/documents/:id/download — URL assinada para download
  fastify.get(
    '/documents/:id/download',
    {
      schema: {
        tags: ['Portal Segurado'],
        summary: 'URL de download de documento',
      },
    },
    async (request) => {
      const { clienteId } = request.portalCliente;
      const { id } = request.params as { id: string };

      const doc = await db.query.documentosApolice.findFirst({
        where: and(
          eq(documentosApolice.id, id),
          eq(documentosApolice.clienteId, clienteId),
          isNull(documentosApolice.deletedAt),
        ),
      });

      if (!doc) {
        throw new NotFoundError('Documento não encontrado');
      }

      const { storageClient } = await import('@ecotech/shared/storage');
      const url = await storageClient.getSignedDownloadUrl(doc.r2Key);

      return { success: true, data: { url, nome: doc.nome, mimeType: doc.mimeType } };
    },
  );
};

export default portalDocumentosRoutes;
