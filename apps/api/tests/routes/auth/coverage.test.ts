/**
 * Testes complementares de cobertura para src/routes/auth/index.ts
 *
 * Cobre as linhas ainda não atingidas pelos outros arquivos de teste:
 *   - 303-306: recaptchaToken fornecido mas verificação falha
 *   - 425-431: catch ao gerar URL do avatar durante login (storageClient lança erro)
 *   - 529-530: catch ao gerar URL do avatar em GET /me (storageClient lança erro)
 *   - 549:     cargo null no retorno de GET /api/auth/me
 *   - 589-590: usuário não encontrado em POST /api/auth/change-password
 *   - 696-698: catch ao enviar email de reset de senha
 */
import request from 'supertest';
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { db } from '@ecotech/shared/database';
import { usuarios } from '@ecotech/shared/database';
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
  TEST_PASSWORD,
} from '../../helpers/factories/usuario.factory';
import { generateTestToken } from '../../helpers/auth.helper';

let app: Awaited<ReturnType<typeof buildTestApp>>;
let corretoraId: string;
let cargoId: string;

beforeAll(async () => {
  app = await buildTestApp();
  await cleanDatabase();
  const plano = await createTestPlano();
  const corretora = await createTestCorretora(plano.id);
  corretoraId = corretora.id;
  const cargo = await createAdminCargo(corretoraId);
  cargoId = cargo.id;
});

// ── Linha 303-306: recaptchaToken presente mas verificação falha ──────────────

describe('POST /api/auth/login — recaptcha falha', () => {
  it('retorna 400 quando recaptchaToken falha na verificação', async () => {
    const usuario = await createTestUsuario(corretoraId, cargoId);
    const originalKey = process.env['RECAPTCHA_SECRET_KEY'];
    process.env['RECAPTCHA_SECRET_KEY'] = 'test-secret-key';

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => ({ success: false }),
    } as Response);

    try {
      const res = await request(app.server)
        .post('/api/auth/login')
        .send({
          email: usuario.email,
          password: TEST_PASSWORD,
          recaptchaToken: 'token-invalido',
        })
        .expect(400);

      expect(res.body.error).toContain('Verificação de segurança');
    } finally {
      process.env['RECAPTCHA_SECRET_KEY'] = originalKey;
      fetchSpy.mockRestore();
    }
  });
});

// ── Linha 529-530: catch ao gerar URL do avatar ────────────────────────────

describe('GET /api/auth/me — avatar storage lança erro', () => {
  it('retorna dados do usuário mesmo quando storageClient lança erro ao gerar URL do avatar', async () => {
    const usuario = await createTestUsuario(corretoraId, cargoId);

    // Definir avatarR2Key para acionar o branch de geração de URL
    await db
      .update(usuarios)
      .set({ avatarR2Key: 'avatars/test.jpg' })
      .where(eq(usuarios.id, usuario.id));

    const token = generateTestToken(app, {
      sub: usuario.id,
      corretoraId,
      cargoId,
      isAdmin: true,
      isGestor: false,
      isVendedor: false,
      permissoes: [],
      nome: usuario.nome,
      email: usuario.email,
      avatarUrl: null,
    });

    // Fazer storageClient.getSignedDownloadUrl lançar erro para cobrir o catch
    const { storageClient } = await import('@ecotech/shared/storage');
    const spy = vi
      .spyOn(storageClient, 'getSignedDownloadUrl')
      .mockRejectedValueOnce(new Error('Storage indisponível'));

    try {
      const res = await request(app.server)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      // avatarUrl deve ser null quando o storage falha
      expect(res.body.data.usuario.avatarUrl).toBeNull();
    } finally {
      spy.mockRestore();
      await db
        .update(usuarios)
        .set({ avatarR2Key: null })
        .where(eq(usuarios.id, usuario.id));
    }
  });
});

// ── Linha 549: cargo null no retorno de GET /api/auth/me ──────────────────

describe('GET /api/auth/me — usuário sem cargo', () => {
  it('retorna cargo null quando cargoId é null', async () => {
    const usuario = await createTestUsuario(corretoraId, null);

    const token = generateTestToken(app, {
      sub: usuario.id,
      corretoraId,
      cargoId: null as any,
      isAdmin: false,
      isGestor: false,
      isVendedor: false,
      permissoes: [],
      nome: usuario.nome,
      email: usuario.email,
      avatarUrl: null,
    });

    const res = await request(app.server)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.usuario.cargo).toBeNull();
  });
});

// ── Linha 589-590: usuário não encontrado em change-password ─────────────

describe('POST /api/auth/change-password — usuário deletado', () => {
  it('retorna 401 quando usuário autenticado não existe mais no banco', async () => {
    const usuario = await createTestUsuario(corretoraId, cargoId);

    const token = generateTestToken(app, {
      sub: usuario.id,
      corretoraId,
      cargoId,
      isAdmin: true,
      isGestor: false,
      isVendedor: false,
      permissoes: [],
      nome: usuario.nome,
      email: usuario.email,
      avatarUrl: null,
    });

    // Deletar o usuário do banco para forçar o branch "usuário não encontrado"
    await db.delete(usuarios).where(eq(usuarios.id, usuario.id));

    const res = await request(app.server)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ senhaAtual: TEST_PASSWORD, novaSenha: 'NovaSenha@999' })
      .expect(401);

    expect(res.body.success).toBe(false);
  });
});

// ── Linhas 425-431: catch ao gerar URL do avatar durante login ────────────

describe('POST /api/auth/login — avatar storage lança erro', () => {
  it('retorna token mesmo quando storageClient lança erro ao gerar URL do avatar (linhas 425-431)', async () => {
    const usuario = await createTestUsuario(corretoraId, cargoId);

    // Definir avatarR2Key para acionar o branch de geração de URL durante login
    await db
      .update(usuarios)
      .set({ avatarR2Key: 'avatars/login-test.jpg' })
      .where(eq(usuarios.id, usuario.id));

    // Fazer storageClient.getSignedDownloadUrl lançar erro para cobrir o catch
    const { storageClient } = await import('@ecotech/shared/storage');
    const spy = vi
      .spyOn(storageClient, 'getSignedDownloadUrl')
      .mockRejectedValueOnce(new Error('Storage indisponível'));

    try {
      const res = await request(app.server)
        .post('/api/auth/login')
        .send({ email: usuario.email, password: TEST_PASSWORD })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      // avatarUrl deve ser null quando o storage falha (catch não-fatal)
      expect(res.body.data.usuario.avatarUrl).toBeNull();
    } finally {
      spy.mockRestore();
      await db
        .update(usuarios)
        .set({ avatarR2Key: null })
        .where(eq(usuarios.id, usuario.id));
    }
  });
});

// ── Linha 696-698: catch ao enviar email de reset ─────────────────────────

describe('POST /api/auth/request-password-reset — email lança erro', () => {
  it('retorna 200 mesmo quando o envio de email falha (erro silenciado)', async () => {
    const usuario = await createTestUsuario(corretoraId, cargoId);

    const { emailService } = await import('@ecotech/shared/utils/email.service');
    const spy = vi
      .spyOn(emailService, 'sendPasswordResetEmail')
      .mockRejectedValueOnce(new Error('SMTP indisponível'));

    try {
      const res = await request(app.server)
        .post('/api/auth/request-password-reset')
        .send({ email: usuario.email })
        .expect(200);

      expect(res.body.success).toBe(true);
    } finally {
      spy.mockRestore();
    }
  });
});
