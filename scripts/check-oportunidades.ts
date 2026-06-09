import { db } from '@ecotech/shared/database';
import { oportunidades, usuarios } from '@ecotech/shared/database';
import { isNull } from 'drizzle-orm';

async function checkOportunidades() {
  try {
    // Contar total de oportunidades
    const allOportunidades = await db.query.oportunidades.findMany({
      where: isNull(oportunidades.deletedAt),
      with: {
        vendedor: {
          columns: {
            id: true,
            nome: true,
          },
        },
      },
    });

    console.log('📊 Total de oportunidades no banco:', allOportunidades.length);

    if (allOportunidades.length > 0) {
      console.log('\n📋 Primeiras 5 oportunidades:');
      allOportunidades.slice(0, 5).forEach((op, idx) => {
        console.log(`\n${idx + 1}. ${op.nomeCliente}`);
        console.log(`   Status: ${op.status}`);
        console.log(`   Vendedor: ${op.vendedor?.nome || 'N/A'} (${op.vendedorId})`);
        console.log(`   Seguradora ID: ${op.corretoraId}`);
      });

      // Agrupar por status
      const porStatus = allOportunidades.reduce((acc, op) => {
        acc[op.status] = (acc[op.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log('\n📈 Oportunidades por status:');
      Object.entries(porStatus).forEach(([status, count]) => {
        console.log(`   ${status}: ${count}`);
      });

      // Agrupar por seguradora
      const porSeguradora = allOportunidades.reduce((acc, op) => {
        acc[op.corretoraId] = (acc[op.corretoraId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log('\n🏢 Oportunidades por seguradora:');
      Object.entries(porSeguradora).forEach(([segId, count]) => {
        console.log(`   ${segId}: ${count}`);
      });
    }

    // Verificar gestores
    const gestores = await db.query.usuarios.findMany({
      where: isNull(usuarios.deletedAt),
      with: {
        cargo: {
          columns: {
            id: true,
            nome: true,
            isGestor: true,
          },
        },
      },
    });

    const gestoresFiltrados = gestores.filter((u) => u.cargo?.isGestor);
    console.log('\n👔 Total de gestores:', gestoresFiltrados.length);

    if (gestoresFiltrados.length > 0) {
      console.log('\n👥 Gestores encontrados:');
      gestoresFiltrados.forEach((g) => {
        console.log(`   - ${g.nome} (${g.email})`);
        console.log(`     Cargo: ${g.cargo?.nome}`);
        console.log(`     Seguradora: ${g.corretoraId}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

checkOportunidades();
