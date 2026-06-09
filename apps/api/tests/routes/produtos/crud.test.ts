import request from 'supertest';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { db } from '@ecotech/shared/database';
import { produtos } from '@ecotech/shared/database';
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

async function createProduto(
  corretoraId: string,
  overrides: Record<string, unknown> = {},
) {
  const ts = Date.now();
  const [produto] = await db
    .insert(produtos)
    .values({
      corretoraId,
      nomeProduto: `Produto Teste ${ts}`,
      tipoSeguro: 'AUTO',
      ativo: true,
      ...overrides,
    })
    .returning();
  return produto;
}

describe('/api/produtos', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let corretoraId: string;
  let usuarioId: string;
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
    const usuario = await createTestUsuario(corretoraId, cargo.id);
    usuarioId = usuario.id;

    adminToken = generateTestToken(app, {
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

  describe('POST /api/produtos', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post('/api/produtos')
        .send({ nomeProduto: 'Produto', tipoSeguro: 'AUTO' })
        .expect(401);
    });

    it('retorna 403 sem permissão config:gerenciar_produtos', async () => {
      const cargo = await createTestCargo(corretoraId, {
        permissoes: ['clientes:visualizar'],
      });
      const usuario = await createTestUsuario(corretoraId, cargo.id);
      const tokenSemPermissao = generateTestToken(app, {
        sub: usuario.id,
        corretoraId,
        cargoId: cargo.id,
        isAdmin: false,
        isGestor: false,
        isVendedor: false,
        permissoes: ['clientes:visualizar'],
        nome: usuario.nome,
        email: usuario.email,
        avatarUrl: null,
      });

      await request(app.server)
        .post('/api/produtos')
        .set('Authorization', `Bearer ${tokenSemPermissao}`)
        .send({ nomeProduto: 'Produto', tipoSeguro: 'AUTO' })
        .expect(403);
    });

    it('cria produto com dados mínimos', async () => {
      const res = await request(app.server)
        .post('/api/produtos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nomeProduto: 'Seguro Auto Premium', tipoSeguro: 'AUTO' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.nomeProduto).toBe('Seguro Auto Premium');
      expect(res.body.data.tipoSeguro).toBe('AUTO');
      expect(res.body.data.ativo).toBe(true);
    });

    it('cria produto com todos os campos', async () => {
      const res = await request(app.server)
        .post('/api/produtos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nomeProduto: 'Seguro Vida Familiar',
          tipoSeguro: 'VIDA',
          descricao: 'Seguro de vida completo',
          premioMinimo: 100,
          premioMaximo: 5000,
          percentualComissaoPadrao: 15,
        })
        .expect(201);

      expect(res.body.data.nomeProduto).toBe('Seguro Vida Familiar');
      expect(res.body.data.tipoSeguro).toBe('VIDA');
    });

    it('retorna 409 quando nome já existe na corretora', async () => {
      await createProduto(corretoraId, { nomeProduto: 'Nome Duplicado' });

      await request(app.server)
        .post('/api/produtos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nomeProduto: 'Nome Duplicado', tipoSeguro: 'AUTO' })
        .expect(409);
    });

    it('retorna 400 com nome muito curto', async () => {
      await request(app.server)
        .post('/api/produtos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nomeProduto: 'X', tipoSeguro: 'AUTO' })
        .expect(400);
    });

    it('retorna 400 com tipoSeguro inválido', async () => {
      await request(app.server)
        .post('/api/produtos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nomeProduto: 'Produto válido', tipoSeguro: 'INVALIDO' })
        .expect(400);
    });
  });

  describe('GET /api/produtos', () => {
    beforeEach(async () => {
      await db.delete(produtos);
    });

    it('retorna 401 sem token', async () => {
      await request(app.server).get('/api/produtos').expect(401);
    });

    it('retorna lista vazia quando não há produtos', async () => {
      const res = await request(app.server)
        .get('/api/produtos')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.data).toEqual([]);
      expect(res.body.data.total).toBe(0);
    });

    it('lista produtos da corretora', async () => {
      const produtoA = await createProduto(corretoraId, { nomeProduto: 'Produto A' });
      const produtoB = await createProduto(corretoraId, { nomeProduto: 'Produto B' });

      const res = await request(app.server)
        .get('/api/produtos')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.data.find((p: any) => p.id === produtoA.id)).toBeDefined();
      expect(res.body.data.data.find((p: any) => p.id === produtoB.id)).toBeDefined();
      expect(res.body.data.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.data.total).toBeGreaterThanOrEqual(2);
    });

    it('filtra por tipoSeguro', async () => {
      await createProduto(corretoraId, {
        nomeProduto: 'Seguro Auto',
        tipoSeguro: 'AUTO',
      });
      const produtoVida = await createProduto(corretoraId, {
        nomeProduto: 'Seguro Vida',
        tipoSeguro: 'VIDA',
      });

      const res = await request(app.server)
        .get('/api/produtos?tipoSeguro=VIDA')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.data.find((p: any) => p.id === produtoVida.id)).toBeDefined();
      expect(res.body.data.data.every((p: any) => p.tipoSeguro === 'VIDA')).toBe(true);
    });

    it('filtra por ativo', async () => {
      const produtoAtivo = await createProduto(corretoraId, {
        nomeProduto: 'Produto Ativo',
        ativo: true,
      });
      const produtoInativo = await createProduto(corretoraId, {
        nomeProduto: 'Produto Inativo',
        ativo: false,
      });

      const resAtivo = await request(app.server)
        .get('/api/produtos?ativo=true')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(resAtivo.body.data.data.find((p: any) => p.id === produtoAtivo.id)).toBeDefined();
      expect(resAtivo.body.data.data.find((p: any) => p.id === produtoInativo.id)).toBeUndefined();
      expect(resAtivo.body.data.data.every((p: any) => p.ativo === true)).toBe(true);
    });

    it('filtra por busca (nome)', async () => {
      const produtoResidencial = await createProduto(corretoraId, { nomeProduto: 'Seguro Residencial' });
      await createProduto(corretoraId, { nomeProduto: 'Seguro Empresarial' });

      const res = await request(app.server)
        .get('/api/produtos?busca=Residencial')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.data.find((p: any) => p.id === produtoResidencial.id)).toBeDefined();
      expect(res.body.data.data.every((p: any) => p.nomeProduto.includes('Residencial'))).toBe(true);
    });

    it('não retorna produtos deletados', async () => {
      const produtoDeletado = await createProduto(corretoraId, { deletedAt: new Date() });

      const res = await request(app.server)
        .get('/api/produtos')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.data.find((p: any) => p.id === produtoDeletado.id)).toBeUndefined();
    });

    it('não retorna produtos de outra corretora', async () => {
      const plano2 = await createTestPlano();
      const corretora2 = await createTestCorretora(plano2.id);
      const produtoOutra = await createProduto(corretora2.id);

      const res = await request(app.server)
        .get('/api/produtos')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.data.find((p: any) => p.id === produtoOutra.id)).toBeUndefined();
    });
  });

  describe('GET /api/produtos/:id', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server).get('/api/produtos/qualquer-id').expect(401);
    });

    it('retorna produto por ID', async () => {
      const produto = await createProduto(corretoraId, {
        nomeProduto: 'Meu Produto',
      });

      const res = await request(app.server)
        .get(`/api/produtos/${produto.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(produto.id);
      expect(res.body.data.nomeProduto).toBe('Meu Produto');
    });

    it('retorna 404 para produto inexistente', async () => {
      await request(app.server)
        .get('/api/produtos/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('retorna 404 para produto de outra corretora', async () => {
      const plano2 = await createTestPlano();
      const corretora2 = await createTestCorretora(plano2.id);
      const produto = await createProduto(corretora2.id);

      await request(app.server)
        .get(`/api/produtos/${produto.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('PATCH /api/produtos/:id', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .patch('/api/produtos/qualquer-id')
        .send({ nomeProduto: 'Novo' })
        .expect(401);
    });

    it('retorna 403 sem permissão config:gerenciar_produtos', async () => {
      const produto = await createProduto(corretoraId);
      const cargo = await createTestCargo(corretoraId, {
        permissoes: ['clientes:visualizar'],
      });
      const usuario = await createTestUsuario(corretoraId, cargo.id);
      const tokenSemPermissao = generateTestToken(app, {
        sub: usuario.id,
        corretoraId,
        cargoId: cargo.id,
        isAdmin: false,
        isGestor: false,
        isVendedor: false,
        permissoes: ['clientes:visualizar'],
        nome: usuario.nome,
        email: usuario.email,
        avatarUrl: null,
      });

      await request(app.server)
        .patch(`/api/produtos/${produto.id}`)
        .set('Authorization', `Bearer ${tokenSemPermissao}`)
        .send({ nomeProduto: 'Novo' })
        .expect(403);
    });

    it('atualiza produto', async () => {
      const produto = await createProduto(corretoraId, {
        nomeProduto: 'Produto Original',
      });

      const res = await request(app.server)
        .patch(`/api/produtos/${produto.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nomeProduto: 'Produto Atualizado', ativo: false })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.nomeProduto).toBe('Produto Atualizado');
      expect(res.body.data.ativo).toBe(false);
    });

    it('retorna 409 ao renomear para nome já existente', async () => {
      await createProduto(corretoraId, { nomeProduto: 'Produto Existente' });
      const produto = await createProduto(corretoraId, {
        nomeProduto: 'Produto Para Renomear',
      });

      await request(app.server)
        .patch(`/api/produtos/${produto.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nomeProduto: 'Produto Existente' })
        .expect(409);
    });

    it('retorna 404 para produto inexistente', async () => {
      await request(app.server)
        .patch('/api/produtos/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nomeProduto: 'Nome Valido' })
        .expect(404);
    });

    it('limpa percentualComissaoPadrao, premioMinimo e premioMaximo ao enviar null (cobre linha 283)', async () => {
      const produto = await createProduto(corretoraId, {
        percentualComissaoPadrao: '10.5',
        premioMinimo: '100',
        premioMaximo: '5000',
      });

      const res = await request(app.server)
        .patch(`/api/produtos/${produto.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          percentualComissaoPadrao: null,
          premioMinimo: null,
          premioMaximo: null,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.percentualComissaoPadrao).toBeNull();
      expect(res.body.data.premioMinimo).toBeNull();
      expect(res.body.data.premioMaximo).toBeNull();
    });
  });

  describe('DELETE /api/produtos/:id', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server).delete('/api/produtos/qualquer-id').expect(401);
    });

    it('retorna 403 sem permissão config:gerenciar_produtos', async () => {
      const produto = await createProduto(corretoraId);
      const cargo = await createTestCargo(corretoraId, {
        permissoes: ['clientes:visualizar'],
      });
      const usuario = await createTestUsuario(corretoraId, cargo.id);
      const tokenSemPermissao = generateTestToken(app, {
        sub: usuario.id,
        corretoraId,
        cargoId: cargo.id,
        isAdmin: false,
        isGestor: false,
        isVendedor: false,
        permissoes: ['clientes:visualizar'],
        nome: usuario.nome,
        email: usuario.email,
        avatarUrl: null,
      });

      await request(app.server)
        .delete(`/api/produtos/${produto.id}`)
        .set('Authorization', `Bearer ${tokenSemPermissao}`)
        .expect(403);
    });

    it('exclui produto (soft delete)', async () => {
      const produto = await createProduto(corretoraId);

      const res = await request(app.server)
        .delete(`/api/produtos/${produto.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);

      // Não deve aparecer na listagem
      await request(app.server)
        .get(`/api/produtos/${produto.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('retorna 404 para produto inexistente', async () => {
      await request(app.server)
        .delete('/api/produtos/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
