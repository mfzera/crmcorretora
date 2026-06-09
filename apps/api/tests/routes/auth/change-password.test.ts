import request from 'supertest';
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { db } from '@ecotech/shared/database';
import { usuarios } from '@ecotech/shared/database';
import { eq } from 'drizzle-orm';
import { buildTestApp } from '../../helpers/app.helper';
import { cleanDatabase } from '../../setup/test-setup';
import { createTestPlano, createTestCorretora } from '../../helpers/factories/corretora.factory';
import { createAdminCargo, createTestUsuario, TEST_PASSWORD } from '../../helpers/factories/usuario.factory';
import { generateTestToken } from '../../helpers/auth.helper';

describe('POST /api/auth/change-password', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let token: string;
  let usuarioId: string;
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
    const usuario = await createTestUsuario(corretoraId, cargo.id);
    usuarioId = usuario.id;

    token = generateTestToken(app, {
      sub: usuarioId,
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
  });

  it('altera senha com credenciais válidas', async () => {
    const res = await request(app.server)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ senhaAtual: TEST_PASSWORD, novaSenha: 'NovaSenha@456' })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('retorna 400 com senha atual incorreta', async () => {
    await request(app.server)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ senhaAtual: 'SenhaErrada@123', novaSenha: 'NovaSenha@456' })
      .expect(400);
  });

  it('retorna 401 sem token', async () => {
    await request(app.server)
      .post('/api/auth/change-password')
      .send({ senhaAtual: TEST_PASSWORD, novaSenha: 'NovaSenha@456' })
      .expect(401);
  });

  it('retorna 401 quando usuário não existe mais no banco', async () => {
    // The authenticate preHandler calls db.query.usuarios.findFirst twice:
    //   call #1: verify user exists + is active
    //   call #2: loadUserRuntimeData (loads nome)
    // The route handler calls it again (call #3). We intercept call #3 so the
    // route's "if (!usuario)" branch is hit while auth still succeeds.
    const originalFindFirst = db.query.usuarios.findFirst.bind(db.query.usuarios);
    let callCount = 0;
    const findFirstSpy = vi
      .spyOn(db.query.usuarios, 'findFirst')
      .mockImplementation((...args: any[]) => {
        callCount++;
        if (callCount === 3) {
          return Promise.resolve(undefined) as any;
        }
        return originalFindFirst(...args);
      });

    const res = await request(app.server)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ senhaAtual: TEST_PASSWORD, novaSenha: 'NovaSenha@456' })
      .expect(401);

    expect(res.body.success).toBe(false);
    findFirstSpy.mockRestore();
  });
});

describe('POST /api/auth/refresh', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let adminEmail: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await cleanDatabase();
    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    const cargo = await createAdminCargo(corretora.id);
    const usuario = await createTestUsuario(corretora.id, cargo.id);
    adminEmail = usuario.email;
  });

  it('renova token com refresh token válido', async () => {
    const loginRes = await request(app.server)
      .post('/api/auth/login')
      .send({ email: adminEmail, password: TEST_PASSWORD })
      .expect(200);

    const { refreshToken } = loginRes.body.data;

    const res = await request(app.server)
      .post('/api/auth/refresh')
      .send({ refreshToken })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
  });

  it('retorna 401 com refresh token inválido', async () => {
    await request(app.server)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'token-invalido' })
      .expect(401);
  });
});

describe('POST /api/auth/logout', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let token: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await cleanDatabase();
    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    const cargo = await createAdminCargo(corretora.id);
    const usuario = await createTestUsuario(corretora.id, cargo.id);

    token = generateTestToken(app, {
      sub: usuario.id,
      corretoraId: corretora.id,
      cargoId: cargo.id,
      isAdmin: true,
      isGestor: false,
      isVendedor: false,
      permissoes: [],
      nome: usuario.nome,
      email: usuario.email,
      avatarUrl: null,
    });
  });

  it('retorna sucesso com token válido', async () => {
    const res = await request(app.server)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('retorna 401 sem token', async () => {
    await request(app.server)
      .post('/api/auth/logout')
      .expect(401);
  });
});

describe('POST /api/auth/request-password-reset', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let adminEmail: string;
  let inativoEmail: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await cleanDatabase();
    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    const cargo = await createAdminCargo(corretora.id);
    const usuario = await createTestUsuario(corretora.id, cargo.id);
    adminEmail = usuario.email;
    const inativo = await createTestUsuario(corretora.id, cargo.id, { ativo: false });
    inativoEmail = inativo.email;
  });

  it('retorna 200 para email existente (sem revelar existência)', async () => {
    const res = await request(app.server)
      .post('/api/auth/request-password-reset')
      .send({ email: adminEmail })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('retorna 200 para email inexistente (sem revelar existência)', async () => {
    const res = await request(app.server)
      .post('/api/auth/request-password-reset')
      .send({ email: 'ninguem@naoexiste.com' })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('retorna 200 para usuário inativo (sem revelar existência)', async () => {
    const res = await request(app.server)
      .post('/api/auth/request-password-reset')
      .send({ email: inativoEmail })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('retorna 200 mesmo quando envio de email falha (erro silenciado)', async () => {
    const { emailService } = await import('@ecotech/shared/utils/email.service');
    vi.mocked(emailService.sendPasswordResetEmail).mockRejectedValueOnce(
      new Error('SMTP connection refused'),
    );

    const res = await request(app.server)
      .post('/api/auth/request-password-reset')
      .send({ email: adminEmail })
      .expect(200);

    expect(res.body.success).toBe(true);
  });
});

describe('POST /api/auth/reset-password', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let adminEmail: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await cleanDatabase();
    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    const cargo = await createAdminCargo(corretora.id);
    const usuario = await createTestUsuario(corretora.id, cargo.id);
    adminEmail = usuario.email;
  });

  it('retorna 400 para token inválido', async () => {
    const res = await request(app.server)
      .post('/api/auth/reset-password')
      .send({ token: 'token-invalido-qualquer', novaSenha: 'NovaSenha@789' })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('redefine senha com token válido', async () => {
    // Solicitar reset para obter token
    await request(app.server)
      .post('/api/auth/request-password-reset')
      .send({ email: adminEmail })
      .expect(200);

    // Buscar token no banco diretamente
    const { db } = await import('@ecotech/shared/database');
    const { passwordResetTokens } = await import('@ecotech/shared/database');
    const [tokenRecord] = await db.select().from(passwordResetTokens).limit(1);

    expect(tokenRecord).toBeDefined();

    const res = await request(app.server)
      .post('/api/auth/reset-password')
      .send({ token: tokenRecord.token, novaSenha: 'NovaSenha@789' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.message).toBeDefined();
  });

  it('retorna 400 para token expirado', async () => {
    const { db } = await import('@ecotech/shared/database');
    const { passwordResetTokens, usuarios } = await import('@ecotech/shared/database');
    const { eq } = await import('drizzle-orm');

    const [usuario] = await db.select().from(usuarios).limit(1);

    // Inserir token já expirado
    const expiredToken = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    await db.insert(passwordResetTokens).values({
      usuarioId: usuario.id,
      token: expiredToken,
      expiresAt: new Date(Date.now() - 1000), // expirado
    });

    const res = await request(app.server)
      .post('/api/auth/reset-password')
      .send({ token: expiredToken, novaSenha: 'NovaSenha@789' })
      .expect(400);

    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/auth/refresh - casos adicionais', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let adminEmail: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await cleanDatabase();
    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    const cargo = await createAdminCargo(corretora.id);
    const usuario = await createTestUsuario(corretora.id, cargo.id);
    adminEmail = usuario.email;
  });

  it('retorna 401 com token de acesso normal (tipo errado)', async () => {
    // Login para obter token de acesso (não refresh)
    const loginRes = await request(app.server)
      .post('/api/auth/login')
      .send({ email: adminEmail, password: TEST_PASSWORD })
      .expect(200);

    const accessToken = loginRes.body.data.token;

    // Tentar usar token de acesso como refresh token
    const res = await request(app.server)
      .post('/api/auth/refresh')
      .send({ refreshToken: accessToken })
      .expect(401);

    expect(res.body.success).toBe(false);
  });

  it('retorna 401 quando usuário está inativo durante refresh', async () => {
    // Login para obter refresh token válido
    const loginRes = await request(app.server)
      .post('/api/auth/login')
      .send({ email: adminEmail, password: TEST_PASSWORD })
      .expect(200);

    const { refreshToken } = loginRes.body.data;
    const usuarioId = loginRes.body.data.usuario.id;

    // Desativar o usuário
    await db
      .update(usuarios)
      .set({ ativo: false })
      .where(eq(usuarios.id, usuarioId));

    const res = await request(app.server)
      .post('/api/auth/refresh')
      .send({ refreshToken })
      .expect(401);

    expect(res.body.success).toBe(false);

    // Reativar o usuário
    await db
      .update(usuarios)
      .set({ ativo: true })
      .where(eq(usuarios.id, usuarioId));
  });
});
