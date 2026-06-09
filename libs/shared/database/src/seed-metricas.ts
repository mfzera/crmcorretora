/**
 * Seed de dados fictícios para testar o Dashboard Admin.
 * Executa: pnpm tsx libs/shared/database/src/seed-metricas.ts
 *
 * Idempotente: pode ser executado múltiplas vezes sem duplicar dados.
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
  endossos,
} from './schema/index.js';
import { eq, and, isNull } from 'drizzle-orm';
import bcryptjs from 'bcryptjs';
const { hash } = bcryptjs;

// ─── Helpers ────────────────────────────────────────────────────────────────

function diasAtras(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function soData(d: Date): string {
  return d.toISOString().split('T')[0];
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function seedMetricas() {
  console.log('🌱 Iniciando seed de dados para o Dashboard Admin...\n');

  // ── 1. Buscar corretora existente ──────────────────────────────────────────
  const corretora = await db.query.corretoras.findFirst({
    where: and(eq(corretoras.cnpj, '12345678000190'), isNull(corretoras.deletedAt)),
  });

  if (!corretora) {
    console.error('❌ Corretora não encontrada. Execute pnpm db:seed e pnpm tsx libs/shared/database/src/seed-user.ts primeiro.');
    process.exit(1);
  }

  const corretoraId = corretora.id;
  console.log(`✅ Corretora: ${corretora.nomeFantasia} (${corretoraId})\n`);

  // ── 2. Cargo Admin ─────────────────────────────────────────────────────────
  console.log('👔 Criando cargos...');
  const [cargoAdmin] = await db
    .insert(cargos)
    .values({ corretoraId, nomeCargo: 'Administrador', isAdmin: true, isGestor: true })
    .onConflictDoNothing()
    .returning();

  const [cargoVendedor] = await db
    .insert(cargos)
    .values({ corretoraId, nomeCargo: 'Vendedor', isVendedor: true })
    .onConflictDoNothing()
    .returning();

  const [cargoGestor] = await db
    .insert(cargos)
    .values({ corretoraId, nomeCargo: 'Gestor', isGestor: true })
    .onConflictDoNothing()
    .returning();

  // Busca os cargos que podem já existir
  const cargoAdminDb = cargoAdmin ?? await db.query.cargos.findFirst({ where: and(eq(cargos.corretoraId, corretoraId), eq(cargos.nomeCargo, 'Administrador'), isNull(cargos.deletedAt)) });
  const cargoVendedorDb = cargoVendedor ?? await db.query.cargos.findFirst({ where: and(eq(cargos.corretoraId, corretoraId), eq(cargos.nomeCargo, 'Vendedor'), isNull(cargos.deletedAt)) });
  const cargoGestorDb = cargoGestor ?? await db.query.cargos.findFirst({ where: and(eq(cargos.corretoraId, corretoraId), eq(cargos.nomeCargo, 'Gestor'), isNull(cargos.deletedAt)) });

  console.log('  ✅ Cargos prontos\n');

  // ── 3. Usuário admin + vendedores ──────────────────────────────────────────
  console.log('👤 Criando usuários...');
  const senhaHash = await hash('senha123', 10);

  const todosUsuarios = [
    { nome: 'Miguel Caetano',  email: 'ecotech@grupoecosistema.com.br', cargoId: cargoAdminDb?.id ?? null },
    { nome: 'Ana Souza',       email: 'ana.souza@ecosistema.com.br',    cargoId: cargoVendedorDb?.id ?? null },
    { nome: 'Carlos Lima',     email: 'carlos.lima@ecosistema.com.br',  cargoId: cargoVendedorDb?.id ?? null },
    { nome: 'Fernanda Costa',  email: 'fernanda.costa@ecosistema.com.br', cargoId: cargoVendedorDb?.id ?? null },
    { nome: 'Ricardo Alves',   email: 'ricardo.alves@ecosistema.com.br', cargoId: cargoGestorDb?.id ?? null },
  ];

  const vendedoresIds: string[] = [];
  for (const v of todosUsuarios) {
    const [usu] = await db
      .insert(usuarios)
      .values({ corretoraId, passwordHash: senhaHash, ativo: true, primeiroAcesso: false, ...v })
      .onConflictDoNothing()
      .returning();

    const id = usu?.id ?? (await db.query.usuarios.findFirst({ where: eq(usuarios.email, v.email) }))?.id;
    if (id) {
      vendedoresIds.push(id);
      // Atualiza cargo se já existia
      if (v.cargoId) await db.update(usuarios).set({ cargoId: v.cargoId, corretoraId }).where(eq(usuarios.email, v.email));
    }
  }

  console.log(`  ✅ ${vendedoresIds.length} usuários prontos\n`);

  // ── 5. Seguradoras parceiras ───────────────────────────────────────────────
  console.log('🏦 Criando seguradoras parceiras...');
  const dadosSeguradoras = [
    { cnpj: '92751213000173', razaoSocial: 'Bradesco Seguros S.A.', nomeFantasia: 'Bradesco' },
    { cnpj: '61198164000160', razaoSocial: 'Porto Seguro Cia de Seguros Gerais', nomeFantasia: 'Porto Seguro' },
    { cnpj: '01685053000150', razaoSocial: 'SulAmérica Seguros S.A.', nomeFantasia: 'SulAmérica' },
    { cnpj: '23086170000152', razaoSocial: 'Allianz Seguros S.A.', nomeFantasia: 'Allianz' },
  ];

  const seguradorasIds: string[] = [];
  for (const s of dadosSeguradoras) {
    const [seg] = await db
      .insert(seguradorasParceiras)
      .values({ corretoraId, status: 'ATIVA', ...s })
      .onConflictDoNothing()
      .returning();

    const id = seg?.id ?? (await db.query.seguradorasParceiras.findFirst({ where: and(eq(seguradorasParceiras.corretoraId, corretoraId), eq(seguradorasParceiras.cnpj, s.cnpj), isNull(seguradorasParceiras.deletedAt)) }))?.id;
    if (id) seguradorasIds.push(id);
  }

  console.log(`  ✅ ${seguradorasIds.length} seguradoras prontas\n`);

  // ── 6. Produtos ────────────────────────────────────────────────────────────
  console.log('📦 Criando produtos...');
  const dadosProdutos = [
    { nomeProduto: 'Seguro Auto', tipoSeguro: 'AUTO', percentualComissaoPadrao: '8.00', seguradoraParceiraId: seguradorasIds[0] },
    { nomeProduto: 'Seguro Vida', tipoSeguro: 'VIDA', percentualComissaoPadrao: '15.00', seguradoraParceiraId: seguradorasIds[1] },
    { nomeProduto: 'Seguro Residencial', tipoSeguro: 'RESIDENCIAL', percentualComissaoPadrao: '12.00', seguradoraParceiraId: seguradorasIds[2] },
    { nomeProduto: 'Seguro Empresarial', tipoSeguro: 'EMPRESARIAL', percentualComissaoPadrao: '10.00', seguradoraParceiraId: seguradorasIds[3] },
  ];

  const produtosIds: string[] = [];
  for (const p of dadosProdutos) {
    const [prod] = await db
      .insert(produtos)
      .values({ corretoraId, ativo: true, ...p })
      .onConflictDoNothing()
      .returning();

    const id = prod?.id ?? (await db.query.produtos.findFirst({ where: and(eq(produtos.corretoraId, corretoraId), eq(produtos.nomeProduto, p.nomeProduto), isNull(produtos.deletedAt)) }))?.id;
    if (id) produtosIds.push(id);
  }

  console.log(`  ✅ ${produtosIds.length} produtos prontos\n`);

  // ── 7. Clientes ────────────────────────────────────────────────────────────
  console.log('👤 Criando clientes...');

  const dadosClientesPF = [
    { nome: 'João Silva', cpf: '11122233344' },
    { nome: 'Maria Santos', cpf: '22233344455' },
    { nome: 'Pedro Oliveira', cpf: '33344455566' },
    { nome: 'Luciana Ferreira', cpf: '44455566677' },
    { nome: 'Roberto Gomes', cpf: '55566677788' },
    { nome: 'Camila Rodrigues', cpf: '66677788899' },
    { nome: 'Thiago Martins', cpf: '77788899900' },
    { nome: 'Juliana Almeida', cpf: '88899900011' },
    { nome: 'Marcos Pereira', cpf: '99900011122' },
    { nome: 'Beatriz Carvalho', cpf: '10011122233' },
    { nome: 'Gabriel Nunes', cpf: '12312312312' },
    { nome: 'Renata Moreira', cpf: '45645645645' },
  ];

  const dadosClientesPJ = [
    { razaoSocial: 'Tech Solutions Ltda', nomeFantasia: 'TechSol', cnpj: '11222333000181' },
    { razaoSocial: 'Comércio Varejo S.A.', nomeFantasia: 'ComercioVar', cnpj: '22333444000192' },
    { razaoSocial: 'Indústria Metal Ltda', nomeFantasia: 'IndMetal', cnpj: '33444555000103' },
    { razaoSocial: 'Serviços Gerais ME', nomeFantasia: 'ServiçosG', cnpj: '44555666000114' },
  ];

  const clientesIds: string[] = [];

  for (let i = 0; i < dadosClientesPF.length; i++) {
    const pf = dadosClientesPF[i];
    const vendedorId = vendedoresIds[i % vendedoresIds.length];
    const [cli] = await db
      .insert(clientes)
      .values({ corretoraId, tipoPessoa: 'PF', vendedorId, ativo: true, ...pf })
      .onConflictDoNothing()
      .returning();

    const id = cli?.id ?? (await db.query.clientes.findFirst({ where: and(eq(clientes.corretoraId, corretoraId), eq(clientes.cpf, pf.cpf), isNull(clientes.deletedAt)) }))?.id;
    if (id) clientesIds.push(id);
  }

  for (let i = 0; i < dadosClientesPJ.length; i++) {
    const pj = dadosClientesPJ[i];
    const vendedorId = vendedoresIds[i % vendedoresIds.length];
    const [cli] = await db
      .insert(clientes)
      .values({ corretoraId, tipoPessoa: 'PJ', vendedorId, ativo: true, ...pj })
      .onConflictDoNothing()
      .returning();

    const id = cli?.id ?? (await db.query.clientes.findFirst({ where: and(eq(clientes.corretoraId, corretoraId), eq(clientes.cnpj, pj.cnpj), isNull(clientes.deletedAt)) }))?.id;
    if (id) clientesIds.push(id);
  }

  console.log(`  ✅ ${clientesIds.length} clientes prontos\n`);

  // ── 8. Documentos de venda ─────────────────────────────────────────────────
  console.log('📄 Criando documentos de venda...');

  type DocStatus = 'ATIVO' | 'CANCELADO' | 'ARQUIVADO' | 'EM_NEGOCIACAO' | 'AGUARDANDO_CLIENTE' | 'VENDA_CONFIRMADA';

  const docsDados: Array<{
    idx: number;
    status: DocStatus;
    diasAtrasInicio: number;
    premioLiquido: string;
    percentualComissao: string;
    segIdx: number;
    prodIdx: number;
  }> = [
    { idx: 1,  status: 'ATIVO',             diasAtrasInicio: 150, premioLiquido: '2500.00', percentualComissao: '8.00',  segIdx: 0, prodIdx: 0 },
    { idx: 2,  status: 'ATIVO',             diasAtrasInicio: 140, premioLiquido: '1800.00', percentualComissao: '12.00', segIdx: 2, prodIdx: 2 },
    { idx: 3,  status: 'ATIVO',             diasAtrasInicio: 130, premioLiquido: '3200.00', percentualComissao: '10.00', segIdx: 3, prodIdx: 3 },
    { idx: 4,  status: 'ATIVO',             diasAtrasInicio: 120, premioLiquido: '950.00',  percentualComissao: '15.00', segIdx: 1, prodIdx: 1 },
    { idx: 5,  status: 'ATIVO',             diasAtrasInicio: 110, premioLiquido: '4100.00', percentualComissao: '8.00',  segIdx: 0, prodIdx: 0 },
    { idx: 6,  status: 'ATIVO',             diasAtrasInicio: 100, premioLiquido: '2100.00', percentualComissao: '12.00', segIdx: 2, prodIdx: 2 },
    { idx: 7,  status: 'ATIVO',             diasAtrasInicio: 90,  premioLiquido: '1650.00', percentualComissao: '8.00',  segIdx: 0, prodIdx: 0 },
    { idx: 8,  status: 'ATIVO',             diasAtrasInicio: 85,  premioLiquido: '5500.00', percentualComissao: '10.00', segIdx: 3, prodIdx: 3 },
    { idx: 9,  status: 'ATIVO',             diasAtrasInicio: 80,  premioLiquido: '3800.00', percentualComissao: '15.00', segIdx: 1, prodIdx: 1 },
    { idx: 10, status: 'ATIVO',             diasAtrasInicio: 75,  premioLiquido: '2250.00', percentualComissao: '8.00',  segIdx: 0, prodIdx: 0 },
    { idx: 11, status: 'ATIVO',             diasAtrasInicio: 70,  premioLiquido: '1400.00', percentualComissao: '12.00', segIdx: 2, prodIdx: 2 },
    { idx: 12, status: 'ATIVO',             diasAtrasInicio: 65,  premioLiquido: '6200.00', percentualComissao: '8.00',  segIdx: 0, prodIdx: 0 },
    { idx: 13, status: 'ATIVO',             diasAtrasInicio: 60,  premioLiquido: '2900.00', percentualComissao: '10.00', segIdx: 3, prodIdx: 3 },
    { idx: 14, status: 'ATIVO',             diasAtrasInicio: 55,  premioLiquido: '1750.00', percentualComissao: '15.00', segIdx: 1, prodIdx: 1 },
    { idx: 15, status: 'ATIVO',             diasAtrasInicio: 50,  premioLiquido: '3400.00', percentualComissao: '8.00',  segIdx: 0, prodIdx: 0 },
    { idx: 16, status: 'ATIVO',             diasAtrasInicio: 45,  premioLiquido: '2600.00', percentualComissao: '12.00', segIdx: 2, prodIdx: 2 },
    { idx: 17, status: 'ATIVO',             diasAtrasInicio: 40,  premioLiquido: '4700.00', percentualComissao: '8.00',  segIdx: 0, prodIdx: 0 },
    { idx: 18, status: 'ATIVO',             diasAtrasInicio: 35,  premioLiquido: '1200.00', percentualComissao: '15.00', segIdx: 1, prodIdx: 1 },
    { idx: 19, status: 'ATIVO',             diasAtrasInicio: 30,  premioLiquido: '3100.00', percentualComissao: '10.00', segIdx: 3, prodIdx: 3 },
    { idx: 20, status: 'ATIVO',             diasAtrasInicio: 25,  premioLiquido: '2200.00', percentualComissao: '8.00',  segIdx: 0, prodIdx: 0 },
    { idx: 21, status: 'ATIVO',             diasAtrasInicio: 20,  premioLiquido: '5100.00', percentualComissao: '12.00', segIdx: 2, prodIdx: 2 },
    { idx: 22, status: 'ATIVO',             diasAtrasInicio: 15,  premioLiquido: '1900.00', percentualComissao: '8.00',  segIdx: 0, prodIdx: 0 },
    { idx: 23, status: 'ATIVO',             diasAtrasInicio: 10,  premioLiquido: '2800.00', percentualComissao: '15.00', segIdx: 1, prodIdx: 1 },
    { idx: 24, status: 'ATIVO',             diasAtrasInicio: 5,   premioLiquido: '3600.00', percentualComissao: '10.00', segIdx: 3, prodIdx: 3 },
    { idx: 25, status: 'ATIVO',             diasAtrasInicio: 2,   premioLiquido: '1500.00', percentualComissao: '8.00',  segIdx: 0, prodIdx: 0 },
    { idx: 26, status: 'CANCELADO',         diasAtrasInicio: 100, premioLiquido: '1200.00', percentualComissao: '8.00',  segIdx: 0, prodIdx: 0 },
    { idx: 27, status: 'CANCELADO',         diasAtrasInicio: 80,  premioLiquido: '2100.00', percentualComissao: '12.00', segIdx: 2, prodIdx: 2 },
    { idx: 28, status: 'CANCELADO',         diasAtrasInicio: 50,  premioLiquido: '900.00',  percentualComissao: '8.00',  segIdx: 0, prodIdx: 0 },
    { idx: 29, status: 'ARQUIVADO',         diasAtrasInicio: 120, premioLiquido: '1800.00', percentualComissao: '10.00', segIdx: 3, prodIdx: 3 },
    { idx: 30, status: 'ARQUIVADO',         diasAtrasInicio: 90,  premioLiquido: '3300.00', percentualComissao: '15.00', segIdx: 1, prodIdx: 1 },
    { idx: 31, status: 'EM_NEGOCIACAO',     diasAtrasInicio: 7,   premioLiquido: '4200.00', percentualComissao: '8.00',  segIdx: 0, prodIdx: 0 },
    { idx: 32, status: 'EM_NEGOCIACAO',     diasAtrasInicio: 3,   premioLiquido: '2700.00', percentualComissao: '12.00', segIdx: 2, prodIdx: 2 },
    { idx: 33, status: 'AGUARDANDO_CLIENTE',diasAtrasInicio: 5,   premioLiquido: '3500.00', percentualComissao: '10.00', segIdx: 3, prodIdx: 3 },
    { idx: 34, status: 'VENDA_CONFIRMADA',  diasAtrasInicio: 8,   premioLiquido: '2300.00', percentualComissao: '15.00', segIdx: 1, prodIdx: 1 },
    { idx: 35, status: 'VENDA_CONFIRMADA',  diasAtrasInicio: 4,   premioLiquido: '1600.00', percentualComissao: '8.00',  segIdx: 0, prodIdx: 0 },
  ];

  const documentosIds: string[] = [];
  for (const d of docsDados) {
    const clienteId = clientesIds[d.idx % clientesIds.length];
    const vendedorId = vendedoresIds[d.idx % vendedoresIds.length];
    const seguradoraParceiraId = seguradorasIds[d.segIdx];
    const produtoId = produtosIds[d.prodIdx];
    const comissaoDecimal = (parseFloat(d.premioLiquido) * parseFloat(d.percentualComissao)) / 100;
    const valorComissao = comissaoDecimal.toFixed(2);
    const dataInicio = diasAtras(d.diasAtrasInicio);
    const dataFim = new Date(dataInicio);
    dataFim.setFullYear(dataFim.getFullYear() + 1);
    const numeroDocumento = `DOC-${String(d.idx).padStart(4, '0')}`;

    const [doc] = await db
      .insert(documentosVenda)
      .values({
        corretoraId,
        clienteId,
        vendedorId,
        produtoId,
        seguradoraParceiraId,
        numeroDocumento,
        tipoDocumento: 'VENDA_EXPRESSA',
        status: d.status,
        vigenciaInicio: soData(dataInicio),
        vigenciaFim: soData(dataFim),
        premioLiquido: d.premioLiquido,
        percentualComissao: d.percentualComissao,
        valorComissao,
        negocioCorretora: false,
        moeda: 'BRL',
      })
      .onConflictDoNothing()
      .returning();

    if (doc?.id) documentosIds.push(doc.id);
  }

  console.log(`  ✅ ${documentosIds.length} documentos criados\n`);

  // ── 9. Oportunidades (Kanban) ──────────────────────────────────────────────
  console.log('📊 Criando oportunidades (kanban)...');

  type OportunidadeStatus = 'lead' | 'contato_inicial' | 'negociacao' | 'ganha' | 'perdida' | 'arquivada';
  type OportunidadePrioridade = 'baixa' | 'media' | 'alta' | 'urgente';
  type OportunidadeTemperatura = 'frio' | 'morno' | 'quente';

  const dadosOportunidades: Array<{
    nomeCliente: string;
    status: OportunidadeStatus;
    prioridade: OportunidadePrioridade;
    temperatura: OportunidadeTemperatura;
    premioEstimado: string;
  }> = [
    { nomeCliente: 'Felipe Cardoso',    status: 'lead',           prioridade: 'baixa',   temperatura: 'frio',   premioEstimado: '1200.00' },
    { nomeCliente: 'Sandra Lima',       status: 'lead',           prioridade: 'media',   temperatura: 'morno',  premioEstimado: '2500.00' },
    { nomeCliente: 'Diego Moura',       status: 'contato_inicial',prioridade: 'alta',    temperatura: 'quente', premioEstimado: '3800.00' },
    { nomeCliente: 'Priscila Torres',   status: 'contato_inicial',prioridade: 'media',   temperatura: 'morno',  premioEstimado: '1900.00' },
    { nomeCliente: 'Hélio Ramos',       status: 'negociacao',     prioridade: 'urgente', temperatura: 'quente', premioEstimado: '5200.00' },
    { nomeCliente: 'Larissa Figueiredo',status: 'negociacao',     prioridade: 'alta',    temperatura: 'quente', premioEstimado: '4100.00' },
    { nomeCliente: 'Construções XYZ',   status: 'negociacao',     prioridade: 'urgente', temperatura: 'quente', premioEstimado: '9800.00' },
    { nomeCliente: 'André Cavalcante',  status: 'ganha',          prioridade: 'alta',    temperatura: 'quente', premioEstimado: '3200.00' },
    { nomeCliente: 'Vanessa Lopes',     status: 'ganha',          prioridade: 'media',   temperatura: 'quente', premioEstimado: '2700.00' },
    { nomeCliente: 'Empreendimentos AB',status: 'ganha',          prioridade: 'alta',    temperatura: 'quente', premioEstimado: '7500.00' },
    { nomeCliente: 'Rafael Mendonça',   status: 'perdida',        prioridade: 'media',   temperatura: 'frio',   premioEstimado: '2100.00' },
    { nomeCliente: 'Carine Batista',    status: 'perdida',        prioridade: 'baixa',   temperatura: 'frio',   premioEstimado: '1500.00' },
    { nomeCliente: 'Logística DEF',     status: 'arquivada',      prioridade: 'baixa',   temperatura: 'frio',   premioEstimado: '4300.00' },
  ];

  for (let i = 0; i < dadosOportunidades.length; i++) {
    const op = dadosOportunidades[i];
    const vendedorId = vendedoresIds[i % vendedoresIds.length];
    const clienteId = clientesIds[i % clientesIds.length] ?? null;

    await db
      .insert(oportunidades)
      .values({
        corretoraId,
        vendedorId,
        vendedorOriginalId: vendedorId,
        clienteId,
        nomeCliente: op.nomeCliente,
        status: op.status,
        prioridade: op.prioridade,
        temperatura: op.temperatura,
        premioEstimado: op.premioEstimado,
        ordem: i,
      })
      .onConflictDoNothing();
  }

  console.log(`  ✅ ${dadosOportunidades.length} oportunidades criadas\n`);

  // ── 10. Renovações ─────────────────────────────────────────────────────────
  console.log('🔄 Criando renovações...');

  type RenovacaoStatus = 'NAO_TRABALHADO' | 'EM_PROSPECCAO' | 'EM_NEGOCIACAO' | 'RENOVADO' | 'PERDIDO' | 'CANCELADO';

  const dadosRenovacoes: Array<{
    status: RenovacaoStatus;
    premioAnterior: string;
    premioNovo: string | null;
    diasVenc: number;
  }> = [
    { status: 'RENOVADO',       premioAnterior: '2500.00', premioNovo: '2700.00', diasVenc: -30 },
    { status: 'RENOVADO',       premioAnterior: '1800.00', premioNovo: '1950.00', diasVenc: -20 },
    { status: 'RENOVADO',       premioAnterior: '3200.00', premioNovo: '3400.00', diasVenc: -15 },
    { status: 'RENOVADO',       premioAnterior: '4100.00', premioNovo: '4300.00', diasVenc: -10 },
    { status: 'RENOVADO',       premioAnterior: '2100.00', premioNovo: '2200.00', diasVenc: -5  },
    { status: 'EM_NEGOCIACAO',  premioAnterior: '2900.00', premioNovo: null,      diasVenc: 10  },
    { status: 'EM_PROSPECCAO',  premioAnterior: '1500.00', premioNovo: null,      diasVenc: 15  },
    { status: 'NAO_TRABALHADO', premioAnterior: '3600.00', premioNovo: null,      diasVenc: 20  },
    { status: 'NAO_TRABALHADO', premioAnterior: '1200.00', premioNovo: null,      diasVenc: 25  },
    { status: 'PERDIDO',        premioAnterior: '2700.00', premioNovo: null,      diasVenc: -45 },
    { status: 'CANCELADO',      premioAnterior: '900.00',  premioNovo: null,      diasVenc: -60 },
  ];

  for (let i = 0; i < dadosRenovacoes.length; i++) {
    const r = dadosRenovacoes[i];
    const vendedorId = vendedoresIds[i % vendedoresIds.length];
    const clienteId = clientesIds[i % clientesIds.length] ?? null;
    const docAnteriorId = documentosIds[i % documentosIds.length] ?? null;
    const dataVencimento = soData(diasAtras(-r.diasVenc));

    await db
      .insert(renovacoesComerciais)
      .values({
        corretoraId,
        vendedorId,
        vendedorOriginalId: vendedorId,
        clienteId,
        documentoVendaAnteriorId: docAnteriorId,
        premioAnterior: r.premioAnterior,
        premioNovo: r.premioNovo,
        status: r.status,
        dataVencimento,
      })
      .onConflictDoNothing();
  }

  console.log(`  ✅ ${dadosRenovacoes.length} renovações criadas\n`);

  // ── 11. Endossos ───────────────────────────────────────────────────────────
  console.log('📝 Criando endossos...');

  type EndossoStatus = 'SOLICITADO' | 'APROVADO' | 'RECUSADO' | 'CANCELADO';
  type TipoEndosso = 'INCLUSAO_COBERTURA' | 'ALTERACAO_VALOR' | 'ALTERACAO_DADOS' | 'ALTERACAO_VIGENCIA' | 'CANCELAMENTO' | 'OUTROS';

  const dadosEndossos: Array<{
    idx: string;
    tipoEndosso: TipoEndosso;
    status: EndossoStatus;
    descricao: string;
  }> = [
    { idx: 'E001', tipoEndosso: 'INCLUSAO_COBERTURA', status: 'APROVADO',   descricao: 'Inclusão de cobertura de terceiros' },
    { idx: 'E002', tipoEndosso: 'ALTERACAO_VALOR',    status: 'APROVADO',   descricao: 'Atualização do valor segurado' },
    { idx: 'E003', tipoEndosso: 'ALTERACAO_DADOS',    status: 'APROVADO',   descricao: 'Correção de dados do segurado' },
    { idx: 'E004', tipoEndosso: 'ALTERACAO_VIGENCIA', status: 'APROVADO',   descricao: 'Ajuste de vigência contratual' },
    { idx: 'E005', tipoEndosso: 'OUTROS',             status: 'APROVADO',   descricao: 'Inclusão de motorista adicional' },
    { idx: 'E006', tipoEndosso: 'INCLUSAO_COBERTURA', status: 'SOLICITADO', descricao: 'Solicitação de cobertura de vidros' },
    { idx: 'E007', tipoEndosso: 'ALTERACAO_VALOR',    status: 'SOLICITADO', descricao: 'Reajuste anual de prêmio' },
    { idx: 'E008', tipoEndosso: 'CANCELAMENTO',       status: 'RECUSADO',   descricao: 'Solicitação de cancelamento antecipado' },
  ];

  for (let i = 0; i < dadosEndossos.length; i++) {
    const e = dadosEndossos[i];
    const vendedorId = vendedoresIds[i % vendedoresIds.length];
    const documentoVendaId = documentosIds[i % documentosIds.length];
    if (!documentoVendaId) continue;

    await db
      .insert(endossos)
      .values({
        corretoraId,
        vendedorId,
        documentoVendaId,
        tipoEndosso: e.tipoEndosso,
        numeroEndosso: e.idx,
        status: e.status,
        descricao: e.descricao,
        dataVigenciaEndosso: soData(diasAtras(30 - i * 5)),
      })
      .onConflictDoNothing();
  }

  console.log(`  ✅ ${dadosEndossos.length} endossos criados\n`);

  // ── Resumo ─────────────────────────────────────────────────────────────────
  console.log('🎉 Seed concluído!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Resumo do que foi criado:');
  console.log(`  • ${vendedoresIds.length} usuários (admin + vendedores)`);
  console.log(`  • ${seguradorasIds.length} seguradoras parceiras`);
  console.log(`  • ${produtosIds.length} produtos`);
  console.log(`  • ${clientesIds.length} clientes (PF + PJ)`);
  console.log(`  • ${docsDados.length} documentos de venda`);
  console.log(`  • ${dadosOportunidades.length} oportunidades no kanban`);
  console.log(`  • ${dadosRenovacoes.length} renovações comerciais`);
  console.log(`  • ${dadosEndossos.length} endossos`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n🚀 Acesse /metricas-dashboard para ver os dados!\n');

  process.exit(0);
}

seedMetricas().catch((err) => {
  console.error('❌ Erro no seed:', err);
  process.exit(1);
});
