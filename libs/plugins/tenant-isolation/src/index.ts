import { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { Redis } from 'ioredis';
import { db } from '@ecotech/shared/database';
import { corretoras } from '@ecotech/shared/database';
import { eq } from 'drizzle-orm';
import { NotFoundError, ForbiddenError } from '@ecotech/shared/utils';
import { env } from '@ecotech/shared/utils/env';

// ── Redis singleton para cache de tenant ──────────────────────────────────────

let _redis: Redis | null = null;

function getTenantRedis(): Redis | null {
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

const TENANT_CACHE_TTL = 60; // segundos — status de corretora muda raramente

type CorretoraRow = Awaited<ReturnType<typeof db.query.corretoras.findFirst>>;

async function getCachedCorretora(corretoraId: string): Promise<CorretoraRow | null> {
  try {
    const redis = getTenantRedis();
    if (!redis) return null;
    const cached = await redis.get(`tenant:corretora:${corretoraId}`);
    if (cached) return JSON.parse(cached);
  } catch {
    // cache miss em caso de erro
  }
  return null;
}

async function setCachedCorretora(corretoraId: string, corretora: NonNullable<CorretoraRow>): Promise<void> {
  try {
    const redis = getTenantRedis();
    if (!redis) return;
    await redis.set(
      `tenant:corretora:${corretoraId}`,
      JSON.stringify(corretora),
      'EX',
      TENANT_CACHE_TTL,
    );
  } catch {
    // não-crítico
  }
}

// ── Plugin ────────────────────────────────────────────────────────────────────

async function tenantIsolationPlugin(fastify: FastifyInstance) {
  async function resolveTenant(request: FastifyRequest, corretoraId: string) {
    // P1-C: tenta cache antes de bater no banco
    let corretora = await getCachedCorretora(corretoraId);

    if (!corretora) {
      corretora = await db.query.corretoras.findFirst({
        where: eq(corretoras.id, corretoraId),
      }) ?? null;

      if (corretora) await setCachedCorretora(corretoraId, corretora);
    }

    if (!corretora) {
      throw new NotFoundError('Corretora');
    }

    if (corretora.status === 'SUSPENSO') {
      throw new ForbiddenError(
        'Corretora suspensa. Entre em contato com o suporte.',
      );
    }

    if (corretora.status === 'CANCELADO') {
      throw new ForbiddenError('Conta cancelada.');
    }

    // Check trial expiration
    if (corretora.status === 'TRIAL' && corretora.dataFimTrial) {
      if (new Date() > new Date(corretora.dataFimTrial)) {
        throw new ForbiddenError(
          'Período de trial expirado. Faça o upgrade do plano.',
        );
      }
    }

    request.corretoraId = corretora.id;
    request.corretora = corretora;
  }

  fastify.decorate('resolveTenant', resolveTenant);
}

/**
 * Invalida o cache de tenant de uma corretora.
 * Chamar quando o status da corretora for alterado (suspensão, cancelamento, upgrade).
 */
export async function invalidateTenantCache(corretoraId: string): Promise<void> {
  try {
    const redis = getTenantRedis();
    if (!redis) return;
    await redis.del(`tenant:corretora:${corretoraId}`);
  } catch {
    // não-crítico
  }
}

const tenantIsolationPluginWithFp = fp(tenantIsolationPlugin, {
  name: 'tenant-isolation',
});

export default tenantIsolationPluginWithFp;
export { tenantIsolationPluginWithFp as tenantIsolation };
