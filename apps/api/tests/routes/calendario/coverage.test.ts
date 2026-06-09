import request from 'supertest';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { db } from '@ecotech/shared/database';
import { oportunidades } from '@ecotech/shared/database';
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

describe('/api/calendario — coverage', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let corretoraId: string;
  let usuarioId: string;
  let token: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await cleanDatabase();
    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    corretoraId = corretora.id;
    const cargo = await createAdminCargo(corretoraId);
    const usuario = await createTestUsuario(corretoraId, cargo.id);
    usuarioId = usuario.id;

    token = generateTestToken(app, {
      sub: usuarioId,
      corretoraId,
      cargoId: cargo.id,
      isAdmin: true,
      isGestor: false,
      isVendedor: true,
      permissoes: [],
      nome: usuario.nome,
      email: usuario.email,
      avatarUrl: null,
    });
  });

  beforeEach(async () => {
    await db.delete(oportunidades);
  });

  describe('GET /api/calendario — oportunidades (linhas 224-239)', () => {
    it('inclui oportunidades como eventos do calendário', async () => {
      await db.insert(oportunidades).values({
        corretoraId,
        vendedorId: usuarioId,
        vendedorOriginalId: usuarioId,
        nomeCliente: 'Cliente Cal',
        status: 'lead',
        prioridade: 'baixa',
        temperatura: 'morno',
        ordem: 1,
        dataVencimento: new Date('2026-03-15T12:00:00.000Z'),
      });

      const res = await request(app.server)
        .get('/api/calendario?mes=2026-03')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.resumo.oportunidades).toBeGreaterThanOrEqual(1);
      expect(res.body.data.eventos['2026-03-15']).toBeDefined();

      const evento = res.body.data.eventos['2026-03-15'].find(
        (e: any) => e.tipo === 'oportunidade',
      );
      expect(evento).toBeDefined();
      expect(evento.titulo).toBe('Cliente Cal');
      expect(evento.meta.status).toBe('lead');
      expect(evento.meta.prioridade).toBe('baixa');
    });

    it('não inclui oportunidades já ganhas ou perdidas', async () => {
      await db.insert(oportunidades).values([
        {
          corretoraId,
          vendedorId: usuarioId,
          vendedorOriginalId: usuarioId,
          nomeCliente: 'Cliente Ganho',
          status: 'ganha',
          prioridade: 'alta',
          temperatura: 'quente',
          ordem: 1,
          dataVencimento: new Date('2026-03-10T12:00:00.000Z'),
        },
        {
          corretoraId,
          vendedorId: usuarioId,
          vendedorOriginalId: usuarioId,
          nomeCliente: 'Cliente Perdido',
          status: 'perdida',
          prioridade: 'baixa',
          temperatura: 'frio',
          ordem: 2,
          dataVencimento: new Date('2026-03-11T12:00:00.000Z'),
        },
      ]);

      const res = await request(app.server)
        .get('/api/calendario?mes=2026-03')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.resumo.oportunidades).toBe(0);
    });

    it('não inclui oportunidades sem dataVencimento', async () => {
      await db.insert(oportunidades).values({
        corretoraId,
        vendedorId: usuarioId,
        vendedorOriginalId: usuarioId,
        nomeCliente: 'Cliente Sem Vencimento',
        status: 'lead',
        prioridade: 'media',
        temperatura: 'morno',
        ordem: 1,
      });

      const res = await request(app.server)
        .get('/api/calendario?mes=2026-03')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.resumo.oportunidades).toBe(0);
    });

    it('inclui premioEstimado como número quando oportunidade tem premioEstimado', async () => {
      await db.insert(oportunidades).values({
        corretoraId,
        vendedorId: usuarioId,
        vendedorOriginalId: usuarioId,
        nomeCliente: 'Cliente Premium',
        status: 'negociacao',
        prioridade: 'alta',
        temperatura: 'quente',
        ordem: 1,
        dataVencimento: new Date('2026-03-20T12:00:00.000Z'),
        premioEstimado: '1500.00',
      });

      const res = await request(app.server)
        .get('/api/calendario?mes=2026-03')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const evento = res.body.data.eventos['2026-03-20']?.find(
        (e: any) => e.tipo === 'oportunidade',
      );
      expect(evento).toBeDefined();
      expect(typeof evento.meta.premioEstimado).toBe('number');
      expect(evento.meta.premioEstimado).toBe(1500);
    });

    it('filtra por tipo oportunidades explicitamente', async () => {
      await db.insert(oportunidades).values({
        corretoraId,
        vendedorId: usuarioId,
        vendedorOriginalId: usuarioId,
        nomeCliente: 'Cliente Opp Filter',
        status: 'contato_inicial',
        prioridade: 'media',
        temperatura: 'morno',
        ordem: 1,
        dataVencimento: new Date('2026-03-25T12:00:00.000Z'),
      });

      const res = await request(app.server)
        .get('/api/calendario?mes=2026-03&tipos=oportunidades')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.resumo.oportunidades).toBeGreaterThanOrEqual(1);
      expect(res.body.data.resumo.tarefas).toBe(0);
      expect(res.body.data.resumo.renovacoes).toBe(0);
    });
  });
});
