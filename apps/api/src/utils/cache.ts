import { Redis } from 'ioredis';
import { REDIS_CONFIG } from '../worker/config/redis.js';

// Singleton para cache (separado da conexão BullMQ)
let _redis: Redis | null = null;

export function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis({
      ...(REDIS_CONFIG as any),
      // Falha imediatamente em vez de enfileirar — evita que requests fiquem
      // travadas esperando Redis quando ele está indisponível
      enableOfflineQueue: false,
      // Retry limitado: cache é não-crítico, melhor desistir logo
      retryStrategy: (times: number) => {
        if (times > 5) return null;
        return Math.min(times * 200, 2000);
      },
    });
    _redis.on('error', (err) => {
      // Silencia erros de conexão para não derrubar a API se Redis cair
      console.error('[cache] Redis error:', err.message);
    });
  }
  return _redis;
}

// ── Cache genérico (chave livre, TTL fixo) ────────────────────────────────────

/**
 * Cache simples por chave arbitrária — sem versionamento.
 * Ideal para dados de escopo per-usuário (workspace resumo, avatar URLs).
 */
export async function withCacheGeneric<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  let redis: Redis;
  try {
    redis = getRedis();
  } catch {
    return fetcher();
  }

  try {
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached) as T;

    const result = await fetcher();
    await redis.set(key, JSON.stringify(result), 'EX', ttlSeconds);
    return result;
  } catch {
    return fetcher();
  }
}

// ── Cache de URL assinada de avatar (R2/S3) ───────────────────────────────────

const AVATAR_TTL = 3000; // 50min — URL assinada expira em 1h, cache deve ser menor

/**
 * Retorna a URL assinada para um avatar no R2/S3, cacheando no Redis por 50min.
 * Retorna null se não houver chave ou se a geração falhar.
 */
export async function getAvatarUrl(r2Key: string | null | undefined): Promise<string | null> {
  if (!r2Key) return null;

  const cacheKey = `avatar:url:${r2Key}`;

  try {
    const redis = getRedis();
    const cached = await redis.get(cacheKey);
    if (cached) return cached;
  } catch {
    // segue sem cache
  }

  try {
    const { storageClient } = await import('@ecotech/shared/storage');
    const url = await storageClient.getSignedDownloadUrl(r2Key);

    try {
      const redis = getRedis();
      await redis.set(cacheKey, url, 'EX', AVATAR_TTL);
    } catch {
      // falha silenciosa no write do cache
    }

    return url;
  } catch {
    return null;
  }
}

/**
 * Invalida o cache de avatar de uma chave R2 específica.
 * Chamar ao trocar foto de perfil.
 */
export async function invalidateAvatarCache(r2Key: string): Promise<void> {
  try {
    const redis = getRedis();
    await redis.del(`avatar:url:${r2Key}`);
  } catch {
    // não crítico
  }
}

const VERSION_TTL = 86400; // 24h — versões ficam 1 dia antes de expirar
const CACHE_TTL = 30;      // 30s — dados ficam frescos por 30s

/**
 * Retorna a versão atual do cache para uma corretora.
 * Cada corretora tem sua própria versão — invalida todos os seus caches de uma vez.
 */
async function getVersion(corretoraId: string): Promise<number> {
  const redis = getRedis();
  const key = `cache:version:dv:${corretoraId}`;
  const version = await redis.get(key);
  if (!version) {
    await redis.set(key, '1', 'EX', VERSION_TTL);
    return 1;
  }
  return parseInt(version, 10);
}

/**
 * Invalida o cache de métricas de uma corretora.
 * Apenas incrementa a versão — as chaves antigas expiram via TTL naturalmente.
 */
export async function invalidateMetricasCache(corretoraId: string): Promise<void> {
  try {
    const redis = getRedis();
    const key = `cache:version:metricas:${corretoraId}`;
    await redis.incr(key);
    await redis.expire(key, VERSION_TTL);
  } catch {
    // Cache não crítico — falha silenciosa
  }
}

/**
 * Invalida o cache de documentos-venda de uma corretora.
 * Apenas incrementa a versão — as chaves antigas expiram via TTL naturalmente.
 */
export async function invalidateDocumentosVendaCache(corretoraId: string): Promise<void> {
  try {
    const redis = getRedis();
    const key = `cache:version:dv:${corretoraId}`;
    await redis.incr(key);
    await redis.expire(key, VERSION_TTL);
  } catch {
    // Cache não crítico — falha silenciosa
  }
}

/**
 * Busca do cache ou executa o fetcher e armazena.
 * Key é composta de: corretora + versão + parâmetros da query.
 *
 * @param corretoraId - ID da corretora (escopo do cache)
 * @param params - Parâmetros da query (status, vendedorId, etc.)
 * @param fetcher - Função que executa a query real no banco
 */
export async function withCache<T>(
  corretoraId: string,
  params: Record<string, unknown>,
  fetcher: () => Promise<T>,
): Promise<T> {
  let redis: Redis;
  try {
    redis = getRedis();
  } catch {
    return fetcher();
  }

  try {
    const version = await getVersion(corretoraId);
    const paramsKey = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('&');
    const cacheKey = `cache:dv:${corretoraId}:v${version}:${paramsKey}`;

    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as T;
    }

    const result = await fetcher();
    await redis.set(cacheKey, JSON.stringify(result), 'EX', CACHE_TTL);
    return result;
  } catch {
    // Se Redis falhar, cai no banco normalmente
    return fetcher();
  }
}
