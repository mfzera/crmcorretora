import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
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
import { createTestClientePF } from '../../helpers/factories/cliente.factory';
import { generateTestToken } from '../../helpers/auth.helper';

describe('Clientes — update, delete, enderecos, contatos, buscar', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let corretoraId: string;
  let adminId: string;
  let adminToken: string;
  let adminTokenBuscar: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await cleanDatabase();
    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    corretoraId = corretora.id;
    const cargo = await createAdminCargo(corretoraId);
    const admin = await createTestUsuario(corretoraId, cargo.id);
    adminId = admin.id;

    adminToken = generateTestToken(app, {
      sub: admin.id,
      corretoraId,
      cargoId: cargo.id,
      isAdmin: true,
      isGestor: false,
      isVendedor: false,
      permissoes: [],
      nome: admin.nome,
      email: admin.email,
      avatarUrl: null,
    });

    adminTokenBuscar = generateTestToken(app, {
      sub: admin.id,
      corretoraId,
      cargoId: cargo.id,
      isAdmin: true,
      isGestor: false,
      isVendedor: false,
      permissoes: ['clientes:visualizar_todos'],
      nome: admin.nome,
      email: admin.email,
      avatarUrl: null,
    });
  });

  // ── PATCH /api/clientes/:id ──────────────────────────────────────────────────

  describe('PATCH /api/clientes/:id', () => {
    it('atualiza nome do cliente', async () => {
      const cliente = await createTestClientePF(corretoraId, adminId);

      const res = await request(app.server)
        .patch(`/api/clientes/${cliente.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nome: 'Nome Atualizado' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.nome).toBe('Nome Atualizado');
    });

    it('atualiza campos opcionais (email, telefone, celular)', async () => {
      const cliente = await createTestClientePF(corretoraId, adminId);

      const res = await request(app.server)
        .patch(`/api/clientes/${cliente.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'novo@email.com', telefone: '11987654321' })
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('aceita reenvio do mesmo CPF (no-op, não quebra edit)', async () => {
      const cliente = await createTestClientePF(corretoraId, adminId);

      const res = await request(app.server)
        .patch(`/api/clientes/${cliente.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nome: 'Nome Alterado', cpf: cliente.cpf })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.cpf).toBe(cliente.cpf);
      expect(res.body.data.nome).toBe('Nome Alterado');
    });

    it('rejeita alteração de CPF para valor diferente (imutabilidade)', async () => {
      const cliente = await createTestClientePF(corretoraId, adminId);
      const novoCpf = '52998224725'; // CPF válido

      const res = await request(app.server)
        .patch(`/api/clientes/${cliente.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ cpf: novoCpf })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error?.message || res.body.message).toMatch(
        /não pode ser alterado/i,
      );
    });

    it('permite setar CPF quando cliente PF ainda não possui', async () => {
      const cliente = await createTestClientePF(corretoraId, adminId, {
        cpf: '',
      });
      const cpfValido = '52998224725';

      const res = await request(app.server)
        .patch(`/api/clientes/${cliente.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ cpf: cpfValido })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.cpf).toBe(cpfValido);
    });

    it('rejeita CPF inválido ao preencher cliente sem documento', async () => {
      const cliente = await createTestClientePF(corretoraId, adminId, {
        cpf: '',
      });

      const res = await request(app.server)
        .patch(`/api/clientes/${cliente.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ cpf: '11111111111' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error?.message || res.body.message).toMatch(/cpf/i);
    });

    it('retorna 403 quando vendedor tenta editar cliente de outro vendedor', async () => {
      const cargo2 = await createTestCargo(corretoraId, {
        permissoes: ['clientes:editar', 'clientes:visualizar'],
      });
      const outroVendedor = await createTestUsuario(corretoraId, cargo2.id);
      const tokenOutro = generateTestToken(app, {
        sub: outroVendedor.id,
        corretoraId,
        cargoId: cargo2.id,
        isAdmin: false,
        isGestor: false,
        isVendedor: true,
        permissoes: ['clientes:editar', 'clientes:visualizar'],
        nome: outroVendedor.nome,
        email: outroVendedor.email,
        avatarUrl: null,
      });

      // Cliente pertence ao admin, não ao outroVendedor
      const cliente = await createTestClientePF(corretoraId, adminId);

      await request(app.server)
        .patch(`/api/clientes/${cliente.id}`)
        .set('Authorization', `Bearer ${tokenOutro}`)
        .send({ nome: 'Tentativa' })
        .expect(403);
    });

    it('retorna 404 para cliente inexistente', async () => {
      await request(app.server)
        .patch('/api/clientes/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nome: 'X' })
        .expect(404);
    });

    it('retorna 401 sem token', async () => {
      const cliente = await createTestClientePF(corretoraId, adminId);

      await request(app.server)
        .patch(`/api/clientes/${cliente.id}`)
        .send({ nome: 'X' })
        .expect(401);
    });
  });

  // ── DELETE /api/clientes/:id ─────────────────────────────────────────────────

  describe('DELETE /api/clientes/:id', () => {
    it('exclui cliente (soft delete)', async () => {
      const cliente = await createTestClientePF(corretoraId, adminId);

      const res = await request(app.server)
        .delete(`/api/clientes/${cliente.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);

      // Deve retornar 404 após exclusão
      await request(app.server)
        .get(`/api/clientes/${cliente.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('retorna 404 para cliente inexistente', async () => {
      await request(app.server)
        .delete('/api/clientes/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('retorna 401 sem token', async () => {
      const cliente = await createTestClientePF(corretoraId, adminId);

      await request(app.server)
        .delete(`/api/clientes/${cliente.id}`)
        .expect(401);
    });
  });

  // ── POST /api/clientes/:id/enderecos ─────────────────────────────────────────

  describe('POST /api/clientes/:id/enderecos', () => {
    it('adiciona endereço ao cliente', async () => {
      const cliente = await createTestClientePF(corretoraId, adminId);

      const res = await request(app.server)
        .post(`/api/clientes/${cliente.id}/enderecos`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          logradouro: 'Rua Teste',
          numero: '123',
          bairro: 'Centro',
          cidade: 'São Paulo',
          estado: 'SP',
          cep: '01001000',
          principal: true,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.logradouro).toBe('Rua Teste');
    });

    it('retorna 404 para cliente inexistente', async () => {
      await request(app.server)
        .post('/api/clientes/00000000-0000-0000-0000-000000000000/enderecos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ logradouro: 'Rua X', numero: '1', bairro: 'X', cidade: 'X', estado: 'SP', cep: '00000000' })
        .expect(404);
    });
  });

  // ── POST /api/clientes/:id/contatos ──────────────────────────────────────────

  describe('POST /api/clientes/:id/contatos', () => {
    it('adiciona contato ao cliente', async () => {
      const cliente = await createTestClientePF(corretoraId, adminId);

      const res = await request(app.server)
        .post(`/api/clientes/${cliente.id}/contatos`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          tipo: 'TELEFONE',
          valor: '11999999999',
          descricao: 'Celular pessoal',
          principal: true,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.valor).toBe('11999999999');
    });
  });

  // ── GET /api/clientes/buscar ─────────────────────────────────────────────────

  describe('GET /api/clientes/buscar', () => {
    it('busca cliente por nome', async () => {
      await createTestClientePF(corretoraId, adminId, { nome: 'Joao Testador' });

      const res = await request(app.server)
        .get('/api/clientes/buscar?q=Joao')
        .set('Authorization', `Bearer ${adminTokenBuscar}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('retorna array vazio para query menor que 3 caracteres', async () => {
      const res = await request(app.server)
        .get('/api/clientes/buscar?q=Jo')
        .set('Authorization', `Bearer ${adminTokenBuscar}`)
        .expect(200);

      expect(res.body.data).toEqual([]);
    });

    it('retorna 401 sem token', async () => {
      await request(app.server)
        .get('/api/clientes/buscar?q=Joao')
        .expect(401);
    });
  });
});
