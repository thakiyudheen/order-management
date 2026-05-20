import {
  IsEnum,
  IsNotEmpty,
  IsPositive,
  IsUUID,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EOrderType, ECurrencySymbol } from '../../../core/enums/order.enum';

export class CreateOrderDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsEnum(EOrderType)
  orderType: EOrderType;

  @IsEnum(ECurrencySymbol)
  currencySymbol: ECurrencySymbol;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 8 })
  @IsPositive()
  price: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 8 })
  @IsPositive()
  quantity: number;
}
