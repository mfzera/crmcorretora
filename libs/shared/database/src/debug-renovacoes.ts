import 'dotenv/config';
import { and, eq, sql, gte, lte } from 'drizzle-orm';
import { db } from './connection.js';
import { renovacoesComerciais, usuarios } from './schema/index.js';

const EMAIL = 'ecotech@grupoecosistema.com.br';

async function run() {
  const usuario = await db.query.usuarios.findFirst({
    where: eq(usuarios.email, EMAIL),
    columns: { id: true, nome: true, corretoraId: true, corretoraAtivaId: true },
  });

  if (!usuario) { console.error('Usuário não encontrado'); process.exit(1); }

  const tenantId = (usuario as any).corretoraAtivaId ?? usuario.corretoraId;
  const vendedorId = usuario.id;
  const daysAhead = 45;

  const now = new Date();
  const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  const today = now.toISOString().split('T')[0];
  const future = futureDate.toISOString().split('T')[0];

  console.log(`\n🔍 Parâmetros da query:`);
  console.log(`   tenantId   = ${tenantId}`);
  console.log(`   vendedorId = ${vendedorId}`);
  console.log(`   hoje       = ${today}`);
  console.log(`   +45 dias   = ${future}`);

  // 1. Total sem filtro de data
  const todas = await db.query.renovacoesComerciais.findMany({
    where: and(
      eq(renovacoesComerciais.corretoraId, tenantId),
      eq(renovacoesComerciais.vendedorId, vendedorId),
    ),
    columns: { id: true, status: true, dataVencimento: true },
  });
  console.log(`\n📋 Total sem filtro de data: ${todas.length}`);
  if (todas.length > 0) {
    console.log('   Exemplos:');
    todas.slice(0, 5).forEach(r => console.log(`   - ${r.dataVencimento}  status=${r.status}`));
  }

  // 2. Com filtro de status
  const comStatus = await db.query.renovacoesComerciais.findMany({
    where: and(
      eq(renovacoesComerciais.corretoraId, tenantId),
      eq(renovacoesComerciais.vendedorId, vendedorId),
      sql`${renovacoesComerciais.status} IN ('NAO_TRABALHADO', 'EM_PROSPECCAO', 'EM_NEGOCIACAO', 'AGUARDANDO_CLIENTE')`,
    ),
    columns: { id: true, status: true, dataVencimento: true },
  });
  console.log(`\n📋 Com filtro de status (não finalizado): ${comStatus.length}`);

  // 3. Exata mesma query do findPending
  const pending = await db.query.renovacoesComerciais.findMany({
    where: and(
      eq(renovacoesComerciais.corretoraId, tenantId),
      sql`${renovacoesComerciais.status} IN ('NAO_TRABALHADO', 'EM_PROSPECCAO', 'EM_NEGOCIACAO', 'AGUARDANDO_CLIENTE')`,
      gte(renovacoesComerciais.dataVencimento, today),
      lte(renovacoesComerciais.dataVencimento, future),
      eq(renovacoesComerciais.vendedorId, vendedorId),
    ),
    columns: { id: true, status: true, dataVencimento: true },
  });
  console.log(`\n✅ Query exata do findPending (resultado): ${pending.length}`);
  pending.forEach(r => console.log(`   - ${r.dataVencimento}  status=${r.status}`));

  process.exit(0);
}

run().catch((e) => { console.error(e); process.exit(1); });
