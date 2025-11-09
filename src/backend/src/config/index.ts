import dotenv from 'dotenv';

dotenv.config();

export const config = {
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    env: process.env.NODE_ENV || 'development',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  postgres: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB || 'order_execution',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
  },
  mock: {
    enabled: process.env.MOCK_MODE === 'true',
    raydiumSuccessRate: parseFloat(process.env.RAYDIUM_SUCCESS_RATE || '0.95'),
    meteoraSuccessRate: parseFloat(process.env.METEORA_SUCCESS_RATE || '0.95'),
    processingTimeMs: parseInt(process.env.MOCK_PROCESSING_TIME_MS || '2000', 10),
  },
  queue: {
    maxConcurrent: parseInt(process.env.MAX_CONCURRENT_ORDERS || '10', 10),
    maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
    retryBackoffMs: parseInt(process.env.RETRY_BACKOFF_MS || '1000', 10),
  },
};
