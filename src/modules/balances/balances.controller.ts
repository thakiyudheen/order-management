import { Controller, Get, Param } from '@nestjs/common';
import { BalancesService } from './balances.service';
import { IBalance } from '../../core/interfaces/balance.interface';
import { ECurrencySymbol } from '../../core/enums/order.enum';

@Controller('balances')
export class BalancesController {
  constructor(private readonly balancesService: BalancesService) {}

  @Get('user/:userId')
  async findByUser(@Param('userId') userId: string): Promise<IBalance[]> {
    return this.balancesService.findByUser(userId);
  }

  @Get('user/:userId/currency/:currencySymbol')
  async findByUserAndCurrency(
    @Param('userId') userId: string,
    @Param('currencySymbol') currencySymbol: ECurrencySymbol,
  ): Promise<IBalance | null> {
    return this.balancesService.findByUserAndCurrency(userId, currencySymbol);
  }
}
