import { Injectable } from '@nestjs/common';
import { UserRepository } from './user.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { IUser } from '../../core/interfaces/user.interface';
import {
  DuplicateUserException,
  UserNotFoundException,
} from '../../core/exceptions/exceptions';
import { AppLogger } from '../../lib/logger/app-logger.service';
import { RedisService } from '../../lib/redis/redis.service';

/**
 * Service orchestrating User CRUD actions.
 * Integrates caching strategies to maintain low DB query rates.
 */
@Injectable()
export class UsersService {
  private readonly logger = new AppLogger();

  constructor(
    private readonly userRepository: UserRepository,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Registers a user and invalidates the cached users list.
   */
  async create(dto: CreateUserDto): Promise<IUser> {
    const exists = await this.userRepository.findByEmail(dto.email);
    if (exists) {
      throw new DuplicateUserException(dto.email);
    }

    const user = await this.userRepository.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
    });

    // CACHE INVALIDATION: Invalidate cached lists to force update on next fetch
    await this.redisService.delete('users:all');

    this.logger.log(`User created: ${user.id}`, UsersService.name);
    return user;
  }

  /**
   * Fetches all registered users leveraging a Cache-Aside pattern.
   */
  async findAll(): Promise<IUser[]> {
    // 1. Read from Redis Cache
    const cached = await this.redisService.get<IUser[]>('users:all');
    if (cached) {
      return cached;
    }

    // 2. Query Database on Cache Miss
    const users = await this.userRepository.findAll();

    // 3. Write data back to Cache with an expiration TTL
    await this.redisService.set('users:all', users, 3600);

    return users;
  }

  /**
   * Locates a user by ID leveraging Cache-Aside.
   */
  async findOneById(id: string): Promise<IUser> {
    const cacheKey = `user:${id}`;

    const cached = await this.redisService.get<IUser>(cacheKey);
    if (cached) {
      return cached;
    }

    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new UserNotFoundException(id);
    }

    await this.redisService.set(cacheKey, user, 3600);

    return user;
  }
}
