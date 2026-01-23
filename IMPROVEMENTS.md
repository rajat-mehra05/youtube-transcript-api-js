# YouTube Transcript API - Code Improvements & Fixes

This document lists all identified issues and improvements for the youtube-transcript-api-js library.

---

## Medium Severity Issues

### 1. No Rate Limiting (429) Handling
**File:** `youtube-transcript-api-js/transcripts/fetcher.ts`

**Problem:** No specific handling for HTTP 429 status codes.

**Fix:** Add `RateLimitExceeded` error class and axios interceptor:
```typescript
export class RateLimitExceeded extends CouldNotRetrieveTranscript {
  constructor(videoId: string, public readonly retryAfter?: number) {
    super(videoId);
    this.name = 'RateLimitExceeded';
  }
}
```

---

### 2. Network Errors Not Contextually Wrapped
**File:** `youtube-transcript-api-js/transcripts/fetcher.ts`

**Problem:** HTTP errors from axios propagate without video context or helpful messaging.

**Fix:** Create network error classes:
```typescript
export class NetworkError extends YouTubeTranscriptApiException { ... }
export class TimeoutError extends NetworkError { ... }
export class ConnectionError extends NetworkError { ... }
```

---

## Test Coverage Issues

### Current State: ~7% Coverage

| Component | Tests | Status |
|-----------|-------|--------|
| Error classes | 1/14 tested | Needs work |
| Parser | 0 tests | Missing |
| CLI | 0 tests | Missing |
| Proxy configs | 0 tests | Missing |
| Integration tests | 0 tests | Missing |

### 3. Add HTTP Mocking Infrastructure
**Required:** Add `axios-mock-adapter` to devDependencies

```bash
npm install --save-dev axios-mock-adapter
```

### 4. Missing Test Files to Create

- `__tests__/errors.test.ts` - Test all 14 error classes
- `__tests__/parser.test.ts` - Test XML parsing edge cases
- `__tests__/cli.test.ts` - Test CLI commands and options
- `__tests__/proxies.test.ts` - Test proxy configurations
- `__tests__/integration.test.ts` - End-to-end tests with mocked HTTP
- `__tests__/fixtures/youtube-responses.ts` - Mock response data

---

## New Error Classes to Add

Add to `youtube-transcript-api-js/errors/index.ts`:

```typescript
export class RateLimitExceeded extends CouldNotRetrieveTranscript {
  constructor(videoId: string, public readonly retryAfter?: number) {
    super(videoId);
    this.name = 'RateLimitExceeded';
  }
}

export class NetworkError extends YouTubeTranscriptApiException {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends NetworkError {
  constructor(url: string, timeoutMs: number) {
    super(`Request to ${url} timed out after ${timeoutMs}ms`, 'ETIMEDOUT');
    this.name = 'TimeoutError';
  }
}

export class ConnectionError extends NetworkError {
  constructor(url: string, code: string) {
    super(`Failed to connect to ${url}: ${code}`, code);
    this.name = 'ConnectionError';
  }
}
```

---

## Missing Edge Case Handling

| Edge Case | Current Behavior | Expected Behavior |
|-----------|------------------|-------------------|
| Empty language array | May cause issues | Use default `['en']` or throw |
| HTTP 429 (rate limit) | Generic error | Throw `RateLimitExceeded` |
| Connection timeout | Generic error | Throw `TimeoutError` |
| Empty transcript (0 snippets) | Unknown | Handle gracefully |

---

## Implementation Priority

### Phase 1: Critical Fixes (Do First)
- [x] Fix silent error swallowing in proxy config
- [x] Fix string errors in models.ts
- [x] Add unhandled rejection handler in CLI
- [x] Fix silent exit on conflicting CLI options
- [x] Fix global side effect on import (unhandledRejection handler)
- [x] Remove CLI exports from library entry point

### Phase 2: Validation & Error Context
- [x] Add video ID validation
- [x] Create TranscriptParseError class
- [ ] Add rate limiting detection
- [ ] Wrap network errors with context

### Phase 3: Test Coverage
- [ ] Add axios-mock-adapter dependency
- [ ] Create test fixtures
- [ ] Write error class tests
- [ ] Write parser tests
- [ ] Write CLI tests
- [ ] Write integration tests

### Phase 4: Documentation
- [ ] Add JSDoc to public APIs
- [ ] Update README with error handling examples

---

## Verification Commands

```bash
# Run existing tests
npm test

# Run tests with coverage
npm test -- --coverage

# Type check
npx tsc --noEmit

# Lint
npm run lint
```
