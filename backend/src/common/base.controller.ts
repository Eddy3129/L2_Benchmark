import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ApiError } from '../shared/types';

/**
 * Base controller class providing common functionality for all controllers
 */
export abstract class BaseController {
  protected readonly logger = new Logger(this.constructor.name);

  /**
   * Centralized error handling for controllers
   */
  protected handleError(error: any, context: string): never {
    this.logger.error(`Error in ${context}: ${error.message}`, error.stack);

    if (error instanceof HttpException) {
      throw error;
    }

    // Handle specific error types
    if (error.message?.includes('Compilation failed')) {
      throw this.createCompilationError(error.message);
    }

    if (error.message?.includes('Validation failed')) {
      throw this.createValidationError([error.message]);
    }

    if (error.message?.includes('not found')) {
      throw this.createNotFoundError(context, error.message);
    }

    // Default to internal server error
    throw this.createInternalServerError(`${context}: ${error.message}`);
  }

  /**
   * Validate request DTO using provided validator function
   */
  protected validateRequest<T>(dto: T, validator: (dto: T) => void): void {
    try {
      validator(dto);
    } catch (error) {
      throw this.createValidationError([error.message]);
    }
  }

  /**
   * Create standardized validation error
   */
  protected createValidationError(errors: string[]): HttpException {
    const apiError: ApiError = {
      statusCode: HttpStatus.BAD_REQUEST,
      message: `Validation failed: ${errors.join(', ')}`,
      error: 'Bad Request',
      type: 'VALIDATION_ERROR'
    };
    
    return new HttpException(apiError, HttpStatus.BAD_REQUEST);
  }

  /**
   * Create standardized compilation error
   */
  protected createCompilationError(compilationError: string): HttpException {
    const apiError: ApiError = {
      statusCode: HttpStatus.BAD_REQUEST,
      message: `Compilation failed: ${compilationError}`,
      error: 'Bad Request',
      type: 'COMPILATION_ERROR'
    };
    
    return new HttpException(apiError, HttpStatus.BAD_REQUEST);
  }

  /**
   * Create standardized not found error
   */
  protected createNotFoundError(resource: string, id?: string): HttpException {
    const message = id ? `${resource} with ID ${id} not found` : `${resource} not found`;
    const apiError: ApiError = {
      statusCode: HttpStatus.NOT_FOUND,
      message,
      error: 'Not Found'
    };
    
    return new HttpException(apiError, HttpStatus.NOT_FOUND);
  }

  /**
   * Create standardized internal server error
   */
  protected createInternalServerError(message: string): HttpException {
    const apiError: ApiError = {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: `Internal server error: ${message}`,
      error: 'Internal Server Error'
    };
    
    return new HttpException(apiError, HttpStatus.INTERNAL_SERVER_ERROR);
  }

  /**
   * Create standardized success response
   */
  protected createSuccessResponse<T>(data: T, message?: string) {
    return {
      success: true,
      message: message || 'Operation completed successfully',
      data
    };
  }

  /**
   * Create standardized paginated response
   */
  protected createPaginatedResponse<T>(data: T[], meta: any, message?: string) {
    return {
      success: true,
      message: message || 'Data retrieved successfully',
      data,
      meta
    };
  }

  /**
   * Parse and validate pagination parameters
   */
  protected parsePaginationParams(limit?: string, offset?: string): { limit: number; offset: number } {
    let parsedLimit = 50; // Default limit
    let parsedOffset = 0; // Default offset
    
    if (limit !== undefined) {
      parsedLimit = parseInt(limit, 10);
      if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 1000) {
        throw this.createValidationError(['Limit must be a number between 1 and 1000']);
      }
    }
    
    if (offset !== undefined) {
      parsedOffset = parseInt(offset, 10);
      if (isNaN(parsedOffset) || parsedOffset < 0) {
        throw this.createValidationError(['Offset must be a non-negative number']);
      }
    }
    
    return { limit: parsedLimit, offset: parsedOffset };
  }
}