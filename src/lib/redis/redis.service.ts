import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { AppLogger } from '../logger/app-logger.service';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private redisClient: Redis;
  private readonly logger = new AppLogger();

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);

    this.redisClient = new Redis({
      host,
      port,
      maxRetriesPerRequest: null,
    });

    this.redisClient.on('connect', () => {
      this.logger.log(`Redis connected to ${host}:${port}`, RedisService.name);
    });

    this.redisClient.on('error', (error: unknown) => {
      this.logger.error(
        'Redis connection error',
        error instanceof Error ? error.stack : String(error),
        RedisService.name,
      );
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redisClient.get(key);
      if (!data) return null;
      try {
        return JSON.parse(data) as T;
      } catch {
        return data as unknown as T;
      }
    } catch (error) {
      this.logger.error(
        `Error getting key ${key} from Redis`,
        error instanceof Error ? error.stack : String(error),
        RedisService.name,
      );
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    try {
      const stringValue =
        typeof value === 'string' ? value : JSON.stringify(value);
      if (ttlSeconds) {
        await this.redisClient.set(key, stringValue, 'EX', ttlSeconds);
      } else {
        await this.redisClient.set(key, stringValue);
      }
    } catch (error) {
      this.logger.error(
        `Error setting key ${key} in Redis`,
        error instanceof Error ? error.stack : String(error),
        RedisService.name,
      );
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.redisClient.del(key);
    } catch (error) {
      this.logger.error(
        `Error deleting key ${key} from Redis`,
        error instanceof Error ? error.stack : String(error),
        RedisService.name,
      );
    }
  }

  async flushAll(): Promise<void> {
    try {
      await this.redisClient.flushall();
      this.logger.log('Redis cache flushed completely', RedisService.name);
    } catch (error) {
      this.logger.error(
        'Error flushing Redis cache',
        error instanceof Error ? error.stack : String(error),
        RedisService.name,
      );
    }
  }

  onModuleDestroy() {
    this.redisClient.disconnect();
    this.logger.log('Redis connection closed', RedisService.name);
  }
}
