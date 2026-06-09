import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { Redis } from 'ioredis';
import { Queue } from 'bullmq';
import { REDIS_CONFIG } from '../../worker/config/redis.js';

// ─── Queue names (must match worker/queues/index.ts) ─────────────────────────

const QUEUE_NAMES = ['renewals-detection', 'urgent-notifications'] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Parse the flat key=value output of Redis INFO into a typed object. */
function parseInfoSection(raw: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of raw.split('\r\n')) {
    if (line.startsWith('#') || !line.includes(':')) continue;
    const idx = line.indexOf(':');
    result[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return result;
}

/** Parse the keyspace line: "keys=X,expires=Y,avg_ttl=Z" */
function parseKeyspaceDB(value: string): { keys: number; expires: number; avg_ttl: number } {
  const parts = Object.fromEntries(value.split(',').map((p) => p.split('=')));
  return {
    keys: parseInt(parts['keys'] ?? '0', 10),
    expires: parseInt(parts['expires'] ?? '0', 10),
    avg_ttl: parseInt(parts['avg_ttl'] ?? '0', 10),
  };
}

async function createTempRedis(): Promise<Redis> {
  return new Redis(REDIS_CONFIG as any);
}

// ─── Routes ───────────────────────────────────────────────────────────────────

const redisAnalyticsRoutes: FastifyPluginAsyncZod = async (fastify) => {
  // GET /api/admin/redis/info
  fastify.get(
    '/redis/info',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Redis Info',
        description: 'Retorna métricas de memória, clientes, keyspace e estatísticas do Redis.',
        response: {
          200: z.unknown(),
          502: z.object({
            error: z.string(),
            details: z.array(z.unknown()),
          }),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['view_usage']),
    },
    async (request, reply) => {
      let redis: Redis | null = null;
      try {
        redis = await createTempRedis();

        // Aguarda conexão ficar pronta (timeout 3s)
        await Promise.race([
          new Promise<void>((res, rej) => {
            redis!.once('ready', res);
            redis!.once('error', rej);
          }),
          new Promise<never>((_, rej) =>
            setTimeout(() => rej(new Error('Redis connection timeout')), 3000),
          ),
        ]);

        const raw = await redis.info('all');
        const info = parseInfoSection(raw);

        // ── Server ──
        const server = {
          version:           info['redis_version']  ?? 'unknown',
          mode:              info['redis_mode']      ?? 'standalone',
          os:                info['os']              ?? 'unknown',
          uptimeSeconds:     parseInt(info['uptime_in_seconds'] ?? '0', 10),
          uptimeDays:        parseInt(info['uptime_in_days']    ?? '0', 10),
          hz:                parseInt(info['hz']                ?? '10', 10),
          role:              info['role']            ?? 'master',
          connectedSlaves:   parseInt(info['connected_slaves']  ?? '0', 10),
        };

        // ── Memory ──
        const memory = {
          usedBytes:         parseInt(info['used_memory']            ?? '0', 10),
          usedHuman:         info['used_memory_human']               ?? '0B',
          peakBytes:         parseInt(info['used_memory_peak']       ?? '0', 10),
          peakHuman:         info['used_memory_peak_human']          ?? '0B',
          rssBytes:          parseInt(info['used_memory_rss']        ?? '0', 10),
          rssHuman:          info['used_memory_rss_human']           ?? '0B',
          maxmemoryBytes:    parseInt(info['maxmemory']              ?? '0', 10),
          maxmemoryHuman:    info['maxmemory_human']                 ?? 'noeviction',
          maxmemoryPolicy:   info['maxmemory_policy']               ?? 'noeviction',
          fragRatio:         parseFloat(info['mem_fragmentation_ratio'] ?? '1'),
          luaBytes:          parseInt(info['used_memory_lua']        ?? '0', 10),
        };

        // ── Clients ──
        const clients = {
          connected:         parseInt(info['connected_clients']      ?? '0', 10),
          blocked:           parseInt(info['blocked_clients']        ?? '0', 10),
          tracking:          parseInt(info['tracking_clients']       ?? '0', 10),
          maxInputLen:       parseInt(info['client_recent_max_input_buffer'] ?? '0', 10),
        };

        // ── Stats ──
        const stats = {
          totalCommandsProcessed: parseInt(info['total_commands_processed'] ?? '0', 10),
          totalConnectionsReceived: parseInt(info['total_connections_received'] ?? '0', 10),
          instantaneousOpsPerSec: parseInt(info['instantaneous_ops_per_sec'] ?? '0', 10),
          keyspaceHits:     parseInt(info['keyspace_hits']           ?? '0', 10),
          keyspaceMisses:   parseInt(info['keyspace_misses']         ?? '0', 10),
          expiredKeys:      parseInt(info['expired_keys']            ?? '0', 10),
          evictedKeys:      parseInt(info['evicted_keys']            ?? '0', 10),
          netInputBytes:    parseInt(info['total_net_input_bytes']   ?? '0', 10),
          netOutputBytes:   parseInt(info['total_net_output_bytes']  ?? '0', 10),
          rejectedConnections: parseInt(info['rejected_connections'] ?? '0', 10),
        };

        // ── Keyspace ──
        const keyspace: Record<string, { keys: number; expires: number; avg_ttl: number }> = {};
        for (const [key, value] of Object.entries(info)) {
          if (/^db\d+$/.test(key)) {
            keyspace[key] = parseKeyspaceDB(value);
          }
        }
        const totalKeys = Object.values(keyspace).reduce((s, db) => s + db.keys, 0);

        // ── Persistence ──
        const persistence = {
          rdbLastSaveTime: parseInt(info['rdb_last_save_time'] ?? '0', 10),
          rdbLastBgSaveStatus: info['rdb_last_bgsave_status'] ?? 'ok',
          aofEnabled: info['aof_enabled'] === '1',
          loadingRdb: info['loading'] === '1',
        };

        await fastify.auditService.log({
          adminId: request.admin!.id,
          acao: 'view_redis_analytics',
          detalhes: { version: server.version, uptimeDays: server.uptimeDays },
          request,
        });

        return {
          available: true,
          server,
          memory,
          clients,
          stats,
          keyspace,
          totalKeys,
          persistence,
        };
      } catch (err: any) {
        return reply.status(502).send({
          error: 'Falha ao conectar ao Redis',
          details: [err?.message ?? String(err)],
        });
      } finally {
        if (redis) {
          redis.disconnect();
        }
      }
    },
  );

  // GET /api/admin/redis/queues
  fastify.get(
    '/redis/queues',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Redis BullMQ Queues',
        description: 'Retorna contagem de jobs (waiting, active, completed, failed, delayed) por queue.',
        response: {
          200: z.unknown(),
          502: z.object({
            error: z.string(),
            details: z.array(z.unknown()),
          }),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['view_usage']),
    },
    async (_request, reply) => {
      const queues: Array<{
        name: string;
        waiting: number;
        active: number;
        completed: number;
        failed: number;
        delayed: number;
        paused: number;
      }> = [];

      const queueInstances: Queue[] = [];

      try {
        for (const name of QUEUE_NAMES) {
          const q = new Queue(name, { connection: REDIS_CONFIG as any });
          queueInstances.push(q);

          const counts = await q.getJobCounts(
            'waiting',
            'active',
            'completed',
            'failed',
            'delayed',
            'paused',
          );

          queues.push({
            name,
            waiting:   counts['waiting']   ?? 0,
            active:    counts['active']    ?? 0,
            completed: counts['completed'] ?? 0,
            failed:    counts['failed']    ?? 0,
            delayed:   counts['delayed']   ?? 0,
            paused:    counts['paused']    ?? 0,
          });
        }

        return { available: true, queues };
      } catch (err: any) {
        return reply.status(502).send({
          error: 'Falha ao consultar queues BullMQ',
          details: [err?.message ?? String(err)],
        });
      } finally {
        await Promise.allSettled(queueInstances.map((q) => q.close()));
      }
    },
  );
};

export default redisAnalyticsRoutes;
