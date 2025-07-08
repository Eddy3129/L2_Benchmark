// API Constants
export const API_CONSTANTS = {
  PREFIX: 'api',
  VERSION: 'v1',
  TIMEOUT: 30000,
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
} as const;

// Pagination Constants
export const PAGINATION_CONSTANTS = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
  MIN_LIMIT: 1,
} as const;

// Gas Analysis Constants
export const GAS_ANALYSIS_CONSTANTS = {
  DEFAULT_GAS_LIMIT: 21000,
  MAX_GAS_LIMIT: 30000000,
  MIN_GAS_PRICE: 1, // 1 gwei
  MAX_GAS_PRICE: 1000, // 1000 gwei
  GAS_PRICE_MULTIPLIER: 1.1,
  DEPLOYMENT_GAS_BUFFER: 1.2,
  FUNCTION_GAS_BUFFER: 1.1,
  COMPLEXITY_MULTIPLIER: {
    LOW: 1.0,
    MEDIUM: 1.2,
    HIGH: 1.5,
    VERY_HIGH: 2.0,
  },
  BYTECODE_SIZE_THRESHOLDS: {
    SMALL: 1000,
    MEDIUM: 5000,
    LARGE: 15000,
    VERY_LARGE: 24576, // Contract size limit
  },
} as const;

// Blockchain Constants
export const BLOCKCHAIN_CONSTANTS = {
  BLOCK_TIME: {
    ETHEREUM: 12, // seconds
    ARBITRUM: 1,
    OPTIMISM: 2,
    POLYGON: 2,
    BASE: 2,
    ZKSYNC: 1,
  },
  FINALITY_BLOCKS: {
    ETHEREUM: 12,
    ARBITRUM: 1,
    OPTIMISM: 1,
    POLYGON: 256,
    BASE: 1,
    ZKSYNC: 1,
  },
  MAX_BLOCK_GAS_LIMIT: {
    ETHEREUM: 30000000,
    ARBITRUM: 32000000,
    OPTIMISM: 30000000,
    POLYGON: 30000000,
    BASE: 30000000,
    ZKSYNC: 30000000,
  },
} as const;

// Validation Constants
export const VALIDATION_CONSTANTS = {
  CONTRACT_NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 100,
    PATTERN: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
  },
  SOLIDITY_VERSION: {
    PATTERN: /^\d+\.\d+\.\d+$/,
    SUPPORTED_VERSIONS: ['0.8.0', '0.8.19', '0.8.20', '0.8.21', '0.8.22', '0.8.23', '0.8.24'],
  },
  ADDRESS: {
    PATTERN: /^0x[a-fA-F0-9]{40}$/,
  },
  TRANSACTION_HASH: {
    PATTERN: /^0x[a-fA-F0-9]{64}$/,
  },
  UUID: {
    PATTERN: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  },
  CODE: {
    MAX_LENGTH: 50000, // Maximum Solidity code length
    MIN_LENGTH: 10,
  },
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  VALIDATION: {
    INVALID_CONTRACT_NAME: 'Contract name must be a valid identifier',
    INVALID_SOLIDITY_VERSION: 'Unsupported Solidity version',
    INVALID_ADDRESS: 'Invalid Ethereum address format',
    INVALID_UUID: 'Invalid UUID format',
    INVALID_PAGINATION: 'Invalid pagination parameters',
    INVALID_NETWORK: 'Invalid or unsupported network',
    INVALID_CODE: 'Invalid Solidity code',
    CODE_TOO_LONG: 'Solidity code exceeds maximum length',
    CODE_TOO_SHORT: 'Solidity code is too short',
  },
  COMPILATION: {
    FAILED: 'Contract compilation failed',
    SYNTAX_ERROR: 'Syntax error in Solidity code',
    IMPORT_ERROR: 'Import resolution failed',
    VERSION_MISMATCH: 'Solidity version mismatch',
  },
  NETWORK: {
    CONNECTION_FAILED: 'Failed to connect to network',
    RPC_ERROR: 'RPC call failed',
    TIMEOUT: 'Network request timeout',
    RATE_LIMITED: 'Rate limit exceeded',
    INSUFFICIENT_FUNDS: 'Insufficient funds for gas estimation',
  },
  DATABASE: {
    CONNECTION_FAILED: 'Database connection failed',
    QUERY_FAILED: 'Database query failed',
    ENTITY_NOT_FOUND: 'Entity not found',
    DUPLICATE_ENTRY: 'Duplicate entry',
    CONSTRAINT_VIOLATION: 'Database constraint violation',
  },
  GAS_ANALYSIS: {
    ESTIMATION_FAILED: 'Gas estimation failed',
    INVALID_BYTECODE: 'Invalid contract bytecode',
    DEPLOYMENT_FAILED: 'Contract deployment simulation failed',
    FUNCTION_CALL_FAILED: 'Function call simulation failed',
  },
  BENCHMARK: {
    SESSION_NOT_FOUND: 'Benchmark session not found',
    INVALID_SESSION_STATE: 'Invalid benchmark session state',
    EXECUTION_FAILED: 'Benchmark execution failed',
  },
  COMPARISON: {
    REPORT_NOT_FOUND: 'Comparison report not found',
    GENERATION_FAILED: 'Comparison report generation failed',
    INVALID_NETWORKS: 'Invalid networks for comparison',
  },
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  GAS_ANALYSIS: {
    COMPLETED: 'Gas analysis completed successfully',
    SAVED: 'Gas analysis saved successfully',
  },
  BENCHMARK: {
    CREATED: 'Benchmark session created successfully',
    COMPLETED: 'Benchmark completed successfully',
    DELETED: 'Benchmark session deleted successfully',
  },
  COMPARISON: {
    GENERATED: 'Comparison report generated successfully',
    SAVED: 'Comparison report saved successfully',
    DELETED: 'Comparison report deleted successfully',
  },
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

// Cache Constants
export const CACHE_CONSTANTS = {
  TTL: {
    SHORT: 300, // 5 minutes
    MEDIUM: 1800, // 30 minutes
    LONG: 3600, // 1 hour
    VERY_LONG: 86400, // 24 hours
  },
  KEYS: {
    GAS_PRICE: 'gas_price',
    NETWORK_STATUS: 'network_status',
    CONTRACT_ANALYSIS: 'contract_analysis',
    COMPARISON_REPORT: 'comparison_report',
  },
} as const;

// Rate Limiting Constants
export const RATE_LIMIT_CONSTANTS = {
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  MAX_REQUESTS: 100, // per window
  SKIP_SUCCESSFUL_REQUESTS: false,
  SKIP_FAILED_REQUESTS: false,
} as const;

// File Upload Constants
export const FILE_UPLOAD_CONSTANTS = {
  MAX_SIZE: 1024 * 1024, // 1MB
  ALLOWED_EXTENSIONS: ['.sol', '.txt'],
  ALLOWED_MIME_TYPES: ['text/plain', 'application/octet-stream'],
} as const;

// Logging Constants
export const LOGGING_CONSTANTS = {
  LEVELS: {
    ERROR: 'error',
    WARN: 'warn',
    INFO: 'info',
    DEBUG: 'debug',
    VERBOSE: 'verbose',
  },
  CONTEXTS: {
    APP: 'Application',
    DATABASE: 'Database',
    NETWORK: 'Network',
    GAS_ANALYZER: 'GasAnalyzer',
    BENCHMARK: 'Benchmark',
    COMPARISON: 'Comparison',
    VALIDATION: 'Validation',
  },
} as const;

// Environment Constants
export const ENVIRONMENT_CONSTANTS = {
  DEVELOPMENT: 'development',
  PRODUCTION: 'production',
  TEST: 'test',
  STAGING: 'staging',
} as const;

// Security Constants
export const SECURITY_CONSTANTS = {
  BCRYPT_ROUNDS: 12,
  JWT_EXPIRY: '24h',
  CORS_ORIGINS: ['http://localhost:3000', 'http://localhost:3001'],
  HELMET_CONFIG: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  },
} as const;

// Export all constants as a single object for convenience
export const CONSTANTS = {
  API: API_CONSTANTS,
  PAGINATION: PAGINATION_CONSTANTS,
  GAS_ANALYSIS: GAS_ANALYSIS_CONSTANTS,
  BLOCKCHAIN: BLOCKCHAIN_CONSTANTS,
  VALIDATION: VALIDATION_CONSTANTS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  HTTP_STATUS,
  CACHE: CACHE_CONSTANTS,
  RATE_LIMIT: RATE_LIMIT_CONSTANTS,
  FILE_UPLOAD: FILE_UPLOAD_CONSTANTS,
  LOGGING: LOGGING_CONSTANTS,
  ENVIRONMENT: ENVIRONMENT_CONSTANTS,
  SECURITY: SECURITY_CONSTANTS,
} as const;

// Type exports for better TypeScript support
export type ApiConstants = typeof API_CONSTANTS;
export type PaginationConstants = typeof PAGINATION_CONSTANTS;
export type GasAnalysisConstants = typeof GAS_ANALYSIS_CONSTANTS;
export type BlockchainConstants = typeof BLOCKCHAIN_CONSTANTS;
export type ValidationConstants = typeof VALIDATION_CONSTANTS;
export type ErrorMessages = typeof ERROR_MESSAGES;
export type SuccessMessages = typeof SUCCESS_MESSAGES;
export type HttpStatus = typeof HTTP_STATUS;
export type CacheConstants = typeof CACHE_CONSTANTS;
export type RateLimitConstants = typeof RATE_LIMIT_CONSTANTS;
export type FileUploadConstants = typeof FILE_UPLOAD_CONSTANTS;
export type LoggingConstants = typeof LOGGING_CONSTANTS;
export type EnvironmentConstants = typeof ENVIRONMENT_CONSTANTS;
export type SecurityConstants = typeof SECURITY_CONSTANTS;
export type AllConstants = typeof CONSTANTS;