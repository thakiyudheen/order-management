import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';
import { AppLogger } from '../lib/logger/app-logger.service';
import { RedisService } from '../lib/redis/redis.service';

async function bootstrap() {
  const logger = new AppLogger();
  const context = 'DropDbScript';

  logger.log('🔄 Initializing database drop script...', context);
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  const redisService = app.get(RedisService);

  try {
    logger.log(
      '🗑️ Dropping database schema (all tables, constraints, keys)...',
      context,
    );
    await dataSource.dropDatabase();
    logger.log('✅ Database schema dropped successfully.', context);

    logger.log('🧹 Flushing Redis cache...', context);
    await redisService.flushAll();
  } catch (error) {
    logger.error(
      '❌ Database drop failed:',
      error instanceof Error ? error.stack : String(error),
      context,
    );
  } finally {
    await app.close();
  }
}

bootstrap().catch((err) => {
  const logger = new AppLogger();
  logger.error(
    'Unhandled error in bootstrap',
    err instanceof Error ? err.stack : String(err),
    'DropDbScript',
  );
  process.exit(1);
});
