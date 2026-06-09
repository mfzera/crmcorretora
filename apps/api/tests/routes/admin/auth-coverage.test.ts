/**
 * Testes complementares para cobrir linhas específicas de admin/auth.ts:
 * - Linha 53-58: recaptchaToken falhou na verificação
 * - Linha 197-200: admin não encontrado no GET /me
 * - Linhas 238-286: PATCH /api/admin/auth/profile (atualizar perfil do admin)
 */
import request from 'supertest';
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { db } from '@ecotech/shared/database';
import { admins } from '@ecotech/shared/database';
import { eq } from 'drizzle-orm';
import { buildTestApp } from '../../helpers/app.helper';
import { cleanDatabase } from '../../setup/test-setup';

describe('/api/admin/auth (cobertura complementar)', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let adminToken: string;
  let adminId: string;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(async () => {
    await cleanDatabase();

    const createRes = await request(app.server)
      .post('/api/admin/auth/create-first-admin')
      .send({
        email: 'admin@ecotech.com',
        nome: 'Admin Coverage',
        senha: 'senha12345',
      });

    adminId = createRes.body.admin.id;

    const loginRes = await request(app.server)
      .post('/api/admin/auth/login')
      .send({ email: 'admin@ecotech.com', senha: 'senha12345' });

    adminToken = loginRes.body.token;
  });

  // Linha 53-58: recaptchaToken presente mas verificação falha
  it('retorna 400 quando recaptchaToken é fornecido mas falha na verificação', async () => {
    // Set RECAPTCHA_SECRET_KEY so the check is active, then mock fetch to fail
    const originalKey = process.env['RECAPTCHA_SECRET_KEY'];
    process.env['RECAPTCHA_SECRET_KEY'] = 'test-secret-key';

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => ({ success: false }),
    } as Response);

    try {
      const res = await request(app.server)
        .post('/api/admin/auth/login')
        .send({
          email: 'admin@ecotech.com',
          senha: 'senha12345',
          recaptchaToken: 'invalid-token',
        })
        .expect(400);

      expect(res.body.error).toContain('Verificação de segurança');
    } finally {
      process.env['RECAPTCHA_SECRET_KEY'] = originalKey;
      fetchSpy.mockRestore();
    }
  });

  // Linha 197-200: admin deletado do banco mas token ainda válido
  it('retorna 404 quando admin autenticado não existe mais no banco', async () => {
    // Deletar o admin diretamente do banco (simulando remoção manual)
    await db.delete(admins).where(eq(admins.id, adminId));

    const res = await request(app.server)
      .get('/api/admin/auth/me')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);

    expect(res.body.error).toContain('Admin não encontrado');
  });
});

// ── PATCH /api/admin/auth/profile (linhas 238-286) ────────────────────────────

describe('PATCH /api/admin/auth/profile (cobertura linhas 238-286)', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let adminToken: string;
  let adminId: string;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(async () => {
    await cleanDatabase();

    const createRes = await request(app.server)
      .post('/api/admin/auth/create-first-admin')
      .send({
        email: 'profiletest@ecotech.com',
        nome: 'Admin Profile',
        senha: 'senha12345',
      });

    adminId = createRes.body.admin.id;

    const loginRes = await request(app.server)
      .post('/api/admin/auth/login')
      .send({ email: 'profiletest@ecotech.com', senha: 'senha12345' });

    adminToken = loginRes.body.token;
  });

  // Linha 248-250: admin não encontrado (token válido mas admin removido do banco)
  it('retorna 404 quando admin não existe mais no banco (linha 248-250)', async () => {
    await db.delete(admins).where(eq(admins.id, adminId));

    const res = await request(app.server)
      .patch('/api/admin/auth/profile')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nome: 'Novo Nome' })
      .expect(404);

    expect(res.body.error).toContain('Admin não encontrado');
  });

  // Linha 256-258: atualiza nome
  it('atualiza o nome do admin com sucesso (linha 256-258)', async () => {
    const res = await request(app.server)
      .patch('/api/admin/auth/profile')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nome: 'Nome Atualizado' })
      .expect(200);

    expect(res.body.admin).toBeDefined();
    expect(res.body.message).toContain('sucesso');
    expect(res.body.admin.nome).toBe('Nome Atualizado');
  });

  // Linha 261-263: novaSenha fornecida mas senhaAtual ausente
  it('retorna 400 quando novaSenha é fornecida sem senhaAtual (linha 261-263)', async () => {
    const res = await request(app.server)
      .patch('/api/admin/auth/profile')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ novaSenha: 'novaSenha123' })
      .expect(400);

    expect(res.body.error).toContain('senha atual');
  });

  // Linha 265-267: senhaAtual incorreta
  it('retorna 400 quando senhaAtual está incorreta (linha 265-267)', async () => {
    const res = await request(app.server)
      .patch('/api/admin/auth/profile')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ senhaAtual: 'senhaErrada', novaSenha: 'novaSenha123' })
      .expect(400);

    expect(res.body.error).toContain('Senha atual incorreta');
  });

  // Linha 268 + 271-285: troca de senha com sucesso
  it('troca a senha com sucesso quando senhaAtual está correta (linhas 268-285)', async () => {
    const res = await request(app.server)
      .patch('/api/admin/auth/profile')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ senhaAtual: 'senha12345', novaSenha: 'novaSenha999' })
      .expect(200);

    expect(res.body.admin).toBeDefined();
    expect(res.body.message).toContain('sucesso');

    // Verificar que o login com nova senha funciona
    const loginRes = await request(app.server)
      .post('/api/admin/auth/login')
      .send({ email: 'profiletest@ecotech.com', senha: 'novaSenha999' })
      .expect(200);

    expect(loginRes.body.token).toBeDefined();
  });
});
