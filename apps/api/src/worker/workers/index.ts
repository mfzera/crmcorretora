import { Worker, Job } from 'bullmq';
import { REDIS_CONFIG } from '../config/redis';
import { detectRenewalsJob } from '../jobs/detect-renewals.job';
import { notifyUrgentRenewalsJob } from '../jobs/notify-urgent-renewals.job';
import { purgeExpiredDataJob } from '../jobs/purge-expired-data.job';
import type {
  DetectRenewalsJobData,
  DetectRenewalsJobResult,
  NotifyUrgentRenewalsJobData,
  NotifyUrgentRenewalsJobResult,
  PurgeExpiredDataJobData,
  PurgeExpiredDataJobResult,
} from '../jobs/types';

// Lazy — criados apenas quando initializeWorker() confirma Redis disponível
let _purgeExpiredDataWorker: Worker<PurgeExpiredDataJobData, PurgeExpiredDataJobResult> | null = null;
let _renewalsDetectionWorker: Worker<DetectRenewalsJobData, DetectRenewalsJobResult> | null = null;
let _urgentNotificationsWorker: Worker<NotifyUrgentRenewalsJobData, NotifyUrgentRenewalsJobResult> | null = null;

/**
 * Inicializa todos os workers. Chamar apenas após confirmar Redis disponível.
 */
export function initWorkers(): void {
  _purgeExpiredDataWorker = new Worker<PurgeExpiredDataJobData, PurgeExpiredDataJobResult>(
    'purge-expired-data',
    async (job: Job<PurgeExpiredDataJobData>) => {
      console.log(`🔄 Processando job: ${job.name} [${job.id}]`);
      const startTime = Date.now();
      try {
        const result = await purgeExpiredDataJob(job.data);
        console.log(`✅ Job concluído: ${job.name} em ${Date.now() - startTime}ms`);
        return result;
      } catch (error) {
        console.error(`❌ Erro no job ${job.name}:`, error);
        throw error;
      }
    },
    {
      connection: REDIS_CONFIG,
      concurrency: 1,
    },
  );

  _purgeExpiredDataWorker.on('completed', (job, result) => {
    console.log(`✅ [purge-expired-data] Job ${job.id} completado`);
    console.log(`   🗑️  Audit logs anonimizados: ${result.auditLogsAnonymized}`);
    console.log(`   🔑 Tokens de reset deletados: ${result.passwordResetTokensDeleted}`);
    console.log(`   🔑 Tokens de portal deletados: ${result.portalTokensDeleted}`);
  });

  _purgeExpiredDataWorker.on('failed', (job, error) => {
    console.error(`❌ [purge-expired-data] Job ${job?.id} falhou:`, error.message);
  });

  _renewalsDetectionWorker = new Worker<DetectRenewalsJobData, DetectRenewalsJobResult>(
    'renewals-detection',
    async (job: Job<DetectRenewalsJobData>) => {
      console.log(`🔄 Processando job: ${job.name} [${job.id}]`);
      console.log('📊 Data:', job.data);

      const startTime = Date.now();

      try {
        const result = await detectRenewalsJob(job.data);

        const duration = Date.now() - startTime;
        console.log(`✅ Job concluído: ${job.name} em ${duration}ms`);
        console.log('📈 Resultado:', result);

        return result;
      } catch (error) {
        console.error(`❌ Erro no job ${job.name}:`, error);
        throw error; // BullMQ vai fazer retry automaticamente
      }
    },
    {
      connection: REDIS_CONFIG,
      concurrency: 1, // Processa 1 job por vez (evita sobrecarga)
      limiter: {
        max: 10, // Máximo 10 jobs
        duration: 60000, // por minuto
      },
    },
  );

  _renewalsDetectionWorker.on('completed', (job, result) => {
    console.log(`✅ [renewals-detection] Job ${job.id} completado`);
    console.log(`   📊 Renovações criadas: ${result.totalRenewalsCreated}`);
    console.log(`   🏢 Tenants processados: ${result.tenantsProcessed}`);
  });

  _renewalsDetectionWorker.on('failed', (job, error) => {
    console.error(`❌ [renewals-detection] Job ${job?.id} falhou:`, error.message);
  });

  _urgentNotificationsWorker = new Worker<NotifyUrgentRenewalsJobData, NotifyUrgentRenewalsJobResult>(
    'urgent-notifications',
    async (job: Job<NotifyUrgentRenewalsJobData>) => {
      console.log(`🔄 Processando job: ${job.name} [${job.id}]`);
      console.log('📊 Data:', job.data);

      const startTime = Date.now();

      try {
        const result = await notifyUrgentRenewalsJob(job.data);

        const duration = Date.now() - startTime;
        console.log(`✅ Job concluído: ${job.name} em ${duration}ms`);
        console.log('📈 Resultado:', result);

        return result;
      } catch (error) {
        console.error(`❌ Erro no job ${job.name}:`, error);
        throw error;
      }
    },
    {
      connection: REDIS_CONFIG,
      concurrency: 2, // Pode processar 2 notificações em paralelo
      limiter: {
        max: 20,
        duration: 60000,
      },
    },
  );

  _urgentNotificationsWorker.on('completed', (job, result) => {
    console.log(`✅ [urgent-notifications] Job ${job.id} completado`);
    console.log(`   📧 Notificações enviadas: ${result.totalNotificationsSent}`);
    console.log(`   🔔 Vendedores notificados: ${result.vendedoresNotified}`);
  });

  _urgentNotificationsWorker.on('failed', (job, error) => {
    console.error(`❌ [urgent-notifications] Job ${job?.id} falhou:`, error.message);
  });
}

/**
 * Graceful shutdown
 */
export async function closeWorkers(): Promise<void> {
  console.log('🛑 Encerrando workers...');
  await Promise.allSettled([
    _purgeExpiredDataWorker?.close(),
    _renewalsDetectionWorker?.close(),
    _urgentNotificationsWorker?.close(),
  ]);
  _purgeExpiredDataWorker = null;
  _renewalsDetectionWorker = null;
  _urgentNotificationsWorker = null;
  console.log('✅ Workers encerrados');
}
