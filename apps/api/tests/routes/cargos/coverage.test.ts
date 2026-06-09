/**
 * Extra coverage tests for src/routes/cargos/index.ts
 *
 * Uses a SINGLE beforeAll / cleanDatabase() at module scope to avoid
 * wiping the DB while other test files (running after this one) still
 * need their corretora rows intact.
 */
import request from 'supertest';
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { db } from '@ecotech/shared/database';
import {
  permissoesGlobais,
  cargoPermissoes,
  cargoTemplates,
  cargoTemplatePermissoes,
  cargos,
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
import { createTestCargo } from '../../helpers/factories/cargo.factory';
import { generateTestToken } from '../../helpers/auth.helper';

// ── Shared fixtures (one DB reset for the whole file) ─────────────────────

let app: Awaited<ReturnType<typeof buildTestApp>>;
let corretoraId: string;
let adminCargoId: string;
let adminUserId: string;
let adminToken: string;      // isAdmin=true, all cargos perms
let atribuirToken: string;   // isAdmin=true, cargos:atribuir_permissoes
let criarToken: string;      // isAdmin=true, cargos:criar
let editarToken: string;     // isAdmin=true, cargos:editar

// Seeded test template IDs
let testTemplateId: string;
// Template with permissions seeded in cargo_template_permissao (covers lines 787-793)
let templateWithPermsId: string;

// A fake permission inserted for tests that need a valid permissaoGlobalId
let fakePermId: string;

beforeAll(async () => {
  app = await buildTestApp();
  await cleanDatabase();

  const plano = await createTestPlano();
  const corretora = await createTestCorretora(plano.id);
  corretoraId = corretora.id;

  const adminCargo = await createAdminCargo(corretoraId);
  adminCargoId = adminCargo.id;

  const admin = await createTestUsuario(corretoraId, adminCargoId);
  adminUserId = admin.id;

  const tokenBase = {
    sub: admin.id,
    corretoraId,
    cargoId: adminCargoId,
    isAdmin: true,
    isGestor: false,
    isVendedor: false,
    nome: admin.nome,
    email: admin.email,
    avatarUrl: null,
  };

  adminToken = generateTestToken(app, {
    ...tokenBase,
    permissoes: ['cargos:criar', 'cargos:editar', 'cargos:excluir', 'cargos:atribuir_permissoes'],
  });
  atribuirToken = generateTestToken(app, { ...tokenBase, permissoes: ['cargos:atribuir_permissoes'] });
  criarToken    = generateTestToken(app, { ...tokenBase, permissoes: ['cargos:criar'] });
  editarToken   = generateTestToken(app, { ...tokenBase, permissoes: ['cargos:editar'] });

  // Seed a template for GET/POST from-template tests
  const [tpl] = await db
    .insert(cargoTemplates)
    .values({
      nomeTemplate: `Template Cobertura ${Date.now()}`,
      descricao: 'Template para testes de cobertura',
      cor: '#AABBCC',
      isGestor: false,
      isVendedor: true,
      categoria: 'vendas',
      ativo: true,
      ordem: 99,
    })
    .returning();
  testTemplateId = tpl.id;

  // Seed a fake permission for tests that need a valid permissaoGlobalId
  const [perm] = await db
    .insert(permissoesGlobais)
    .values({
      nomePermissao: `fake:coverage:${Date.now()}`,
      descricao: 'Permissão temporária para testes de cobertura',
      grupo: 'teste',
    })
    .returning();
  fakePermId = perm.id;

  // Seed a permission with grupo=null to cover the `|| 'outros'` branch (line 110)
  await db.insert(permissoesGlobais).values({
    nomePermissao: `fake:nogrup:${Date.now()}`,
    descricao: 'Permissão sem grupo para cobertura',
    grupo: null,
  });

  // Seed a template WITH a permission linked to cover lines 787-793 (from-template permission insert branch)
  const [tplWithPerms] = await db
    .insert(cargoTemplates)
    .values({
      nomeTemplate: `Template Com Permissoes ${Date.now()}`,
      descricao: 'Template com permissões para cobertura',
      cor: '#CCDDEE',
      isGestor: false,
      isVendedor: true,
      categoria: 'vendas',
      ativo: true,
      ordem: 100,
    })
    .returning();
  templateWithPermsId = tplWithPerms.id;

  // Link the fake permission to this template
  await db.insert(cargoTemplatePermissoes).values({
    templateId: templateWithPermsId,
    permissaoGlobalId: fakePermId,
  });
});

// ── GET /api/cargos/debug/minhas-permissoes ────────────────────────────────

describe('GET /api/cargos/debug/minhas-permissoes', () => {
  it('retorna 401 sem token', async () => {
    await request(app.server)
      .get('/api/cargos/debug/minhas-permissoes')
      .expect(401);
  });

  it('retorna permissões do usuário autenticado com cargo', async () => {
    const res = await request(app.server)
      .get('/api/cargos/debug/minhas-permissoes')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.usuario.id).toBe(adminUserId);
    expect(res.body.data.cargo).toBeDefined();
    expect(res.body.data.cargo.isAdmin).toBe(true);
    expect(Array.isArray(res.body.data.permissoesDoBanco)).toBe(true);
    expect(Array.isArray(res.body.data.permissoesNoToken)).toBe(true);
    expect(typeof res.body.data.totalPermissoesToken).toBe('number');
    expect(typeof res.body.data.totalPermissoesBanco).toBe('number');
  });

  it('retorna cargo null e permissoesDoBanco vazio para usuário sem cargoId', async () => {
    const user2 = await createTestUsuario(corretoraId, null);
    const token2 = generateTestToken(app, {
      sub: user2.id,
      corretoraId,
      cargoId: null as any,
      isAdmin: true,
      isGestor: false,
      isVendedor: false,
      permissoes: [],
      nome: user2.nome,
      email: user2.email,
      avatarUrl: null,
    });

    const res = await request(app.server)
      .get('/api/cargos/debug/minhas-permissoes')
      .set('Authorization', `Bearer ${token2}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.cargo).toBeNull();
    expect(res.body.data.permissoesDoBanco).toEqual([]);
    expect(res.body.data.totalPermissoesBanco).toBe(0);
  });
});

// ── GET /api/cargos/permissoes/disponiveis ────────────────────────────────

describe('GET /api/cargos/permissoes/disponiveis', () => {
  it('retorna permissões agrupadas (data é objeto com arrays)', async () => {
    const res = await request(app.server)
      .get('/api/cargos/permissoes/disponiveis')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(typeof res.body.data).toBe('object');
    // The fake permission seeded in beforeAll has grupo='teste'
    // so at minimum the 'teste' group exists
    for (const grupo of Object.values(res.body.data) as any[]) {
      expect(Array.isArray(grupo)).toBe(true);
      for (const perm of grupo) {
        expect(perm.id).toBeDefined();
        expect(perm.nomePermissao).toBeDefined();
      }
    }
  });
});

// ── PATCH /api/cargos/:id/cor — 404 ──────────────────────────────────────

describe('PATCH /api/cargos/:id/cor', () => {
  it('retorna 404 para cargo inexistente', async () => {
    await request(app.server)
      .patch('/api/cargos/00000000-0000-0000-0000-000000000000/cor')
      .set('Authorization', `Bearer ${editarToken}`)
      .send({ cor: '#AABBCC' })
      .expect(404);
  });
});

// ── POST /api/cargos/:id/permissoes — cobertura extra ────────────────────

describe('POST /api/cargos/:id/permissoes — cobertura extra', () => {
  it('retorna 400 para IDs de permissão inválidos', async () => {
    const cargo = await createTestCargo(corretoraId, { nomeCargo: `Cargo Perms Invalidas ${Date.now()}` });
    await request(app.server)
      .post(`/api/cargos/${cargo.id}/permissoes`)
      .set('Authorization', `Bearer ${atribuirToken}`)
      .send({ permissaoIds: ['00000000-0000-0000-0000-000000000001'] })
      .expect(400);
  });

  it('atribui permissões com array vazio (limpa permissões)', async () => {
    const cargo = await createTestCargo(corretoraId, { nomeCargo: `Cargo Limpar Perms ${Date.now()}` });
    const res = await request(app.server)
      .post(`/api/cargos/${cargo.id}/permissoes`)
      .set('Authorization', `Bearer ${atribuirToken}`)
      .send({ permissaoIds: [] })
      .expect(200);

    expect(res.body.success).toBe(true);
    const remaining = await db.select().from(cargoPermissoes).where(eq(cargoPermissoes.cargoId, cargo.id));
    expect(remaining.length).toBe(0);
  });

  it('atribui permissões válidas (array não-vazio — cobre o branch de insert)', async () => {
    const cargo = await createTestCargo(corretoraId, { nomeCargo: `Cargo Perms Validas ${Date.now()}` });

    const res = await request(app.server)
      .post(`/api/cargos/${cargo.id}/permissoes`)
      .set('Authorization', `Bearer ${atribuirToken}`)
      .send({ permissaoIds: [fakePermId] })
      .expect(200);

    expect(res.body.success).toBe(true);
    const assigned = await db.select().from(cargoPermissoes).where(eq(cargoPermissoes.cargoId, cargo.id));
    expect(assigned.length).toBe(1);
  });
});

// ── DELETE /api/cargos/:id/permissoes/:permissaoId ────────────────────────

describe('DELETE /api/cargos/:id/permissoes/:permissaoId', () => {
  it('executa delete com sucesso (cobre linhas 573-609)', async () => {
    const cargo = await createTestCargo(corretoraId, { nomeCargo: `Cargo Del Perm ${Date.now()}` });

    const res = await request(app.server)
      .delete(`/api/cargos/${cargo.id}/permissoes/${fakePermId}`)
      .set('Authorization', `Bearer ${atribuirToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.message).toBeDefined();
  });

  it('retorna 401 sem token', async () => {
    const cargo = await createTestCargo(corretoraId, { nomeCargo: `Cargo Del 401 ${Date.now()}` });
    await request(app.server)
      .delete(`/api/cargos/${cargo.id}/permissoes/${fakePermId}`)
      .expect(401);
  });

  it('retorna 400 ao tentar remover permissão do cargo admin', async () => {
    await request(app.server)
      .delete(`/api/cargos/${adminCargoId}/permissoes/${fakePermId}`)
      .set('Authorization', `Bearer ${atribuirToken}`)
      .expect(400);
  });

  it('retorna 404 para cargo inexistente', async () => {
    await request(app.server)
      .delete(`/api/cargos/00000000-0000-0000-0000-000000000000/permissoes/${fakePermId}`)
      .set('Authorization', `Bearer ${atribuirToken}`)
      .expect(404);
  });
});

// ── GET /api/cargos/templates ─────────────────────────────────────────────

describe('GET /api/cargos/templates', () => {
  it('retorna templates com totalPermissoes calculado (cobre linhas 634-656)', async () => {
    const res = await request(app.server)
      .get('/api/cargos/templates')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);

    for (const tpl of res.body.data) {
      expect(tpl.id).toBeDefined();
      expect(tpl.nomeTemplate).toBeDefined();
      expect(typeof tpl.totalPermissoes).toBe('number');
    }
  });
});

// ── GET /api/cargos/templates/:templateId ────────────────────────────────

describe('GET /api/cargos/templates/:templateId', () => {
  it('retorna detalhes do template (cobre linhas 671-706)', async () => {
    const res = await request(app.server)
      .get(`/api/cargos/templates/${testTemplateId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(testTemplateId);
    expect(res.body.data.nomeTemplate).toBeDefined();
    expect(Array.isArray(res.body.data.permissoes)).toBe(true);
  });

  it('retorna 401 sem token', async () => {
    await request(app.server)
      .get(`/api/cargos/templates/${testTemplateId}`)
      .expect(401);
  });

  it('retorna 404 para template inexistente', async () => {
    await request(app.server)
      .get('/api/cargos/templates/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });
});

// ── POST /api/cargos/from-template/:templateId ────────────────────────────

describe('POST /api/cargos/from-template/:templateId', () => {
  it('cria cargo a partir de template (cobre linhas 751-811)', async () => {
    const res = await request(app.server)
      .post(`/api/cargos/from-template/${testTemplateId}`)
      .set('Authorization', `Bearer ${criarToken}`)
      .send({ nomeCargo: `Cargo do Template ${Date.now()}` })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.nomeCargo).toBeDefined();
    expect(typeof res.body.data.totalPermissoes).toBe('number');
    expect(res.body.message).toBeDefined();
  });

  it('cria cargo do template com cor e descricao custom', async () => {
    const res = await request(app.server)
      .post(`/api/cargos/from-template/${testTemplateId}`)
      .set('Authorization', `Bearer ${criarToken}`)
      .send({
        nomeCargo: `Cargo Custom ${Date.now()}`,
        descricao: 'Descrição custom',
        cor: '#123456',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
  });

  it('retorna 409 para nome já existente ao criar do template', async () => {
    const nomeCargo = `Cargo Conflito ${Date.now()}`;

    await request(app.server)
      .post(`/api/cargos/from-template/${testTemplateId}`)
      .set('Authorization', `Bearer ${criarToken}`)
      .send({ nomeCargo })
      .expect(201);

    await request(app.server)
      .post(`/api/cargos/from-template/${testTemplateId}`)
      .set('Authorization', `Bearer ${criarToken}`)
      .send({ nomeCargo })
      .expect(409);
  });

  it('retorna 404 para template inexistente', async () => {
    await request(app.server)
      .post('/api/cargos/from-template/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${criarToken}`)
      .send({ nomeCargo: 'Qualquer' })
      .expect(404);
  });

  it('retorna 401 sem token', async () => {
    await request(app.server)
      .post('/api/cargos/from-template/00000000-0000-0000-0000-000000000000')
      .send({ nomeCargo: 'Qualquer' })
      .expect(401);
  });
});

// ── POST /api/cargos/:id/duplicate — cobertura extra ─────────────────────

describe('POST /api/cargos/:id/duplicate — cobertura extra', () => {
  it('retorna 404 para cargo inexistente (cobre linhas 854-855)', async () => {
    await request(app.server)
      .post('/api/cargos/00000000-0000-0000-0000-000000000000/duplicate')
      .set('Authorization', `Bearer ${criarToken}`)
      .send({ nomeCargo: 'Cópia de Nada' })
      .expect(404);
  });

  it('duplica cargo sem permissões (cobre branch templatePermissoes.length === 0)', async () => {
    const cargo = await createTestCargo(corretoraId, { nomeCargo: `Cargo Sem Perms ${Date.now()}` });

    const res = await request(app.server)
      .post(`/api/cargos/${cargo.id}/duplicate`)
      .set('Authorization', `Bearer ${criarToken}`)
      .send({ nomeCargo: `Cópia Sem Perms ${Date.now()}` })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.totalPermissoes).toBe(0);
  });

  it('duplica cargo com permissões (cobre linhas 900-906)', async () => {
    const cargo = await createTestCargo(corretoraId, { nomeCargo: `Cargo Com Perms ${Date.now()}` });

    // Assign the fake permission to this cargo directly
    await db.insert(cargoPermissoes).values({ cargoId: cargo.id, permissaoGlobalId: fakePermId });

    const res = await request(app.server)
      .post(`/api/cargos/${cargo.id}/duplicate`)
      .set('Authorization', `Bearer ${criarToken}`)
      .send({ nomeCargo: `Cópia Com Perms ${Date.now()}`, cor: '#ABCDEF' })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.totalPermissoes).toBe(1);
  });
});

// ── POST /api/cargos/from-template/:templateId — template com permissões (linhas 787-793) ─

describe('POST /api/cargos/from-template — template com permissões', () => {
  it('cria cargo com permissões quando template tem permissões vinculadas (cobre linhas 787-793)', async () => {
    const res = await request(app.server)
      .post(`/api/cargos/from-template/${templateWithPermsId}`)
      .set('Authorization', `Bearer ${criarToken}`)
      .send({ nomeCargo: `Cargo Template Perms ${Date.now()}` })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.totalPermissoes).toBe(1);
  });
});

// ── POST /api/cargos — catch 23505 no DB insert (linhas 183-187) ──────────
// A pre-check em linha 164 normalmente impede duplicatas; para atingir o catch
// precisamos que o pre-check retorne undefined enquanto o DB já tem o registro.

describe('POST /api/cargos — catch de erro 23505 no insert (linhas 183-187)', () => {
  it('retorna 409 quando DB lança erro 23505 (race condition simulada via mock do pre-check)', async () => {
    const nomeCargo = `Cargo Race ${Date.now()}`;

    // Inserir o cargo diretamente no DB com deletedAt=null para criar a colisão
    await db.insert(cargos).values({
      corretoraId,
      nomeCargo,
      isAdmin: false,
      isGestor: false,
      isVendedor: false,
    });

    // Espiar db.query.cargos.findFirst para que retorne undefined (bypassa a pre-check)
    // fazendo com que o insert real atinja o catch de 23505
    const spy = vi.spyOn(db.query.cargos, 'findFirst').mockResolvedValueOnce(undefined as any);

    try {
      const res = await request(app.server)
        .post('/api/cargos')
        .set('Authorization', `Bearer ${criarToken}`)
        .send({ nomeCargo, isGestor: false, isVendedor: false })
        .expect(409);

      expect(res.body.success).toBe(false);
    } finally {
      spy.mockRestore();
    }
  });
});
