import { EOrderType, ECurrencySymbol } from '../enums/order.enum';

export type TKafkaOrderPayload = {
  orderId: string;
  userId: string;
  orderType: EOrderType;
  currencySymbol: ECurrencySymbol;
  price: string;
  quantity: string;
};
