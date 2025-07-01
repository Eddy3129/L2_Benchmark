import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Repository, FindManyOptions, FindOneOptions, ObjectLiteral } from 'typeorm';
import { ValidationUtils } from './validation-utils';

/**
 * Base service class providing common CRUD operations
 * Reduces code duplication across different services
 */
@Injectable()
export abstract class BaseService<T extends ObjectLiteral> {
  protected readonly logger: Logger;
  
  constructor(
    protected readonly repository: Repository<T>,
    protected readonly entityName: string
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  /**
   * Create a new entity
   */
  async create(entityData: Partial<T>): Promise<T> {
    try {
      const entity = this.repository.create(entityData as any);
      const savedEntity = await this.repository.save(entity);
      this.logger.log(`Created new ${this.entityName} with ID: ${(savedEntity as any).id}`);
      return Array.isArray(savedEntity) ? savedEntity[0] : savedEntity;
    } catch (error) {
      this.logger.error(`Failed to create ${this.entityName}:`, error);
      throw ValidationUtils.createInternalServerError(`Failed to create ${this.entityName}`);
    }
  }

  /**
   * Find all entities with optional filtering and pagination
   */
  async findAll(options?: FindManyOptions<T>): Promise<T[]> {
    try {
      return await this.repository.find(options);
    } catch (error) {
      this.logger.error(`Failed to fetch ${this.entityName} list:`, error);
      throw ValidationUtils.createInternalServerError(`Failed to fetch ${this.entityName} list`);
    }
  }

  /**
   * Find entities with pagination
   */
  async findWithPagination(
    limit: number = 50, 
    offset: number = 0, 
    additionalOptions?: Omit<FindManyOptions<T>, 'take' | 'skip'>
  ): Promise<{ data: T[]; total: number; limit: number; offset: number }> {
    try {
      const [data, total] = await this.repository.findAndCount({
        ...additionalOptions,
        take: limit,
        skip: offset,
      });

      return {
        data,
        total,
        limit,
        offset
      };
    } catch (error) {
      this.logger.error(`Failed to fetch paginated ${this.entityName} list:`, error);
      throw ValidationUtils.createInternalServerError(`Failed to fetch ${this.entityName} list`);
    }
  }

  /**
   * Find a single entity by ID
   */
  async findById(id: string, options?: FindOneOptions<T>): Promise<T> {
    try {
      ValidationUtils.validateUUID(id);
      
      const entity = await this.repository.findOne({
        where: { id } as any,
        ...options
      });
      
      if (!entity) {
        throw ValidationUtils.createNotFoundError(this.entityName, id);
      }
      
      return entity;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to fetch ${this.entityName} by ID ${id}:`, error);
      throw ValidationUtils.createInternalServerError(`Failed to fetch ${this.entityName}`);
    }
  }

  /**
   * Find a single entity by criteria
   */
  async findOne(options: FindOneOptions<T>): Promise<T | null> {
    try {
      return await this.repository.findOne(options);
    } catch (error) {
      this.logger.error(`Failed to fetch ${this.entityName}:`, error);
      throw ValidationUtils.createInternalServerError(`Failed to fetch ${this.entityName}`);
    }
  }

  /**
   * Update an entity by ID
   */
  async updateById(id: string, updateData: Partial<T>): Promise<T> {
    try {
      ValidationUtils.validateUUID(id);
      
      const entity = await this.findById(id);
      const updatedEntity = this.repository.merge(entity, updateData as any);
      const savedEntity = await this.repository.save(updatedEntity);
      
      this.logger.log(`Updated ${this.entityName} with ID: ${id}`);
      return savedEntity;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to update ${this.entityName} with ID ${id}:`, error);
      throw ValidationUtils.createInternalServerError(`Failed to update ${this.entityName}`);
    }
  }

  /**
   * Delete an entity by ID
   */
  async deleteById(id: string): Promise<void> {
    try {
      ValidationUtils.validateUUID(id);
      
      const entity = await this.findById(id);
      await this.repository.remove(entity);
      
      this.logger.log(`Deleted ${this.entityName} with ID: ${id}`);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to delete ${this.entityName} with ID ${id}:`, error);
      throw ValidationUtils.createInternalServerError(`Failed to delete ${this.entityName}`);
    }
  }

  /**
   * Soft delete an entity by ID (if the entity supports soft delete)
   */
  async softDeleteById(id: string): Promise<void> {
    try {
      ValidationUtils.validateUUID(id);
      
      const result = await this.repository.softDelete(id);
      
      if (result.affected === 0) {
        throw ValidationUtils.createNotFoundError(this.entityName, id);
      }
      
      this.logger.log(`Soft deleted ${this.entityName} with ID: ${id}`);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to soft delete ${this.entityName} with ID ${id}:`, error);
      throw ValidationUtils.createInternalServerError(`Failed to delete ${this.entityName}`);
    }
  }

  /**
   * Count entities with optional filtering
   */
  async count(options?: FindManyOptions<T>): Promise<number> {
    try {
      return await this.repository.count(options);
    } catch (error) {
      this.logger.error(`Failed to count ${this.entityName}:`, error);
      throw ValidationUtils.createInternalServerError(`Failed to count ${this.entityName}`);
    }
  }

  /**
   * Check if an entity exists by ID
   */
  async existsById(id: string): Promise<boolean> {
    try {
      ValidationUtils.validateUUID(id);
      
      const count = await this.repository.count({
        where: { id } as any
      });
      
      return count > 0;
    } catch (error) {
      this.logger.error(`Failed to check existence of ${this.entityName} with ID ${id}:`, error);
      return false;
    }
  }

  /**
   * Bulk create entities
   */
  async bulkCreate(entitiesData: Partial<T>[]): Promise<T[]> {
    try {
      const entities = this.repository.create(entitiesData as any);
      const savedEntities = await this.repository.save(entities);
      
      this.logger.log(`Bulk created ${savedEntities.length} ${this.entityName} entities`);
      return savedEntities as T[];
    } catch (error) {
      this.logger.error(`Failed to bulk create ${this.entityName} entities:`, error);
      throw ValidationUtils.createInternalServerError(`Failed to bulk create ${this.entityName} entities`);
    }
  }

  /**
   * Get repository for advanced operations
   */
  getRepository(): Repository<T> {
    return this.repository;
  }
}