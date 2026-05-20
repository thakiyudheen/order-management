import { HttpException, HttpStatus } from '@nestjs/common';

export abstract class BaseCustomException extends HttpException {
  constructor(message: string, status: HttpStatus) {
    super(message, status);
  }
}

export class InsufficientBalanceException extends BaseCustomException {
  constructor(message: string) {
    super(message, HttpStatus.BAD_REQUEST);
  }
}

export class UserNotFoundException extends BaseCustomException {
  constructor(userId: string) {
    super(`User with ID [${userId}] not found`, HttpStatus.NOT_FOUND);
  }
}

export class DuplicateUserException extends BaseCustomException {
  constructor(email: string) {
    super(`User with email [${email}] already exists`, HttpStatus.CONFLICT);
  }
}

export class DatabaseException extends BaseCustomException {
  constructor(message: string) {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

export class KafkaPublishException extends BaseCustomException {
  constructor(message: string) {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
