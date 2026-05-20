import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer } from 'kafkajs';
import { IKafkaConfig } from '../../config/kafka.config';
import { KAFKA_TOPICS } from '../../core/constants/kafka.constants';
import { TKafkaOrderPayload } from '../../core/types/kafka-payload.type';
import { AppLogger } from '../logger/app-logger.service';

/**
 * Global Kafka Producer client wrapper.
 * Responsibilities include establishing a connection to the broker and publishing
 * partition-key-secured events synchronously during business workflow paths.
 */
@Injectable()
export class KafkaProducer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new AppLogger();
  private readonly producer: Producer;

  constructor(private readonly configService: ConfigService) {
    const config = this.configService.get<IKafkaConfig>(
      'kafka',
    ) as IKafkaConfig;

    const kafka = new Kafka({
      clientId: config.clientId,
      brokers: config.brokers,
      // Built-in exponential backoff settings for connection retries
      retry: {
        initialRetryTime: 300,
        retries: 10,
      },
    });

    this.producer = kafka.producer();
  }

  /**
   * NestJS Lifecycle Hook: Invoked when the application bootstrapping is complete.
   * Establishes a persistent socket connection with the Kafka cluster.
   */
  async onModuleInit(): Promise<void> {
    await this.producer.connect();
    this.logger.log('Kafka producer connected', KafkaProducer.name);
  }

  /**
   * NestJS Lifecycle Hook: Invoked during system shutdown.
   * Closes active connections and socket descriptors gracefully.
   */
  async onModuleDestroy(): Promise<void> {
    await this.producer.disconnect();
    this.logger.log('Kafka producer disconnected', KafkaProducer.name);
  }

  /**
   * Publishes an order placement event to the designated Kafka topic.
   */
  async publishOrderPlaced(payload: TKafkaOrderPayload): Promise<void> {
    try {
      await this.producer.send({
        topic: KAFKA_TOPICS.ORDER_PLACED,
        messages: [
          {
            // CRITICAL DESIGN DETAIL (Partition Key):
            // Setting `key` to `payload.userId` guarantees that all order placement events
            // for a specific user are consistently directed to the SAME Kafka partition.
            // This preserves the chronological sequence of user actions when multiple partitions are active.
            key: payload.userId,
            value: JSON.stringify(payload),
          },
        ],
      });
      this.logger.log(
        `Published order event: ${payload.orderId}`,
        KafkaProducer.name,
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish order event: ${payload.orderId}`,
        error instanceof Error ? error.stack : String(error),
        KafkaProducer.name,
      );
      throw error;
    }
  }
}
