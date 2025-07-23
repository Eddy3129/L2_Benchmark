import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsInt, Min, Max, IsString, IsUUID, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { PAGINATION_CONSTANTS, VALIDATION_CONSTANTS } from '../constants';

// Base Response DTO
export class BaseResponseDto {
  @ApiProperty({ description: 'Success status' })
  success: boolean;

  @ApiProperty({ description: 'Response message' })
  message: string;

  @ApiPropertyOptional({ description: 'Response timestamp' })
  timestamp?: string;

  @ApiPropertyOptional({ description: 'Request ID for tracking' })
  requestId?: string;

  constructor(success: boolean, message: string, requestId?: string) {
    this.success = success;
    this.message = message;
    this.timestamp = new Date().toISOString();
    this.requestId = requestId;
  }
}

// Generic Success Response
export class SuccessResponseDto<T = any> extends BaseResponseDto {
  @ApiProperty({ description: 'Response data' })
  data: T;

  constructor(data: T, message: string = 'Success', requestId?: string) {
    super(true, message, requestId);
    this.data = data;
  }
}

// Error Response DTO
export class ErrorResponseDto extends BaseResponseDto {
  @ApiProperty({ description: 'Error code' })
  errorCode: string;

  @ApiPropertyOptional({ description: 'Error details' })
  details?: any;

  @ApiPropertyOptional({ description: 'Validation errors' })
  validationErrors?: ValidationErrorDto[];

  constructor(
    message: string,
    errorCode: string,
    details?: any,
    validationErrors?: ValidationErrorDto[],
    requestId?: string
  ) {
    super(false, message, requestId);
    this.errorCode = errorCode;
    this.details = details;
    this.validationErrors = validationErrors;
  }
}

// Validation Error DTO
export class ValidationErrorDto {
  @ApiProperty({ description: 'Field name' })
  field: string;

  @ApiProperty({ description: 'Error message' })
  message: string;

  @ApiPropertyOptional({ description: 'Rejected value' })
  rejectedValue?: any;

  constructor(field: string, message: string, rejectedValue?: any) {
    this.field = field;
    this.message = message;
    this.rejectedValue = rejectedValue;
  }
}

// Pagination Query DTO
export class PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Page number',
    minimum: 1,
    default: PAGINATION_CONSTANTS.DEFAULT_PAGE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = PAGINATION_CONSTANTS.DEFAULT_PAGE;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    minimum: PAGINATION_CONSTANTS.MIN_LIMIT,
    maximum: PAGINATION_CONSTANTS.MAX_LIMIT,
    default: PAGINATION_CONSTANTS.DEFAULT_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(PAGINATION_CONSTANTS.MIN_LIMIT)
  @Max(PAGINATION_CONSTANTS.MAX_LIMIT)
  limit?: number = PAGINATION_CONSTANTS.DEFAULT_LIMIT;

  @ApiPropertyOptional({ description: 'Sort field' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

// Pagination Metadata DTO
export class PaginationMetaDto {
  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Number of items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of items' })
  totalItems: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;

  @ApiProperty({ description: 'Whether there is a next page' })
  hasNextPage: boolean;

  @ApiProperty({ description: 'Whether there is a previous page' })
  hasPreviousPage: boolean;

  constructor(page: number, limit: number, totalItems: number) {
    this.page = page;
    this.limit = limit;
    this.totalItems = totalItems;
    this.totalPages = Math.ceil(totalItems / limit);
    this.hasNextPage = page < this.totalPages;
    this.hasPreviousPage = page > 1;
  }
}

// Paginated Response DTO
export class PaginatedResponseDto<T> extends SuccessResponseDto<T[]> {
  @ApiProperty({ description: 'Pagination metadata' })
  meta: PaginationMetaDto;

  constructor(
    data: T[],
    meta: PaginationMetaDto,
    message: string = 'Data retrieved successfully',
    requestId?: string
  ) {
    super(data, message, requestId);
    this.meta = meta;
  }
}

// ID Parameter DTO
export class IdParamDto {
  @ApiProperty({ description: 'Entity ID', format: 'uuid' })
  @IsUUID(4, { message: VALIDATION_CONSTANTS.UUID.PATTERN.toString() })
  id: string;
}

// Search Query DTO
export class SearchQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Search term' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Search fields to include' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  searchFields?: string[];
}

// Date Range Query DTO
export class DateRangeQueryDto {
  @ApiPropertyOptional({ description: 'Start date', type: 'string', format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  startDate?: Date;

  @ApiPropertyOptional({ description: 'End date', type: 'string', format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  endDate?: Date;
}

// Filter Query DTO
export class FilterQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter criteria' })
  @IsOptional()
  filters?: Record<string, any>;
}

// Bulk Operation DTO
export class BulkOperationDto {
  @ApiProperty({ description: 'Array of IDs to operate on' })
  @IsArray()
  @IsUUID(4, { each: true })
  ids: string[];
}

// Health Check Response DTO
export class HealthCheckDto {
  @ApiProperty({ description: 'Service status' })
  status: 'ok' | 'error';

  @ApiProperty({ description: 'Service information' })
  info: Record<string, any>;

  @ApiPropertyOptional({ description: 'Error information' })
  error?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Detailed information' })
  details?: Record<string, any>;
}

// Statistics DTO
export class StatisticsDto {
  @ApiProperty({ description: 'Total count' })
  total: number;

  @ApiProperty({ description: 'Count by period' })
  byPeriod: Record<string, number>;

  @ApiProperty({ description: 'Growth percentage' })
  growth: number;

  @ApiProperty({ description: 'Last updated timestamp' })
  lastUpdated: string;

  constructor(total: number, byPeriod: Record<string, number>, growth: number) {
    this.total = total;
    this.byPeriod = byPeriod;
    this.growth = growth;
    this.lastUpdated = new Date().toISOString();
  }
}