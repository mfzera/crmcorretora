/**
 * Testes para admin/subscriptions.ts
 * Cobre endpoints de gerenciamento de assinaturas de tenants:
 * - GET  /api/admin/subscriptions
 * - GET  /api/admin/subscriptions/:corretoraId
 * - GET  /api/admin/subscriptions/:corretoraId/invoices
 * - PATCH /api/admin/subscriptions/:corretoraId/courtesy-seats
 * - POST /api/admin/subscriptions/:corretoraId/pause
 * - POST /api/admin/subscriptions/:corretoraId/resume
 * - POST /api/admin/subscriptions/:corretoraId/cancel
 * - PATCH /api/admin/subscriptions/:corretoraId/override-plan
 * - PATCH /api/admin/subscriptions/:corretoraId/extend-trial
 */
import request from 'supertest';
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { db } from '@ecotech/shared/database';
import { subscriptions } from '@ecotech/shared/database';
import { eq } from 'drizzle-orm';
import { buildTestApp } from '../../helpers/app.helper';
import { cleanDatabase } from '../../setup/test-setup';
import {
  createTestPlano,
  createTestCorretora,
} from '../../helpers/factories/corretora.factory';

// Mock das funções Asaas (chamadas externas)
vi.mock('@ecotech/shared/domain', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ecotech/shared/domain')>();
  return {
    ...actual,
    getAsaasSubscription: vi.fn().mockResolvedValue({ id: 'sub_asaas_test', status: 'ACTIVE' }),
    getAsaasCustomer: vi.fn().mockResolvedValue({ id: 'cus_asaas_test', name: 'Test Customer' }),
    listAsaasPayments: vi.fn().mockResolvedValue({ data: [] }),
    cancelSubscription: vi.fn().mockResolvedValue(undefined),
    resumeSubscription: vi.fn().mockResolvedValue(undefined),
    setCourtesySeats: vi.fn().mockResolvedValue({ seatsCourtesy: 2 }),
    overrideSubscriptionPlan: vi.fn().mockResolvedValue({ planCycle: 'ANUAL' }),
    extendTrial: vi.fn().mockResolvedValue(undefined),
  };
});

async function createAdminToken(app: Awaited<ReturnType<typeof buildTestApp>>) {
  const createRes = await request(app.server)
    .post('/api/admin/auth/create-first-admin')
    .send({
      email: 'admin.sub@ecotech.com',
      nome: 'Admin Sub',
      senha: 'senha12345',
      permissoes: [
        'view_usage', 'manage_limits', 'view_all_tenants', 'manage_backups',
        'manage_admins', 'view_audit_logs', 'cleanup_files', 'view_changelogs',
        'manage_changelogs', 'manage_tenants', 'view_roadmap', 'manage_roadmap',
        'manage_billing',
      ],
    });

  const loginRes = await request(app.server)
    .post('/api/admin/auth/login')
    .send({ email: 'admin.sub@ecotech.com', senha: 'senha12345' });

  return { token: loginRes.body.token, adminId: createRes.body.admin.id };
}

async function createTestSubscription(corretoraId: string, planoId: string) {
  const [sub] = await db.insert(subscriptions).values({
    corretoraId,
    planoId,
    planCycle: 'MENSAL',
    status: 'TRIAL',
    seatsIncluded: 3,
    seatsUsed: 1,
    seatsAdditional: 0,
    seatsCourtesy: 0,
    basePrice: '299.00',
    pricePerSeat: '49.00',
    totalMonthly: '299.00',
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    trialStart: new Date(),
    trialEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  }).returning();
  return sub;
}

// ── GET /api/admin/subscriptions ──────────────────────────────────────────────

describe('GET /api/admin/subscriptions', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let token: string;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    const result = await createAdminToken(app);
    token = result.token;
  });

  it('retorna lista de assinaturas com sucesso', async () => {
    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    await createTestSubscription(corretora.id, plano.id);

    const res = await request(app.server)
      .get('/api/admin/subscriptions')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.subscriptions)).toBe(true);
    expect(typeof res.body.data.total).toBe('number');
    expect(res.body.data.total).toBeGreaterThanOrEqual(1);
  });

  it('retorna lista vazia quando não há assinaturas', async () => {
    const res = await request(app.server)
      .get('/api/admin/subscriptions')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.subscriptions).toHaveLength(0);
  });

  it('retorna 401 sem token de admin', async () => {
    await request(app.server).get('/api/admin/subscriptions').expect(401);
  });
});

// ── GET /api/admin/subscriptions/:corretoraId ─────────────────────────────────

describe('GET /api/admin/subscriptions/:corretoraId', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let token: string;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    const result = await createAdminToken(app);
    token = result.token;
  });

  it('retorna 404 quando assinatura não encontrada', async () => {
    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);

    const res = await request(app.server)
      .get(`/api/admin/subscriptions/${corretora.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('não encontrada');
  });

  it('retorna detalhes da assinatura com dados ao vivo', async () => {
    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    await createTestSubscription(corretora.id, plano.id);

    const res = await request(app.server)
      .get(`/api/admin/subscriptions/${corretora.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.subscription).toBeDefined();
    expect(res.body.data.currentActiveUsers).toBeGreaterThanOrEqual(0);
  });
});

// ── GET /api/admin/subscriptions/:corretoraId/invoices ────────────────────────

describe('GET /api/admin/subscriptions/:corretoraId/invoices', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let token: string;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    const result = await createAdminToken(app);
    token = result.token;
  });

  it('retorna 404 quando assinatura não encontrada', async () => {
    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);

    const res = await request(app.server)
      .get(`/api/admin/subscriptions/${corretora.id}/invoices`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);

    expect(res.body.error).toContain('não encontrada');
  });

  it('retorna faturas merged quando assinatura existe', async () => {
    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    await createTestSubscription(corretora.id, plano.id);

    const res = await request(app.server)
      .get(`/api/admin/subscriptions/${corretora.id}/invoices`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.invoices)).toBe(true);
    expect(typeof res.body.data.total).toBe('number');
  });
});

// ── PATCH /courtesy-seats ──────────────────────────────────────────────────────

describe('PATCH /api/admin/subscriptions/:corretoraId/courtesy-seats', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let token: string;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    const result = await createAdminToken(app);
    token = result.token;
  });

  it('retorna 404 quando assinatura não encontrada', async () => {
    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);

    const res = await request(app.server)
      .patch(`/api/admin/subscriptions/${corretora.id}/courtesy-seats`)
      .set('Authorization', `Bearer ${token}`)
      .send({ courtesySeats: 2 })
      .expect(404);

    expect(res.body.error).toContain('não encontrada');
  });

  it('atualiza assentos cortesia com sucesso', async () => {
    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    await createTestSubscription(corretora.id, plano.id);

    const res = await request(app.server)
      .patch(`/api/admin/subscriptions/${corretora.id}/courtesy-seats`)
      .set('Authorization', `Bearer ${token}`)
      .send({ courtesySeats: 2, reason: 'Cortesia especial' })
      .expect(200);

    expect(res.body.success).toBe(true);
  });
});

// ── POST /pause, /resume, /cancel ─────────────────────────────────────────────

describe('POST /api/admin/subscriptions/:corretoraId/pause', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let token: string;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    const result = await createAdminToken(app);
    token = result.token;
  });

  it('retorna 404 quando assinatura não encontrada', async () => {
    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);

    const res = await request(app.server)
      .post(`/api/admin/subscriptions/${corretora.id}/pause`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);

    expect(res.body.error).toContain('não encontrada');
  });

  it('pausa assinatura com sucesso', async () => {
    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    await createTestSubscription(corretora.id, plano.id);

    const res = await request(app.server)
      .post(`/api/admin/subscriptions/${corretora.id}/pause`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
  });
});

describe('POST /api/admin/subscriptions/:corretoraId/resume', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let token: string;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    const result = await createAdminToken(app);
    token = result.token;
  });

  it('retorna 404 quando assinatura não encontrada', async () => {
    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);

    const res = await request(app.server)
      .post(`/api/admin/subscriptions/${corretora.id}/resume`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);

    expect(res.body.error).toContain('não encontrada');
  });

  it('retoma assinatura com sucesso', async () => {
    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    await createTestSubscription(corretora.id, plano.id);

    const res = await request(app.server)
      .post(`/api/admin/subscriptions/${corretora.id}/resume`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
  });
});

describe('POST /api/admin/subscriptions/:corretoraId/cancel', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let token: string;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    const result = await createAdminToken(app);
    token = result.token;
  });

  it('retorna 404 quando assinatura não encontrada', async () => {
    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);

    const res = await request(app.server)
      .post(`/api/admin/subscriptions/${corretora.id}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(404);

    expect(res.body.error).toContain('não encontrada');
  });

  it('cancela assinatura ao fim do período', async () => {
    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    await createTestSubscription(corretora.id, plano.id);

    const res = await request(app.server)
      .post(`/api/admin/subscriptions/${corretora.id}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .send({ immediately: false })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('cancela assinatura imediatamente', async () => {
    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    await createTestSubscription(corretora.id, plano.id);

    const res = await request(app.server)
      .post(`/api/admin/subscriptions/${corretora.id}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .send({ immediately: true })
      .expect(200);

    expect(res.body.success).toBe(true);
  });
});

// ── PATCH /override-plan ──────────────────────────────────────────────────────

describe('PATCH /api/admin/subscriptions/:corretoraId/override-plan', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let token: string;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    const result = await createAdminToken(app);
    token = result.token;
  });

  it('retorna 404 quando assinatura não encontrada', async () => {
    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);

    const res = await request(app.server)
      .patch(`/api/admin/subscriptions/${corretora.id}/override-plan`)
      .set('Authorization', `Bearer ${token}`)
      .send({ planCycle: 'ANUAL' })
      .expect(404);

    expect(res.body.error).toContain('não encontrada');
  });

  it('sobrescreve plano com sucesso', async () => {
    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    await createTestSubscription(corretora.id, plano.id);

    const res = await request(app.server)
      .patch(`/api/admin/subscriptions/${corretora.id}/override-plan`)
      .set('Authorization', `Bearer ${token}`)
      .send({ planCycle: 'ANUAL', newValue: 250, reason: 'Desconto especial' })
      .expect(200);

    expect(res.body.success).toBe(true);
  });
});

// ── PATCH /extend-trial ───────────────────────────────────────────────────────

describe('PATCH /api/admin/subscriptions/:corretoraId/extend-trial', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let token: string;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    const result = await createAdminToken(app);
    token = result.token;
  });

  it('retorna 404 quando assinatura não encontrada', async () => {
    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);

    const res = await request(app.server)
      .patch(`/api/admin/subscriptions/${corretora.id}/extend-trial`)
      .set('Authorization', `Bearer ${token}`)
      .send({ trialEndDate: '2026-12-31' })
      .expect(404);

    expect(res.body.error).toContain('não encontrada');
  });

  it('estende trial com sucesso', async () => {
    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    await createTestSubscription(corretora.id, plano.id);

    const res = await request(app.server)
      .patch(`/api/admin/subscriptions/${corretora.id}/extend-trial`)
      .set('Authorization', `Bearer ${token}`)
      .send({ trialEndDate: '2026-12-31' })
      .expect(200);

    expect(res.body.success).toBe(true);
  });
});
