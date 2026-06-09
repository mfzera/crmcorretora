/**
 * Seed de dados demo impressivos para o Dashboard de Métricas.
 * Executa: pnpm tsx libs/shared/database/src/seed-demo.ts
 *
 * Cria documentos com dataSolicitacaoCadastro dentro dos últimos 30 dias
 * para que apareçam corretamente no filtro padrão do dashboard.
 */
import 'dotenv/config';
import { db } from './connection.js';
import {
  corretoras,
  usuarios,
  cargos,
  clientes,
  seguradorasParceiras,
  produtos,
  documentosVenda,
  oportunidades,
  renovacoesComerciais,
} from './schema/index.js';
import { eq, and, isNull } from 'drizzle-orm';
import bcryptjs from 'bcryptjs';
const { hash } = bcryptjs;

function diasAtras(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function soData(d: Date): string {
  return d.toISOString().split('T')[0];
}

/** Data absoluta no período: 0 = hoje, 30 = 30 dias atrás, offsetHours = hora do dia */
function dataNoperiodo(diasAtrasN: number, offsetHours = 10): Date {
  const d = diasAtras(diasAtrasN);
  d.setHours(offsetHours, 0, 0, 0);
  return d;
}

// ─── Distribuição de documentos por dia ──────────────────────────────────────
// Cada entrada: [diasAtras, premioLiquido, percentualComissao, vendedorIdx, produtoIdx]
const DOCS_DISTRIBUICAO: Array<[number, number, number, number, number]> = [
  // Semana 1: 22/02 - 28/02 (dias 30-24 atrás)
  [30, 8500,  8,  0, 0],
  [29, 12000, 12, 1, 2],
  [29, 6800,  10, 2, 3],
  [28, 9200,  8,  0, 0],
  [28, 15500, 15, 1, 1],
  [28, 7300,  10, 3, 3],
  [28, 11000, 12, 2, 2],
  [27, 18200, 8,  0, 0],
  [27, 8900,  15, 1, 1],
  [27, 13500, 10, 2, 3],
  [26, 6200,  12, 3, 2],
  [26, 22000, 8,  0, 0],
  [25, 9800,  15, 1, 1],
  [25, 7100,  10, 2, 3],
  [24, 14300, 8,  0, 0],
  // Semana 2: 01/03 - 07/03 (dias 23-17 atrás)
  [23, 11500, 12, 1, 2],
  [23, 6500,  10, 3, 3],
  [22, 17800, 8,  0, 0],
  [22, 8400,  15, 2, 1],
  [22, 9900,  12, 1, 2],
  [21, 13200, 8,  0, 0],
  [21, 5900,  10, 3, 3],
  [21, 21500, 15, 1, 1],
  [20, 7700,  8,  2, 0],
  [19, 11100, 12, 0, 2],
  [19, 8600,  10, 1, 3],
  [18, 14700, 8,  3, 0],
  [17, 9300,  15, 0, 1],
  [17, 6100,  12, 2, 2],
  // Semana 3: 08/03 - 14/03 (dias 16-10 atrás)
  [16, 19500, 8,  1, 0],
  [16, 12800, 15, 0, 1],
  [15, 8200,  10, 2, 3],
  [15, 16400, 12, 3, 2],
  [15, 7500,  8,  1, 0],
  [14, 23000, 15, 0, 1],
  [14, 9100,  10, 2, 3],
  [14, 11700, 8,  1, 0],
  [13, 6800,  12, 3, 2],
  [13, 17300, 15, 0, 1],
  [12, 8900,  10, 2, 3],
  [12, 13600, 8,  1, 0],
  [11, 7400,  12, 3, 2],
  [10, 20100, 15, 0, 1],
  // Semana 4: 15/03 - 21/03 (dias 9-3 atrás)
  [9,  9600,  8,  2, 0],
  [9,  14800, 12, 1, 2],
  [9,  7200,  10, 3, 3],
  [8,  25500, 15, 0, 1],
  [8,  11300, 8,  2, 0],
  [7,  16900, 12, 1, 2],
  [7,  8100,  10, 3, 3],
  [7,  19700, 15, 0, 1],
  [6,  10500, 8,  2, 0],
  [6,  13100, 12, 1, 2],
  [5,  7800,  10, 3, 3],
  [5,  22800, 15, 0, 1],
  [4,  9400,  8,  2, 0],
  [4,  15200, 12, 1, 2],
  // Últimos dias: 22/03 - 24/03 (dias 2-0 atrás)
  [3,  18600, 15, 0, 1],
  [3,  8700,  8,  2, 0],
  [2,  24300, 12, 1, 2],
  [2,  11900, 10, 3, 3],
  [1,  16100, 15, 0, 1],
  [1,  9200,  8,  2, 0],
  [0,  27500, 12, 1, 2],
  [0,  13400, 10, 3, 3],
];

async function seedDemo() {
  console.log('🚀 Iniciando seed DEMO impressivo...\n');

  // ── 1. Buscar corretora ───────────────────────────────────────────────────
  const corretora = await db.query.corretoras.findFirst({
    where: and(eq(corretoras.cnpj, '09209036000154'), isNull(corretoras.deletedAt)),
  });

  if (!corretora) {
    console.error('❌ Corretora não encontrada. Execute pnpm db:seed primeiro.');
    process.exit(1);
  }

  const corretoraId = corretora.id;
  console.log(`✅ Corretora: ${corretora.nomeFantasia}\n`);

  // ── 2. Cargos ────────────────────────────────────────────────────────────
  const [cAdm] = await db.insert(cargos).values({ corretoraId, nomeCargo: 'Administrador', isAdmin: true, isGestor: true }).onConflictDoNothing().returning();
  const [cVend] = await db.insert(cargos).values({ corretoraId, nomeCargo: 'Vendedor', isVendedor: true }).onConflictDoNothing().returning();
  const [cGest] = await db.insert(cargos).values({ corretoraId, nomeCargo: 'Gestor', isGestor: true }).onConflictDoNothing().returning();

  const cargoAdmin = cAdm ?? await db.query.cargos.findFirst({ where: and(eq(cargos.corretoraId, corretoraId), eq(cargos.nomeCargo, 'Administrador'), isNull(cargos.deletedAt)) });
  const cargoVend  = cVend ?? await db.query.cargos.findFirst({ where: and(eq(cargos.corretoraId, corretoraId), eq(cargos.nomeCargo, 'Vendedor'), isNull(cargos.deletedAt)) });
  const cargoGest  = cGest ?? await db.query.cargos.findFirst({ where: and(eq(cargos.corretoraId, corretoraId), eq(cargos.nomeCargo, 'Gestor'), isNull(cargos.deletedAt)) });

  // ── 3. Vendedores ────────────────────────────────────────────────────────
  console.log('👤 Criando/verificando vendedores...');
  const senhaHash = await hash('senha123', 10);

  // Usa usuários já existentes + cria novos vendedores
  const NOVOS_VENDEDORES = [
    { nome: 'Ana Souza',      email: 'ana.souza@grupoecosistema.com.br',      cargoId: cargoVend?.id },
    { nome: 'Carlos Lima',    email: 'carlos.lima@grupoecosistema.com.br',    cargoId: cargoVend?.id },
    { nome: 'Fernanda Costa', email: 'fernanda.costa@grupoecosistema.com.br', cargoId: cargoVend?.id },
  ];

  const vendedoresIds: string[] = [];

  // Inclui usuários já existentes
  const ivandro = await db.query.usuarios.findFirst({ where: eq(usuarios.email, 'ivandro@grupoecosistema.com.br') });
  const miguel  = await db.query.usuarios.findFirst({ where: eq(usuarios.email, 'ecotech@grupoecosistema.com.br') });
  if (ivandro?.id) vendedoresIds.push(ivandro.id);
  if (miguel?.id) vendedoresIds.push(miguel.id);

  for (const v of NOVOS_VENDEDORES) {
    const [u] = await db.insert(usuarios).values({ corretoraId, passwordHash: senhaHash, ativo: true, primeiroAcesso: false, ...v }).onConflictDoNothing().returning();
    const id = u?.id ?? (await db.query.usuarios.findFirst({ where: eq(usuarios.email, v.email) }))?.id;
    if (id) vendedoresIds.push(id);
  }

  console.log(`  ✅ ${vendedoresIds.length} vendedores\n`);

  // ── 4. Seguradoras ───────────────────────────────────────────────────────
  const SEG_DEF = [
    { cnpj: '92751213000173', razaoSocial: 'Bradesco Seguros S.A.',              nomeFantasia: 'Bradesco' },
    { cnpj: '61198164000160', razaoSocial: 'Porto Seguro Cia de Seguros Gerais', nomeFantasia: 'Porto Seguro' },
    { cnpj: '01685053000150', razaoSocial: 'SulAmérica Seguros S.A.',            nomeFantasia: 'SulAmérica' },
    { cnpj: '23086170000152', razaoSocial: 'Allianz Seguros S.A.',               nomeFantasia: 'Allianz' },
  ];

  const segIds: string[] = [];
  for (const s of SEG_DEF) {
    const [seg] = await db.insert(seguradorasParceiras).values({ corretoraId, status: 'ATIVA', ...s }).onConflictDoNothing().returning();
    const id = seg?.id ?? (await db.query.seguradorasParceiras.findFirst({ where: and(eq(seguradorasParceiras.corretoraId, corretoraId), eq(seguradorasParceiras.cnpj, s.cnpj), isNull(seguradorasParceiras.deletedAt)) }))?.id;
    if (id) segIds.push(id);
  }

  // ── 5. Produtos ──────────────────────────────────────────────────────────
  const PROD_DEF = [
    { nomeProduto: 'Seguro Auto',        tipoSeguro: 'AUTO',        percentualComissaoPadrao: '8.00',  segIdx: 0 },
    { nomeProduto: 'Seguro Vida',        tipoSeguro: 'VIDA',        percentualComissaoPadrao: '15.00', segIdx: 1 },
    { nomeProduto: 'Seguro Residencial', tipoSeguro: 'RESIDENCIAL', percentualComissaoPadrao: '12.00', segIdx: 2 },
    { nomeProduto: 'Seguro Empresarial', tipoSeguro: 'EMPRESARIAL', percentualComissaoPadrao: '10.00', segIdx: 3 },
  ];

  const prodIds: string[] = [];
  for (const p of PROD_DEF) {
    const { segIdx, ...rest } = p;
    const [prod] = await db.insert(produtos).values({ corretoraId, ativo: true, seguradoraParceiraId: segIds[segIdx], ...rest }).onConflictDoNothing().returning();
    const id = prod?.id ?? (await db.query.produtos.findFirst({ where: and(eq(produtos.corretoraId, corretoraId), eq(produtos.nomeProduto, p.nomeProduto), isNull(produtos.deletedAt)) }))?.id;
    if (id) prodIds.push(id);
  }

  // ── 6. Clientes (novos CPFs para não conflitar) ──────────────────────────
  console.log('👥 Criando clientes demo...');

  const NOMES_PF = [
    'Adriana Borges', 'Bruno Teixeira', 'Claudia Vieira', 'Daniel Pinto', 'Elaine Rocha',
    'Fábio Mendes', 'Giovana Leal', 'Henrique Castro', 'Isabela Freitas', 'Jonas Correia',
    'Karen Nascimento', 'Leonardo Dias', 'Mariana Cunha', 'Nilton Barros', 'Olivia Cardoso',
    'Paulo Rezende', 'Queila Monteiro', 'Rogério Fonseca', 'Simone Torres', 'Tiago Melo',
    'Ursula Campos', 'Vitor Araújo', 'Wanda Ferreira', 'Xavier Neto', 'Yasmin Ribeiro',
    'Zilda Pacheco', 'Alexandre Guimarães', 'Beatrice Moraes', 'César Andrade', 'Diana Sousa',
    'Eduardo Lima', 'Flavia Gomes', 'Gustavo Martins', 'Helena Alves', 'Iago Santos',
    'Juliana Carvalho', 'Kayo Barbosa', 'Lorena Silveira', 'Marco Augusto', 'Natalia Cruz',
    'Otávio Ramos', 'Patricia Leite', 'Quirino Assis', 'Rebeca Queiroz', 'Sandro Moreira',
    'Thamara Lopes', 'Ulisses Pires', 'Valentina Machado', 'Wellington Bastos', 'Ximena Coelho',
    'Yara Fernandes', 'Zeno Cavalcanti', 'Aline Medeiros', 'Breno Rodrigues', 'Carla Nogueira',
    'Denis Figueira', 'Estela Azevedo', 'Felipe Duarte', 'Gisele Brito', 'Hector Campos',
  ];

  const NOMES_PJ = [
    { razaoSocial: 'Construtora Alfa Ltda',      nomeFantasia: 'ConstruAlfa',  cnpj: '55666777000181' },
    { razaoSocial: 'Transportes Beta S.A.',       nomeFantasia: 'TransBeta',    cnpj: '66777888000192' },
    { razaoSocial: 'Farmácias Gamma Ltda',        nomeFantasia: 'FarmaGamma',   cnpj: '77888999000103' },
    { razaoSocial: 'Hotel Delta ME',              nomeFantasia: 'HotelDelta',   cnpj: '88999000000114' },
    { razaoSocial: 'Escola Epsilon Ltda',         nomeFantasia: 'EscolaEps',    cnpj: '99000111000125' },
    { razaoSocial: 'Clínica Zeta S.A.',          nomeFantasia: 'ClínicaZeta',  cnpj: '10111222000136' },
    { razaoSocial: 'Mercado Eta Ltda',            nomeFantasia: 'MercadoEta',   cnpj: '11222333000147' },
    { razaoSocial: 'Academia Theta ME',           nomeFantasia: 'AcadTheta',    cnpj: '22333444000158' },
    { razaoSocial: 'Distribuidora Iota Ltda',     nomeFantasia: 'DistribIota',  cnpj: '33444555000169' },
    { razaoSocial: 'Consultoria Kappa S.A.',      nomeFantasia: 'ConsultKappa', cnpj: '44555666000170' },
    { razaoSocial: 'Agropecuária Lambda Ltda',    nomeFantasia: 'AgroLambda',   cnpj: '55666777000192' },
    { razaoSocial: 'Tecnologia Mu S.A.',          nomeFantasia: 'TechMu',       cnpj: '66777888000103' },
    { razaoSocial: 'Logística Nu Ltda',           nomeFantasia: 'LogiNu',       cnpj: '77888999000114' },
    { razaoSocial: 'Corretora Xi ME',             nomeFantasia: 'CorretoraXi',  cnpj: '88999000000125' },
    { razaoSocial: 'Gráfica Omicron Ltda',        nomeFantasia: 'GrafOmicron',  cnpj: '99111222000136' },
  ];

  const clientesIds: string[] = [];

  for (let i = 0; i < NOMES_PF.length; i++) {
    const cpf = String(70000000000 + i * 111).padStart(11, '0');
    const vendedorId = vendedoresIds[i % vendedoresIds.length];
    const [cli] = await db.insert(clientes).values({ corretoraId, tipoPessoa: 'PF', vendedorId, ativo: true, nome: NOMES_PF[i], cpf }).onConflictDoNothing().returning();
    const id = cli?.id ?? (await db.query.clientes.findFirst({ where: and(eq(clientes.corretoraId, corretoraId), eq(clientes.cpf, cpf), isNull(clientes.deletedAt)) }))?.id;
    if (id) clientesIds.push(id);
  }

  for (let i = 0; i < NOMES_PJ.length; i++) {
    const pj = NOMES_PJ[i];
    const vendedorId = vendedoresIds[i % vendedoresIds.length];
    const [cli] = await db.insert(clientes).values({ corretoraId, tipoPessoa: 'PJ', vendedorId, ativo: true, ...pj }).onConflictDoNothing().returning();
    const id = cli?.id ?? (await db.query.clientes.findFirst({ where: and(eq(clientes.corretoraId, corretoraId), eq(clientes.cnpj, pj.cnpj), isNull(clientes.deletedAt)) }))?.id;
    if (id) clientesIds.push(id);
  }

  console.log(`  ✅ ${clientesIds.length} clientes criados\n`);

  // ── 7. Documentos de venda (com dataSolicitacaoCadastro!) ─────────────────
  console.log('📄 Criando documentos de venda (demo)...');

  let docCount = 0;
  let totalPremio = 0;

  for (let i = 0; i < DOCS_DISTRIBUICAO.length; i++) {
    const [dias, premio, comissao, vendIdx, prodIdx] = DOCS_DISTRIBUICAO[i];
    const vendedorId = vendedoresIds[vendIdx % vendedoresIds.length];
    const produtoId = prodIds[prodIdx % prodIds.length];
    const clienteId = clientesIds[i % clientesIds.length];
    const seguradoraParceiraId = segIds[prodIdx % segIds.length];

    const valorComissao = ((premio * comissao) / 100).toFixed(2);
    const dataSolic = dataNoperiodo(dias, 9 + (i % 8));
    const vigInicio = diasAtras(dias + 10);
    const vigFim = new Date(vigInicio);
    vigFim.setFullYear(vigFim.getFullYear() + 1);

    const numeroDocumento = `DEM-${String(i + 1).padStart(4, '0')}`;

    const [doc] = await db.insert(documentosVenda).values({
      corretoraId,
      clienteId,
      vendedorId,
      produtoId,
      seguradoraParceiraId,
      numeroDocumento,
      tipoDocumento: 'VENDA_EXPRESSA',
      status: 'ATIVO',
      vigenciaInicio: soData(vigInicio),
      vigenciaFim: soData(vigFim),
      premioLiquido: String(premio),
      percentualComissao: String(comissao),
      valorComissao,
      negocioCorretora: false,
      moeda: 'BRL',
      dataSolicitacaoCadastro: dataSolic,
    }).onConflictDoNothing().returning();

    if (doc?.id) {
      docCount++;
      totalPremio += premio;
    }
  }

  console.log(`  ✅ ${docCount} documentos criados | Prêmio total: R$ ${totalPremio.toLocaleString('pt-BR')}\n`);

  // ── 8. Renovações (85% de taxa) ──────────────────────────────────────────
  console.log('🔄 Criando renovações...');

  type RenovacaoStatus = 'RENOVADO' | 'EM_NEGOCIACAO' | 'EM_PROSPECCAO' | 'NAO_TRABALHADO' | 'PERDIDO' | 'CANCELADO';

  const RENOVACOES: Array<{ status: RenovacaoStatus; premioAnterior: string; premioNovo: string | null; diasVenc: number }> = [
    { status: 'RENOVADO',      premioAnterior: '18500.00', premioNovo: '19800.00', diasVenc: -28 },
    { status: 'RENOVADO',      premioAnterior: '12300.00', premioNovo: '13100.00', diasVenc: -25 },
    { status: 'RENOVADO',      premioAnterior: '9800.00',  premioNovo: '10500.00', diasVenc: -22 },
    { status: 'RENOVADO',      premioAnterior: '22000.00', premioNovo: '23400.00', diasVenc: -18 },
    { status: 'RENOVADO',      premioAnterior: '15600.00', premioNovo: '16700.00', diasVenc: -15 },
    { status: 'RENOVADO',      premioAnterior: '8900.00',  premioNovo: '9400.00',  diasVenc: -12 },
    { status: 'RENOVADO',      premioAnterior: '31000.00', premioNovo: '33000.00', diasVenc: -10 },
    { status: 'RENOVADO',      premioAnterior: '11200.00', premioNovo: '11900.00', diasVenc: -8  },
    { status: 'RENOVADO',      premioAnterior: '19500.00', premioNovo: '20800.00', diasVenc: -5  },
    { status: 'RENOVADO',      premioAnterior: '7800.00',  premioNovo: '8200.00',  diasVenc: -3  },
    { status: 'RENOVADO',      premioAnterior: '14100.00', premioNovo: '15000.00', diasVenc: -1  },
    { status: 'EM_NEGOCIACAO', premioAnterior: '25000.00', premioNovo: null,       diasVenc: 5   },
    { status: 'EM_NEGOCIACAO', premioAnterior: '13800.00', premioNovo: null,       diasVenc: 8   },
    { status: 'EM_PROSPECCAO', premioAnterior: '9200.00',  premioNovo: null,       diasVenc: 12  },
    { status: 'EM_PROSPECCAO', premioAnterior: '17500.00', premioNovo: null,       diasVenc: 15  },
    { status: 'NAO_TRABALHADO',premioAnterior: '21000.00', premioNovo: null,       diasVenc: 20  },
    { status: 'PERDIDO',       premioAnterior: '11000.00', premioNovo: null,       diasVenc: -30 },
    { status: 'PERDIDO',       premioAnterior: '8500.00',  premioNovo: null,       diasVenc: -14 },
    { status: 'CANCELADO',     premioAnterior: '6700.00',  premioNovo: null,       diasVenc: -20 },
    { status: 'CANCELADO',     premioAnterior: '15200.00', premioNovo: null,       diasVenc: -7  },
  ];

  for (let i = 0; i < RENOVACOES.length; i++) {
    const r = RENOVACOES[i];
    const vendedorId = vendedoresIds[i % vendedoresIds.length];
    const clienteId = clientesIds[i % clientesIds.length];
    const dataVencimento = soData(diasAtras(-r.diasVenc));

    await db.insert(renovacoesComerciais).values({
      corretoraId,
      vendedorId,
      vendedorOriginalId: vendedorId,
      clienteId,
      premioAnterior: r.premioAnterior,
      premioNovo: r.premioNovo,
      status: r.status,
      dataVencimento,
    }).onConflictDoNothing();
  }

  const renovadas = RENOVACOES.filter(r => r.status === 'RENOVADO').length;
  console.log(`  ✅ ${RENOVACOES.length} renovações | ${renovadas}/${RENOVACOES.length} renovadas (${Math.round(renovadas / RENOVACOES.length * 100)}%)\n`);

  // ── 9. Oportunidades ──────────────────────────────────────────────────────
  console.log('🎯 Criando oportunidades...');

  type OportunidadeStatus = 'lead' | 'contato_inicial' | 'negociacao' | 'ganha' | 'perdida' | 'arquivada';
  type Temperatura = 'frio' | 'morno' | 'quente';
  type Prioridade = 'baixa' | 'media' | 'alta' | 'urgente';

  const OPORTUNIDADES: Array<{ nome: string; status: OportunidadeStatus; temp: Temperatura; prio: Prioridade; premio: string }> = [
    // Frios (leads iniciais)
    { nome: 'Marcos Vinicius',        status: 'lead',           temp: 'frio',   prio: 'baixa',   premio: '4200.00' },
    { nome: 'Tatiane Borges',         status: 'lead',           temp: 'frio',   prio: 'media',   premio: '7800.00' },
    { nome: 'Clínica São Lucas',      status: 'lead',           temp: 'frio',   prio: 'baixa',   premio: '15000.00' },
    { nome: 'Reginaldo Moura',        status: 'lead',           temp: 'frio',   prio: 'baixa',   premio: '3500.00' },
    { nome: 'Construtora Pinheiros',  status: 'lead',           temp: 'frio',   prio: 'media',   premio: '28000.00' },
    { nome: 'Alencar & Filhos',       status: 'lead',           temp: 'frio',   prio: 'baixa',   premio: '6100.00' },
    { nome: 'Patricia Valente',       status: 'contato_inicial',temp: 'frio',   prio: 'media',   premio: '9300.00' },
    { nome: 'Empreend. Costa Verde',  status: 'contato_inicial',temp: 'frio',   prio: 'baixa',   premio: '19500.00' },
    // Mornos (em andamento)
    { nome: 'Fernando Siqueira',      status: 'contato_inicial',temp: 'morno',  prio: 'media',   premio: '11200.00' },
    { nome: 'Giovana Assis',          status: 'contato_inicial',temp: 'morno',  prio: 'alta',    premio: '8700.00' },
    { nome: 'Grupo Horizonte',        status: 'contato_inicial',temp: 'morno',  prio: 'media',   premio: '32000.00' },
    { nome: 'Rafael Drummond',        status: 'negociacao',     temp: 'morno',  prio: 'alta',    premio: '14500.00' },
    { nome: 'Maíra Andrade',          status: 'negociacao',     temp: 'morno',  prio: 'media',   premio: '7200.00' },
    { nome: 'Distribuidora Paulista', status: 'negociacao',     temp: 'morno',  prio: 'alta',    premio: '41000.00' },
    { nome: 'Cássio Ferreira',        status: 'negociacao',     temp: 'morno',  prio: 'media',   premio: '9800.00' },
    { nome: 'Imobiliária Camargo',    status: 'negociacao',     temp: 'morno',  prio: 'alta',    premio: '53000.00' },
    { nome: 'Thais Goulart',          status: 'negociacao',     temp: 'morno',  prio: 'urgente', premio: '16300.00' },
    // Quentes (prestes a fechar)
    { nome: 'Industrias Fortuna',     status: 'negociacao',     temp: 'quente', prio: 'urgente', premio: '78000.00' },
    { nome: 'Luciana Bertoldi',       status: 'negociacao',     temp: 'quente', prio: 'alta',    premio: '12500.00' },
    { nome: 'Grupo TechVida',         status: 'negociacao',     temp: 'quente', prio: 'urgente', premio: '95000.00' },
    { nome: 'André Magalhães',        status: 'negociacao',     temp: 'quente', prio: 'alta',    premio: '21000.00' },
    { nome: 'Supermercado Família',   status: 'negociacao',     temp: 'quente', prio: 'urgente', premio: '63000.00' },
    { nome: 'Roberta Caminha',        status: 'ganha',          temp: 'quente', prio: 'alta',    premio: '18700.00' },
    { nome: 'Mineradora Sul',         status: 'ganha',          temp: 'quente', prio: 'urgente', premio: '112000.00' },
    { nome: 'Eduardo Werneck',        status: 'ganha',          temp: 'quente', prio: 'alta',    premio: '9400.00' },
    { nome: 'Hospital São José',      status: 'ganha',          temp: 'quente', prio: 'urgente', premio: '145000.00' },
    // Perdidas/arquivadas
    { nome: 'Antônia Barros',         status: 'perdida',        temp: 'frio',   prio: 'baixa',   premio: '5600.00' },
    { nome: 'Loja da Esquina',        status: 'perdida',        temp: 'frio',   prio: 'media',   premio: '8900.00' },
    { nome: 'Raniel Souza',           status: 'perdida',        temp: 'frio',   prio: 'baixa',   premio: '3200.00' },
    { nome: 'Têxtil Garça Branca',    status: 'arquivada',      temp: 'frio',   prio: 'baixa',   premio: '22000.00' },
    { nome: 'Maurício Corrêa',        status: 'arquivada',      temp: 'frio',   prio: 'baixa',   premio: '7100.00' },
  ];

  for (let i = 0; i < OPORTUNIDADES.length; i++) {
    const op = OPORTUNIDADES[i];
    const vendedorId = vendedoresIds[i % vendedoresIds.length];
    const clienteId = clientesIds[i % clientesIds.length] ?? null;

    await db.insert(oportunidades).values({
      corretoraId,
      vendedorId,
      vendedorOriginalId: vendedorId,
      clienteId,
      nomeCliente: op.nome,
      status: op.status,
      prioridade: op.prio,
      temperatura: op.temp,
      premioEstimado: op.premio,
      ordem: i,
    }).onConflictDoNothing();
  }

  console.log(`  ✅ ${OPORTUNIDADES.length} oportunidades criadas\n`);

  // ── Resumo ────────────────────────────────────────────────────────────────
  const premioFmt = totalPremio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  console.log('🎉 Seed DEMO concluído!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  📄 ${docCount} documentos ATIVO no período     → ${premioFmt}`);
  console.log(`  👥 ${clientesIds.length} novos clientes criados`);
  console.log(`  🔄 ${RENOVACOES.length} renovações | Taxa: ${Math.round(renovadas / RENOVACOES.length * 100)}%`);
  console.log(`  🎯 ${OPORTUNIDADES.length} oportunidades no pipeline`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n🚀 Acesse /metricas-dashboard para ver os dados!\n');

  process.exit(0);
}

seedDemo().catch((err) => {
  console.error('❌ Erro no seed:', err);
  process.exit(1);
});
