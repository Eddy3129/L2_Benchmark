import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class DataStorageService {
  private gasAnalyses: Map<string, any> = new Map();
  private benchmarkSessions: Map<string, any> = new Map();
  private comparisonReports: Map<string, any> = new Map();
  private reportSections: Map<string, any> = new Map();
  private networkResults: Map<string, any> = new Map();
  private compilationResults: Map<string, any> = new Map();
  private sequencerPerformanceTests: Map<string, any> = new Map();
  private l1FinalityTracking: Map<string, any> = new Map();

  /**
   * Generic methods for data operations
   */
  private getStorage(entityType: string): Map<string, any> {
    switch (entityType) {
      case 'gasAnalysis':
        return this.gasAnalyses;
      case 'benchmarkSession':
        return this.benchmarkSessions;
      case 'comparisonReport':
        return this.comparisonReports;
      case 'reportSection':
        return this.reportSections;
      case 'networkResult':
        return this.networkResults;
      case 'compilationResult':
        return this.compilationResults;
      case 'sequencerPerformanceTest':
        return this.sequencerPerformanceTests;
      case 'l1FinalityTracking':
        return this.l1FinalityTracking;
      default:
        throw new Error(`Unknown entity type: ${entityType}`);
    }
  }

  /**
   * Create a new entity
   */
  create(entityType: string, data: any): any {
    const storage = this.getStorage(entityType);
    const id = data.id || uuidv4();
    const entity = {
      ...data,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    storage.set(id, entity);
    return entity;
  }

  /**
   * Find entity by ID
   */
  findById(entityType: string, id: string): any | null {
    const storage = this.getStorage(entityType);
    return storage.get(id) || null;
  }

  /**
   * Find all entities with optional filtering
   */
  findAll(entityType: string, filter?: (entity: any) => boolean): any[] {
    const storage = this.getStorage(entityType);
    const entities = Array.from(storage.values());
    return filter ? entities.filter(filter) : entities;
  }

  /**
   * Update entity
   */
  update(entityType: string, id: string, updateData: any): any | null {
    const storage = this.getStorage(entityType);
    const entity = storage.get(id);
    if (!entity) {
      return null;
    }
    const updatedEntity = {
      ...entity,
      ...updateData,
      updatedAt: new Date(),
    };
    storage.set(id, updatedEntity);
    return updatedEntity;
  }

  /**
   * Delete entity
   */
  delete(entityType: string, id: string): boolean {
    const storage = this.getStorage(entityType);
    return storage.delete(id);
  }

  /**
   * Count entities
   */
  count(entityType: string, filter?: (entity: any) => boolean): number {
    const entities = this.findAll(entityType, filter);
    return entities.length;
  }

  /**
   * Find entities with pagination
   */
  findWithPagination(
    entityType: string,
    page: number = 1,
    limit: number = 10,
    filter?: (entity: any) => boolean
  ): { data: any[]; total: number; page: number; limit: number } {
    const allEntities = this.findAll(entityType, filter);
    const total = allEntities.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const data = allEntities.slice(startIndex, endIndex);

    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * Find one entity with filter
   */
  findOne(entityType: string, filter: (entity: any) => boolean): any | null {
    const storage = this.getStorage(entityType);
    const entities = Array.from(storage.values());
    return entities.find(filter) || null;
  }

  /**
   * Save multiple entities
   */
  saveMany(entityType: string, entities: any[]): any[] {
    return entities.map(entity => this.create(entityType, entity));
  }

  /**
   * Clear all data for an entity type
   */
  clear(entityType: string): void {
    const storage = this.getStorage(entityType);
    storage.clear();
  }

  /**
   * Clear all data
   */
  clearAll(): void {
    this.gasAnalyses.clear();
    this.benchmarkSessions.clear();
    this.comparisonReports.clear();
    this.reportSections.clear();
    this.networkResults.clear();
    this.compilationResults.clear();
    this.sequencerPerformanceTests.clear();
    this.l1FinalityTracking.clear();
  }

  /**
   * Get statistics for all entity types
   */
  getStatistics(): Record<string, number> {
    return {
      gasAnalyses: this.gasAnalyses.size,
      benchmarkSessions: this.benchmarkSessions.size,
      comparisonReports: this.comparisonReports.size,
      reportSections: this.reportSections.size,
      networkResults: this.networkResults.size,
      compilationResults: this.compilationResults.size,
      sequencerPerformanceTests: this.sequencerPerformanceTests.size,
      l1FinalityTracking: this.l1FinalityTracking.size,
    };
  }
}