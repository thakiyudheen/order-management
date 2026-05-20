import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Balance } from './entities/balance.entity';
import { ECurrencySymbol } from '../../core/enums/order.enum';
import { AppLogger } from '../../lib/logger/app-logger.service';
import { DatabaseException } from '../../core/exceptions/exceptions';

/**
 * Data-access wrapper for the Balance database table.
 * Translates low-level TypeORM/driver exceptions into clean DatabaseExceptions.
 */
@Injectable()
export class BalanceRepository {
  private readonly logger = new AppLogger();

  constructor(
    @InjectRepository(Balance)
    private readonly repository: Repository<Balance>,
  ) {}

  async findByUserId(userId: string): Promise<Balance[]> {
    try {
      return await this.repository.find({ where: { userId } });
    } catch (error) {
      this.logger.error(
        `Failed to fetch balances for user ID [${userId}] from database`,
        error instanceof Error ? error.stack : String(error),
        BalanceRepository.name,
      );
      throw new DatabaseException('Database query failure');
    }
  }

  async findByUserAndCurrency(
    userId: string,
    currencySymbol: ECurrencySymbol,
  ): Promise<Balance | null> {
    try {
      return await this.repository.findOne({
        where: { userId, currencySymbol },
      });
    } catch (error) {
      this.logger.error(
        `Failed to fetch balance for user ID [${userId}] and currency [${currencySymbol}] from database`,
        error instanceof Error ? error.stack : String(error),
        BalanceRepository.name,
      );
      throw new DatabaseException('Database query failure');
    }
  }
}
