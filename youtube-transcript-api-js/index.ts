// Main API exports
export { YouTubeTranscriptApi, YouTubeTranscriptApiOptions, createYouTubeTranscriptApi } from './api';

// Retry exports
export { RetryConfig, DEFAULT_RETRY_CONFIG } from './retry';

// Cookie exports
export { loadCookiesFromFile, ParsedCookie } from './cookies';

// Enhanced API exports
export { EnhancedYouTubeTranscriptApi, VideoMetadataResult } from './enhanced-api';

// Data model exports
export {
  FetchedTranscript,
  FetchedTranscriptSnippet,
  Transcript,
  TranscriptList,
  TranslationLanguage,
  VideoMetadata
} from './transcripts/models';

// Error exports
export {
  YouTubeTranscriptApiException,
  CouldNotRetrieveTranscript,
  YouTubeDataUnparsable,
  YouTubeRequestFailed,
  VideoUnplayable,
  VideoUnavailable,
  InvalidVideoId,
  RequestBlocked,
  IpBlocked,
  TranscriptsDisabled,
  AgeRestricted,
  NotTranslatable,
  TranslationLanguageNotAvailable,
  FailedToCreateConsentCookie,
  NoTranscriptFound,
  PoTokenRequired,
  CookieError,
  CookiePathInvalid,
  CookieInvalid,
  InvalidProxyUrl,
  TranscriptParseError,
  RateLimitExceeded,
  NetworkError,
  TimeoutError,
  ConnectionError
} from './errors';

// Formatter exports
export {
  Formatter,
  FormatterOptions,
  PrettyPrintFormatter,
  JSONFormatter,
  TextFormatter,
  SRTFormatter,
  WebVTTFormatter,
  TimestampedTextFormatter,
  FormatterLoader
} from './formatters';

// CLI exports
export type { CliOptions } from './cli';

// Proxy exports
export {
  ProxyConfig,
  GenericProxyConfig,
  WebshareProxyConfig,
  EnhancedProxyConfig,
  InvalidProxyConfig,
  RequestsProxyConfig,
  ProxyOptions,
  InvidiousOptions
} from './proxies';

