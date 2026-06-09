#!/usr/bin/env tsx
/**
 * Script utilitário para limpar schedules repetidos do BullMQ
 *
 * Uso:
 *   npm run clear-schedules
 *
 * Útil quando:
 * - Mudou padrão de cron e quer remover agendamentos antigos
 * - Desenvolvimento/testes local
 * - Deploy com configuração nova
 */

import { clearScheduledJobs, closeQueues } from '../queues';

async function main() {
  console.log('🧹 Limpando schedules do BullMQ...\n');

  try {
    await clearScheduledJobs();
    console.log('\n✅ Schedules limpos com sucesso!');
  } catch (error) {
    console.error('\n❌ Erro ao limpar schedules:', error);
    process.exit(1);
  } finally {
    await closeQueues();
    process.exit(0);
  }
}

main();
