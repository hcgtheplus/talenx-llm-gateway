import { createApp, startServer, gracefulShutdown } from './app';
import { logger } from './utils/logger';

// Create Express app
const app = createApp();

// Start server
startServer(app).catch((error) => {
  logger.error('Failed to start application:', error);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  gracefulShutdown();
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
  gracefulShutdown();
});