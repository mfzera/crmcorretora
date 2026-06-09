# 07 - Storage Metrics Service

**Navegação**: [← 06. Admin Auth](./06-ADMIN-AUTH.md) | [Índice](./00-INDICE.md) | [08. Backup Service →](./08-BACKUP-SERVICE.md)

---

## Visão Geral

O **StorageMetricsService** é responsável por:
1. Calcular uso de storage em tempo real por corretora
2. Criar snapshots diários para análise histórica
3. Verificar limites e disparar alertas
4. Gerar estatísticas para o painel admin
5. Detectar arquivos órfãos e anomalias

## Arquitetura

```
StorageMetricsService
├── calculateUsage()        → Uso atual de uma corretora
├── createDailySnapshot()   → Snapshot para histórico
├── checkLimits()           → Verifica se está próximo do limite
├── getUsageHistory()       → Histórico para gráficos
├── getGlobalStats()        → Estatísticas de todo o sistema
├── findOrphanedFiles()     → Arquivos sem registro no DB
└── calculateCosts()        → Estimativa de custos R2
```

## Implementação Completa

### Arquivo: `libs/shared/storage/src/metrics-service.ts`

```typescript
import { db } from '@ecotech/database';
import { 
  anexos, 
  storageMetrics, 
  storageLimits, 
  corretoras 
} from '@ecotech/database/schema';
import { eq, and, isNull, gte, lte, desc, sql } from 'drizzle-orm';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { env } from '@ecotech/env';

export interface StorageUsage {
  corretoraId: string;
  totalArquivos: number;
  totalBytes: bigint;
  byType: {
    cotacoes: { count: number; bytes: bigint };
    documentos: { count: number; bytes: bigint };
    chat: { count: number; bytes: bigint };
  };
  byMimeType: Record<string, { count: number; bytes: bigint }>;
  largestFiles: Array<{
    id: string;
    nomeOriginal: string;
    tamanho: bigint;
    entidadeTipo: string;
    uploadEm: Date;
  }>;
}

export interface LimitStatus {
  ok: boolean;
  shouldAlert: boolean;
  shouldBlock: boolean;
  percentUsed: number;
  bytesUsed: bigint;
  bytesLimit: bigint;
  arquivosUsed: number;
  arquivosLimit: number | null;
}

export interface UsageHistory {
  data: Date;
  totalBytes: bigint;
  totalArquivos: number;
  crescimentoBytes: bigint;
  crescimentoArquivos: number;
}

export interface GlobalStats {
  totalCorretoras: number;
  totalArquivos: number;
  totalBytes: bigint;
  totalBytesCotacoes: bigint;
  totalBytesDocumentos: bigint;
  totalBytesChat: bigint;
  custoEstimadoMensal: number;
  crescimentoUltimos30Dias: bigint;
  corretorasProximasLimite: Array<{
    corretoraId: string;
    nomeFantasia: string;
    percentUsed: number;
  }>;
}

export class StorageMetricsService {
  private s3Client: S3Client;

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
   * Calcula uso atual de storage de uma corretora
   */
  async calculateUsage(corretoraId: string): Promise<StorageUsage> {
    // Buscar todos os anexos ativos da corretora
    const anexosList = await db.query.anexos.findMany({
      where: and(
        eq(anexos.corretoraId, corretoraId),
        isNull(anexos.deletedAt)
      ),
      orderBy: [desc(anexos.tamanho)],
    });

    // Calcular totais
    const totalArquivos = anexosList.length;
    const totalBytes = anexosList.reduce((sum, a) => sum + BigInt(a.tamanho), BigInt(0));

    // Agrupar por tipo de entidade
    const byType = {
      cotacoes: {
        count: anexosList.filter(a => a.entidadeTipo === 'cotacao').length,
        bytes: anexosList
          .filter(a => a.entidadeTipo === 'cotacao')
          .reduce((sum, a) => sum + BigInt(a.tamanho), BigInt(0)),
      },
      documentos: {
        count: anexosList.filter(a => a.entidadeTipo === 'documento_venda').length,
        bytes: anexosList
          .filter(a => a.entidadeTipo === 'documento_venda')
          .reduce((sum, a) => sum + BigInt(a.tamanho), BigInt(0)),
      },
      chat: {
        count: anexosList.filter(a => a.entidadeTipo === 'mensagem_chat').length,
        bytes: anexosList
          .filter(a => a.entidadeTipo === 'mensagem_chat')
          .reduce((sum, a) => sum + BigInt(a.tamanho), BigInt(0)),
      },
    };

    // Agrupar por MIME type
    const byMimeType: Record<string, { count: number; bytes: bigint }> = {};
    for (const anexo of anexosList) {
      if (!byMimeType[anexo.mimeType]) {
        byMimeType[anexo.mimeType] = { count: 0, bytes: BigInt(0) };
      }
      byMimeType[anexo.mimeType].count++;
      byMimeType[anexo.mimeType].bytes += BigInt(anexo.tamanho);
    }

    // Top 50 maiores arquivos
    const largestFiles = anexosList.slice(0, 50).map(a => ({
      id: a.id,
      nomeOriginal: a.nomeOriginal,
      tamanho: BigInt(a.tamanho),
      entidadeTipo: a.entidadeTipo,
      uploadEm: a.uploadEm!,
    }));

    return {
      corretoraId,
      totalArquivos,
      totalBytes,
      byType,
      byMimeType,
      largestFiles,
    };
  }

  /**
   * Cria snapshot diário de uso (chamado por cron job)
   */
  async createDailySnapshot(): Promise<void> {
    console.log('[StorageMetrics] Criando snapshot diário...');

    const allCorretoras = await db.query.corretoras.findMany();
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    for (const corretora of allCorretoras) {
      try {
        // Verificar se já existe snapshot de hoje
        const existente = await db.query.storageMetrics.findFirst({
          where: and(
            eq(storageMetrics.corretoraId, corretora.id),
            eq(storageMetrics.data, hoje)
          ),
        });

        if (existente) {
          console.log(`[StorageMetrics] Snapshot já existe para ${corretora.nomeFantasia}`);
          continue;
        }

        // Calcular uso atual
        const usage = await this.calculateUsage(corretora.id);

        // Buscar snapshot anterior (ontem)
        const ontem = new Date(hoje);
        ontem.setDate(ontem.getDate() - 1);

        const snapshotAnterior = await db.query.storageMetrics.findFirst({
          where: and(
            eq(storageMetrics.corretoraId, corretora.id),
            eq(storageMetrics.data, ontem)
          ),
        });

        // Calcular crescimento
        const arquivosAdicionados = snapshotAnterior
          ? usage.totalArquivos - snapshotAnterior.totalArquivos
          : usage.totalArquivos;

        const bytesAdicionados = snapshotAnterior
          ? usage.totalBytes - BigInt(snapshotAnterior.totalBytes)
          : usage.totalBytes;

        // Calcular custo estimado (R2 pricing)
        const custoStorage = Number(usage.totalBytes) / (1024 ** 3) * 0.015; // $0.015/GB/mês
        const custoOperacoes = usage.totalArquivos * 0.0000045; // Estimativa de writes
        const custoEstimadoMensal = custoStorage + custoOperacoes;

        // Inserir snapshot
        await db.insert(storageMetrics).values({
          corretoraId: corretora.id,
          data: hoje,
          totalArquivos: usage.totalArquivos,
          totalBytes: usage.totalBytes.toString(),
          totalBytesCotacoes: usage.byType.cotacoes.bytes.toString(),
          totalBytesDocumentos: usage.byType.documentos.bytes.toString(),
          totalBytesChat: usage.byType.chat.bytes.toString(),
          arquivosAdicionados,
          arquivosRemovidos: 0, // TODO: implementar tracking de remoções
          bytesAdicionados: bytesAdicionados.toString(),
          bytesRemovidos: '0',
          custoEstimadoMensal: custoEstimadoMensal.toFixed(2),
        });

        console.log(
          `[StorageMetrics] Snapshot criado para ${corretora.nomeFantasia}: ` +
          `${usage.totalArquivos} arquivos, ${this.formatBytes(usage.totalBytes)}`
        );
      } catch (error) {
        console.error(
          `[StorageMetrics] Erro ao criar snapshot para ${corretora.nomeFantasia}:`,
          error
        );
      }
    }

    console.log('[StorageMetrics] Snapshot diário concluído');
  }

  /**
   * Verifica se corretora está próxima do limite
   */
  async checkLimits(corretoraId: string): Promise<LimitStatus> {
    // Calcular uso atual
    const usage = await this.calculateUsage(corretoraId);

    // Buscar limites configurados
    const limit = await db.query.storageLimits.findFirst({
      where: eq(storageLimits.corretoraId, corretoraId),
    });

    // Se não há limites configurados, está OK
    if (!limit) {
      return {
        ok: true,
        shouldAlert: false,
        shouldBlock: false,
        percentUsed: 0,
        bytesUsed: usage.totalBytes,
        bytesLimit: BigInt(0),
        arquivosUsed: usage.totalArquivos,
        arquivosLimit: null,
      };
    }

    // Calcular percentual usado (bytes)
    const percentUsedBytes = (Number(usage.totalBytes) / Number(limit.limiteBytes)) * 100;

    // Calcular percentual usado (arquivos)
    let percentUsedArquivos = 0;
    if (limit.limiteArquivos) {
      percentUsedArquivos = (usage.totalArquivos / limit.limiteArquivos) * 100;
    }

    // Usar o maior percentual
    const percentUsed = Math.max(percentUsedBytes, percentUsedArquivos);

    // Determinar status
    const shouldAlert = percentUsed >= Number(limit.alertarEm);
    const shouldBlock = percentUsed >= Number(limit.bloquearUploadEm);
    const ok = !shouldBlock;

    return {
      ok,
      shouldAlert,
      shouldBlock,
      percentUsed,
      bytesUsed: usage.totalBytes,
      bytesLimit: BigInt(limit.limiteBytes),
      arquivosUsed: usage.totalArquivos,
      arquivosLimit: limit.limiteArquivos,
    };
  }

  /**
   * Retorna histórico de uso para gráficos
   */
  async getUsageHistory(
    corretoraId: string,
    dias: number = 30
  ): Promise<UsageHistory[]> {
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - dias);

    const snapshots = await db.query.storageMetrics.findMany({
      where: and(
        eq(storageMetrics.corretoraId, corretoraId),
        gte(storageMetrics.data, dataInicio)
      ),
      orderBy: [desc(storageMetrics.data)],
    });

    return snapshots.map(s => ({
      data: s.data,
      totalBytes: BigInt(s.totalBytes),
      totalArquivos: s.totalArquivos,
      crescimentoBytes: BigInt(s.bytesAdicionados),
      crescimentoArquivos: s.arquivosAdicionados,
    }));
  }

  /**
   * Estatísticas globais do sistema (para admin panel)
   */
  async getGlobalStats(): Promise<GlobalStats> {
    // Buscar todas as corretoras
    const allCorretoras = await db.query.corretoras.findMany();
    const totalCorretoras = allCorretoras.length;

    // Calcular totais de todos os anexos ativos
    const result = await db
      .select({
        count: sql<number>`COUNT(*)::int`,
        totalBytes: sql<string>`SUM(${anexos.tamanho})::text`,
        cotacoesBytes: sql<string>`SUM(CASE WHEN ${anexos.entidadeTipo} = 'cotacao' THEN ${anexos.tamanho} ELSE 0 END)::text`,
        documentosBytes: sql<string>`SUM(CASE WHEN ${anexos.entidadeTipo} = 'documento_venda' THEN ${anexos.tamanho} ELSE 0 END)::text`,
        chatBytes: sql<string>`SUM(CASE WHEN ${anexos.entidadeTipo} = 'mensagem_chat' THEN ${anexos.tamanho} ELSE 0 END)::text`,
      })
      .from(anexos)
      .where(isNull(anexos.deletedAt));

    const stats = result[0];
    const totalBytes = BigInt(stats.totalBytes || '0');
    const totalBytesCotacoes = BigInt(stats.cotacoesBytes || '0');
    const totalBytesDocumentos = BigInt(stats.documentosBytes || '0');
    const totalBytesChat = BigInt(stats.chatBytes || '0');

    // Calcular custo estimado total
    const custoStorage = Number(totalBytes) / (1024 ** 3) * 0.015;
    const custoOperacoes = stats.count * 0.0000045;
    const custoEstimadoMensal = custoStorage + custoOperacoes;

    // Calcular crescimento nos últimos 30 dias
    const dataInicio30Dias = new Date();
    dataInicio30Dias.setDate(dataInicio30Dias.getDate() - 30);

    const crescimento = await db
      .select({
        totalCrescimento: sql<string>`SUM(${storageMetrics.bytesAdicionados})::text`,
      })
      .from(storageMetrics)
      .where(gte(storageMetrics.data, dataInicio30Dias));

    const crescimentoUltimos30Dias = BigInt(crescimento[0]?.totalCrescimento || '0');

    // Corretoras próximas do limite
    const corretorasProximasLimite: GlobalStats['corretorasProximasLimite'] = [];

    for (const corretora of allCorretoras) {
      const limitStatus = await this.checkLimits(corretora.id);
      
      if (limitStatus.shouldAlert) {
        corretorasProximasLimite.push({
          corretoraId: corretora.id,
          nomeFantasia: corretora.nomeFantasia,
          percentUsed: limitStatus.percentUsed,
        });
      }
    }

    // Ordenar por percentual usado (decrescente)
    corretorasProximasLimite.sort((a, b) => b.percentUsed - a.percentUsed);

    return {
      totalCorretoras,
      totalArquivos: stats.count,
      totalBytes,
      totalBytesCotacoes,
      totalBytesDocumentos,
      totalBytesChat,
      custoEstimadoMensal,
      crescimentoUltimos30Dias,
      corretorasProximasLimite: corretorasProximasLimite.slice(0, 10), // Top 10
    };
  }

  /**
   * Encontra arquivos órfãos (no R2 mas não no DB)
   */
  async findOrphanedFiles(corretoraId?: string): Promise<string[]> {
    const orphanedKeys: string[] = [];

    try {
      // Listar todos os arquivos no R2
      const prefix = corretoraId ? `${corretoraId}/` : '';
      
      let continuationToken: string | undefined;
      const r2Keys = new Set<string>();

      do {
        const command = new ListObjectsV2Command({
          Bucket: env.R2_BUCKET_NAME,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        });

        const response = await this.s3Client.send(command);

        if (response.Contents) {
          for (const obj of response.Contents) {
            if (obj.Key) {
              r2Keys.add(obj.Key);
            }
          }
        }

        continuationToken = response.NextContinuationToken;
      } while (continuationToken);

      // Buscar todas as chaves no banco de dados
      const whereClause = corretoraId
        ? and(eq(anexos.corretoraId, corretoraId), isNull(anexos.deletedAt))
        : isNull(anexos.deletedAt);

      const dbAnexos = await db.query.anexos.findMany({
        where: whereClause,
        columns: { r2Key: true },
      });

      const dbKeys = new Set(dbAnexos.map(a => a.r2Key));

      // Encontrar chaves que estão no R2 mas não no DB
      for (const r2Key of r2Keys) {
        if (!dbKeys.has(r2Key)) {
          orphanedKeys.push(r2Key);
        }
      }

      console.log(`[StorageMetrics] Encontrados ${orphanedKeys.length} arquivos órfãos`);

      return orphanedKeys;
    } catch (error) {
      console.error('[StorageMetrics] Erro ao buscar arquivos órfãos:', error);
      throw error;
    }
  }

  /**
   * Calcula custos estimados de R2 para uma corretora
   */
  async calculateCosts(corretoraId: string): Promise<{
    storageCostMonthly: number;
    operationsCostMonthly: number;
    totalCostMonthly: number;
    breakdown: {
      storageGB: number;
      estimatedWrites: number;
      estimatedReads: number;
    };
  }> {
    const usage = await this.calculateUsage(corretoraId);

    // Storage cost: $0.015/GB/month
    const storageGB = Number(usage.totalBytes) / (1024 ** 3);
    const storageCostMonthly = storageGB * 0.015;

    // Operations cost (estimativas)
    // Class A (writes): $4.50/million
    // Class B (reads): $0.36/million
    const estimatedWrites = usage.totalArquivos * 2; // Upload + metadata
    const estimatedReads = usage.totalArquivos * 10; // Assumindo 10 leituras por arquivo/mês

    const writesCost = (estimatedWrites / 1_000_000) * 4.50;
    const readsCost = (estimatedReads / 1_000_000) * 0.36;
    const operationsCostMonthly = writesCost + readsCost;

    const totalCostMonthly = storageCostMonthly + operationsCostMonthly;

    return {
      storageCostMonthly,
      operationsCostMonthly,
      totalCostMonthly,
      breakdown: {
        storageGB,
        estimatedWrites,
        estimatedReads,
      },
    };
  }

  /**
   * Formata bytes para formato legível
   */
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
export const storageMetrics = new StorageMetricsService();
```

## Uso nas Rotas da API

### 1. Verificar Limite Antes de Upload

```typescript
// apps/api/src/routes/anexos/index.ts
import { storageMetrics } from '@ecotech/storage';

fastify.post('/upload', {
  preHandler: [authorize(['anexos:criar'])],
}, async (request, reply) => {
  const corretoraId = request.user.corretoraId;

  // Verificar limites ANTES do upload
  const limitStatus = await storageMetrics.checkLimits(corretoraId);

  if (limitStatus.shouldBlock) {
    return reply.status(403).send({
      error: 'Limite de storage atingido',
      message: `Você está usando ${limitStatus.percentUsed.toFixed(2)}% do seu limite.`,
      percentUsed: limitStatus.percentUsed,
      bytesUsed: limitStatus.bytesUsed.toString(),
      bytesLimit: limitStatus.bytesLimit.toString(),
    });
  }

  // Prosseguir com upload
  const data = await request.file();
  // ... resto do código
});
```

### 2. Endpoint de Uso Atual

```typescript
// GET /api/anexos/usage
fastify.get('/usage', {
  preHandler: [authorize(['anexos:visualizar'])],
}, async (request, reply) => {
  const corretoraId = request.user.corretoraId;

  const [usage, limitStatus] = await Promise.all([
    storageMetrics.calculateUsage(corretoraId),
    storageMetrics.checkLimits(corretoraId),
  ]);

  return reply.send({
    usage: {
      totalFiles: usage.totalArquivos,
      totalBytes: usage.totalBytes.toString(),
      byType: {
        cotacoes: {
          count: usage.byType.cotacoes.count,
          bytes: usage.byType.cotacoes.bytes.toString(),
        },
        documentos: {
          count: usage.byType.documentos.count,
          bytes: usage.byType.documentos.bytes.toString(),
        },
        chat: {
          count: usage.byType.chat.count,
          bytes: usage.byType.chat.bytes.toString(),
        },
      },
      largestFiles: usage.largestFiles.map(f => ({
        ...f,
        tamanho: f.tamanho.toString(),
      })),
    },
    limits: limitStatus,
  });
});
```

## Integração com Workers (Cron Jobs)

### Arquivo: `apps/worker/src/jobs/storage-metrics.job.ts`

```typescript
import { storageMetrics } from '@ecotech/storage';
import { AlertService } from '@ecotech/utils';

const alertService = new AlertService();

/**
 * Job: Criar snapshot diário (todo dia 00:00)
 */
export async function dailyMetricsSnapshotJob() {
  console.log('[Job] Iniciando snapshot diário de métricas...');
  
  try {
    await storageMetrics.createDailySnapshot();
    console.log('[Job] Snapshot diário concluído com sucesso');
  } catch (error) {
    console.error('[Job] Erro ao criar snapshot diário:', error);
    throw error;
  }
}

/**
 * Job: Verificar limites (a cada hora)
 */
export async function checkStorageLimitsJob() {
  console.log('[Job] Verificando limites de storage...');

  try {
    const allCorretoras = await db.query.corretoras.findMany();
    let alertasSent = 0;

    for (const corretora of allCorretoras) {
      const limitStatus = await storageMetrics.checkLimits(corretora.id);

      if (limitStatus.shouldAlert && !limitStatus.shouldBlock) {
        // Alerta amarelo: próximo do limite
        await alertService.alertStorageLimit(
          corretora.id,
          limitStatus.percentUsed,
          'warning'
        );
        alertasSent++;
      } else if (limitStatus.shouldBlock) {
        // Alerta vermelho: limite atingido
        await alertService.alertStorageLimit(
          corretora.id,
          limitStatus.percentUsed,
          'critical'
        );
        alertasSent++;
      }
    }

    console.log(`[Job] Verificação concluída. ${alertasSent} alertas enviados.`);
  } catch (error) {
    console.error('[Job] Erro ao verificar limites:', error);
    throw error;
  }
}

/**
 * Job: Cleanup de arquivos órfãos (semanal, domingo 01:00)
 */
export async function cleanupOrphanedFilesJob() {
  console.log('[Job] Iniciando limpeza de arquivos órfãos...');

  try {
    const orphaned = await storageMetrics.findOrphanedFiles();

    if (orphaned.length === 0) {
      console.log('[Job] Nenhum arquivo órfão encontrado');
      return;
    }

    console.log(`[Job] Encontrados ${orphaned.length} arquivos órfãos`);

    // TODO: Implementar remoção segura (com aprovação manual ou após X dias)
    // Por enquanto, apenas logar
    for (const key of orphaned.slice(0, 10)) {
      console.log(`[Job] Órfão: ${key}`);
    }

    console.log('[Job] Cleanup concluído');
  } catch (error) {
    console.error('[Job] Erro ao limpar arquivos órfãos:', error);
    throw error;
  }
}
```

### Registro dos Jobs (BullMQ)

```typescript
// apps/worker/src/index.ts
import { Queue, Worker } from 'bullmq';
import { 
  dailyMetricsSnapshotJob, 
  checkStorageLimitsJob,
  cleanupOrphanedFilesJob 
} from './jobs/storage-metrics.job';

const connection = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
};

// Criar filas
const metricsQueue = new Queue('storage-metrics', { connection });

// Agendar jobs recorrentes
async function scheduleMetricsJobs() {
  // Snapshot diário (00:00)
  await metricsQueue.add(
    'daily-snapshot',
    {},
    {
      repeat: {
        pattern: '0 0 * * *', // Cron: todo dia à meia-noite
      },
    }
  );

  // Verificar limites (a cada hora)
  await metricsQueue.add(
    'check-limits',
    {},
    {
      repeat: {
        pattern: '0 * * * *', // Cron: a cada hora
      },
    }
  );

  // Cleanup órfãos (semanal, domingo 01:00)
  await metricsQueue.add(
    'cleanup-orphaned',
    {},
    {
      repeat: {
        pattern: '0 1 * * 0', // Cron: domingo 01:00
      },
    }
  );

  console.log('[Worker] Jobs de métricas agendados');
}

// Criar worker para processar jobs
const metricsWorker = new Worker(
  'storage-metrics',
  async (job) => {
    console.log(`[Worker] Processando job: ${job.name}`);

    switch (job.name) {
      case 'daily-snapshot':
        await dailyMetricsSnapshotJob();
        break;
      case 'check-limits':
        await checkStorageLimitsJob();
        break;
      case 'cleanup-orphaned':
        await cleanupOrphanedFilesJob();
        break;
      default:
        console.warn(`[Worker] Job desconhecido: ${job.name}`);
    }
  },
  { connection }
);

metricsWorker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.name} concluído`);
});

metricsWorker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.name} falhou:`, err);
});

// Inicializar
scheduleMetricsJobs();
```

## Testes

### Teste Manual via Node.js

```typescript
// scripts/test-metrics.ts
import { storageMetrics } from '@ecotech/storage';

async function testMetrics() {
  const corretoraId = 'sua-corretora-id-aqui';

  // 1. Calcular uso atual
  console.log('1. Calculando uso...');
  const usage = await storageMetrics.calculateUsage(corretoraId);
  console.log('Uso:', {
    totalArquivos: usage.totalArquivos,
    totalBytes: usage.totalBytes.toString(),
    byType: usage.byType,
  });

  // 2. Verificar limites
  console.log('\n2. Verificando limites...');
  const limitStatus = await storageMetrics.checkLimits(corretoraId);
  console.log('Status:', limitStatus);

  // 3. Histórico (últimos 7 dias)
  console.log('\n3. Histórico (7 dias)...');
  const history = await storageMetrics.getUsageHistory(corretoraId, 7);
  console.log('Histórico:', history);

  // 4. Estatísticas globais
  console.log('\n4. Estatísticas globais...');
  const globalStats = await storageMetrics.getGlobalStats();
  console.log('Global:', {
    totalCorretoras: globalStats.totalCorretoras,
    totalArquivos: globalStats.totalArquivos,
    totalBytes: globalStats.totalBytes.toString(),
    custoEstimadoMensal: globalStats.custoEstimadoMensal,
  });

  // 5. Buscar arquivos órfãos
  console.log('\n5. Buscando arquivos órfãos...');
  const orphaned = await storageMetrics.findOrphanedFiles(corretoraId);
  console.log('Órfãos:', orphaned.length);
}

testMetrics().catch(console.error);
```

### Executar:

```bash
npx tsx scripts/test-metrics.ts
```

## Considerações de Performance

### Otimizações Implementadas:

1. **Cache de Limites**: Limites são consultados apenas quando necessário
2. **Agregações no DB**: Usa SQL para somar bytes (mais rápido que JavaScript)
3. **Paginação no R2**: ListObjectsV2 com continuationToken para muitos arquivos
4. **Índices no DB**: Índices em `corretoraId`, `entidadeTipo`, `deletedAt`
5. **Snapshots Diários**: Evita recalcular histórico toda vez

### Quando Escalar:

- **>1M arquivos**: Considerar particionamento de tabela `anexos`
- **>100 corretoras**: Paralelizar cálculos com worker pool
- **Queries lentas**: Materializar views no PostgreSQL

## Próximos Passos

- [08. Backup Service →](./08-BACKUP-SERVICE.md) - Sistema de backup e restore
- [09. API Admin →](./09-API-ADMIN.md) - Rotas administrativas
- [13. Alertas →](./13-ALERTAS.md) - Sistema de alertas e notificações

---

**Navegação**: [← 06. Admin Auth](./06-ADMIN-AUTH.md) | [Índice](./00-INDICE.md) | [08. Backup Service →](./08-BACKUP-SERVICE.md)
