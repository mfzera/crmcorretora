import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
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
import { createTestCargo } from '../../helpers/factories/cargo.factory';
import {
  createTestClientePF,
} from '../../helpers/factories/cliente.factory';
import { generateTestToken } from '../../helpers/auth.helper';

describe('/api/lgpd — coverage', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let corretoraId: string;
  let adminToken: string;
  let adminId: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await cleanDatabase();

    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    corretoraId = corretora.id;

    const cargo = await createAdminCargo(corretoraId);
    const admin = await createTestUsuario(corretoraId, cargo.id);
    adminId = admin.id;

    adminToken = generateTestToken(app, {
      sub: admin.id,
      corretoraId,
      cargoId: cargo.id,
      isAdmin: true,
      isGestor: false,
      isVendedor: false,
      permissoes: ['clientes:visualizar'],
      nome: admin.nome,
      email: admin.email,
      avatarUrl: null,
    });
  });

  // ── POST /api/lgpd/consentimentos ──────────────────────────────────────────

  describe('POST /api/lgpd/consentimentos', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post('/api/lgpd/consentimentos')
        .send({ tipo: 'termos_uso', versao: '1.0', aceito: true })
        .expect(401);
    });

    it('registra consentimento com sucesso', async () => {
      const res = await request(app.server)
        .post('/api/lgpd/consentimentos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ tipo: 'termos_uso', versao: '1.0', aceito: true })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/consentimento/i);
    });

    it('registra consentimento de privacidade', async () => {
      const res = await request(app.server)
        .post('/api/lgpd/consentimentos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ tipo: 'privacidade', versao: '2.0', aceito: true })
        .expect(201);

      expect(res.body.success).toBe(true);
    });

    it('registra revogacao de cookies', async () => {
      const res = await request(app.server)
        .post('/api/lgpd/consentimentos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ tipo: 'cookies', versao: '1.0', aceito: false })
        .expect(201);

      expect(res.body.success).toBe(true);
    });

    it('retorna 400 para tipo invalido', async () => {
      await request(app.server)
        .post('/api/lgpd/consentimentos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ tipo: 'invalido', versao: '1.0', aceito: true })
        .expect(400);
    });
  });

  // ── GET /api/lgpd/meus-dados ───────────────────────────────────────────────

  describe('GET /api/lgpd/meus-dados', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .get('/api/lgpd/meus-dados')
        .expect(401);
    });

    it('retorna dados pessoais do usuario autenticado', async () => {
      const res = await request(app.server)
        .get('/api/lgpd/meus-dados')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.usuario).toBeDefined();
      expect(res.body.data.usuario.id).toBe(adminId);
      expect(res.body.data.consentimentos).toBeDefined();
      expect(res.body.data.historico_acoes).toBeDefined();
      expect(res.body.data.geradoEm).toBeDefined();
    });
  });

  // ── GET /api/lgpd/dados-cliente/:clienteId ─────────────────────────────────

  describe('GET /api/lgpd/dados-cliente/:clienteId', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .get('/api/lgpd/dados-cliente/00000000-0000-0000-0000-000000000000')
        .expect(401);
    });

    it('retorna dados do cliente com sucesso', async () => {
      const cliente = await createTestClientePF(corretoraId, adminId);

      const res = await request(app.server)
        .get(`/api/lgpd/dados-cliente/${cliente.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.cliente).toBeDefined();
      expect(res.body.data.cliente.id).toBe(cliente.id);
      expect(res.body.data.enderecos).toBeDefined();
      expect(res.body.data.contatos).toBeDefined();
    });

    it('retorna 404 para cliente inexistente', async () => {
      const res = await request(app.server)
        .get('/api/lgpd/dados-cliente/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body.success).toBe(false);
    });

    it('retorna 400 sem permissao de clientes:visualizar', async () => {
      const cargoSemPermissao = await createTestCargo(corretoraId, {
        permissoes: [],
      });
      const usuario = await createTestUsuario(corretoraId, cargoSemPermissao.id);
      const tokenSemPermissao = generateTestToken(app, {
        sub: usuario.id,
        corretoraId,
        cargoId: cargoSemPermissao.id,
        isAdmin: false,
        isGestor: false,
        isVendedor: false,
        permissoes: [],
        nome: usuario.nome,
        email: usuario.email,
        avatarUrl: null,
      });

      const cliente = await createTestClientePF(corretoraId, adminId);

      const res = await request(app.server)
        .get(`/api/lgpd/dados-cliente/${cliente.id}`)
        .set('Authorization', `Bearer ${tokenSemPermissao}`)
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });
});
