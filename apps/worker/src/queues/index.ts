import { Queue, QueueOptions } from 'bullmq';
import { REDIS_CONFIG } from '../config/redis';
import type {
  DetectRenewalsJobData,
  NotifyUrgentRenewalsJobData,
  BackupJobData,
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

/**
 * Queue para detecção automática de renovações
 *
 * Job: detectRenewalsJob
 * Schedule: Diário às 03:00 AM
 */
export const renewalsDetectionQueue = new Queue<DetectRenewalsJobData>(
  'renewals-detection',
  {
    ...baseQueueOptions,
  },
);

/**
 * Queue para notificações de renovações urgentes
 *
 * Job: notifyUrgentRenewalsJob
 * Schedule: A cada hora durante horário comercial (9h-18h)
 */
export const urgentNotificationsQueue = new Queue<NotifyUrgentRenewalsJobData>(
  'urgent-notifications',
  {
    ...baseQueueOptions,
  },
);

/**
 * Queue para backup automático
 *
 * Job incremental: diário às 02:00
 * Job completo: semanal domingo às 03:00
 */
export const backupQueue = new Queue<BackupJobData>('backup', {
  ...baseQueueOptions,
  defaultJobOptions: {
    ...baseQueueOptions.defaultJobOptions,
    attempts: 2, // Backup pode demorar — apenas 2 tentativas
    backoff: {
      type: 'fixed',
      delay: 30000, // Espera 30s antes de retry
    },
  },
});

/**
 * Configura schedules repetidos (cron jobs)
 */
export async function setupScheduledJobs(): Promise<void> {
  console.log('⏱️  Configurando schedules dos jobs...');

  // Job 1: Detecção de renovações - diário às 3 AM
  await renewalsDetectionQueue.add(
    'detect-renewals-daily',
    {
      // Job roda para todos os tenants
      daysAhead: 60,
    },
    {
      repeat: {
        pattern: '0 3 * * *', // Cron: 03:00 AM todos os dias
      },
      jobId: 'detect-renewals-daily', // ID fixo previne duplicatas
    },
  );

  console.log('✅ Job agendado: detect-renewals-daily (03:00 AM)');

  // Job 2: Notificações urgentes - a cada hora durante horário comercial
  await urgentNotificationsQueue.add(
    'notify-urgent-renewals-hourly',
    {
      // Notifica renovações que vencem em <= 15 dias
      daysThreshold: 15,
    },
    {
      repeat: {
        // 12-21 UTC = 09h-18h SP (America/Sao_Paulo, UTC-3, fixo desde 2019)
        pattern: '0 12-21 * * *',
      },
      jobId: 'notify-urgent-renewals-hourly',
    },
  );

  console.log('✅ Job agendado: notify-urgent-renewals-hourly (09h-18h SP / 12h-21h UTC)');

  // Job 3: Backup incremental — diário às 02:00 (sem Neon branch — branch só no semanal)
  await backupQueue.add(
    'backup-incremental-daily',
    {
      tipo: 'incremental',
      includeDatabase: false,
      cleanup: false,
    },
    {
      repeat: { pattern: '0 2 * * *' },
      jobId: 'backup-incremental-daily',
    },
  );

  console.log('✅ Job agendado: backup-incremental-daily (02:00 AM, só arquivos)');

  // Job 4: Backup completo — todo domingo às 03:00
  // Cria branch Neon + limpa incrementais com mais de 7 dias
  await backupQueue.add(
    'backup-full-weekly',
    {
      tipo: 'completo',
      includeDatabase: true,
      cleanup: true,
      retentionDays: 7,
    },
    {
      repeat: { pattern: '0 3 * * 0' },
      jobId: 'backup-full-weekly',
    },
  );

  console.log('✅ Job agendado: backup-full-weekly (domingo 03:00 AM, Neon branch + limpeza 7d)');

  console.log('✅ Todos os schedules configurados com sucesso');
}

/**
 * Limpa todos os jobs repetidos (útil para desenvolvimento/testes)
 */
export async function clearScheduledJobs(): Promise<void> {
  console.log('🧹 Limpando schedules existentes...');

  await Promise.all([
    renewalsDetectionQueue.removeRepeatable('detect-renewals-daily', {
      pattern: '0 3 * * *',
      jobId: 'detect-renewals-daily',
    }),
    urgentNotificationsQueue.removeRepeatable('notify-urgent-renewals-hourly', {
      pattern: '0 12-21 * * *',
      jobId: 'notify-urgent-renewals-hourly',
    }),
    backupQueue.removeRepeatable('backup-incremental-daily', {
      pattern: '0 2 * * *',
      jobId: 'backup-incremental-daily',
    }),
    backupQueue.removeRepeatable('backup-full-weekly', {
      pattern: '0 3 * * 0',
      jobId: 'backup-full-weekly',
    }),
  ]);

  console.log('✅ Schedules limpos');
}

/**
 * Fecha todas as conexões das queues (graceful shutdown)
 */
export async function closeQueues(): Promise<void> {
  await Promise.all([
    renewalsDetectionQueue.close(),
    urgentNotificationsQueue.close(),
    backupQueue.close(),
  ]);
  console.log('✅ Queues fechadas');
}
