import { AxiosError, AxiosInstance } from 'axios';
import { TranscriptListFetcher } from '../transcripts/fetcher';
import {
  YouTubeDataUnparsable,
  VideoUnavailable,
  VideoUnplayable,
  InvalidVideoId,
  IpBlocked,
  RequestBlocked,
  AgeRestricted,
  TranscriptsDisabled,
  FailedToCreateConsentCookie,
  RateLimitExceeded,
  NetworkError,
  TimeoutError,
  ConnectionError,
} from '../errors';
import { ProxyConfig, RequestsProxyConfig } from '../proxies';
import { TEST_VIDEO_ID, VALID_TRANSCRIPT_XML } from './__fixtures__/youtube-responses';

class MockProxyConfig extends ProxyConfig {
  private readonly _retriesWhenBlocked: number;
  constructor(retriesWhenBlocked: number) {
    super();
    this._retriesWhenBlocked = retriesWhenBlocked;
  }
  toRequestsConfig(): RequestsProxyConfig { return {}; }
  get retriesWhenBlocked(): number { return this._retriesWhenBlocked; }
}

// Mock HTML with INNERTUBE_API_KEY
const MOCK_VIDEO_HTML = `
<!DOCTYPE html>
<html>
<head><title>Test Video</title></head>
<body>
<script>
  "INNERTUBE_API_KEY": "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8"
</script>
</body>
</html>`;

// Mock HTML with recaptcha (IP blocked)
const MOCK_RECAPTCHA_HTML = `
<!DOCTYPE html>
<html>
<body>
<div class="g-recaptcha"></div>
</body>
</html>`;

// Mock HTML with consent form
const MOCK_CONSENT_HTML = `
<!DOCTYPE html>
<html>
<body>
<form action="https://consent.youtube.com/s">
<input name="v" value="abc123consent">
</form>
</body>
</html>`;

// Mock HTML with consent form but no value
const MOCK_CONSENT_NO_VALUE_HTML = `
<!DOCTYPE html>
<html>
<body>
<form action="https://consent.youtube.com/s">
<input name="other" value="something">
</form>
</body>
</html>`;

// Mock video details
const MOCK_VIDEO_DETAILS = {
  videoId: TEST_VIDEO_ID,
  title: 'Test Video',
  lengthSeconds: '300',
  channelId: 'UCtest',
  shortDescription: 'Test description',
  thumbnail: { thumbnails: [] },
  viewCount: '100',
  author: 'Test Author',
  isLiveContent: false,
};

// Mock Innertube response - OK
const MOCK_INNERTUBE_OK = {
  videoDetails: MOCK_VIDEO_DETAILS,
  playabilityStatus: {
    status: 'OK',
  },
  captions: {
    playerCaptionsTracklistRenderer: {
      captionTracks: [
        {
          baseUrl: 'https://www.youtube.com/api/timedtext?v=test123&lang=en',
          name: { runs: [{ text: 'English' }] },
          vssId: '.en',
          languageCode: 'en',
          kind: 'asr',
          isTranslatable: true,
        },
        {
          baseUrl: 'https://www.youtube.com/api/timedtext?v=test123&lang=es&fmt=srv3',
          name: { runs: [{ text: 'Spanish' }] },
          vssId: '.es',
          languageCode: 'es',
          isTranslatable: false,
        },
      ],
      translationLanguages: [
        { languageCode: 'de', languageName: { runs: [{ text: 'German' }] } },
        { languageCode: 'fr', languageName: { runs: [{ text: 'French' }] } },
      ],
    },
  },
};

// Mock Innertube response - no captions
const MOCK_INNERTUBE_NO_CAPTIONS = {
  playabilityStatus: {
    status: 'OK',
  },
  captions: {},
};

// Mock Innertube response - bot detected
const MOCK_INNERTUBE_BOT_DETECTED = {
  playabilityStatus: {
    status: 'LOGIN_REQUIRED',
    reason: "Sign in to confirm you're not a bot",
  },
};

// Mock Innertube response - age restricted
const MOCK_INNERTUBE_AGE_RESTRICTED = {
  playabilityStatus: {
    status: 'LOGIN_REQUIRED',
    reason: 'This video may be inappropriate for some users.',
  },
};

// Mock Innertube response - video unavailable
const MOCK_INNERTUBE_VIDEO_UNAVAILABLE = {
  playabilityStatus: {
    status: 'ERROR',
    reason: 'This video is unavailable',
  },
};

// Mock Innertube response - video unplayable with subreasons
const MOCK_INNERTUBE_UNPLAYABLE = {
  playabilityStatus: {
    status: 'ERROR',
    reason: 'Video is private',
    errorScreen: {
      playerErrorMessageRenderer: {
        subreason: {
          runs: [{ text: 'This video is private.' }, { text: 'Contact owner.' }],
        },
      },
    },
  },
};

describe('TranscriptListFetcher', () => {
  let mockHttpClient: jest.Mocked<AxiosInstance>;
  let fetcher: TranscriptListFetcher;

  beforeEach(() => {
    mockHttpClient = {
      get: jest.fn(),
      post: jest.fn(),
      defaults: {
        headers: { common: {}, cookie: undefined },
      },
    } as unknown as jest.Mocked<AxiosInstance>;

    fetcher = new TranscriptListFetcher(mockHttpClient, undefined, { maxRetries: 0 });
  });

  describe('fetch', () => {
    it('should fetch transcript list successfully', async () => {
      mockHttpClient.get.mockResolvedValueOnce({ data: MOCK_VIDEO_HTML });
      mockHttpClient.post.mockResolvedValueOnce({ data: MOCK_INNERTUBE_OK });

      const result = await fetcher.fetch(TEST_VIDEO_ID);

      expect(result).toBeDefined();
      expect(result.videoId).toBe(TEST_VIDEO_ID);
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        `https://www.youtube.com/watch?v=${TEST_VIDEO_ID}`
      );
    });

    it('should build transcript list with generated and manual transcripts', async () => {
      mockHttpClient.get.mockResolvedValueOnce({ data: MOCK_VIDEO_HTML });
      mockHttpClient.post.mockResolvedValueOnce({ data: MOCK_INNERTUBE_OK });

      const result = await fetcher.fetch(TEST_VIDEO_ID);
      const transcripts = result.getAllTranscripts();

      expect(transcripts.length).toBe(2);
      // Check that we have both generated (en with kind=asr) and manual (es)
      const englishTranscript = result.findGeneratedTranscript(['en']);
      expect(englishTranscript.languageCode).toBe('en');

      const spanishTranscript = result.findManuallyCreatedTranscript(['es']);
      expect(spanishTranscript.languageCode).toBe('es');
    });

    it('should strip fmt=srv3 from baseUrl', async () => {
      mockHttpClient.get.mockResolvedValueOnce({ data: MOCK_VIDEO_HTML });
      mockHttpClient.post.mockResolvedValueOnce({ data: MOCK_INNERTUBE_OK });

      const result = await fetcher.fetch(TEST_VIDEO_ID);
      const spanishTranscript = result.findManuallyCreatedTranscript(['es']);

      // The baseUrl should not contain &fmt=srv3
      expect(spanishTranscript.toString()).not.toContain('fmt=srv3');
    });

    it('should include translation languages for translatable transcripts', async () => {
      mockHttpClient.get.mockResolvedValueOnce({ data: MOCK_VIDEO_HTML });
      mockHttpClient.post.mockResolvedValueOnce({ data: MOCK_INNERTUBE_OK });

      const result = await fetcher.fetch(TEST_VIDEO_ID);
      const englishTranscript = result.findTranscript(['en']);

      // English is marked as translatable, so should have translation languages
      expect(englishTranscript.isTranslatable).toBe(true);
    });
  });

  describe('metadata threading', () => {
    it('should thread videoDetails metadata to TranscriptList', async () => {
      mockHttpClient.get.mockResolvedValueOnce({ data: MOCK_VIDEO_HTML });
      mockHttpClient.post.mockResolvedValueOnce({ data: MOCK_INNERTUBE_OK });

      const result = await fetcher.fetch(TEST_VIDEO_ID);

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.title).toBe('Test Video');
      expect(result.metadata?.author).toBe('Test Author');
      expect(result.metadata?.viewCount).toBe('100');
    });

    it('should thread metadata to individual transcripts', async () => {
      mockHttpClient.get.mockResolvedValueOnce({ data: MOCK_VIDEO_HTML });
      mockHttpClient.post.mockResolvedValueOnce({ data: MOCK_INNERTUBE_OK });

      const result = await fetcher.fetch(TEST_VIDEO_ID);
      const transcript = result.findTranscript(['en']);

      expect(transcript.metadata).toBeDefined();
      expect(transcript.metadata?.title).toBe('Test Video');
    });

    it('should handle missing videoDetails gracefully', async () => {
      const responseWithoutDetails = {
        playabilityStatus: { status: 'OK' },
        captions: MOCK_INNERTUBE_OK.captions,
      };
      mockHttpClient.get.mockResolvedValueOnce({ data: MOCK_VIDEO_HTML });
      mockHttpClient.post.mockResolvedValueOnce({ data: responseWithoutDetails });

      const result = await fetcher.fetch(TEST_VIDEO_ID);

      expect(result.metadata).toBeUndefined();
    });

    it('should handle null videoDetails gracefully', async () => {
      const responseWithNull = {
        videoDetails: null,
        playabilityStatus: { status: 'OK' },
        captions: MOCK_INNERTUBE_OK.captions,
      };
      mockHttpClient.get.mockResolvedValueOnce({ data: MOCK_VIDEO_HTML });
      mockHttpClient.post.mockResolvedValueOnce({ data: responseWithNull });

      const result = await fetcher.fetch(TEST_VIDEO_ID);

      expect(result.metadata).toBeUndefined();
    });
  });

  describe('error handling - IP blocked', () => {
    it('should throw IpBlocked when recaptcha is detected', async () => {
      mockHttpClient.get.mockResolvedValueOnce({ data: MOCK_RECAPTCHA_HTML });

      await expect(fetcher.fetch(TEST_VIDEO_ID)).rejects.toThrow(IpBlocked);
    });
  });

  describe('error handling - unparsable data', () => {
    it('should throw YouTubeDataUnparsable when API key is not found', async () => {
      mockHttpClient.get.mockResolvedValueOnce({ data: '<html></html>' });

      await expect(fetcher.fetch(TEST_VIDEO_ID)).rejects.toThrow(YouTubeDataUnparsable);
    });
  });

  describe('error handling - transcripts disabled', () => {
    it('should throw TranscriptsDisabled when no captions available', async () => {
      mockHttpClient.get.mockResolvedValueOnce({ data: MOCK_VIDEO_HTML });
      mockHttpClient.post.mockResolvedValueOnce({ data: MOCK_INNERTUBE_NO_CAPTIONS });

      await expect(fetcher.fetch(TEST_VIDEO_ID)).rejects.toThrow(TranscriptsDisabled);
    });
  });

  describe('error handling - bot detected', () => {
    it('should throw RequestBlocked when bot is detected', async () => {
      mockHttpClient.get.mockResolvedValueOnce({ data: MOCK_VIDEO_HTML });
      mockHttpClient.post.mockResolvedValueOnce({ data: MOCK_INNERTUBE_BOT_DETECTED });

      await expect(fetcher.fetch(TEST_VIDEO_ID)).rejects.toThrow(RequestBlocked);
    });

    it('should retry when bot detected and retries configured', async () => {
      jest.useFakeTimers();
      try {
        const fetcherWithRetries = new TranscriptListFetcher(mockHttpClient, new MockProxyConfig(2));

        mockHttpClient.get
          .mockResolvedValueOnce({ data: MOCK_VIDEO_HTML })
          .mockResolvedValueOnce({ data: MOCK_VIDEO_HTML });
        mockHttpClient.post
          .mockResolvedValueOnce({ data: MOCK_INNERTUBE_BOT_DETECTED })
          .mockResolvedValueOnce({ data: MOCK_INNERTUBE_OK });

        const fetchPromise = fetcherWithRetries.fetch(TEST_VIDEO_ID);
        await jest.advanceTimersByTimeAsync(60000);
        const result = await fetchPromise;

        expect(result).toBeDefined();
        expect(mockHttpClient.get).toHaveBeenCalledTimes(2);
        expect(mockHttpClient.post).toHaveBeenCalledTimes(2);
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('error handling - age restricted', () => {
    it('should throw AgeRestricted for age-restricted videos', async () => {
      mockHttpClient.get.mockResolvedValueOnce({ data: MOCK_VIDEO_HTML });
      mockHttpClient.post.mockResolvedValueOnce({ data: MOCK_INNERTUBE_AGE_RESTRICTED });

      await expect(fetcher.fetch(TEST_VIDEO_ID)).rejects.toThrow(AgeRestricted);
    });
  });

  describe('error handling - video unavailable', () => {
    it('should throw VideoUnavailable for unavailable videos', async () => {
      mockHttpClient.get.mockResolvedValueOnce({ data: MOCK_VIDEO_HTML });
      mockHttpClient.post.mockResolvedValueOnce({ data: MOCK_INNERTUBE_VIDEO_UNAVAILABLE });

      await expect(fetcher.fetch(TEST_VIDEO_ID)).rejects.toThrow(VideoUnavailable);
    });

    it('should throw InvalidVideoId when URL is passed as video ID', async () => {
      mockHttpClient.get.mockResolvedValueOnce({ data: MOCK_VIDEO_HTML });
      mockHttpClient.post.mockResolvedValueOnce({ data: MOCK_INNERTUBE_VIDEO_UNAVAILABLE });

      const fetcherForUrl = new TranscriptListFetcher(mockHttpClient);
      // Simulate what happens when a URL is passed - the playability check happens
      // after the video ID is used in requests
      await expect(fetcherForUrl.fetch('https://youtube.com/watch?v=abc')).rejects.toThrow(
        InvalidVideoId
      );
    });
  });

  describe('error handling - video unplayable', () => {
    it('should throw VideoUnplayable with reason and subreasons', async () => {
      mockHttpClient.get.mockResolvedValueOnce({ data: MOCK_VIDEO_HTML });
      mockHttpClient.post.mockResolvedValueOnce({ data: MOCK_INNERTUBE_UNPLAYABLE });

      try {
        await fetcher.fetch(TEST_VIDEO_ID);
        fail('Expected VideoUnplayable to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(VideoUnplayable);
        const unplayable = error as VideoUnplayable;
        expect(unplayable.reason).toBe('Video is private');
        expect(unplayable.subReasons).toEqual(['This video is private.', 'Contact owner.']);
        expect(unplayable.toString()).toContain('Additional Details');
      }
    });
  });

  describe('consent cookie handling', () => {
    it('should handle consent form and retry', async () => {
      mockHttpClient.get
        .mockResolvedValueOnce({ data: MOCK_CONSENT_HTML })
        .mockResolvedValueOnce({ data: MOCK_VIDEO_HTML });
      mockHttpClient.post.mockResolvedValueOnce({ data: MOCK_INNERTUBE_OK });

      const result = await fetcher.fetch(TEST_VIDEO_ID);

      expect(result).toBeDefined();
      expect(mockHttpClient.defaults.headers.common['Cookie']).toContain('CONSENT=YES+abc123consent');
      expect(mockHttpClient.get).toHaveBeenCalledTimes(2);
    });

    it('should throw FailedToCreateConsentCookie when consent value not found', async () => {
      mockHttpClient.get.mockResolvedValueOnce({ data: MOCK_CONSENT_NO_VALUE_HTML });

      await expect(fetcher.fetch(TEST_VIDEO_ID)).rejects.toThrow(FailedToCreateConsentCookie);
    });

    it('should throw FailedToCreateConsentCookie when consent persists after cookie', async () => {
      mockHttpClient.get
        .mockResolvedValueOnce({ data: MOCK_CONSENT_HTML })
        .mockResolvedValueOnce({ data: MOCK_CONSENT_HTML });

      await expect(fetcher.fetch(TEST_VIDEO_ID)).rejects.toThrow(FailedToCreateConsentCookie);
    });
  });

  describe('network error handling', () => {
    it('should throw RateLimitExceeded on 429 response', async () => {
      const axiosError = new AxiosError('Too Many Requests');
      axiosError.response = {
        status: 429,
        headers: { 'retry-after': '60' },
        data: '',
        statusText: 'Too Many Requests',
        config: {} as any,
      };

      mockHttpClient.get.mockRejectedValueOnce(axiosError);

      await expect(fetcher.fetch(TEST_VIDEO_ID)).rejects.toThrow(RateLimitExceeded);
    });

    it('should parse retry-after as HTTP date', async () => {
      const futureDate = new Date(Date.now() + 120000).toUTCString();
      const axiosError = new AxiosError('Too Many Requests');
      axiosError.response = {
        status: 429,
        headers: { 'retry-after': futureDate },
        data: '',
        statusText: 'Too Many Requests',
        config: {} as any,
      };

      mockHttpClient.get.mockRejectedValueOnce(axiosError);

      try {
        await fetcher.fetch(TEST_VIDEO_ID);
      } catch (error) {
        expect(error).toBeInstanceOf(RateLimitExceeded);
        expect((error as RateLimitExceeded).retryAfter).toBeGreaterThan(0);
      }
    });

    it('should throw TimeoutError on timeout', async () => {
      const axiosError = new AxiosError('timeout');
      axiosError.code = 'ECONNABORTED';
      axiosError.config = { timeout: 10000 } as any;

      mockHttpClient.get.mockRejectedValueOnce(axiosError);

      await expect(fetcher.fetch(TEST_VIDEO_ID)).rejects.toThrow(TimeoutError);
    });

    it('should throw TimeoutError on ETIMEDOUT', async () => {
      const axiosError = new AxiosError('timeout');
      axiosError.code = 'ETIMEDOUT';

      mockHttpClient.get.mockRejectedValueOnce(axiosError);

      await expect(fetcher.fetch(TEST_VIDEO_ID)).rejects.toThrow(TimeoutError);
    });

    it('should throw ConnectionError on ECONNREFUSED', async () => {
      const axiosError = new AxiosError('connection refused');
      axiosError.code = 'ECONNREFUSED';

      mockHttpClient.get.mockRejectedValueOnce(axiosError);

      await expect(fetcher.fetch(TEST_VIDEO_ID)).rejects.toThrow(ConnectionError);
    });

    it('should throw ConnectionError on ENOTFOUND', async () => {
      const axiosError = new AxiosError('not found');
      axiosError.code = 'ENOTFOUND';

      mockHttpClient.get.mockRejectedValueOnce(axiosError);

      await expect(fetcher.fetch(TEST_VIDEO_ID)).rejects.toThrow(ConnectionError);
    });

    it('should throw ConnectionError on ENETUNREACH', async () => {
      const axiosError = new AxiosError('network unreachable');
      axiosError.code = 'ENETUNREACH';

      mockHttpClient.get.mockRejectedValueOnce(axiosError);

      await expect(fetcher.fetch(TEST_VIDEO_ID)).rejects.toThrow(ConnectionError);
    });

    it('should throw NetworkError for other axios errors with code', async () => {
      const axiosError = new AxiosError('unknown error');
      axiosError.code = 'UNKNOWN';

      mockHttpClient.get.mockRejectedValueOnce(axiosError);

      await expect(fetcher.fetch(TEST_VIDEO_ID)).rejects.toThrow(NetworkError);
    });

    it('should throw NetworkError for axios errors without code', async () => {
      const axiosError = new AxiosError('generic error');

      mockHttpClient.get.mockRejectedValueOnce(axiosError);

      await expect(fetcher.fetch(TEST_VIDEO_ID)).rejects.toThrow(NetworkError);
    });

    it('should re-throw non-axios errors', async () => {
      const customError = new Error('Custom error');

      mockHttpClient.get.mockRejectedValueOnce(customError);

      await expect(fetcher.fetch(TEST_VIDEO_ID)).rejects.toThrow('Custom error');
    });
  });

  describe('HTML unescaping', () => {
    it('should unescape HTML entities in response', async () => {
      const htmlWithEntities = `
        &amp; &lt; &gt; &quot; &#39; &nbsp;
        "INNERTUBE_API_KEY": "test_key"
      `;
      mockHttpClient.get.mockResolvedValueOnce({ data: htmlWithEntities });
      mockHttpClient.post.mockResolvedValueOnce({ data: MOCK_INNERTUBE_OK });

      const result = await fetcher.fetch(TEST_VIDEO_ID);

      expect(result).toBeDefined();
    });
  });

  describe('POST request to Innertube API', () => {
    it('should send correct payload to Innertube API', async () => {
      mockHttpClient.get.mockResolvedValueOnce({ data: MOCK_VIDEO_HTML });
      mockHttpClient.post.mockResolvedValueOnce({ data: MOCK_INNERTUBE_OK });

      await fetcher.fetch(TEST_VIDEO_ID);

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        expect.stringContaining('youtubei/v1/player'),
        expect.objectContaining({
          context: {
            client: {
              clientName: 'ANDROID',
              clientVersion: '20.10.38',
            },
          },
          videoId: TEST_VIDEO_ID,
        })
      );
    });

    it('should handle network error on POST request', async () => {
      mockHttpClient.get.mockResolvedValueOnce({ data: MOCK_VIDEO_HTML });

      const axiosError = new AxiosError('POST failed');
      axiosError.code = 'ECONNREFUSED';
      mockHttpClient.post.mockRejectedValueOnce(axiosError);

      await expect(fetcher.fetch(TEST_VIDEO_ID)).rejects.toThrow(ConnectionError);
    });
  });

  describe('retry with exponential backoff', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should retry on RateLimitExceeded and succeed', async () => {
      const retryFetcher = new TranscriptListFetcher(mockHttpClient, undefined, { maxRetries: 2 });

      const rateLimitError = new AxiosError('Too Many Requests');
      rateLimitError.response = { status: 429, headers: { 'retry-after': '1' }, data: '', statusText: '', config: {} as any };

      mockHttpClient.get
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce({ data: MOCK_VIDEO_HTML });
      mockHttpClient.post
        .mockResolvedValueOnce({ data: MOCK_INNERTUBE_OK });

      const fetchPromise = retryFetcher.fetch(TEST_VIDEO_ID);
      await jest.advanceTimersByTimeAsync(60000);
      const result = await fetchPromise;

      expect(result).toBeDefined();
      expect(mockHttpClient.get).toHaveBeenCalledTimes(2);
    });

    it('should retry on TimeoutError and succeed', async () => {
      const retryFetcher = new TranscriptListFetcher(mockHttpClient, undefined, { maxRetries: 1 });

      const timeoutError = new AxiosError('timeout');
      timeoutError.code = 'ECONNABORTED';
      timeoutError.config = { timeout: 10000 } as any;

      mockHttpClient.get
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValueOnce({ data: MOCK_VIDEO_HTML });
      mockHttpClient.post
        .mockResolvedValueOnce({ data: MOCK_INNERTUBE_OK });

      const fetchPromise = retryFetcher.fetch(TEST_VIDEO_ID);
      await jest.advanceTimersByTimeAsync(60000);
      const result = await fetchPromise;

      expect(result).toBeDefined();
      expect(mockHttpClient.get).toHaveBeenCalledTimes(2);
    });

    it('should not retry on AgeRestricted', async () => {
      const retryFetcher = new TranscriptListFetcher(mockHttpClient, undefined, { maxRetries: 3 });

      mockHttpClient.get.mockResolvedValueOnce({ data: MOCK_VIDEO_HTML });
      mockHttpClient.post.mockResolvedValueOnce({ data: MOCK_INNERTUBE_AGE_RESTRICTED });

      await expect(retryFetcher.fetch(TEST_VIDEO_ID)).rejects.toThrow(AgeRestricted);
      expect(mockHttpClient.get).toHaveBeenCalledTimes(1);
    });

    it('should throw after exhausting retries', async () => {
      const retryFetcher = new TranscriptListFetcher(mockHttpClient, undefined, { maxRetries: 1 });

      const makeTimeoutError = () => {
        const err = new AxiosError('timeout');
        err.code = 'ECONNABORTED';
        err.config = { timeout: 10000 } as any;
        return err;
      };

      mockHttpClient.get
        .mockRejectedValueOnce(makeTimeoutError())
        .mockRejectedValueOnce(makeTimeoutError());

      // Capture rejection before advancing timers to avoid unhandled rejection
      let caughtError: unknown;
      const fetchPromise = retryFetcher.fetch(TEST_VIDEO_ID).catch((e) => { caughtError = e; });
      await jest.advanceTimersByTimeAsync(60000);
      await fetchPromise;

      expect(caughtError).toBeInstanceOf(TimeoutError);
      expect(mockHttpClient.get).toHaveBeenCalledTimes(2);
    });

    it('should disable retries with maxRetries: 0', async () => {
      const noRetryFetcher = new TranscriptListFetcher(mockHttpClient, undefined, { maxRetries: 0 });

      mockHttpClient.get.mockResolvedValueOnce({ data: MOCK_VIDEO_HTML });
      mockHttpClient.post.mockResolvedValueOnce({ data: MOCK_INNERTUBE_BOT_DETECTED });

      await expect(noRetryFetcher.fetch(TEST_VIDEO_ID)).rejects.toThrow(RequestBlocked);
      expect(mockHttpClient.post).toHaveBeenCalledTimes(1);
    });

    it('should clamp negative maxRetries to default', async () => {
      const negativeFetcher = new TranscriptListFetcher(mockHttpClient, undefined, { maxRetries: -5 });

      mockHttpClient.get.mockResolvedValueOnce({ data: MOCK_VIDEO_HTML });
      mockHttpClient.post.mockResolvedValueOnce({ data: MOCK_INNERTUBE_BOT_DETECTED });

      // With default maxRetries (3), it would retry. But since -5 is invalid and falls back to 3,
      // we just verify it doesn't infinite-loop or crash — it should still eventually throw.
      let caughtError: unknown;
      const fetchPromise = negativeFetcher.fetch(TEST_VIDEO_ID).catch((e) => { caughtError = e; });

      // Supply enough mocks for retries
      for (let i = 0; i < 3; i++) {
        mockHttpClient.get.mockResolvedValueOnce({ data: MOCK_VIDEO_HTML });
        mockHttpClient.post.mockResolvedValueOnce({ data: MOCK_INNERTUBE_BOT_DETECTED });
      }

      await jest.advanceTimersByTimeAsync(120000);
      await fetchPromise;

      expect(caughtError).toBeInstanceOf(RequestBlocked);
    });

    it('should clamp NaN maxRetries to default', async () => {
      const nanFetcher = new TranscriptListFetcher(mockHttpClient, undefined, { maxRetries: NaN });

      mockHttpClient.get.mockResolvedValueOnce({ data: MOCK_VIDEO_HTML });
      mockHttpClient.post.mockResolvedValueOnce({ data: MOCK_INNERTUBE_BOT_DETECTED });

      for (let i = 0; i < 3; i++) {
        mockHttpClient.get.mockResolvedValueOnce({ data: MOCK_VIDEO_HTML });
        mockHttpClient.post.mockResolvedValueOnce({ data: MOCK_INNERTUBE_BOT_DETECTED });
      }

      let caughtError: unknown;
      const fetchPromise = nanFetcher.fetch(TEST_VIDEO_ID).catch((e) => { caughtError = e; });
      await jest.advanceTimersByTimeAsync(120000);
      await fetchPromise;

      expect(caughtError).toBeInstanceOf(RequestBlocked);
    });

    it('should floor fractional maxRetries', async () => {
      // maxRetries: 1.9 should become 1 (floor), so 2 total attempts
      const fracFetcher = new TranscriptListFetcher(mockHttpClient, undefined, { maxRetries: 1.9 });

      const makeTimeoutError = () => {
        const err = new AxiosError('timeout');
        err.code = 'ECONNABORTED';
        err.config = { timeout: 10000 } as any;
        return err;
      };

      mockHttpClient.get
        .mockRejectedValueOnce(makeTimeoutError())
        .mockRejectedValueOnce(makeTimeoutError());

      let caughtError: unknown;
      const fetchPromise = fracFetcher.fetch(TEST_VIDEO_ID).catch((e) => { caughtError = e; });
      await jest.advanceTimersByTimeAsync(60000);
      await fetchPromise;

      expect(caughtError).toBeInstanceOf(TimeoutError);
      expect(mockHttpClient.get).toHaveBeenCalledTimes(2); // 1 + 1 retry = 2 attempts
    });

    it('should use proxyConfig.retriesWhenBlocked when retryConfig.maxRetries not specified', async () => {
      const proxyFetcher = new TranscriptListFetcher(mockHttpClient, new MockProxyConfig(2));

      mockHttpClient.get
        .mockResolvedValueOnce({ data: MOCK_VIDEO_HTML })
        .mockResolvedValueOnce({ data: MOCK_VIDEO_HTML })
        .mockResolvedValueOnce({ data: MOCK_VIDEO_HTML });
      mockHttpClient.post
        .mockResolvedValueOnce({ data: MOCK_INNERTUBE_BOT_DETECTED })
        .mockResolvedValueOnce({ data: MOCK_INNERTUBE_BOT_DETECTED })
        .mockResolvedValueOnce({ data: MOCK_INNERTUBE_OK });

      const fetchPromise = proxyFetcher.fetch(TEST_VIDEO_ID);
      await jest.advanceTimersByTimeAsync(120000);
      const result = await fetchPromise;

      expect(result).toBeDefined();
      expect(mockHttpClient.post).toHaveBeenCalledTimes(3);
    });
  });
});
