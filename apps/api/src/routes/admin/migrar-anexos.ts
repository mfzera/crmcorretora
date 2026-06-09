import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { eq, and, like, isNull } from 'drizzle-orm';
import { db, anexos } from '@ecotech/shared/database';
import { storageClient } from '@ecotech/shared/storage';

/**
 * Rota administrativa para migrar anexos de documentos de venda
 * que ainda estão em pastas de cotações
 *
 * Esta é uma operação de manutenção que deve ser executada apenas
 * por administradores do sistema
 */
const migrarAnexosRoutes: FastifyPluginAsyncZod = async function (fastify) {
  fastify.addHook('preHandler', fastify.authenticate);

  // Rota para listar anexos que precisam migração
  fastify.get(
    '/verificar',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Verificar anexos para migração',
        description:
          'Lista anexos de documentos de venda que ainda estão em pastas de cotações e precisam ser migrados. Operação de manutenção que requer permissão admin:gerenciar_sistema.',
        response: {
          200: z.object({
            success: z.literal(true),
            total: z.number(),
            anexos: z.array(z.object({
              id: z.string(),
              nomeOriginal: z.string(),
              entidadeId: z.string(),
              r2KeyAtual: z.string(),
              r2KeyNovo: z.string(),
            })),
          }),
          403: z.object({
            success: z.literal(false),
            error: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      if (!request.user.isAdmin && !request.user.permissoes.includes('admin:gerenciar_sistema')) {
        return reply.status(403).send({
          success: false,
          error:
            'Acesso negado. Esta operação requer privilégios de administrador.',
        });
      }

      const anexosParaMigrar = await db.query.anexos.findMany({
        where: and(
          eq(anexos.entidadeTipo, 'documento_venda'),
          like(anexos.r2Key, '%/cotacaos/%'),
          isNull(anexos.deletedAt),
        ),
      });

      return {
        success: true as const,
        total: anexosParaMigrar.length,
        anexos: anexosParaMigrar.map((a) => {
          const partes = a.r2Key.split('/');
          const nomeArquivo = partes.pop();
          const corretoraId = partes[0];
          return {
            id: a.id,
            nomeOriginal: a.nomeOriginal,
            entidadeId: a.entidadeId,
            r2KeyAtual: a.r2Key,
            r2KeyNovo: `${corretoraId}/documento_vendas/${a.entidadeId}/${nomeArquivo}`,
          };
        }),
      };
    },
  );

  // Rota para executar a migração
  fastify.post(
    '/executar',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Executar migração de anexos',
        description:
          'Executa migração de anexos de documentos de venda de pastas de cotações para pastas corretas. Move arquivos no R2 e atualiza banco. Operação de manutenção que requer admin:gerenciar_sistema.',
        response: {
          200: z.object({
            success: z.literal(true),
            message: z.string(),
            resultados: z.object({
              sucessos: z.number(),
              erros: z.number(),
              total: z.number(),
              detalhes: z.array(z.unknown()).optional(),
            }),
          }),
          403: z.object({
            success: z.literal(false),
            error: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      if (!request.user.isAdmin && !request.user.permissoes.includes('admin:gerenciar_sistema')) {
        return reply.status(403).send({
          success: false,
          error:
            'Acesso negado. Esta operação requer privilégios de administrador.',
        });
      }

      const anexosParaMigrar = await db.query.anexos.findMany({
        where: and(
          eq(anexos.entidadeTipo, 'documento_venda'),
          like(anexos.r2Key, '%/cotacaos/%'),
          isNull(anexos.deletedAt),
        ),
      });

      if (anexosParaMigrar.length === 0) {
        return {
          success: true as const,
          message: 'Nenhum anexo precisa ser migrado',
          resultados: { sucessos: 0, erros: 0, total: 0 },
        };
      }

      const resultados = {
        sucessos: 0,
        erros: 0,
        total: anexosParaMigrar.length,
        detalhes: [] as any[],
      };

      for (const anexo of anexosParaMigrar) {
        try {
          const partes = anexo.r2Key.split('/');
          const nomeArquivo = partes.pop();
          const corretoraId = partes[0];
          const novoR2Key = `${corretoraId}/documento_vendas/${anexo.entidadeId}/${nomeArquivo}`;

          fastify.log.info(`Migrando: ${anexo.nomeOriginal}`);
          fastify.log.info(`  De:   ${anexo.r2Key}`);
          fastify.log.info(`  Para: ${novoR2Key}`);

          const existsNaOrigem = await storageClient.exists(anexo.r2Key);

          if (existsNaOrigem) {
            // Caso normal: arquivo ainda está no path de cotacao → mover
            await storageClient.move(anexo.r2Key, novoR2Key);
          } else {
            // Arquivo já foi movido pelo confirm-sale mas o DB não foi atualizado
            // (bug na query raw que usava nome de tabela errado)
            const existsNoDestino = await storageClient.exists(novoR2Key);
            if (!existsNoDestino) {
              resultados.erros++;
              resultados.detalhes.push({
                id: anexo.id,
                nome: anexo.nomeOriginal,
                status: 'erro',
                mensagem: 'Arquivo não encontrado no R2 (nem na origem nem no destino)',
              });
              continue;
            }
            // Arquivo já está no destino correto — só atualiza o DB
            fastify.log.info(`  ⚠️ Arquivo já no destino, apenas atualizando DB`);
          }

          await db
            .update(anexos)
            .set({ r2Key: novoR2Key })
            .where(eq(anexos.id, anexo.id));

          resultados.sucessos++;
          resultados.detalhes.push({
            id: anexo.id,
            nome: anexo.nomeOriginal,
            status: 'sucesso',
            r2KeyAntigo: anexo.r2Key,
            r2KeyNovo: novoR2Key,
          });

          fastify.log.info(`  ✅ Migrado com sucesso`);
        } catch (error) {
          resultados.erros++;
          resultados.detalhes.push({
            id: anexo.id,
            nome: anexo.nomeOriginal,
            status: 'erro',
            mensagem: (error as Error).message,
          });
          fastify.log.error(`  ❌ Erro: ${(error as Error).message}`);
        }
      }

      return {
        success: true as const,
        message: `Migração concluída: ${resultados.sucessos} sucessos, ${resultados.erros} erros`,
        resultados,
      };
    },
  );
};

export default migrarAnexosRoutes;
