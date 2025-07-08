import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiError } from '../../shared/types';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, error } = this.getErrorResponse(exception);

    // Log the error
    this.logError(exception, request, status);

    // Send standardized error response
    response.status(status).json({
      ...error,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    });
  }

  private getErrorResponse(exception: unknown): { status: number; error: ApiError } {
    // Handle HttpException (including custom API errors)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      
      // If response is already an ApiError object, use it
      if (typeof response === 'object' && 'statusCode' in response) {
        return {
          status,
          error: response as ApiError,
        };
      }
      
      // Otherwise, create standardized error
      return {
        status,
        error: {
          statusCode: status,
          message: typeof response === 'string' ? response : exception.message,
          error: this.getErrorName(status),
        },
      };
    }

    // Handle validation errors
    if (this.isValidationError(exception)) {
      return {
        status: HttpStatus.BAD_REQUEST,
        error: {
          statusCode: HttpStatus.BAD_REQUEST,
          message: this.extractValidationMessage(exception),
          error: 'Bad Request',
          type: 'VALIDATION_ERROR',
        },
      };
    }

    // Handle database errors
    if (this.isDatabaseError(exception)) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        error: {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Database operation failed',
          error: 'Internal Server Error',
          type: 'DATABASE_ERROR',
        },
      };
    }

    // Handle compilation errors
    if (this.isCompilationError(exception)) {
      return {
        status: HttpStatus.BAD_REQUEST,
        error: {
          statusCode: HttpStatus.BAD_REQUEST,
          message: this.extractCompilationMessage(exception),
          error: 'Bad Request',
          type: 'COMPILATION_ERROR',
        },
      };
    }

    // Handle network/timeout errors
    if (this.isNetworkError(exception)) {
      return {
        status: HttpStatus.SERVICE_UNAVAILABLE,
        error: {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          message: 'External service unavailable',
          error: 'Service Unavailable',
          type: 'NETWORK_ERROR',
        },
      };
    }

    // Default to internal server error
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      error: {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        error: 'Internal Server Error',
      },
    };
  }

  private logError(exception: unknown, request: Request, status: number): void {
    const message = exception instanceof Error ? exception.message : 'Unknown error';
    const stack = exception instanceof Error ? exception.stack : undefined;
    
    const logContext = {
      method: request.method,
      url: request.url,
      userAgent: request.get('User-Agent'),
      ip: request.ip,
      status,
    };

    if (status >= 500) {
      this.logger.error(
        `${message} - ${JSON.stringify(logContext)}`,
        stack,
      );
    } else if (status >= 400) {
      this.logger.warn(
        `${message} - ${JSON.stringify(logContext)}`,
      );
    }
  }

  private getErrorName(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'Bad Request';
      case HttpStatus.UNAUTHORIZED:
        return 'Unauthorized';
      case HttpStatus.FORBIDDEN:
        return 'Forbidden';
      case HttpStatus.NOT_FOUND:
        return 'Not Found';
      case HttpStatus.CONFLICT:
        return 'Conflict';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'Unprocessable Entity';
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return 'Internal Server Error';
      case HttpStatus.SERVICE_UNAVAILABLE:
        return 'Service Unavailable';
      default:
        return 'Error';
    }
  }

  private isValidationError(exception: unknown): boolean {
    if (!(exception instanceof Error)) return false;
    
    return (
      exception.message.includes('validation') ||
      exception.message.includes('Validation') ||
      exception.name === 'ValidationError' ||
      exception.constructor.name === 'ValidationError'
    );
  }

  private isDatabaseError(exception: unknown): boolean {
    if (!(exception instanceof Error)) return false;
    
    return (
      exception.name === 'QueryFailedError' ||
      exception.name === 'EntityNotFoundError' ||
      exception.name === 'TypeORMError' ||
      exception.message.includes('database') ||
      exception.message.includes('connection')
    );
  }

  private isCompilationError(exception: unknown): boolean {
    if (!(exception instanceof Error)) return false;
    
    return (
      exception.message.includes('Compilation failed') ||
      exception.message.includes('compilation') ||
      exception.message.includes('solc')
    );
  }

  private isNetworkError(exception: unknown): boolean {
    if (!(exception instanceof Error)) return false;
    
    return (
      exception.message.includes('ECONNREFUSED') ||
      exception.message.includes('ETIMEDOUT') ||
      exception.message.includes('ENOTFOUND') ||
      exception.message.includes('network') ||
      exception.name === 'FetchError'
    );
  }

  private extractValidationMessage(exception: unknown): string {
    if (exception instanceof Error) {
      return exception.message;
    }
    return 'Validation failed';
  }

  private extractCompilationMessage(exception: unknown): string {
    if (exception instanceof Error) {
      // Extract meaningful compilation error message
      const message = exception.message;
      if (message.includes('Compilation failed:')) {
        return message;
      }
      return `Compilation failed: ${message}`;
    }
    return 'Contract compilation failed';
  }
}