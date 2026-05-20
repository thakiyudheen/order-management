import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderRepository } from './order.repository';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { UsersModule } from '../users/users.module';
import { BalancesModule } from '../balances/balances.module';
import { KafkaModule } from '../../lib/kafka/kafka.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order]),
    UsersModule,
    BalancesModule,
    KafkaModule,
  ],
  controllers: [OrdersController],
  providers: [OrderRepository, OrdersService],
})
export class OrdersModule {}
