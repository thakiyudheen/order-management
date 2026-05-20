import { EOrderType, EOrderStatus, ECurrencySymbol } from '../enums/order.enum';

export interface IOrder {
  id: string;
  userId: string;
  orderType: EOrderType;
  currencySymbol: ECurrencySymbol;
  price: string;
  quantity: string;
  status: EOrderStatus;
  createdAt: Date;
  updatedAt: Date;
}
