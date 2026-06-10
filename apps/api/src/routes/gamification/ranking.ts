import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  db,
  usuarios,
  equipes,
  metas,
  missoes,
  usuarioBadges,
} from '@ecotech/shared/database';
import { eq, and, isNull, gte, lte, sql, desc } from 'drizzle-orm';
import { authorize, requireModule } from '@ecotech/plugins/authorization';
import { rankingDocs } from '../../docs/gamificacao/schemas.js';
import { ok } from '../../docs/index.js';
import { rankingSSE } from '../../services/ranking-sse.js';

const PONTOS_BADGE = 10;
const PONTOS_META = 50;
const PONTOS_MISSAO = 30;

const querySchema = z
  .object({
    dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dataFim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    equipeId: z.string().uuid().optional(),
  })
  .refine(
    (data) => {
      if (!data.dataInicio || !data.dataFim) return true;
      const inicio = new Date(data.dataInicio);
      const fim = new Date(data.dataFim);
      if (fim < inicio) return false;
      // Limite máximo de 366 dias para evitar scans completos
      const diffMs = fim.getTime() - inicio.getTime();
      return diffMs <= 366 * 24 * 60 * 60 * 1000;
    },
    { message: 'Intervalo de datas inválido ou superior a 366 dias' },
  );

function defaultPeriodo(): { inicio: string; fim: string } {
  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
  return {
    inicio: inicio.toISOString().split('T')[0],
    fim: fim.toISOString().split('T')[0],
  };
}

const rankingRoutes: FastifyPluginAsyncZod = async function (fastify) {
  fastify.addHook('preHandler', fastify.authenticate);
  fastify.addHook('preHandler', requireModule('gamificacao'));

  // SSE — mantém conexão aberta e emite 'ranking-updated' quando há novos dados
  fastify.get(
    '/events',
    { preHandler: [authorize(['workspace:acessar'])] },
    async (request, reply) => {
      reply.hijack();
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      });
      reply.raw.write(':ok\n\n');

      const corretoraId = request.corretoraId;
      rankingSSE.add(corretoraId, reply.raw);

      const keepAlive = setInterval(() => {
        try { reply.raw.write(':ping\n\n'); } catch { /* conexão fechada */ }
      }, 25_000);

      await new Promise<void>((resolve) => {
        request.raw.on('close', () => {
          clearInterval(keepAlive);
          rankingSSE.remove(corretoraId, reply.raw);
          resolve();
        });
      });
    },
  );

  fastify.get(
    '/',
    {
      schema: {
        tags: ['Gamificação'],
        summary: 'Ranking de gamificação por usuário no período',
        ...rankingDocs.ranking,
      },
      preHandler: [authorize(['workspace:acessar'])],
    },
    async (request) => {
      const params = querySchema.parse(request.query);
      const periodoPadrao = defaultPeriodo();
      const dataInicio = params.dataInicio ?? periodoPadrao.inicio;
      const dataFim = params.dataFim ?? periodoPadrao.fim;
      const inicioDate = new Date(dataInicio);
      const fimDate = new Date(dataFim + 'T23:59:59Z');

      const corretoraId = request.corretoraId;

      // 1. Buscar usuários elegíveis (filtro por equipe se fornecido)
      const usuariosFiltro = and(
        eq(usuarios.corretoraId, corretoraId),
        isNull(usuarios.deletedAt),
        params.equipeId ? eq(usuarios.equipeId, params.equipeId) : undefined,
      );

      const todosUsuarios = await db
        .select({
          id: usuarios.id,
          nome: usuarios.nome,
          email: usuarios.email,
          avatarUrl: usuarios.avatarUrl,
          equipeId: usuarios.equipeId,
          equipeNome: equipes.nome,
        })
        .from(usuarios)
        .leftJoin(equipes, eq(usuarios.equipeId, equipes.id))
        .where(usuariosFiltro);

      if (todosUsuarios.length === 0) {
        return ok({ ranking: [], rankingEquipes: [], periodo: { dataInicio, dataFim }, regras: { pontosBadge: PONTOS_BADGE, pontosMeta: PONTOS_META, pontosMissao: PONTOS_MISSAO } });
      }

      // 2. Contagem de badges por usuário no período
      const badgesPorUsuario = await db
        .select({
          usuarioId: usuarioBadges.usuarioId,
          total: sql<number>`count(*)::int`,
        })
        .from(usuarioBadges)
        .where(
          and(
            eq(usuarioBadges.corretoraId, corretoraId),
            gte(usuarioBadges.createdAt, inicioDate),
            lte(usuarioBadges.createdAt, fimDate),
          ),
        )
        .groupBy(usuarioBadges.usuarioId);

      const badgesMap = new Map(badgesPorUsuario.map((b) => [b.usuarioId, b.total]));

      // 3. Metas concluídas no período (atribuídas a usuário ou equipe contendo o usuário)
      const metasConcluidas = await db
        .select({
          id: metas.id,
          usuarioId: metas.usuarioId,
          equipeId: metas.equipeId,
          dataFim: metas.dataFim,
        })
        .from(metas)
        .where(
          and(
            eq(metas.corretoraId, corretoraId),
            eq(metas.status, 'CONCLUIDA'),
            isNull(metas.deletedAt),
            gte(metas.dataFim, dataInicio),
            lte(metas.dataFim, dataFim),
          ),
        );

      // 4. Missões concluídas no período
      const missoesConcluidas = await db
        .select({
          id: missoes.id,
          usuarioId: missoes.usuarioId,
          equipeId: missoes.equipeId,
          prazo: missoes.prazo,
        })
        .from(missoes)
        .where(
          and(
            eq(missoes.corretoraId, corretoraId),
            eq(missoes.status, 'CONCLUIDA'),
            isNull(missoes.deletedAt),
            gte(missoes.prazo, dataInicio),
            lte(missoes.prazo, dataFim),
          ),
        );

      // 5. Distribuir contagens entre usuários no escopo
      const metasPorUsuario = new Map<string, number>();
      const missoesPorUsuario = new Map<string, number>();

      const usuariosPorEquipe = new Map<string, string[]>();
      todosUsuarios.forEach((u) => {
        if (u.equipeId) {
          const lista = usuariosPorEquipe.get(u.equipeId) ?? [];
          lista.push(u.id);
          usuariosPorEquipe.set(u.equipeId, lista);
        }
      });

      const todosIds = todosUsuarios.map((u) => u.id);

      const distribuir = (
        items: Array<{ usuarioId: string | null; equipeId: string | null }>,
        target: Map<string, number>,
      ) => {
        items.forEach((item) => {
          let alvos: string[];
          if (item.usuarioId) {
            alvos = [item.usuarioId];
          } else if (item.equipeId) {
            alvos = usuariosPorEquipe.get(item.equipeId) ?? [];
          } else {
            // Sem dono definido: não contribui para ranking individual
            return;
          }
          alvos.forEach((uid) => {
            target.set(uid, (target.get(uid) ?? 0) + 1);
          });
        });
      };

      distribuir(metasConcluidas, metasPorUsuario);
      distribuir(missoesConcluidas, missoesPorUsuario);

      // 6. Compor ranking
      const ranking = todosUsuarios
        .map((u) => {
          const badges = badgesMap.get(u.id) ?? 0;
          const metasBatidas = metasPorUsuario.get(u.id) ?? 0;
          const missoesCumpridas = missoesPorUsuario.get(u.id) ?? 0;
          const pontos =
            badges * PONTOS_BADGE +
            metasBatidas * PONTOS_META +
            missoesCumpridas * PONTOS_MISSAO;

          return {
            usuarioId: u.id,
            nome: u.nome,
            email: u.email,
            avatarUrl: u.avatarUrl,
            equipeId: u.equipeId,
            equipeNome: u.equipeNome,
            pontos,
            badges,
            metasBatidas,
            missoesCumpridas,
          };
        })
        .filter((r) => r.pontos > 0)
        .sort((a, b) => b.pontos - a.pontos)
        .map((r, i) => ({ ...r, posicao: i + 1 }));

      // 7. Ranking de equipes (somatório dos membros)
      const equipesMap = new Map<
        string,
        { equipeId: string; equipeNome: string; pontos: number; membros: number }
      >();
      ranking.forEach((r) => {
        if (!r.equipeId || !r.equipeNome) return;
        const atual = equipesMap.get(r.equipeId) ?? {
          equipeId: r.equipeId,
          equipeNome: r.equipeNome,
          pontos: 0,
          membros: 0,
        };
        atual.pontos += r.pontos;
        atual.membros += 1;
        equipesMap.set(r.equipeId, atual);
      });

      const rankingEquipes = Array.from(equipesMap.values())
        .sort((a, b) => b.pontos - a.pontos)
        .map((e, i) => ({ ...e, posicao: i + 1 }));

      return ok({
        ranking,
        rankingEquipes,
        periodo: { dataInicio, dataFim },
        regras: {
          pontosBadge: PONTOS_BADGE,
          pontosMeta: PONTOS_META,
          pontosMissao: PONTOS_MISSAO,
        },
      });
    },
  );
};

export default rankingRoutes;
