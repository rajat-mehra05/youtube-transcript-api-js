import { AxiosError } from 'axios';
import { parseRetryAfter, wrapNetworkError } from '../transcripts/network-errors';
import {
  RateLimitExceeded,
  NetworkError,
  TimeoutError,
  ConnectionError
} from '../errors';

describe('parseRetryAfter', () => {
  it('should return undefined for undefined input', () => {
    expect(parseRetryAfter(undefined)).toBeUndefined();
  });

  it('should return undefined for empty string', () => {
    expect(parseRetryAfter('')).toBeUndefined();
  });

  it('should parse integer seconds', () => {
    expect(parseRetryAfter('60')).toBe(60);
  });

  it('should parse zero seconds', () => {
    expect(parseRetryAfter('0')).toBe(0);
  });

  it('should parse HTTP-date in the future', () => {
    const futureDate = new Date(Date.now() + 120_000).toUTCString();
    const result = parseRetryAfter(futureDate)!;
    // Should be roughly 120 seconds (allow some variance)
    expect(result).toBeGreaterThanOrEqual(118);
    expect(result).toBeLessThanOrEqual(121);
  });

  it('should return undefined for HTTP-date in the past', () => {
    const pastDate = new Date(Date.now() - 60_000).toUTCString();
    expect(parseRetryAfter(pastDate)).toBeUndefined();
  });

  it('should return undefined for completely invalid value', () => {
    expect(parseRetryAfter('not-a-number-or-date')).toBeUndefined();
  });
});

describe('wrapNetworkError', () => {
  const testUrl = 'https://www.youtube.com/watch?v=test123';
  const testVideoId = 'test123';

  it('should throw RateLimitExceeded on 429 response', () => {
    const error = new AxiosError('Rate limited', 'ERR_BAD_REQUEST');
    (error as any).response = {
      status: 429,
      headers: { 'retry-after': '60' }
    };

    expect(() => wrapNetworkError(error, testUrl, testVideoId)).toThrow(RateLimitExceeded);
  });

  it('should include retryAfter seconds from 429 header', () => {
    const error = new AxiosError('Rate limited', 'ERR_BAD_REQUEST');
    (error as any).response = {
      status: 429,
      headers: { 'retry-after': '120' }
    };

    try {
      wrapNetworkError(error, testUrl, testVideoId);
    } catch (e) {
      expect(e).toBeInstanceOf(RateLimitExceeded);
      expect((e as RateLimitExceeded).retryAfter).toBe(120);
    }
  });

  it('should throw TimeoutError on ECONNABORTED', () => {
    const error = new AxiosError('Timeout', 'ECONNABORTED');
    error.code = 'ECONNABORTED';
    (error as any).config = { timeout: 10000 };

    expect(() => wrapNetworkError(error, testUrl, testVideoId)).toThrow(TimeoutError);
  });

  it('should throw TimeoutError on ETIMEDOUT', () => {
    const error = new AxiosError('Timeout', 'ETIMEDOUT');
    error.code = 'ETIMEDOUT';
    (error as any).config = { timeout: 5000 };

    expect(() => wrapNetworkError(error, testUrl, testVideoId)).toThrow(TimeoutError);
  });

  it('should throw ConnectionError on ECONNREFUSED', () => {
    const error = new AxiosError('Connection refused', 'ECONNREFUSED');
    error.code = 'ECONNREFUSED';

    expect(() => wrapNetworkError(error, testUrl, testVideoId)).toThrow(ConnectionError);
  });

  it('should throw ConnectionError on ENOTFOUND', () => {
    const error = new AxiosError('Not found', 'ENOTFOUND');
    error.code = 'ENOTFOUND';

    expect(() => wrapNetworkError(error, testUrl, testVideoId)).toThrow(ConnectionError);
  });

  it('should throw ConnectionError on ENETUNREACH', () => {
    const error = new AxiosError('Network unreachable', 'ENETUNREACH');
    error.code = 'ENETUNREACH';

    expect(() => wrapNetworkError(error, testUrl, testVideoId)).toThrow(ConnectionError);
  });

  it('should throw NetworkError for other axios errors with code', () => {
    const error = new AxiosError('Unknown error', 'UNKNOWN_CODE');
    error.code = 'UNKNOWN_CODE';

    expect(() => wrapNetworkError(error, testUrl, testVideoId)).toThrow(NetworkError);
  });

  it('should throw NetworkError for axios errors without code', () => {
    const error = new AxiosError('Generic error');

    expect(() => wrapNetworkError(error, testUrl, testVideoId)).toThrow(NetworkError);
  });

  it('should re-throw non-axios errors as-is', () => {
    const error = new Error('Custom error');

    expect(() => wrapNetworkError(error, testUrl, testVideoId)).toThrow('Custom error');
  });
});
