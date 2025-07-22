# Configuration Management

This directory contains configuration utilities that provide a `dotenv`-like experience for managing environment variables in the Next.js frontend application.

## Files Overview

- **`config.ts`** - Main configuration class with environment variable management
- **`abiService.ts`** - ABI fetching service that uses the configuration system
- **`env.example.ts`** - Example usage patterns and initialization code

## Usage (Similar to `require('dotenv')`)

### Basic Usage

```typescript
import { Config } from './lib/config';

// Get environment variables with fallbacks
const apiKey = Config.etherscanApiKey; // Uses NEXT_PUBLIC_ETHERSCAN_API_KEY
const isDev = Config.isDevelopment;
const timeout = Config.apiTimeout;
```

### Environment Variable Access

```typescript
// String with fallback
const appName = Config.getEnv('NEXT_PUBLIC_APP_NAME', 'Default App');

// Boolean conversion
const enableFeature = Config.getBooleanEnv('NEXT_PUBLIC_ENABLE_FEATURE', false);

// Number conversion
const maxRetries = Config.getNumberEnv('NEXT_PUBLIC_MAX_RETRIES', 3);

// Required variable (throws if missing)
const requiredUrl = Config.getRequiredEnv('NEXT_PUBLIC_API_URL');
```

### Application Initialization

```typescript
import { Config } from './lib/config';

// Validate configuration on startup
function initApp() {
  const validation = Config.validate();
  
  if (!validation.isValid) {
    console.warn('Configuration issues:', validation.errors);
  }
  
  // Log config summary in development
  if (Config.isDevelopment) {
    console.log('Config:', Config.getSummary());
  }
}
```

## Environment Variables

Create a `.env.local` file in the frontend directory:

```bash
# API Keys
NEXT_PUBLIC_ETHERSCAN_API_KEY=your_api_key_here
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_key

# Application Settings
NEXT_PUBLIC_DEBUG_LOGS=true
NEXT_PUBLIC_API_TIMEOUT=30000
NEXT_PUBLIC_APP_NAME=My DApp

# Feature Flags
NEXT_PUBLIC_ENABLE_NEW_UI=false
NEXT_PUBLIC_ENABLE_BETA=true
NEXT_PUBLIC_ENABLE_METRICS=false
```

## Supported Chains

The configuration includes support for multiple testnets:

- **Sepolia** (Chain ID: 11155111)
- **Arbitrum Sepolia** (Chain ID: 421614)
- **Optimism Sepolia** (Chain ID: 11155420)
- **Base Sepolia** (Chain ID: 84532)
- **Polygon Amoy** (Chain ID: 80002)
- **Polygon zkEVM** (Chain ID: 1442)
- **zkSync Era Sepolia** (Chain ID: 300)

## ABI Service Integration

The `abiService.ts` demonstrates how to use the configuration system:

```typescript
import { Config } from './config';

// Use configuration in your services
const apiKey = Config.etherscanApiKey;
const timeout = Config.apiTimeout;
const enableLogs = Config.enableDebugLogs;
```

## Benefits Over Direct `process.env` Access

1. **Type Safety** - Proper TypeScript types for all config values
2. **Validation** - Built-in validation for required variables
3. **Fallbacks** - Sensible defaults for optional variables
4. **Type Conversion** - Automatic conversion to boolean/number types
5. **Centralized** - All configuration logic in one place
6. **Environment Awareness** - Built-in development/production detection
7. **Debugging** - Configuration summary and validation reporting

## Migration from Direct `process.env`

**Before:**
```typescript
const apiKey = process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY || 'default';
const isDev = process.env.NODE_ENV === 'development';
```

**After:**
```typescript
import { Config } from './lib/config';

const apiKey = Config.etherscanApiKey;
const isDev = Config.isDevelopment;
```

## Error Handling

The configuration system provides comprehensive error handling:

```typescript
// Validation on startup
const { isValid, errors } = Config.validate();
if (!isValid) {
  errors.forEach(error => console.error(error));
}

// Required variables throw descriptive errors
try {
  const required = Config.getRequiredEnv('MISSING_VAR');
} catch (error) {
  console.error(error.message); // "Required environment variable MISSING_VAR is not set"
}
```

This approach provides a clean, type-safe, and maintainable way to manage environment variables, similar to how `require('dotenv')` works in Node.js applications.