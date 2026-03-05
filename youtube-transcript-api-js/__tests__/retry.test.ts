import {
  RetryConfig,
  DEFAULT_RETRY_CONFIG,
  isRetryableError,
  calculateDelay,
  sleep,
} from '../retry';
import {
  RateLimitExceeded,
  NetworkError,
  TimeoutError,
  ConnectionError,
  RequestBlocked,
  AgeRestricted,
  TranscriptsDisabled,
  VideoUnavailable,
} from '../errors';

describe('retry utilities', () => {
  describe('isRetryableError', () => {
    it('should return true for RateLimitExceeded', () => {
      expect(isRetryableError(new RateLimitExceeded('vid', 60))).toBe(true);
    });

    it('should return true for NetworkError', () => {
      expect(isRetryableError(new NetworkError('fail'))).toBe(true);
    });

    it('should return true for TimeoutError', () => {
      expect(isRetryableError(new TimeoutError('http://url', 10000))).toBe(true);
    });

    it('should return true for ConnectionError', () => {
      expect(isRetryableError(new ConnectionError('http://url', 'ECONNREFUSED'))).toBe(true);
    });

    it('should return true for RequestBlocked', () => {
      expect(isRetryableError(new RequestBlocked('vid'))).toBe(true);
    });

    it('should return false for AgeRestricted', () => {
      expect(isRetryableError(new AgeRestricted('vid'))).toBe(false);
    });

    it('should return false for TranscriptsDisabled', () => {
      expect(isRetryableError(new TranscriptsDisabled('vid'))).toBe(false);
    });

    it('should return false for VideoUnavailable', () => {
      expect(isRetryableError(new VideoUnavailable('vid'))).toBe(false);
    });

    it('should return false for generic Error', () => {
      expect(isRetryableError(new Error('something'))).toBe(false);
    });

    it('should return false for non-error values', () => {
      expect(isRetryableError(null)).toBe(false);
      expect(isRetryableError('string')).toBe(false);
    });
  });

  describe('calculateDelay', () => {
    const config: RetryConfig = {
      maxRetries: 3,
      baseDelayMs: 1000,
      maxDelayMs: 30000,
      jitterFactor: 0,
    };

    it('should return baseDelayMs for attempt 0 (no jitter)', () => {
      expect(calculateDelay(0, config)).toBe(1000);
    });

    it('should double delay for each attempt', () => {
      expect(calculateDelay(1, config)).toBe(2000);
      expect(calculateDelay(2, config)).toBe(4000);
      expect(calculateDelay(3, config)).toBe(8000);
    });

    it('should cap at maxDelayMs', () => {
      expect(calculateDelay(10, config)).toBe(30000);
    });

    it('should respect retryAfterSeconds when provided', () => {
      expect(calculateDelay(0, config, 5)).toBe(5000);
    });

    it('should cap retryAfterSeconds at maxDelayMs', () => {
      expect(calculateDelay(0, config, 60)).toBe(30000);
    });

    it('should ignore retryAfterSeconds when 0 or negative', () => {
      expect(calculateDelay(0, config, 0)).toBe(1000);
      expect(calculateDelay(0, config, -1)).toBe(1000);
    });

    it('should apply jitter within expected range', () => {
      const jitterConfig: RetryConfig = { ...config, jitterFactor: 0.5 };
      const results = new Set<number>();

      for (let i = 0; i < 100; i++) {
        results.add(calculateDelay(0, jitterConfig));
      }

      // With jitterFactor=0.5, delay should be baseDelayMs +/- 50%
      for (const delay of results) {
        expect(delay).toBeGreaterThanOrEqual(500);
        expect(delay).toBeLessThanOrEqual(1500);
      }

      // Should produce multiple distinct values (randomness)
      expect(results.size).toBeGreaterThan(1);
    });
  });

  describe('DEFAULT_RETRY_CONFIG', () => {
    it('should have sensible defaults', () => {
      expect(DEFAULT_RETRY_CONFIG.maxRetries).toBe(3);
      expect(DEFAULT_RETRY_CONFIG.baseDelayMs).toBe(1000);
      expect(DEFAULT_RETRY_CONFIG.maxDelayMs).toBe(30000);
      expect(DEFAULT_RETRY_CONFIG.jitterFactor).toBe(0.5);
    });
  });

  describe('sleep', () => {
    it('should resolve after the specified delay', async () => {
      jest.useFakeTimers();
      let resolved = false;

      const promise = sleep(1000).then(() => { resolved = true; });
      expect(resolved).toBe(false);

      await jest.advanceTimersByTimeAsync(1000);
      await promise;
      expect(resolved).toBe(true);

      jest.useRealTimers();
    });
  });
});
