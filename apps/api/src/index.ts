import 'dotenv/config';
import { createApp } from './app.js';
import { createDbClient } from '@creatorops/database';
import { createServer } from 'http';
import { initializeWebSocket } from './websocket/gateway.js';
import { logger } from './config/logger.js';
import { config } from './config/index.js';
import { syncSchedulerService } from './services/sync-scheduler.service.js';

async function main() {
  try {
    // Initialize database
    const db = createDbClient(config.databaseUrl);
    logger.info('Database connection established');

    // Create Express app
    const app = createApp(db);

    // Create HTTP server
    const server = createServer(app);

    // Initialize WebSocket
    initializeWebSocket(server);
    logger.info('WebSocket server initialized');

    // Initialize sync scheduler for automatic YouTube sync
    try {
      await syncSchedulerService.initialize();
      logger.info('Sync scheduler initialized - channels will sync every 5 minutes');
    } catch (error) {
      logger.warn('Failed to initialize sync scheduler (Redis may not be running):', error);
    }

    // Start server
    server.listen(config.port, () => {
      logger.info(`API server running on port ${config.port}`);
      logger.info(`Environment: ${config.nodeEnv}`);
    });

    // Graceful shutdown
    const shutdown = async () => {
      logger.info('Shutting down gracefully...');

      // Shutdown sync scheduler
      try {
        await syncSchedulerService.shutdown();
      } catch (error) {
        logger.error('Error shutting down sync scheduler:', error);
      }

      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
