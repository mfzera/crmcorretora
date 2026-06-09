import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from './connection.js';
import { usuarioCorretora, clientes, renovacoesComerciais } from './schema/index.js';

const CORRETORA_ID = '3a38da96-c4f6-461d-a6d0-c52c0784a4b8';
const FALLBACK_USER_ID = 'ca1ff661-c8fd-4932-9d6c-c2cc78a3ed76';

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randDecimal(min: number, max: number): string {
  return (Math.random() * (max - min) + min).toFixed(2);
}
function futureDateStr(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split('T')[0];
}

async function run() {
  const uc = await db
    .select({ usuarioId: usuarioCorretora.usuarioId })
    .from(usuarioCorretora)
    .where(eq(usuarioCorretora.corretoraId, CORRETORA_ID));

  const vendedorIds: string[] = uc.length > 0
    ? uc.map((r) => r.usuarioId)
    : [FALLBACK_USER_ID];

  console.log(`👤 Vendedores encontrados: ${vendedorIds.length} (${vendedorIds.join(', ')})`);

  const cs = await db
    .select({ id: clientes.id })
    .from(clientes)
    .where(eq(clientes.corretoraId, CORRETORA_ID))
    .limit(20);

  const clienteIds: (string | null)[] = cs.length > 0 ? cs.map((c) => c.id) : [null];

  const produtos = ['Seguro Auto', 'Seguro Residencial', 'Seguro Vida', 'Seguro Empresarial', 'Seguro Condomínio'];
  const seguradoras = ['Porto Seguro', 'Bradesco Seguros', 'SulAmérica', 'Allianz', 'Tokio Marine'];

  const itens: Array<{ dias: number; status: 'NAO_TRABALHADO' | 'EM_PROSPECCAO' | 'EM_NEGOCIACAO' | 'AGUARDANDO_CLIENTE' }> = [
    { dias: 3,  status: 'NAO_TRABALHADO' },
    { dias: 5,  status: 'NAO_TRABALHADO' },
    { dias: 7,  status: 'NAO_TRABALHADO' },
    { dias: 10, status: 'NAO_TRABALHADO' },
    { dias: 12, status: 'NAO_TRABALHADO' },
    { dias: 15, status: 'NAO_TRABALHADO' },
    { dias: 18, status: 'NAO_TRABALHADO' },
    { dias: 20, status: 'NAO_TRABALHADO' },
    { dias: 25, status: 'NAO_TRABALHADO' },
    { dias: 30, status: 'NAO_TRABALHADO' },
    { dias: 14, status: 'EM_PROSPECCAO' },
    { dias: 21, status: 'EM_PROSPECCAO' },
    { dias: 22, status: 'EM_NEGOCIACAO' },
    { dias: 28, status: 'AGUARDANDO_CLIENTE' },
  ];

  const rows = itens.map(({ dias, status }) => {
    const premioAnterior = randDecimal(1200, 15000);
    const comissaoAnterior = randDecimal(7, 14);
    const vId = pick(vendedorIds);
    const cId = pick(clienteIds);
    return {
      id: randomUUID(),
      corretoraId: CORRETORA_ID,
      vendedorId: vId,
      clienteId: cId,
      status,
      dataVencimento: futureDateStr(dias),
      produtoDescricao: pick(produtos),
      seguradoraAnterior: pick(seguradoras),
      premioAnterior,
      percentualComissaoAnterior: comissaoAnterior,
      valorComissaoAnterior: ((parseFloat(premioAnterior) * parseFloat(comissaoAnterior)) / 100).toFixed(2),
    };
  });

  await db.insert(renovacoesComerciais).values(rows).onConflictDoNothing();

  console.log(`✅ ${rows.length} renovações inseridas:`);
  console.log(`   - 10 pendentes (NAO_TRABALHADO) — vencendo em 3 a 30 dias`);
  console.log(`   - 2 em prospecção`);
  console.log(`   - 1 em negociação`);
  console.log(`   - 1 aguardando cliente`);
  process.exit(0);
}

run().catch((e) => { console.error(e); process.exit(1); });
