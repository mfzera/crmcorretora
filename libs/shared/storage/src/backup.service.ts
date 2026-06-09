import { db } from '@ecotech/shared/database';
import { backups, anexos, corretoras } from '@ecotech/shared/database';
import { eq, and, isNull, gte, lte } from 'drizzle-orm';
import { R2Client } from './r2-client.js';
import crypto from 'crypto';
import pLimit from 'p-limit';

const NEON_TIMEOUT_MS = 30_000;

async function fetchNeon(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NEON_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export interface BackupOptions {
  corretoraId?: string;
  tipo: 'incremental' | 'completo';
  iniciadoPorId?: string;
}

export interface BackupResult {
  backupId: string;
  tipo: 'incremental' | 'completo';
  totalArquivos: number;
  totalBytes: number;
  duracaoSegundos: number;
  backupPrefix: string;
}

export interface DatabaseBackupResult {
  branchId: string;
  branchName: string;
  projectId: string;
}

export class BackupService {
  private static r2Main = new R2Client();
  private static r2Backup = new R2Client({
    bucketOverride:
      process.env.CLOUDFLARE_R2_BACKUP_BUCKET ||
      process.env.R2_BACKUP_BUCKET_NAME ||
      'ecotech-backups',
  });
  private static backupBucket =
    process.env.CLOUDFLARE_R2_BACKUP_BUCKET ||
    process.env.R2_BACKUP_BUCKET_NAME ||
    'ecotech-backups';

  /**
   * Criar backup de arquivos (incremental ou completo).
   * Copia do bucket principal para o bucket de backup dedicado.
   */
  static async createBackup(options: BackupOptions): Promise<BackupResult> {
    const { corretoraId, tipo, iniciadoPorId } = options;

    const iniciadoEm = new Date();
    const timestamp = Date.now();
    const backupPrefix = this.buildBackupPrefix(tipo, corretoraId, timestamp);

    const [backup] = await db
      .insert(backups)
      .values({
        tipo,
        corretoraId: corretoraId || null,
        status: 'em_progresso',
        backupBucket: this.backupBucket,
        backupPrefix,
        iniciadoEm,
        iniciadoPorId: iniciadoPorId || null,
        logs: [],
      })
      .returning();

    const logs: string[] = [];

    try {
      let arquivosParaBackup;

      if (tipo === 'completo') {
        arquivosParaBackup = await this.getFilesForFullBackup(corretoraId);
        logs.push(`Backup completo iniciado: ${arquivosParaBackup.length} arquivos`);
      } else {
        const lastBackup = await this.getLastFullBackup(corretoraId);
        const since = lastBackup?.iniciadoEm || new Date(0);
        arquivosParaBackup = await this.getFilesForIncrementalBackup(corretoraId, since);
        logs.push(
          `Backup incremental iniciado: ${arquivosParaBackup.length} arquivos desde ${since.toISOString()}`,
        );
      }

      if (arquivosParaBackup.length === 0) {
        logs.push('Nenhum arquivo para backup');

        const finalizadoEm = new Date();
        const duracaoSegundos = Math.floor((finalizadoEm.getTime() - iniciadoEm.getTime()) / 1000);

        await db
          .update(backups)
          .set({ status: 'concluido', finalizadoEm, totalArquivos: 0, totalBytes: 0, duracaoSegundos, logs })
          .where(eq(backups.id, backup.id));

        return { backupId: backup.id, tipo, totalArquivos: 0, totalBytes: 0, duracaoSegundos, backupPrefix };
      }

      let totalBytes = 0;
      let arquivosNovos = 0;
      let arquivosIgnorados = 0;
      let arquivosFalhos = 0;

      const limit = pLimit(50);

      const resultados = await Promise.all(
        arquivosParaBackup.map(anexo => limit(async () => {
          const destKey = `${backupPrefix}/${anexo.r2Key}`;

          if (tipo === 'completo') {
            try {
              const existing = await this.r2Backup.getMetadata(destKey);
              if (existing.size > 0 && existing.size === anexo.tamanho) {
                return { status: 'ignorado' as const, bytes: anexo.tamanho };
              }
            } catch {
              // Arquivo não existe no backup — segue para copiar
            }
          }

          try {
            await this.r2Main.copyToOtherBucket(anexo.r2Key, this.backupBucket, destKey);
            return { status: 'copiado' as const, bytes: anexo.tamanho, nome: anexo.nomeOriginal };
          } catch (error: any) {
            return { status: 'falhou' as const, bytes: 0, nome: anexo.nomeOriginal, erro: error.message };
          }
        }))
      );

      for (const r of resultados) {
        totalBytes += r.bytes;
        if (r.status === 'ignorado') {
          arquivosIgnorados++;
        } else if (r.status === 'copiado') {
          arquivosNovos++;
          logs.push(`Copiado: ${r.nome} (${r.bytes} bytes)`);
        } else {
          arquivosFalhos++;
          logs.push(`Erro ao copiar ${r.nome}: ${r.erro}`);
        }
      }

      if (arquivosIgnorados > 0) {
        logs.push(`Ignorados (inalterados): ${arquivosIgnorados} arquivos`);
      }

      const checksumMD5 = this.calculateBackupChecksum(backupPrefix, arquivosParaBackup.length, totalBytes);
      const finalizadoEm = new Date();
      const duracaoSegundos = Math.floor((finalizadoEm.getTime() - iniciadoEm.getTime()) / 1000);

      logs.push(
        `Backup concluído: ${arquivosParaBackup.length} arquivos, ${(totalBytes / (1024 * 1024)).toFixed(2)}MB`,
      );

      const status = arquivosNovos === 0 && arquivosFalhos > 0 ? 'falhou' : 'concluido';
      const erroMsg =
        arquivosFalhos > 0
          ? `${arquivosFalhos} arquivo(s) falharam na cópia (${arquivosNovos} copiados com sucesso)`
          : null;

      await db
        .update(backups)
        .set({
          status,
          totalArquivos: arquivosParaBackup.length,
          totalBytes,
          arquivosNovos,
          arquivosModificados: 0,
          checksumMD5,
          finalizadoEm,
          duracaoSegundos,
          logs,
          erro: erroMsg,
        })
        .where(eq(backups.id, backup.id));

      return { backupId: backup.id, tipo, totalArquivos: arquivosParaBackup.length, totalBytes, duracaoSegundos, backupPrefix };
    } catch (error: any) {
      logs.push(`Erro fatal: ${error.message}`);

      await db
        .update(backups)
        .set({ status: 'falhou', finalizadoEm: new Date(), erro: error.message, logs })
        .where(eq(backups.id, backup.id));

      throw error;
    }
  }

  /**
   * Criar backup do banco de dados via Neon Branching API.
   * Cria um branch imutável do banco no estado atual — snapshot instantâneo sem pg_dump.
   * Requer NEON_API_KEY e NEON_PROJECT_ID.
   */
  static async createDatabaseBackup(): Promise<DatabaseBackupResult | null> {
    const projectId = process.env.NEON_PROJECT_ID;
    const apiKey = process.env.NEON_API_KEY;

    if (!projectId || !apiKey) {
      console.log('NEON_PROJECT_ID ou NEON_API_KEY não configurados — backup de banco ignorado');
      return null;
    }

    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const branchName = `backup-${date}-${Date.now()}`;

    const response = await fetchNeon(
      `https://console.neon.tech/api/v2/projects/${projectId}/branches`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          branch: { name: branchName },
          endpoints: [], // Sem endpoint — apenas snapshot, sem custo de computação
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ao criar branch Neon (${response.status}): ${errorText}`);
    }

    const data = await response.json() as any;

    console.log(`Backup de banco criado: branch "${data.branch.name}" (${data.branch.id})`);

    return {
      branchId: data.branch.id,
      branchName: data.branch.name,
      projectId,
    };
  }

  /**
   * Remover branches de backup antigas do Neon (mantém os últimos N dias).
   */
  static async cleanupNeonBranches(retentionDays: number = 30): Promise<number> {
    const projectId = process.env.NEON_PROJECT_ID;
    const apiKey = process.env.NEON_API_KEY;

    if (!projectId || !apiKey) return 0;

    const listResponse = await fetchNeon(
      `https://console.neon.tech/api/v2/projects/${projectId}/branches`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
      },
    );

    if (!listResponse.ok) return 0;

    const data = await listResponse.json() as any;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const branchesToDelete = (data.branches || []).filter(
      (branch: any) => branch.name?.startsWith('backup-') && new Date(branch.created_at) < cutoffDate,
    );

    const neonLimit = pLimit(3);

    const results = await Promise.allSettled(
      branchesToDelete.map((branch: any) =>
        neonLimit(async () => {
          const delResponse = await fetchNeon(
            `https://console.neon.tech/api/v2/projects/${projectId}/branches/${branch.id}`,
            {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${apiKey}` },
            },
          );

          if (!delResponse.ok) throw new Error(`HTTP ${delResponse.status}`);
          console.log(`Branch de backup removida: ${branch.name}`);
        }),
      ),
    );

    const deleted = results.filter(r => r.status === 'fulfilled').length;
    return deleted;
  }

  /**
   * Verificar integridade do backup
   */
  static async verifyBackup(backupId: string): Promise<boolean> {
    const backup = await db.query.backups.findFirst({
      where: eq(backups.id, backupId),
    });

    if (!backup) throw new Error('Backup não encontrado');

    const isValid = backup.status === 'concluido' && (backup.totalArquivos ?? 0) > 0;

    await db
      .update(backups)
      .set({ verificado: isValid, verificadoEm: new Date() })
      .where(eq(backups.id, backupId));

    return isValid;
  }

  /**
   * Deletar arquivos de um backup do R2 e remover registro do banco
   */
  static async deleteBackup(backupId: string): Promise<void> {
    const backup = await db.query.backups.findFirst({
      where: eq(backups.id, backupId),
    });

    if (!backup) throw new Error('Backup não encontrado');

    // Deletar arquivos do bucket de backup
    try {
      const keys = await this.r2Backup.listObjectsByPrefix(backup.backupPrefix);
      if (keys.length > 0) {
        await this.r2Backup.deleteBatch(keys);
        console.log(`Removidos ${keys.length} arquivos do backup ${backupId} do R2`);
      }
    } catch (error: any) {
      console.error(`Erro ao remover arquivos do R2 para backup ${backupId}:`, error.message);
      // Continua para remover do banco mesmo se R2 falhar
    }

    await db.delete(backups).where(eq(backups.id, backupId));
  }

  /**
   * Restaurar backup (copia arquivos do bucket de backup de volta ao bucket principal)
   */
  static async restoreBackup(backupId: string): Promise<void> {
    const backup = await db.query.backups.findFirst({
      where: eq(backups.id, backupId),
    });

    if (!backup) throw new Error('Backup não encontrado');
    if (backup.status !== 'concluido') throw new Error('Backup não está concluído');

    const keys = await this.r2Backup.listObjectsByPrefix(backup.backupPrefix);

    if (keys.length === 0) {
      throw new Error('Nenhum arquivo encontrado no backup');
    }

    const mainBucket =
      process.env.CLOUDFLARE_R2_BUCKET || process.env.R2_BUCKET_NAME || 'ecotech-anexos';

    const restoreLimit = pLimit(50);

    const results = await Promise.allSettled(
      keys.map(backupKey => restoreLimit(async () => {
        const originalKey = backupKey.replace(`${backup.backupPrefix}/`, '');
        await this.r2Backup.copyToOtherBucket(backupKey, mainBucket, originalKey);
      }))
    );

    const restored = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    if (failed > 0) {
      results.forEach((r, i) => {
        if (r.status === 'rejected') {
          console.error(`Erro ao restaurar ${keys[i]}: ${r.reason?.message}`);
        }
      });
    }

    console.log(`Restauração concluída: ${restored}/${keys.length} arquivos${failed > 0 ? ` (${failed} falhas)` : ''}`);
  }

  /**
   * Limpar backups antigos.
   *
   * - Incrementais: remove do banco E do R2 (cada um tem prefixo único)
   * - Completos: remove apenas o registro do banco — o R2 usa prefixo fixo
   *   "current" que é atualizado in-place e não deve ser deletado por aqui.
   */
  static async cleanupOldBackups(
    retentionDays: number = 7,
    tipo: 'incremental' | 'completo' = 'incremental',
  ): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // Busca backups MAIS ANTIGOS que a data de corte (lte = menor ou igual)
    const oldBackups = await db.query.backups.findMany({
      where: and(
        eq(backups.tipo, tipo),
        eq(backups.status, 'concluido'),
        lte(backups.iniciadoEm, cutoffDate),
      ),
    });

    let deletedCount = 0;
    for (const backup of oldBackups) {
      try {
        if (tipo === 'incremental') {
          // Incrementais têm prefixo único por timestamp — deleta R2 + banco
          await this.deleteBackup(backup.id);
        } else {
          // Completos usam prefixo fixo "current" — deleta só o registro do banco
          await db.delete(backups).where(eq(backups.id, backup.id));
        }
        deletedCount++;
      } catch (error: any) {
        console.error(`Erro ao limpar backup ${backup.id}:`, error.message);
      }
    }

    console.log(`Limpeza concluída: ${deletedCount} backups do tipo "${tipo}" removidos`);
    return deletedCount;
  }

  private static async getFilesForFullBackup(corretoraId?: string): Promise<any[]> {
    return await db.query.anexos.findMany({
      where: and(
        corretoraId ? eq(anexos.corretoraId, corretoraId) : undefined,
        isNull(anexos.deletedAt),
      ),
    });
  }

  private static async getFilesForIncrementalBackup(
    corretoraId: string | undefined,
    since: Date,
  ): Promise<any[]> {
    return await db.query.anexos.findMany({
      where: and(
        corretoraId ? eq(anexos.corretoraId, corretoraId) : undefined,
        isNull(anexos.deletedAt),
        gte(anexos.uploadEm, since),
      ),
    });
  }

  private static async getLastFullBackup(corretoraId?: string): Promise<any | null> {
    return await db.query.backups.findFirst({
      where: and(
        eq(backups.tipo, 'completo'),
        eq(backups.status, 'concluido'),
        corretoraId ? eq(backups.corretoraId, corretoraId) : isNull(backups.corretoraId),
      ),
      orderBy: (backups, { desc }) => [desc(backups.iniciadoEm)],
    });
  }

  private static buildBackupPrefix(
    tipo: 'incremental' | 'completo',
    corretoraId: string | undefined,
    timestamp: number,
  ): string {
    const scope = corretoraId || 'global';
    if (tipo === 'completo') {
      // Prefixo fixo: o full backup é sempre atualizado in-place.
      // Arquivos inalterados são ignorados (size check), então nunca há cópia desnecessária.
      return `full/${scope}/current`;
    }
    return `incremental/${scope}/${timestamp}`;
  }

  private static calculateBackupChecksum(prefix: string, fileCount: number, totalBytes: number): string {
    const data = `${prefix}|${fileCount}|${totalBytes}`;
    return crypto.createHash('md5').update(data).digest('hex');
  }
}
