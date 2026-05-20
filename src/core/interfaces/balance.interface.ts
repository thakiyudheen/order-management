import { ECurrencySymbol } from '../enums/order.enum';

export interface IBalance {
  id: string;
  userId: string;
  currencySymbol: ECurrencySymbol;
  balance: string;
  createdAt: Date;
  updatedAt: Date;
}
