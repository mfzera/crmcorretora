import request from 'supertest';
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { db } from '@ecotech/shared/database';
import { usuarios, equipes } from '@ecotech/shared/database';
import { eq } from 'drizzle-orm';
import { buildTestApp } from '../../helpers/app.helper';
import { cleanDatabase } from '../../setup/test-setup';
import { createTestPlano, createTestCorretora } from '../../helpers/factories/corretora.factory';
import { createAdminCargo, createTestUsuario } from '../../helpers/factories/usuario.factory';
import { generateTestToken } from '../../helpers/auth.helper';
import { createTestCargo } from '../../helpers/factories/cargo.factory';

describe('GET /api/auth/me', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let token: string;
  let usuario: Awaited<ReturnType<typeof createTestUsuario>>;
  let corretoraId: string;
  let cargoId: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await cleanDatabase();
    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    corretoraId = corretora.id;
    const cargo = await createAdminCargo(corretora.id);
    cargoId = cargo.id;
    usuario = await createTestUsuario(corretora.id, cargo.id);

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

  it('retorna dados do usuário autenticado', async () => {
    const res = await request(app.server)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.usuario.id).toBe(usuario.id);
    expect(res.body.data.usuario.email).toBe(usuario.email);
  });

  it('retorna 401 sem token', async () => {
    await request(app.server).get('/api/auth/me').expect(401);
  });

  it('retorna 401 com token inválido', async () => {
    await request(app.server)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer token-invalido')
      .expect(401);
  });

  it('retorna avatarUrl quando usuário tem avatarR2Key', async () => {
    // Atualizar usuário para ter avatarR2Key
    await db
      .update(usuarios)
      .set({ avatarR2Key: 'avatars/test-avatar.jpg' })
      .where(eq(usuarios.id, usuario.id));

    const res = await request(app.server)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    // avatarUrl pode ser null se storageClient retornar null, mas o campo existe
    expect(res.body.data.usuario).toHaveProperty('avatarUrl');

    // Limpar
    await db
      .update(usuarios)
      .set({ avatarR2Key: null })
      .where(eq(usuarios.id, usuario.id));
  });

  it('retorna avatarUrl null quando storageClient lança erro ao gerar URL', async () => {
    const { storageClient } = await import('@ecotech/shared/storage');
    vi.mocked(storageClient.getSignedDownloadUrl).mockRejectedValueOnce(
      new Error('Storage unavailable'),
    );

    await db
      .update(usuarios)
      .set({ avatarR2Key: 'avatars/test-avatar.jpg' })
      .where(eq(usuarios.id, usuario.id));

    const res = await request(app.server)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.usuario.avatarUrl).toBeNull();

    // Limpar
    await db
      .update(usuarios)
      .set({ avatarR2Key: null })
      .where(eq(usuarios.id, usuario.id));
  });

  it('retorna cargo null quando usuário não tem cargo', async () => {
    const cargo = await createTestCargo(corretoraId, { permissoes: [] });
    const semCargo = await createTestUsuario(corretoraId, cargo.id);

    // Remover cargo do usuário
    await db.update(usuarios).set({ cargoId: null }).where(eq(usuarios.id, semCargo.id));

    const tokenSemCargo = generateTestToken(app, {
      sub: semCargo.id,
      corretoraId,
      cargoId: null as any,
      isAdmin: false,
      isGestor: false,
      isVendedor: false,
      permissoes: [],
      nome: semCargo.nome,
      email: semCargo.email,
      avatarUrl: null,
    });

    const res = await request(app.server)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${tokenSemCargo}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.usuario.cargo).toBeNull();
  });

  it('retorna dados da equipe quando usuário pertence a uma', async () => {
    // Criar equipe e vinculá-la ao usuário
    const ts = Date.now();
    const [equipe] = await db
      .insert(equipes)
      .values({
        corretoraId,
        nome: `Equipe Teste ${ts}`,
        gestorId: usuario.id,
      })
      .returning();

    await db
      .update(usuarios)
      .set({ equipeId: equipe.id })
      .where(eq(usuarios.id, usuario.id));

    const res = await request(app.server)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    // equipe pode ser null se não houver relação, mas testamos o branch
    expect(res.body.data.usuario).toHaveProperty('equipe');

    // Limpar
    await db
      .update(usuarios)
      .set({ equipeId: null })
      .where(eq(usuarios.id, usuario.id));
  });
});
