import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { IKafkaConfig } from '../../config/kafka.config';
import { KAFKA_TOPICS } from '../../core/constants/kafka.constants';
import { TKafkaOrderPayload } from '../../core/types/kafka-payload.type';
import { AppLogger } from '../logger/app-logger.service';
import { Balance } from '../../modules/balances/entities/balance.entity';
import { Order } from '../../modules/orders/entities/order.entity';
import { EOrderStatus, EOrderType } from '../../core/enums/order.enum';
import { RedisService } from '../redis/redis.service';

/**
 * Background consumer daemon that subscribes to Kafka order topics.
 * Responsible for updating account balances, transitioning order states, and
 * invalidating cache items inside a strict transactional context.
 */
@Injectable()
export class KafkaConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new AppLogger();
  private readonly consumer: Consumer;

  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
  ) {
    const config = this.configService.get<IKafkaConfig>(
      'kafka',
    ) as IKafkaConfig;

    const kafka = new Kafka({
      clientId: `${config.clientId}-consumer`,
      brokers: config.brokers,
      retry: {
        initialRetryTime: 300,
        retries: 10,
      },
    });

    this.consumer = kafka.consumer({ groupId: config.groupId });
  }

  /**
   * NestJS Lifecycle Hook: Establishes broker connection, subscribes to the topic,
   * and starts the main consumer run loop.
   */
  async onModuleInit(): Promise<void> {
    await this.consumer.connect();
    await this.consumer.subscribe({
      topic: KAFKA_TOPICS.ORDER_PLACED,
      fromBeginning: false,
    });

    // Start background processor loop
    await this.consumer.run({
      eachMessage: async (payload: EachMessagePayload): Promise<void> => {
        await this.handleMessage(payload);
      },
    });

    this.logger.log(
      `Consumer subscribed to [${KAFKA_TOPICS.ORDER_PLACED}]`,
      KafkaConsumer.name,
    );
  }

  /**
   * NestJS Lifecycle Hook: Tears down sockets and active client connections.
   */
  async onModuleDestroy(): Promise<void> {
    await this.consumer.disconnect();
    this.logger.log('Consumer disconnected', KafkaConsumer.name);
  }

  /**
   * Top-level message router. Unpacks the event payload and directs it to order processing.
   */
  private async handleMessage(payload: EachMessagePayload): Promise<void> {
    const { message } = payload;

    if (!message.value) {
      return;
    }

    let event: TKafkaOrderPayload;
    try {
      event = JSON.parse(message.value.toString()) as TKafkaOrderPayload;
    } catch {
      this.logger.error(
        'Failed to parse message',
        undefined,
        KafkaConsumer.name,
      );
      return;
    }

    await this.processOrder(event);
  }

  /**
   * Processes a single order placement event inside a manual database transaction.
   * Leverages row locks to maintain consistency under high concurrency.
   */
  private async processOrder(event: TKafkaOrderPayload): Promise<void> {
    // 1. Obtain a raw QueryRunner to manually manage connection and transaction bounds
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const quantity = parseFloat(event.quantity);

      if (event.orderType === EOrderType.BUY) {
        // BUY: Credit the asset currency to the user's balances
        await this.upsertBalance(queryRunner, event, quantity);
      } else if (event.orderType === EOrderType.SELL) {
        // SELL: Validate and debit the asset currency from the user's balances
        const success = await this.deductBalance(queryRunner, event, quantity);
        if (!success) {
          // If the balance is insufficient, cancel the order and commit
          await queryRunner.manager.update(Order, event.orderId, {
            status: EOrderStatus.CANCELLED,
          });
          await queryRunner.commitTransaction();
          this.logger.warn(
            `Order ${event.orderId} cancelled - insufficient balance`,
            KafkaConsumer.name,
          );
          return;
        }
      }

      // 2. Mark the order as closed/completed inside the same transaction
      await queryRunner.manager.update(Order, event.orderId, {
        status: EOrderStatus.CLOSED,
      });

      // 3. Commit all state changes atomically
      await queryRunner.commitTransaction();

      // 4. Invalidate balance cache in Redis. We do this outside the DB transaction
      // so DB locks are released as fast as possible.
      try {
        await this.redisService.delete(`balances:user:${event.userId}`);
      } catch (error) {
        this.logger.warn(
          `Failed to invalidate balance cache for user ${event.userId}: ${error instanceof Error ? error.message : String(error)}`,
          KafkaConsumer.name,
        );
      }

      this.logger.log(
        `Order ${event.orderId} processed successfully`,
        KafkaConsumer.name,
      );
    } catch (error) {
      // 5. In case of unexpected database failures, discard all uncommitted changes
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Transaction rolled back for order ${event.orderId}`,
        error instanceof Error ? error.stack : String(error),
        KafkaConsumer.name,
      );
    } finally {
      // 6. Always release the query runner connection back to the TypeORM pool
      await queryRunner.release();
    }
  }

  /**
   * Increases a user's asset balance. Uses a pessimistic write lock to block concurrent updates.
   */
  private async upsertBalance(
    queryRunner: ReturnType<DataSource['createQueryRunner']>,
    event: TKafkaOrderPayload,
    quantity: number,
  ): Promise<void> {
    // SELECT ... WITH (UPDLOCK, ROWLOCK)
    // Blocks other query runners from modifying this user's balance row during transaction window.
    const existing = await queryRunner.manager.findOne(Balance, {
      where: { userId: event.userId, currencySymbol: event.currencySymbol },
      lock: { mode: 'pessimistic_write' },
    });

    if (existing) {
      const updated = (parseFloat(existing.balance) + quantity).toFixed(8);
      await queryRunner.manager.update(Balance, existing.id, {
        balance: updated,
      });
    } else {
      const newBalance = queryRunner.manager.create(Balance, {
        userId: event.userId,
        currencySymbol: event.currencySymbol,
        balance: quantity.toFixed(8),
      });
      await queryRunner.manager.save(Balance, newBalance);
    }
  }

  /**
   * Deducts user balance if sufficient. Uses a pessimistic write lock to prevent double-spending.
   */
  private async deductBalance(
    queryRunner: ReturnType<DataSource['createQueryRunner']>,
    event: TKafkaOrderPayload,
    quantity: number,
  ): Promise<boolean> {
    // SELECT ... WITH (UPDLOCK, ROWLOCK)
    // Ensures balance is not altered by other transactions before we finish deduction checks.
    const existing = await queryRunner.manager.findOne(Balance, {
      where: { userId: event.userId, currencySymbol: event.currencySymbol },
      lock: { mode: 'pessimistic_write' },
    });

    if (!existing || parseFloat(existing.balance) < quantity) {
      return false;
    }

    const updated = (parseFloat(existing.balance) - quantity).toFixed(8);
    await queryRunner.manager.update(Balance, existing.id, {
      balance: updated,
    });
    return true;
  }
}
