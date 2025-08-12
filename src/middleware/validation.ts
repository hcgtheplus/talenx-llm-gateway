import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: any[];
  custom?: (value: any) => boolean | string;
}

export const validate = (rules: ValidationRule[], location: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const data = req[location];
    const errors: string[] = [];

    for (const rule of rules) {
      const value = data[rule.field];

      // Check required
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(`${rule.field} is required`);
        continue;
      }

      // Skip validation if field is not required and not present
      if (!rule.required && (value === undefined || value === null)) {
        continue;
      }

      // Type validation
      if (rule.type) {
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (actualType !== rule.type) {
          errors.push(`${rule.field} must be of type ${rule.type}`);
          continue;
        }
      }

      // Min/Max validation
      if (rule.type === 'string' || rule.type === 'array') {
        if (rule.min !== undefined && value.length < rule.min) {
          errors.push(`${rule.field} must have at least ${rule.min} characters/items`);
        }
        if (rule.max !== undefined && value.length > rule.max) {
          errors.push(`${rule.field} must have at most ${rule.max} characters/items`);
        }
      } else if (rule.type === 'number') {
        if (rule.min !== undefined && value < rule.min) {
          errors.push(`${rule.field} must be at least ${rule.min}`);
        }
        if (rule.max !== undefined && value > rule.max) {
          errors.push(`${rule.field} must be at most ${rule.max}`);
        }
      }

      // Pattern validation
      if (rule.pattern && rule.type === 'string' && !rule.pattern.test(value)) {
        errors.push(`${rule.field} has an invalid format`);
      }

      // Enum validation
      if (rule.enum && !rule.enum.includes(value)) {
        errors.push(`${rule.field} must be one of: ${rule.enum.join(', ')}`);
      }

      // Custom validation
      if (rule.custom) {
        const result = rule.custom(value);
        if (typeof result === 'string') {
          errors.push(result);
        } else if (!result) {
          errors.push(`${rule.field} is invalid`);
        }
      }
    }

    if (errors.length > 0) {
      throw new AppError(`Validation failed: ${errors.join(', ')}`, 400);
    }

    next();
  };
};

// Common validation rules
export const commonValidations = {
  email: {
    type: 'string' as const,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  
  uuid: {
    type: 'string' as const,
    pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  },
  
  url: {
    type: 'string' as const,
    pattern: /^https?:\/\/.+/,
  },
  
  apiKey: {
    type: 'string' as const,
    pattern: /^tlx_[a-f0-9]{32}$/,
  },
};

// Sanitization middleware
export const sanitize = (fields: string[], location: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const data = req[location];

    for (const field of fields) {
      if (typeof data[field] === 'string') {
        // Trim whitespace
        data[field] = data[field].trim();
        
        // Remove potential XSS
        data[field] = data[field]
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;')
          .replace(/\//g, '&#x2F;');
      }
    }

    next();
  };
};