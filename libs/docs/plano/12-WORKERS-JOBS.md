# 12 - Workers e Jobs Automáticos

**Navegação**: [← 11. Frontend Admin](./11-FRONTEND-ADMIN.md) | [Índice](./00-INDICE.md) | [13. Alertas →](./13-ALERTAS.md)

---

## 🎯 Visão Geral

Sistema de jobs automáticos usando **BullMQ** para tarefas agendadas:

1. **Snapshots de Métricas**: Diariamente às 00:00
2. **Backups Incrementais**: Diariamente às 02:00
3. **Backups Completos**: Semanalmente (domingos) às 03:00
4. **Verificação de Backups**: Diariamente às 05:00
5. **Cleanup de Backups Antigos**: Semanalmente às 04:00
6. **Verificação de Limites**: A cada hora
7. **Cleanup de Arquivos Órfãos**: Semanalmente (domingos) às 01:00
8. **Limpeza de Arquivos Temporários**: Diariamente às 06:00

## 📁 Estrutura de Arquivos

```
apps/worker/
├── src/
│   ├── index.ts                    # Inicialização do worker
│   ├── queues/
│   │   ├── index.ts                # Registro de filas
│   │   ├── storage-metrics.queue.ts
│   │   ├── backups.queue.ts
│   │   └── cleanup.queue.ts
│   ├── jobs/
│   │   ├── metrics/
│   │   │   ├── daily-snapshot.job.ts
│   │   │   └── check-limits.job.ts
│   │   ├── backups/
│   │   │   ├── incremental-backup.job.ts
│   │   │   ├── full-backup.job.ts
│   │   │   ├── verify-backups.job.ts
│   │   │   └── cleanup-old-backups.job.ts
│   │   └── cleanup/
│   │       ├── orphaned-files.job.ts
│   │       └── temp-files.job.ts
│   ├── processors/
│   │   ├── metrics.processor.ts
│   │   ├── backups.processor.ts
│   │   └── cleanup.processor.ts
│   └── utils/
│       ├── logger.ts
│       └── error-handler.ts
├── .env
├── package.json
└── tsconfig.json
```

## 🔧 Configuração Inicial

### Instalação de Dependências

```json
// apps/worker/package.json
{
  "name": "@ecotech/worker",
  "version": "1.0.0",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "bullmq": "^5.1.0",
    "ioredis": "^5.3.2",
    "@ecotech/database": "workspace:*",
    "@ecotech/storage": "workspace:*",
    "@ecotech/utils": "workspace:*",
    "dotenv": "^16.3.1",
    "pino": "^8.16.2",
    "pino-pretty": "^10.2.3"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "tsx": "^4.6.2",
    "typescript": "^5.3.2"
  }
}
```

### Configuração de Ambiente

```env
# apps/worker/.env

# Redis (para BullMQ)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/ecotech

# R2
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-key
R2_SECRET_ACCESS_KEY=your-secret
R2_BUCKET_NAME=ecotech-anexos

# Alertas
ALERT_EMAIL_FROM=alerts@ecotech.com
ALERT_EMAIL_TO=admin@ecotech.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Logger
LOG_LEVEL=info
```

## 🚀 Inicialização do Worker

```typescript
// apps/worker/src/index.ts

import { Worker, Queue, QueueScheduler } from 'bullmq';
import IORedis from 'ioredis';
import { config } from 'dotenv';
import { logger } from './utils/logger';
import { metricsProcessor } from './processors/metrics.processor';
import { backupsProcessor } from './processors/backups.processor';
import { cleanupProcessor } from './processors/cleanup.processor';
import { 
  scheduleMetricsJobs,
  scheduleBackupJobs,
  scheduleCleanupJobs 
} from './queues';

config();

// Configuração do Redis
const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
});

// Verificar conexão Redis
connection.on('connect', () => {
  logger.info('Conectado ao Redis');
});

connection.on('error', (err) => {
  logger.error({ err }, 'Erro de conexão com Redis');
  process.exit(1);
});

// Criar schedulers (necessário para jobs recorrentes)
const metricsScheduler = new QueueScheduler('storage-metrics', { connection });
const backupsScheduler = new QueueScheduler('backups', { connection });
const cleanupScheduler = new QueueScheduler('cleanup', { connection });

// Criar workers
const metricsWorker = new Worker(
  'storage-metrics',
  metricsProcessor,
  { connection, concurrency: 5 }
);

const backupsWorker = new Worker(
  'backups',
  backupsProcessor,
  { connection, concurrency: 2 } // Menos concorrência para backups
);

const cleanupWorker = new Worker(
  'cleanup',
  cleanupProcessor,
  { connection, concurrency: 3 }
);

// Event listeners
[metricsWorker, backupsWorker, cleanupWorker].forEach((worker) => {
  worker.on('completed', (job) => {
    logger.info({ jobId: job.id, jobName: job.name }, 'Job concluído');
  });

  worker.on('failed', (job, err) => {
    logger.error(
      { jobId: job?.id, jobName: job?.name, error: err.message },
      'Job falhou'
    );
  });

  worker.on('error', (err) => {
    logger.error({ error: err.message }, 'Erro no worker');
  });
});

// Agendar jobs recorrentes
async function scheduleJobs() {
  try {
    await scheduleMetricsJobs();
    await scheduleBackupJobs();
    await scheduleCleanupJobs();
    
    logger.info('Jobs agendados com sucesso');
  } catch (error) {
    logger.error({ error }, 'Erro ao agendar jobs');
    throw error;
  }
}

// Graceful shutdown
async function shutdown() {
  logger.info('Iniciando graceful shutdown...');
  
  await Promise.all([
    metricsWorker.close(),
    backupsWorker.close(),
    cleanupWorker.close(),
    metricsScheduler.close(),
    backupsScheduler.close(),
    cleanupScheduler.close(),
  ]);

  await connection.quit();
  
  logger.info('Shutdown concluído');
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Iniciar
(async () => {
  try {
    logger.info('Iniciando worker...');
    await scheduleJobs();
    logger.info('Worker iniciado com sucesso');
  } catch (error) {
    logger.error({ error }, 'Erro ao iniciar worker');
    process.exit(1);
  }
})();
```

## 📊 Jobs de Métricas

### Daily Snapshot Job

```typescript
// apps/worker/src/jobs/metrics/daily-snapshot.job.ts

import { storageMetrics } from '@ecotech/storage';
import { logger } from '../../utils/logger';

export async function dailySnapshotJob() {
  logger.info('Iniciando snapshot diário de métricas');

  try {
    await storageMetrics.createDailySnapshot();
    
    logger.info('Snapshot diário concluído com sucesso');
    
    return { success: true };
  } catch (error) {
    logger.error({ error }, 'Erro ao criar snapshot diário');
    throw error;
  }
}
```

### Check Limits Job

```typescript
// apps/worker/src/jobs/metrics/check-limits.job.ts

import { storageMetrics } from '@ecotech/storage';
import { db } from '@ecotech/database';
import { corretoras } from '@ecotech/database/schema';
import { alertService } from '@ecotech/utils';
import { logger } from '../../utils/logger';

export async function checkLimitsJob() {
  logger.info('Verificando limites de storage');

  try {
    const allCorretoras = await db.query.corretoras.findMany();
    let alertasSent = 0;

    for (const corretora of allCorretoras) {
      try {
        const limitStatus = await storageMetrics.checkLimits(corretora.id);

        if (limitStatus.shouldAlert && !limitStatus.shouldBlock) {
          // Alerta amarelo: próximo do limite
          await alertService.alertStorageLimit(
            corretora.id,
            limitStatus.percentUsed,
            'warning'
          );
          alertasSent++;
          
          logger.warn(
            { corretoraId: corretora.id, percentUsed: limitStatus.percentUsed },
            'Corretora próxima do limite'
          );
        } else if (limitStatus.shouldBlock) {
          // Alerta vermelho: limite atingido
          await alertService.alertStorageLimit(
            corretora.id,
            limitStatus.percentUsed,
            'critical'
          );
          alertasSent++;
          
          logger.error(
            { corretoraId: corretora.id, percentUsed: limitStatus.percentUsed },
            'Corretora atingiu o limite'
          );
        }
      } catch (error) {
        logger.error(
          { corretoraId: corretora.id, error },
          'Erro ao verificar limite da corretora'
        );
      }
    }

    logger.info({ alertasSent }, 'Verificação de limites concluída');
    
    return { success: true, alertasSent };
  } catch (error) {
    logger.error({ error }, 'Erro ao verificar limites');
    throw error;
  }
}
```

## 💾 Jobs de Backup

### Incremental Backup Job

```typescript
// apps/worker/src/jobs/backups/incremental-backup.job.ts

import { backupService } from '@ecotech/storage';
import { db } from '@ecotech/database';
import { corretoras } from '@ecotech/database/schema';
import { alertService } from '@ecotech/utils';
import { logger } from '../../utils/logger';

export async function incrementalBackupJob() {
  logger.info('Iniciando backups incrementais diários');

  const results: Array<{ corretoraId: string; success: boolean }> = [];

  try {
    const allCorretoras = await db.query.corretoras.findMany();

    for (const corretora of allCorretoras) {
      try {
        logger.info({ corretoraId: corretora.id }, 'Iniciando backup incremental');
        
        const result = await backupService.createIncrementalBackup(corretora.id);
        
        results.push({
          corretoraId: corretora.id,
          success: result.status === 'concluido',
        });

        if (result.status === 'falhou') {
          await alertService.alertBackupFailed(result.backupId, corretora.id, result.erro);
          
          logger.error(
            { corretoraId: corretora.id, backupId: result.backupId, erro: result.erro },
            'Backup incremental falhou'
          );
        } else {
          logger.info(
            { 
              corretoraId: corretora.id, 
              backupId: result.backupId,
              totalArquivos: result.totalArquivos,
              totalBytes: result.totalBytes.toString()
            },
            'Backup incremental concluído'
          );
        }
      } catch (error) {
        logger.error(
          { corretoraId: corretora.id, error },
          'Erro ao fazer backup incremental'
        );
        results.push({ corretoraId: corretora.id, success: false });
      }
    }

    const sucessos = results.filter((r) => r.success).length;
    const falhas = results.filter((r) => !r.success).length;

    logger.info(
      { sucessos, falhas, total: results.length },
      'Backups incrementais concluídos'
    );

    return { success: true, sucessos, falhas, results };
  } catch (error) {
    logger.error({ error }, 'Erro ao executar backups incrementais');
    throw error;
  }
}
```

### Full Backup Job

```typescript
// apps/worker/src/jobs/backups/full-backup.job.ts

import { backupService } from '@ecotech/storage';
import { db } from '@ecotech/database';
import { corretoras } from '@ecotech/database/schema';
import { alertService } from '@ecotech/utils';
import { logger } from '../../utils/logger';

export async function fullBackupJob() {
  logger.info('Iniciando backups completos semanais');

  const results: Array<{ corretoraId: string; success: boolean }> = [];

  try {
    const allCorretoras = await db.query.corretoras.findMany();

    for (const corretora of allCorretoras) {
      try {
        logger.info({ corretoraId: corretora.id }, 'Iniciando backup completo');
        
        const result = await backupService.createFullBackup(corretora.id);
        
        results.push({
          corretoraId: corretora.id,
          success: result.status === 'concluido',
        });

        if (result.status === 'falhou') {
          await alertService.alertBackupFailed(result.backupId, corretora.id, result.erro);
          
          logger.error(
            { corretoraId: corretora.id, backupId: result.backupId, erro: result.erro },
            'Backup completo falhou'
          );
        } else {
          logger.info(
            { 
              corretoraId: corretora.id, 
              backupId: result.backupId,
              totalArquivos: result.totalArquivos,
              totalBytes: result.totalBytes.toString(),
              duracaoSegundos: result.duracaoSegundos
            },
            'Backup completo concluído'
          );
        }
      } catch (error) {
        logger.error(
          { corretoraId: corretora.id, error },
          'Erro ao fazer backup completo'
        );
        results.push({ corretoraId: corretora.id, success: false });
      }
    }

    const sucessos = results.filter((r) => r.success).length;
    const falhas = results.filter((r) => !r.success).length;

    logger.info(
      { sucessos, falhas, total: results.length },
      'Backups completos concluídos'
    );

    return { success: true, sucessos, falhas, results };
  } catch (error) {
    logger.error({ error }, 'Erro ao executar backups completos');
    throw error;
  }
}
```

### Verify Backups Job

```typescript
// apps/worker/src/jobs/backups/verify-backups.job.ts

import { backupService } from '@ecotech/storage';
import { db } from '@ecotech/database';
import { backups } from '@ecotech/database/schema';
import { eq, and, gte } from 'drizzle-orm';
import { alertService } from '@ecotech/utils';
import { logger } from '../../utils/logger';

export async function verifyBackupsJob() {
  logger.info('Verificando integridade de backups recentes');

  try {
    // Backups dos últimos 7 dias não verificados
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - 7);

    const recentBackups = await db.query.backups.findMany({
      where: and(
        eq(backups.status, 'concluido'),
        eq(backups.verificado, false),
        gte(backups.iniciadoEm, dataInicio)
      ),
    });

    logger.info({ total: recentBackups.length }, 'Backups para verificar');

    let verificados = 0;
    let invalidos = 0;

    for (const backup of recentBackups) {
      try {
        logger.info({ backupId: backup.id }, 'Verificando backup');
        
        const result = await backupService.verifyBackup(backup.id);
        
        if (result.valid) {
          verificados++;
          logger.info({ backupId: backup.id }, 'Backup válido');
        } else {
          invalidos++;
          await alertService.alertBackupIntegrityFailed(backup.id, result.erros);
          
          logger.error(
            { backupId: backup.id, erros: result.erros },
            'Backup inválido'
          );
        }
      } catch (error) {
        logger.error({ backupId: backup.id, error }, 'Erro ao verificar backup');
      }
    }

    logger.info(
      { verificados, invalidos, total: recentBackups.length },
      'Verificação de backups concluída'
    );

    return { success: true, verificados, invalidos };
  } catch (error) {
    logger.error({ error }, 'Erro ao verificar backups');
    throw error;
  }
}
```

### Cleanup Old Backups Job

```typescript
// apps/worker/src/jobs/backups/cleanup-old-backups.job.ts

import { backupService } from '@ecotech/storage';
import { logger } from '../../utils/logger';

export async function cleanupOldBackupsJob() {
  logger.info('Iniciando limpeza de backups antigos');

  try {
    const result = await backupService.cleanupOldBackups();
    
    logger.info(
      {
        removidosIncrementais: result.removidosIncrementais,
        removidosCompletos: result.removidosCompletos,
      },
      'Limpeza de backups concluída'
    );

    return { success: true, ...result };
  } catch (error) {
    logger.error({ error }, 'Erro ao limpar backups antigos');
    throw error;
  }
}
```

## 🧹 Jobs de Cleanup

### Orphaned Files Job

```typescript
// apps/worker/src/jobs/cleanup/orphaned-files.job.ts

import { storageMetrics } from '@ecotech/storage';
import { alertService } from '@ecotech/utils';
import { logger } from '../../utils/logger';

export async function orphanedFilesJob() {
  logger.info('Buscando arquivos órfãos');

  try {
    const orphanedKeys = await storageMetrics.findOrphanedFiles();

    logger.info({ total: orphanedKeys.length }, 'Arquivos órfãos encontrados');

    if (orphanedKeys.length > 0) {
      // Notificar admin sobre arquivos órfãos
      await alertService.alertOrphanedFiles(orphanedKeys.length);
      
      // Logar primeiros 50 para análise
      orphanedKeys.slice(0, 50).forEach((key) => {
        logger.warn({ key }, 'Arquivo órfão');
      });
    }

    return { success: true, orphanedCount: orphanedKeys.length };
  } catch (error) {
    logger.error({ error }, 'Erro ao buscar arquivos órfãos');
    throw error;
  }
}
```

### Temp Files Job

```typescript
// apps/worker/src/jobs/cleanup/temp-files.job.ts

import { S3Client, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { env } from '@ecotech/utils';
import { logger } from '../../utils/logger';

export async function tempFilesJob() {
  logger.info('Limpando arquivos temporários');

  const s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });

  try {
    const prefix = 'temp/';
    let deletedCount = 0;

    // Arquivos temp com mais de 24 horas
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);

    let continuationToken: string | undefined;

    do {
      const listCommand = new ListObjectsV2Command({
        Bucket: env.R2_BUCKET_NAME,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      });

      const response = await s3Client.send(listCommand);

      if (response.Contents) {
        for (const obj of response.Contents) {
          if (obj.Key && obj.LastModified && obj.LastModified < oneDayAgo) {
            try {
              await s3Client.send(new DeleteObjectCommand({
                Bucket: env.R2_BUCKET_NAME,
                Key: obj.Key,
              }));
              
              deletedCount++;
              logger.debug({ key: obj.Key }, 'Arquivo temporário removido');
            } catch (error) {
              logger.error({ key: obj.Key, error }, 'Erro ao remover arquivo temporário');
            }
          }
        }
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    logger.info({ deletedCount }, 'Limpeza de arquivos temporários concluída');

    return { success: true, deletedCount };
  } catch (error) {
    logger.error({ error }, 'Erro ao limpar arquivos temporários');
    throw error;
  }
}
```

## 🔄 Processadores de Fila

### Metrics Processor

```typescript
// apps/worker/src/processors/metrics.processor.ts

import { Job } from 'bullmq';
import { dailySnapshotJob } from '../jobs/metrics/daily-snapshot.job';
import { checkLimitsJob } from '../jobs/metrics/check-limits.job';
import { logger } from '../utils/logger';

export async function metricsProcessor(job: Job) {
  logger.info({ jobId: job.id, jobName: job.name }, 'Processando job de métricas');

  switch (job.name) {
    case 'daily-snapshot':
      return await dailySnapshotJob();
    
    case 'check-limits':
      return await checkLimitsJob();
    
    default:
      throw new Error(`Job desconhecido: ${job.name}`);
  }
}
```

### Backups Processor

```typescript
// apps/worker/src/processors/backups.processor.ts

import { Job } from 'bullmq';
import { incrementalBackupJob } from '../jobs/backups/incremental-backup.job';
import { fullBackupJob } from '../jobs/backups/full-backup.job';
import { verifyBackupsJob } from '../jobs/backups/verify-backups.job';
import { cleanupOldBackupsJob } from '../jobs/backups/cleanup-old-backups.job';
import { logger } from '../utils/logger';

export async function backupsProcessor(job: Job) {
  logger.info({ jobId: job.id, jobName: job.name }, 'Processando job de backup');

  switch (job.name) {
    case 'incremental-backup':
      return await incrementalBackupJob();
    
    case 'full-backup':
      return await fullBackupJob();
    
    case 'verify-backups':
      return await verifyBackupsJob();
    
    case 'cleanup-old-backups':
      return await cleanupOldBackupsJob();
    
    default:
      throw new Error(`Job desconhecido: ${job.name}`);
  }
}
```

### Cleanup Processor

```typescript
// apps/worker/src/processors/cleanup.processor.ts

import { Job } from 'bullmq';
import { orphanedFilesJob } from '../jobs/cleanup/orphaned-files.job';
import { tempFilesJob } from '../jobs/cleanup/temp-files.job';
import { logger } from '../utils/logger';

export async function cleanupProcessor(job: Job) {
  logger.info({ jobId: job.id, jobName: job.name }, 'Processando job de limpeza');

  switch (job.name) {
    case 'orphaned-files':
      return await orphanedFilesJob();
    
    case 'temp-files':
      return await tempFilesJob();
    
    default:
      throw new Error(`Job desconhecido: ${job.name}`);
  }
}
```

## 📅 Agendamento de Jobs

```typescript
// apps/worker/src/queues/index.ts

import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { logger } from '../utils/logger';

const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
});

// Criar filas
export const metricsQueue = new Queue('storage-metrics', { connection });
export const backupsQueue = new Queue('backups', { connection });
export const cleanupQueue = new Queue('cleanup', { connection });

/**
 * Agendar jobs de métricas
 */
export async function scheduleMetricsJobs() {
  // Snapshot diário (00:00)
  await metricsQueue.add(
    'daily-snapshot',
    {},
    {
      repeat: {
        pattern: '0 0 * * *', // Todo dia à meia-noite
      },
    }
  );

  // Verificar limites (a cada hora)
  await metricsQueue.add(
    'check-limits',
    {},
    {
      repeat: {
        pattern: '0 * * * *', // A cada hora
      },
    }
  );

  logger.info('Jobs de métricas agendados');
}

/**
 * Agendar jobs de backup
 */
export async function scheduleBackupJobs() {
  // Backup incremental diário (02:00)
  await backupsQueue.add(
    'incremental-backup',
    {},
    {
      repeat: {
        pattern: '0 2 * * *', // Todo dia às 02:00
      },
    }
  );

  // Backup completo semanal (domingo 03:00)
  await backupsQueue.add(
    'full-backup',
    {},
    {
      repeat: {
        pattern: '0 3 * * 0', // Domingo às 03:00
      },
    }
  );

  // Verificar backups (05:00)
  await backupsQueue.add(
    'verify-backups',
    {},
    {
      repeat: {
        pattern: '0 5 * * *', // Todo dia às 05:00
      },
    }
  );

  // Cleanup de backups antigos (domingo 04:00)
  await backupsQueue.add(
    'cleanup-old-backups',
    {},
    {
      repeat: {
        pattern: '0 4 * * 0', // Domingo às 04:00
      },
    }
  );

  logger.info('Jobs de backup agendados');
}

/**
 * Agendar jobs de limpeza
 */
export async function scheduleCleanupJobs() {
  // Arquivos órfãos (domingo 01:00)
  await cleanupQueue.add(
    'orphaned-files',
    {},
    {
      repeat: {
        pattern: '0 1 * * 0', // Domingo às 01:00
      },
    }
  );

  // Arquivos temporários (06:00)
  await cleanupQueue.add(
    'temp-files',
    {},
    {
      repeat: {
        pattern: '0 6 * * *', // Todo dia às 06:00
      },
    }
  );

  logger.info('Jobs de limpeza agendados');
}
```

## 📊 Monitoramento de Jobs

### BullMQ Board (UI para monitorar filas)

```bash
# Instalar
pnpm add -D @bull-board/api @bull-board/express

# Usar no desenvolvimento
```

```typescript
// apps/worker/src/monitor.ts (opcional)

import express from 'express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { metricsQueue, backupsQueue, cleanupQueue } from './queues';

const app = express();

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [
    new BullMQAdapter(metricsQueue),
    new BullMQAdapter(backupsQueue),
    new BullMQAdapter(cleanupQueue),
  ],
  serverAdapter,
});

app.use('/admin/queues', serverAdapter.getRouter());

app.listen(3001, () => {
  console.log('BullMQ Board disponível em http://localhost:3001/admin/queues');
});
```

## 🧪 Testes

### Testar Job Manualmente

```typescript
// scripts/test-job.ts

import { metricsQueue } from '../apps/worker/src/queues';

async function testJob() {
  // Adicionar job único (não recorrente)
  const job = await metricsQueue.add('daily-snapshot', {}, {
    removeOnComplete: true,
    removeOnFail: false,
  });

  console.log(`Job ${job.id} adicionado`);

  // Aguardar conclusão
  const result = await job.waitUntilFinished();
  console.log('Resultado:', result);
}

testJob().catch(console.error);
```

## 📝 Checklist de Implementação

- [ ] Instalar BullMQ e Redis
- [ ] Criar estrutura de workers
- [ ] Implementar jobs de métricas
  - [ ] Daily snapshot
  - [ ] Check limits
- [ ] Implementar jobs de backup
  - [ ] Incremental backup
  - [ ] Full backup
  - [ ] Verify backups
  - [ ] Cleanup old backups
- [ ] Implementar jobs de limpeza
  - [ ] Orphaned files
  - [ ] Temp files
- [ ] Configurar processadores de fila
- [ ] Agendar jobs recorrentes
- [ ] Implementar logger estruturado
- [ ] Adicionar monitoramento (BullMQ Board)
- [ ] Testar jobs individualmente
- [ ] Configurar restart automático (PM2 ou Docker)
- [ ] Deploy em produção

## 🚀 Deploy

### Usando PM2

```bash
# Instalar PM2
pnpm add -g pm2

# Iniciar worker
pm2 start apps/worker/dist/index.js --name ecotech-worker

# Logs
pm2 logs ecotech-worker

# Restart
pm2 restart ecotech-worker
```

### Usando Docker

```dockerfile
# apps/worker/Dockerfile

FROM node:20-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

CMD ["node", "dist/index.js"]
```

## 📝 Próximo Documento

Continue com **[13-ALERTAS.md](./13-ALERTAS.md)** para implementar o sistema de alertas.

---

**Navegação**: [← 11. Frontend Admin](./11-FRONTEND-ADMIN.md) | [Índice](./00-INDICE.md) | [13. Alertas →](./13-ALERTAS.md)
