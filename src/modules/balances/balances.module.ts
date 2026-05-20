import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Balance } from './entities/balance.entity';
import { BalanceRepository } from './balance.repository';
import { BalancesService } from './balances.service';
import { BalancesController } from './balances.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Balance])],
  controllers: [BalancesController],
  providers: [BalanceRepository, BalancesService],
  exports: [BalancesService],
})
export class BalancesModule {}
