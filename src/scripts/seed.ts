import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';
import { User } from '../modules/users/entities/user.entity';
import { Balance } from '../modules/balances/entities/balance.entity';
import { ECurrencySymbol } from '../core/enums/order.enum';
import { AppLogger } from '../lib/logger/app-logger.service';
import { RedisService } from '../lib/redis/redis.service';

async function bootstrap() {
  const logger = new AppLogger();
  const context = 'SeedScript';

  logger.log('🌱 Initializing seed script...', context);
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  const redisService = app.get(RedisService);

  const userRepository = dataSource.getRepository(User);
  const balanceRepository = dataSource.getRepository(Balance);

  try {
    logger.log('🧹 Flushing Redis cache before seeding...', context);
    await redisService.flushAll();

    // 1. Seed User
    let user = await userRepository.findOne({
      where: { email: 'john.doe@example.com' },
    });

    if (!user) {
      user = userRepository.create({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
      });
      user = await userRepository.save(user);
      logger.log(`✅ User seeded: ${user.id}`, context);
    }

    // 2. Seed Balances for the User
    const initialBalances = [
      { currencySymbol: ECurrencySymbol.BTC, balance: '10.50000000' },
      { currencySymbol: ECurrencySymbol.ETH, balance: '50.00000000' },
      { currencySymbol: ECurrencySymbol.USDT, balance: '100000.00000000' },
    ];

    for (const item of initialBalances) {
      let balance = await balanceRepository.findOne({
        where: { userId: user.id, currencySymbol: item.currencySymbol },
      });

      if (!balance) {
        balance = balanceRepository.create({
          userId: user.id,
          currencySymbol: item.currencySymbol,
          balance: item.balance,
        });
        await balanceRepository.save(balance);
        logger.log(
          `✅ Balance seeded: ${item.balance} ${item.currencySymbol}`,
          context,
        );
      }
    }

    logger.log(
      '\n=========================================\n' +
        `USE THIS USER ID FOR TESTING: ${user.id}\n' +
               '=========================================\n`,
      context,
    );
  } catch (error) {
    logger.error(
      '❌ Seeding failed:',
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
    'Seeding failed',
    err instanceof Error ? err.stack : String(err),
    'SeedScript',
  );
  process.exit(1);
});
