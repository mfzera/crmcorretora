#!/usr/bin/env tsx

/**
 * Script para adicionar permissões de Gestão CRM ao sistema
 *
 * Este script:
 * 1. Cria a permissão 'gestao_crm:acessar'
 * 2. Adiciona permissões de kanban detalhadas
 * 3. Atribui as permissões aos cargos de Gerente
 *
 * Uso: pnpm tsx scripts/add-gestao-crm-permissions.ts
 */

import 'dotenv/config';
import {
  db,
  permissoesGlobais,
  cargos,
  cargoPermissoes,
} from '../libs/shared/database/src/index.js';
import { eq, and, inArray } from 'drizzle-orm';

const NOVAS_PERMISSOES = [
  {
    nomePermissao: 'gestao_crm:acessar',
    descricao:
      'Permite acessar o módulo de Gestão CRM para gerenciar oportunidades da equipe',
    grupo: 'gestao',
  },
  {
    nomePermissao: 'kanban:visualizar_todas',
    descricao:
      'Permite visualizar oportunidades de todos os vendedores no kanban',
    grupo: 'kanban',
  },
  {
    nomePermissao: 'kanban:criar',
    descricao: 'Permite criar novas oportunidades no kanban',
    grupo: 'kanban',
  },
  {
    nomePermissao: 'kanban:editar',
    descricao: 'Permite editar oportunidades no kanban',
    grupo: 'kanban',
  },
  {
    nomePermissao: 'kanban:deletar',
    descricao: 'Permite deletar oportunidades no kanban',
    grupo: 'kanban',
  },
  {
    nomePermissao: 'kanban:fechar',
    descricao: 'Permite marcar oportunidades como ganhas',
    grupo: 'kanban',
  },
  {
    nomePermissao: 'kanban:perder',
    descricao: 'Permite marcar oportunidades como perdidas',
    grupo: 'kanban',
  },
  {
    nomePermissao: 'performance:visualizar',
    descricao: 'Permite visualizar métricas de performance',
    grupo: 'performance',
  },
];

async function main() {
  console.log('🚀 Iniciando adição de permissões de Gestão CRM...\n');

  try {
    // 1. Criar ou atualizar permissões
    console.log('📝 Criando/Atualizando permissões...');
    const permissoesCriadas = [];

    for (const permissao of NOVAS_PERMISSOES) {
      // Verificar se a permissão já existe
      const existente = await db.query.permissoesGlobais.findFirst({
        where: eq(permissoesGlobais.nomePermissao, permissao.nomePermissao),
      });

      if (existente) {
        console.log(`   ⏭️  Permissão '${permissao.nomePermissao}' já existe`);
        permissoesCriadas.push(existente);
      } else {
        const [nova] = await db
          .insert(permissoesGlobais)
          .values(permissao)
          .returning();
        console.log(`   ✅ Permissão '${permissao.nomePermissao}' criada`);
        permissoesCriadas.push(nova);
      }
    }

    // 2. Buscar todos os cargos de Gerente
    console.log('\n🔍 Buscando cargos de Gerente...');
    const cargosGerente = await db.query.cargos.findMany({
      where: eq(cargos.isGestor, true),
    });

    console.log(`   Encontrados ${cargosGerente.length} cargos de gestor\n`);

    // 3. Atribuir permissões aos cargos de Gerente
    console.log('🔗 Atribuindo permissões aos cargos de Gerente...');
    let totalAtribuicoes = 0;

    for (const cargo of cargosGerente) {
      console.log(
        `\n   Processando cargo: ${cargo.nomeCargo} (${cargo.corretoraId})`,
      );

      for (const permissao of permissoesCriadas) {
        // Verificar se a permissão já está atribuída ao cargo
        const jaAtribuida = await db.query.cargoPermissoes.findFirst({
          where: and(
            eq(cargoPermissoes.cargoId, cargo.id),
            eq(cargoPermissoes.permissaoGlobalId, permissao.id),
          ),
        });

        if (jaAtribuida) {
          console.log(`      ⏭️  '${permissao.nomePermissao}' já atribuída`);
        } else {
          await db.insert(cargoPermissoes).values({
            cargoId: cargo.id,
            permissaoGlobalId: permissao.id,
          });
          console.log(`      ✅ '${permissao.nomePermissao}' atribuída`);
          totalAtribuicoes++;
        }
      }
    }

    console.log(`\n✨ Processo concluído com sucesso!`);
    console.log(`   - ${permissoesCriadas.length} permissões processadas`);
    console.log(`   - ${cargosGerente.length} cargos de gerente atualizados`);
    console.log(`   - ${totalAtribuicoes} novas atribuições criadas`);

    console.log('\n📋 Próximos passos:');
    console.log(
      '   1. Reinicie o servidor backend para carregar as novas permissões',
    );
    console.log('   2. Faça logout e login novamente no frontend');
    console.log('   3. Acesse o menu "Gestão CRM" como usuário gerente');
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
