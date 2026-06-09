import request from 'supertest';
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { db } from '@ecotech/shared/database';
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

describe('/api/seguradora', () => {
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

  describe('GET /api/seguradora', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server).get('/api/seguradora').expect(401);
    });

    it('retorna dados da seguradora', async () => {
      const res = await request(app.server)
        .get('/api/seguradora')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(corretoraId);
      expect(res.body.data.razaoSocial).toBeDefined();
      expect(res.body.data.cnpj).toBeDefined();
      expect(res.body.data.plano).toBeDefined();
      expect(res.body.data.plano.limiteUsuarios).toBeDefined();
    });
  });

  describe('PATCH /api/seguradora', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .patch('/api/seguradora')
        .send({ nomeFantasia: 'Novo Nome' })
        .expect(401);
    });

    it('retorna 403 sem permissão config:editar_seguradora', async () => {
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
        .patch('/api/seguradora')
        .set('Authorization', `Bearer ${tokenSemPermissao}`)
        .send({ nomeFantasia: 'Novo Nome' })
        .expect(403);
    });

    it('atualiza dados da seguradora', async () => {
      const res = await request(app.server)
        .patch('/api/seguradora')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nomeFantasia: 'Seguradora Atualizada',
          emailContato: 'contato@seguradora.com',
          telefone: '11999999999',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.nomeFantasia).toBe('Seguradora Atualizada');
      expect(res.body.data.emailContato).toBe('contato@seguradora.com');
    });

    it('atualiza endereço', async () => {
      const res = await request(app.server)
        .patch('/api/seguradora')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          cep: '01310100',
          logradouro: 'Av. Paulista',
          numero: '1000',
          bairro: 'Bela Vista',
          cidade: 'São Paulo',
          uf: 'SP',
        })
        .expect(200);

      expect(res.body.data.cidade).toBe('São Paulo');
      expect(res.body.data.uf).toBe('SP');
    });

    it('atualiza cores do tema', async () => {
      const res = await request(app.server)
        .patch('/api/seguradora')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          coresTema: {
            primary: '#FF6600',
            secondary: '#003366',
          },
        })
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('retorna 400 com email inválido', async () => {
      await request(app.server)
        .patch('/api/seguradora')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ emailContato: 'email-invalido' })
        .expect(400);
    });

    it('retorna 400 com UF de tamanho inválido', async () => {
      await request(app.server)
        .patch('/api/seguradora')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ uf: 'SPP' })
        .expect(400);
    });
  });

  describe('GET /api/seguradora/uso', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server).get('/api/seguradora/uso').expect(401);
    });

    it('retorna métricas de uso', async () => {
      const res = await request(app.server)
        .get('/api/seguradora/uso')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.usuarios).toBeDefined();
      expect(res.body.data.usuarios.atual).toBeTypeOf('number');
      expect(res.body.data.usuarios.limite).toBeDefined();
      expect(res.body.data.vendedores).toBeDefined();
      expect(res.body.data.clientes).toBeDefined();
      expect(res.body.data.vendasMes).toBeDefined();
      expect(res.body.data.plano).toBeDefined();
      expect(res.body.data.plano.nome).toBeDefined();
    });
  });

  describe('POST /api/seguradora/logo', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post('/api/seguradora/logo')
        .send({ logoUrl: 'https://example.com/logo.png' })
        .expect(401);
    });

    it('retorna 403 sem permissão config:editar_seguradora', async () => {
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
        .post('/api/seguradora/logo')
        .set('Authorization', `Bearer ${tokenSemPermissao}`)
        .send({ logoUrl: 'https://example.com/logo.png' })
        .expect(403);
    });

    it('atualiza logo da seguradora', async () => {
      const res = await request(app.server)
        .post('/api/seguradora/logo')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ logoUrl: 'https://cdn.example.com/logo.png' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.logoUrl).toBe('https://cdn.example.com/logo.png');
    });

    it('retorna erro quando logoUrl não é fornecida', async () => {
      const res = await request(app.server)
        .post('/api/seguradora/logo')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(200);

      // A rota retorna success: false (não lança exceção)
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/seguradora - plano null (leftJoin sem match)', () => {
    it('retorna plano null quando leftJoin não encontra plano', async () => {
      // Mock db.select para retornar row com plano: null
      const selectSpy = vi.spyOn(db, 'select').mockReturnValueOnce({
        from: () => ({
          leftJoin: () => ({
            where: () => ({
              limit: () =>
                Promise.resolve([
                  {
                    corretora: {
                      id: corretoraId,
                      razaoSocial: 'Teste',
                      nomeFantasia: null,
                      cnpj: '00000000000000',
                      subdominio: 'teste',
                      emailContato: null,
                      telefone: null,
                      cep: null,
                      logradouro: null,
                      numero: null,
                      complemento: null,
                      bairro: null,
                      cidade: null,
                      uf: null,
                      status: 'ATIVO',
                      dataInicioTrial: null,
                      dataFimTrial: null,
                      logoUrl: null,
                      coresTema: null,
                      createdAt: new Date(),
                    },
                    plano: null,
                  },
                ]),
            }),
          }),
        }),
      } as any);

      const res = await request(app.server)
        .get('/api/seguradora')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.plano).toBeNull();
      selectSpy.mockRestore();
    });
  });

  describe('GET /api/seguradora/uso - limites nulos e plano null', () => {
    let tokenPlanoSemLimite: string;

    beforeAll(async () => {
      const { planos } = await import('@ecotech/shared/database');
      // Criar plano com todos os limites nulos (plano "ilimitado")
      const [planoSemLimite] = await db
        .insert(planos)
        .values({
          nomePlano: `Plano Ilimitado ${Date.now()}`,
          valorMensal: '0',
          limiteUsuarios: null,
          limiteVendedores: null,
          limiteClientes: null,
          limiteVendasMes: null,
          ativo: true,
        })
        .returning();

      const corretoraSemLimite = await createTestCorretora(planoSemLimite.id);
      const cargoSemLimite = await createAdminCargo(corretoraSemLimite.id);
      const usuarioSemLimite = await createTestUsuario(corretoraSemLimite.id, cargoSemLimite.id);

      tokenPlanoSemLimite = generateTestToken(app, {
        sub: usuarioSemLimite.id,
        corretoraId: corretoraSemLimite.id,
        cargoId: cargoSemLimite.id,
        isAdmin: true,
        isGestor: false,
        isVendedor: false,
        permissoes: [],
        nome: usuarioSemLimite.nome,
        email: usuarioSemLimite.email,
        avatarUrl: null,
      });
    });

    it('retorna percentual null quando limites do plano são nulos', async () => {
      const res = await request(app.server)
        .get('/api/seguradora/uso')
        .set('Authorization', `Bearer ${tokenPlanoSemLimite}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.usuarios.percentual).toBeNull();
      expect(res.body.data.usuarios.limite).toBeNull();
      expect(res.body.data.vendedores.percentual).toBeNull();
      expect(res.body.data.vendedores.limite).toBeNull();
      expect(res.body.data.clientes.percentual).toBeNull();
      expect(res.body.data.clientes.limite).toBeNull();
      expect(res.body.data.vendasMes.percentual).toBeNull();
      expect(res.body.data.vendasMes.limite).toBeNull();
    });

    it('retorna plano null em /uso quando leftJoin não encontra plano', async () => {
      const selectSpy = vi.spyOn(db, 'select').mockReturnValueOnce({
        from: () => ({
          leftJoin: () => ({
            where: () => ({
              limit: () =>
                Promise.resolve([
                  {
                    corretora: {
                      id: corretoraId,
                      usuariosAtivos: 0,
                      vendedoresAtivos: 0,
                      clientesCadastrados: 0,
                      vendasMesAtual: 0,
                    },
                    plano: null,
                  },
                ]),
            }),
          }),
        }),
      } as any);

      const res = await request(app.server)
        .get('/api/seguradora/uso')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.plano).toBeNull();
      expect(res.body.data.usuarios.limite).toBeNull();
      expect(res.body.data.usuarios.percentual).toBeNull();
      selectSpy.mockRestore();
    });
  });
});
