import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { AppLogger } from '../../lib/logger/app-logger.service';
import { DatabaseException } from '../../core/exceptions/exceptions';

/**
 * Data-access wrapper for the Order database table.
 * Translates low-level TypeORM/driver exceptions into clean DatabaseExceptions.
 */
@Injectable()
export class OrderRepository {
  private readonly logger = new AppLogger();

  constructor(
    @InjectRepository(Order)
    private readonly repository: Repository<Order>,
  ) {}

  async create(order: Partial<Order>): Promise<Order> {
    try {
      const newOrder = this.repository.create(order);
      return await this.repository.save(newOrder);
    } catch (error) {
      this.logger.error(
        'Failed to save new order in database',
        error instanceof Error ? error.stack : String(error),
        OrderRepository.name,
      );
      throw new DatabaseException('Database write failure');
    }
  }

  async findByUserId(userId: string): Promise<Order[]> {
    try {
      return await this.repository.find({ where: { userId } });
    } catch (error) {
      this.logger.error(
        `Failed to fetch orders for user ID [${userId}] from database`,
        error instanceof Error ? error.stack : String(error),
        OrderRepository.name,
      );
      throw new DatabaseException('Database query failure');
    }
  }

  async findById(id: string): Promise<Order | null> {
    try {
      return await this.repository.findOne({ where: { id } });
    } catch (error) {
      this.logger.error(
        `Failed to fetch order ID [${id}] from database`,
        error instanceof Error ? error.stack : String(error),
        OrderRepository.name,
      );
      throw new DatabaseException('Database query failure');
    }
  }
}
