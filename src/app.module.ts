import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { databaseConfig } from './config/database.config';
import { kafkaConfig } from './config/kafka.config';
import { envValidationSchema } from './config/env.validation';
import { DatabaseModule } from './lib/database/database.module';
import { UsersModule } from './modules/users/users.module';
import { OrdersModule } from './modules/orders/orders.module';
import { BalancesModule } from './modules/balances/balances.module';
import { KafkaModule } from './lib/kafka/kafka.module';
import { RedisModule } from './lib/redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [databaseConfig, kafkaConfig],
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: true,
      },
    }),
    DatabaseModule,
    RedisModule,
    KafkaModule,
    UsersModule,
    OrdersModule,
    BalancesModule,
  ],
})
export class AppModule {}
