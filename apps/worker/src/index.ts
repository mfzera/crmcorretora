// CRITICAL: Load environment variables FIRST, before any other imports
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env from worker directory
config({ path: resolve(process.cwd(), 'apps/worker/.env') });

import { setupScheduledJobs, closeQueues } from './queues/index';
import { closeWorkers } from './workers/index';
import { createRedisConnection } from './config/redis';

/**
 * Entry point do Worker App
 *
 * Responsabilidades:
 * 1. Conectar ao Redis
 * 2. Inicializar workers BullMQ
 * 3. Configurar schedules (cron jobs)
 * 4. Processar jobs da fila
 */

async function bootstrap() {
  console.log('🚀 Iniciando EcoTech Worker...\n');

  try {
    // 1. Testar conexão com Redis
    console.log('📡 Conectando ao Redis...');
    const redis = createRedisConnection();

    // Aguarda conexão estar pronta
    await new Promise<void>((resolve, reject) => {
      redis.once('ready', () => resolve());
      redis.once('error', (error) => reject(error));
    });

    console.log('✅ Redis conectado\n');

    // 2. Workers já são inicializados no import
    console.log('🔧 Inicializando workers...');
    await import('./workers');
    console.log('✅ Workers inicializados\n');

    // 3. Configurar schedules repetidos
    await setupScheduledJobs();
    console.log('');

    console.log('✅ EcoTech Worker rodando!');
    console.log('📊 Jobs agendados:');
    console.log('   - detect-renewals-daily: 03:00 AM (diário)');
    console.log('   - notify-urgent-renewals-hourly: 9h-18h (a cada hora)');
    console.log('   - backup-incremental-daily: 02:00 AM (diário, só arquivos novos)');
    console.log('   - backup-full-weekly: domingo 03:00 AM (completo + Neon branch + limpeza 7d)');
    console.log('\n🔄 Aguardando jobs...\n');
  } catch (error) {
    console.error('❌ Erro ao inicializar worker:', error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown
 */
async function shutdown() {
  console.log('\n🛑 Recebido sinal de shutdown...');

  try {
    await closeWorkers();
    await closeQueues();
    console.log('✅ Shutdown completo');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro durante shutdown:', error);
    process.exit(1);
  }
}

// Captura sinais de encerramento
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Trata erros não capturados
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Inicia aplicação
bootstrap();
