import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '@ecotech/shared/database';
import {
  documentosVenda,
  produtos,
  documentosApolice,
  clientes,
} from '@ecotech/shared/database';
import { eq } from 'drizzle-orm';
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
import {
  createTestClientePF,
  createTestClientePJ,
} from '../../helpers/factories/cliente.factory';

async function createTestProduto(corretoraId: string) {
  const ts = Date.now();
  const [produto] = await db
    .insert(produtos)
    .values({
      corretoraId,
      nomeProduto: `Produto Teste ${ts}`,
      tipoSeguro: 'AUTO',
      ativo: true,
    })
    .returning();
  return produto;
}

describe('/api/portal — coverage', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let corretoraId: string;
  let subdominio: string;
  let clienteId: string;
  let adminId: string;
  let produtoId: string;
  let portalToken: string;
  let apoliceId: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await cleanDatabase();

    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    corretoraId = corretora.id;
    subdominio = corretora.subdominio;

    const cargo = await createAdminCargo(corretoraId);
    const admin = await createTestUsuario(corretoraId, cargo.id);
    adminId = admin.id;

    const produto = await createTestProduto(corretoraId);
    produtoId = produto.id;

    const cliente = await createTestClientePF(corretoraId, adminId, {
      dataNascimento: '1990-05-15',
      cpf: '12345678901',
    });
    clienteId = cliente.id;

    // Criar documento de venda ativo (apolice)
    const [doc] = await db
      .insert(documentosVenda)
      .values({
        corretoraId,
        clienteId: cliente.id,
        vendedorId: adminId,
        produtoId: produto.id,
        numeroDocumento: `DOC-PORTAL-${Date.now()}`,
        tipoDocumento: 'VENDA_EXPRESSA',
        status: 'ATIVO',
        vigenciaInicio: '2025-01-01',
        vigenciaFim: '2026-12-31',
      })
      .returning();
    apoliceId = doc.id;

    // Login do portal para obter token
    const loginRes = await request(app.server)
      .post('/api/portal/auth/login')
      .send({
        subdominio,
        documento: '12345678901',
        dataNascimento: '1990-05-15',
      });

    portalToken = loginRes.body.data?.token;
  });

  // ── POST /api/portal/auth/login ───────────────────────────────────────────

  describe('POST /api/portal/auth/login', () => {
    it('login com sucesso retorna token', async () => {
      const res = await request(app.server)
        .post('/api/portal/auth/login')
        .send({
          subdominio,
          documento: '12345678901',
          dataNascimento: '1990-05-15',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.cliente).toBeDefined();
      expect(res.body.data.corretora).toBeDefined();
    });

    it('retorna 401 sem credenciais', async () => {
      await request(app.server)
        .post('/api/portal/auth/login')
        .send({})
        .expect(401);
    });

    it('retorna 401 para subdominio inexistente', async () => {
      await request(app.server)
        .post('/api/portal/auth/login')
        .send({
          subdominio: 'naoexiste999',
          documento: '12345678901',
          dataNascimento: '1990-05-15',
        })
        .expect(401);
    });

    it('retorna 401 para documento invalido (tamanho errado)', async () => {
      await request(app.server)
        .post('/api/portal/auth/login')
        .send({
          subdominio,
          documento: '123',
          dataNascimento: '1990-05-15',
        })
        .expect(401);
    });

    it('retorna 401 para documento nao encontrado', async () => {
      await request(app.server)
        .post('/api/portal/auth/login')
        .send({
          subdominio,
          documento: '99999999999',
          dataNascimento: '1990-05-15',
        })
        .expect(401);
    });

    it('retorna 401 para data de nascimento errada', async () => {
      await request(app.server)
        .post('/api/portal/auth/login')
        .send({
          subdominio,
          documento: '12345678901',
          dataNascimento: '2000-01-01',
        })
        .expect(401);
    });

    it('login PJ com CNPJ retorna token', async () => {
      const cnpj = '12345678000199';
      const dataConstituicao = '2010-03-20';
      await createTestClientePJ(corretoraId, adminId, {
        cnpj,
        dataNascimento: dataConstituicao,
      });

      const res = await request(app.server)
        .post('/api/portal/auth/login')
        .send({
          subdominio,
          documento: cnpj,
          dataNascimento: dataConstituicao,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.cliente.tipoPessoa).toBe('PJ');
    });

    it('nome exibido usa razaoSocial quando nome é null', async () => {
      const cnpj = '98765432000188';
      const dataConstituicao = '2015-07-10';
      await createTestClientePJ(corretoraId, adminId, {
        cnpj,
        razaoSocial: 'Empresa Sem Nome Fantasia Ltda',
        nomeFantasia: null,
        dataNascimento: dataConstituicao,
      });

      const res = await request(app.server)
        .post('/api/portal/auth/login')
        .send({
          subdominio,
          documento: cnpj,
          dataNascimento: dataConstituicao,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.cliente.nome).toBe('Empresa Sem Nome Fantasia Ltda');
    });
  });

  // ── GET /api/portal/auth/me ───────────────────────────────────────────────

  describe('GET /api/portal/auth/me', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .get('/api/portal/auth/me')
        .expect(401);
    });

    it('retorna dados do segurado autenticado', async () => {
      const res = await request(app.server)
        .get('/api/portal/auth/me')
        .set('Authorization', `Bearer ${portalToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.clienteId).toBe(clienteId);
    });

    it('retorna 401 para token malformado', async () => {
      await request(app.server)
        .get('/api/portal/auth/me')
        .set('Authorization', 'Bearer not-a-valid-jwt')
        .expect(401);
    });

    it('retorna 401 para token com type errado (staff)', async () => {
      const wrongTypeToken = app.jwt.sign({ type: 'staff', clienteId: 'xxx', corretoraId: corretoraId });
      await request(app.server)
        .get('/api/portal/auth/me')
        .set('Authorization', `Bearer ${wrongTypeToken}`)
        .expect(401);
    });
  });

  // ── POST /api/portal/auth/logout ──────────────────────────────────────────

  describe('POST /api/portal/auth/logout', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post('/api/portal/auth/logout')
        .expect(401);
    });

    it('logout invalida a sessao', async () => {
      // Login fresh to get a disposable token
      const loginRes = await request(app.server)
        .post('/api/portal/auth/login')
        .send({
          subdominio,
          documento: '12345678901',
          dataNascimento: '1990-05-15',
        })
        .expect(200);

      const freshToken = loginRes.body.data.token;

      const res = await request(app.server)
        .post('/api/portal/auth/logout')
        .set('Authorization', `Bearer ${freshToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);

      // Token should be invalidated now
      await request(app.server)
        .get('/api/portal/auth/me')
        .set('Authorization', `Bearer ${freshToken}`)
        .expect(401);
    });
  });

  // ── GET /api/portal/apolices ──────────────────────────────────────────────

  describe('GET /api/portal/apolices', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .get('/api/portal/apolices')
        .expect(401);
    });

    it('retorna lista de apolices do segurado', async () => {
      const res = await request(app.server)
        .get('/api/portal/apolices')
        .set('Authorization', `Bearer ${portalToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].diasParaVencer).toBeDefined();
    });
  });

  // ── GET /api/portal/apolices/vencimentos ──────────────────────────────────

  describe('GET /api/portal/apolices/vencimentos', () => {
    it('retorna vencimentos agrupados', async () => {
      const res = await request(app.server)
        .get('/api/portal/apolices/vencimentos')
        .set('Authorization', `Bearer ${portalToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.vencidas).toBeDefined();
      expect(res.body.data.em30dias).toBeDefined();
      expect(res.body.data.em60dias).toBeDefined();
      expect(res.body.data.em90dias).toBeDefined();
    });
  });

  // ── GET /api/portal/apolices/:id ──────────────────────────────────────────

  describe('GET /api/portal/apolices/:id', () => {
    it('retorna detalhe da apolice', async () => {
      const res = await request(app.server)
        .get(`/api/portal/apolices/${apoliceId}`)
        .set('Authorization', `Bearer ${portalToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(apoliceId);
      expect(res.body.data.diasParaVencer).toBeDefined();
    });

    it('retorna success false para apolice inexistente', async () => {
      const res = await request(app.server)
        .get('/api/portal/apolices/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${portalToken}`)
        .expect(200);

      expect(res.body.success).toBe(false);
    });
  });

  // ── GET /api/portal/produtos ──────────────────────────────────────────────

  describe('GET /api/portal/produtos', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .get('/api/portal/produtos')
        .expect(401);
    });

    it('retorna catalogo de produtos', async () => {
      const res = await request(app.server)
        .get('/api/portal/produtos')
        .set('Authorization', `Bearer ${portalToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── GET /api/portal/perfil ────────────────────────────────────────────────

  describe('GET /api/portal/perfil', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .get('/api/portal/perfil')
        .expect(401);
    });

    it('retorna perfil do segurado', async () => {
      const res = await request(app.server)
        .get('/api/portal/perfil')
        .set('Authorization', `Bearer ${portalToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(clienteId);
    });

    it('retorna success false quando segurado não encontrado (cliente desativado)', async () => {
      // Criar cliente temporário para este teste
      const clienteTemp = await createTestClientePF(corretoraId, adminId, {
        cpf: '55566677788',
        dataNascimento: '1985-11-22',
      });

      // Login para obter token
      const loginRes = await request(app.server)
        .post('/api/portal/auth/login')
        .send({
          subdominio,
          documento: '55566677788',
          dataNascimento: '1985-11-22',
        })
        .expect(200);

      const tokenTemp = loginRes.body.data.token;

      // Desativar o cliente para disparar o branch not-found em /perfil
      await db.update(clientes).set({ ativo: false }).where(eq(clientes.id, clienteTemp.id));

      const res = await request(app.server)
        .get('/api/portal/perfil')
        .set('Authorization', `Bearer ${tokenTemp}`)
        .expect(401);

      // O middleware também verifica ativo, então retorna 401
      expect(res.body.success).toBe(false);

      // Restaurar
      await db.update(clientes).set({ ativo: true }).where(eq(clientes.id, clienteTemp.id));
    });
  });

  // ── PATCH /api/portal/perfil ──────────────────────────────────────────────

  describe('PATCH /api/portal/perfil', () => {
    it('atualiza email do segurado', async () => {
      const res = await request(app.server)
        .patch('/api/portal/perfil')
        .set('Authorization', `Bearer ${portalToken}`)
        .send({ email: 'novo@teste.com' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('novo@teste.com');
    });

    it('atualiza telefone e celular', async () => {
      const res = await request(app.server)
        .patch('/api/portal/perfil')
        .set('Authorization', `Bearer ${portalToken}`)
        .send({ telefone: '1133334444', celular: '11999998888' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.telefone).toBe('1133334444');
      expect(res.body.data.celular).toBe('11999998888');
    });
  });

  // ── POST /api/portal/cotacoes ─────────────────────────────────────────────

  describe('POST /api/portal/cotacoes', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post('/api/portal/cotacoes')
        .send({ produtoId })
        .expect(401);
    });

    it('solicita cotacao com sucesso', async () => {
      const res = await request(app.server)
        .post('/api/portal/cotacoes')
        .set('Authorization', `Bearer ${portalToken}`)
        .send({ produtoId, mensagem: 'Quero cotar' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
    });

    it('solicita cotacao sem produto', async () => {
      const res = await request(app.server)
        .post('/api/portal/cotacoes')
        .set('Authorization', `Bearer ${portalToken}`)
        .send({ mensagem: 'Quero cotar algo' })
        .expect(201);

      expect(res.body.success).toBe(true);
    });

    it('retorna 400 para produto inexistente', async () => {
      const res = await request(app.server)
        .post('/api/portal/cotacoes')
        .set('Authorization', `Bearer ${portalToken}`)
        .send({ produtoId: '00000000-0000-0000-0000-000000000000' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  // ── GET /api/portal/documentos/:apoliceId ─────────────────────────────────

  describe('GET /api/portal/documentos/:apoliceId', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .get(`/api/portal/documentos/${apoliceId}`)
        .expect(401);
    });

    it('retorna lista de documentos da apolice', async () => {
      await db.insert(documentosApolice).values({
        corretoraId,
        documentoVendaId: apoliceId,
        clienteId,
        nome: 'apolice.pdf',
        tipo: 'APOLICE',
        r2Key: 'docs/test/apolice.pdf',
        mimeType: 'application/pdf',
        tamanhoBytes: 1024,
      });

      const res = await request(app.server)
        .get(`/api/portal/documentos/${apoliceId}`)
        .set('Authorization', `Bearer ${portalToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('retorna 404 para apolice inexistente', async () => {
      await request(app.server)
        .get('/api/portal/documentos/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${portalToken}`)
        .expect(404);
    });
  });

  // ── GET /api/portal/documentos/:id/download ───────────────────────────────

  describe('GET /api/portal/documentos/:id/download', () => {
    it('retorna URL de download', async () => {
      const doc = await db.query.documentosApolice.findFirst({
        where: (d, { eq }) => eq(d.clienteId, clienteId),
      });

      if (doc) {
        const res = await request(app.server)
          .get(`/api/portal/documentos/${doc.id}/download`)
          .set('Authorization', `Bearer ${portalToken}`)
          .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data.nome).toBeDefined();
      }
    });

    it('retorna 404 para documento inexistente', async () => {
      await request(app.server)
        .get('/api/portal/documentos/00000000-0000-0000-0000-000000000000/download')
        .set('Authorization', `Bearer ${portalToken}`)
        .expect(404);
    });
  });
});
