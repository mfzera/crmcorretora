import { Queue, QueueOptions } from 'bullmq';
import { REDIS_CONFIG } from '../config/redis';
import { logger } from '@ecotech/shared/utils/logger';
import type {
  DetectRenewalsJobData,
  NotifyUrgentRenewalsJobData,
  PurgeExpiredDataJobData,
} from '../jobs/types';

/**
 * Configuração base para todas as queues
 */
const baseQueueOptions: QueueOptions = {
  connection: REDIS_CONFIG,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 24 * 3600, // Remove jobs concluídos após 24 horas
      count: 1000, // Mantém no máximo 1000 jobs concluídos
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Remove jobs falhados após 7 dias
    },
  },
};

// Lazy — criadas apenas quando initializeWorker() é chamado explicitamente,
// evitando conexões Redis desnecessárias se o worker não puder inicializar.
let _renewalsDetectionQueue: Queue<DetectRenewalsJobData> | null = null;
let _purgeExpiredDataQueue: Queue<PurgeExpiredDataJobData> | null = null;
let _urgentNotificationsQueue: Queue<NotifyUrgentRenewalsJobData> | null = null;

function getRenewalsDetectionQueue(): Queue<DetectRenewalsJobData> {
  if (!_renewalsDetectionQueue) {
    _renewalsDetectionQueue = new Queue<DetectRenewalsJobData>('renewals-detection', baseQueueOptions);
  }
  return _renewalsDetectionQueue;
}

function getPurgeExpiredDataQueue(): Queue<PurgeExpiredDataJobData> {
  if (!_purgeExpiredDataQueue) {
    _purgeExpiredDataQueue = new Queue<PurgeExpiredDataJobData>('purge-expired-data', baseQueueOptions);
  }
  return _purgeExpiredDataQueue;
}

function getUrgentNotificationsQueue(): Queue<NotifyUrgentRenewalsJobData> {
  if (!_urgentNotificationsQueue) {
    _urgentNotificationsQueue = new Queue<NotifyUrgentRenewalsJobData>('urgent-notifications', baseQueueOptions);
  }
  return _urgentNotificationsQueue;
}

/**
 * Inicializa todas as queues (conecta ao Redis).
 * Chamar apenas após confirmar que Redis está disponível.
 */
export function initQueues() {
  getRenewalsDetectionQueue();
  getPurgeExpiredDataQueue();
  getUrgentNotificationsQueue();
}

/**
 * Configura schedules repetidos (cron jobs)
 */
export async function setupScheduledJobs(): Promise<void> {
  await getPurgeExpiredDataQueue().add(
    'purge-expired-data-daily',
    { auditLogRetentionDays: 90 },
    { repeat: { pattern: '0 2 * * *' }, jobId: 'purge-expired-data-daily' },
  );

  await getRenewalsDetectionQueue().add(
    'detect-renewals-daily',
    { daysAhead: 60 },
    { repeat: { pattern: '0 3 * * *' }, jobId: 'detect-renewals-daily' },
  );

  await getUrgentNotificationsQueue().add(
    'notify-urgent-renewals-hourly',
    { daysThreshold: 15 },
    { repeat: { pattern: '0 9-18 * * *' }, jobId: 'notify-urgent-renewals-hourly' },
  );

  logger.info('⏱️  Scheduled jobs configured: purge@02h, renewals@03h, notifications@09-18h');
}

/**
 * Limpa todos os jobs repetidos (útil para desenvolvimento/testes)
 */
export async function clearScheduledJobs(): Promise<void> {
  console.log('🧹 Limpando schedules existentes...');

  await getRenewalsDetectionQueue().removeRepeatable('detect-renewals-daily', {
    pattern: '0 3 * * *',
  });

  await getUrgentNotificationsQueue().removeRepeatable('notify-urgent-renewals-hourly', {
    pattern: '0 9-18 * * *',
  });

  console.log('✅ Schedules limpos');
}

/**
 * Fecha todas as conexões das queues (graceful shutdown)
 */
export async function closeQueues(): Promise<void> {
  await Promise.allSettled([
    _purgeExpiredDataQueue?.close(),
    _renewalsDetectionQueue?.close(),
    _urgentNotificationsQueue?.close(),
  ]);
  _purgeExpiredDataQueue = null;
  _renewalsDetectionQueue = null;
  _urgentNotificationsQueue = null;
  console.log('✅ Queues fechadas');
}
