import { registerAs } from '@nestjs/config';

export interface IKafkaConfig {
  brokers: string[];
  clientId: string;
  groupId: string;
}

export const kafkaConfig = registerAs(
  'kafka',
  (): IKafkaConfig => ({
    brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
    clientId: process.env.KAFKA_CLIENT_ID ?? 'trading-backend',
    groupId: process.env.KAFKA_GROUP_ID ?? 'trading-service-group',
  }),
);
