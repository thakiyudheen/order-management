import { Injectable } from '@nestjs/common';
import { BalanceRepository } from './balance.repository';
import { IBalance } from '../../core/interfaces/balance.interface';
import { ECurrencySymbol } from '../../core/enums/order.enum';
import { RedisService } from '../../lib/redis/redis.service';

/**
 * Service managing user balances and asset balances caching.
 */
@Injectable()
export class BalancesService {
  constructor(
    private readonly balanceRepository: BalanceRepository,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Loads all balances of a user. Employs cache-aside caching model.
   */
  async findByUser(userId: string): Promise<IBalance[]> {
    const cacheKey = `balances:user:${userId}`;

    const cached = await this.redisService.get<IBalance[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const balances = await this.balanceRepository.findByUserId(userId);
    await this.redisService.set(cacheKey, balances, 3600);

    return balances;
  }

  /**
   * Locates user's balance for a specific asset symbol.
   * PERFORMANCE OPTIMIZATION: Resolves from the cached full balances array
   * of the user to minimize Redis key hits.
   */
  async findByUserAndCurrency(
    userId: string,
    currencySymbol: ECurrencySymbol,
  ): Promise<IBalance | null> {
    const balances = await this.findByUser(userId);
    return balances.find((b) => b.currencySymbol === currencySymbol) || null;
  }
}
