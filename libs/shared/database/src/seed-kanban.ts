import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { eq, isNull } from 'drizzle-orm';
import { db } from './connection.js';
import { usuarios, oportunidades, produtos } from './schema/index.js';

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randDecimal(min: number, max: number): string {
  return (Math.random() * (max - min) + min).toFixed(2);
}

function futureDate(daysAhead: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d;
}

function pastDate(daysAgo: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d;
}

const CLIENTES = [
  { nome: 'Mariana Souza',      email: 'mariana.souza@email.com',    tel: '(11) 98765-4321' },
  { nome: 'Carlos Ferreira',    email: 'carlos.ferreira@empresa.com', tel: '(21) 97654-3210' },
  { nome: 'Ana Paula Lima',     email: 'ana.lima@outlook.com',        tel: '(31) 96543-2109' },
  { nome: 'Roberto Almeida',    email: 'roberto.almeida@gmail.com',   tel: '(41) 95432-1098' },
  { nome: 'Juliana Costa',      email: 'juliana.costa@empresa.br',    tel: '(51) 94321-0987' },
  { nome: 'Thiago Oliveira',    email: 'thiago.oliveira@hotmail.com', tel: '(11) 93210-9876' },
  { nome: 'Fernanda Santos',    email: 'fernanda.santos@email.com',   tel: '(21) 92109-8765' },
  { nome: 'Gustavo Rodrigues',  email: null,                          tel: '(31) 91098-7654' },
  { nome: 'Beatriz Mendes',     email: 'beatriz.mendes@gmail.com',    tel: null                },
  { nome: 'Paulo Nascimento',   email: 'paulo.nasc@corporativo.com',  tel: '(41) 99887-6655' },
  { nome: 'Larissa Martins',    email: 'larissa.m@email.com',         tel: '(51) 98776-5544' },
  { nome: 'Diego Barbosa',      email: 'diego.barbosa@outlook.com',   tel: '(11) 97665-4433' },
  { nome: 'Camila Pereira',     email: 'camila.p@empresa.com',        tel: '(21) 96554-3322' },
  { nome: 'Renato Carvalho',    email: 'renato.carvalho@gmail.com',   tel: '(31) 95443-2211' },
  { nome: 'Patrícia Gomes',     email: null,                          tel: '(41) 94332-1100' },
  { nome: 'Marcelo Teixeira',   email: 'marcelo.t@empresa.br',        tel: '(51) 93221-0099' },
  { nome: 'Simone Ribeiro',     email: 'simone.ribeiro@hotmail.com',  tel: '(11) 92110-9988' },
  { nome: 'André Monteiro',     email: 'andre.monteiro@email.com',    tel: '(21) 91009-8877' },
  { nome: 'Vanessa Cunha',      email: 'vanessa.cunha@gmail.com',     tel: '(31) 99998-7766' },
  { nome: 'Leonardo Pinto',     email: 'leo.pinto@corporativo.com',   tel: '(41) 98887-6655' },
];

const OBSERVACOES = [
  'Cliente demonstrou interesse em coberturas adicionais.',
  'Aguardando retorno para apresentação da proposta.',
  'Já possui apólice com concorrente, vencendo em breve.',
  'Indicação de cliente satisfeito da carteira.',
  'Interesse em pacote completo família + automóvel.',
  null,
  'Cliente solicita prazo até final do mês para decidir.',
  null,
  'Reunião agendada para semana que vem.',
  null,
];

async function run() {
  // Encontrar usuário de referência para pegar a corretora
  const usuario = await db.query.usuarios.findFirst({
    where: eq(usuarios.email, 'ecotech@grupoecosistema.com.br'),
    columns: { id: true, nome: true, corretoraId: true, corretoraAtivaId: true },
  });

  if (!usuario) {
    console.error('❌ Usuário ecotech@grupoecosistema.com.br não encontrado');
    process.exit(1);
  }

  const corretoraId = (usuario as any).corretoraAtivaId ?? usuario.corretoraId;
  console.log(`✅ Corretora: ${corretoraId}`);

  // Buscar vendedores da corretora
  const vendedoresList = await db.query.usuarios.findMany({
    where: eq(usuarios.corretoraId, corretoraId),
    columns: { id: true, nome: true },
  });

  if (vendedoresList.length === 0) {
    console.error('❌ Nenhum vendedor encontrado para esta corretora');
    process.exit(1);
  }
  console.log(`👥 ${vendedoresList.length} vendedor(es): ${vendedoresList.map((v) => v.nome).join(', ')}`);

  // Buscar produtos da corretora (opcional)
  const produtosList = await db
    .select({ id: produtos.id, nome: produtos.nomeProduto })
    .from(produtos)
    .where(eq(produtos.corretoraId, corretoraId))
    .limit(10);

  const produtoIds = produtosList.map((p) => p.id);
  console.log(`📦 ${produtoIds.length} produto(s) encontrado(s)`);

  const rows = [
    // ── LEAD (6 cards) ─────────────────────────────────────────────
    {
      status: 'lead' as const, prioridade: 'urgente' as const, temperatura: 'quente' as const,
      clienteIdx: 0, premioEstimado: randDecimal(3000, 8000),
      dataVencimento: futureDate(5), dataUltimoContato: pastDate(1), ordem: 1,
    },
    {
      status: 'lead' as const, prioridade: 'alta' as const, temperatura: 'quente' as const,
      clienteIdx: 1, premioEstimado: randDecimal(1500, 4000),
      dataVencimento: futureDate(12), dataUltimoContato: pastDate(3), ordem: 2,
    },
    {
      status: 'lead' as const, prioridade: 'media' as const, temperatura: 'morno' as const,
      clienteIdx: 2, premioEstimado: randDecimal(800, 2500),
      dataVencimento: null, dataUltimoContato: pastDate(7), ordem: 3,
    },
    {
      status: 'lead' as const, prioridade: 'media' as const, temperatura: 'frio' as const,
      clienteIdx: 3, premioEstimado: null,
      dataVencimento: futureDate(30), dataUltimoContato: null, ordem: 4,
    },
    {
      status: 'lead' as const, prioridade: 'baixa' as const, temperatura: 'frio' as const,
      clienteIdx: 4, premioEstimado: randDecimal(500, 1500),
      dataVencimento: null, dataUltimoContato: pastDate(14), ordem: 5,
    },
    {
      status: 'lead' as const, prioridade: 'alta' as const, temperatura: 'morno' as const,
      clienteIdx: 5, premioEstimado: randDecimal(5000, 15000),
      dataVencimento: futureDate(3), dataUltimoContato: pastDate(2), ordem: 6,
    },

    // ── CONTATO INICIAL (5 cards) ──────────────────────────────────
    {
      status: 'contato_inicial' as const, prioridade: 'urgente' as const, temperatura: 'quente' as const,
      clienteIdx: 6, premioEstimado: randDecimal(4000, 10000),
      dataVencimento: futureDate(7), dataUltimoContato: pastDate(1), ordem: 1,
    },
    {
      status: 'contato_inicial' as const, prioridade: 'alta' as const, temperatura: 'quente' as const,
      clienteIdx: 7, premioEstimado: randDecimal(2000, 6000),
      dataVencimento: futureDate(20), dataUltimoContato: pastDate(2), ordem: 2,
    },
    {
      status: 'contato_inicial' as const, prioridade: 'media' as const, temperatura: 'morno' as const,
      clienteIdx: 8, premioEstimado: randDecimal(1000, 3000),
      dataVencimento: null, dataUltimoContato: pastDate(5), ordem: 3,
    },
    {
      status: 'contato_inicial' as const, prioridade: 'media' as const, temperatura: 'morno' as const,
      clienteIdx: 9, premioEstimado: null,
      dataVencimento: futureDate(45), dataUltimoContato: pastDate(8), ordem: 4,
    },
    {
      status: 'contato_inicial' as const, prioridade: 'baixa' as const, temperatura: 'frio' as const,
      clienteIdx: 10, premioEstimado: randDecimal(600, 1800),
      dataVencimento: null, dataUltimoContato: pastDate(15), ordem: 5,
    },

    // ── NEGOCIAÇÃO (6 cards) ───────────────────────────────────────
    {
      status: 'negociacao' as const, prioridade: 'urgente' as const, temperatura: 'quente' as const,
      clienteIdx: 11, premioEstimado: randDecimal(8000, 20000),
      dataVencimento: futureDate(4), dataUltimoContato: pastDate(1), ordem: 1,
    },
    {
      status: 'negociacao' as const, prioridade: 'alta' as const, temperatura: 'quente' as const,
      clienteIdx: 12, premioEstimado: randDecimal(5000, 12000),
      dataVencimento: futureDate(10), dataUltimoContato: pastDate(2), ordem: 2,
    },
    {
      status: 'negociacao' as const, prioridade: 'alta' as const, temperatura: 'morno' as const,
      clienteIdx: 13, premioEstimado: randDecimal(3000, 7000),
      dataVencimento: futureDate(15), dataUltimoContato: pastDate(3), ordem: 3,
    },
    {
      status: 'negociacao' as const, prioridade: 'media' as const, temperatura: 'morno' as const,
      clienteIdx: 14, premioEstimado: randDecimal(1500, 4000),
      dataVencimento: futureDate(25), dataUltimoContato: pastDate(6), ordem: 4,
    },
    {
      status: 'negociacao' as const, prioridade: 'media' as const, temperatura: 'frio' as const,
      clienteIdx: 15, premioEstimado: randDecimal(900, 2500),
      dataVencimento: null, dataUltimoContato: pastDate(10), ordem: 5,
    },
    {
      status: 'negociacao' as const, prioridade: 'baixa' as const, temperatura: 'frio' as const,
      clienteIdx: 16, premioEstimado: randDecimal(400, 1200),
      dataVencimento: null, dataUltimoContato: pastDate(20), ordem: 6,
    },

    // ── GANHA (4 cards) ────────────────────────────────────────────
    {
      status: 'ganha' as const, prioridade: 'alta' as const, temperatura: 'quente' as const,
      clienteIdx: 17, premioEstimado: randDecimal(6000, 15000),
      dataVencimento: null, dataUltimoContato: pastDate(5), ordem: 1,
      valorFechado: randDecimal(6000, 15000),
    },
    {
      status: 'ganha' as const, prioridade: 'media' as const, temperatura: 'quente' as const,
      clienteIdx: 18, premioEstimado: randDecimal(3000, 8000),
      dataVencimento: null, dataUltimoContato: pastDate(3), ordem: 2,
      valorFechado: randDecimal(3000, 8000),
    },
    {
      status: 'ganha' as const, prioridade: 'alta' as const, temperatura: 'morno' as const,
      clienteIdx: 19, premioEstimado: randDecimal(4000, 10000),
      dataVencimento: null, dataUltimoContato: pastDate(8), ordem: 3,
      valorFechado: randDecimal(4000, 10000),
    },
    {
      status: 'ganha' as const, prioridade: 'media' as const, temperatura: 'morno' as const,
      clienteIdx: 0, premioEstimado: randDecimal(1800, 5000),
      dataVencimento: null, dataUltimoContato: pastDate(12), ordem: 4,
      valorFechado: randDecimal(1800, 5000),
    },

    // ── PERDIDA (4 cards) ──────────────────────────────────────────
    {
      status: 'perdida' as const, prioridade: 'alta' as const, temperatura: 'frio' as const,
      clienteIdx: 1, premioEstimado: randDecimal(4000, 9000),
      dataVencimento: null, dataUltimoContato: pastDate(20), ordem: 1,
      motivoPerda: 'Preço acima do mercado',
      dataRecontato: futureDate(60),
    },
    {
      status: 'perdida' as const, prioridade: 'media' as const, temperatura: 'frio' as const,
      clienteIdx: 2, premioEstimado: randDecimal(2000, 5000),
      dataVencimento: null, dataUltimoContato: pastDate(30), ordem: 2,
      motivoPerda: 'Optou por concorrente',
      dataRecontato: futureDate(90),
    },
    {
      status: 'perdida' as const, prioridade: 'baixa' as const, temperatura: 'frio' as const,
      clienteIdx: 3, premioEstimado: randDecimal(800, 2000),
      dataVencimento: null, dataUltimoContato: pastDate(45), ordem: 3,
      motivoPerda: 'Sem interesse no momento',
      dataRecontato: null,
    },
    {
      status: 'perdida' as const, prioridade: 'media' as const, temperatura: 'frio' as const,
      clienteIdx: 4, premioEstimado: null,
      dataVencimento: null, dataUltimoContato: pastDate(60), ordem: 4,
      motivoPerda: 'Sem orçamento',
      dataRecontato: futureDate(120),
    },
  ];

  const inserts = rows.map((r, i) => {
    const cliente = CLIENTES[r.clienteIdx % CLIENTES.length];
    const vendedor = pick(vendedoresList);
    const produtoId = produtoIds.length > 0 && Math.random() > 0.3 ? pick(produtoIds) : undefined;

    return {
      id: randomUUID(),
      corretoraId,
      vendedorId: vendedor.id,
      vendedorOriginalId: vendedor.id,
      nomeCliente: cliente.nome,
      emailCliente: cliente.email,
      telefoneCliente: cliente.tel,
      status: r.status,
      prioridade: r.prioridade,
      temperatura: r.temperatura,
      ordem: r.ordem,
      premioEstimado: r.premioEstimado,
      valorFechado: (r as any).valorFechado ?? null,
      motivoPerda: (r as any).motivoPerda ?? null,
      dataVencimento: r.dataVencimento,
      dataUltimoContato: r.dataUltimoContato,
      dataRecontato: (r as any).dataRecontato ?? null,
      observacoes: pick(OBSERVACOES),
      produtoId: produtoId ?? null,
      origem: pick(['direto', 'indicacao', 'digital', null]) as string | null,
    };
  });

  console.log(`\n📋 Inserindo ${inserts.length} oportunidades mock...`);

  await db.insert(oportunidades).values(inserts).onConflictDoNothing();

  const total = inserts.reduce((acc: Record<string, number>, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  console.log('\n✅ Inserido com sucesso:');
  Object.entries(total).forEach(([status, count]) => {
    console.log(`   ${status.padEnd(20)} ${count} cards`);
  });
  console.log(`\n   Total: ${inserts.length} oportunidades`);

  process.exit(0);
}

run().catch((e) => {
  console.error('❌ Erro:', e);
  process.exit(1);
});
