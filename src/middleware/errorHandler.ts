import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal server error';
  let isOperational = false;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    isOperational = err.isOperational;
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation error';
    isOperational = true;
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Unauthorized';
    isOperational = true;
  }

  // Log error
  if (!isOperational) {
    logger.error('Unexpected error:', {
      error: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
      headers: req.headers,
    });
  } else {
    logger.warn('Operational error:', {
      error: err.message,
      url: req.url,
      method: req.method,
      statusCode,
    });
  }

  // Send error response
  res.status(statusCode).json({
    error: {
      message,
      statusCode,
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack,
        details: err,
      }),
    },
    timestamp: new Date().toISOString(),
    path: req.url,
  });
};

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    error: {
      message: 'Resource not found',
      statusCode: 404,
    },
    timestamp: new Date().toISOString(),
    path: req.url,
  });
};