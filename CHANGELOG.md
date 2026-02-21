# youtube-transcript-api-js

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
