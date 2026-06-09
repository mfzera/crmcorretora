import request from 'supertest';
import { describe, it, expect, beforeAll, vi, afterEach } from 'vitest';
import { db } from '@ecotech/shared/database';
import * as sharedDatabase from '@ecotech/shared/database';
import {
  renovacoesComerciais,
  documentosVenda,
  clientes,
  produtos,
  transferenciaRenovacoes,
  transferenciaRenovacaoItens,
  solicitacoesExclusaoRenovacao,
} from '@ecotech/shared/database';
import * as XLSX from 'xlsx';
import { buildTestApp } from '../../helpers/app.helper';
import { cleanDatabase } from '../../setup/test-setup';
import {
  createTestPlano,
  createTestCorretora,
} from '../../helpers/factories/corretora.factory';
import {
  createAdminCargo,
  createTestUsuario,
} from '../../helpers/factories/usuario.factory';
import { generateTestToken } from '../../helpers/auth.helper';

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildXlsx(rows: Record<string, unknown>[]) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

let _clienteSeq = 0;
async function createTestCliente(corretoraId: string, vendedorId: string) {
  const ts = Date.now();
  const uid = ++_clienteSeq;
  const cpf = String(ts * 1000 + uid).slice(-11).padStart(11, '0');
  const [cliente] = await db
    .insert(clientes)
    .values({
      corretoraId,
      vendedorId,
      tipoPessoa: 'PF',
      nome: `Cliente Coverage ${ts}-${uid}`,
      cpf,
      email: `coverage.${ts}.${uid}@teste.com`,
      ativo: true,
    })
    .returning();
  return cliente;
}

async function createTestProduto(corretoraId: string) {
  const ts = Date.now();
  const [produto] = await db
    .insert(produtos)
    .values({
      corretoraId,
      nomeProduto: `Produto Coverage ${ts}`,
      tipoSeguro: 'AUTO',
      ativo: true,
    })
    .returning();
  return produto;
}

async function createTestDocumentoVenda(
  corretoraId: string,
  vendedorId: string,
  clienteId: string,
  produtoId: string,
) {
  const ts = Date.now();
  const [doc] = await db
    .insert(documentosVenda)
    .values({
      corretoraId,
      vendedorId,
      clienteId,
      produtoId,
      tipoDocumento: 'COTACAO_DIRETA',
      numeroDocumento: `DOC-COV-${ts}`,
      status: 'ATIVO',
      vigenciaInicio: '2025-01-01',
      vigenciaFim: '2026-01-01',
      premioLiquido: '2000',
      percentualComissao: '12',
      valorComissao: '240',
    })
    .returning();
  return doc;
}

async function createTestRenovacao(
  corretoraId: string,
  vendedorId: string,
  clienteId: string,
  overrides: Record<string, unknown> = {},
) {
  const [renovacao] = await db
    .insert(renovacoesComerciais)
    .values({
      corretoraId,
      vendedorId,
      clienteId,
      dataVencimento: '2026-12-31',
      status: 'NAO_TRABALHADO',
      ...overrides,
    })
    .returning();
  return renovacao;
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('/api/renovacoes coverage', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let corretoraId: string;
  let usuarioId: string;
  let cargoId: string;
  let adminToken: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await cleanDatabase();
    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    corretoraId = corretora.id;
    const cargo = await createAdminCargo(corretoraId);
    cargoId = cargo.id;
    const usuario = await createTestUsuario(corretoraId, cargo.id);
    usuarioId = usuario.id;

    adminToken = generateTestToken(app, {
      sub: usuarioId,
      corretoraId,
      cargoId,
      isAdmin: true,
      isGestor: false,
      isVendedor: true,
      permissoes: [],
      nome: usuario.nome,
      email: usuario.email,
      avatarUrl: null,
    });
  });

  // ── POST /importar — branches de data inválida (linhas 1022-1040) ──────────

  describe('POST /api/renovacoes/importar - data inválida', () => {
    it('registra erro para data em formato DD/MM com menos de 3 partes (linha 1022-1023)', async () => {
      const ts = Date.now();
      const cpf = String(ts + 1).slice(-11).padStart(11, '0');
      await db.insert(clientes).values({
        corretoraId,
        vendedorId: usuarioId,
        tipoPessoa: 'PF',
        nome: `Cliente DataParts ${ts}`,
        cpf,
        email: `dataparts.${ts}@teste.com`,
        ativo: true,
      });

      // "31/12" tem apenas 2 partes → cai no else → throw 'Formato de data inválido'
      const buffer = buildXlsx([
        {
          'CLIENTE': `Cliente DataParts ${ts}`,
          'DOCUMENTO DO CLIENTE': cpf,
          'VIGÊNCIA FINAL': '31/12',
          'ITEM': 'Seguro Inválido',
        },
      ]);

      const res = await request(app.server)
        .post('/api/renovacoes/importar')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('vendedorId', usuarioId)
        .attach('file', buffer, 'renovacoes.xlsx')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.erros).toBe(1);
      expect(res.body.data.detalhes[0].status).toBe('erro');
      expect(res.body.data.detalhes[0].mensagem).toContain('Vigência final inválida');
    });

    it('registra erro para data em formato não reconhecido (linha 1028-1040)', async () => {
      const ts = Date.now();
      const cpf = String(ts + 2).slice(-11).padStart(11, '0');
      await db.insert(clientes).values({
        corretoraId,
        vendedorId: usuarioId,
        tipoPessoa: 'PF',
        nome: `Cliente DataFmt2 ${ts}`,
        cpf,
        email: `datafmt2.${ts}@teste.com`,
        ativo: true,
      });

      // "dezembro2026" não tem "/" nem "-" e não é numérico → throw 'Formato não reconhecido'
      const buffer = buildXlsx([
        {
          'CLIENTE': `Cliente DataFmt2 ${ts}`,
          'DOCUMENTO DO CLIENTE': cpf,
          'VIGÊNCIA FINAL': 'dezembro2026',
          'ITEM': 'Seguro Formato',
        },
      ]);

      const res = await request(app.server)
        .post('/api/renovacoes/importar')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('vendedorId', usuarioId)
        .attach('file', buffer, 'renovacoes.xlsx')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.erros).toBe(1);
      expect(res.body.data.detalhes[0].status).toBe('erro');
    });
  });

  // ── POST /importar — prêmio/comissão do documento existente (1105-1121) ────

  describe('POST /api/renovacoes/importar - prêmio e comissão do documento', () => {
    it('usa premioLiquido e comissao do documentoVenda quando planilha não tem (linhas 1105-1121)', async () => {
      const ts = Date.now();
      const cpf = String(ts + 10).slice(-11).padStart(11, '0');
      const produto = await createTestProduto(corretoraId);
      const cliente = await db
        .insert(clientes)
        .values({
          corretoraId,
          vendedorId: usuarioId,
          tipoPessoa: 'PF',
          nome: `Cliente DocVenda ${ts}`,
          cpf,
          email: `docvenda.${ts}@teste.com`,
          ativo: true,
        })
        .returning()
        .then((r) => r[0]);

      // Criar documento de venda anterior com prêmio/comissão
      await createTestDocumentoVenda(corretoraId, usuarioId, cliente.id, produto.id);

      // ITEM deve fazer fuzzy-match com o nomeProduto criado ('Produto Coverage ${ts}').
      // A data deve ser ≤60 dias para cair no path de renovação (não documento ativo).
      const buffer = buildXlsx([
        {
          'CLIENTE': `Cliente DocVenda ${ts}`,
          'DOCUMENTO DO CLIENTE': cpf,
          'VIGÊNCIA FINAL': '2026-05-30',
          'ITEM': 'Produto Coverage',
        },
      ]);

      const res = await request(app.server)
        .post('/api/renovacoes/importar')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('vendedorId', usuarioId)
        .attach('file', buffer, 'renovacoes.xlsx')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.sucesso).toBe(1);
      expect(res.body.data.detalhes[0].status).toBe('sucesso');
      expect(res.body.data.detalhes[0].mensagem).toContain('vinculada ao documento anterior');
    });

    it('cria renovação sem documento anterior (linha 1146)', async () => {
      const ts = Date.now();
      const cpf = String(ts + 20).slice(-11).padStart(11, '0');
      // Cria produto para que o fuzzy-match funcione (nomeProduto 'Produto Coverage ${ts}')
      await createTestProduto(corretoraId);
      await db.insert(clientes).values({
        corretoraId,
        vendedorId: usuarioId,
        tipoPessoa: 'PF',
        nome: `Cliente SemDoc ${ts}`,
        cpf,
        email: `semdoc.${ts}@teste.com`,
        ativo: true,
      });

      // Cliente sem documento de venda. ITEM fuzzy-match com 'Produto Coverage'.
      // Data ≤60 dias para cair no path de renovação.
      const buffer = buildXlsx([
        {
          'CLIENTE': `Cliente SemDoc ${ts}`,
          'DOCUMENTO DO CLIENTE': cpf,
          'VIGÊNCIA FINAL': '2026-05-15',
          'ITEM': 'Produto Coverage',
        },
      ]);

      const res = await request(app.server)
        .post('/api/renovacoes/importar')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('vendedorId', usuarioId)
        .attach('file', buffer, 'renovacoes.xlsx')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.sucesso).toBe(1);
      // Quando produto é encontrado e não há documentoVenda real, a rota cria um
      // documento anterior sintético → mensagem ainda indica "vinculada ao documento anterior"
      expect(res.body.data.detalhes[0].mensagem).toContain('vinculada ao documento anterior');
    });
  });

  // ── POST /importar — catch genérico do loop (linhas 1152-1160) ──────────────

  describe('POST /api/renovacoes/importar - catch genérico do loop', () => {
    afterEach(() => vi.restoreAllMocks());

    it('cria renovação com aviso quando produto não encontrado (linha 1152-1160)', async () => {
      // O import route usa tx.insert (dentro de transaction) para inserir renovacoesComerciais,
      // portanto vi.spyOn(db, 'insert') não interceptaria esse caminho.
      // O teste cobre o path de produto-não-encontrado → renovação criada com _aviso.
      const ts = Date.now();
      const cpf = String(ts + 99).slice(-11).padStart(11, '0');
      await db.insert(clientes).values({
        corretoraId,
        vendedorId: usuarioId,
        tipoPessoa: 'PF',
        nome: `Cliente DbFail ${ts}`,
        cpf,
        email: `dbfail.${ts}@teste.com`,
        ativo: true,
      });

      const buffer = buildXlsx([
        {
          'CLIENTE': `Cliente DbFail ${ts}`,
          'DOCUMENTO DO CLIENTE': cpf,
          'VIGÊNCIA FINAL': '2027-09-30',
          'ITEM': 'Produto Inexistente XYZ',
        },
      ]);

      const res = await request(app.server)
        .post('/api/renovacoes/importar')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('vendedorId', usuarioId)
        .attach('file', buffer, 'renovacoes.xlsx')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.sucesso).toBe(1);
      expect(res.body.data.detalhes[0].status).toBe('sucesso');
      expect(res.body.data.detalhes[0].mensagem).toContain('não encontrado');
    });
  });

  // ── POST /transferir — renovações parcialmente pertencentes (linha 1249-1250) ─

  describe('POST /api/renovacoes/transferir - validações extras', () => {
    afterEach(() => vi.restoreAllMocks());

    it('retorna 404 quando usuario destinatario nao existe na tabela usuarios (linha 1229-1230)', async () => {
      const destinatario = await createTestUsuario(corretoraId, cargoId);
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const renovacao = await createTestRenovacao(corretoraId, usuarioId, cliente.id);

      // A autenticação chama findFirst uma vez (para o usuário logado),
      // depois o handler chama uma segunda vez (para o destinatário).
      // Deixamos a primeira passar e mockamos a segunda para retornar undefined.
      const original = db.query.usuarios.findFirst.bind(db.query.usuarios);
      let callCount = 0;
      vi.spyOn(db.query.usuarios, 'findFirst').mockImplementation((args: any) => {
        callCount++;
        if (callCount >= 2) {
          return Promise.resolve(undefined) as any;
        }
        return original(args);
      });

      await request(app.server)
        .post('/api/renovacoes/transferir')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          renovacaoIds: [renovacao.id],
          novoVendedorId: destinatario.id,
        })
        .expect(404);
    });

    it('retorna 400 quando algumas renovacoes nao pertencem ao vendedor (linha 1249-1250)', async () => {
      const destinatario = await createTestUsuario(corretoraId, cargoId);
      const outroVendedor = await createTestUsuario(corretoraId, cargoId);
      const clienteOwn = await createTestCliente(corretoraId, usuarioId);
      const clienteOther = await createTestCliente(corretoraId, outroVendedor.id);

      const renovacaoOwn = await createTestRenovacao(corretoraId, usuarioId, clienteOwn.id);
      const renovacaoOther = await createTestRenovacao(corretoraId, outroVendedor.id, clienteOther.id);

      // Envia as duas — a do outro vendedor está na query by corretoraId+vendedorAtualId
      // logo renovacoes.length (1) !== renovacaoIds.length (2) → ValidationError
      await request(app.server)
        .post('/api/renovacoes/transferir')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          renovacaoIds: [renovacaoOwn.id, renovacaoOther.id],
          novoVendedorId: destinatario.id,
        })
        .expect(400);
    });
  });

  // ── GET /transferencias/pendentes — com itens (linhas 1354-1378) ──────────

  describe('GET /api/renovacoes/transferencias/pendentes - com itens', () => {
    it('retorna transferencias pendentes com dados de renovacao (linhas 1354-1378)', async () => {
      const destinatario = await createTestUsuario(corretoraId, cargoId);
      const destinatarioToken = generateTestToken(app, {
        sub: destinatario.id,
        corretoraId,
        cargoId,
        isAdmin: true,
        isGestor: false,
        isVendedor: true,
        permissoes: [],
        nome: destinatario.nome,
        email: destinatario.email,
        avatarUrl: null,
      });

      const cliente = await createTestCliente(corretoraId, usuarioId);
      const renovacao = await createTestRenovacao(corretoraId, usuarioId, cliente.id);

      const [transferencia] = await db
        .insert(transferenciaRenovacoes)
        .values({
          corretoraId,
          solicitanteId: usuarioId,
          destinatarioId: destinatario.id,
          status: 'PENDENTE',
        })
        .returning();

      await db.insert(transferenciaRenovacaoItens).values({
        transferenciaId: transferencia.id,
        renovacaoId: renovacao.id,
      });

      const res = await request(app.server)
        .get('/api/renovacoes/transferencias/pendentes')
        .set('Authorization', `Bearer ${destinatarioToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      // Verifica que os itens têm dados de renovação populados
      const t = res.body.data.find((x: any) => x.id === transferencia.id);
      expect(t).toBeDefined();
      expect(t.itens).toHaveLength(1);
      expect(t.itens[0].renovacao).toBeDefined();
      expect(t.itens[0].renovacao.id).toBe(renovacao.id);
    });

    it('retorna lista vazia quando nao ha transferencias pendentes', async () => {
      const res = await request(app.server)
        .get('/api/renovacoes/transferencias/pendentes')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ── Transferência de renovações (linhas 1299-1302, 1468, 1541) ───────────

  describe('POST /api/renovacoes/transferir - transferência sem notificação', () => {
    afterEach(() => vi.restoreAllMocks());

    it('cria transferencia com sucesso (sem notificação)', async () => {

      const destinatario = await createTestUsuario(corretoraId, cargoId);
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const renovacao = await createTestRenovacao(corretoraId, usuarioId, cliente.id);

      const res = await request(app.server)
        .post('/api/renovacoes/transferir')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          renovacaoIds: [renovacao.id],
          novoVendedorId: destinatario.id,
          observacoes: 'Teste catch notificação',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.transferenciaId).toBeDefined();
    });
  });

  describe('POST /api/renovacoes/transferencias/:id/aceitar - aceitar transferência', () => {
    afterEach(() => vi.restoreAllMocks());

    it('aceita transferencia com sucesso (sem notificação)', async () => {

      const destinatario = await createTestUsuario(corretoraId, cargoId);
      const destinatarioToken = generateTestToken(app, {
        sub: destinatario.id,
        corretoraId,
        cargoId,
        isAdmin: true,
        isGestor: false,
        isVendedor: true,
        permissoes: [],
        nome: destinatario.nome,
        email: destinatario.email,
        avatarUrl: null,
      });

      const cliente = await createTestCliente(corretoraId, usuarioId);
      const renovacao = await createTestRenovacao(corretoraId, usuarioId, cliente.id);

      const [transferencia] = await db
        .insert(transferenciaRenovacoes)
        .values({
          corretoraId,
          solicitanteId: usuarioId,
          destinatarioId: destinatario.id,
          status: 'PENDENTE',
        })
        .returning();

      await db.insert(transferenciaRenovacaoItens).values({
        transferenciaId: transferencia.id,
        renovacaoId: renovacao.id,
      });

      const res = await request(app.server)
        .post(`/api/renovacoes/transferencias/${transferencia.id}/aceitar`)
        .set('Authorization', `Bearer ${destinatarioToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/renovacoes/transferencias/:id/recusar - recusar transferência', () => {
    afterEach(() => vi.restoreAllMocks());

    it('recusa transferencia com sucesso (sem notificação)', async () => {

      const destinatario = await createTestUsuario(corretoraId, cargoId);
      const destinatarioToken = generateTestToken(app, {
        sub: destinatario.id,
        corretoraId,
        cargoId,
        isAdmin: true,
        isGestor: false,
        isVendedor: true,
        permissoes: [],
        nome: destinatario.nome,
        email: destinatario.email,
        avatarUrl: null,
      });

      const cliente = await createTestCliente(corretoraId, usuarioId);
      const renovacao = await createTestRenovacao(corretoraId, usuarioId, cliente.id);

      const [transferencia] = await db
        .insert(transferenciaRenovacoes)
        .values({
          corretoraId,
          solicitanteId: usuarioId,
          destinatarioId: destinatario.id,
          status: 'PENDENTE',
        })
        .returning();

      await db.insert(transferenciaRenovacaoItens).values({
        transferenciaId: transferencia.id,
        renovacaoId: renovacao.id,
      });

      const res = await request(app.server)
        .post(`/api/renovacoes/transferencias/${transferencia.id}/recusar`)
        .set('Authorization', `Bearer ${destinatarioToken}`)
        .send({ motivo: 'Motivo teste' })
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });

  // ── POST /importar — validações de entrada (linhas 810-821) ─────────────────

  describe('POST /api/renovacoes/importar - validações básicas de entrada', () => {
    it('retorna erro quando nenhum arquivo é enviado (linha 811-813)', async () => {
      // Enviar multipart sem arquivo — request.file() retorna null
      const res = await request(app.server)
        .post('/api/renovacoes/importar')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('placeholder', 'value')
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('retorna erro quando vendedorId não é informado no FormData (linha 819-821)', async () => {
      const buffer = buildXlsx([
        {
          'CLIENTE': 'Teste',
          'DOCUMENTO DO CLIENTE': '12345678901',
          'VIGÊNCIA FINAL': '2027-01-01',
          'ITEM': 'Seguro',
        },
      ]);

      // Envia arquivo mas sem o campo vendedorId
      const res = await request(app.server)
        .post('/api/renovacoes/importar')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', buffer, 'renovacoes.xlsx')
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  // ── Solicitações de exclusão (linhas 1595-1825) ────────────────────────────

  describe('/api/renovacoes — solicitações de exclusão', () => {
    it('solicita exclusão de renovação → 201', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const renovacao = await createTestRenovacao(corretoraId, usuarioId, cliente.id, {
        status: 'NAO_TRABALHADO',
      });

      const res = await request(app.server)
        .post(`/api/renovacoes/${renovacao.id}/solicitar-exclusao`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ motivo: 'Motivo de teste para exclusão' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.renovacaoId).toBe(renovacao.id);
      expect(res.body.data.status).toBe('PENDENTE');
    });

    it('retorna erro para renovação com status RENOVADO (linha 1636-1640)', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const renovacao = await createTestRenovacao(corretoraId, usuarioId, cliente.id, {
        status: 'RENOVADO',
      });

      const res = await request(app.server)
        .post(`/api/renovacoes/${renovacao.id}/solicitar-exclusao`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ motivo: 'Tentativa de exclusão de renovada' })
        .expect(422);

      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('finalizadas');
    });

    it('retorna erro ao solicitar exclusão duplicada (linha 1651-1655)', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const renovacao = await createTestRenovacao(corretoraId, usuarioId, cliente.id, {
        status: 'NAO_TRABALHADO',
      });

      // Inserir solicitação pendente diretamente no banco
      await db.insert(solicitacoesExclusaoRenovacao).values({
        corretoraId,
        renovacaoId: renovacao.id,
        solicitanteId: usuarioId,
        motivo: 'Primeira solicitação',
        status: 'PENDENTE',
      });

      const res = await request(app.server)
        .post(`/api/renovacoes/${renovacao.id}/solicitar-exclusao`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ motivo: 'Segunda solicitação duplicada' })
        .expect(422);

      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('pendente');
    });

    it('lista solicitações pendentes → 200', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const renovacao = await createTestRenovacao(corretoraId, usuarioId, cliente.id, {
        status: 'NAO_TRABALHADO',
      });

      await db.insert(solicitacoesExclusaoRenovacao).values({
        corretoraId,
        renovacaoId: renovacao.id,
        solicitanteId: usuarioId,
        motivo: 'Listar pendentes',
        status: 'PENDENTE',
      });

      const res = await request(app.server)
        .get('/api/renovacoes/solicitacoes-exclusao/pendentes')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      const entry = res.body.data.find((s: any) => s.renovacaoId === renovacao.id);
      expect(entry).toBeDefined();
      expect(entry.status).toBe('PENDENTE');
    });

    it('aceita solicitação de exclusão → 200', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const renovacao = await createTestRenovacao(corretoraId, usuarioId, cliente.id, {
        status: 'NAO_TRABALHADO',
      });

      const [solicitacao] = await db
        .insert(solicitacoesExclusaoRenovacao)
        .values({
          corretoraId,
          renovacaoId: renovacao.id,
          solicitanteId: usuarioId,
          motivo: 'Aceitar exclusão',
          status: 'PENDENTE',
        })
        .returning();

      const res = await request(app.server)
        .post(`/api/renovacoes/solicitacoes-exclusao/${solicitacao.id}/aceitar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toContain('excluída');
    });

    it('retorna erro ao aceitar solicitação já respondida (linha 1743-1747)', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const renovacao = await createTestRenovacao(corretoraId, usuarioId, cliente.id, {
        status: 'NAO_TRABALHADO',
      });

      const [solicitacao] = await db
        .insert(solicitacoesExclusaoRenovacao)
        .values({
          corretoraId,
          renovacaoId: renovacao.id,
          solicitanteId: usuarioId,
          motivo: 'Já respondida',
          status: 'ACEITA',
        })
        .returning();

      const res = await request(app.server)
        .post(`/api/renovacoes/solicitacoes-exclusao/${solicitacao.id}/aceitar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(422);

      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('respondida');
    });

    it('recusa solicitação de exclusão com motivo → 200', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const renovacao = await createTestRenovacao(corretoraId, usuarioId, cliente.id, {
        status: 'NAO_TRABALHADO',
      });

      const [solicitacao] = await db
        .insert(solicitacoesExclusaoRenovacao)
        .values({
          corretoraId,
          renovacaoId: renovacao.id,
          solicitanteId: usuarioId,
          motivo: 'Recusar exclusão',
          status: 'PENDENTE',
        })
        .returning();

      const res = await request(app.server)
        .post(`/api/renovacoes/solicitacoes-exclusao/${solicitacao.id}/recusar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ motivoRecusa: 'Não há justificativa válida' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toContain('recusada');
    });

    it('permite nova solicitação após recusa → 201', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const renovacao = await createTestRenovacao(corretoraId, usuarioId, cliente.id, {
        status: 'NAO_TRABALHADO',
      });

      // Inserir solicitação já recusada
      await db.insert(solicitacoesExclusaoRenovacao).values({
        corretoraId,
        renovacaoId: renovacao.id,
        solicitanteId: usuarioId,
        motivo: 'Primeira solicitação',
        status: 'RECUSADA',
      });

      // Nova solicitação deve ser permitida após recusa
      const res = await request(app.server)
        .post(`/api/renovacoes/${renovacao.id}/solicitar-exclusao`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ motivo: 'Segunda solicitação após recusa' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('PENDENTE');
    });

    it('retorna erro ao recusar solicitação já respondida (linha 1806-1810)', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const renovacao = await createTestRenovacao(corretoraId, usuarioId, cliente.id, {
        status: 'NAO_TRABALHADO',
      });

      const [solicitacao] = await db
        .insert(solicitacoesExclusaoRenovacao)
        .values({
          corretoraId,
          renovacaoId: renovacao.id,
          solicitanteId: usuarioId,
          motivo: 'Já recusada anteriormente',
          status: 'RECUSADA',
        })
        .returning();

      const res = await request(app.server)
        .post(`/api/renovacoes/solicitacoes-exclusao/${solicitacao.id}/recusar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ motivoRecusa: 'Motivo de recusa duplicada' })
        .expect(422);

      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('respondida');
    });
  });
});
