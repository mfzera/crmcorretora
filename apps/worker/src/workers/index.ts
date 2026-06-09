import { Worker, Job } from 'bullmq';
import { REDIS_CONFIG } from '../config/redis';
import { detectRenewalsJob } from '../jobs/detect-renewals.job';
import { notifyUrgentRenewalsJob } from '../jobs/notify-urgent-renewals.job';
import { backupJob } from '../jobs/backup.job';
import type {
  DetectRenewalsJobData,
  DetectRenewalsJobResult,
  NotifyUrgentRenewalsJobData,
  NotifyUrgentRenewalsJobResult,
  BackupJobData,
  BackupJobResult,
} from '../jobs/types';

/**
 * Worker para processar jobs de detecção de renovações
 */
export const renewalsDetectionWorker = new Worker<
  DetectRenewalsJobData,
  DetectRenewalsJobResult
>(
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

/**
 * Worker para processar jobs de notificações urgentes
 */
export const urgentNotificationsWorker = new Worker<
  NotifyUrgentRenewalsJobData,
  NotifyUrgentRenewalsJobResult
>(
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

/**
 * Event listeners para monitoramento
 */
renewalsDetectionWorker.on('completed', (job, result) => {
  console.log(`[renewals-detection] Job ${job.id} completado`);
  console.log(`   Renovacoes criadas: ${result.renewalsCreated}`);
  console.log(`   Ja existentes: ${result.renewalsAlreadyExisted}`);
});

renewalsDetectionWorker.on('failed', (job, error) => {
  console.error(`[renewals-detection] Job ${job?.id} falhou:`, error.message);
});

urgentNotificationsWorker.on('completed', (job, result) => {
  console.log(`[urgent-notifications] Job ${job.id} completado`);
  console.log(`   Notificacoes enviadas: ${result.notificationsSent}`);
  console.log(`   Total verificado: ${result.totalRenewalsChecked}`);
});

urgentNotificationsWorker.on('failed', (job, error) => {
  console.error(`[urgent-notifications] Job ${job?.id} falhou:`, error.message);
});

/**
 * Worker para processar jobs de backup
 */
export const backupWorker = new Worker<BackupJobData, BackupJobResult>(
  'backup',
  async (job: Job<BackupJobData>) => {
    console.log(`🔄 Processando job: ${job.name} [${job.id}]`);
    console.log('📊 Data:', job.data);

    const startTime = Date.now();

    try {
      const result = await backupJob(job.data);

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
    concurrency: 1, // Backup roda um por vez para não sobrecarregar R2/banco
    limiter: {
      max: 2,
      duration: 60000,
    },
  },
);

backupWorker.on('completed', (job, result) => {
  console.log(`[backup] Job ${job.id} completado`);
  console.log(`   Arquivos: ${result.filesTotal} (${(result.filesBytesTotal / (1024 * 1024)).toFixed(2)}MB)`);
  if (result.neonBranchName) {
    console.log(`   Branch Neon: ${result.neonBranchName}`);
  }
  if (result.cleanedBackups > 0 || result.cleanedNeonBranches > 0) {
    console.log(`   Limpeza: ${result.cleanedBackups} backups + ${result.cleanedNeonBranches} branches removidos`);
  }
});

backupWorker.on('failed', (job, error) => {
  console.error(`[backup] Job ${job?.id} falhou:`, error.message);
});

/**
 * Graceful shutdown
 */
export async function closeWorkers(): Promise<void> {
  console.log('🛑 Encerrando workers...');
  await Promise.all([
    renewalsDetectionWorker.close(),
    urgentNotificationsWorker.close(),
    backupWorker.close(),
  ]);
  console.log('✅ Workers encerrados');
}
