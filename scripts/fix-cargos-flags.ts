/**
 * Script para atualizar flags isVendedor e isGestor nos cargos existentes
 */

import { db, cargos } from '@ecotech/shared/database';
import { eq, or, ilike, sql } from 'drizzle-orm';

async function fixCargosFlags() {
  try {
    console.log('🔧 Iniciando atualização de flags de cargos...\n');

    // Buscar todos os cargos
    const todosCargos = await db.query.cargos.findMany();
    console.log(`📋 Total de cargos encontrados: ${todosCargos.length}\n`);

    let updated = 0;

    // Atualizar cargos de Gerente/Gestor
    const cargosGerente = todosCargos.filter((c) =>
      c.nome.toLowerCase().includes('gerente') ||
      c.nome.toLowerCase().includes('gestor') ||
      c.nome.toLowerCase().includes('diretor') ||
      c.nome.toLowerCase().includes('supervisor')
    );

    console.log(`👔 Cargos identificados como GESTOR (${cargosGerente.length}):`);
    for (const cargo of cargosGerente) {
      console.log(`   - ${cargo.nome} (ID: ${cargo.id})`);

      if (!cargo.isGestor) {
        await db
          .update(cargos)
          .set({ isGestor: true })
          .where(eq(cargos.id, cargo.id));
        console.log(`     ✅ Atualizado isGestor = true`);
        updated++;
      } else {
        console.log(`     ℹ️  Já tinha isGestor = true`);
      }
    }

    console.log();

    // Atualizar cargos de Vendedor
    const cargosVendedor = todosCargos.filter((c) =>
      c.nome.toLowerCase().includes('vendedor') ||
      c.nome.toLowerCase().includes('consultor') ||
      c.nome.toLowerCase().includes('corretor')
    );

    console.log(`💼 Cargos identificados como VENDEDOR (${cargosVendedor.length}):`);
    for (const cargo of cargosVendedor) {
      console.log(`   - ${cargo.nome} (ID: ${cargo.id})`);

      if (!cargo.isVendedor) {
        await db
          .update(cargos)
          .set({ isVendedor: true })
          .where(eq(cargos.id, cargo.id));
        console.log(`     ✅ Atualizado isVendedor = true`);
        updated++;
      } else {
        console.log(`     ℹ️  Já tinha isVendedor = true`);
      }
    }

    console.log();

    // Listar cargos não atualizados
    const cargosNaoAtualizados = todosCargos.filter(
      (c) =>
        !cargosGerente.includes(c) &&
        !cargosVendedor.includes(c) &&
        !c.isGestor &&
        !c.isVendedor
    );

    if (cargosNaoAtualizados.length > 0) {
      console.log(`⚠️  Cargos SEM flags (${cargosNaoAtualizados.length}):`);
      for (const cargo of cargosNaoAtualizados) {
        console.log(`   - ${cargo.nome} (ID: ${cargo.id})`);
        console.log(`     💡 Este cargo precisa ser configurado manualmente`);
      }
      console.log();
    }

    // Buscar usuários e seus cargos
    const usuarios = await db.query.usuarios.findMany({
      with: {
        cargo: true,
      },
    });

    console.log(`\n👥 Resumo de usuários por tipo de cargo:`);
    const gestores = usuarios.filter((u) => u.cargo?.isGestor);
    const vendedores = usuarios.filter((u) => u.cargo?.isVendedor);
    const outros = usuarios.filter((u) => !u.cargo?.isGestor && !u.cargo?.isVendedor);

    console.log(`   Gestores: ${gestores.length}`);
    gestores.forEach((u) => console.log(`     - ${u.nome} (${u.cargo?.nome})`));

    console.log(`\n   Vendedores: ${vendedores.length}`);
    vendedores.forEach((u) => console.log(`     - ${u.nome} (${u.cargo?.nome})`));

    if (outros.length > 0) {
      console.log(`\n   Outros: ${outros.length}`);
      outros.forEach((u) => console.log(`     - ${u.nome} (${u.cargo?.nome || 'SEM CARGO'})`));
    }

    console.log(`\n✅ Atualização concluída!`);
    console.log(`   Total de cargos atualizados: ${updated}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao atualizar cargos:', error);
    process.exit(1);
  }
}

fixCargosFlags();
