import { Repository, FindManyOptions, FindOneOptions } from 'typeorm';
import { Logger } from '@nestjs/common';

/**
 * Base service class providing common functionality for all services
 */
export abstract class BaseService<T = any> {
  protected readonly logger = new Logger(this.constructor.name);

  /**
   * Execute operation with centralized error handling and logging
   */
  protected async executeWithErrorHandling<R>(
    operation: () => Promise<R>,
    context: string,
    errorMessage?: string
  ): Promise<R> {
    try {
      this.logger.debug(`Starting operation: ${context}`);
      const result = await operation();
      this.logger.debug(`Completed operation: ${context}`);
      return result;
    } catch (error) {
      const message = errorMessage || `Failed to execute ${context}`;
      this.logger.error(`${message}: ${error.message}`, error.stack);
      throw new Error(`${message}: ${error.message}`);
    }
  }

  /**
   * Execute operation with retry logic
   */
  protected async executeWithRetry<R>(
    operation: () => Promise<R>,
    maxRetries: number = 3,
    delayMs: number = 1000,
    context?: string
  ): Promise<R> {
    let lastError: Error = new Error('Unknown error');
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (context) {
          this.logger.debug(`Attempt ${attempt}/${maxRetries} for ${context}`);
        }
        return await operation();
      } catch (error) {
        lastError = error as Error;
        if (attempt === maxRetries) {
          break;
        }
        
        this.logger.warn(`Attempt ${attempt} failed for ${context || 'operation'}: ${error.message}. Retrying in ${delayMs}ms...`);
        await this.delay(delayMs);
      }
    }
    
    throw lastError;
  }

  /**
   * Validate required parameters
   */
  protected validateRequired(params: Record<string, any>, requiredFields: string[]): void {
    const missingFields = requiredFields.filter(field => 
      params[field] === undefined || params[field] === null || params[field] === ''
    );
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
  }

  /**
   * Validate parameter types
   */
  protected validateTypes(params: Record<string, any>, typeValidations: Record<string, string>): void {
    const errors: string[] = [];
    
    Object.entries(typeValidations).forEach(([field, expectedType]) => {
      const value = params[field];
      if (value !== undefined && typeof value !== expectedType) {
        errors.push(`${field} must be of type ${expectedType}, got ${typeof value}`);
      }
    });
    
    if (errors.length > 0) {
      throw new Error(`Type validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Sanitize string input
   */
  protected sanitizeString(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }
    return input.trim().replace(/[<>"'&]/g, '');
  }

  /**
   * Format error message for logging
   */
  protected formatError(error: any, context?: string): string {
    const contextStr = context ? `[${context}] ` : '';
    return `${contextStr}${error.message || error.toString()}`;
  }

  /**
   * Centralized error handling for services
   */
  protected handleError(error: any, context: string): never {
    this.logger.error(`Error in ${context}: ${error.message}`, error.stack);
    throw new Error(`${context}: ${error.message}`);
  }

  /**
   * Create delay for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Transform entity to DTO with error handling
   */
  protected transformToDto<D>(
    entity: T,
    transformer: (entity: T) => D,
    context?: string
  ): D {
    try {
      return transformer(entity);
    } catch (error) {
      const message = `Failed to transform entity to DTO${context ? ` for ${context}` : ''}`;
      this.logger.error(`${message}: ${error.message}`);
      throw new Error(`${message}: ${error.message}`);
    }
  }

  /**
   * Transform array of entities to DTOs with error handling
   */
  protected transformArrayToDto<D>(
    entities: T[],
    transformer: (entity: T) => D,
    context?: string
  ): D[] {
    try {
      return entities.map(entity => this.transformToDto(entity, transformer, context));
    } catch (error) {
      const message = `Failed to transform entities array to DTOs${context ? ` for ${context}` : ''}`;
      this.logger.error(`${message}: ${error.message}`);
      throw new Error(`${message}: ${error.message}`);
    }
  }

  /**
   * Create success response for services
   */
  protected createSuccessResponse<D>(data: D, message?: string) {
    return {
      success: true,
      message: message || 'Operation completed successfully',
      data
    };
  }

  /**
   * Create error for services
   */
  protected createError(code: string, message: string, statusCode?: number): Error {
    const error = new Error(message);
    (error as any).code = code;
    (error as any).statusCode = statusCode || 500;
    return error;
  }
}

/**
 * Base repository service providing common CRUD operations
 */
export abstract class BaseRepositoryService<T extends Record<string, any>> extends BaseService<T> {
  constructor(protected readonly repository: Repository<T>) {
    super();
  }

  /**
   * Find all entities with options
   */
  async findAll(options?: FindManyOptions<T>): Promise<T[]> {
    return await this.executeWithErrorHandling<T[]>(
      async () => await this.repository.find(options),
      'findAll',
      'Failed to retrieve entities'
    );
  }

  /**
   * Find entity by ID
   */
  async findById(id: string, options?: FindOneOptions<T>): Promise<T | null> {
    return this.executeWithErrorHandling<T | null>(
      () => this.repository.findOne({ where: { id } as any, ...options }),
      `findById(${id})`,
      `Failed to find entity with ID ${id}`
    );
  }

  /**
   * Create new entity
   */
  async create(entityData: Partial<T>): Promise<T> {
    return this.executeWithErrorHandling<T>(
      async () => {
        const entity = this.repository.create(entityData as any);
        const saved = await this.repository.save(entity);
        return saved as unknown as T;
      },
      'create',
      'Failed to create entity'
    );
  }

  /**
   * Update entity by ID
   */
  async update(id: string, updateData: Partial<T>): Promise<T> {
    return this.executeWithErrorHandling<T>(
      async () => {
        await this.repository.update(id, updateData as any);
        const updated = await this.findById(id);
        if (!updated) {
          throw new Error(`Entity with ID ${id} not found after update`);
        }
        return updated;
      },
      `update(${id})`,
      `Failed to update entity with ID ${id}`
    );
  }

  /**
   * Delete entity by ID
   */
  async delete(id: string): Promise<void> {
    return this.executeWithErrorHandling<void>(
      async () => {
        const result = await this.repository.delete(id);
        if (result.affected === 0) {
          throw new Error(`Entity with ID ${id} not found`);
        }
      },
      `delete(${id})`,
      `Failed to delete entity with ID ${id}`
    );
  }

  /**
   * Count entities with options
   */
  async count(options?: FindManyOptions<T>): Promise<number> {
    return this.executeWithErrorHandling<number>(
      () => this.repository.count(options),
      'count',
      'Failed to count entities'
    );
  }
}