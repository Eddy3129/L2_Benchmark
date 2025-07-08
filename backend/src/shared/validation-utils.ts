import { HttpException, HttpStatus } from '@nestjs/common';
import { ApiError, AnalyzeContractRequest, CompareNetworksRequest } from './types';
import { NetworkConfigService } from '../config/network.config';

/**
 * Utility class for request validation and error handling
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
  static validateSolidityCode(code: string): void {
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
    
    if (errors.length > 0) {
      throw this.createValidationError(errors);
    }
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