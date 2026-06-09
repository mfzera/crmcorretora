import { BackupService } from '@ecotech/shared/storage';
import type { BackupJobData, BackupJobResult } from './types';

export async function backupJob(data: BackupJobData): Promise<BackupJobResult> {
  const { tipo, includeDatabase = true, cleanup = false, retentionDays } = data;

  const startTime = Date.now();
  let filesBackupId: string | undefined;
  let filesTotal = 0;
  let filesBytesTotal = 0;
  let neonBranchId: string | undefined;
  let neonBranchName: string | undefined;
  let cleanedBackups = 0;
  let cleanedNeonBranches = 0;

  // 1. Backup de arquivos (R2 → R2 backup bucket)
  console.log(`[backup] Iniciando backup de arquivos: ${tipo}`);
  try {
    const result = await BackupService.createBackup({ tipo });
    filesBackupId = result.backupId;
    filesTotal = result.totalArquivos;
    filesBytesTotal = result.totalBytes;
    console.log(
      `[backup] Arquivos: ${filesTotal} copiados, ${(filesBytesTotal / (1024 * 1024)).toFixed(2)}MB`,
    );
  } catch (error: any) {
    console.error('[backup] Erro no backup de arquivos:', error.message);
    // Não aborta — tenta o banco mesmo assim
  }

  // 2. Backup de banco via Neon Branching API
  if (includeDatabase) {
    console.log('[backup] Iniciando backup de banco (Neon branch)...');
    try {
      const dbResult = await BackupService.createDatabaseBackup();
      if (dbResult) {
        neonBranchId = dbResult.branchId;
        neonBranchName = dbResult.branchName;
        console.log(`[backup] Branch Neon criada: ${neonBranchName}`);
      }
    } catch (error: any) {
      console.error('[backup] Erro no backup de banco:', error.message);
    }
  }

  // 3. Limpeza de backups antigos (apenas no job de backup completo com cleanup habilitado)
  if (cleanup) {
    const incrementalRetention = retentionDays ?? 30;
    const fullRetention = retentionDays ?? 90;

    console.log(`[backup] Iniciando limpeza (incremental >${incrementalRetention}d, completo >${fullRetention}d)...`);

    try {
      cleanedBackups += await BackupService.cleanupOldBackups(incrementalRetention, 'incremental');
      cleanedBackups += await BackupService.cleanupOldBackups(fullRetention, 'completo');
      console.log(`[backup] ${cleanedBackups} backups de arquivo removidos`);
    } catch (error: any) {
      console.error('[backup] Erro na limpeza de arquivos:', error.message);
    }

    try {
      const neonRetention = retentionDays ?? 30;
      cleanedNeonBranches = await BackupService.cleanupNeonBranches(neonRetention);
      console.log(`[backup] ${cleanedNeonBranches} branches Neon removidas`);
    } catch (error: any) {
      console.error('[backup] Erro na limpeza de branches Neon:', error.message);
    }
  }

  const durationSeconds = Math.floor((Date.now() - startTime) / 1000);

  console.log(`[backup] Concluído em ${durationSeconds}s`);

  return {
    filesBackupId,
    filesTotal,
    filesBytesTotal,
    durationSeconds,
    neonBranchId,
    neonBranchName,
    cleanedBackups,
    cleanedNeonBranches,
  };
}
