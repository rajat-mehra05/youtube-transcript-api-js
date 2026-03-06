import { AxiosError } from 'axios';
import {
  RateLimitExceeded,
  NetworkError,
  TimeoutError,
  ConnectionError
} from '../errors';

/**
 * Parses the Retry-After header value which can be either seconds or an HTTP-date
 */
export function parseRetryAfter(retryAfter: string | undefined): number | undefined {
  if (!retryAfter) {
    return undefined;
  }

  // First, try parsing as an integer (seconds)
  const seconds = parseInt(retryAfter, 10);
  if (!isNaN(seconds)) {
    return seconds;
  }

  // Try parsing as an HTTP-date
  const dateMs = Date.parse(retryAfter);
  if (!isNaN(dateMs)) {
    const secondsUntil = Math.ceil((dateMs - Date.now()) / 1000);
    return secondsUntil > 0 ? secondsUntil : undefined;
  }

  return undefined;
}

/**
 * Wraps axios errors with contextual error classes
 */
export function wrapNetworkError(error: unknown, url: string, videoId: string): never {
  if (error instanceof AxiosError) {
    // Handle HTTP status codes
    if (error.response) {
      const status = error.response.status;

      if (status === 429) {
        const retryAfter = error.response.headers['retry-after'];
        const retryAfterSeconds = parseRetryAfter(retryAfter);
        throw new RateLimitExceeded(videoId, retryAfterSeconds);
      }
    }

    // Handle network-level errors
    if (error.code) {
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        const timeout = error.config?.timeout || 0;
        throw new TimeoutError(url, timeout);
      }

      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ENETUNREACH') {
        throw new ConnectionError(url, error.code);
      }

      throw new NetworkError(`Request to ${url} failed: ${error.message}`, error.code);
    }

    // Generic axios error
    throw new NetworkError(`Request to ${url} failed: ${error.message}`);
  }

  // Re-throw non-axios errors
  throw error;
}
