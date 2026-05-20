import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { AppLogger } from '../../lib/logger/app-logger.service';
import { DatabaseException } from '../../core/exceptions/exceptions';

/**
 * Data-access wrapper for the User database table.
 * Translates low-level TypeORM/driver exceptions into clean DatabaseExceptions.
 */
@Injectable()
export class UserRepository {
  private readonly logger = new AppLogger();

  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {}

  async create(user: Partial<User>): Promise<User> {
    try {
      const newUser = this.repository.create(user);
      return await this.repository.save(newUser);
    } catch (error) {
      // Log stack traces internally while raising clean errors to higher layers
      this.logger.error(
        'Failed to save new user in database',
        error instanceof Error ? error.stack : String(error),
        UserRepository.name,
      );
      throw new DatabaseException('Database write failure');
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      return await this.repository.findOne({ where: { email } });
    } catch (error) {
      this.logger.error(
        `Failed to fetch user by email [${email}] from database`,
        error instanceof Error ? error.stack : String(error),
        UserRepository.name,
      );
      throw new DatabaseException('Database query failure');
    }
  }

  async findById(id: string): Promise<User | null> {
    try {
      return await this.repository.findOne({ where: { id } });
    } catch (error) {
      this.logger.error(
        `Failed to fetch user by ID [${id}] from database`,
        error instanceof Error ? error.stack : String(error),
        UserRepository.name,
      );
      throw new DatabaseException('Database query failure');
    }
  }

  async findAll(): Promise<User[]> {
    try {
      return await this.repository.find();
    } catch (error) {
      this.logger.error(
        'Failed to fetch users from database',
        error instanceof Error ? error.stack : String(error),
        UserRepository.name,
      );
      throw new DatabaseException('Database query failure');
    }
  }
}
