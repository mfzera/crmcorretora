import request from 'supertest';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { db } from '@ecotech/shared/database';
import { corretoras, permissoesGlobais } from '@ecotech/shared/database';
import { buildTestApp } from '../../helpers/app.helper';
import { cleanDatabase } from '../../setup/test-setup';
import { createTestPlano } from '../../helpers/factories/corretora.factory';

describe('POST /api/auth/register-corretora', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let planoId: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await cleanDatabase();
    const plano = await createTestPlano();
    planoId = plano.id;

    // Seed real permissions so CARGOS_PADRAO permission assignment branches are covered
    // (lines 158-164, 185-191, 212-218 in auth/index.ts)
    const permNames = ['dashboard:visualizar', 'vendas:criar_cotacao', 'cadastro:acessar'];
    for (const nome of permNames) {
      const existing = await db.query.permissoesGlobais.findFirst({
        where: (p, { eq }) => eq(p.nomePermissao, nome),
      });
      if (!existing) {
        await db.insert(permissoesGlobais).values({
          nomePermissao: nome,
          descricao: `Permissão ${nome} para testes`,
          grupo: nome.split(':')[0],
        });
      }
    }
  });

  beforeEach(async () => {
    await db.delete(corretoras);
  });

  it('registra nova corretora com dados válidos', async () => {
    const ts = Date.now();
    const res = await request(app.server)
      .post('/api/auth/register-corretora')
      .send({
        razaoSocial: `Corretora Teste ${ts}`,
        nomeFantasia: `CT ${ts}`,
        cnpj: '11222333000181',
        subdominio: `ct-${ts}`,
        emailDono: `dono.${ts}@corretora.com`,
        nomeDono: 'Dono Teste',
        senhaDono: 'Senha@Teste123',
        telefone: '11999999999',
        planoId,
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.corretora.id).toBeDefined();
    expect(res.body.data.corretora.status).toBe('TRIAL');
    expect(res.body.data.usuario.email).toBe(`dono.${ts}@corretora.com`);
  });

  it('retorna 400 para CNPJ inválido', async () => {
    const ts = Date.now();
    await request(app.server)
      .post('/api/auth/register-corretora')
      .send({
        razaoSocial: `Corretora ${ts}`,
        cnpj: '00000000000000',
        subdominio: `ct-${ts}`,
        emailDono: `dono.${ts}@corretora.com`,
        nomeDono: 'Dono',
        senhaDono: 'Senha@Teste123',
        planoId,
      })
      .expect(400);
  });

  it('retorna 409 para CNPJ já cadastrado', async () => {
    const ts = Date.now();
    const payload = {
      razaoSocial: `Corretora ${ts}`,
      cnpj: '11222333000181',
      subdominio: `ct-${ts}`,
      emailDono: `dono.${ts}@corretora.com`,
      nomeDono: 'Dono',
      senhaDono: 'Senha@Teste123',
      planoId,
    };

    await request(app.server)
      .post('/api/auth/register-corretora')
      .send(payload)
      .expect(201);

    await request(app.server)
      .post('/api/auth/register-corretora')
      .send({ ...payload, subdominio: `ct-${ts}-2`, emailDono: `dono2.${ts}@corretora.com` })
      .expect(409);
  });

  it('retorna 409 para subdomínio já em uso', async () => {
    const ts = Date.now();
    const subdominio = `ct-${ts}`;

    await request(app.server)
      .post('/api/auth/register-corretora')
      .send({
        razaoSocial: `Corretora ${ts}`,
        cnpj: '11222333000181',
        subdominio,
        emailDono: `dono1.${ts}@corretora.com`,
        nomeDono: 'Dono 1',
        senhaDono: 'Senha@Teste123',
        planoId,
      })
      .expect(201);

    await request(app.server)
      .post('/api/auth/register-corretora')
      .send({
        razaoSocial: `Corretora ${ts}-2`,
        cnpj: '11444777000161',
        subdominio,
        emailDono: `dono2.${ts}@corretora.com`,
        nomeDono: 'Dono 2',
        senhaDono: 'Senha@Teste123',
        planoId,
      })
      .expect(409);
  });

  it('retorna 400 para plano inexistente', async () => {
    const ts = Date.now();
    await request(app.server)
      .post('/api/auth/register-corretora')
      .send({
        razaoSocial: `Corretora ${ts}`,
        cnpj: '11222333000181',
        subdominio: `ct-${ts}`,
        emailDono: `dono.${ts}@corretora.com`,
        nomeDono: 'Dono',
        senhaDono: 'Senha@Teste123',
        planoId: '00000000-0000-0000-0000-000000000000',
      })
      .expect(400);
  });
});
