import { HttpException, HttpStatus, BadRequestException } from '@nestjs/common';
import { ApiError, AnalyzeContractRequest, CompareNetworksRequest } from './types';
import { NetworkConfigService } from '../config/network.config';
import { ValidationError } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

/**
 * Consolidated utility class for request validation and error handling
 * This replaces duplicate validation utilities across the codebase
 */
export class ValidationUtils {
  /**
   * Validate analyze contract request
   */
  static validateAnalyzeContractRequest(request: AnalyzeContractRequest): void {
    const errors: string[] = [];
    
    // Validate code
    if (!request.code || typeof request.code !== 'string' || request.code.trim().length === 0) {
      errors.push('Code is required and must be a non-empty string');
    }
    
    // Validate contract name
    if (!request.contractName || typeof request.contractName !== 'string' || request.contractName.trim().length === 0) {
      errors.push('Contract name is required and must be a non-empty string');
    }
    
    // Validate networks
    if (!request.networks || !Array.isArray(request.networks) || request.networks.length === 0) {
      errors.push('Networks array is required and must contain at least one network');
    } else {
      const { invalid } = NetworkConfigService.validateNetworks(request.networks);
      if (invalid.length > 0) {
        errors.push(`Invalid networks: ${invalid.join(', ')}`);
      }
    }
    
    // Validate confidence level
    if (request.confidenceLevel !== undefined) {
      if (typeof request.confidenceLevel !== 'number' || request.confidenceLevel < 1 || request.confidenceLevel > 99) {
        errors.push('Confidence level must be a number between 1 and 99');
      }
    }
    
    // Validate save to database flag
    if (request.saveToDatabase !== undefined && typeof request.saveToDatabase !== 'boolean') {
      errors.push('saveToDatabase must be a boolean value');
    }
    
    if (errors.length > 0) {
      throw this.createValidationError(errors);
    }
  }
  
  /**
   * Validate compare networks request
   */
  static validateCompareNetworksRequest(request: CompareNetworksRequest): void {
    const errors: string[] = [];
    
    // Validate code
    if (!request.code || typeof request.code !== 'string' || request.code.trim().length === 0) {
      errors.push('Code is required and must be a non-empty string');
    }
    
    // Validate contract name
    if (!request.contractName || typeof request.contractName !== 'string' || request.contractName.trim().length === 0) {
      errors.push('Contract name is required and must be a non-empty string');
    }
    
    // Validate L2 networks
    if (!request.l2Networks || !Array.isArray(request.l2Networks) || request.l2Networks.length === 0) {
      errors.push('L2 networks array is required and must contain at least one network');
    } else {
      const { invalid } = NetworkConfigService.validateNetworks(request.l2Networks);
      if (invalid.length > 0) {
        errors.push(`Invalid L2 networks: ${invalid.join(', ')}`);
      }
    }
    
    // Validate confidence level
    if (request.confidenceLevel !== undefined) {
      if (typeof request.confidenceLevel !== 'number' || request.confidenceLevel < 1 || request.confidenceLevel > 99) {
        errors.push('Confidence level must be a number between 1 and 99');
      }
    }
    
    // Validate save to database flag
    if (request.saveToDatabase !== undefined && typeof request.saveToDatabase !== 'boolean') {
      errors.push('saveToDatabase must be a boolean value');
    }
    
    if (errors.length > 0) {
      throw this.createValidationError(errors);
    }
  }
  
  /**
   * Validate Solidity code basic syntax
   */
  static validateSolidityCode(code: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check for basic Solidity structure
    if (!code.includes('contract ') && !code.includes('library ') && !code.includes('interface ')) {
      errors.push('Code must contain at least one contract, library, or interface declaration');
    }
    
    // Check for pragma directive
    if (!code.includes('pragma solidity')) {
      errors.push('Code should include a pragma solidity directive');
    }
    
    // Check for balanced braces
    const openBraces = (code.match(/{/g) || []).length;
    const closeBraces = (code.match(/}/g) || []).length;
    if (openBraces !== closeBraces) {
      errors.push('Unbalanced braces in Solidity code');
    }
    
    // Check for balanced parentheses
    const openParens = (code.match(/\(/g) || []).length;
    const closeParens = (code.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      errors.push('Unbalanced parentheses in Solidity code');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Validate pagination parameters
   */
  static validatePaginationParams(limit?: string, offset?: string): { limit: number; offset: number } {
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
  
  /**
   * Validate UUID format
   */
  static validateUUID(id: string): void {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw this.createValidationError(['Invalid UUID format']);
    }
  }
  
  /**
   * Create a standardized validation error
   */
  static createValidationError(errors: string[]): HttpException {
    const apiError: ApiError = {
      statusCode: HttpStatus.BAD_REQUEST,
      message: `Validation failed: ${errors.join(', ')}`,
      error: 'Bad Request',
      type: 'VALIDATION_ERROR'
    };
    
    return new HttpException(apiError, HttpStatus.BAD_REQUEST);
  }
  
  /**
   * Create a standardized compilation error
   */
  static createCompilationError(compilationError: string): HttpException {
    const apiError: ApiError = {
      statusCode: HttpStatus.BAD_REQUEST,
      message: `Compilation failed: ${compilationError}`,
      error: 'Bad Request',
      type: 'COMPILATION_ERROR'
    };
    
    return new HttpException(apiError, HttpStatus.BAD_REQUEST);
  }
  
  /**
   * Validates a DTO class instance (consolidated from common/utils)
   */
  static async validateDto<T extends object>(
    dtoClass: new () => T,
    data: any,
    options?: {
      skipMissingProperties?: boolean;
      whitelist?: boolean;
      forbidNonWhitelisted?: boolean;
    }
  ): Promise<T> {
    const dto = plainToClass(dtoClass, data);
    const errors = await validate(dto, {
      skipMissingProperties: options?.skipMissingProperties ?? false,
      whitelist: options?.whitelist ?? true,
      forbidNonWhitelisted: options?.forbidNonWhitelisted ?? true,
    });

    if (errors.length > 0) {
      const validationErrors = this.formatValidationErrors(errors);
      throw new BadRequestException({
        message: 'Validation failed',
        validationErrors,
      });
    }

    return dto;
  }

  /**
   * Formats validation errors into a standardized format
   */
  static formatValidationErrors(errors: ValidationError[]): any[] {
    const result: any[] = [];

    const processError = (error: ValidationError, parentPath = '') => {
      const fieldPath = parentPath ? `${parentPath}.${error.property}` : error.property;

      if (error.constraints) {
        Object.values(error.constraints).forEach(message => {
          result.push({ field: fieldPath, message, value: error.value });
        });
      }

      if (error.children && error.children.length > 0) {
        error.children.forEach(child => processError(child, fieldPath));
      }
    };

    errors.forEach(error => processError(error));
    return result;
  }

  /**
   * Validates contract name (consolidated from multiple services)
   */
  static validateContractName(name: string): boolean {
    if (!name || typeof name !== 'string') return false;
    const trimmed = name.trim();
    if (trimmed.length < 1 || trimmed.length > 100) return false;
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmed);
  }

  /**
   * Validates Ethereum address
   */
  static validateAddress(address: string): boolean {
    if (!address || typeof address !== 'string') return false;
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Validates transaction hash
   */
  static validateTransactionHash(hash: string): boolean {
    if (!hash || typeof hash !== 'string') return false;
    return /^0x[a-fA-F0-9]{64}$/.test(hash);
  }

  /**
   * Validates Solidity version (consolidated)
   */
  static validateSolidityVersion(version: string): boolean {
    if (!version || typeof version !== 'string') return false;
    return /^\d+\.\d+\.\d+$/.test(version);
  }

  /**
   * Create a standardized not found error
   */
  static createNotFoundError(resource: string, id: string): HttpException {
    const apiError: ApiError = {
      statusCode: HttpStatus.NOT_FOUND,
      message: `${resource} with ID ${id} not found`,
      error: 'Not Found'
    };
    
    return new HttpException(apiError, HttpStatus.NOT_FOUND);
  }
  
  /**
   * Create a standardized internal server error
   */
  static createInternalServerError(message: string = 'Internal server error'): HttpException {
    const apiError: ApiError = {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message,
      error: 'Internal Server Error'
    };
    
    return new HttpException(apiError, HttpStatus.INTERNAL_SERVER_ERROR);
  }
  
  /**
   * Extract compilation error from error message
   */
  static extractCompilationError(errorMessage: string): string {
    // Try to extract the actual compilation error from stderr
    const lines = errorMessage.split('\n');
    const errorLines = lines.filter(line => 
      line.includes('Error:') || 
      line.includes('Warning:') || 
      line.includes('TypeError:') ||
      line.includes('ParserError:')
    );
    
    if (errorLines.length > 0) {
      return errorLines[0].trim();
    }
    
    // Fallback to original message
    return errorMessage;
  }
}