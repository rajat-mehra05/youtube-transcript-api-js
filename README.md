# YouTube Transcript API

A lightweight JavaScript/TypeScript library for retrieving transcripts and subtitles from YouTube videos. Supports manual and auto-generated captions, multiple languages, translation, and various output formats — no API keys or browser automation required.

**Common use cases:** content analysis, accessibility tools, search indexing, language learning apps, video summarization, subtitle generation, and AI/NLP training data collection.

## Installation

```bash
npm install youtube-transcript-api-js
```

Or with yarn:

```bash
yarn add youtube-transcript-api-js
```

## Quick Start

```typescript
import { YouTubeTranscriptApi } from 'youtube-transcript-api-js';

const api = new YouTubeTranscriptApi();

// Fetch transcript for a video
const transcript = await api.fetch('dQw4w9WgXcQ');

console.log(transcript.snippets);
// Output: [{ text: '...', start: 0.0, duration: 1.5 }, ...]
```

## API Reference

### YouTubeTranscriptApi

The main class for fetching transcripts.

```typescript
import { YouTubeTranscriptApi } from 'youtube-transcript-api-js';

const api = new YouTubeTranscriptApi();
```

#### `fetch(videoId, languages?, preserveFormatting?)`

Fetches the transcript for a video.

```typescript
// Fetch with default language (English)
const transcript = await api.fetch('VIDEO_ID');

// Fetch with specific languages (priority order)
const transcript = await api.fetch('VIDEO_ID', ['de', 'en']);

// Preserve formatting (keeps HTML tags like <i>, <b>)
const transcript = await api.fetch('VIDEO_ID', ['en'], true);
```

**Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `videoId` | `string` | — | The YouTube video ID |
| `languages` | `string[]` | `['en']` | Language codes in priority order |
| `preserveFormatting` | `boolean` | `false` | Keep HTML formatting tags |

**Returns:** `Promise<FetchedTranscript>`

#### `list(videoId)`

Lists all available transcripts for a video.

```typescript
const transcriptList = await api.list('VIDEO_ID');

// Find a specific transcript
const transcript = transcriptList.findTranscript(['en', 'de']);

// Get only auto-generated transcripts
const generated = transcriptList.findGeneratedTranscript(['en']);

// Get only manually created transcripts
const manual = transcriptList.findManuallyCreatedTranscript(['en']);

// Iterate over all transcripts
for (const transcript of transcriptList) {
  console.log(`${transcript.languageCode}: ${transcript.language}`);
}
```

#### Translating Transcripts

```typescript
const transcriptList = await api.list('VIDEO_ID');
const transcript = transcriptList.findTranscript(['en']);

if (transcript.isTranslatable) {
  const translated = transcript.translate('de');
  const fetched = await translated.fetch();
  console.log(fetched.snippets);
}
```

### Data Types

```typescript
interface FetchedTranscript {
  snippets: FetchedTranscriptSnippet[];
  videoId: string;
  language: string;
  languageCode: string;
  isGenerated: boolean;
  toRawData(): Array<{ text: string; start: number; duration: number }>;
}

interface FetchedTranscriptSnippet {
  text: string;
  start: number;
  duration: number;
}
```

## CLI Usage

### Basic Commands

```bash
# Fetch transcript for a video
youtube-transcript-api VIDEO_ID

# Fetch transcripts for multiple videos
youtube-transcript-api VIDEO_ID1 VIDEO_ID2 VIDEO_ID3

# List available transcripts
youtube-transcript-api VIDEO_ID --list-transcripts
```

### Options

| Option | Description | Example |
|--------|-------------|---------|
| `--list-transcripts` | List available transcript languages | `--list-transcripts` |
| `--languages <codes...>` | Language codes in priority order | `--languages de en` |
| `--translate <code>` | Translate to specified language | `--translate es` |
| `--format <format>` | Output format: `json`, `pretty`, `text`, `srt`, `webvtt`, `timestamped` | `--format srt` |
| `--exclude-generated` | Exclude auto-generated transcripts | `--exclude-generated` |
| `--exclude-manually-created` | Exclude manually created transcripts | `--exclude-manually-created` |
| `--cookies <file>` | Cookie file (Netscape/JSON) for authentication | `--cookies cookies.txt` |
| `--verbose` | Print debug information to stderr | `--verbose` |
| `--save <file>` | Write output to a file instead of stdout | `--save output.txt` |
| `--batch-file <file>` | Read video IDs from a file (one per line) | `--batch-file ids.txt` |
| `--fail-fast` | Stop on the first error | `--fail-fast` |
| `--http-proxy <url>` | Use HTTP proxy | `--http-proxy http://proxy:8080` |
| `--https-proxy <url>` | Use HTTPS proxy | `--https-proxy http://proxy:8080` |
| `--webshare-proxy-username <user>` | Webshare proxy username | `--webshare-proxy-username myuser` |
| `--webshare-proxy-password <pass>` | Webshare proxy password | `--webshare-proxy-password mypass` |

### Examples

```bash
# Get German transcript, fallback to English
youtube-transcript-api dQw4w9WgXcQ --languages de en

# Export as SRT subtitle file
youtube-transcript-api dQw4w9WgXcQ --format srt > subtitles.srt

# Translate English transcript to Spanish
youtube-transcript-api dQw4w9WgXcQ --languages en --translate es

# Use proxy for requests
youtube-transcript-api dQw4w9WgXcQ --http-proxy http://user:pass@proxy.com:8080

# Get only manually created transcripts in JSON
youtube-transcript-api dQw4w9WgXcQ --exclude-generated --format json

# Batch process videos from a file, save output, stop on error
youtube-transcript-api --batch-file video-ids.txt --save output.json --fail-fast --verbose

# Fetch age-restricted video with cookies
youtube-transcript-api dQw4w9WgXcQ --cookies ~/cookies.txt
```

## Output Formatters

Format transcripts in different output formats.

```typescript
import { FormatterLoader, SRTFormatter } from 'youtube-transcript-api-js';

const transcript = await api.fetch('VIDEO_ID');

// Using FormatterLoader
const loader = new FormatterLoader();
const formatter = loader.load('srt');
console.log(formatter.formatTranscript(transcript));

// Or use formatters directly
const srtFormatter = new SRTFormatter();
console.log(srtFormatter.formatTranscript(transcript));
```

| Format | Class | Description |
|--------|-------|-------------|
| `json` | `JSONFormatter` | Compact JSON output |
| `pretty` | `PrettyPrintFormatter` | Pretty-printed JSON |
| `text` | `TextFormatter` | Plain text (transcript only) |
| `srt` | `SRTFormatter` | SubRip subtitle format |
| `webvtt` | `WebVTTFormatter` | WebVTT subtitle format |
| `timestamped` | `TimestampedTextFormatter` | LLM-friendly `[M:SS] text` format |

### Timestamped Text Formatter

Produces clean `[M:SS] text` output, ideal for feeding transcripts to LLMs. Supports grouping snippets into time buckets.

```typescript
import { TimestampedTextFormatter } from 'youtube-transcript-api-js';

const formatter = new TimestampedTextFormatter();
const transcript = await api.fetch('VIDEO_ID');

// Default: one line per snippet
console.log(formatter.formatTranscript(transcript));
// [0:00] Hello world
// [0:05] This is a transcript

// Grouped: combine snippets into 60-second buckets
console.log(formatter.formatTranscript(transcript, { groupBySeconds: 60 }));
// [0:00] Hello world This is a transcript ...
// [1:00] Next minute of content ...
```

### Custom Formatters

Extend the `Formatter` base class to create your own output format:

```typescript
import { YouTubeTranscriptApi, Formatter, FetchedTranscript, FormatterOptions } from 'youtube-transcript-api-js';

class MarkdownFormatter extends Formatter {
  formatTranscript(transcript: FetchedTranscript, options: FormatterOptions = {}): string {
    return transcript.snippets
      .map(s => `- **${this.toTimestamp(s.start)}** ${s.text}`)
      .join('\n');
  }

  formatTranscripts(transcripts: FetchedTranscript[], options: FormatterOptions = {}): string {
    return transcripts.map(t => this.formatTranscript(t, options)).join('\n\n---\n\n');
  }

  private toTimestamp(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}

// Usage:
const api = new YouTubeTranscriptApi();
const transcript = await api.fetch('VIDEO_ID');

const formatter = new MarkdownFormatter();
console.log(formatter.formatTranscript(transcript));
// - **0:00** Hello world
// - **0:05** This is a test
```

## Proxy Support

### Generic Proxy

```typescript
import { YouTubeTranscriptApi, GenericProxyConfig } from 'youtube-transcript-api-js';

const proxyConfig = new GenericProxyConfig(
  'http://user:pass@proxy.example.com:8080',  // HTTP
  'http://user:pass@proxy.example.com:8080'   // HTTPS
);

const api = new YouTubeTranscriptApi(proxyConfig);
```

### Webshare Rotating Proxy

For rotating residential proxies via [Webshare](https://www.webshare.io/).

```typescript
import { YouTubeTranscriptApi, WebshareProxyConfig } from 'youtube-transcript-api-js';

const proxyConfig = new WebshareProxyConfig(
  'your-username',
  'your-password',
  ['US', 'GB'],  // Filter by IP locations (optional)
  10             // Retries when blocked (default: 10)
);

const api = new YouTubeTranscriptApi(proxyConfig);
```

### Enhanced API with Proxy

For advanced use cases with Invidious fallback support.

```typescript
import { EnhancedYouTubeTranscriptApi } from 'youtube-transcript-api-js';

const api = new EnhancedYouTubeTranscriptApi(
  {
    enabled: true,
    http: 'http://user:pass@proxy.example.com:8080',
    https: 'http://user:pass@proxy.example.com:8080'
  },
  {
    enabled: true,
    instanceUrls: ['https://invidious.example.com'],
    timeout: 10000
  }
);

const transcript = await api.fetch('VIDEO_ID');
```

## Cookie Authentication

Authenticate requests using cookies for age-restricted or login-required videos. Export cookies from your browser using a "cookies.txt" extension.

```typescript
import { YouTubeTranscriptApi } from 'youtube-transcript-api-js';

// Pass cookie file path as an option
const api = new YouTubeTranscriptApi(undefined, undefined, {
  cookiePath: '/path/to/cookies.txt'
});

const transcript = await api.fetch('AGE_RESTRICTED_VIDEO_ID');
```

Supports both Netscape/Mozilla format (`.txt`) and JSON format (`.json`). Only cookies for YouTube/Google domains are used.

## Retry Configuration

Requests are automatically retried with exponential backoff on transient errors (`RateLimitExceeded`, `NetworkError`, `TimeoutError`, `ConnectionError`, `RequestBlocked`).

```typescript
import { YouTubeTranscriptApi } from 'youtube-transcript-api-js';

const api = new YouTubeTranscriptApi(undefined, undefined, {
  retryConfig: {
    maxRetries: 5,        // default: 3
    baseDelayMs: 1000,    // default: 1000
    maxDelayMs: 30000,    // default: 30000
    jitterFactor: 0.5,    // default: 0.5 (0-1)
  }
});
```

## Error Handling

```typescript
import {
  VideoUnavailable,
  TranscriptsDisabled,
  NoTranscriptFound,
  RateLimitExceeded,
  TimeoutError,
  ConnectionError
} from 'youtube-transcript-api-js';

try {
  const transcript = await api.fetch('VIDEO_ID');
} catch (error) {
  if (error instanceof RateLimitExceeded) {
    console.error(`Rate limited. Retry after ${error.retryAfter} seconds`);
  } else if (error instanceof TimeoutError) {
    console.error(`Request timed out after ${error.timeoutMs}ms`);
  }
}
```

| Error | Description |
|-------|-------------|
| `VideoUnavailable` | Video does not exist or is private |
| `TranscriptsDisabled` | Subtitles are disabled for this video |
| `NoTranscriptFound` | No transcript for requested languages |
| `InvalidVideoId` | Invalid video ID (URL passed instead of ID) |
| `AgeRestricted` | Video is age-restricted |
| `VideoUnplayable` | Video cannot be played |
| `RequestBlocked` | YouTube is blocking requests from your IP |
| `IpBlocked` | IP address has been blocked |
| `RateLimitExceeded` | Too many requests (HTTP 429) |
| `NetworkError` | General network error |
| `TimeoutError` | Request timed out |
| `ConnectionError` | Failed to connect to server |

## Tech Stack

| Technology | Purpose |
|------------|---------|
| TypeScript | Type-safe JavaScript |
| Axios | HTTP client |
| Commander.js | CLI framework |
| http-proxy-agent | Proxy support |
| Jest | Testing |

## Contributing

Contributions are welcome! Here's how you can help:

- **Bug reports** — Open an [issue](https://github.com/rajat-mehra05/youtube-transcript-api-js/issues) with steps to reproduce
- **Feature requests** — Open an [issue](https://github.com/rajat-mehra05/youtube-transcript-api-js/issues) to discuss your idea before submitting a PR
- **Pull requests** — Fork the repo, create a branch, and submit a PR
- **Questions & discussions** — Feel free to open an [issue](https://github.com/rajat-mehra05/youtube-transcript-api-js/issues) for general questions or discussions

## License

This project is licensed under the [MIT License](LICENSE).
