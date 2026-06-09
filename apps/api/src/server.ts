import 'dotenv/config';
// Sentry must be initialized before any other imports
import './instrument.js';
import { buildApp } from './app.js';
import { env } from '@ecotech/shared/utils/env';
import { logger } from '@ecotech/shared/utils/logger';

async function start() {
  try {
    // Build and start the application
    const app = await buildApp();

    await app.listen({
      port: env.PORT,
      host: env.HOST,
    });

    logger.info(`Server running at http://${env.HOST}:${env.PORT}`);
    logger.info(`API Documentation: http://${env.HOST}:${env.PORT}/docs`);
    logger.info('EcoTech Sys API v1.0.0 - Ready');

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully...`);

      await app.close();

      logger.info('Server closed');
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error(error);
    process.exit(1);
  }
}

start();
