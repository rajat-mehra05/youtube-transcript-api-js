---
'youtube-transcript-api-js': minor
---

### New Features

- **VideoMetadata threading**: Video metadata (`videoDetails`) from the Innertube API response is now threaded through `TranscriptList`, `Transcript`, and `FetchedTranscript` via an optional `metadata` field. Access it via `transcriptList.metadata`, `transcript.metadata`, or `fetchedTranscript.metadata`.
- **`getVideoMetadata()` now returns real data**: `EnhancedYouTubeTranscriptApi.getVideoMetadata()` returns actual video metadata from the Innertube API instead of hardcoded stub values.
- **`TimestampedTextFormatter`**: New LLM-friendly formatter that produces `[M:SS] text` output. Supports `groupBySeconds` option to bucket snippets into time windows. Register via `FormatterLoader.load('timestamped')`.
- **`VideoMetadataResult` export**: Explicit interface for the return type of `getVideoMetadata()`.

### Bug Fixes

- **Proxy config now wired to base API**: `EnhancedYouTubeTranscriptApi` proxy options are now correctly passed to the underlying `YouTubeTranscriptApi` instance via `EnhancedProxyConfig`. Previously, proxy settings were silently ignored for transcript fetching.
- **ESM-compatible imports**: Replaced `require('http')` / `require('https')` with `import http from 'node:http'` / `import https from 'node:https'` to prevent bundler breakage.
- **`getVideoMetadata()` throws `YouTubeTranscriptApiException`** instead of bare `Error`, so consumers using `instanceof` checks catch it correctly.
