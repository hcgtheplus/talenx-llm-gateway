import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { config } from '../config';

// Ensure log directory exists
if (!fs.existsSync(config.logging.dir)) {
  fs.mkdirSync(config.logging.dir, { recursive: true });
}

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
  })
);

export const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  transports: [
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(config.logging.dir, 'error.log'),
      level: 'error',
    }),
    new winston.transports.File({
      filename: path.join(config.logging.dir, 'combined.log'),
    }),
  ],
});

// Add console transport in non-production environments
if (config.server.env !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
  }));
}

// Create a stream for Morgan HTTP logger
export const morganStream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};