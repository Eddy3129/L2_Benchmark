import { BadRequestException, ValidationError } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { VALIDATION_CONSTANTS, ERROR_MESSAGES } from '../constants';
import { ValidationErrorDto } from '../dto/base.dto';

// Validation Utilities
export class ValidationUtils {
  /**
   * Validates a DTO class instance
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
        message: ERROR_MESSAGES.VALIDATION.INVALID_PAGINATION,
        validationErrors,
      });
    }

    return dto;
  }

  /**
   * Formats validation errors into a standardized format
   */
  static formatValidationErrors(errors: ValidationError[]): ValidationErrorDto[] {
    const result: ValidationErrorDto[] = [];

    const processError = (error: ValidationError, parentPath = '') => {
      const fieldPath = parentPath ? `${parentPath}.${error.property}` : error.property;

      if (error.constraints) {
        Object.values(error.constraints).forEach(message => {
          result.push(new ValidationErrorDto(fieldPath, message, error.value));
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
   * Validates contract name
   */
  static validateContractName(name: string): boolean {
    if (!name || typeof name !== 'string') return false;
    if (name.length < VALIDATION_CONSTANTS.CONTRACT_NAME.MIN_LENGTH) return false;
    if (name.length > VALIDATION_CONSTANTS.CONTRACT_NAME.MAX_LENGTH) return false;
    return VALIDATION_CONSTANTS.CONTRACT_NAME.PATTERN.test(name);
  }

  /**
   * Validates Ethereum address
   */
  static validateAddress(address: string): boolean {
    if (!address || typeof address !== 'string') return false;
    return VALIDATION_CONSTANTS.ADDRESS.PATTERN.test(address);
  }

  /**
   * Validates transaction hash
   */
  static validateTransactionHash(hash: string): boolean {
    if (!hash || typeof hash !== 'string') return false;
    return VALIDATION_CONSTANTS.TRANSACTION_HASH.PATTERN.test(hash);
  }

  /**
   * Validates UUID
   */
  static validateUUID(uuid: string): boolean {
    if (!uuid || typeof uuid !== 'string') return false;
    return VALIDATION_CONSTANTS.UUID.PATTERN.test(uuid);
  }

  /**
   * Validates Solidity version
   */
  static validateSolidityVersion(version: string): boolean {
    if (!version || typeof version !== 'string') return false;
    if (!VALIDATION_CONSTANTS.SOLIDITY_VERSION.PATTERN.test(version)) return false;
    return VALIDATION_CONSTANTS.SOLIDITY_VERSION.SUPPORTED_VERSIONS.includes(version as any);
  }

  /**
   * Validates Solidity code syntax (basic validation)
   */
  static validateSolidityCode(code: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!code || typeof code !== 'string') {
      errors.push('Code must be a non-empty string');
      return { isValid: false, errors };
    }

    if (code.length < VALIDATION_CONSTANTS.CODE.MIN_LENGTH) {
      errors.push(`Code must be at least ${VALIDATION_CONSTANTS.CODE.MIN_LENGTH} characters`);
    }

    if (code.length > VALIDATION_CONSTANTS.CODE.MAX_LENGTH) {
      errors.push(`Code must not exceed ${VALIDATION_CONSTANTS.CODE.MAX_LENGTH} characters`);
    }

    // Basic Solidity syntax checks
    if (!code.includes('pragma solidity')) {
      errors.push('Code must include pragma solidity directive');
    }

    if (!code.includes('contract ')) {
      errors.push('Code must contain at least one contract definition');
    }

    // Check for balanced braces
    const openBraces = (code.match(/{/g) || []).length;
    const closeBraces = (code.match(/}/g) || []).length;
    if (openBraces !== closeBraces) {
      errors.push('Unbalanced braces in code');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validates pagination parameters
   */
  static validatePagination(page?: number, limit?: number): { page: number; limit: number } {
    const validPage = Math.max(1, page || 1);
    const validLimit = Math.min(
      Math.max(1, limit || 10),
      100 // Max limit
    );

    return { page: validPage, limit: validLimit };
  }
}

// String Utilities
export class StringUtils {
  /**
   * Converts string to camelCase
   */
  static toCamelCase(str: string): string {
    return str
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
        return index === 0 ? word.toLowerCase() : word.toUpperCase();
      })
      .replace(/\s+/g, '');
  }

  /**
   * Converts string to PascalCase
   */
  static toPascalCase(str: string): string {
    return str
      .replace(/(?:^\w|[A-Z]|\b\w)/g, word => word.toUpperCase())
      .replace(/\s+/g, '');
  }

  /**
   * Converts string to kebab-case
   */
  static toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }

  /**
   * Converts string to snake_case
   */
  static toSnakeCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .replace(/[\s-]+/g, '_')
      .toLowerCase();
  }

  /**
   * Truncates string to specified length
   */
  static truncate(str: string, length: number, suffix = '...'): string {
    if (str.length <= length) return str;
    return str.substring(0, length - suffix.length) + suffix;
  }

  /**
   * Sanitizes string for safe usage
   */
  static sanitize(str: string): string {
    return str
      .replace(/[<>"'&]/g, '')
      .trim();
  }

  /**
   * Generates a random string
   */
  static generateRandomString(length: number, charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'): string {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return result;
  }

  /**
   * Checks if string is empty or whitespace
   */
  static isEmpty(str: string | null | undefined): boolean {
    return !str || str.trim().length === 0;
  }

  /**
   * Capitalizes first letter of string
   */
  static capitalize(str: string): string {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }
}

// Number Utilities
export class NumberUtils {
  /**
   * Formats number with commas
   */
  static formatWithCommas(num: number): string {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  /**
   * Rounds number to specified decimal places
   */
  static roundToDecimals(num: number, decimals: number): number {
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }

  /**
   * Converts wei to ether
   */
  static weiToEther(wei: string | number): string {
    const weiNum = typeof wei === 'string' ? BigInt(wei) : BigInt(Math.floor(wei));
    const etherValue = Number(weiNum) / Math.pow(10, 18);
    return etherValue.toFixed(18).replace(/\.?0+$/, '');
  }

  /**
   * Converts ether to wei
   */
  static etherToWei(ether: string | number): string {
    const etherNum = typeof ether === 'string' ? parseFloat(ether) : ether;
    return (etherNum * Math.pow(10, 18)).toString();
  }

  /**
   * Converts gwei to wei
   */
  static gweiToWei(gwei: number): string {
    return (gwei * Math.pow(10, 9)).toString();
  }

  /**
   * Converts wei to gwei
   */
  static weiToGwei(wei: string | number): number {
    const weiNum = typeof wei === 'string' ? parseInt(wei) : wei;
    return weiNum / Math.pow(10, 9);
  }

  /**
   * Calculates percentage
   */
  static calculatePercentage(value: number, total: number): number {
    if (total === 0) return 0;
    return (value / total) * 100;
  }

  /**
   * Calculates percentage change
   */
  static calculatePercentageChange(oldValue: number, newValue: number): number {
    if (oldValue === 0) return newValue > 0 ? 100 : 0;
    return ((newValue - oldValue) / oldValue) * 100;
  }

  /**
   * Calculates average of array of numbers
   */
  static calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const sum = numbers.reduce((acc, num) => acc + num, 0);
    return sum / numbers.length;
  }

  /**
   * Clamps number between min and max
   */
  static clamp(num: number, min: number, max: number): number {
    return Math.min(Math.max(num, min), max);
  }

  /**
   * Checks if number is in range
   */
  static isInRange(num: number, min: number, max: number): boolean {
    return num >= min && num <= max;
  }
}

// Date Utilities
export class DateUtils {
  /**
   * Formats date to ISO string
   */
  static toISOString(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toISOString();
  }

  /**
   * Gets date range for the last N days
   */
  static getLastNDays(days: number): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    return { startDate, endDate };
  }

  /**
   * Gets start and end of day
   */
  static getStartAndEndOfDay(date: Date): { startOfDay: Date; endOfDay: Date } {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return { startOfDay, endOfDay };
  }

  /**
   * Calculates duration between two dates
   */
  static calculateDuration(startDate: Date, endDate: Date): {
    milliseconds: number;
    seconds: number;
    minutes: number;
    hours: number;
    days: number;
  } {
    const milliseconds = endDate.getTime() - startDate.getTime();
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    return { milliseconds, seconds, minutes, hours, days };
  }

  /**
   * Formats duration in human readable format
   */
  static formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  /**
   * Checks if date is today
   */
  static isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  /**
   * Checks if date is within last N days
   */
  static isWithinLastNDays(date: Date, days: number): boolean {
    const { startDate } = this.getLastNDays(days);
    return date >= startDate;
  }
}

// Object Utilities
export class ObjectUtils {
  /**
   * Deep clones an object
   */
  static deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime()) as any;
    if (obj instanceof Array) return obj.map(item => this.deepClone(item)) as any;
    if (typeof obj === 'object') {
      const clonedObj = {} as any;
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          clonedObj[key] = this.deepClone(obj[key]);
        }
      }
      return clonedObj;
    }
    return obj;
  }

  /**
   * Picks specified keys from object
   */
  static pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
    const result = {} as Pick<T, K>;
    keys.forEach(key => {
      if (key in obj) {
        result[key] = obj[key];
      }
    });
    return result;
  }

  /**
   * Omits specified keys from object
   */
  static omit<T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
    const result = { ...obj } as any;
    keys.forEach(key => {
      delete result[key];
    });
    return result;
  }

  /**
   * Checks if object is empty
   */
  static isEmpty(obj: object): boolean {
    return Object.keys(obj).length === 0;
  }

  /**
   * Flattens nested object
   */
  static flatten(obj: any, prefix = ''): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const newKey = prefix ? `${prefix}.${key}` : key;
        
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
          Object.assign(result, this.flatten(obj[key], newKey));
        } else {
          result[newKey] = obj[key];
        }
      }
    }
    
    return result;
  }
}

// Array Utilities
export class ArrayUtils {
  /**
   * Removes duplicates from array
   */
  static unique<T>(array: T[]): T[] {
    return [...new Set(array)];
  }

  /**
   * Groups array by key
   */
  static groupBy<T>(array: T[], keyFn: (item: T) => string): Record<string, T[]> {
    return array.reduce((groups, item) => {
      const key = keyFn(item);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  }

  /**
   * Chunks array into smaller arrays
   */
  static chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Shuffles array
   */
  static shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Gets random item from array
   */
  static randomItem<T>(array: T[]): T | undefined {
    if (array.length === 0) return undefined;
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * Calculates average of numeric array
   */
  static average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  }

  /**
   * Finds median of numeric array
   */
  static median(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const sorted = [...numbers].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    
    if (sorted.length % 2 === 0) {
      return (sorted[middle - 1] + sorted[middle]) / 2;
    }
    return sorted[middle];
  }
}

// Export all utilities
export const Utils = {
  Validation: ValidationUtils,
  String: StringUtils,
  Number: NumberUtils,
  Date: DateUtils,
  Object: ObjectUtils,
  Array: ArrayUtils,
};