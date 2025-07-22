// Simple environment variable access (like require('dotenv'))
// This provides direct access to process.env with fallbacks

export const env = {
  // API Keys
  ETHERSCAN_API_KEY: process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY || '',
  ALCHEMY_API_KEY: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || '',
  
  // Backend Configuration
  BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001',
  
  // Application Settings
  NODE_ENV: process.env.NODE_ENV || 'development',
  DEBUG_LOGS: process.env.NEXT_PUBLIC_DEBUG_LOGS === 'true',
  API_TIMEOUT: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '30000', 10),
  APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'DApp',
  MAX_RETRIES: parseInt(process.env.NEXT_PUBLIC_MAX_RETRIES || '3', 10),
  
  // Helper getters
  get isDevelopment() {
    return this.NODE_ENV === 'development';
  },
  
  get isProduction() {
    return this.NODE_ENV === 'production';
  }
};