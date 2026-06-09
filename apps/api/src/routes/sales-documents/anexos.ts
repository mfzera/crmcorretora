// Este endpoint (/api/documentos-venda/:id/anexos) não é utilizado pelo frontend.
// O frontend usa GET /api/attachments/entidade/documento_venda/:id (attachments/index.ts).
// Mantido apenas para compatibilidade com integrações externas.
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { eq, and, isNull, or, inArray } from 'drizzle-orm';
import { authorize } from '@ecotech/plugins/authorization';
import { StorageService } from '@ecotech/shared/storage';
import { z } from 'zod';

const documentosVendaAnexosRoutes: FastifyPluginAsyncZod = async function (fastify) {
  const { db, documentosVenda, anexos, cotacoes } = await import(
    '@ecotech/shared/database'
  );
  const { NotFoundError } = await import('@ecotech/shared/utils');

  const storageService = new StorageService();

  fastify.addHook('preHandler', fastify.authenticate);

  /**
   * POST /api/documentos-venda/:id/anexos/upload
   * Upload de arquivo em documento de venda
   */
  fastify.post(
    '/:id/anexos/upload',
    {
      schema: {
        tags: ['Documentos de Venda'],
        summary: 'Upload de anexo em documento',
        description: 'Faz upload de um arquivo e vincula ao documento de venda',
        params: z.object({ id: z.string().uuid() }),
      },
      preHandler: [authorize(['vendas:criar_cotacao'])],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      // Verificar se documento existe e pertence ao tenant
      const documento = await db.query.documentosVenda.findFirst({
        where: and(
          eq(documentosVenda.id, id),
          eq(documentosVenda.corretoraId, request.corretoraId),
          isNull(documentosVenda.deletedAt),
        ),
      });

      if (!documento) {
        throw new NotFoundError('Documento de Venda');
      }

      // Receber arquivo via multipart
      const data = await request.file();

      if (!data) {
        return reply.status(400).send({
          error: 'Nenhum arquivo foi enviado',
        });
      }

      // Ler arquivo em buffer
      const buffer = await data.toBuffer();

      try {
        // Upload via storage service
        const result = await storageService.uploadFile({
          file: buffer,
          fileName: data.filename,
          mimeType: data.mimetype,
          corretoraId: request.corretoraId,
          entidadeTipo: 'documento_venda',
          entidadeId: id,
          uploadPorId: request.user.sub,
        });

        return reply.status(201).send(result);
      } catch (error: any) {
        fastify.log.error('Erro ao fazer upload:', error);

        if (error.message.includes('não permitido')) {
          return reply.status(400).send({ error: error.message });
        }

        if (error.message.includes('muito grande')) {
          return reply.status(413).send({ error: error.message });
        }

        throw error;
      }
    },
  );

  /**
   * GET /api/documentos-venda/:id/anexos
   * Listar todos os anexos de um documento
   */
  fastify.get(
    '/:id/anexos',
    {
      schema: {
        tags: ['Documentos de Venda'],
        summary: 'Listar anexos do documento',
        description: 'Lista todos os anexos vinculados ao documento de venda',
        params: z.object({ id: z.string().uuid() }),
      },
      preHandler: [authorize(['vendas:visualizar_cotacao'])],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      // Verificar se documento existe e pertence ao tenant
      const documento = await db.query.documentosVenda.findFirst({
        where: and(
          eq(documentosVenda.id, id),
          eq(documentosVenda.corretoraId, request.corretoraId),
          isNull(documentosVenda.deletedAt),
        ),
      });

      if (!documento) {
        throw new NotFoundError('Documento de Venda');
      }

      // Buscar cotações vinculadas para incluir seus anexos também
      const cotacoesVinculadas = await db.query.cotacoes.findMany({
        where: eq(cotacoes.documentoVendaId, id),
        columns: { id: true },
      });
      const cotacaoIds = cotacoesVinculadas.map((c) => c.id);

      // Buscar anexos do documento e das cotações vinculadas
      const listaAnexos = await db.query.anexos.findMany({
        where: and(
          eq(anexos.corretoraId, request.corretoraId),
          isNull(anexos.deletedAt),
          or(
            and(eq(anexos.entidadeTipo, 'documento_venda'), eq(anexos.entidadeId, id)),
            cotacaoIds.length > 0
              ? and(eq(anexos.entidadeTipo, 'cotacao'), inArray(anexos.entidadeId, cotacaoIds))
              : undefined,
          ),
        ),
        with: {
          uploadPor: {
            columns: {
              id: true,
              nome: true,
              email: true,
            },
          },
        },
        orderBy: (anexos, { desc }) => [desc(anexos.uploadEm)],
      });

      // Gerar URLs assinadas para todos
      const anexosComUrl = await Promise.all(
        listaAnexos.map(async (anexo) => ({
          ...anexo,
          urlAssinada: await storageService.getSignedUrl(anexo.id),
        })),
      );

      return reply.send(anexosComUrl);
    },
  );

  /**
   * DELETE /api/documentos-venda/:documentoId/anexos/:anexoId
   * Deletar anexo de um documento
   */
  fastify.delete(
    '/:documentoId/anexos/:anexoId',
    {
      schema: {
        tags: ['Documentos de Venda'],
        summary: 'Deletar anexo do documento',
        description: 'Remove um anexo vinculado ao documento de venda',
        params: z.object({ documentoId: z.string().uuid(), anexoId: z.string().uuid() }),
      },
      preHandler: [authorize(['vendas:criar_cotacao'])],
    },
    async (request, reply) => {
      const { documentoId, anexoId } = request.params as {
        documentoId: string;
        anexoId: string;
      };

      // Verificar se documento existe
      const documento = await db.query.documentosVenda.findFirst({
        where: and(
          eq(documentosVenda.id, documentoId),
          eq(documentosVenda.corretoraId, request.corretoraId),
          isNull(documentosVenda.deletedAt),
        ),
      });

      if (!documento) {
        throw new NotFoundError('Documento de Venda');
      }

      // Verificar se anexo pertence ao documento
      const anexo = await db.query.anexos.findFirst({
        where: and(
          eq(anexos.id, anexoId),
          eq(anexos.corretoraId, request.corretoraId),
          eq(anexos.entidadeTipo, 'documento_venda'),
          eq(anexos.entidadeId, documentoId),
          isNull(anexos.deletedAt),
        ),
      });

      if (!anexo) {
        throw new NotFoundError('Anexo');
      }

      // Deletar via storage service
      await storageService.deleteFile(anexoId, request.user.sub);

      return reply.status(204).send();
    },
  );
};

export default documentosVendaAnexosRoutes;
