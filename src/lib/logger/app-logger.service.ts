import { Injectable, LoggerService } from '@nestjs/common';

@Injectable()
export class AppLogger implements LoggerService {
  private readonly context = 'KoinBX';

  log(message: any, context?: string) {
    this.printMessage('LOG', message, context);
  }

  error(message: any, trace?: string, context?: string) {
    this.printMessage('ERROR', message, context, trace);
  }

  warn(message: any, context?: string) {
    this.printMessage('WARN', message, context);
  }

  debug?(message: any, context?: string) {
    this.printMessage('DEBUG', message, context);
  }

  verbose?(message: any, context?: string) {
    this.printMessage('VERBOSE', message, context);
  }

  private printMessage(
    level: string,
    message: any,
    context?: string,
    trace?: string,
  ) {
    const timestamp = new Date().toISOString();
    const ctx = context || this.context;
    let logMessage = `[${timestamp}] [${level}] [${ctx}] ${message}`;

    if (trace) {
      logMessage += `\nTrace: ${trace}`;
    }

    if (level === 'ERROR') {
      console.error(logMessage);
    } else if (level === 'WARN') {
      console.warn(logMessage);
    } else {
      console.log(logMessage);
    }
  }
}
