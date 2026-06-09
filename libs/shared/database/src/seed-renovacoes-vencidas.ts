import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from './connection.js';
import { usuarioCorretora, clientes, renovacoesComerciais } from './schema/index.js';

const CORRETORA_ID = '3a38da96-c4f6-461d-a6d0-c52c0784a4b8';

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randDecimal(min: number, max: number): string {
  return (Math.random() * (max - min) + min).toFixed(2);
}
function pastDateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

async function run() {
  const uc = await db
    .select({ usuarioId: usuarioCorretora.usuarioId })
    .from(usuarioCorretora)
    .where(eq(usuarioCorretora.corretoraId, CORRETORA_ID));

  const vendedorIds = uc.map((r) => r.usuarioId);

  const cs = await db
    .select({ id: clientes.id })
    .from(clientes)
    .where(eq(clientes.corretoraId, CORRETORA_ID))
    .limit(10);

  const clienteIds = cs.map((c) => c.id);
  const produtos = ['Seguro Auto', 'Seguro Residencial', 'Seguro Vida', 'Seguro Empresarial'];
  const seguradoras = ['Porto Seguro', 'Bradesco Seguros', 'SulAmérica', 'Tokio Marine'];

  const itens: Array<{ dias: number; status: 'NAO_TRABALHADO' | 'EM_PROSPECCAO' }> = [
    { dias: 2,  status: 'NAO_TRABALHADO' },
    { dias: 5,  status: 'NAO_TRABALHADO' },
    { dias: 10, status: 'EM_PROSPECCAO' },
    { dias: 18, status: 'NAO_TRABALHADO' },
  ];

  const rows = itens.map(({ dias, status }) => {
    const premioAnterior = randDecimal(1500, 12000);
    const comissao = randDecimal(7, 14);
    return {
      id: randomUUID(),
      corretoraId: CORRETORA_ID,
      vendedorId: pick(vendedorIds),
      clienteId: pick(clienteIds),
      status,
      dataVencimento: pastDateStr(dias),
      produtoDescricao: pick(produtos),
      seguradoraAnterior: pick(seguradoras),
      premioAnterior,
      percentualComissaoAnterior: comissao,
      valorComissaoAnterior: ((parseFloat(premioAnterior) * parseFloat(comissao)) / 100).toFixed(2),
    };
  });

  await db.insert(renovacoesComerciais).values(rows).onConflictDoNothing();

  console.log(`✅ ${rows.length} renovações vencidas inseridas:`);
  rows.forEach((r) => console.log(`   - ${r.produtoDescricao} (${r.seguradoraAnterior}) — venceu há ${itens[rows.indexOf(r)].dias} dias`));
  process.exit(0);
}

run().catch((e) => { console.error(e); process.exit(1); });
