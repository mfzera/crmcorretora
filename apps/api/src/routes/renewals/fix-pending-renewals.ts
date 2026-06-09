import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { authorize } from '@ecotech/plugins/authorization';

/**
 * Script para corrigir renovações que ficaram presas em status pendente
 * após a conclusão do fluxo completo (cotação → proposta → documento de venda)
 *
 * Este script identifica renovações que:
 * 1. Estão em status pendente (NAO_TRABALHADO, EM_PROSPECCAO, EM_NEGOCIACAO, AGUARDANDO_CLIENTE)
 * 2. Geraram uma cotação (via detalhesRisco.renovacaoId)
 * 3. A cotação gerou uma proposta
 * 4. A proposta gerou um documento de venda
 * 5. O documento de venda foi aprovado (status ATIVO)
 *
 * E atualiza essas renovações para status RENOVADO
 */
const fixPendingRenewalsRoute: FastifyPluginAsyncZod = async function (fastify) {
  const {
    db,
    renovacoesComerciais,
    cotacoes,
    propostasComerciais,
    documentosVenda,
  } = await import('@ecotech/shared/database');

  fastify.post(
    '/fix-pending-renewals',
    {
      schema: {
        tags: ['Renovações'],
        summary: 'Corrigir renovações pendentes concluídas',
        description:
          'Script de correção para atualizar renovações que foram concluídas mas ficaram com status pendente',
      },
      preHandler: [authorize(['admin:manage_system'])],
    },
    async (request, reply) => {
      console.log('🔍 Iniciando correção de renovações pendentes...');

      try {
        const results = {
          total: 0,
          atualizadas: 0,
          semDocumento: 0,
          erros: 0,
          detalhes: [] as Array<{
            renovacaoId: string;
            statusAnterior: string;
            statusNovo: string;
            documentoNumero: string | null;
            mensagem: string;
          }>,
        };

        // 1. Buscar renovações pendentes da corretora do usuário autenticado
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
            with: {
              documentoVendaAnterior: {
                columns: {
                  id: true,
                  numeroDocumento: true,
                  status: true,
                },
              },
            },
          });

        results.total = renovacoesPendentes.length;
        console.log(
          `📊 Total de renovações pendentes encontradas: ${results.total}`,
        );

        // 2. Para cada renovação pendente, verificar se há documento de venda aprovado
        for (const renovacao of renovacoesPendentes) {
          try {
            console.log(
              `\n🔎 Analisando renovação ${renovacao.id} (status: ${renovacao.status})...`,
            );

            // Buscar cotação que referencia esta renovação
            const cotacao = await db.query.cotacoes.findFirst({
              where: sql`${cotacoes.detalhesRisco}::jsonb->>'renovacaoId' = ${renovacao.id}`,
            });

            if (!cotacao) {
              console.log(
                `   ⚠️  Nenhuma cotação encontrada para esta renovação`,
              );
              results.semDocumento++;
              results.detalhes.push({
                renovacaoId: renovacao.id,
                statusAnterior: renovacao.status,
                statusNovo: renovacao.status,
                documentoNumero: null,
                mensagem: 'Sem cotação vinculada',
              });
              continue;
            }

            console.log(`   ✓ Cotação encontrada: ${cotacao.numeroCotacao}`);

            // Buscar proposta que referencia esta cotação
            const proposta = await db.query.propostasComerciais.findFirst({
              where: eq(propostasComerciais.cotacaoId, cotacao.id),
            });

            if (!proposta) {
              console.log(
                `   ⚠️  Nenhuma proposta encontrada para esta cotação`,
              );
              results.semDocumento++;
              results.detalhes.push({
                renovacaoId: renovacao.id,
                statusAnterior: renovacao.status,
                statusNovo: renovacao.status,
                documentoNumero: null,
                mensagem: 'Sem proposta vinculada',
              });
              continue;
            }

            console.log(
              `   ✓ Proposta encontrada: ${proposta.numeroPropostaInterno}`,
            );

            // Buscar documento de venda vinculado à proposta
            if (!proposta.documentoVendaId) {
              console.log(
                `   ⚠️  Proposta não possui documento de venda vinculado`,
              );
              results.semDocumento++;
              results.detalhes.push({
                renovacaoId: renovacao.id,
                statusAnterior: renovacao.status,
                statusNovo: renovacao.status,
                documentoNumero: null,
                mensagem: 'Proposta sem documento de venda',
              });
              continue;
            }

            const documentoVenda = await db.query.documentosVenda.findFirst({
              where: eq(documentosVenda.id, proposta.documentoVendaId),
            });

            if (!documentoVenda) {
              console.log(`   ⚠️  Documento de venda não encontrado`);
              results.semDocumento++;
              results.detalhes.push({
                renovacaoId: renovacao.id,
                statusAnterior: renovacao.status,
                statusNovo: renovacao.status,
                documentoNumero: null,
                mensagem: 'Documento de venda não encontrado',
              });
              continue;
            }

            console.log(
              `   ✓ Documento encontrado: ${documentoVenda.numeroDocumento} (status: ${documentoVenda.status})`,
            );

            // Se o documento está ATIVO, atualizar a renovação para RENOVADO
            if (documentoVenda.status === 'ATIVO') {
              console.log(
                `   ✅ ATUALIZANDO renovação para RENOVADO - documento aprovado`,
              );

              await db
                .update(renovacoesComerciais)
                .set({
                  status: 'RENOVADO',
                  documentoVendaNovoId: documentoVenda.id,
                  premioNovo: documentoVenda.premioLiquido,
                  percentualComissaoNovo: documentoVenda.percentualComissao,
                  valorComissaoNovo: documentoVenda.valorComissao,
                  novaVigenciaInicio: documentoVenda.vigenciaInicio,
                  novaVigenciaFim: documentoVenda.vigenciaFim,
                  dataFinalizacao: new Date(),
                  finalizadoPorId: documentoVenda.aprovadoPorId,
                  updatedAt: new Date(),
                })
                .where(eq(renovacoesComerciais.id, renovacao.id));

              results.atualizadas++;
              results.detalhes.push({
                renovacaoId: renovacao.id,
                statusAnterior: renovacao.status,
                statusNovo: 'RENOVADO',
                documentoNumero: documentoVenda.numeroDocumento,
                mensagem: 'Atualizada com sucesso',
              });
            } else {
              console.log(
                `   ℹ️  Documento ainda não aprovado (status: ${documentoVenda.status})`,
              );
              results.semDocumento++;
              results.detalhes.push({
                renovacaoId: renovacao.id,
                statusAnterior: renovacao.status,
                statusNovo: renovacao.status,
                documentoNumero: documentoVenda.numeroDocumento,
                mensagem: `Documento em status ${documentoVenda.status}`,
              });
            }
          } catch (error: any) {
            console.error(
              `   ❌ Erro ao processar renovação ${renovacao.id}:`,
              error,
            );
            results.erros++;
            results.detalhes.push({
              renovacaoId: renovacao.id,
              statusAnterior: renovacao.status,
              statusNovo: renovacao.status,
              documentoNumero: null,
              mensagem: `Erro: ${error.message}`,
            });
          }
        }

        console.log('\n✨ Correção concluída!');
        console.log(`📊 Total analisado: ${results.total}`);
        console.log(`✅ Atualizadas: ${results.atualizadas}`);
        console.log(`⚠️  Sem documento aprovado: ${results.semDocumento}`);
        console.log(`❌ Erros: ${results.erros}`);

        return reply.status(200).send({
          success: true,
          message: 'Correção de renovações pendentes concluída',
          data: results,
        });
      } catch (error) {
        console.error('❌ Erro ao corrigir renovações:', error);
        throw error;
      }
    },
  );
};

export default fixPendingRenewalsRoute;
