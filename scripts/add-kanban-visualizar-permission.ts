#!/usr/bin/env tsx

/**
 * Script para adicionar a permissão kanban:visualizar que está faltando
 *
 * Este script:
 * 1. Cria a permissão 'kanban:visualizar'
 * 2. Atribui aos cargos que já têm 'kanban:acessar'
 *
 * Uso: pnpm tsx scripts/add-kanban-visualizar-permission.ts
 */

import 'dotenv/config';
import {
  db,
  permissoesGlobais,
  cargos,
  cargoPermissoes,
} from '../libs/shared/database/src/index.js';
import { eq, and } from 'drizzle-orm';

async function main() {
  console.log('🚀 Adicionando permissão kanban:visualizar...\n');

  try {
    // 1. Criar a permissão kanban:visualizar
    console.log('📝 Criando permissão kanban:visualizar...');

    const existente = await db.query.permissoesGlobais.findFirst({
      where: eq(permissoesGlobais.nomePermissao, 'kanban:visualizar'),
    });

    let permissaoVisualizar;

    if (existente) {
      console.log('   ⏭️  Permissão kanban:visualizar já existe');
      permissaoVisualizar = existente;
    } else {
      const [nova] = await db
        .insert(permissoesGlobais)
        .values({
          nomePermissao: 'kanban:visualizar',
          descricao: 'Permite visualizar as próprias oportunidades no kanban',
          grupo: 'kanban',
        })
        .returning();
      console.log('   ✅ Permissão kanban:visualizar criada');
      permissaoVisualizar = nova;
    }

    // 2. Buscar a permissão kanban:acessar
    console.log('\n🔍 Buscando permissão kanban:acessar...');
    const permissaoAcessar = await db.query.permissoesGlobais.findFirst({
      where: eq(permissoesGlobais.nomePermissao, 'kanban:acessar'),
    });

    if (!permissaoAcessar) {
      console.log('   ⚠️  Permissão kanban:acessar não encontrada');
      return;
    }

    // 3. Buscar todos os cargos que têm kanban:acessar
    console.log('\n🔍 Buscando cargos com kanban:acessar...');
    const cargosComAcessar = await db.query.cargoPermissoes.findMany({
      where: eq(cargoPermissoes.permissaoGlobalId, permissaoAcessar.id),
      with: {
        cargo: true,
      },
    });

    console.log(`   Encontrados ${cargosComAcessar.length} cargos\n`);

    // 4. Atribuir kanban:visualizar a esses cargos
    console.log('🔗 Atribuindo kanban:visualizar aos cargos...');
    let totalAtribuicoes = 0;

    for (const cp of cargosComAcessar) {
      const cargo = cp.cargo;
      console.log(`   Processando cargo: ${cargo.nomeCargo}`);

      // Verificar se já tem a permissão
      const jaAtribuida = await db.query.cargoPermissoes.findFirst({
        where: and(
          eq(cargoPermissoes.cargoId, cargo.id),
          eq(cargoPermissoes.permissaoGlobalId, permissaoVisualizar.id),
        ),
      });

      if (jaAtribuida) {
        console.log('      ⏭️  kanban:visualizar já atribuída');
      } else {
        await db.insert(cargoPermissoes).values({
          cargoId: cargo.id,
          permissaoGlobalId: permissaoVisualizar.id,
        });
        console.log('      ✅ kanban:visualizar atribuída');
        totalAtribuicoes++;
      }
    }

    console.log(`\n✨ Processo concluído!`);
    console.log(`   - ${totalAtribuicoes} novas atribuições criadas`);

    console.log('\n📋 Próximos passos:');
    console.log('   1. Os usuários devem fazer LOGOUT e LOGIN novamente');
    console.log('   2. O token será atualizado com a nova permissão');
  } catch (error) {
    console.error('\n❌ Erro ao executar script:', error);
    process.exit(1);
  }
}

main()
  .then(() => {
    console.log('\n👋 Script finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Erro fatal:', error);
    process.exit(1);
  });
