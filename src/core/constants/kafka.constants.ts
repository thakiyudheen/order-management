export const KAFKA_TOPICS = {
  ORDER_PLACED: 'trading.orders.placed',
} as const;

export type TKafkaTopic = (typeof KAFKA_TOPICS)[keyof typeof KAFKA_TOPICS];
