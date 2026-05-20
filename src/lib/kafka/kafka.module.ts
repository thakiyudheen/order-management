import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KafkaProducer } from './kafka.producer';
import { KafkaConsumer } from './kafka.consumer';

/**
 * Infrastructure module encapsulating Kafka integration.
 * This module registers the Kakfa client configurations, initializes connections
 * via lifecycle hooks, and exposes the KafkaProducer for usage across other business domains.
 */
@Module({
  imports: [ConfigModule],
  providers: [
    KafkaProducer,
    // Register the KafkaConsumer. Although not exported, NestJS instantiates it
    // on boot, triggering its `onModuleInit` lifecycle hook to start background consumption.
    KafkaConsumer,
  ],
  exports: [
    // Export only the producer so other services can publish events.
    // The consumer runs purely as an independent daemon background worker process.
    KafkaProducer,
  ],
})
export class KafkaModule {}
