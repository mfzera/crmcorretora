#!/usr/bin/env tsx
/**
 * Script CLI para corrigir renovações pendentes
 *
 * Este script pode ser executado diretamente via CLI:
 *
 *   pnpm tsx scripts/fix-pending-renewals.ts
 *
 * Ou com opções:
 *
 *   pnpm tsx scripts/fix-pending-renewals.ts --dry-run  # Apenas simula, não atualiza
 *   pnpm tsx scripts/fix-pending-renewals.ts --verbose  # Mostra mais detalhes
 */

import { eq, inArray, sql } from 'drizzle-orm';

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isVerbose = args.includes('--verbose') || args.includes('-v');

async function main() {
  console.log('🔧 Script de Correção de Renovações Pendentes\n');

  if (isDryRun) {
    console.log('⚠️  MODO DRY-RUN: Nenhuma alteração será feita no banco\n');
  }

  try {
    // Dynamic import to ensure database connection is ready
    const {
      db,
      renovacoesComerciais,
      cotacoes,
      propostasComerciais,
      documentosVenda,
    } = await import('@ecotech/shared/database');

    const results = {
      total: 0,
      atualizadas: 0,
      semDocumento: 0,
      documentoNaoAprovado: 0,
      erros: 0,
      detalhes: [] as Array<{
        renovacaoId: string;
        corretoraId: string;
        statusAnterior: string;
        statusNovo: string;
        documentoNumero: string | null;
        clienteNome?: string;
        mensagem: string;
      }>,
    };

    console.log('🔍 Buscando renovações pendentes...\n');

    // 1. Buscar todas as renovações pendentes
    const renovacoesPendentes = await db.query.renovacoesComerciais.findMany({
      where: inArray(renovacoesComerciais.status, [
        'NAO_TRABALHADO',
        'EM_PROSPECCAO',
        'EM_NEGOCIACAO',
        'AGUARDANDO_CLIENTE',
      ]),
      with: {
        documentoVendaAnterior: {
          columns: {
            id: true,
            numeroDocumento: true,
            status: true,
          },
          with: {
            cliente: {
              columns: {
                id: true,
                nome: true,
                razaoSocial: true,
              },
            },
          },
        },
        cliente: {
          columns: {
            id: true,
            nome: true,
            razaoSocial: true,
          },
        },
      },
    });

    results.total = renovacoesPendentes.length;
    console.log(`📊 Total de renovações pendentes encontradas: ${results.total}\n`);

    if (results.total === 0) {
      console.log('✨ Nenhuma renovação pendente encontrada. Tudo certo!\n');
      return results;
    }

    // 2. Para cada renovação pendente, verificar se há documento de venda aprovado
    for (const renovacao of renovacoesPendentes) {
      const clienteNome =
        renovacao.cliente?.nome ||
        renovacao.cliente?.razaoSocial ||
        renovacao.documentoVendaAnterior?.cliente?.nome ||
        renovacao.documentoVendaAnterior?.cliente?.razaoSocial ||
        'Cliente não identificado';

      if (isVerbose) {
        console.log(`\n${'='.repeat(80)}`);
        console.log(`🔎 Renovação: ${renovacao.id}`);
        console.log(`   Cliente: ${clienteNome}`);
        console.log(`   Status atual: ${renovacao.status}`);
        console.log(`   Vencimento: ${renovacao.dataVencimento}`);
      }

      try {
        // Buscar cotação que referencia esta renovação
        const cotacao = await db.query.cotacoes.findFirst({
          where: sql`${cotacoes.detalhes_risco}::jsonb->>'renovacaoId' = ${renovacao.id}`,
        });

        if (!cotacao) {
          if (isVerbose) {
            console.log(`   ⚠️  Sem cotação vinculada`);
          }
          results.semDocumento++;
          results.detalhes.push({
            renovacaoId: renovacao.id,
            corretoraId: renovacao.corretoraId,
            statusAnterior: renovacao.status,
            statusNovo: renovacao.status,
            documentoNumero: null,
            clienteNome,
            mensagem: 'Sem cotação vinculada',
          });
          continue;
        }

        if (isVerbose) {
          console.log(`   ✓ Cotação: ${cotacao.numeroCotacao}`);
        }

        // Buscar proposta que referencia esta cotação
        const proposta = await db.query.propostasComerciais.findFirst({
          where: eq(propostasComerciais.cotacaoId, cotacao.id),
        });

        if (!proposta) {
          if (isVerbose) {
            console.log(`   ⚠️  Sem proposta vinculada`);
          }
          results.semDocumento++;
          results.detalhes.push({
            renovacaoId: renovacao.id,
            corretoraId: renovacao.corretoraId,
            statusAnterior: renovacao.status,
            statusNovo: renovacao.status,
            documentoNumero: null,
            clienteNome,
            mensagem: 'Sem proposta vinculada',
          });
          continue;
        }

        if (isVerbose) {
          console.log(`   ✓ Proposta: ${proposta.numeroPropostaInterno}`);
        }

        // Buscar documento de venda vinculado à proposta
        if (!proposta.documentoVendaId) {
          if (isVerbose) {
            console.log(`   ⚠️  Proposta sem documento de venda`);
          }
          results.semDocumento++;
          results.detalhes.push({
            renovacaoId: renovacao.id,
            corretoraId: renovacao.corretoraId,
            statusAnterior: renovacao.status,
            statusNovo: renovacao.status,
            documentoNumero: null,
            clienteNome,
            mensagem: 'Proposta sem documento de venda',
          });
          continue;
        }

        const documentoVenda = await db.query.documentosVenda.findFirst({
          where: eq(documentosVenda.id, proposta.documentoVendaId),
        });

        if (!documentoVenda) {
          if (isVerbose) {
            console.log(`   ⚠️  Documento de venda não encontrado`);
          }
          results.semDocumento++;
          results.detalhes.push({
            renovacaoId: renovacao.id,
            corretoraId: renovacao.corretoraId,
            statusAnterior: renovacao.status,
            statusNovo: renovacao.status,
            documentoNumero: null,
            clienteNome,
            mensagem: 'Documento de venda não encontrado',
          });
          continue;
        }

        if (isVerbose) {
          console.log(`   ✓ Documento: ${documentoVenda.numeroDocumento} (status: ${documentoVenda.status})`);
        }

        // Se o documento está ATIVO, atualizar a renovação para RENOVADO
        if (documentoVenda.status === 'ATIVO') {
          console.log(`   ✅ CORRIGINDO: ${clienteNome} - Documento ${documentoVenda.numeroDocumento}`);

          if (!isDryRun) {
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
          }

          results.atualizadas++;
          results.detalhes.push({
            renovacaoId: renovacao.id,
            corretoraId: renovacao.corretoraId,
            statusAnterior: renovacao.status,
            statusNovo: 'RENOVADO',
            documentoNumero: documentoVenda.numeroDocumento,
            clienteNome,
            mensagem: 'Atualizada com sucesso',
          });
        } else {
          if (isVerbose) {
            console.log(`   ℹ️  Documento ainda não aprovado (status: ${documentoVenda.status})`);
          }
          results.documentoNaoAprovado++;
          results.detalhes.push({
            renovacaoId: renovacao.id,
            corretoraId: renovacao.corretoraId,
            statusAnterior: renovacao.status,
            statusNovo: renovacao.status,
            documentoNumero: documentoVenda.numeroDocumento,
            clienteNome,
            mensagem: `Documento em status ${documentoVenda.status}`,
          });
        }
      } catch (error: any) {
        console.error(`   ❌ Erro ao processar renovação ${renovacao.id}:`, error.message);
        results.erros++;
        results.detalhes.push({
          renovacaoId: renovacao.id,
          corretoraId: renovacao.corretoraId,
          statusAnterior: renovacao.status,
          statusNovo: renovacao.status,
          documentoNumero: null,
          clienteNome,
          mensagem: `Erro: ${error.message}`,
        });
      }
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('\n✨ Correção concluída!\n');
    console.log(`📊 Resumo:`);
    console.log(`   Total analisado:              ${results.total}`);
    console.log(`   ✅ Atualizadas para RENOVADO:  ${results.atualizadas}`);
    console.log(`   ⚠️  Sem fluxo completo:         ${results.semDocumento}`);
    console.log(`   ℹ️  Documento não aprovado:     ${results.documentoNaoAprovado}`);
    console.log(`   ❌ Erros:                       ${results.erros}`);

    if (results.atualizadas > 0 && isDryRun) {
      console.log('\n💡 Execute sem --dry-run para aplicar as alterações');
    }

    // Detailed report
    if (results.atualizadas > 0) {
      console.log('\n' + '='.repeat(80));
      console.log('\n📋 Renovações Atualizadas:\n');
      results.detalhes
        .filter(d => d.statusNovo === 'RENOVADO')
        .forEach((d, i) => {
          console.log(`${i + 1}. ${d.clienteNome}`);
          console.log(`   Renovação: ${d.renovacaoId}`);
          console.log(`   Documento: ${d.documentoNumero}`);
          console.log(`   Status: ${d.statusAnterior} → ${d.statusNovo}`);
          console.log('');
        });
    }

    console.log('');
    return results;

  } catch (error: any) {
    console.error('\n❌ Erro fatal:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
main()
  .then(() => {
    console.log('✅ Script finalizado com sucesso\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script falhou:', error);
    process.exit(1);
  });
