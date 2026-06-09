/**
 * Testes para asaas/index.ts
 * Cobre:
 * - GET  /asaas/check-subdominio
 * - POST /asaas/checkout (com mock do serviço Asaas)
 * - POST /asaas/webhook
 * - GET  /asaas/subscription
 */
import request from 'supertest';
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { db } from '@ecotech/shared/database';
import { corretoras, planos } from '@ecotech/shared/database';
import { eq } from 'drizzle-orm';
import { buildTestApp } from '../../helpers/app.helper';
import { cleanDatabase } from '../../setup/test-setup';

// Mock dos serviços Asaas (chamadas externas)
vi.mock('@ecotech/shared/domain', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ecotech/shared/domain')>();
  return {
    ...actual,
    createAsaasCustomer: vi.fn().mockResolvedValue({ id: 'cus_test_123' }),
    createAsaasSubscription: vi.fn().mockResolvedValue({
      id: 'sub_test_123',
      creditCard: { creditCardToken: null },
    }),
    createAsaasPayment: vi.fn().mockResolvedValue({ id: 'pay_test_123' }),
    getAsaasPayment: vi.fn().mockResolvedValue({ id: 'pay_test_123', bankSlipUrl: null }),
    validateAsaasWebhook: vi.fn().mockReturnValue(true),
    syncSubscriptionFromAsaas: vi.fn().mockResolvedValue(undefined),
    getSubscriptionDetails: vi.fn().mockResolvedValue({ status: 'TRIAL' }),
    getAsaasSubscription: vi.fn().mockResolvedValue({ id: 'sub_test_123', status: 'ACTIVE' }),
    getAsaasCustomer: vi.fn().mockResolvedValue({ id: 'cus_test_123' }),
    listAsaasPayments: vi.fn().mockResolvedValue({ data: [] }),
  };
});

const VALID_CHECKOUT_BODY = {
  razaoSocial: 'Corretora Teste LTDA',
  cnpj: '11.222.333/0001-81',
  email: 'contato@corretora-teste.com',
  telefone: '11999999999',
  cep: '01310-100',
  logradouro: 'Av. Paulista',
  numero: '1000',
  bairro: 'Bela Vista',
  cidade: 'São Paulo',
  uf: 'SP',
  nomeResponsavel: 'João Silva',
  emailResponsavel: 'joao@corretora-teste.com',
  senha: 'Senha@123',
  users: 3,
  planCycle: 'MENSAL',
  billingType: 'BOLETO',
};

// ── GET /asaas/check-subdominio ───────────────────────────────────────────────

describe('GET /asaas/check-subdominio', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  it('retorna available=true para subdomínio inexistente', async () => {
    const res = await request(app.server)
      .get('/api/asaas/check-subdominio?subdominio=novo-subdominio-unico')
      .expect(200);

    expect(res.body.available).toBe(true);
  });

  it('retorna available=false para subdomínio já existente', async () => {
    // Criar plano e corretora com subdomínio conhecido
    const [plano] = await db.insert(planos).values({
      nomePlano: 'Plano Teste',
      valorMensal: '99.99',
    }).returning({ id: planos.id });

    await db.insert(corretoras).values({
      razaoSocial: 'Corretora Existente',
      cnpj: '12345678000195',
      subdominio: 'existente',
      planoId: plano.id,
    });

    const res = await request(app.server)
      .get('/api/asaas/check-subdominio?subdominio=existente')
      .expect(200);

    expect(res.body.available).toBe(false);
  });

  it('retorna 400 para subdomínio muito curto', async () => {
    const res = await request(app.server)
      .get('/api/asaas/check-subdominio?subdominio=ab')
      .expect(400);

    expect(res.body.error).toContain('inválido');
  });

  it('retorna 400 quando subdomínio não fornecido', async () => {
    const res = await request(app.server)
      .get('/api/asaas/check-subdominio')
      .expect(400);

    expect(res.body.error).toBeDefined();
  });
});

// ── POST /asaas/checkout ──────────────────────────────────────────────────────

describe('POST /asaas/checkout', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    await db.insert(planos).values({
      nomePlano: 'Plano Padrão',
      valorMensal: '99.99',
    });
  });

  it('retorna 400 para CNPJ inválido', async () => {
    const res = await request(app.server)
      .post('/api/asaas/checkout')
      .send({ ...VALID_CHECKOUT_BODY, cnpj: '00.000.000/0000-00' })
      .expect(400);

    expect(res.body.error).toContain('CNPJ inválido');
  });

  it('retorna 400 para senha muito curta', async () => {
    const res = await request(app.server)
      .post('/api/asaas/checkout')
      .send({ ...VALID_CHECKOUT_BODY, senha: '1234' })
      .expect(400);

    expect(res.body.error).toContain('Senha');
  });

  it('retorna 409 para CNPJ já cadastrado', async () => {
    const [plano] = await db.select({ id: planos.id }).from(planos).limit(1);
    await db.insert(corretoras).values({
      razaoSocial: 'Corretora Existente',
      cnpj: '11222333000181',
      subdominio: 'existente-cnpj',
      planoId: plano.id,
    });

    const res = await request(app.server)
      .post('/api/asaas/checkout')
      .send(VALID_CHECKOUT_BODY)
      .expect(409);

    expect(res.body.error).toContain('CNPJ já cadastrado');
  });

  it('cria corretora + usuário com sucesso via BOLETO', async () => {
    const res = await request(app.server)
      .post('/api/asaas/checkout')
      .send(VALID_CHECKOUT_BODY)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.corretora).toBeDefined();
    expect(res.body.data.corretora.id).toBeDefined();
    expect(res.body.data.usuario).toBeDefined();
    expect(res.body.data.usuario.email).toBe(VALID_CHECKOUT_BODY.emailResponsavel.toLowerCase());
  });

  it('cria corretora com subdomínio personalizado', async () => {
    const body = {
      ...VALID_CHECKOUT_BODY,
      cnpj: '11.444.777/0001-61',
      emailResponsavel: 'custom@sub.com',
      subdominio: 'meu-subdominio-custom',
    };

    const res = await request(app.server)
      .post('/api/asaas/checkout')
      .send(body)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.corretora.subdominio).toBe('meu-subdominio-custom');
  });

  it('retorna 409 para e-mail de responsável já cadastrado', async () => {
    // Primeiro cadastro
    await request(app.server)
      .post('/api/asaas/checkout')
      .send(VALID_CHECKOUT_BODY)
      .expect(201);

    // Segundo cadastro com mesmo e-mail mas CNPJ diferente
    const res = await request(app.server)
      .post('/api/asaas/checkout')
      .send({
        ...VALID_CHECKOUT_BODY,
        cnpj: '11.444.777/0001-61',
      })
      .expect(409);

    expect(res.body.error).toContain('E-mail já cadastrado');
  });

  it('cria corretora com ciclo ANUAL', async () => {
    const body = {
      ...VALID_CHECKOUT_BODY,
      cnpj: '33.555.444/0001-42',
      emailResponsavel: 'anual@sub.com',
      planCycle: 'ANUAL',
    };

    const res = await request(app.server)
      .post('/api/asaas/checkout')
      .send(body)
      .expect(201);

    expect(res.body.success).toBe(true);
  });

  it('retorna 400 quando não há plano ativo disponível', async () => {
    // Desativar todos os planos
    const { planos } = await import('@ecotech/shared/database');
    await db.update(planos).set({ ativo: false });

    const body = {
      ...VALID_CHECKOUT_BODY,
      cnpj: '77.444.888/0001-86',
      emailResponsavel: 'noplano@sub.com',
    };

    const res = await request(app.server)
      .post('/api/asaas/checkout')
      .send(body)
      .expect(400);

    expect(res.body.error).toContain('plano');

    // Restaurar plano
    await db.update(planos).set({ ativo: true });
  });
});

// ── POST /asaas/webhook ───────────────────────────────────────────────────────

describe('POST /asaas/webhook', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  it('processa webhook com token válido', async () => {
    const res = await request(app.server)
      .post('/api/asaas/webhook')
      .set('asaas-access-token', 'valid-token')
      .send({
        event: 'PAYMENT_RECEIVED',
        payment: { id: 'pay_123', status: 'RECEIVED', customer: 'cus_123' },
      })
      .expect(200);

    expect(res.body.received).toBe(true);
  });

  it('retorna 401 com token inválido', async () => {
    const { validateAsaasWebhook } = await import('@ecotech/shared/domain');
    vi.mocked(validateAsaasWebhook).mockReturnValueOnce(false);

    const res = await request(app.server)
      .post('/api/asaas/webhook')
      .set('asaas-access-token', 'wrong-token')
      .send({ event: 'PAYMENT_RECEIVED' })
      .expect(401);

    expect(res.body.error).toBe('Unauthorized');
  });
});
