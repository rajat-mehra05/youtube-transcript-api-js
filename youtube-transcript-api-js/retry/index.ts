import { RateLimitExceeded, NetworkError, RequestBlocked } from '../errors';

/**
 * Configuration for retry behavior with exponential backoff
 */
export interface RetryConfig {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries: number;
  /** Base delay in milliseconds before first retry (default: 1000) */
  baseDelayMs: number;
  /** Maximum delay in milliseconds between retries (default: 30000) */
  maxDelayMs: number;
  /** Jitter factor 0-1 to randomize delays and avoid thundering herd (default: 0.5) */
  jitterFactor: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  jitterFactor: 0.5,
};

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  return (
    error instanceof RateLimitExceeded ||
    error instanceof NetworkError || // also catches TimeoutError, ConnectionError (subclasses)
    error instanceof RequestBlocked
  );
}

/**
 * Calculate delay for a given retry attempt using exponential backoff with jitter.
 * If retryAfterSeconds is provided (from Retry-After header), it takes precedence.
 */
export function calculateDelay(
  attempt: number,
  config: RetryConfig,
  retryAfterSeconds?: number
): number {
  if (retryAfterSeconds !== undefined && retryAfterSeconds > 0) {
    return Math.min(retryAfterSeconds * 1000, config.maxDelayMs);
  }

  const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt);
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);
  const jitter = cappedDelay * config.jitterFactor * (Math.random() * 2 - 1);
  return Math.min(Math.max(0, Math.floor(cappedDelay + jitter)), config.maxDelayMs);
}

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
