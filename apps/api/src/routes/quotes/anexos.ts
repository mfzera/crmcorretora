import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { eq, and, isNull } from 'drizzle-orm';
import { authorize } from '@ecotech/plugins/authorization';
import { StorageService } from '@ecotech/shared/storage';
import { z } from 'zod';

const cotacoesAnexosRoutes: FastifyPluginAsyncZod = async function (fastify) {
  const { db, cotacoes, anexos } = await import('@ecotech/shared/database');
  const { NotFoundError } = await import('@ecotech/shared/utils');

  const storageService = new StorageService();

  fastify.addHook('preHandler', fastify.authenticate);

  /**
   * POST /api/cotacoes/:id/anexos/upload
   * Upload de arquivo em cotação
   */
  fastify.post(
    '/:id/anexos/upload',
    {
      schema: {
        tags: ['Cotações'],
        summary: 'Upload de anexo em cotação',
        description: 'Faz upload de um arquivo e vincula à cotação',
        params: z.object({ id: z.string().uuid() }),
      },
      preHandler: [authorize(['vendas:criar_cotacao'])],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      // Verificar se cotação existe e pertence ao tenant
      const cotacao = await db.query.cotacoes.findFirst({
        where: and(
          eq(cotacoes.id, id),
          eq(cotacoes.corretoraId, request.corretoraId),
          isNull(cotacoes.deletedAt),
        ),
      });

      if (!cotacao) {
        throw new NotFoundError('Cotação');
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
          entidadeTipo: 'cotacao',
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
   * GET /api/cotacoes/:id/anexos
   * Listar todos os anexos de uma cotação
   */
  fastify.get(
    '/:id/anexos',
    {
      schema: {
        tags: ['Cotações'],
        summary: 'Listar anexos da cotação',
        description: 'Lista todos os anexos vinculados à cotação',
        params: z.object({ id: z.string().uuid() }),
      },
      preHandler: [authorize(['vendas:visualizar_cotacao'])],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      // Verificar se cotação existe e pertence ao tenant
      const cotacao = await db.query.cotacoes.findFirst({
        where: and(
          eq(cotacoes.id, id),
          eq(cotacoes.corretoraId, request.corretoraId),
          isNull(cotacoes.deletedAt),
        ),
      });

      if (!cotacao) {
        throw new NotFoundError('Cotação');
      }

      // Buscar anexos
      const listaAnexos = await db.query.anexos.findMany({
        where: and(
          eq(anexos.corretoraId, request.corretoraId),
          eq(anexos.entidadeTipo, 'cotacao'),
          eq(anexos.entidadeId, id),
          isNull(anexos.deletedAt),
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
   * DELETE /api/cotacoes/:cotacaoId/anexos/:anexoId
   * Deletar anexo de uma cotação
   */
  fastify.delete(
    '/:cotacaoId/anexos/:anexoId',
    {
      schema: {
        tags: ['Cotações'],
        summary: 'Deletar anexo da cotação',
        description: 'Remove um anexo vinculado à cotação',
        params: z.object({ cotacaoId: z.string().uuid(), anexoId: z.string().uuid() }),
      },
      preHandler: [authorize(['vendas:criar_cotacao'])],
    },
    async (request, reply) => {
      const { cotacaoId, anexoId } = request.params as {
        cotacaoId: string;
        anexoId: string;
      };

      // Verificar se cotação existe
      const cotacao = await db.query.cotacoes.findFirst({
        where: and(
          eq(cotacoes.id, cotacaoId),
          eq(cotacoes.corretoraId, request.corretoraId),
          isNull(cotacoes.deletedAt),
        ),
      });

      if (!cotacao) {
        throw new NotFoundError('Cotação');
      }

      // Verificar se anexo pertence à cotação
      const anexo = await db.query.anexos.findFirst({
        where: and(
          eq(anexos.id, anexoId),
          eq(anexos.corretoraId, request.corretoraId),
          eq(anexos.entidadeTipo, 'cotacao'),
          eq(anexos.entidadeId, cotacaoId),
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

export default cotacoesAnexosRoutes;
