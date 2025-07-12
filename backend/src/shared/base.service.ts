import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ValidationUtils } from './validation-utils';
import { DataStorageService } from './data-storage.service';

/**
 * Base service class providing common CRUD operations
 * Reduces code duplication across different services
 */
@Injectable()
export abstract class BaseService<T> {
  protected readonly logger: Logger;
  
  constructor(
    protected readonly dataStorage: DataStorageService,
    protected readonly entityName: string
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  /**
   * Create a new entity
   */
  async create(entityData: Partial<T>): Promise<T> {
    try {
      const id = ValidationUtils.generateUUID();
      const entity = { ...entityData, id, createdAt: new Date(), updatedAt: new Date() } as T;
      await this.dataStorage.create(this.entityName, entity);
      this.logger.log(`Created new ${this.entityName} with ID: ${id}`);
      return entity;
    } catch (error) {
      this.logger.error(`Failed to create ${this.entityName}:`, error);
      throw ValidationUtils.createInternalServerError(`Failed to create ${this.entityName}`);
    }
  }

  /**
   * Find all entities with optional filtering and pagination
   */
  async findAll(options?: any): Promise<T[]> {
    try {
      return await this.dataStorage.findAll(this.entityName);
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
    additionalOptions?: any
  ): Promise<{ data: T[]; total: number; limit: number; offset: number }> {
    try {
      const allData = await this.dataStorage.findAll(this.entityName);
      const total = allData.length;
      const data = allData.slice(offset, offset + limit);

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
  async findById(id: string, options?: any): Promise<T> {
    try {
      ValidationUtils.validateUUID(id);
      
      const entity = await this.dataStorage.findById(this.entityName, id);
      
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
  async findOne(options: any): Promise<T | null> {
    try {
      const allData = await this.dataStorage.findAll(this.entityName);
      return allData.find(item => {
        // Simple property matching - can be enhanced for complex queries
        return Object.keys(options.where || {}).every(key => 
          (item as any)[key] === options.where[key]
        );
      }) || null;
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
      const updatedEntity = { ...entity, ...updateData, updatedAt: new Date() } as T;
      await this.dataStorage.update(this.entityName, id, updatedEntity);
      
      this.logger.log(`Updated ${this.entityName} with ID: ${id}`);
      return updatedEntity;
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
      
      await this.findById(id); // Ensure entity exists
      await this.dataStorage.delete(this.entityName, id);
      
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
      
      const entity = await this.findById(id);
      const updatedEntity = { ...entity, deletedAt: new Date() } as T;
      await this.dataStorage.update(this.entityName, id, updatedEntity);
      
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
  async count(options?: any): Promise<number> {
    try {
      const allData = await this.dataStorage.findAll(this.entityName);
      return allData.length;
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
      
      const entity = await this.dataStorage.findById(this.entityName, id);
      return entity !== null;
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
      const savedEntities: T[] = [];
      for (const entityData of entitiesData) {
        const entity = await this.create(entityData);
        savedEntities.push(entity);
      }
      
      this.logger.log(`Bulk created ${savedEntities.length} ${this.entityName} entities`);
      return savedEntities;
    } catch (error) {
      this.logger.error(`Failed to bulk create ${this.entityName} entities:`, error);
      throw ValidationUtils.createInternalServerError(`Failed to bulk create ${this.entityName} entities`);
    }
  }

  /**
   * Get data storage service for advanced operations
   */
  getDataStorage(): DataStorageService {
    return this.dataStorage;
  }
}