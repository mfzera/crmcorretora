import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { authorize } from '@ecotech/plugins/authorization';

const limparRenovacoesBugadasRoute: FastifyPluginAsyncZod = async function (fastify) {
  const { db, renovacoesComerciais, cotacoes, documentosVenda } = await import(
    '@ecotech/shared/database'
  );

  // Rota administrativa para limpar renovações bugadas
  fastify.post(
    '/limpar-bugadas',
    {
      schema: {
        tags: ['Renovações'],
        summary: 'Limpar renovações com status inconsistente',
        description: `Endpoint administrativo para correção de dados. Analisa renovações pendentes e corrige status inconsistentes:

**Regras de limpeza:**
- Marca como RENOVADO se existe um documento de venda NOVO (via cotação) já ATIVO
- Marca como PERDIDO se vencida há mais de 30 dias sem progresso
- Mantém status atual se dentro dos padrões normais

Requer permissão de administrador do sistema.`,
      },
      preHandler: [authorize(['admin:manage_system'])],
    },
    async (request, reply) => {
      try {
        const renovacoesPendentes =
          await db.query.renovacoesComerciais.findMany({
            where: and(
              inArray(renovacoesComerciais.status, [
                'NAO_TRABALHADO',
                'EM_PROSPECCAO',
                'EM_NEGOCIACAO',
                'AGUARDANDO_CLIENTE',
              ]),
              eq(renovacoesComerciais.corretoraId, request.user.corretoraId),
            ),
          });

        const contadores = {
          renovado: 0,
          perdido: 0,
          semProgresso: 0,
          mantido: 0,
        };

        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        for (const renovacao of renovacoesPendentes) {
          // Estratégia: buscar cotação que referencia esta renovação via detalhesRisco.renovacaoId
          const cotacao = await db.query.cotacoes.findFirst({
            where: sql`${cotacoes.detalhesRisco}::jsonb->>'renovacaoId' = ${renovacao.id}`,
          });

          if (cotacao?.documentoVendaId) {
            // Existe cotação convertida com documento de venda — verificar status do doc
            const docNovo = await db.query.documentosVenda.findFirst({
              where: eq(documentosVenda.id, cotacao.documentoVendaId),
            });

            if (docNovo && docNovo.status === 'ATIVO') {
              // Documento aprovado — renovação deveria ser RENOVADO
              await db
                .update(renovacoesComerciais)
                .set({
                  status: 'RENOVADO',
                  documentoVendaNovoId: docNovo.id,
                  premioNovo: docNovo.premioLiquido,
                  percentualComissaoNovo: docNovo.percentualComissao,
                  valorComissaoNovo: docNovo.valorComissao,
                  novaVigenciaInicio: docNovo.vigenciaInicio,
                  novaVigenciaFim: docNovo.vigenciaFim,
                  dataFinalizacao: new Date(),
                  finalizadoPorId: docNovo.aprovadoPorId,
                  updatedAt: new Date(),
                })
                .where(eq(renovacoesComerciais.id, renovacao.id));

              contadores.renovado++;
              continue;
            }
          }

          // Se a data de vencimento já passou há mais de 30 dias e ainda está pendente
          const dataVencimento = new Date(renovacao.dataVencimento);
          dataVencimento.setHours(0, 0, 0, 0);
          const diasDesdeVencimento = Math.floor(
            (hoje.getTime() - dataVencimento.getTime()) / (1000 * 60 * 60 * 24),
          );

          if (diasDesdeVencimento > 30) {
            await db
              .update(renovacoesComerciais)
              .set({
                status: 'PERDIDO',
                motivoPerda: 'Renovação não trabalhada dentro do prazo',
                dataPerda: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(renovacoesComerciais.id, renovacao.id));

            contadores.perdido++;
            continue;
          }

          contadores.mantido++;
        }

        return reply.status(200).send({
          success: true,
          message: 'Limpeza de renovações bugadas concluída',
          data: {
            totalAnalisado: renovacoesPendentes.length,
            ...contadores,
          },
        });
      } catch (error) {
        console.error('Erro ao limpar renovações:', error);
        throw error;
      }
    },
  );
};

export default limparRenovacoesBugadasRoute;
