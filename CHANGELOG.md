# youtube-transcript-api-js

## 4.0.0

### Major Changes

- a667a8b: Harden request and parsing, and remove the non-functional Invidious feature.

  Security hardening: URL-encode the video ID before building the watch URL so a caller-supplied ID cannot inject query parameters, bound the HTML tag-stripping regexes so hostile caption text cannot trigger quadratic backtracking, and cap the HTTP client's response and request body size (10 MB) so a malicious or compromised upstream cannot stream an unbounded body into memory.

  Removal (breaking for TypeScript consumers referencing the removed names): `EnhancedYouTubeTranscriptApi` no longer accepts Invidious options. The `InvidiousOptions` type, the `setInvidiousOptions` method, and the constructor's second argument are gone. The Invidious client was constructed but never used to fetch anything, so no runtime behavior changes. Its unused internal HTTP client was removed too. Proxy support, formatter output, and `getVideoMetadata` are unchanged.

## 3.0.4

### Patch Changes

- aa60ab1: Remove the unused html-entities dependency. It was declared but never imported anywhere in source; HTML unescaping is hand-rolled in fetcher.ts
- 865bf36: Modernize the dev toolchain: upgrade eslint to 10.x (flat config), migrate to the unified typescript-eslint package (8.x), upgrade jest to 30.x with matching @types/jest, upgrade @types/node to 24.x, and override esbuild to 0.28.1. Fixes the remaining transitive CVEs (minimatch, ajv, esbuild) and the last Dependabot alerts from the security audit
- eb88453: Upgrade axios to 1.18.1 and fast-xml-parser to 5.9.3 to fix multiple CVEs (prototype pollution/MITM via config.proxy, credential leaks, ReDoS, XML injection)
- db9c8e0: Upgrade ts-jest to 29.4.11 and @changesets/cli to 2.31.0, and refresh transitive dev dependencies (handlebars, js-yaml, picomatch, minimatch, flatted, @babel/core, brace-expansion) to fix multiple CVEs, including a critical JS injection issue in handlebars

## 3.0.3

### Patch Changes

- 586da2b: Upgrade axios to 1.15.0 to fix CVE-2025-62718 (Confused Deputy, CVSS 9.3)

## 3.0.1

### Security

- Upgraded `axios` from ^1.6.0 to ^1.13.5 to address a security vulnerability

## 3.0.0

### Breaking Changes

- **`TranscriptParser.parse()` now throws `TranscriptParseError`** for non-transcript input instead of silently returning `[]`
- **`CouldNotRetrieveTranscript.message`** now returns the full error message (previously empty; only `toString()` worked)
- **Replaced `xml2js` with `fast-xml-parser`** — removes `xml2js` and `@types/xml2js` dependencies
- **Retry logic uses exponential backoff with jitter** instead of immediate recursive retry. Set `baseDelayMs: 0` to restore previous behavior
- **`EnhancedYouTubeTranscriptApi.fetch()` return type** narrowed from `Promise<any>` to `Promise<FetchedTranscript | string>`

### Added

- **Cookie authentication**: Load cookies from Netscape `.txt` or JSON files for age-restricted videos via `cookiePath` option or `--cookies` CLI flag
- **Retry with exponential backoff**: Configurable `RetryConfig` with `maxRetries`, `baseDelayMs`, `maxDelayMs`, `jitterFactor`
- **`YouTubeTranscriptApiOptions`**: Options object as 3rd constructor parameter (`retryConfig`, `cookiePath`)
- CLI flags: `--cookies`, `--verbose`, `--save`, `--batch-file`, `--fail-fast`
- Exported missing types: `InvalidProxyUrl`, `TranscriptParseError`, `RateLimitExceeded`, `NetworkError`, `TimeoutError`, `ConnectionError`, `RetryConfig`, `DEFAULT_RETRY_CONFIG`, `loadCookiesFromFile`, `ParsedCookie`, `FormatterOptions`, `CliOptions`

### Fixed

- Removed stray `console.log` debug output from CLI
- CLI `process.argv` fallback no longer captures option values as video IDs
- Consent cookie handling now appends to existing cookies instead of overwriting
- `AgeRestricted` error message now includes cookie auth instructions

## 2.2.0

### New Features

- **VideoMetadata threading**: Video metadata (`videoDetails`) from the Innertube API response is now threaded through `TranscriptList`, `Transcript`, and `FetchedTranscript` via an optional `metadata` field.
- **`getVideoMetadata()` returns real data**: `EnhancedYouTubeTranscriptApi.getVideoMetadata()` returns actual video metadata from the Innertube API instead of hardcoded stub values.
- **`TimestampedTextFormatter`**: New LLM-friendly formatter producing `[M:SS] text` output with optional `groupBySeconds` bucketing. Use via `FormatterLoader.load('timestamped')`.
- **`VideoMetadataResult` export**: Explicit interface for the return type of `getVideoMetadata()`.

### Bug Fixes

- **Proxy config wired to base API**: `EnhancedYouTubeTranscriptApi` proxy options are now correctly passed to the underlying `YouTubeTranscriptApi` via `EnhancedProxyConfig`. Previously silently ignored.
- **ESM-compatible imports**: Replaced `require('http')` / `require('https')` with ESM imports to prevent bundler breakage.
- **`getVideoMetadata()` throws `YouTubeTranscriptApiException`** instead of bare `Error` for correct `instanceof` handling.

## 2.0.2

### Patch Changes

- 1851e58: update workflow and bump version

## 2.0.1

### Patch Changes

- Updated publish workflow and release script

## 2.0.0

### Major Changes

- Renamed package from `@rajat-mehra/youtube-transcript-api-js` to `youtube-transcript-api-js`

**Migration:** Update your imports and package.json dependency:

```bash
npm uninstall @rajat-mehra/youtube-transcript-api-js
npm install youtube-transcript-api-js
```

Then update all imports:

```typescript
// Before
import { YouTubeTranscriptApi } from '@rajat-mehra/youtube-transcript-api-js';

// After
import { YouTubeTranscriptApi } from 'youtube-transcript-api-js';
```

## 1.2.0

### Minor Changes

- 3fd0083: update readme with correct usage

## 1.1.0

### Minor Changes

- aa05bd5: bumpo package version and add changeset config
