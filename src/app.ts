import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { config } from './config';
import { logger, morganStream } from './utils/logger';
import { redisClient } from './utils/redis';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { lenientRateLimiter } from './middleware/rateLimiter';

// Import routes
import authRoutes from './routes/auth';
import llmRoutes from './routes/llm';
import mcpRoutes from './routes/mcp';
import processRoutes from './routes/process';

export const createApp = (): Application => {
  const app = express();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }));

  // CORS configuration
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || config.cors.allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  }));

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Compression middleware
  app.use(compression());

  // Request logging
  app.use(morgan('combined', { stream: morganStream }));

  // Global rate limiting
  app.use(lenientRateLimiter);

  // Health check endpoint
  app.get('/health', async (req, res) => {
    try {
      // Check Redis connection
      await redisClient.getClient().ping();
      
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config.server.env,
      });
    } catch (error) {
      logger.error('Health check failed:', error);
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Service dependencies unavailable',
      });
    }
  });

  // API routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/llm', llmRoutes);
  app.use('/api/v1/mcp', mcpRoutes);
  app.use('/api/v1', processRoutes); // 통합 처리 라우트

  // 404 handler
  app.use(notFoundHandler);

  // Error handler
  app.use(errorHandler);

  return app;
};

export const startServer = async (app: Application): Promise<void> => {
  try {
    // Connect to Redis
    redisClient.connect();
    
    // Start server
    const port = config.server.port;
    
    app.listen(port, () => {
      logger.info(`Server started on port ${port}`);
      logger.info(`Environment: ${config.server.env}`);
      logger.info(`Available at: http://localhost:${port}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
export const gracefulShutdown = async (): Promise<void> => {
  logger.info('Graceful shutdown initiated...');
  
  try {
    // Close Redis connection
    await redisClient.disconnect();
    
    logger.info('All connections closed. Exiting...');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};