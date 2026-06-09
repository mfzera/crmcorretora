/**
 * Worker module integrated into API
 * Handles background jobs for renewals detection and notifications
 */

import { initQueues, setupScheduledJobs, closeQueues } from './queues';
import { initWorkers, closeWorkers } from './workers';
import { createRedisConnection } from './config/redis';
import { logger } from '@ecotech/shared/utils/logger';

let isWorkerInitialized = false;

/**
 * Initialize worker jobs alongside API
 */
export async function initializeWorker(): Promise<void> {
  if (isWorkerInitialized) {
    logger.warn('Worker already initialized, skipping...');
    return;
  }

  try {
    logger.info('🚀 Initializing background worker...');

    const redis = createRedisConnection();

    await new Promise<void>((resolve, reject) => {
      redis.once('ready', () => {
        redis.quit();
        resolve();
      });
      redis.once('error', (error) => reject(error));
      setTimeout(() => reject(new Error('Redis connection timeout')), 10000);
    });

    initQueues();
    initWorkers();

    await setupScheduledJobs();

    isWorkerInitialized = true;
  } catch (error) {
    logger.error({ err: error }, '❌ Failed to initialize worker');

    // Don't crash the API if worker fails to initialize
    // Just log the error and continue
    logger.warn('⚠️  API will continue without background jobs');
  }
}

/**
 * Gracefully shutdown worker
 */
export async function shutdownWorker(): Promise<void> {
  if (!isWorkerInitialized) {
    return;
  }

  try {
    logger.info('🛑 Shutting down background worker...');
    await closeWorkers();
    await closeQueues();
    logger.info('✅ Worker shutdown complete');
  } catch (error) {
    logger.error({ err: error }, '❌ Error during worker shutdown');
  }
}
