import Redis from 'ioredis';
import { config } from '../config';
import { logger } from './logger';

class RedisClient {
  private client: Redis | null = null;

  connect(): Redis {
    if (this.client) {
      return this.client;
    }

    this.client = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.client.on('connect', () => {
      logger.info('Redis client connected');
    });

    this.client.on('error', (err) => {
      logger.error('Redis client error:', err);
    });

    this.client.on('close', () => {
      logger.warn('Redis client connection closed');
    });

    return this.client;
  }

  getClient(): Redis {
    if (!this.client) {
      return this.connect();
    }
    return this.client;
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      logger.info('Redis client disconnected');
    }
  }

  // Session management methods removed - using simple API key auth

  // Token management
  async setToken(token: string, userId: string, ttl: number = 86400): Promise<void> {
    const client = this.getClient();
    await client.setex(`token:${token}`, ttl, userId);
  }

  async getToken(token: string): Promise<string | null> {
    const client = this.getClient();
    return await client.get(`token:${token}`);
  }

  async deleteToken(token: string): Promise<void> {
    const client = this.getClient();
    await client.del(`token:${token}`);
  }

  // Cache management
  async setCache(key: string, data: any, ttl: number = 300): Promise<void> {
    const client = this.getClient();
    await client.setex(`cache:${key}`, ttl, JSON.stringify(data));
  }

  async getCache(key: string): Promise<any | null> {
    const client = this.getClient();
    const data = await client.get(`cache:${key}`);
    return data ? JSON.parse(data) : null;
  }

  async deleteCache(key: string): Promise<void> {
    const client = this.getClient();
    await client.del(`cache:${key}`);
  }

  // Rate limiting
  async incrementRateLimit(key: string, windowMs: number): Promise<number> {
    const client = this.getClient();
    const multi = client.multi();
    const ttl = Math.ceil(windowMs / 1000);
    
    multi.incr(`rate:${key}`);
    multi.expire(`rate:${key}`, ttl);
    
    const results = await multi.exec();
    return results?.[0]?.[1] as number || 1;
  }

  async getRateLimit(key: string): Promise<number> {
    const client = this.getClient();
    const count = await client.get(`rate:${key}`);
    return count ? parseInt(count, 10) : 0;
  }
}

export const redisClient = new RedisClient();