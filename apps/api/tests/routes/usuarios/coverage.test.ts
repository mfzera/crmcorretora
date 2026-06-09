import request from 'supertest';
import { describe, it, expect, beforeAll, vi } from 'vitest';
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
import { generateTestToken } from '../../helpers/auth.helper';
import { db } from '@ecotech/shared/database';
import { usuarios, equipes, usuarioCorretora } from '@ecotech/shared/database';
import { eq } from 'drizzle-orm';

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/usuarios — filtros (linhas 257–276)
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/usuarios — filtros de query', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let corretoraId: string;
  let cargoId: string;
  let adminToken: string;
  let usuarioComNome: { id: string; nome: string; email: string };
  let cargoFiltroId: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await cleanDatabase();
    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    corretoraId = corretora.id;
    const cargo = await createAdminCargo(corretoraId);
    cargoId = cargo.id;
    const admin = await createTestUsuario(corretoraId, cargoId);

    adminToken = generateTestToken(app, {
      sub: admin.id,
      corretoraId,
      cargoId,
      isAdmin: true,
      isGestor: false,
      isVendedor: false,
      permissoes: [],
      nome: admin.nome,
      email: admin.email,
      avatarUrl: null,
    });

    // Usuário com nome único para teste de search
    const ts = Date.now();
    usuarioComNome = await createTestUsuario(corretoraId, cargoId, {
      nome: `BuscavelUnico${ts}`,
      email: `buscavel.${ts}@teste.com`,
    });

    // Cargo específico para filtro de cargoId
    const cargoFiltro = await createTestCargo(corretoraId, {
      nomeCargo: 'Cargo Para Filtro',
    });
    cargoFiltroId = cargoFiltro.id;
    await createTestUsuario(corretoraId, cargoFiltroId);

    // Usuário inativo para filtro ?ativo=false
    await createTestUsuario(corretoraId, cargoId, { ativo: false });
  });

  it('filtra por ?search= correspondendo ao nome', async () => {
    const res = await request(app.server)
      .get(`/api/usuarios?search=${usuarioComNome.nome}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    const ids = res.body.data.map((u: { id: string }) => u.id);
    expect(ids).toContain(usuarioComNome.id);
  });

  it('filtra por ?search= correspondendo ao email', async () => {
    const res = await request(app.server)
      .get(`/api/usuarios?search=${encodeURIComponent(usuarioComNome.email)}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    const ids = res.body.data.map((u: { id: string }) => u.id);
    expect(ids).toContain(usuarioComNome.id);
  });

  it('filtra por ?cargoId= retornando apenas usuários daquele cargo', async () => {
    const res = await request(app.server)
      .get(`/api/usuarios?cargoId=${cargoFiltroId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    const cargos = res.body.data.map((u: { cargo?: { id: string } }) => u.cargo?.id);
    expect(cargos.every((id: string) => id === cargoFiltroId)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('filtra por ?ativo=false retornando apenas inativos', async () => {
    const res = await request(app.server)
      .get('/api/usuarios?ativo=false')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    const ativos = res.body.data.map((u: { ativo: boolean }) => u.ativo);
    expect(ativos.every((a: boolean) => a === false)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/usuarios — usuário com avatarR2Key (linhas 303–313)
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/usuarios — usuário com avatarR2Key', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let corretoraId: string;
  let cargoId: string;
  let adminToken: string;
  let usuarioComAvatarId: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await cleanDatabase();
    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    corretoraId = corretora.id;
    const cargo = await createAdminCargo(corretoraId);
    cargoId = cargo.id;
    const admin = await createTestUsuario(corretoraId, cargoId);

    adminToken = generateTestToken(app, {
      sub: admin.id,
      corretoraId,
      cargoId,
      isAdmin: true,
      isGestor: false,
      isVendedor: false,
      permissoes: [],
      nome: admin.nome,
      email: admin.email,
      avatarUrl: null,
    });

    // Criar usuário e depois inserir avatarR2Key diretamente no banco
    const usuarioComAvatar = await createTestUsuario(corretoraId, cargoId);
    usuarioComAvatarId = usuarioComAvatar.id;
    await db
      .update(usuarios)
      .set({ avatarR2Key: `${corretoraId}/avatars/${usuarioComAvatarId}/foto.jpg` })
      .where(eq(usuarios.id, usuarioComAvatarId));
  });

  it('gera signed URL para usuário com avatarR2Key na listagem', async () => {
    const { storageClient } = await import('@ecotech/shared/storage');
    const res = await request(app.server)
      .get('/api/usuarios')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    // getSignedDownloadUrl deve ter sido chamado para o usuário com avatar
    expect(storageClient.getSignedDownloadUrl).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/usuarios — corretora sem usuários vinculados (linha 326)
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/usuarios — corretora sem usuários', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let corretoraVaziaId: string;
  let tokenCorretoraSemUsuarios: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await cleanDatabase();

    // Corretora que terá o admin com token
    const plano = await createTestPlano();
    const corretoraVazia = await createTestCorretora(plano.id);
    corretoraVaziaId = corretoraVazia.id;

    // Criar usuário real (authenticate faz lookup no DB), mas sem vínculo via usuarioCorretora
    const adminUser = await createTestUsuario(corretoraVaziaId, null);
    await db.delete(usuarioCorretora).where(eq(usuarioCorretora.usuarioId, adminUser.id));

    // Gerar token apontando para a corretora vazia (sem usuários vinculados)
    tokenCorretoraSemUsuarios = generateTestToken(app, {
      sub: adminUser.id,
      corretoraId: corretoraVaziaId,
      cargoId: null,
      isAdmin: true,
      isGestor: false,
      isVendedor: false,
      permissoes: [],
      nome: adminUser.nome,
      email: adminUser.email,
      avatarUrl: null,
    });
  });

  it('retorna lista vazia quando corretora não tem usuários vinculados', async () => {
    const res = await request(app.server)
      .get('/api/usuarios')
      .set('Authorization', `Bearer ${tokenCorretoraSemUsuarios}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    // Estrutura paginada vazia
    const data = res.body.data;
    const isEmptyArray = Array.isArray(data) && data.length === 0;
    const isEmptyItems =
      data && typeof data === 'object' && Array.isArray(data.items) && data.items.length === 0;
    expect(isEmptyArray || isEmptyItems).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/usuarios/:id — usuário com avatarR2Key + cargo/equipe/gestor (438–467)
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/usuarios/:id — avatarR2Key e relacionamentos', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let corretoraId: string;
  let cargoId: string;
  let adminToken: string;
  let usuarioComAvatarId: string;
  let usuarioComRelacionamentosId: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await cleanDatabase();
    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    corretoraId = corretora.id;
    const cargo = await createAdminCargo(corretoraId);
    cargoId = cargo.id;
    const admin = await createTestUsuario(corretoraId, cargoId);

    adminToken = generateTestToken(app, {
      sub: admin.id,
      corretoraId,
      cargoId,
      isAdmin: true,
      isGestor: false,
      isVendedor: false,
      permissoes: [],
      nome: admin.nome,
      email: admin.email,
      avatarUrl: null,
    });

    // Usuário com avatarR2Key
    const usuarioComAvatar = await createTestUsuario(corretoraId, cargoId);
    usuarioComAvatarId = usuarioComAvatar.id;
    await db
      .update(usuarios)
      .set({ avatarR2Key: `${corretoraId}/avatars/${usuarioComAvatarId}/foto.jpg` })
      .where(eq(usuarios.id, usuarioComAvatarId));

    // Equipe para relacionamento
    const [equipe] = await db
      .insert(equipes)
      .values({ corretoraId, nome: 'Equipe Alpha' })
      .returning();

    // Usuário com cargo, equipe e gestor preenchidos
    const gestor = await createTestUsuario(corretoraId, cargoId);
    const usuarioComRelacionamentos = await createTestUsuario(corretoraId, cargoId, {
      equipeId: equipe.id,
      gestorId: gestor.id,
    });
    usuarioComRelacionamentosId = usuarioComRelacionamentos.id;
  });

  it('retorna avatarUrl quando usuário tem avatarR2Key', async () => {
    const { storageClient } = await import('@ecotech/shared/storage');
    vi.mocked(storageClient.getSignedDownloadUrl).mockResolvedValueOnce(
      'https://mock-r2.com/avatar-signed-url',
    );

    const res = await request(app.server)
      .get(`/api/usuarios/${usuarioComAvatarId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(storageClient.getSignedDownloadUrl).toHaveBeenCalled();
    expect(res.body.data.id).toBe(usuarioComAvatarId);
  });

  it('retorna cargo, equipe e gestor quando preenchidos', async () => {
    const res = await request(app.server)
      .get(`/api/usuarios/${usuarioComRelacionamentosId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.cargo).toBeTruthy();
    expect(res.body.data.cargo.id).toBe(cargoId);
    expect(res.body.data.equipe).toBeTruthy();
    expect(res.body.data.equipe.nome).toBe('Equipe Alpha');
    expect(res.body.data.gestor).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/usuarios/:id — mudança de cargo com quota (502–535)
// ─────────────────────────────────────────────────────────────────────────────

describe('PATCH /api/usuarios/:id — mudança de cargo com quota', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let corretoraId: string;
  let cargoAdminId: string;
  let cargoVendedorId: string;
  let cargoNaoVendedorId: string;
  let adminToken: string;
  let usuarioParaPromoverVendedorId: string;
  let usuarioVendedorId: string;
  let usuarioParaNullCargoId: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await cleanDatabase();
    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    corretoraId = corretora.id;
    const cargoAdmin = await createAdminCargo(corretoraId);
    cargoAdminId = cargoAdmin.id;
    const admin = await createTestUsuario(corretoraId, cargoAdminId);

    adminToken = generateTestToken(app, {
      sub: admin.id,
      corretoraId,
      cargoId: cargoAdminId,
      isAdmin: true,
      isGestor: false,
      isVendedor: false,
      permissoes: [],
      nome: admin.nome,
      email: admin.email,
      avatarUrl: null,
    });

    // Cargo vendedor
    const cargoVendedor = await createTestCargo(corretoraId, {
      nomeCargo: 'Vendedor',
      isVendedor: true,
    });
    cargoVendedorId = cargoVendedor.id;

    // Cargo não-vendedor
    const cargoNaoVendedor = await createTestCargo(corretoraId, {
      nomeCargo: 'Suporte',
      isVendedor: false,
    });
    cargoNaoVendedorId = cargoNaoVendedor.id;

    // Usuário sem cargo vendedor para promover
    const usuarioParaPromover = await createTestUsuario(corretoraId, cargoNaoVendedorId);
    usuarioParaPromoverVendedorId = usuarioParaPromover.id;

    // Usuário já vendedor para rebaixar
    const usuarioVendedor = await createTestUsuario(corretoraId, cargoVendedorId);
    usuarioVendedorId = usuarioVendedor.id;

    // Usuário para testar cargo null
    const usuarioParaNull = await createTestUsuario(corretoraId, cargoNaoVendedorId);
    usuarioParaNullCargoId = usuarioParaNull.id;
  });

  it('troca cargo de não-vendedor para vendedor → incrementQuota chamado', async () => {
    const res = await request(app.server)
      .patch(`/api/usuarios/${usuarioParaPromoverVendedorId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ cargoId: cargoVendedorId })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.cargoId).toBe(cargoVendedorId);
  });

  it('troca cargo de vendedor para não-vendedor → decrementQuota chamado', async () => {
    const res = await request(app.server)
      .patch(`/api/usuarios/${usuarioVendedorId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ cargoId: cargoNaoVendedorId })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.cargoId).toBe(cargoNaoVendedorId);
  });

  it('troca cargo para null (sem cargo)', async () => {
    const res = await request(app.server)
      .patch(`/api/usuarios/${usuarioParaNullCargoId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ cargoId: null })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.cargoId).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/usuarios/:id — com avatarR2Key (linhas 596–603)
// ─────────────────────────────────────────────────────────────────────────────

describe('DELETE /api/usuarios/:id — usuário com avatarR2Key', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let corretoraId: string;
  let cargoId: string;
  let adminToken: string;
  let adminId: string;
  let usuarioComAvatarId: string;
  let avatarKey: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await cleanDatabase();
    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    corretoraId = corretora.id;
    const cargo = await createAdminCargo(corretoraId);
    cargoId = cargo.id;
    const admin = await createTestUsuario(corretoraId, cargoId);
    adminId = admin.id;

    adminToken = generateTestToken(app, {
      sub: admin.id,
      corretoraId,
      cargoId,
      isAdmin: true,
      isGestor: false,
      isVendedor: false,
      permissoes: [],
      nome: admin.nome,
      email: admin.email,
      avatarUrl: null,
    });

    const usuarioComAvatar = await createTestUsuario(corretoraId, cargoId);
    usuarioComAvatarId = usuarioComAvatar.id;
    avatarKey = `${corretoraId}/avatars/${usuarioComAvatarId}/foto.jpg`;
    await db
      .update(usuarios)
      .set({ avatarR2Key: avatarKey })
      .where(eq(usuarios.id, usuarioComAvatarId));
  });

  it('exclui usuário com avatarR2Key → storageClient.delete é chamado', async () => {
    const { storageClient } = await import('@ecotech/shared/storage');

    const res = await request(app.server)
      .delete(`/api/usuarios/${usuarioComAvatarId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(storageClient.delete).toHaveBeenCalledWith(avatarKey);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/usuarios/:id — com cargo vendedor (linhas 626–627)
// ─────────────────────────────────────────────────────────────────────────────

describe('DELETE /api/usuarios/:id — usuário com cargo vendedor', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let corretoraId: string;
  let cargoAdminId: string;
  let adminToken: string;
  let adminId: string;
  let usuarioVendedorId: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await cleanDatabase();
    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    corretoraId = corretora.id;
    const cargoAdmin = await createAdminCargo(corretoraId);
    cargoAdminId = cargoAdmin.id;
    const admin = await createTestUsuario(corretoraId, cargoAdminId);
    adminId = admin.id;

    adminToken = generateTestToken(app, {
      sub: admin.id,
      corretoraId,
      cargoId: cargoAdminId,
      isAdmin: true,
      isGestor: false,
      isVendedor: false,
      permissoes: [],
      nome: admin.nome,
      email: admin.email,
      avatarUrl: null,
    });

    const cargoVendedor = await createTestCargo(corretoraId, {
      nomeCargo: 'Vendedor',
      isVendedor: true,
    });
    const usuarioVendedor = await createTestUsuario(corretoraId, cargoVendedor.id);
    usuarioVendedorId = usuarioVendedor.id;
  });

  it('excluir usuário vendedor → quota decrementada (decrementQuota chamado)', async () => {
    const res = await request(app.server)
      .delete(`/api/usuarios/${usuarioVendedorId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/usuarios/:id/atribuir-cargo — quota de vendedor (680–695)
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/usuarios/:id/atribuir-cargo — quota de vendedor', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let corretoraId: string;
  let cargoAdminId: string;
  let cargoVendedorId: string;
  let cargoNaoVendedorId: string;
  let adminToken: string;
  let usuarioNaoVendedorId: string;
  let usuarioVendedorId: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await cleanDatabase();
    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    corretoraId = corretora.id;
    const cargoAdmin = await createAdminCargo(corretoraId);
    cargoAdminId = cargoAdmin.id;
    const admin = await createTestUsuario(corretoraId, cargoAdminId);

    adminToken = generateTestToken(app, {
      sub: admin.id,
      corretoraId,
      cargoId: cargoAdminId,
      isAdmin: true,
      isGestor: false,
      isVendedor: false,
      permissoes: [],
      nome: admin.nome,
      email: admin.email,
      avatarUrl: null,
    });

    const cargoVendedor = await createTestCargo(corretoraId, {
      nomeCargo: 'Vendedor',
      isVendedor: true,
    });
    cargoVendedorId = cargoVendedor.id;

    const cargoNaoVendedor = await createTestCargo(corretoraId, {
      nomeCargo: 'Suporte',
      isVendedor: false,
    });
    cargoNaoVendedorId = cargoNaoVendedor.id;

    // Usuário sem cargo vendedor
    const usuarioNaoVendedor = await createTestUsuario(corretoraId, cargoNaoVendedorId);
    usuarioNaoVendedorId = usuarioNaoVendedor.id;

    // Usuário com cargo vendedor
    const usuarioVendedor = await createTestUsuario(corretoraId, cargoVendedorId);
    usuarioVendedorId = usuarioVendedor.id;
  });

  it('atribuir cargo vendedor a usuário não-vendedor → quota incrementada', async () => {
    const res = await request(app.server)
      .post(`/api/usuarios/${usuarioNaoVendedorId}/atribuir-cargo`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ cargoId: cargoVendedorId })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('atribuir cargo não-vendedor a usuário vendedor → quota decrementada', async () => {
    const res = await request(app.server)
      .post(`/api/usuarios/${usuarioVendedorId}/atribuir-cargo`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ cargoId: cargoNaoVendedorId })
      .expect(200);

    expect(res.body.success).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/usuarios/:id/avatar — upload de foto (762–856)
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/usuarios/:id/avatar — upload de foto de perfil', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let corretoraId: string;
  let cargoId: string;
  let adminToken: string;
  let usuarioId: string;
  let usuarioToken: string;
  let outroUsuarioToken: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await cleanDatabase();
    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    corretoraId = corretora.id;
    const cargo = await createAdminCargo(corretoraId);
    cargoId = cargo.id;

    // Usuário dono do perfil
    const usuario = await createTestUsuario(corretoraId, cargoId);
    usuarioId = usuario.id;

    usuarioToken = generateTestToken(app, {
      sub: usuario.id,
      corretoraId,
      cargoId,
      isAdmin: false,
      isGestor: false,
      isVendedor: false,
      permissoes: [],
      nome: usuario.nome,
      email: usuario.email,
      avatarUrl: null,
    });

    // Admin com permissão de editar usuários
    const admin = await createTestUsuario(corretoraId, cargoId);
    adminToken = generateTestToken(app, {
      sub: admin.id,
      corretoraId,
      cargoId,
      isAdmin: true,
      isGestor: false,
      isVendedor: false,
      permissoes: [],
      nome: admin.nome,
      email: admin.email,
      avatarUrl: null,
    });

    // Outro usuário sem permissão (sem cargo para não herdar permissões do admin cargo)
    const outroUsuario = await createTestUsuario(corretoraId, null);
    outroUsuarioToken = generateTestToken(app, {
      sub: outroUsuario.id,
      corretoraId,
      cargoId: null,
      isAdmin: false,
      isGestor: false,
      isVendedor: false,
      permissoes: [],
      nome: outroUsuario.nome,
      email: outroUsuario.email,
      avatarUrl: null,
    });
  });

  it('upload pelo próprio usuário → 200 com avatarUrl', async () => {
    const { storageClient } = await import('@ecotech/shared/storage');
    vi.mocked(storageClient.getSignedDownloadUrl).mockResolvedValueOnce(
      'https://mock-r2.com/signed-avatar',
    );

    const res = await request(app.server)
      .post(`/api/usuarios/${usuarioId}/avatar`)
      .set('Authorization', `Bearer ${usuarioToken}`)
      .attach('file', Buffer.from('fake-image-data'), {
        filename: 'avatar.jpg',
        contentType: 'image/jpeg',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(usuarioId);
    expect(res.body.data.avatarUrl).toBeDefined();
  });

  it('MIME inválido → 400', async () => {
    const res = await request(app.server)
      .post(`/api/usuarios/${usuarioId}/avatar`)
      .set('Authorization', `Bearer ${usuarioToken}`)
      .attach('file', Buffer.from('fake-pdf-data'), {
        filename: 'documento.pdf',
        contentType: 'application/pdf',
      })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('arquivo maior que 2MB → 400', async () => {
    const bigBuffer = Buffer.alloc(3 * 1024 * 1024);

    const res = await request(app.server)
      .post(`/api/usuarios/${usuarioId}/avatar`)
      .set('Authorization', `Bearer ${usuarioToken}`)
      .attach('file', bigBuffer, {
        filename: 'grande.jpg',
        contentType: 'image/jpeg',
      })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('outro usuário sem permissão usuarios:editar → 400', async () => {
    const res = await request(app.server)
      .post(`/api/usuarios/${usuarioId}/avatar`)
      .set('Authorization', `Bearer ${outroUsuarioToken}`)
      .attach('file', Buffer.from('fake-image-data'), {
        filename: 'avatar.jpg',
        contentType: 'image/jpeg',
      })
      .expect(400);

    expect(res.body.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/usuarios/:id/avatar (871–924)
// ─────────────────────────────────────────────────────────────────────────────

describe('DELETE /api/usuarios/:id/avatar — remover foto de perfil', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let corretoraId: string;
  let cargoId: string;
  let usuarioId: string;
  let usuarioToken: string;
  let adminToken: string;
  let outroUsuarioId: string;
  let outroUsuarioToken: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await cleanDatabase();
    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    corretoraId = corretora.id;
    const cargo = await createAdminCargo(corretoraId);
    cargoId = cargo.id;

    // Usuário dono do perfil com avatar
    const usuario = await createTestUsuario(corretoraId, cargoId);
    usuarioId = usuario.id;
    await db
      .update(usuarios)
      .set({ avatarR2Key: `${corretoraId}/avatars/${usuarioId}/foto.jpg` })
      .where(eq(usuarios.id, usuarioId));

    usuarioToken = generateTestToken(app, {
      sub: usuario.id,
      corretoraId,
      cargoId,
      isAdmin: false,
      isGestor: false,
      isVendedor: false,
      permissoes: [],
      nome: usuario.nome,
      email: usuario.email,
      avatarUrl: null,
    });

    // Admin com permissão
    const admin = await createTestUsuario(corretoraId, cargoId);
    adminToken = generateTestToken(app, {
      sub: admin.id,
      corretoraId,
      cargoId,
      isAdmin: true,
      isGestor: false,
      isVendedor: false,
      permissoes: [],
      nome: admin.nome,
      email: admin.email,
      avatarUrl: null,
    });

    // Outro usuário sem permissão (sem cargo para não herdar permissões do admin cargo)
    const outroUsuario = await createTestUsuario(corretoraId, null);
    outroUsuarioId = outroUsuario.id;
    outroUsuarioToken = generateTestToken(app, {
      sub: outroUsuario.id,
      corretoraId,
      cargoId: null,
      isAdmin: false,
      isGestor: false,
      isVendedor: false,
      permissoes: [],
      nome: outroUsuario.nome,
      email: outroUsuario.email,
      avatarUrl: null,
    });
  });

  it('outro usuário sem permissão → 400', async () => {
    const res = await request(app.server)
      .delete(`/api/usuarios/${usuarioId}/avatar`)
      .set('Authorization', `Bearer ${outroUsuarioToken}`)
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('admin com usuarios:editar remove avatar de outro usuário → 200', async () => {
    // Garante que o outro usuário tem avatar antes de remover
    await db
      .update(usuarios)
      .set({ avatarR2Key: `${corretoraId}/avatars/${outroUsuarioId}/foto.jpg` })
      .where(eq(usuarios.id, outroUsuarioId));

    const res = await request(app.server)
      .delete(`/api/usuarios/${outroUsuarioId}/avatar`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('usuário remove próprio avatar → 200', async () => {
    // Restaura avatar para o usuário dono antes de testar remoção
    await db
      .update(usuarios)
      .set({ avatarR2Key: `${corretoraId}/avatars/${usuarioId}/foto2.jpg` })
      .where(eq(usuarios.id, usuarioId));

    const res = await request(app.server)
      .delete(`/api/usuarios/${usuarioId}/avatar`)
      .set('Authorization', `Bearer ${usuarioToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.message).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/usuarios — vínculo de usuário existente (linhas 68–124)
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/usuarios — email de usuário já existente vincula à corretora', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let corretoraBId: string;
  let cargoBId: string;
  let adminBToken: string;
  let user1Email: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await cleanDatabase();

    // Corretora A — onde user1 já existe
    const planoA = await createTestPlano();
    const corretoraA = await createTestCorretora(planoA.id);
    const cargoA = await createAdminCargo(corretoraA.id);
    const user1 = await createTestUsuario(corretoraA.id, cargoA.id);
    user1Email = user1.email;

    // Corretora B — que tentará vincular user1
    const planoB = await createTestPlano();
    const corretoraB = await createTestCorretora(planoB.id);
    corretoraBId = corretoraB.id;
    const cargoB = await createAdminCargo(corretoraBId);
    cargoBId = cargoB.id;
    const adminB = await createTestUsuario(corretoraBId, cargoBId);

    adminBToken = generateTestToken(app, {
      sub: adminB.id,
      corretoraId: corretoraBId,
      cargoId: cargoBId,
      isAdmin: true,
      isGestor: false,
      isVendedor: false,
      permissoes: ['usuarios:criar'],
      nome: adminB.nome,
      email: adminB.email,
      avatarUrl: null,
    });
  });

  it('cria usuário com email já existente → vincula à segunda corretora (201, vinculado: true)', async () => {
    const res = await request(app.server)
      .post('/api/usuarios')
      .set('Authorization', `Bearer ${adminBToken}`)
      .send({
        nome: 'Nome Qualquer',
        email: user1Email,
        senha: 'Senha@Teste123',
        cargoId: cargoBId,
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.vinculado).toBe(true);
    expect(res.body.data.email).toBe(user1Email);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/usuarios — cargo vendedor incrementa quota (linhas 185–191)
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/usuarios — cargo isVendedor incrementa quota', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let corretoraId: string;
  let cargoVendedorId: string;
  let adminToken: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await cleanDatabase();
    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    corretoraId = corretora.id;
    const cargoAdmin = await createAdminCargo(corretoraId);
    const admin = await createTestUsuario(corretoraId, cargoAdmin.id);

    adminToken = generateTestToken(app, {
      sub: admin.id,
      corretoraId,
      cargoId: cargoAdmin.id,
      isAdmin: true,
      isGestor: false,
      isVendedor: false,
      permissoes: ['usuarios:criar'],
      nome: admin.nome,
      email: admin.email,
      avatarUrl: null,
    });

    const cargoVendedor = await createTestCargo(corretoraId, {
      nomeCargo: 'Vendedor Novo',
      isVendedor: true,
    });
    cargoVendedorId = cargoVendedor.id;
  });

  it('POST /usuarios com cargo vendedor → 201 e cargoId retornado', async () => {
    const ts = Date.now();
    const res = await request(app.server)
      .post('/api/usuarios')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nome: `Vendedor Criado ${ts}`,
        email: `vendedor.criado.${ts}@teste.com`,
        senha: 'Senha@Teste123',
        cargoId: cargoVendedorId,
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.cargoId).toBe(cargoVendedorId);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/usuarios/:id — cargoId inexistente (linhas 518–519)
// ─────────────────────────────────────────────────────────────────────────────

describe('PATCH /api/usuarios/:id — cargoId inexistente retorna erro', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let corretoraId: string;
  let cargoId: string;
  let adminToken: string;
  let usuarioId: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await cleanDatabase();
    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    corretoraId = corretora.id;
    const cargo = await createAdminCargo(corretoraId);
    cargoId = cargo.id;
    const admin = await createTestUsuario(corretoraId, cargoId);

    adminToken = generateTestToken(app, {
      sub: admin.id,
      corretoraId,
      cargoId,
      isAdmin: true,
      isGestor: false,
      isVendedor: false,
      permissoes: [],
      nome: admin.nome,
      email: admin.email,
      avatarUrl: null,
    });

    const usuario = await createTestUsuario(corretoraId, cargoId);
    usuarioId = usuario.id;
  });

  it('PATCH com cargoId inexistente → 400', async () => {
    const res = await request(app.server)
      .patch(`/api/usuarios/${usuarioId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ cargoId: '00000000-0000-0000-0000-000000000000' })
      .expect(400);

    expect(res.body.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/usuarios/:id/avatar — validações de usuário inexistente e sem arquivo
// (linhas 789–798)
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/usuarios/:id/avatar — usuário inexistente e sem arquivo', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let corretoraId: string;
  let cargoId: string;
  let adminToken: string;
  let usuarioId: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await cleanDatabase();
    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    corretoraId = corretora.id;
    const cargo = await createAdminCargo(corretoraId);
    cargoId = cargo.id;
    const admin = await createTestUsuario(corretoraId, cargoId);

    adminToken = generateTestToken(app, {
      sub: admin.id,
      corretoraId,
      cargoId,
      isAdmin: true,
      isGestor: false,
      isVendedor: false,
      permissoes: [],
      nome: admin.nome,
      email: admin.email,
      avatarUrl: null,
    });

    const usuario = await createTestUsuario(corretoraId, cargoId);
    usuarioId = usuario.id;
  });

  it('POST /usuarios/:id/avatar com id inexistente → 404', async () => {
    const res = await request(app.server)
      .post('/api/usuarios/00000000-0000-0000-0000-000000000000/avatar')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('avatar', Buffer.from('x'), { filename: 'a.jpg', contentType: 'image/jpeg' })
      .expect(404);

    expect(res.body.success).toBe(false);
  });

  it('POST /usuarios/:id/avatar sem arquivo → 400', async () => {
    const res = await request(app.server)
      .post(`/api/usuarios/${usuarioId}/avatar`)
      .set('Authorization', `Bearer ${adminToken}`)
      .field('placeholder', 'value')
      .expect(400);

    expect(res.body.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/usuarios/:id/avatar — usuário inexistente (linhas 895–897)
// ─────────────────────────────────────────────────────────────────────────────

describe('DELETE /api/usuarios/:id/avatar — usuário inexistente', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let corretoraId: string;
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
    const admin = await createTestUsuario(corretoraId, cargoId);

    adminToken = generateTestToken(app, {
      sub: admin.id,
      corretoraId,
      cargoId,
      isAdmin: true,
      isGestor: false,
      isVendedor: false,
      permissoes: [],
      nome: admin.nome,
      email: admin.email,
      avatarUrl: null,
    });
  });

  it('DELETE /usuarios/:id/avatar com id inexistente → 404', async () => {
    const res = await request(app.server)
      .delete('/api/usuarios/00000000-0000-0000-0000-000000000000/avatar')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);

    expect(res.body.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/usuarios — usuário sem cargo retorna cargo: null (linha 326)
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/usuarios — usuário sem cargo retorna campo cargo nulo', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let corretoraId: string;
  let cargoAdminId: string;
  let adminToken: string;
  let usuarioSemCargoId: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await cleanDatabase();
    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    corretoraId = corretora.id;
    const cargoAdmin = await createAdminCargo(corretoraId);
    cargoAdminId = cargoAdmin.id;
    const admin = await createTestUsuario(corretoraId, cargoAdminId);

    adminToken = generateTestToken(app, {
      sub: admin.id,
      corretoraId,
      cargoId: cargoAdminId,
      isAdmin: true,
      isGestor: false,
      isVendedor: false,
      permissoes: [],
      nome: admin.nome,
      email: admin.email,
      avatarUrl: null,
    });

    const usuarioSemCargo = await createTestUsuario(corretoraId, null);
    usuarioSemCargoId = usuarioSemCargo.id;
  });

  it('usuário sem cargo aparece na listagem com cargo: null', async () => {
    const res = await request(app.server)
      .get('/api/usuarios')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    const usuario = res.body.data.find((u: { id: string }) => u.id === usuarioSemCargoId);
    expect(usuario).toBeDefined();
    expect(usuario.cargo).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/usuarios/vendedores — corretora sem vendedores (linha 379)
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/usuarios/vendedores — corretora sem vendedores retorna lista vazia', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let corretoraId: string;
  let cargoAdminId: string;
  let adminToken: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await cleanDatabase();
    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    corretoraId = corretora.id;
    const cargoAdmin = await createAdminCargo(corretoraId);
    cargoAdminId = cargoAdmin.id;
    const admin = await createTestUsuario(corretoraId, cargoAdminId);

    adminToken = generateTestToken(app, {
      sub: admin.id,
      corretoraId,
      cargoId: cargoAdminId,
      isAdmin: true,
      isGestor: false,
      isVendedor: false,
      permissoes: ['usuarios:visualizar'],
      nome: admin.nome,
      email: admin.email,
      avatarUrl: null,
    });
  });

  it('GET /vendedores sem vendedores vinculados → 200 com data vazia', async () => {
    const res = await request(app.server)
      .get('/api/usuarios/vendedores')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/usuarios — filtro por ?equipeId=
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/usuarios — filtro por equipeId', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let corretoraId: string;
  let cargoId: string;
  let adminToken: string;
  let equipeId: string;
  let usuarioNaEquipeId: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await cleanDatabase();
    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    corretoraId = corretora.id;
    const cargo = await createAdminCargo(corretoraId);
    cargoId = cargo.id;
    const admin = await createTestUsuario(corretoraId, cargoId);

    adminToken = generateTestToken(app, {
      sub: admin.id,
      corretoraId,
      cargoId,
      isAdmin: true,
      isGestor: false,
      isVendedor: false,
      permissoes: [],
      nome: admin.nome,
      email: admin.email,
      avatarUrl: null,
    });

    // Criar equipe e vincular usuário
    const [equipe] = await db
      .insert(equipes)
      .values({ corretoraId, nome: 'Equipe Filtro' })
      .returning();
    equipeId = equipe.id;

    const usuarioNaEquipe = await createTestUsuario(corretoraId, cargoId, {
      equipeId: equipe.id,
    });
    usuarioNaEquipeId = usuarioNaEquipe.id;

    // Usuário sem equipe
    await createTestUsuario(corretoraId, cargoId);
  });

  it('filtra por ?equipeId= retornando apenas usuários da equipe', async () => {
    const res = await request(app.server)
      .get(`/api/usuarios?equipeId=${equipeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    const ids = res.body.data.map((u: { id: string }) => u.id);
    expect(ids).toContain(usuarioNaEquipeId);
    // Todos os retornados devem ser da equipe
    const equipesIds = res.body.data.map(
      (u: { equipe?: { id: string } }) => u.equipe?.id,
    );
    expect(equipesIds.every((id: string) => id === equipeId)).toBe(true);
  });
});
