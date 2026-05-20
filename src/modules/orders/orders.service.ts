import { Injectable } from '@nestjs/common';
import { OrderRepository } from './order.repository';
import { CreateOrderDto } from './dto/create-order.dto';
import { IOrder } from '../../core/interfaces/order.interface';
import { EOrderStatus, EOrderType } from '../../core/enums/order.enum';
import { TKafkaOrderPayload } from '../../core/types/kafka-payload.type';
import { UsersService } from '../users/users.service';
import { BalancesService } from '../balances/balances.service';
import {
  InsufficientBalanceException,
  KafkaPublishException,
} from '../../core/exceptions/exceptions';
import { KafkaProducer } from '../../lib/kafka/kafka.producer';
import { AppLogger } from '../../lib/logger/app-logger.service';

/**
 * Service orchestrating order placement steps.
 * Validates balance parameters before storing state changes and triggering queues.
 */
@Injectable()
export class OrdersService {
  private readonly logger = new AppLogger();

  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly usersService: UsersService,
    private readonly balancesService: BalancesService,
    private readonly kafkaProducer: KafkaProducer,
  ) {}

  /**
   * Places a new order.
   * Validates balances and records a pending order before queuing it in Kafka.
   */
  async placeOrder(dto: CreateOrderDto): Promise<IOrder> {
    // 1. Validate that the user exists (reads from user cache/database)
    await this.usersService.findOneById(dto.userId);

    // 2. Synchronous Pre-Validation for SELL orders:
    // Ensure the user has the required asset balance before creating the order.
    // (BUY orders are verified asynchronously by the consumer during processing).
    if (dto.orderType === EOrderType.SELL) {
      const balance = await this.balancesService.findByUserAndCurrency(
        dto.userId,
        dto.currencySymbol,
      );

      const available = balance ? parseFloat(balance.balance) : 0;

      if (available < dto.quantity) {
        throw new InsufficientBalanceException(
          `Insufficient balance. Available: ${available.toFixed(8)}, Required: ${dto.quantity.toFixed(8)}`,
        );
      }
    }

    // 3. Persist the order locally with "OPEN" status
    const order = await this.orderRepository.create({
      userId: dto.userId,
      orderType: dto.orderType,
      currencySymbol: dto.currencySymbol,
      price: dto.price.toFixed(8),
      quantity: dto.quantity.toFixed(8),
      status: EOrderStatus.OPEN,
    });

    this.logger.log(
      `Order placed: id=${order.id} type=${order.orderType}`,
      OrdersService.name,
    );

    // 4. Publish to Kafka to trigger asynchronous balance changes & processing.
    // Caught errors here represent critical queue pipeline issues.
    try {
      await this.publishOrderEvent(order);
    } catch (error) {
      this.logger.error(
        `Failed to publish order event to Kafka for order ${order.id}`,
        error instanceof Error ? error.stack : String(error),
        OrdersService.name,
      );
      throw new KafkaPublishException('Failed to publish order event');
    }

    return order;
  }

  async findOrdersByUser(userId: string): Promise<IOrder[]> {
    return this.orderRepository.findByUserId(userId);
  }

  async findOneById(id: string): Promise<IOrder | null> {
    return this.orderRepository.findById(id);
  }

  /**
   * Constructs payload format and requests publication from Kafka client.
   */
  private async publishOrderEvent(order: IOrder): Promise<void> {
    const payload: TKafkaOrderPayload = {
      orderId: order.id,
      userId: order.userId,
      orderType: order.orderType,
      currencySymbol: order.currencySymbol,
      price: order.price,
      quantity: order.quantity,
    };

    await this.kafkaProducer.publishOrderPlaced(payload);
  }
}
