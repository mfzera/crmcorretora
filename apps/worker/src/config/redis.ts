import { Redis } from 'ioredis';

/**
 * Configuração do Redis para BullMQ
 *
 * Usa variáveis de ambiente para conexão:
 * - REDIS_HOST (default: localhost)
 * - REDIS_PORT (default: 6379)
 * - REDIS_PASSWORD (opcional)
 * - REDIS_DB (default: 0)
 */

const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  maxRetriesPerRequest: null, // Required for BullMQ
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
};

export const createRedisConnection = (): Redis => {
  const redis = new Redis(REDIS_CONFIG);

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

export { REDIS_CONFIG };
