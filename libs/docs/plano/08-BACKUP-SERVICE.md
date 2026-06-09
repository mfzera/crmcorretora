# 08 - Backup Service

**Navegação**: [← 07. Metrics Service](./07-METRICS-SERVICE.md) | [Índice](./00-INDICE.md) | [09. API Admin →](./09-API-ADMIN.md)

---

## Visão Geral

O **BackupService** implementa sistema completo de backup e restore para arquivos no R2:

1. **Backup Incremental**: Apenas arquivos novos/modificados (diário)
2. **Backup Completo**: Todos os arquivos (semanal)
3. **Verificação de Integridade**: Checksums MD5
4. **Restore**: Restauração de backups
5. **Retenção**: 30 dias incrementais, 90 dias completos
6. **Agendamento**: Cron jobs automáticos

## Estratégia de Backup

```
Bucket Principal (ecotech-anexos):
  {corretoraId}/cotacoes/...
  {corretoraId}/documentos/...
  {corretoraId}/chat/...

Bucket de Backup (ecotech-backups):
  incremental/
    {corretoraId}/
      {timestamp}/
        manifest.json
        files/...
  full/
    {corretoraId}/
      {timestamp}/
        manifest.json
        files/...
```

## Implementação Completa

### Arquivo: `libs/shared/storage/src/backup-service.ts`

```typescript
import { 
  S3Client, 
  CopyObjectCommand, 
  ListObjectsV2Command,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand
} from '@aws-sdk/client-s3';
import { db } from '@ecotech/database';
import { anexos, backups, backupSchedules, corretoras } from '@ecotech/database/schema';
import { eq, and, isNull, gte, lte, desc, or } from 'drizzle-orm';
import { env } from '@ecotech/env';
import * as crypto from 'crypto';

export interface BackupManifest {
  backupId: string;
  corretoraId: string;
  tipo: 'incremental' | 'completo';
  timestamp: string;
  arquivos: Array<{
    r2Key: string;
    tamanho: number;
    md5: string;
    anexoId: string;
  }>;
  totalArquivos: number;
  totalBytes: number;
}

export interface BackupResult {
  backupId: string;
  tipo: 'incremental' | 'completo';
  status: 'concluido' | 'falhou';
  totalArquivos: number;
  totalBytes: bigint;
  duracaoSegundos: number;
  erro?: string;
}

export interface RestoreOptions {
  targetCorretoraId?: string; // Para restore em outra corretora
  overwriteExisting?: boolean;
  dryRun?: boolean; // Simular restore sem executar
}

export class BackupService {
  private s3Client: S3Client;
  private backupBucket = 'ecotech-backups';
  private sourceBucket = env.R2_BUCKET_NAME;

  constructor() {
    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      },
    });
  }

  /**
   * Cria backup completo de uma corretora
   */
  async createFullBackup(
    corretoraId: string,
    iniciadoPorId?: string
  ): Promise<BackupResult> {
    const iniciadoEm = new Date();
    
    // Criar registro de backup
    const [backupRecord] = await db.insert(backups).values({
      tipo: 'completo',
      corretoraId,
      status: 'em_progresso',
      iniciadoEm,
      iniciadoPorId,
    }).returning();

    try {
      console.log(`[Backup] Iniciando backup completo para corretora ${corretoraId}`);

      // Buscar todos os anexos ativos da corretora
      const anexosList = await db.query.anexos.findMany({
        where: and(
          eq(anexos.corretoraId, corretoraId),
          isNull(anexos.deletedAt)
        ),
      });

      console.log(`[Backup] Encontrados ${anexosList.length} arquivos para backup`);

      if (anexosList.length === 0) {
        await this.finalizarBackup(backupRecord.id, 'concluido', 0, BigInt(0), []);
        return {
          backupId: backupRecord.id,
          tipo: 'completo',
          status: 'concluido',
          totalArquivos: 0,
          totalBytes: BigInt(0),
          duracaoSegundos: 0,
        };
      }

      // Criar prefixo do backup
      const timestamp = Date.now();
      const backupPrefix = `full/${corretoraId}/${timestamp}`;

      // Copiar arquivos para bucket de backup
      const manifestFiles: BackupManifest['arquivos'] = [];
      let totalBytes = BigInt(0);

      for (let i = 0; i < anexosList.length; i++) {
        const anexo = anexosList[i];
        
        try {
          // Copiar arquivo
          const destKey = `${backupPrefix}/files/${anexo.nomeArquivo}`;
          
          await this.s3Client.send(new CopyObjectCommand({
            Bucket: this.backupBucket,
            CopySource: `${this.sourceBucket}/${anexo.r2Key}`,
            Key: destKey,
          }));

          // Calcular MD5
          const md5 = await this.calculateMD5(anexo.r2Key);

          manifestFiles.push({
            r2Key: anexo.r2Key,
            tamanho: Number(anexo.tamanho),
            md5,
            anexoId: anexo.id,
          });

          totalBytes += BigInt(anexo.tamanho);

          // Log de progresso
          if ((i + 1) % 100 === 0) {
            console.log(`[Backup] Progresso: ${i + 1}/${anexosList.length} arquivos`);
          }
        } catch (error) {
          console.error(`[Backup] Erro ao copiar arquivo ${anexo.r2Key}:`, error);
          throw error;
        }
      }

      // Criar manifest
      const manifest: BackupManifest = {
        backupId: backupRecord.id,
        corretoraId,
        tipo: 'completo',
        timestamp: iniciadoEm.toISOString(),
        arquivos: manifestFiles,
        totalArquivos: manifestFiles.length,
        totalBytes: Number(totalBytes),
      };

      // Salvar manifest no R2
      await this.uploadManifest(backupPrefix, manifest);

      // Finalizar backup
      await this.finalizarBackup(
        backupRecord.id,
        'concluido',
        manifestFiles.length,
        totalBytes,
        [],
        backupPrefix
      );

      const duracaoSegundos = Math.floor((Date.now() - iniciadoEm.getTime()) / 1000);

      console.log(
        `[Backup] Backup completo finalizado: ${manifestFiles.length} arquivos, ` +
        `${this.formatBytes(totalBytes)}, ${duracaoSegundos}s`
      );

      return {
        backupId: backupRecord.id,
        tipo: 'completo',
        status: 'concluido',
        totalArquivos: manifestFiles.length,
        totalBytes,
        duracaoSegundos,
      };
    } catch (error) {
      console.error('[Backup] Erro ao criar backup completo:', error);

      await this.finalizarBackup(
        backupRecord.id,
        'falhou',
        0,
        BigInt(0),
        [],
        undefined,
        error instanceof Error ? error.message : 'Erro desconhecido'
      );

      return {
        backupId: backupRecord.id,
        tipo: 'completo',
        status: 'falhou',
        totalArquivos: 0,
        totalBytes: BigInt(0),
        duracaoSegundos: 0,
        erro: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  /**
   * Cria backup incremental (apenas arquivos novos desde o último backup)
   */
  async createIncrementalBackup(
    corretoraId: string,
    iniciadoPorId?: string
  ): Promise<BackupResult> {
    const iniciadoEm = new Date();

    // Criar registro de backup
    const [backupRecord] = await db.insert(backups).values({
      tipo: 'incremental',
      corretoraId,
      status: 'em_progresso',
      iniciadoEm,
      iniciadoPorId,
    }).returning();

    try {
      console.log(`[Backup] Iniciando backup incremental para corretora ${corretoraId}`);

      // Buscar último backup bem-sucedido
      const ultimoBackup = await db.query.backups.findFirst({
        where: and(
          eq(backups.corretoraId, corretoraId),
          eq(backups.status, 'concluido')
        ),
        orderBy: [desc(backups.iniciadoEm)],
      });

      const dataInicio = ultimoBackup?.iniciadoEm || new Date(0);

      // Buscar anexos criados/modificados desde o último backup
      const anexosNovos = await db.query.anexos.findMany({
        where: and(
          eq(anexos.corretoraId, corretoraId),
          isNull(anexos.deletedAt),
          gte(anexos.uploadEm, dataInicio)
        ),
      });

      console.log(
        `[Backup] Encontrados ${anexosNovos.length} arquivos novos desde ` +
        `${dataInicio.toISOString()}`
      );

      if (anexosNovos.length === 0) {
        await this.finalizarBackup(backupRecord.id, 'concluido', 0, BigInt(0), []);
        return {
          backupId: backupRecord.id,
          tipo: 'incremental',
          status: 'concluido',
          totalArquivos: 0,
          totalBytes: BigInt(0),
          duracaoSegundos: 0,
        };
      }

      // Criar prefixo do backup
      const timestamp = Date.now();
      const backupPrefix = `incremental/${corretoraId}/${timestamp}`;

      // Copiar arquivos para bucket de backup
      const manifestFiles: BackupManifest['arquivos'] = [];
      let totalBytes = BigInt(0);

      for (const anexo of anexosNovos) {
        try {
          const destKey = `${backupPrefix}/files/${anexo.nomeArquivo}`;

          await this.s3Client.send(new CopyObjectCommand({
            Bucket: this.backupBucket,
            CopySource: `${this.sourceBucket}/${anexo.r2Key}`,
            Key: destKey,
          }));

          const md5 = await this.calculateMD5(anexo.r2Key);

          manifestFiles.push({
            r2Key: anexo.r2Key,
            tamanho: Number(anexo.tamanho),
            md5,
            anexoId: anexo.id,
          });

          totalBytes += BigInt(anexo.tamanho);
        } catch (error) {
          console.error(`[Backup] Erro ao copiar arquivo ${anexo.r2Key}:`, error);
          throw error;
        }
      }

      // Criar manifest
      const manifest: BackupManifest = {
        backupId: backupRecord.id,
        corretoraId,
        tipo: 'incremental',
        timestamp: iniciadoEm.toISOString(),
        arquivos: manifestFiles,
        totalArquivos: manifestFiles.length,
        totalBytes: Number(totalBytes),
      };

      // Salvar manifest
      await this.uploadManifest(backupPrefix, manifest);

      // Finalizar backup
      await this.finalizarBackup(
        backupRecord.id,
        'concluido',
        manifestFiles.length,
        totalBytes,
        [],
        backupPrefix
      );

      const duracaoSegundos = Math.floor((Date.now() - iniciadoEm.getTime()) / 1000);

      console.log(
        `[Backup] Backup incremental finalizado: ${manifestFiles.length} arquivos, ` +
        `${this.formatBytes(totalBytes)}, ${duracaoSegundos}s`
      );

      return {
        backupId: backupRecord.id,
        tipo: 'incremental',
        status: 'concluido',
        totalArquivos: manifestFiles.length,
        totalBytes,
        duracaoSegundos,
      };
    } catch (error) {
      console.error('[Backup] Erro ao criar backup incremental:', error);

      await this.finalizarBackup(
        backupRecord.id,
        'falhou',
        0,
        BigInt(0),
        [],
        undefined,
        error instanceof Error ? error.message : 'Erro desconhecido'
      );

      return {
        backupId: backupRecord.id,
        tipo: 'incremental',
        status: 'falhou',
        totalArquivos: 0,
        totalBytes: BigInt(0),
        duracaoSegundos: 0,
        erro: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  /**
   * Restaura backup
   */
  async restoreBackup(
    backupId: string,
    options: RestoreOptions = {}
  ): Promise<{
    success: boolean;
    arquivosRestaurados: number;
    bytesRestaurados: bigint;
    erros: string[];
  }> {
    console.log(`[Backup] Iniciando restore do backup ${backupId}`);

    // Buscar backup
    const backup = await db.query.backups.findFirst({
      where: eq(backups.id, backupId),
    });

    if (!backup) {
      throw new Error('Backup não encontrado');
    }

    if (backup.status !== 'concluido') {
      throw new Error('Backup incompleto ou falhou');
    }

    // Baixar manifest
    const manifest = await this.downloadManifest(backup.backupPrefix!);

    if (!manifest) {
      throw new Error('Manifest do backup não encontrado');
    }

    const targetCorretoraId = options.targetCorretoraId || backup.corretoraId;
    const erros: string[] = [];
    let arquivosRestaurados = 0;
    let bytesRestaurados = BigInt(0);

    console.log(
      `[Backup] Restaurando ${manifest.totalArquivos} arquivos para corretora ${targetCorretoraId}`
    );

    if (options.dryRun) {
      console.log('[Backup] DRY RUN - Nenhum arquivo será restaurado');
      return {
        success: true,
        arquivosRestaurados: manifest.totalArquivos,
        bytesRestaurados: BigInt(manifest.totalBytes),
        erros: [],
      };
    }

    for (const file of manifest.arquivos) {
      try {
        // Verificar se já existe
        const existente = await db.query.anexos.findFirst({
          where: eq(anexos.id, file.anexoId),
        });

        if (existente && !options.overwriteExisting) {
          console.log(`[Backup] Arquivo ${file.anexoId} já existe, pulando`);
          continue;
        }

        // Copiar arquivo do backup para bucket principal
        const sourceKey = `${backup.backupPrefix}/files/${file.r2Key.split('/').pop()}`;
        const destKey = file.r2Key;

        await this.s3Client.send(new CopyObjectCommand({
          Bucket: this.sourceBucket,
          CopySource: `${this.backupBucket}/${sourceKey}`,
          Key: destKey,
        }));

        // Verificar integridade
        const md5Restored = await this.calculateMD5(destKey);
        if (md5Restored !== file.md5) {
          throw new Error(`Checksum mismatch: esperado ${file.md5}, obtido ${md5Restored}`);
        }

        // Restaurar registro no banco (se não existir)
        if (!existente) {
          // Buscar anexo original do backup
          const anexoOriginal = await db.query.anexos.findFirst({
            where: eq(anexos.id, file.anexoId),
          });

          if (anexoOriginal) {
            await db.insert(anexos).values({
              ...anexoOriginal,
              corretoraId: targetCorretoraId,
              deletedAt: null,
            });
          }
        }

        arquivosRestaurados++;
        bytesRestaurados += BigInt(file.tamanho);

        if (arquivosRestaurados % 100 === 0) {
          console.log(`[Backup] Progresso: ${arquivosRestaurados}/${manifest.totalArquivos}`);
        }
      } catch (error) {
        const mensagemErro = `Erro ao restaurar ${file.r2Key}: ${
          error instanceof Error ? error.message : 'Erro desconhecido'
        }`;
        console.error(`[Backup] ${mensagemErro}`);
        erros.push(mensagemErro);
      }
    }

    const success = erros.length === 0;

    console.log(
      `[Backup] Restore ${success ? 'concluído' : 'concluído com erros'}: ` +
      `${arquivosRestaurados}/${manifest.totalArquivos} arquivos, ` +
      `${this.formatBytes(bytesRestaurados)}`
    );

    if (erros.length > 0) {
      console.error(`[Backup] ${erros.length} erros durante restore`);
    }

    return {
      success,
      arquivosRestaurados,
      bytesRestaurados,
      erros,
    };
  }

  /**
   * Verifica integridade de um backup
   */
  async verifyBackup(backupId: string): Promise<{
    valid: boolean;
    totalArquivos: number;
    arquivosVerificados: number;
    erros: string[];
  }> {
    console.log(`[Backup] Verificando integridade do backup ${backupId}`);

    const backup = await db.query.backups.findFirst({
      where: eq(backups.id, backupId),
    });

    if (!backup) {
      throw new Error('Backup não encontrado');
    }

    const manifest = await this.downloadManifest(backup.backupPrefix!);

    if (!manifest) {
      return {
        valid: false,
        totalArquivos: 0,
        arquivosVerificados: 0,
        erros: ['Manifest não encontrado'],
      };
    }

    const erros: string[] = [];
    let arquivosVerificados = 0;

    for (const file of manifest.arquivos) {
      try {
        const key = `${backup.backupPrefix}/files/${file.r2Key.split('/').pop()}`;

        // Verificar se arquivo existe
        await this.s3Client.send(new HeadObjectCommand({
          Bucket: this.backupBucket,
          Key: key,
        }));

        // Verificar checksum
        const md5 = await this.calculateMD5(key, this.backupBucket);
        if (md5 !== file.md5) {
          erros.push(`Checksum mismatch para ${file.r2Key}`);
        } else {
          arquivosVerificados++;
        }
      } catch (error) {
        erros.push(`Arquivo não encontrado: ${file.r2Key}`);
      }
    }

    const valid = erros.length === 0;

    // Atualizar registro
    await db.update(backups)
      .set({ verificado: valid })
      .where(eq(backups.id, backupId));

    console.log(
      `[Backup] Verificação ${valid ? 'OK' : 'FALHOU'}: ` +
      `${arquivosVerificados}/${manifest.totalArquivos} arquivos válidos`
    );

    return {
      valid,
      totalArquivos: manifest.totalArquivos,
      arquivosVerificados,
      erros,
    };
  }

  /**
   * Remove backups antigos (conforme política de retenção)
   */
  async cleanupOldBackups(): Promise<{
    removidosIncrementais: number;
    removidosCompletos: number;
  }> {
    console.log('[Backup] Iniciando limpeza de backups antigos');

    const agora = new Date();

    // Remover backups incrementais > 30 dias
    const dataLimiteIncremental = new Date(agora);
    dataLimiteIncremental.setDate(dataLimiteIncremental.getDate() - 30);

    const backupsIncrementaisAntigos = await db.query.backups.findMany({
      where: and(
        eq(backups.tipo, 'incremental'),
        lte(backups.iniciadoEm, dataLimiteIncremental)
      ),
    });

    // Remover backups completos > 90 dias
    const dataLimiteCompleto = new Date(agora);
    dataLimiteCompleto.setDate(dataLimiteCompleto.getDate() - 90);

    const backupsCompletosAntigos = await db.query.backups.findMany({
      where: and(
        eq(backups.tipo, 'completo'),
        lte(backups.iniciadoEm, dataLimiteCompleto)
      ),
    });

    // Remover do R2
    for (const backup of [...backupsIncrementaisAntigos, ...backupsCompletosAntigos]) {
      if (backup.backupPrefix) {
        await this.deleteBackupFiles(backup.backupPrefix);
      }
    }

    // Remover do banco
    await db.delete(backups)
      .where(
        or(
          and(
            eq(backups.tipo, 'incremental'),
            lte(backups.iniciadoEm, dataLimiteIncremental)
          ),
          and(
            eq(backups.tipo, 'completo'),
            lte(backups.iniciadoEm, dataLimiteCompleto)
          )
        )
      );

    console.log(
      `[Backup] Limpeza concluída: ${backupsIncrementaisAntigos.length} incrementais, ` +
      `${backupsCompletosAntigos.length} completos removidos`
    );

    return {
      removidosIncrementais: backupsIncrementaisAntigos.length,
      removidosCompletos: backupsCompletosAntigos.length,
    };
  }

  // === Métodos auxiliares privados ===

  private async finalizarBackup(
    backupId: string,
    status: 'concluido' | 'falhou',
    totalArquivos: number,
    totalBytes: bigint,
    logs: any[],
    backupPrefix?: string,
    erro?: string
  ): Promise<void> {
    const finalizadoEm = new Date();

    await db.update(backups)
      .set({
        status,
        finalizadoEm,
        totalArquivos,
        totalBytes: totalBytes.toString(),
        backupBucket: this.backupBucket,
        backupPrefix,
        logs,
        erro,
      })
      .where(eq(backups.id, backupId));
  }

  private async uploadManifest(prefix: string, manifest: BackupManifest): Promise<void> {
    const key = `${prefix}/manifest.json`;
    const body = JSON.stringify(manifest, null, 2);

    await this.s3Client.send(new CopyObjectCommand({
      Bucket: this.backupBucket,
      Key: key,
      Body: body,
      ContentType: 'application/json',
    }));
  }

  private async downloadManifest(prefix: string): Promise<BackupManifest | null> {
    try {
      const key = `${prefix}/manifest.json`;

      const response = await this.s3Client.send(new GetObjectCommand({
        Bucket: this.backupBucket,
        Key: key,
      }));

      const body = await response.Body?.transformToString();
      return body ? JSON.parse(body) : null;
    } catch (error) {
      console.error('[Backup] Erro ao baixar manifest:', error);
      return null;
    }
  }

  private async calculateMD5(key: string, bucket?: string): Promise<string> {
    const response = await this.s3Client.send(new GetObjectCommand({
      Bucket: bucket || this.sourceBucket,
      Key: key,
    }));

    const body = await response.Body?.transformToByteArray();
    if (!body) {
      throw new Error('Não foi possível baixar arquivo para calcular MD5');
    }

    return crypto.createHash('md5').update(body).digest('hex');
  }

  private async deleteBackupFiles(prefix: string): Promise<void> {
    let continuationToken: string | undefined;

    do {
      const response = await this.s3Client.send(new ListObjectsV2Command({
        Bucket: this.backupBucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }));

      if (response.Contents) {
        for (const obj of response.Contents) {
          if (obj.Key) {
            await this.s3Client.send(new DeleteObjectCommand({
              Bucket: this.backupBucket,
              Key: obj.Key,
            }));
          }
        }
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);
  }

  private formatBytes(bytes: bigint): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let value = Number(bytes);
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex++;
    }

    return `${value.toFixed(2)} ${units[unitIndex]}`;
  }
}

// Singleton
export const backupService = new BackupService();
```

## Integração com Workers

### Arquivo: `apps/worker/src/jobs/backup.job.ts`

```typescript
import { backupService } from '@ecotech/storage';
import { db } from '@ecotech/database';
import { corretoras, backupSchedules } from '@ecotech/database/schema';
import { eq, and } from 'drizzle-orm';
import { AlertService } from '@ecotech/utils';

const alertService = new AlertService();

/**
 * Job: Backup incremental diário (02:00)
 */
export async function dailyIncrementalBackupJob() {
  console.log('[Job] Iniciando backups incrementais diários...');

  const allCorretoras = await db.query.corretoras.findMany();
  const results: Array<{ corretoraId: string; success: boolean }> = [];

  for (const corretora of allCorretoras) {
    try {
      const result = await backupService.createIncrementalBackup(corretora.id);
      
      results.push({
        corretoraId: corretora.id,
        success: result.status === 'concluido',
      });

      if (result.status === 'falhou') {
        await alertService.alertBackupFailed(result.backupId, corretora.id);
      }
    } catch (error) {
      console.error(`[Job] Erro ao fazer backup de ${corretora.nomeFantasia}:`, error);
      results.push({ corretoraId: corretora.id, success: false });
    }
  }

  const sucessos = results.filter(r => r.success).length;
  const falhas = results.filter(r => !r.success).length;

  console.log(
    `[Job] Backups incrementais concluídos: ${sucessos} sucessos, ${falhas} falhas`
  );
}

/**
 * Job: Backup completo semanal (domingo 03:00)
 */
export async function weeklyFullBackupJob() {
  console.log('[Job] Iniciando backups completos semanais...');

  const allCorretoras = await db.query.corretoras.findMany();
  const results: Array<{ corretoraId: string; success: boolean }> = [];

  for (const corretora of allCorretoras) {
    try {
      const result = await backupService.createFullBackup(corretora.id);
      
      results.push({
        corretoraId: corretora.id,
        success: result.status === 'concluido',
      });

      if (result.status === 'falhou') {
        await alertService.alertBackupFailed(result.backupId, corretora.id);
      }
    } catch (error) {
      console.error(`[Job] Erro ao fazer backup de ${corretora.nomeFantasia}:`, error);
      results.push({ corretoraId: corretora.id, success: false });
    }
  }

  const sucessos = results.filter(r => r.success).length;
  const falhas = results.filter(r => !r.success).length;

  console.log(
    `[Job] Backups completos concluídos: ${sucessos} sucessos, ${falhas} falhas`
  );
}

/**
 * Job: Verificar backups recentes (05:00)
 */
export async function verifyRecentBackupsJob() {
  console.log('[Job] Verificando backups recentes...');

  const dataInicio = new Date();
  dataInicio.setDate(dataInicio.getDate() - 7);

  const recentBackups = await db.query.backups.findMany({
    where: and(
      eq(backups.status, 'concluido'),
      eq(backups.verificado, false),
      gte(backups.iniciadoEm, dataInicio)
    ),
  });

  console.log(`[Job] Verificando ${recentBackups.length} backups...`);

  for (const backup of recentBackups) {
    try {
      const result = await backupService.verifyBackup(backup.id);
      
      if (!result.valid) {
        console.error(`[Job] Backup ${backup.id} INVÁLIDO`);
        await alertService.alertBackupIntegrityFailed(backup.id);
      } else {
        console.log(`[Job] Backup ${backup.id} OK`);
      }
    } catch (error) {
      console.error(`[Job] Erro ao verificar backup ${backup.id}:`, error);
    }
  }

  console.log('[Job] Verificação de backups concluída');
}

/**
 * Job: Limpeza de backups antigos (04:00)
 */
export async function cleanupOldBackupsJob() {
  console.log('[Job] Iniciando limpeza de backups antigos...');

  try {
    const result = await backupService.cleanupOldBackups();
    
    console.log(
      `[Job] Limpeza concluída: ${result.removidosIncrementais} incrementais, ` +
      `${result.removidosCompletos} completos removidos`
    );
  } catch (error) {
    console.error('[Job] Erro ao limpar backups antigos:', error);
  }
}
```

## Testes

### Script de Teste

```typescript
// scripts/test-backup.ts
import { backupService } from '@ecotech/storage';

async function testBackup() {
  const corretoraId = 'sua-corretora-id';

  // 1. Criar backup completo
  console.log('\n1. Criando backup completo...');
  const fullBackup = await backupService.createFullBackup(corretoraId);
  console.log('Resultado:', fullBackup);

  // 2. Verificar backup
  console.log('\n2. Verificando backup...');
  const verification = await backupService.verifyBackup(fullBackup.backupId);
  console.log('Verificação:', verification);

  // 3. Criar backup incremental
  console.log('\n3. Criando backup incremental...');
  const incrementalBackup = await backupService.createIncrementalBackup(corretoraId);
  console.log('Resultado:', incrementalBackup);

  // 4. Simular restore (dry run)
  console.log('\n4. Simulando restore (dry run)...');
  const dryRunRestore = await backupService.restoreBackup(fullBackup.backupId, {
    dryRun: true,
  });
  console.log('Dry run:', dryRunRestore);

  // 5. Restore real (cuidado!)
  // console.log('\n5. Restaurando backup...');
  // const restore = await backupService.restoreBackup(fullBackup.backupId);
  // console.log('Restore:', restore);
}

testBackup().catch(console.error);
```

### Executar:

```bash
npx tsx scripts/test-backup.ts
```

## Considerações de Segurança

1. **Bucket Separado**: Backups em bucket isolado
2. **Verificação de Integridade**: MD5 checksums para todos os arquivos
3. **Auditoria**: Todos os backups e restores são registrados
4. **Retenção**: Política automática evita acúmulo infinito
5. **Dry Run**: Testar restore antes de executar
6. **Isolamento por Tenant**: Cada corretora tem backups separados

## Próximos Passos

- [09. API Admin →](./09-API-ADMIN.md) - Rotas administrativas para backups
- [12. Workers/Jobs →](./12-WORKERS-JOBS.md) - Agendamento completo
- [13. Alertas →](./13-ALERTAS.md) - Alertas de backup falhou

---

**Navegação**: [← 07. Metrics Service](./07-METRICS-SERVICE.md) | [Índice](./00-INDICE.md) | [09. API Admin →](./09-API-ADMIN.md)
