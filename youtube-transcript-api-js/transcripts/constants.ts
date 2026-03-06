/**
 * YouTube API URL templates
 */
export const WATCH_URL = 'https://www.youtube.com/watch?v={videoId}';
export const INNERTUBE_API_URL = 'https://www.youtube.com/youtubei/v1/player?key={apiKey}';

/**
 * Innertube API client context sent with every player request
 */
export const INNERTUBE_CONTEXT = {
  client: {
    clientName: 'ANDROID',
    clientVersion: '20.10.38'
  }
} as const;

/**
 * Playability status values returned by the Innertube API
 */
export const PLAYABILITY_STATUS = {
  OK: 'OK',
  ERROR: 'ERROR',
  LOGIN_REQUIRED: 'LOGIN_REQUIRED'
} as const;

/**
 * Known playability failure reason strings
 */
export const PLAYABILITY_FAILED_REASON = {
  BOT_DETECTED: "Sign in to confirm you're not a bot",
  AGE_RESTRICTED: 'This video may be inappropriate for some users.',
  VIDEO_UNAVAILABLE: 'This video is unavailable'
} as const;
