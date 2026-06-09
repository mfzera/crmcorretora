import { Redis, RedisOptions } from 'ioredis';

/**
 * Configuração do Redis para BullMQ
 *
 * Suporta duas formas de conexão:
 * 1. URL completa via REDIS_URL (preferencial para serviços externos como Upstash)
 * 2. Parâmetros individuais: REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, REDIS_DB
 */

/**
 * Cria configuração Redis baseada nas variáveis de ambiente
 * Para uso com BullMQ (queues e workers)
 */
export const getRedisConfig = (): RedisOptions | string => {
  // Se REDIS_URL está definida, retorna a URL (BullMQ aceita string ou objeto)
  if (process.env.REDIS_URL) {
    // Retorna URL com opções TLS se necessário
    return process.env.REDIS_URL;
  }

  // Caso contrário, usa parâmetros individuais
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  };
};

/**
 * Opções adicionais para conexão Redis
 */
const getRedisConnectionOptions = (): Partial<RedisOptions> => {
  return {
    maxRetriesPerRequest: null, // Required for BullMQ
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    // TLS é necessário para conexões externas como Upstash (rediss://)
    tls:
      process.env.REDIS_URL && process.env.REDIS_URL.includes('rediss://')
        ? {}
        : undefined,
  };
};

/**
 * Configuração completa para BullMQ (queues e workers)
 * Exportado para uso direto com BullMQ
 */
export const REDIS_CONFIG = process.env.REDIS_URL
  ? {
      host: new URL(process.env.REDIS_URL).hostname,
      port: parseInt(new URL(process.env.REDIS_URL).port || '6379', 10),
      password: new URL(process.env.REDIS_URL).password || undefined,
      maxRetriesPerRequest: null,
      retryStrategy: (times: number) => {
        if (times > 20) return null; // Desiste após 20 tentativas — evita loop infinito
        return Math.min(times * 100, 5000);
      },
      tls: process.env.REDIS_URL.includes('rediss://') ? {} : undefined,
    }
  : {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0', 10),
      maxRetriesPerRequest: null,
      retryStrategy: (times: number) => {
        if (times > 20) return null; // Desiste após 20 tentativas — evita loop infinito
        return Math.min(times * 100, 5000);
      },
    };

/**
 * Cria uma conexão Redis direta (para uso fora do BullMQ se necessário)
 */
export const createRedisConnection = (): Redis => {
  const redis = process.env.REDIS_URL
    ? new Redis(process.env.REDIS_URL, getRedisConnectionOptions())
    : new Redis(REDIS_CONFIG);

  redis.on('connect', () => {
    console.log('✅ Redis connected successfully');
  });

  redis.on('error', (error) => {
    console.error('❌ Redis connection error:', error);
  });

  redis.on('ready', () => {
    console.log('✅ Redis ready to accept commands');
  });

  return redis;
};
