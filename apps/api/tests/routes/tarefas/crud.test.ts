import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '@ecotech/shared/database';
import { tarefas } from '@ecotech/shared/database';
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
import { generateTestToken } from '../../helpers/auth.helper';

async function createTarefa(
  corretoraId: string,
  usuarioId: string,
  overrides: Record<string, unknown> = {},
) {
  const [tarefa] = await db
    .insert(tarefas)
    .values({
      corretoraId,
      usuarioId,
      titulo: 'Tarefa de teste',
      prioridade: 'media',
      concluida: false,
      ...overrides,
    })
    .returning();
  return tarefa;
}

describe('/api/tarefas', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let corretoraId: string;
  let usuarioId: string;
  let cargoId: string;
  let token: string;

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

  describe('GET /api/tarefas', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server).get('/api/tarefas').expect(401);
    });

    it('retorna lista vazia quando não há tarefas', async () => {
      const res = await request(app.server)
        .get('/api/tarefas')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it('lista tarefas do usuário logado', async () => {
      const tarefa1 = await createTarefa(corretoraId, usuarioId, { titulo: 'Tarefa 1' });
      const tarefa2 = await createTarefa(corretoraId, usuarioId, { titulo: 'Tarefa 2' });

      const res = await request(app.server)
        .get('/api/tarefas')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.find((t: any) => t.id === tarefa1.id)).toBeDefined();
      expect(res.body.data.find((t: any) => t.id === tarefa2.id)).toBeDefined();
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('filtra por concluida=false', async () => {
      const tarefaNaoConcluida = await createTarefa(corretoraId, usuarioId, { concluida: false });
      const tarefaConcluida = await createTarefa(corretoraId, usuarioId, { concluida: true });

      const res = await request(app.server)
        .get('/api/tarefas?concluida=false')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.find((t: any) => t.id === tarefaNaoConcluida.id)).toBeDefined();
      expect(res.body.data.find((t: any) => t.id === tarefaConcluida.id)).toBeUndefined();
      expect(res.body.data.every((t: any) => t.concluida === false)).toBe(true);
    });

    it('filtra por concluida=true', async () => {
      const tarefaNaoConcluida = await createTarefa(corretoraId, usuarioId, { concluida: false });
      const tarefaConcluida = await createTarefa(corretoraId, usuarioId, { concluida: true });

      const res = await request(app.server)
        .get('/api/tarefas?concluida=true')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.find((t: any) => t.id === tarefaConcluida.id)).toBeDefined();
      expect(res.body.data.find((t: any) => t.id === tarefaNaoConcluida.id)).toBeUndefined();
      expect(res.body.data.every((t: any) => t.concluida === true)).toBe(true);
    });

    it('filtra por prioridade', async () => {
      const tarefaAlta = await createTarefa(corretoraId, usuarioId, { prioridade: 'alta' });
      const tarefaBaixa = await createTarefa(corretoraId, usuarioId, { prioridade: 'baixa' });

      const res = await request(app.server)
        .get('/api/tarefas?prioridade=alta')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.find((t: any) => t.id === tarefaAlta.id)).toBeDefined();
      expect(res.body.data.find((t: any) => t.id === tarefaBaixa.id)).toBeUndefined();
      expect(res.body.data.every((t: any) => t.prioridade === 'alta')).toBe(true);
    });

    it('não retorna tarefas de outro usuário', async () => {
      const outroUsuario = await createTestUsuario(corretoraId, cargoId);
      const tarefaOutro = await createTarefa(corretoraId, outroUsuario.id);

      const res = await request(app.server)
        .get('/api/tarefas')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.find((t: any) => t.id === tarefaOutro.id)).toBeUndefined();
    });

    it('não retorna tarefas deletadas', async () => {
      const tarefaDeletada = await createTarefa(corretoraId, usuarioId, { deletedAt: new Date() });

      const res = await request(app.server)
        .get('/api/tarefas')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.find((t: any) => t.id === tarefaDeletada.id)).toBeUndefined();
    });
  });

  describe('POST /api/tarefas', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post('/api/tarefas')
        .send({ titulo: 'Tarefa', prioridade: 'media' })
        .expect(401);
    });

    it('cria tarefa com dados mínimos', async () => {
      const res = await request(app.server)
        .post('/api/tarefas')
        .set('Authorization', `Bearer ${token}`)
        .send({ titulo: 'Nova tarefa' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.titulo).toBe('Nova tarefa');
      expect(res.body.data.prioridade).toBe('media');
      expect(res.body.data.concluida).toBe(false);
    });

    it('cria tarefa com todos os campos', async () => {
      const dataVencimento = new Date(Date.now() + 86400000).toISOString();
      const res = await request(app.server)
        .post('/api/tarefas')
        .set('Authorization', `Bearer ${token}`)
        .send({
          titulo: 'Tarefa completa',
          descricao: 'Descrição da tarefa',
          prioridade: 'alta',
          dataVencimento,
          entidadeTipo: 'cotacao',
        })
        .expect(201);

      expect(res.body.data.titulo).toBe('Tarefa completa');
      expect(res.body.data.prioridade).toBe('alta');
      expect(res.body.data.descricao).toBe('Descrição da tarefa');
    });

    it('retorna 400 com título vazio', async () => {
      await request(app.server)
        .post('/api/tarefas')
        .set('Authorization', `Bearer ${token}`)
        .send({ titulo: '' })
        .expect(400);
    });

    it('retorna 400 com prioridade inválida', async () => {
      await request(app.server)
        .post('/api/tarefas')
        .set('Authorization', `Bearer ${token}`)
        .send({ titulo: 'Tarefa', prioridade: 'invalida' })
        .expect(400);
    });
  });

  describe('PATCH /api/tarefas/:id', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .patch('/api/tarefas/qualquer-id')
        .send({ titulo: 'Novo título' })
        .expect(401);
    });

    it('atualiza título da tarefa', async () => {
      const tarefa = await createTarefa(corretoraId, usuarioId, {
        titulo: 'Título original',
      });

      const res = await request(app.server)
        .patch(`/api/tarefas/${tarefa.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ titulo: 'Título atualizado' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.titulo).toBe('Título atualizado');
    });

    it('marca tarefa como concluída', async () => {
      const tarefa = await createTarefa(corretoraId, usuarioId, {
        concluida: false,
      });

      const res = await request(app.server)
        .patch(`/api/tarefas/${tarefa.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ concluida: true })
        .expect(200);

      expect(res.body.data.concluida).toBe(true);
      expect(res.body.data.concluidaEm).not.toBeNull();
    });

    it('desmarca tarefa como concluída', async () => {
      const tarefa = await createTarefa(corretoraId, usuarioId, {
        concluida: true,
        concluidaEm: new Date(),
      });

      const res = await request(app.server)
        .patch(`/api/tarefas/${tarefa.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ concluida: false })
        .expect(200);

      expect(res.body.data.concluida).toBe(false);
      expect(res.body.data.concluidaEm).toBeNull();
    });

    it('retorna 404 para tarefa inexistente', async () => {
      await request(app.server)
        .patch('/api/tarefas/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`)
        .send({ titulo: 'X' })
        .expect(404);
    });

    it('retorna 404 para tarefa de outro usuário', async () => {
      const outroUsuario = await createTestUsuario(corretoraId, cargoId);
      const tarefa = await createTarefa(corretoraId, outroUsuario.id);

      await request(app.server)
        .patch(`/api/tarefas/${tarefa.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ titulo: 'Titulo valido' })
        .expect(404);
    });

    it('limpa dataVencimento ao enviar null (cobre linha 140-141 — branch falsy)', async () => {
      const tarefa = await createTarefa(corretoraId, usuarioId, {
        dataVencimento: new Date(Date.now() + 86400000),
      });

      const res = await request(app.server)
        .patch(`/api/tarefas/${tarefa.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ dataVencimento: null })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.dataVencimento).toBeNull();
    });
  });

  describe('PATCH /api/tarefas/:id/concluir', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .patch('/api/tarefas/00000000-0000-0000-0000-000000000000/concluir')
        .send({ concluida: true })
        .expect(401);
    });

    it('conclui tarefa', async () => {
      const tarefa = await createTarefa(corretoraId, usuarioId, {
        concluida: false,
      });

      const res = await request(app.server)
        .patch(`/api/tarefas/${tarefa.id}/concluir`)
        .set('Authorization', `Bearer ${token}`)
        .send({ concluida: true })
        .expect(200);

      expect(res.body.data.concluida).toBe(true);
      expect(res.body.data.concluidaEm).not.toBeNull();
    });

    it('desconclui tarefa', async () => {
      const tarefa = await createTarefa(corretoraId, usuarioId, {
        concluida: true,
        concluidaEm: new Date(),
      });

      const res = await request(app.server)
        .patch(`/api/tarefas/${tarefa.id}/concluir`)
        .set('Authorization', `Bearer ${token}`)
        .send({ concluida: false })
        .expect(200);

      expect(res.body.data.concluida).toBe(false);
      expect(res.body.data.concluidaEm).toBeNull();
    });

    it('retorna 404 para tarefa inexistente', async () => {
      await request(app.server)
        .patch('/api/tarefas/00000000-0000-0000-0000-000000000000/concluir')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(404);
    });
  });

  describe('DELETE /api/tarefas/:id', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server).delete('/api/tarefas/qualquer-id').expect(401);
    });

    it('exclui tarefa (soft delete)', async () => {
      const tarefa = await createTarefa(corretoraId, usuarioId);

      const res = await request(app.server)
        .delete(`/api/tarefas/${tarefa.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);

      // Não deve aparecer na listagem
      const listRes = await request(app.server)
        .get('/api/tarefas')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(listRes.body.data.find((t: any) => t.id === tarefa.id)).toBeUndefined();
    });

    it('retorna 404 para tarefa inexistente', async () => {
      await request(app.server)
        .delete('/api/tarefas/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('retorna 404 para tarefa de outro usuário', async () => {
      const outroUsuario = await createTestUsuario(corretoraId, cargoId);
      const tarefa = await createTarefa(corretoraId, outroUsuario.id);

      await request(app.server)
        .delete(`/api/tarefas/${tarefa.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });
});
