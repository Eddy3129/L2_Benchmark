import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { ApiError } from '../../shared/types';

@Injectable()
export class ValidationPipe implements PipeTransform<any> {
  private readonly logger = new Logger(ValidationPipe.name);

  async transform(value: any, { metatype }: ArgumentMetadata) {
    // Skip validation for primitive types
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    // Transform plain object to class instance
    const object = plainToClass(metatype, value);
    
    // Validate the object
    const errors = await validate(object, {
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error for non-whitelisted properties
      transform: true, // Transform the object
      validateCustomDecorators: true,
    });

    if (errors.length > 0) {
      const errorMessages = this.formatValidationErrors(errors);
      this.logger.warn(`Validation failed: ${errorMessages.join(', ')}`);
      
      const apiError: ApiError = {
        statusCode: 400,
        message: `Validation failed: ${errorMessages.join(', ')}`,
        error: 'Bad Request',
        type: 'VALIDATION_ERROR',
      };
      
      throw new BadRequestException(apiError);
    }

    return object;
  }

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  private formatValidationErrors(errors: any[]): string[] {
    const messages: string[] = [];
    
    errors.forEach(error => {
      if (error.constraints) {
        Object.values(error.constraints).forEach(constraint => {
          messages.push(constraint as string);
        });
      }
      
      // Handle nested validation errors
      if (error.children && error.children.length > 0) {
        const nestedMessages = this.formatValidationErrors(error.children);
        messages.push(...nestedMessages.map(msg => `${error.property}.${msg}`));
      }
    });
    
    return messages;
  }
}

/**
 * Custom validation pipe for optional validation
 * Allows undefined/null values to pass through without validation
 */
@Injectable()
export class OptionalValidationPipe implements PipeTransform<any> {
  private readonly logger = new Logger(OptionalValidationPipe.name);
  private readonly validationPipe = new ValidationPipe();

  async transform(value: any, metadata: ArgumentMetadata) {
    // If value is undefined or null, return as is
    if (value === undefined || value === null) {
      return value;
    }

    // Otherwise, use standard validation
    return this.validationPipe.transform(value, metadata);
  }
}

/**
 * Parse integer pipe with validation
 */
@Injectable()
export class ParseIntPipe implements PipeTransform<string, number> {
  private readonly logger = new Logger(ParseIntPipe.name);

  transform(value: string, metadata: ArgumentMetadata): number {
    if (value === undefined || value === null || value === '') {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Value is required',
        error: 'Bad Request',
        type: 'VALIDATION_ERROR',
      } as ApiError);
    }

    const val = parseInt(value, 10);
    if (isNaN(val)) {
      throw new BadRequestException({
        statusCode: 400,
        message: `Value '${value}' is not a valid integer`,
        error: 'Bad Request',
        type: 'VALIDATION_ERROR',
      } as ApiError);
    }

    return val;
  }
}

/**
 * Parse optional integer pipe
 */
@Injectable()
export class ParseOptionalIntPipe implements PipeTransform<string, number | undefined> {
  private readonly parseIntPipe = new ParseIntPipe();

  transform(value: string, metadata: ArgumentMetadata): number | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    return this.parseIntPipe.transform(value, metadata);
  }
}

/**
 * Parse UUID pipe with validation
 */
@Injectable()
export class ParseUUIDPipe implements PipeTransform<string, string> {
  private readonly logger = new Logger(ParseUUIDPipe.name);
  private readonly uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  transform(value: string, metadata: ArgumentMetadata): string {
    if (!value || typeof value !== 'string') {
      throw new BadRequestException({
        statusCode: 400,
        message: 'UUID is required',
        error: 'Bad Request',
        type: 'VALIDATION_ERROR',
      } as ApiError);
    }

    if (!this.uuidRegex.test(value)) {
      throw new BadRequestException({
        statusCode: 400,
        message: `'${value}' is not a valid UUID`,
        error: 'Bad Request',
        type: 'VALIDATION_ERROR',
      } as ApiError);
    }

    return value;
  }
}