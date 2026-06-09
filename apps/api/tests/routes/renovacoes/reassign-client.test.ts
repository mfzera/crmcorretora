import request from 'supertest';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { db, renovacoesComerciais } from '@ecotech/shared/database';
import { buildTestApp } from '../../helpers/app.helper';
import { cleanDatabase } from '../../setup/test-setup';
import { createTestPlano, createTestCorretora } from '../../helpers/factories/corretora.factory';
import { createAdminCargo, createTestUsuario } from '../../helpers/factories/usuario.factory';
import { createTestClientePF, createTestClientePJ } from '../../helpers/factories/cliente.factory';
import { generateTestToken, authHeaders } from '../../helpers/auth.helper';

describe('POST /api/renewals/:id/reassign-client', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  async function setup() {
    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    const cargo = await createAdminCargo(corretora.id);
    const admin = await createTestUsuario(corretora.id, cargo.id);
    const token = generateTestToken(app, {
      sub: admin.id,
      corretoraId: corretora.id,
      cargoId: cargo.id,
      isAdmin: true,
      isGestor: false,
      isVendedor: false,
      permissoes: [],
      nome: admin.nome,
      email: admin.email,
      avatarUrl: null,
    });
    return { corretora, admin, token };
  }

  async function createRenovacaoVencida(corretoraId: string, vendedorId: string, clienteId: string) {
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);
    const [renovacao] = await db
      .insert(renovacoesComerciais)
      .values({
        corretoraId,
        vendedorId,
        clienteId,
        dataVencimento: ontem.toISOString().split('T')[0],
        status: 'NAO_TRABALHADO',
      })
      .returning();
    return renovacao;
  }

  it('após reassign GET /overdue retorna o cliente novo, não o stub original', async () => {
    const { corretora, admin, token } = await setup();

    // Stub PF importado sem CPF (empresa classificada erroneamente como PF)
    const stubPF = await createTestClientePF(corretora.id, admin.id, {
      nome: 'EMPRESA TERRAP -ME',
      cpf: null,
    });

    // Cliente PJ real com CNPJ
    const clientePJ = await createTestClientePJ(corretora.id, admin.id, {
      razaoSocial: 'EMPRESA TERRAPLANAGEM ME',
      cnpj: '09073880000109',
    });

    const renovacao = await createRenovacaoVencida(corretora.id, admin.id, stubPF.id);

    // Reassign para o PJ
    const reassignRes = await request(app.server)
      .post(`/api/renewals/${renovacao.id}/reassign-client`)
      .set(authHeaders(token))
      .send({ novoClienteId: clientePJ.id });

    expect(reassignRes.status).toBe(200);

    // GET /overdue deve refletir o cliente PJ
    const overdueRes = await request(app.server)
      .get('/api/renewals/overdue')
      .set(authHeaders(token));

    expect(overdueRes.status).toBe(200);

    const renovacaoRetornada = overdueRes.body.data.find((r: any) => r.id === renovacao.id);
    expect(renovacaoRetornada).toBeDefined();
    expect(renovacaoRetornada.cliente.id).toBe(clientePJ.id);
    expect(renovacaoRetornada.cliente.tipoPessoa).toBe('PJ');
    expect(renovacaoRetornada.cliente.cnpj).toBe('09073880000109');
  });

  it('stub PF sem CPF pode ser reassigned para cliente PJ (cross-type)', async () => {
    const { corretora, admin, token } = await setup();

    const stubPF = await createTestClientePF(corretora.id, admin.id, { cpf: null });
    const clientePJ = await createTestClientePJ(corretora.id, admin.id);

    const renovacao = await createRenovacaoVencida(corretora.id, admin.id, stubPF.id);

    const res = await request(app.server)
      .post(`/api/renewals/${renovacao.id}/reassign-client`)
      .set(authHeaders(token))
      .send({ novoClienteId: clientePJ.id });

    expect(res.status).toBe(200);
  });

  it('stub PF com CPF consolidado NÃO pode ser reassigned para PJ', async () => {
    const { corretora, admin, token } = await setup();

    // PF com CPF completo — não é stub
    const clientePFReal = await createTestClientePF(corretora.id, admin.id);
    const clientePJ = await createTestClientePJ(corretora.id, admin.id);

    const renovacao = await createRenovacaoVencida(corretora.id, admin.id, clientePFReal.id);

    const res = await request(app.server)
      .post(`/api/renewals/${renovacao.id}/reassign-client`)
      .set(authHeaders(token))
      .send({ novoClienteId: clientePJ.id });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/PF.*PJ|tipo/i);
  });

  it('retorna 400 ao tentar reassign para o mesmo cliente atual', async () => {
    const { corretora, admin, token } = await setup();

    const cliente = await createTestClientePF(corretora.id, admin.id);
    const renovacao = await createRenovacaoVencida(corretora.id, admin.id, cliente.id);

    const res = await request(app.server)
      .post(`/api/renewals/${renovacao.id}/reassign-client`)
      .set(authHeaders(token))
      .send({ novoClienteId: cliente.id });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('cliente atual');
  });
});
