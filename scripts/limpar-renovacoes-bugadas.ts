#!/usr/bin/env tsx
/**
 * Script para limpar renovações bugadas
 *
 * Este script identifica e corrige renovações que estão com status incorreto:
 * 1. Renovações cujo documento já foi aprovado devem ter status RENOVADO
 * 2. Renovações com vencimento no passado devem ser marcadas como PERDIDO ou CANCELADO
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Carregar variáveis de ambiente
config({ path: resolve(process.cwd(), '.env.development') });

import {
  db,
  renovacoesComerciais,
  documentosVenda,
} from '../libs/shared/database/src/index.js';
import { eq, and, sql, lt } from 'drizzle-orm';

async function limparRenovacoesBugadas() {
  console.log('🔍 Iniciando limpeza de renovações bugadas...\n');

  try {
    // 1. Buscar todas as renovações com status NAO_TRABALHADO, EM_PROSPECCAO, EM_NEGOCIACAO, AGUARDANDO_CLIENTE
    const renovacoesPendentes = await db.query.renovacoesComerciais.findMany({
      where: sql`${renovacoesComerciais.status} IN ('NAO_TRABALHADO', 'EM_PROSPECCAO', 'EM_NEGOCIACAO', 'AGUARDANDO_CLIENTE')`,
      with: {
        documentoVendaAnterior: true,
      },
    });

    console.log(
      `📊 Total de renovações pendentes: ${renovacoesPendentes.length}\n`,
    );

    let contadores = {
      renovado: 0,
      perdido: 0,
      semDocumento: 0,
      mantido: 0,
    };

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    for (const renovacao of renovacoesPendentes) {
      const docAnterior = (renovacao as any).documentoVendaAnterior;

      // Se não tem documento anterior, não conseguimos determinar o status
      if (!docAnterior) {
        console.log(
          `⚠️  Renovação ${renovacao.id} sem documento anterior - ignorando`,
        );
        contadores.semDocumento++;
        continue;
      }

      // Se o documento anterior está ATIVO, significa que foi aprovado
      // E a renovação deveria estar marcada como RENOVADO
      if (docAnterior.status === 'ATIVO') {
        console.log(
          `✅ Marcando renovação ${renovacao.id} como RENOVADO (documento ${docAnterior.numeroDocumento} está ATIVO)`,
        );

        await db
          .update(renovacoesComerciais)
          .set({
            status: 'RENOVADO',
            dataFinalizacao: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(renovacoesComerciais.id, renovacao.id));

        contadores.renovado++;
        continue;
      }

      // Se a data de vencimento já passou há mais de 30 dias e ainda está pendente,
      // marcar como PERDIDO
      const dataVencimento = new Date(renovacao.dataVencimento);
      dataVencimento.setHours(0, 0, 0, 0);
      const diasDesdeVencimento = Math.floor(
        (hoje.getTime() - dataVencimento.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (diasDesdeVencimento > 30) {
        console.log(
          `❌ Marcando renovação ${renovacao.id} como PERDIDO (vencida há ${diasDesdeVencimento} dias)`,
        );

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

      // Se chegou aqui, a renovação está dentro dos padrões normais
      contadores.mantido++;
    }

    console.log('\n📈 Resumo da limpeza:');
    console.log(
      `   ✅ Renovações marcadas como RENOVADO: ${contadores.renovado}`,
    );
    console.log(
      `   ❌ Renovações marcadas como PERDIDO: ${contadores.perdido}`,
    );
    console.log(
      `   ⚠️  Renovações sem documento anterior: ${contadores.semDocumento}`,
    );
    console.log(
      `   ✓  Renovações mantidas (dentro do padrão): ${contadores.mantido}`,
    );
    console.log(`\n✨ Limpeza concluída com sucesso!`);
  } catch (error) {
    console.error('❌ Erro ao limpar renovações:', error);
    throw error;
  }
}

// Executar script
limparRenovacoesBugadas()
  .then(() => {
    console.log('\n✅ Script finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro fatal:', error);
    process.exit(1);
  });
