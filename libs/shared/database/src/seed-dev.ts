import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { eq, inArray, or } from 'drizzle-orm';
import { db } from './connection.js';
import {
  usuarios,
  usuarioCorretora,
  equipes,
  clientes,
  seguradorasParceiras,
  produtos,
  oportunidades,
  cotacoes,
  documentosVenda,
  renovacoesComerciais,
  sinistros,
  badgeTipos,
  usuarioBadges,
  missoes,
} from './schema/index.js';

// ─── IDs fixos (já existem no banco) ────────────────────────────────────────
const CORRETORA_ID = '3a38da96-c4f6-461d-a6d0-c52c0784a4b8';
const CARGO_GERENTE_ID = 'f35ab770-f492-4c45-85dd-4fbddaa5d0d3';
const CARGO_VENDEDOR_ID = '266fa6ae-3f8b-4737-944c-2c294ab82ba8';
const CARGO_CADASTRO_ID = '07d40259-7f45-4fd1-b025-238ddbf04555';
const PRODUTO_AUTO_ID = '62ee325d-0cf3-454e-8342-ddf92ca545d4';
const PRODUTO_RESIDENCIAL_ID = '8ebad8c4-2e46-43fa-bfe4-e8fc351ff171';
const PRODUTO_VIDA_ID = '5dcd0313-0134-4a01-b153-6c47b2027355';
const ADMIN_ID = '1f572ab9-60b7-48dc-9985-201fdecc1a9d';

// ─── IDs gerados para novos registros ───────────────────────────────────────
const SEG_PORTO_ID = randomUUID();
const SEG_BRADESCO_ID = randomUUID();
const SEG_SULAMEIRA_ID = randomUUID();
const SEG_ALLIANZ_ID = randomUUID();

const EQUIPE_ALFA_ID = randomUUID();
const EQUIPE_BETA_ID = randomUUID();

const PRODUTO_EMPRESARIAL_ID = randomUUID();
const PRODUTO_CONDOMINIO_ID = randomUUID();

const cotacaoIds = Array.from({ length: 15 }, () => randomUUID());
const docVendaIds = Array.from({ length: 18 }, () => randomUUID());
const renovacaoIds = Array.from({ length: 14 }, () => randomUUID());
const sinistroIds = Array.from({ length: 7 }, () => randomUUID());

const PRODUTOS = [PRODUTO_AUTO_ID, PRODUTO_RESIDENCIAL_ID, PRODUTO_VIDA_ID, PRODUTO_EMPRESARIAL_ID, PRODUTO_CONDOMINIO_ID];
const SEGURADORAS = [SEG_PORTO_ID, SEG_BRADESCO_ID, SEG_SULAMEIRA_ID, SEG_ALLIANZ_ID];
// Prefixo único por execução para evitar conflitos em unique keys
const RUN = randomUUID().slice(0, 6);
// VENDEDORES é definido dentro de seed() após resolver IDs reais

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function pickN<T>(arr: T[], n: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n);
}
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randDecimal(min: number, max: number): string {
  return (Math.random() * (max - min) + min).toFixed(2);
}
function pastDate(daysAgo: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d;
}
function futureDate(daysAhead: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d;
}
function pastDateStr(daysAgo: number): string {
  return pastDate(daysAgo).toISOString().split('T')[0];
}
function futureDateStr(daysAhead: number): string {
  return futureDate(daysAhead).toISOString().split('T')[0];
}

async function seed() {
  const passwordHash = await bcrypt.hash('senha123', 10);
  console.log('🌱 Iniciando seed de dados fictícios...\n');

  // ── 1. Seguradoras parceiras ─────────────────────────────────────────────
  console.log('📦 Seguradoras parceiras...');
  await db.insert(seguradorasParceiras).values([
    { id: SEG_PORTO_ID, corretoraId: CORRETORA_ID, razaoSocial: 'Porto Seguro Cia de Seguros Gerais', nomeFantasia: 'Porto Seguro', cnpj: '61198164000160', telefone: '(11) 3366-3366', email: 'contato@portoseguro.com.br', status: 'ATIVA' },
    { id: SEG_BRADESCO_ID, corretoraId: CORRETORA_ID, razaoSocial: 'Bradesco Seguros SA', nomeFantasia: 'Bradesco Seguros', cnpj: '92693358000190', telefone: '(11) 2178-4900', email: 'contato@bradescoseguros.com.br', status: 'ATIVA' },
    { id: SEG_SULAMEIRA_ID, corretoraId: CORRETORA_ID, razaoSocial: 'SulAmérica Cia Nacional de Seguros', nomeFantasia: 'SulAmérica', cnpj: '01685053000127', telefone: '(21) 2506-9500', email: 'contato@sulamerica.com.br', status: 'ATIVA' },
    { id: SEG_ALLIANZ_ID, corretoraId: CORRETORA_ID, razaoSocial: 'Allianz Seguros SA', nomeFantasia: 'Allianz', cnpj: '61573796000117', telefone: '(11) 3366-3000', email: 'contato@allianz.com.br', status: 'ATIVA' },
  ]).onConflictDoNothing();

  // ── 2. Produtos extras ───────────────────────────────────────────────────
  console.log('📦 Produtos extras...');
  await db.insert(produtos).values([
    { corretoraId: CORRETORA_ID, nomeProduto: 'Seguro Empresarial', tipoSeguro: 'EMPRESARIAL', descricao: 'Proteção completa para empresas', percentualComissaoPadrao: '8.00', ativo: true },
    { corretoraId: CORRETORA_ID, nomeProduto: 'Seguro Condomínio', tipoSeguro: 'CONDOMINIO', descricao: 'Cobertura para condomínios residenciais e comerciais', percentualComissaoPadrao: '7.00', ativo: true },
  ]).onConflictDoNothing();

  const produtosExtrasDB = await db.select({ id: produtos.id, nomeProduto: produtos.nomeProduto })
    .from(produtos)
    .where(inArray(produtos.nomeProduto, ['Seguro Empresarial', 'Seguro Condomínio']));
  const prodEmpresarialId = produtosExtrasDB.find(p => p.nomeProduto === 'Seguro Empresarial')!.id;
  const prodCondomínioId = produtosExtrasDB.find(p => p.nomeProduto === 'Seguro Condomínio')!.id;
  const PRODUTOS_REAIS = [PRODUTO_AUTO_ID, PRODUTO_RESIDENCIAL_ID, PRODUTO_VIDA_ID, prodEmpresarialId, prodCondomínioId];

  // ── 3. Equipes ───────────────────────────────────────────────────────────
  console.log('👥 Equipes...');
  await db.insert(equipes).values([
    { id: EQUIPE_ALFA_ID, corretoraId: CORRETORA_ID, nome: 'Equipe Alfa', ativo: true },
    { id: EQUIPE_BETA_ID, corretoraId: CORRETORA_ID, nome: 'Equipe Beta', ativo: true },
  ]).onConflictDoNothing();

  const equipesDB = await db.select().from(equipes)
    .where(inArray(equipes.nome, ['Equipe Alfa', 'Equipe Beta']));
  const equipeAlfaId = equipesDB.find(e => e.nome === 'Equipe Alfa')!.id;
  const equipeBetaId = equipesDB.find(e => e.nome === 'Equipe Beta')!.id;

  // ── 4. Usuários ──────────────────────────────────────────────────────────
  console.log('👤 Usuários...');
  const usuariosParaInserir = [
    { corretoraId: CORRETORA_ID, corretoraAtivaId: CORRETORA_ID, cargoId: CARGO_GERENTE_ID, nome: 'Carlos Mendes', email: 'carlos.mendes@ecotech.com', passwordHash, telefone: '(11) 99988-1111', ativo: true, primeiroAcesso: false },
    { corretoraId: CORRETORA_ID, corretoraAtivaId: CORRETORA_ID, cargoId: CARGO_VENDEDOR_ID, nome: 'Ana Paula Silva', email: 'ana.silva@ecotech.com', passwordHash, telefone: '(11) 99988-2222', ativo: true, primeiroAcesso: false },
    { corretoraId: CORRETORA_ID, corretoraAtivaId: CORRETORA_ID, cargoId: CARGO_VENDEDOR_ID, nome: 'Rafael Costa', email: 'rafael.costa@ecotech.com', passwordHash, telefone: '(11) 99988-3333', ativo: true, primeiroAcesso: false },
    { corretoraId: CORRETORA_ID, corretoraAtivaId: CORRETORA_ID, cargoId: CARGO_VENDEDOR_ID, nome: 'Fernanda Lima', email: 'fernanda.lima@ecotech.com', passwordHash, telefone: '(11) 99988-4444', ativo: true, primeiroAcesso: false },
    { corretoraId: CORRETORA_ID, corretoraAtivaId: CORRETORA_ID, cargoId: CARGO_CADASTRO_ID, nome: 'Bruno Alves', email: 'bruno.alves@ecotech.com', passwordHash, telefone: '(11) 99988-5555', ativo: true, primeiroAcesso: false },
  ];

  await db.insert(usuarios).values(usuariosParaInserir).onConflictDoNothing();

  // Resolve os IDs reais (idempotente: usa IDs do banco independente de novo insert ou conflict)
  const emails = usuariosParaInserir.map(u => u.email);
  const usuariosDB = await db.select({ id: usuarios.id, email: usuarios.email })
    .from(usuarios)
    .where(inArray(usuarios.email, emails));

  const byEmail = Object.fromEntries(usuariosDB.map(u => [u.email, u.id]));
  const USER_GERENTE_ID = byEmail['carlos.mendes@ecotech.com'];
  const USER_VEND1_ID = byEmail['ana.silva@ecotech.com'];
  const USER_VEND2_ID = byEmail['rafael.costa@ecotech.com'];
  const USER_VEND3_ID = byEmail['fernanda.lima@ecotech.com'];
  const USER_CADASTRO_ID = byEmail['bruno.alves@ecotech.com'];

  // Atualiza equipes com gestorId agora que o usuário existe
  await db.update(equipes).set({ gestorId: USER_GERENTE_ID })
    .where(inArray(equipes.id, [equipeAlfaId, equipeBetaId]));

  // Atualiza equipeId e gestorId nos usuários
  await db.update(usuarios).set({ equipeId: equipeAlfaId, gestorId: USER_GERENTE_ID })
    .where(inArray(usuarios.id, [USER_VEND1_ID, USER_VEND2_ID]));
  await db.update(usuarios).set({ equipeId: equipeBetaId, gestorId: USER_GERENTE_ID })
    .where(eq(usuarios.id, USER_VEND3_ID));

  await db.insert(usuarioCorretora).values([
    { usuarioId: USER_GERENTE_ID, corretoraId: CORRETORA_ID, cargoId: CARGO_GERENTE_ID, ativo: true, vinculadoPorId: ADMIN_ID },
    { usuarioId: USER_VEND1_ID, corretoraId: CORRETORA_ID, cargoId: CARGO_VENDEDOR_ID, ativo: true, vinculadoPorId: ADMIN_ID },
    { usuarioId: USER_VEND2_ID, corretoraId: CORRETORA_ID, cargoId: CARGO_VENDEDOR_ID, ativo: true, vinculadoPorId: ADMIN_ID },
    { usuarioId: USER_VEND3_ID, corretoraId: CORRETORA_ID, cargoId: CARGO_VENDEDOR_ID, ativo: true, vinculadoPorId: ADMIN_ID },
    { usuarioId: USER_CADASTRO_ID, corretoraId: CORRETORA_ID, cargoId: CARGO_CADASTRO_ID, ativo: true, vinculadoPorId: ADMIN_ID },
  ]).onConflictDoNothing();

  const VENDEDORES = [USER_VEND1_ID, USER_VEND2_ID, USER_VEND3_ID, ADMIN_ID];

  // ── 5. Clientes ──────────────────────────────────────────────────────────
  console.log('🏠 Clientes...');
  const clientesPF = [
    { nome: 'João Oliveira', cpf: '11122233344', dataNascimento: new Date('1985-03-15'), email: 'joao.oliveira@gmail.com', celular: '(11) 98877-0001' },
    { nome: 'Maria Santos', cpf: '22233344455', dataNascimento: new Date('1990-07-22'), email: 'maria.santos@hotmail.com', celular: '(11) 98877-0002' },
    { nome: 'Pedro Ferreira', cpf: '33344455566', dataNascimento: new Date('1978-11-08'), email: 'pedro.ferreira@gmail.com', celular: '(11) 98877-0003' },
    { nome: 'Luciana Rodrigues', cpf: '44455566677', dataNascimento: new Date('1995-01-30'), email: 'luciana.r@gmail.com', celular: '(11) 98877-0004' },
    { nome: 'Marcos Pereira', cpf: '55566677788', dataNascimento: new Date('1982-09-14'), email: 'marcos.pereira@yahoo.com', celular: '(11) 98877-0005' },
    { nome: 'Juliana Souza', cpf: '66677788899', dataNascimento: new Date('1993-05-20'), email: 'juliana.souza@gmail.com', celular: '(11) 98877-0006' },
    { nome: 'Ricardo Almeida', cpf: '77788899900', dataNascimento: new Date('1970-12-03'), email: 'ricardo.almeida@gmail.com', celular: '(11) 98877-0007' },
    { nome: 'Camila Nunes', cpf: '88899900011', dataNascimento: new Date('1998-04-17'), email: 'camila.nunes@gmail.com', celular: '(11) 98877-0008' },
    { nome: 'Thiago Barbosa', cpf: '99900011122', dataNascimento: new Date('1987-08-25'), email: 'thiago.barbosa@hotmail.com', celular: '(11) 98877-0009' },
    { nome: 'Patrícia Castro', cpf: '10011122233', dataNascimento: new Date('1975-06-10'), email: 'patricia.castro@gmail.com', celular: '(11) 98877-0010' },
    { nome: 'Eduardo Martins', cpf: '11122233345', dataNascimento: new Date('1988-02-28'), email: 'eduardo.m@gmail.com', celular: '(11) 98877-0011' },
    { nome: 'Amanda Gomes', cpf: '22233344456', dataNascimento: new Date('1996-10-05'), email: 'amanda.gomes@gmail.com', celular: '(11) 98877-0012' },
    { nome: 'Felipe Carvalho', cpf: '33344455567', dataNascimento: new Date('1983-07-19'), email: 'felipe.c@gmail.com', celular: '(11) 98877-0013' },
    { nome: 'Isabela Rocha', cpf: '44455566678', dataNascimento: new Date('1991-03-07'), email: 'isabela.rocha@gmail.com', celular: '(11) 98877-0014' },
  ];

  const clientesPJ = [
    { razaoSocial: 'Tech Solutions Ltda', nomeFantasia: 'TechSol', cnpj: '12345678000195', email: 'contato@techsol.com.br', celular: '(11) 3333-1001' },
    { razaoSocial: 'Construtora Horizonte SA', nomeFantasia: 'Horizonte', cnpj: '23456789000182', email: 'financeiro@horizonte.com.br', celular: '(11) 3333-1002' },
    { razaoSocial: 'Distribuidora Norte Ltda', nomeFantasia: 'DistrNorte', cnpj: '34567890000178', email: 'compras@distrnorte.com.br', celular: '(11) 3333-1003' },
    { razaoSocial: 'Restaurante Sabor & Arte Ltda', nomeFantasia: 'Sabor & Arte', cnpj: '45678901000165', email: 'gerencia@saborarte.com.br', celular: '(11) 3333-1004' },
    { razaoSocial: 'Academia Fitness Plus Ltda', nomeFantasia: 'Fitness Plus', cnpj: '56789012000152', email: 'adm@fitnessplus.com.br', celular: '(11) 3333-1005' },
    { razaoSocial: 'Clínica Saúde Plena Ltda', nomeFantasia: 'Saúde Plena', cnpj: '67890123000149', email: 'contato@saudeplena.com.br', celular: '(11) 3333-1006' },
    { razaoSocial: 'Transportes Rápido Ltda', nomeFantasia: 'TransRápido', cnpj: '78901234000136', email: 'operacoes@transrapido.com.br', celular: '(11) 3333-1007' },
    { razaoSocial: 'Farmácia Popular SA', nomeFantasia: 'FarmaPopular', cnpj: '89012345000123', email: 'compras@farmapopular.com.br', celular: '(11) 3333-1008' },
  ];

  await db.insert(clientes).values([
    ...clientesPF.map((c) => ({
      corretoraId: CORRETORA_ID,
      tipoPessoa: 'PF' as const,
      vendedorId: pick(VENDEDORES),
      ...c,
      ativo: true,
    })),
    ...clientesPJ.map((c) => ({
      corretoraId: CORRETORA_ID,
      tipoPessoa: 'PJ' as const,
      vendedorId: pick(VENDEDORES),
      ...c,
      ativo: true,
    })),
  ]).onConflictDoNothing();

  // Resolve IDs reais pelos CPFs/CNPJs
  const cpfs = clientesPF.map(c => c.cpf);
  const cnpjs = clientesPJ.map(c => c.cnpj);
  const clientesDB = await db.select({ id: clientes.id, cpf: clientes.cpf, cnpj: clientes.cnpj })
    .from(clientes)
    .where(or(inArray(clientes.cpf, cpfs), inArray(clientes.cnpj, cnpjs)));

  const clientesByCpf = Object.fromEntries(clientesDB.filter(c => c.cpf).map(c => [c.cpf!, c.id]));
  const clientesByCnpj = Object.fromEntries(clientesDB.filter(c => c.cnpj).map(c => [c.cnpj!, c.id]));
  const realClienteIds = [
    ...clientesPF.map(c => clientesByCpf[c.cpf]),
    ...clientesPJ.map(c => clientesByCnpj[c.cnpj]),
  ].filter(Boolean);

  // ── 6. Oportunidades (Kanban) ────────────────────────────────────────────
  console.log('📊 Oportunidades (Kanban)...');
  const opStatusFlow: Array<{ status: 'lead' | 'contato_inicial' | 'negociacao' | 'ganha' | 'perdida' | 'arquivada'; prioridade: 'baixa' | 'media' | 'alta' | 'urgente'; temperatura: 'frio' | 'morno' | 'quente' }> = [
    { status: 'lead', prioridade: 'baixa', temperatura: 'frio' },
    { status: 'lead', prioridade: 'media', temperatura: 'frio' },
    { status: 'lead', prioridade: 'alta', temperatura: 'morno' },
    { status: 'contato_inicial', prioridade: 'media', temperatura: 'morno' },
    { status: 'contato_inicial', prioridade: 'alta', temperatura: 'morno' },
    { status: 'contato_inicial', prioridade: 'alta', temperatura: 'quente' },
    { status: 'negociacao', prioridade: 'alta', temperatura: 'quente' },
    { status: 'negociacao', prioridade: 'urgente', temperatura: 'quente' },
    { status: 'negociacao', prioridade: 'alta', temperatura: 'quente' },
    { status: 'ganha', prioridade: 'alta', temperatura: 'quente' },
    { status: 'ganha', prioridade: 'media', temperatura: 'quente' },
    { status: 'perdida', prioridade: 'media', temperatura: 'frio' },
    { status: 'perdida', prioridade: 'baixa', temperatura: 'frio' },
    { status: 'arquivada', prioridade: 'baixa', temperatura: 'frio' },
    { status: 'arquivada', prioridade: 'baixa', temperatura: 'frio' },
    { status: 'lead', prioridade: 'urgente', temperatura: 'quente' },
    { status: 'negociacao', prioridade: 'media', temperatura: 'morno' },
    { status: 'contato_inicial', prioridade: 'baixa', temperatura: 'frio' },
  ];

  const nomesOportunidade = [
    'Seguro Auto - Família Oliveira', 'Renovação Residencial Santos', 'Seguro Vida - Pedro F.',
    'Frota TechSol', 'Empresarial Horizonte', 'Auto - Luciana R.', 'Residencial Marcos P.',
    'Vida - Juliana S.', 'Condomínio Norte', 'Auto - Ricardo A.', 'Empresarial FitPlus',
    'Vida - Camila N.', 'Residencial Barbosa', 'Auto - Patrícia C.', 'Saúde Plena - Multi',
    'Frota TransRápido', 'Vida - Eduardo M.', 'Auto - Amanda G.',
  ];

  await db.insert(oportunidades).values(
    opStatusFlow.map((flow, i) => {
      const vendedorId = pick(VENDEDORES);
      const clienteId = realClienteIds[i % realClienteIds.length];
      return {
        corretoraId: CORRETORA_ID,
        vendedorId,
        vendedorOriginalId: vendedorId,
        clienteId,
        nomeCliente: nomesOportunidade[i],
        ...flow,
        premioEstimado: randDecimal(500, 8000),
        produtoId: pick(PRODUTOS_REAIS),
        dataVencimento: futureDate(randInt(7, 90)),
        observacoes: flow.status === 'perdida' ? 'Cliente fechou com concorrente' : flow.status === 'ganha' ? 'Venda concluída com sucesso' : null,
        motivoPerda: flow.status === 'perdida' ? pick(['Preço', 'Concorrência', 'Sem interesse']) : null,
      };
    })
  ).onConflictDoNothing();

  // ── 7. Cotações ──────────────────────────────────────────────────────────
  console.log('📝 Cotações...');
  const cotacaoStatuses: Array<'EM_ELABORACAO' | 'PERDIDA' | 'EXPIRADA' | 'CONVERTIDA'> = [
    'EM_ELABORACAO', 'EM_ELABORACAO', 'EM_ELABORACAO',
    'CONVERTIDA', 'CONVERTIDA', 'CONVERTIDA', 'CONVERTIDA',
    'PERDIDA', 'PERDIDA',
    'EXPIRADA', 'EXPIRADA',
    'EM_ELABORACAO', 'CONVERTIDA', 'PERDIDA', 'EM_ELABORACAO',
  ];

  await db.insert(cotacoes).values(
    cotacaoIds.map((id, i) => {
      const vendedorId = pick(VENDEDORES);
      const clienteId = realClienteIds[i % realClienteIds.length];
      const produtoId = pick(PRODUTOS_REAIS);
      const vigInicio = pastDateStr(randInt(10, 180));
      const vigFim = futureDateStr(randInt(180, 365));
      const premio = randDecimal(800, 12000);
      const comissao = randDecimal(7, 15);
      const status = cotacaoStatuses[i];
      return {
        id,
        corretoraId: CORRETORA_ID,
        clienteId,
        vendedorId,
        produtoId,
        seguradoraParceiraId: pick(SEGURADORAS),
        numeroCotacao: `COT-${RUN}-${String(i + 1).padStart(3, '0')}`,
        vigenciaInicio: vigInicio,
        vigenciaFim: vigFim,
        status,
        premioLiquido: premio,
        percentualComissao: comissao,
        valorComissao: (parseFloat(premio) * parseFloat(comissao) / 100).toFixed(2),
        origem: 'MANUAL' as const,
        situacao: status === 'PERDIDA' ? 'PERDIDO' : 'NOVO',
        motivoPerda: status === 'PERDIDA' ? pick(['Preço alto', 'Cliente desistiu', 'Concorrente']) : null,
      };
    })
  ).onConflictDoNothing();

  // ── 8. Documentos de venda ───────────────────────────────────────────────
  console.log('📋 Documentos de venda...');
  const docStatuses: Array<'EM_NEGOCIACAO' | 'AGUARDANDO_CLIENTE' | 'AGUARDANDO_APROVACAO' | 'VENDA_CONFIRMADA' | 'AGUARDANDO_CADASTRO' | 'ATIVO' | 'CANCELADO' | 'PERDIDO'> = [
    'ATIVO', 'ATIVO', 'ATIVO', 'ATIVO', 'ATIVO',
    'AGUARDANDO_CADASTRO', 'AGUARDANDO_CADASTRO', 'AGUARDANDO_CADASTRO',
    'VENDA_CONFIRMADA', 'VENDA_CONFIRMADA', 'VENDA_CONFIRMADA',
    'EM_NEGOCIACAO', 'EM_NEGOCIACAO',
    'AGUARDANDO_APROVACAO', 'AGUARDANDO_APROVACAO',
    'AGUARDANDO_CLIENTE',
    'CANCELADO',
    'PERDIDO',
  ];

  const tiposDoc: Array<'COTACAO_DIRETA' | 'PROPOSTA_FORMAL' | 'VENDA_EXPRESSA'> = [
    'COTACAO_DIRETA', 'PROPOSTA_FORMAL', 'VENDA_EXPRESSA',
    'PROPOSTA_FORMAL', 'VENDA_EXPRESSA', 'COTACAO_DIRETA',
    'PROPOSTA_FORMAL', 'VENDA_EXPRESSA', 'COTACAO_DIRETA',
    'PROPOSTA_FORMAL', 'VENDA_EXPRESSA', 'COTACAO_DIRETA',
    'PROPOSTA_FORMAL', 'VENDA_EXPRESSA', 'COTACAO_DIRETA',
    'PROPOSTA_FORMAL', 'VENDA_EXPRESSA', 'COTACAO_DIRETA',
  ];

  await db.insert(documentosVenda).values(
    docVendaIds.map((id, i) => {
      const vendedorId = pick(VENDEDORES);
      const clienteId = realClienteIds[i % realClienteIds.length];
      const produtoId = pick(PRODUTOS_REAIS);
      const status = docStatuses[i];
      const vigInicio = pastDateStr(randInt(30, 300));
      const vigFim = futureDateStr(randInt(60, 365));
      const premio = randDecimal(1000, 15000);
      const comissao = randDecimal(7, 15);
      const valorComissao = (parseFloat(premio) * parseFloat(comissao) / 100).toFixed(2);
      const isAtivo = ['ATIVO', 'VENDA_CONFIRMADA', 'AGUARDANDO_CADASTRO'].includes(status);

      return {
        id,
        corretoraId: CORRETORA_ID,
        clienteId,
        vendedorId,
        produtoId,
        seguradoraParceiraId: pick(SEGURADORAS),
        numeroDocumento: `DOC-${RUN}-${String(i + 1).padStart(3, '0')}`,
        tipoDocumento: tiposDoc[i],
        status,
        vigenciaInicio: vigInicio,
        vigenciaFim: vigFim,
        premioLiquido: premio,
        percentualComissao: comissao,
        valorComissao,
        numeroParcelas: pick([1, 2, 3, 6, 12]),
        statusPagamentoComissao: isAtivo ? ('PENDENTE' as const) : ('PENDENTE' as const),
        dataSolicitacaoCadastro: ['AGUARDANDO_CADASTRO', 'ATIVO'].includes(status) ? pastDate(randInt(1, 10)) : null,
        dataAprovacaoCadastro: status === 'ATIVO' ? pastDate(randInt(1, 7)) : null,
        aprovadoPorId: status === 'ATIVO' ? USER_CADASTRO_ID : null,
        motivoCancelamento: status === 'CANCELADO' ? 'Cliente solicitou cancelamento' : null,
        motivoPerda: status === 'PERDIDO' ? 'Concorrente com preço menor' : null,
        observacoes: isAtivo ? 'Documentação completa' : null,
      };
    })
  ).onConflictDoNothing();

  // ── 9. Renovações ────────────────────────────────────────────────────────
  console.log('🔄 Renovações...');
  const renStatuses: Array<'NAO_TRABALHADO' | 'EM_PROSPECCAO' | 'EM_NEGOCIACAO' | 'AGUARDANDO_CLIENTE' | 'RENOVADO' | 'PERDIDO' | 'CANCELADO'> = [
    'NAO_TRABALHADO', 'NAO_TRABALHADO', 'NAO_TRABALHADO',
    'EM_PROSPECCAO', 'EM_PROSPECCAO', 'EM_PROSPECCAO',
    'EM_NEGOCIACAO', 'EM_NEGOCIACAO',
    'AGUARDANDO_CLIENTE', 'AGUARDANDO_CLIENTE',
    'RENOVADO', 'RENOVADO', 'RENOVADO',
    'PERDIDO',
  ];

  await db.insert(renovacoesComerciais).values(
    renovacaoIds.map((id, i) => {
      const vendedorId = pick(VENDEDORES);
      const clienteId = realClienteIds[i % realClienteIds.length];
      const status = renStatuses[i];
      const vencimento = i < 7 ? futureDateStr(randInt(7, 60)) : pastDateStr(randInt(1, 60));
      const premioAnterior = randDecimal(800, 10000);
      const comissaoAnterior = randDecimal(7, 14);

      return {
        id,
        corretoraId: CORRETORA_ID,
        vendedorId,
        clienteId,
        status,
        dataVencimento: vencimento,
        produtoDescricao: pick(['Seguro Auto', 'Seguro Residencial', 'Seguro Vida', 'Seguro Empresarial']),
        seguradoraAnterior: pick(['Porto Seguro', 'Bradesco Seguros', 'SulAmérica', 'Allianz']),
        premioAnterior,
        percentualComissaoAnterior: comissaoAnterior,
        valorComissaoAnterior: (parseFloat(premioAnterior) * parseFloat(comissaoAnterior) / 100).toFixed(2),
        documentoVendaAnteriorId: i < docVendaIds.length ? docVendaIds[i] : null,
        motivoPerda: status === 'PERDIDO' ? pick(['Preço alto', 'Cliente mudou de seguradora', 'Sem retorno']) : null,
        observacoes: status === 'RENOVADO' ? 'Renovado com sucesso' : null,
      };
    })
  ).onConflictDoNothing();

  // ── 10. Sinistros ────────────────────────────────────────────────────────
  console.log('🚨 Sinistros...');
  const sinStatuses: Array<'ABERTO' | 'EM_ANALISE' | 'AGUARDANDO_DOCUMENTOS' | 'APROVADO' | 'RECUSADO' | 'PAGO'> = [
    'ABERTO', 'ABERTO',
    'EM_ANALISE', 'EM_ANALISE',
    'AGUARDANDO_DOCUMENTOS',
    'APROVADO',
    'PAGO',
  ];

  const tiposSinistro: Array<'COLISAO' | 'ROUBO_FURTO' | 'INCENDIO' | 'DANOS_NATURAIS' | 'DANOS_TERCEIROS' | 'OUTROS'> = [
    'COLISAO', 'ROUBO_FURTO', 'DANOS_NATURAIS', 'COLISAO', 'DANOS_TERCEIROS', 'INCENDIO', 'COLISAO',
  ];

  const descricoesSinistro = [
    'Colisão frontal em via urbana, danos na parte dianteira do veículo.',
    'Roubo do veículo ocorrido em via pública às 22h.',
    'Alagamento causado por chuva intensa danificou móveis e equipamentos.',
    'Colisão na traseira em congestionamento.',
    'Danos causados a veículo de terceiro em estacionamento.',
    'Princípio de incêndio na cozinha causou danos ao imóvel.',
    'Capotamento em rodovia estadual com perda total.',
  ];

  // Usar apenas docs de venda que sejam ATIVO (os 5 primeiros)
  const docsAtivos = docVendaIds.slice(0, 5);

  await db.insert(sinistros).values(
    sinistroIds.map((id, i) => {
      const status = sinStatuses[i];
      const docId = docsAtivos[i % docsAtivos.length];
      const dataOcorrencia = pastDateStr(randInt(5, 120));
      return {
        id,
        corretoraId: CORRETORA_ID,
        documentoVendaId: docId,
        solicitanteId: pick(VENDEDORES),
        numeroSinistro: `SIN-2026-${String(i + 1).padStart(4, '0')}`,
        tipoSinistro: tiposSinistro[i],
        status,
        descricao: descricoesSinistro[i],
        dataOcorrencia,
        valorReclamado: randDecimal(2000, 50000),
        valorAprovado: ['APROVADO', 'PAGO'].includes(status) ? randDecimal(1500, 45000) : null,
        dataAprovacao: status === 'APROVADO' ? pastDate(randInt(1, 10)) : null,
        dataPagamento: status === 'PAGO' ? pastDate(randInt(1, 5)) : null,
        aprovadoPorId: ['APROVADO', 'PAGO'].includes(status) ? USER_GERENTE_ID : null,
        observacoes: status === 'RECUSADO' ? 'Sinistro não coberto pela apólice' : null,
      };
    })
  ).onConflictDoNothing();

  // ── 11. Badge tipos (catálogo global) ───────────────────────────────────
  console.log('🏅 Badge tipos...');
  const badgeDefs = [
    { slug: 'primeiro-venda', nome: 'Primeira Venda', descricao: 'Concluiu sua primeira venda', icone: 'star', cor: '#F59E0B' },
    { slug: 'vendedor-ouro', nome: 'Vendedor Ouro', descricao: 'Atingiu R$ 50.000 em prêmios em um mês', icone: 'trophy', cor: '#EAB308' },
    { slug: 'renovacao-mestre', nome: 'Mestre da Renovação', descricao: 'Renovou 10 apólices em um mês', icone: 'refresh-cw', cor: '#3B82F6' },
    { slug: 'meta-100', nome: '100% da Meta', descricao: 'Bateu 100% da meta mensal', icone: 'target', cor: '#10B981' },
    { slug: 'velocidade-relampago', nome: 'Velocidade Relâmpago', descricao: 'Fechou 5 vendas em uma semana', icone: 'zap', cor: '#8B5CF6' },
    { slug: 'rei-cotacoes', nome: 'Rei das Cotações', descricao: 'Gerou 20 cotações em um mês', icone: 'file-text', cor: '#EC4899' },
    { slug: 'cliente-fiel', nome: 'Fidelizador', descricao: 'Teve 5 renovações de carteira própria', icone: 'heart', cor: '#EF4444' },
    { slug: 'equipe-destaque', nome: 'Destaque da Equipe', descricao: 'Melhor desempenho da equipe no mês', icone: 'users', cor: '#14B8A6' },
    { slug: 'zero-perda', nome: 'Sem Perdas', descricao: 'Nenhuma cotação perdida no mês', icone: 'shield', cor: '#6366F1' },
    { slug: 'novato-promissor', nome: 'Novato Promissor', descricao: 'Completou o primeiro mês com pelo menos 3 vendas', icone: 'award', cor: '#F97316' },
  ];

  await db.insert(badgeTipos).values(badgeDefs).onConflictDoNothing();

  const badgeTiposDB = await db.select({ id: badgeTipos.id, slug: badgeTipos.slug }).from(badgeTipos)
    .where(inArray(badgeTipos.slug, badgeDefs.map(b => b.slug)));
  const badgeBySlug = Object.fromEntries(badgeTiposDB.map(b => [b.slug, b.id]));

  // ── 12. Usuário badges (conceder alguns) ─────────────────────────────────
  console.log('🎖️  Concedendo badges...');
  const todosVendedores = [USER_VEND1_ID, USER_VEND2_ID, USER_VEND3_ID];
  await db.insert(usuarioBadges).values([
    // Ana Paula
    { corretoraId: CORRETORA_ID, usuarioId: USER_VEND1_ID, badgeTipoId: badgeBySlug['primeiro-venda'], concedidoPorId: USER_GERENTE_ID, observacao: 'Primeira venda concluída com sucesso!' },
    { corretoraId: CORRETORA_ID, usuarioId: USER_VEND1_ID, badgeTipoId: badgeBySlug['meta-100'], concedidoPorId: USER_GERENTE_ID, observacao: 'Meta de abril batida em cheio' },
    { corretoraId: CORRETORA_ID, usuarioId: USER_VEND1_ID, badgeTipoId: badgeBySlug['equipe-destaque'], concedidoPorId: USER_GERENTE_ID },
    // Rafael Costa
    { corretoraId: CORRETORA_ID, usuarioId: USER_VEND2_ID, badgeTipoId: badgeBySlug['primeiro-venda'], concedidoPorId: USER_GERENTE_ID },
    { corretoraId: CORRETORA_ID, usuarioId: USER_VEND2_ID, badgeTipoId: badgeBySlug['rei-cotacoes'], concedidoPorId: USER_GERENTE_ID, observacao: '22 cotações geradas em março' },
    // Fernanda Lima
    { corretoraId: CORRETORA_ID, usuarioId: USER_VEND3_ID, badgeTipoId: badgeBySlug['primeiro-venda'], concedidoPorId: USER_GERENTE_ID },
    { corretoraId: CORRETORA_ID, usuarioId: USER_VEND3_ID, badgeTipoId: badgeBySlug['renovacao-mestre'], concedidoPorId: USER_GERENTE_ID, observacao: '12 renovações em fevereiro' },
    { corretoraId: CORRETORA_ID, usuarioId: USER_VEND3_ID, badgeTipoId: badgeBySlug['cliente-fiel'], concedidoPorId: USER_GERENTE_ID },
    // Admin
    { corretoraId: CORRETORA_ID, usuarioId: ADMIN_ID, badgeTipoId: badgeBySlug['vendedor-ouro'], concedidoPorId: ADMIN_ID, observacao: 'R$ 68.000 em prêmios em março' },
    { corretoraId: CORRETORA_ID, usuarioId: ADMIN_ID, badgeTipoId: badgeBySlug['zero-perda'], concedidoPorId: ADMIN_ID },
  ]);

  // ── 13. Missões ──────────────────────────────────────────────────────────
  console.log('🎯 Missões...');
  const equipeAlfaIdFinal = equipeAlfaId;
  const equipeBetaIdFinal = equipeBetaId;

  await db.insert(missoes).values([
    // Missões individuais — vendedores
    {
      corretoraId: CORRETORA_ID,
      usuarioId: USER_VEND1_ID,
      criadaPorId: USER_GERENTE_ID,
      titulo: 'Fechar 5 novos seguros em maio',
      descricao: 'Atingir 5 documentos de venda confirmados no mês de maio',
      tipoMetrica: 'novos_seguros',
      valorAlvo: '5',
      dataInicio: pastDateStr(7),
      prazo: futureDateStr(23),
      status: 'EM_ANDAMENTO',
      badgeTipoId: badgeBySlug['velocidade-relampago'],
    },
    {
      corretoraId: CORRETORA_ID,
      usuarioId: USER_VEND2_ID,
      criadaPorId: USER_GERENTE_ID,
      titulo: 'Gerar 15 cotações em maio',
      descricao: 'Criar ao menos 15 cotações no mês corrente',
      tipoMetrica: 'cotacoes',
      valorAlvo: '15',
      dataInicio: pastDateStr(7),
      prazo: futureDateStr(23),
      status: 'EM_ANDAMENTO',
      badgeTipoId: badgeBySlug['rei-cotacoes'],
    },
    {
      corretoraId: CORRETORA_ID,
      usuarioId: USER_VEND3_ID,
      criadaPorId: USER_GERENTE_ID,
      titulo: 'Renovar 8 apólices em maio',
      descricao: 'Finalizar ao menos 8 renovações no status RENOVADO',
      tipoMetrica: 'renovacoes',
      valorAlvo: '8',
      dataInicio: pastDateStr(7),
      prazo: futureDateStr(23),
      status: 'EM_ANDAMENTO',
      badgeTipoId: badgeBySlug['renovacao-mestre'],
    },
    {
      corretoraId: CORRETORA_ID,
      usuarioId: ADMIN_ID,
      criadaPorId: ADMIN_ID,
      titulo: 'Atingir R$ 80.000 em prêmios',
      descricao: 'Meta de valor de prêmio para o mês de maio',
      tipoMetrica: 'valor_premio',
      valorAlvo: '80000',
      dataInicio: pastDateStr(7),
      prazo: futureDateStr(23),
      status: 'EM_ANDAMENTO',
      badgeTipoId: badgeBySlug['vendedor-ouro'],
    },
    // Missões de equipe
    {
      corretoraId: CORRETORA_ID,
      equipeId: equipeAlfaIdFinal,
      criadaPorId: USER_GERENTE_ID,
      titulo: 'Equipe Alfa — 20 vendas em maio',
      descricao: 'A Equipe Alfa deve fechar 20 documentos de venda confirmados',
      tipoMetrica: 'novos_seguros',
      valorAlvo: '20',
      dataInicio: pastDateStr(7),
      prazo: futureDateStr(23),
      status: 'EM_ANDAMENTO',
    },
    {
      corretoraId: CORRETORA_ID,
      equipeId: equipeBetaIdFinal,
      criadaPorId: USER_GERENTE_ID,
      titulo: 'Equipe Beta — R$ 50.000 em prêmios',
      descricao: 'A Equipe Beta deve atingir R$ 50.000 em valor de prêmio no mês',
      tipoMetrica: 'valor_premio',
      valorAlvo: '50000',
      dataInicio: pastDateStr(7),
      prazo: futureDateStr(23),
      status: 'EM_ANDAMENTO',
    },
    // Missão concluída (histórico)
    {
      corretoraId: CORRETORA_ID,
      usuarioId: USER_VEND1_ID,
      criadaPorId: USER_GERENTE_ID,
      titulo: 'Fechar 3 vendas em abril',
      descricao: 'Meta de abril para Ana Paula',
      tipoMetrica: 'novos_seguros',
      valorAlvo: '3',
      dataInicio: pastDateStr(37),
      prazo: pastDateStr(7),
      status: 'CONCLUIDA',
      badgeTipoId: badgeBySlug['meta-100'],
    },
    // Missão expirada
    {
      corretoraId: CORRETORA_ID,
      usuarioId: USER_VEND2_ID,
      criadaPorId: USER_GERENTE_ID,
      titulo: '10 cotações em abril',
      descricao: 'Meta de cotações de abril para Rafael',
      tipoMetrica: 'cotacoes',
      valorAlvo: '10',
      dataInicio: pastDateStr(40),
      prazo: pastDateStr(10),
      status: 'EXPIRADA',
    },
  ]);

  console.log('\n✅ Seed de dados fictícios concluído!');
  console.log('\n📋 Resumo:');
  console.log('  • 4 seguradoras parceiras');
  console.log('  • 2 produtos extras (Empresarial, Condomínio)');
  console.log('  • 2 equipes (Alfa e Beta)');
  console.log('  • 5 usuários (Gerente, 3 Vendedores, Cadastro) — senha: senha123');
  console.log('  • 22 clientes (14 PF + 8 PJ)');
  console.log('  • 18 oportunidades no kanban');
  console.log('  • 15 cotações');
  console.log('  • 18 documentos de venda');
  console.log('  • 14 renovações');
  console.log('  • 7 sinistros');
  console.log('  • 10 tipos de badge + 10 badges concedidos');
  console.log('  • 8 missões (4 individuais ativas, 2 de equipe, 1 concluída, 1 expirada)');

  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed falhou:', err);
  process.exit(1);
});
