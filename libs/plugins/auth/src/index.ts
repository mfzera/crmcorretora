import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import { Redis } from 'ioredis';
import { db } from '@ecotech/shared/database';
import {
  usuarios,
  cargoPermissoes,
  permissoesGlobais,
  equipes,
} from '@ecotech/shared/database';
import { eq, and } from 'drizzle-orm';
import { UnauthorizedError, AppError } from '@ecotech/shared/utils';
import { env } from '@ecotech/shared/utils/env';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
  }
}

// ── Redis singleton para cache de auth ────────────────────────────────────────

let _redis: Redis | null = null;

function getAuthRedis(): Redis | null {
  if (_redis) return _redis;
  try {
    const tls = env.REDIS_URL.includes('rediss://') ? {} : undefined;
    _redis = new Redis(env.REDIS_URL, {
      enableOfflineQueue: false,
      lazyConnect: true,
      tls,
      retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 1000)),
    });
    _redis.on('error', () => {
      // Cache é não-crítico — erros são silenciados
    });
    return _redis;
  } catch {
    return null;
  }
}

const AUTH_CACHE_TTL = 300; // segundos (5 min — seguro com invalidação explícita por cargo)

async function getCachedRuntimeData(
  key: string,
): Promise<{ nome: string; permissoes: string[] } | null> {
  try {
    const redis = getAuthRedis();
    if (!redis) return null;
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached);
  } catch {
    // cache miss em caso de erro
  }
  return null;
}

async function setCachedRuntimeData(
  key: string,
  data: { nome: string; permissoes: string[] },
): Promise<void> {
  try {
    const redis = getAuthRedis();
    if (!redis) return;
    await redis.set(key, JSON.stringify(data), 'EX', AUTH_CACHE_TTL);
  } catch {
    // não-crítico
  }
}

// ── Auth plugin ───────────────────────────────────────────────────────────────

async function authPlugin(fastify: FastifyInstance) {
  await fastify.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: {
      expiresIn: env.JWT_EXPIRES_IN,
    },
  });

  // Authentication decorator — verifies JWT, loads runtime data from DB/cache
  async function authenticate(request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify();

      // P1-A: query única que verifica ativo=true E traz nome (era 2 queries separadas)
      const runtimeData = await loadUserRuntimeData(
        request.user.sub,
        request.user.isAdmin,
        request.user.cargoId,
      );

      if (!runtimeData) {
        throw new UnauthorizedError('Usuário não encontrado ou inativo');
      }

      request.user.nome = runtimeData.nome;
      request.user.permissoes = runtimeData.permissoes;

      await fastify.resolveTenant(request, request.user.corretoraId);
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new UnauthorizedError('Token inválido ou expirado');
    }
  }

  fastify.decorate('authenticate', authenticate);
}

// ── Token payload ─────────────────────────────────────────────────────────────

// Minimal JWT token payload — only identity fields
export async function generateTokenPayload(usuarioId: string) {
  const usuario: any = await db.query.usuarios.findFirst({
    where: eq(usuarios.id, usuarioId),
    with: {
      cargo: true,
    } as any,
  });

  if (!usuario) {
    throw new Error('Usuário não encontrado');
  }

  const cargo = usuario.cargo;

  // Detecta se o usuário é líder de alguma equipe (gestorId), independente do cargo
  const equipeComoLider = await db.query.equipes.findFirst({
    where: eq(equipes.gestorId, usuario.id),
    columns: { id: true },
  });

  return {
    sub: usuario.id,
    // Usa a corretora ativa quando o usuário trocou de corretora; caso contrário usa a principal.
    corretoraId: usuario.corretoraAtivaId ?? usuario.corretoraId,
    cargoId: usuario.cargoId,
    isAdmin: cargo?.isAdmin ?? false,
    isGestor: cargo?.isGestor ?? false,
    isVendedor: cargo?.isVendedor ?? false,
    isLiderEquipe: !!equipeComoLider,
  };
}

// ── Runtime data (permissões + nome) ─────────────────────────────────────────

/**
 * Carrega dados não armazenados no JWT, com cache Redis de 60s.
 *
 * P1-A: uma única query verifica ativo=true E busca nome (eliminando a query duplicada).
 * P1-B: resultado cacheado por 60s — chave inclui cargoId, então troca de corretora
 *        (que altera cargoId no JWT) gera cache miss automático e busca permissões novas.
 *
 * Retorna null se o usuário não existir ou estiver inativo.
 */
export async function loadUserRuntimeData(
  usuarioId: string,
  isAdmin: boolean,
  cargoId: string | null,
): Promise<{ nome: string; permissoes: string[] } | null> {
  const cacheKey = `auth:runtime:${usuarioId}:${cargoId ?? 'null'}`;

  // P1-B: tenta cache primeiro
  const cached = await getCachedRuntimeData(cacheKey);
  if (cached) return cached;

  // P1-A: query única — verifica ativo=true e busca nome (era findFirst separado + findFirst nome)
  const usuario = await db.query.usuarios.findFirst({
    where: and(eq(usuarios.id, usuarioId), eq(usuarios.ativo, true)),
    columns: { nome: true },
  });

  if (!usuario) return null;

  let permissoes: string[] = [];

  if (isAdmin) {
    // Admins bypassam todo authorize() — carregar permissões seria desperdício de query
  } else if (cargoId) {
    const cargoPerms = await db
      .select({ nomePermissao: permissoesGlobais.nomePermissao })
      .from(cargoPermissoes)
      .innerJoin(
        permissoesGlobais,
        eq(cargoPermissoes.permissaoGlobalId, permissoesGlobais.id),
      )
      .where(eq(cargoPermissoes.cargoId, cargoId));
    permissoes = cargoPerms.map((p) => p.nomePermissao);
  }

  const result = { nome: usuario.nome, permissoes };
  await setCachedRuntimeData(cacheKey, result);
  return result;
}

/**
 * Invalida o cache de runtime de um usuário.
 * Chamar quando as permissões do cargo forem alteradas.
 */
export async function invalidateAuthCache(
  usuarioId: string,
  cargoId: string | null,
): Promise<void> {
  try {
    const redis = getAuthRedis();
    if (!redis) return;
    await redis.del(`auth:runtime:${usuarioId}:${cargoId ?? 'null'}`);
  } catch {
    // não-crítico
  }
}

/**
 * Invalida o cache de todos os usuários de um cargo via SCAN no Redis.
 * Chamado após alteração de permissões de um cargo — evita N chamadas individuais.
 */
export async function invalidateAuthCacheByCargoId(cargoId: string): Promise<void> {
  try {
    const redis = getAuthRedis();
    if (!redis) return;
    const pattern = `auth:runtime:*:${cargoId}`;
    let cursor = '0';
    const keysToDelete: string[] = [];
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      keysToDelete.push(...keys);
    } while (cursor !== '0');
    if (keysToDelete.length > 0) {
      await redis.del(...keysToDelete);
    }
  } catch {
    // não-crítico
  }
}

const authPluginWithFp = fp(authPlugin, {
  name: 'auth',
  dependencies: ['tenant-isolation'], // resolveTenant helper
});

export default authPluginWithFp;
export { authPluginWithFp as auth };
