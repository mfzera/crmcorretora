import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import { db } from '@ecotech/shared/database';
import { sql } from 'drizzle-orm';

// Shared buffer imported by neon-analytics route
export interface RowSample {
  timestamp: string;
  inserted: number;
  updated: number;
  deleted: number;
}

export const MAX_SAMPLES = 72; // 6h @ 5min intervals
export const rowsSamplesBuffer: RowSample[] = [];
export let lastRowTotals: { inserts: number; updates: number; deletes: number } | null = null;

async function takeSample() {
  try {
    type TotalsRow = { inserts: string | bigint; updates: string | bigint; deletes: string | bigint };
    const result = await db.execute(sql`
      SELECT
        COALESCE(SUM(n_tup_ins), 0)::bigint AS inserts,
        COALESCE(SUM(n_tup_upd), 0)::bigint AS updates,
        COALESCE(SUM(n_tup_del), 0)::bigint AS deletes
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
    `);

    const row = (result.rows as unknown as TotalsRow[])[0];
    const current = {
      inserts: Number(row?.inserts ?? 0),
      updates: Number(row?.updates ?? 0),
      deletes: Number(row?.deletes ?? 0),
    };

    if (lastRowTotals !== null) {
      const sample: RowSample = {
        timestamp: new Date().toISOString(),
        inserted: Math.max(0, current.inserts - lastRowTotals.inserts),
        updated:  Math.max(0, current.updates - lastRowTotals.updates),
        deleted:  Math.max(0, current.deletes - lastRowTotals.deletes),
      };
      rowsSamplesBuffer.push(sample);
      if (rowsSamplesBuffer.length > MAX_SAMPLES) rowsSamplesBuffer.shift();
    }

    lastRowTotals = current;
  } catch {
    // non-critical — falha silenciosa para não impactar o servidor
  }
}

const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

const neonRowsSamplerPlugin: FastifyPluginAsync = async (app) => {
  // Seed lastRowTotals immediately so the first interval produces a real delta
  await takeSample();

  const timer = setInterval(takeSample, INTERVAL_MS);

  app.addHook('onClose', async () => {
    clearInterval(timer);
  });
};

export default fp(neonRowsSamplerPlugin, { name: 'neon-rows-sampler' });
