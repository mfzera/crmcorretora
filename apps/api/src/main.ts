import 'dotenv/config';
import http from 'http';
import { buildApp } from './app.js';
import { env } from '@ecotech/shared/utils/env';
import { logger } from '@ecotech/shared/utils/logger';
import {
  checkDatabaseConnection,
  closeDatabaseConnection,
} from '@ecotech/shared/database';
import { initializeWorker, shutdownWorker } from './worker/index.js';
import { runMigrations, seedGlobalData } from './migrations.js';

// ─── Startup state ────────────────────────────────────────────────────────────

type StartupPhase =
  | 'initializing'
  | 'migrating'
  | 'seeding'
  | 'connecting'
  | 'building'
  | 'ready'
  | 'failed';

interface StartupState {
  status: 'starting' | 'ready' | 'failed';
  phase: StartupPhase;
  reason?: string;
  pgCode?: string;
}

const startupState: StartupState = { status: 'starting', phase: 'initializing' };

// ─── Exit codes ───────────────────────────────────────────────────────────────

const EXIT = {
  CONFIG_ERROR: 2,
  MIGRATION_FAILED: 3,
  DB_OFFLINE: 4,
  APP_STARTUP_ERROR: 5,
} as const;

function classifyStartupError(
  error: unknown,
  phase: StartupPhase,
): { exitCode: number; reason: string; pgCode?: string } {
  const err = error as any;
  const message: string = err?.message || String(error);
  const pgCode: string | undefined = err?.code;

  if (phase === 'migrating' || (pgCode && /^\d{5}$/.test(pgCode))) {
    return { exitCode: EXIT.MIGRATION_FAILED, reason: message, pgCode };
  }

  if (
    message.includes('DATABASE_URL') ||
    message.includes('not set') ||
    message.includes('Migrations folder not found')
  ) {
    return { exitCode: EXIT.CONFIG_ERROR, reason: message };
  }

  if (
    phase === 'connecting' ||
    message.includes('Failed to connect to database') ||
    pgCode === 'ECONNREFUSED' ||
    pgCode === 'ENOTFOUND'
  ) {
    return { exitCode: EXIT.DB_OFFLINE, reason: message, pgCode };
  }

  return { exitCode: EXIT.APP_STARTUP_ERROR, reason: message };
}

// ─── Probe server (responde /health antes do app completo subir) ───────────────

function startProbeServer(port: number): http.Server {
  const server = http.createServer((req, res) => {
    const isFailed = startupState.status === 'failed';
    const statusCode = isFailed ? 503 : 503; // 503 até o app completo assumir
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(startupState));
  });

  server.listen(port, () => {
    logger.info({ phase: 'initializing', port }, '🔍 Probe server listening');
  });

  return server;
}

function closeProbeServer(server: http.Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function start() {
  const probeServer = startProbeServer(env.PORT);
  let currentPhase: StartupPhase = 'initializing';

  try {
    currentPhase = 'migrating';
    startupState.phase = 'migrating';
    await runMigrations();

    currentPhase = 'seeding';
    startupState.phase = 'seeding';
    await seedGlobalData();

    currentPhase = 'connecting';
    startupState.phase = 'connecting';
    const dbConnected = await checkDatabaseConnection();
    if (!dbConnected) {
      throw new Error('Failed to connect to database');
    }
    logger.info({ phase: 'connecting' }, 'Database connected successfully');

    currentPhase = 'building';
    startupState.phase = 'building';
    const app = await buildApp();

    // Fecha o probe antes de subir o app completo na mesma porta
    await closeProbeServer(probeServer);

    await app.listen({
      port: env.PORT,
      host: env.HOST,
    });

    startupState.status = 'ready';
    startupState.phase = 'ready';

    logger.info(`🚀 Server running at http://${env.HOST}:${env.PORT}`);
    logger.info(`📚 API Documentation: http://${env.HOST}:${env.PORT}/docs`);

    await initializeWorker();

    const shutdown = async (signal: string) => {
      logger.info({ signal }, 'Graceful shutdown initiated');
      await shutdownWorker();
      await app.close();
      await closeDatabaseConnection();
      logger.info('Server closed');
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    const { exitCode, reason, pgCode } = classifyStartupError(error, currentPhase);

    startupState.status = 'failed';
    startupState.phase = currentPhase === 'initializing' ? 'failed' : currentPhase;
    startupState.reason = reason;
    if (pgCode) startupState.pgCode = pgCode;

    logger.error(
      { phase: currentPhase, exitCode, pgCode, reason, err: error },
      '💥 Startup failed',
    );

    // Mantém o probe vivo 30s para que o healthcheck do Railway capture o 503 com motivo
    await new Promise((resolve) => setTimeout(resolve, 30_000));
    process.exit(exitCode);
  }
}

start();
