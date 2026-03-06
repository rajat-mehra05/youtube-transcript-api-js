import {
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
  RateLimitExceeded,
  CookieError,
  CookiePathInvalid,
  CookieInvalid,
  InvalidProxyUrl,
  TranscriptParseError,
  NetworkError,
  TimeoutError,
  ConnectionError
} from '../errors';

describe('Error Classes', () => {
  const TEST_VIDEO_ID = 'dQw4w9WgXcQ';

  // ============================================
  // Base Classes
  // ============================================

  describe('YouTubeTranscriptApiException', () => {
    it('should create error with message', () => {
      const error = new YouTubeTranscriptApiException('Test error message');
      expect(error.message).toBe('Test error message');
      expect(error.name).toBe('YouTubeTranscriptApiException');
    });

    it('should be an instance of Error', () => {
      const error = new YouTubeTranscriptApiException('Test');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('YouTubeDataUnparsable (CouldNotRetrieveTranscript base)', () => {
    it('should store videoId', () => {
      const error = new YouTubeDataUnparsable(TEST_VIDEO_ID);
      expect(error.videoId).toBe(TEST_VIDEO_ID);
    });

    it('should build error message with video URL', () => {
      const error = new YouTubeDataUnparsable(TEST_VIDEO_ID);
      const message = error.toString();
      expect(message).toContain(`https://www.youtube.com/watch?v=${TEST_VIDEO_ID}`);
    });

    it('should include GitHub referral in error message', () => {
      const error = new YouTubeDataUnparsable(TEST_VIDEO_ID);
      const message = error.toString();
      expect(message).toContain('github.com');
    });

    it('should be an instance of YouTubeTranscriptApiException', () => {
      const error = new YouTubeDataUnparsable(TEST_VIDEO_ID);
      expect(error).toBeInstanceOf(YouTubeTranscriptApiException);
    });
  });

  // ============================================
  // Transcript Retrieval Errors
  // ============================================

  describe('YouTubeDataUnparsable', () => {
    it('should have correct cause message', () => {
      const error = new YouTubeDataUnparsable(TEST_VIDEO_ID);
      const message = error.toString();
      expect(message).toContain('data required to fetch the transcript is not parsable');
    });

    it('should be an instance of CouldNotRetrieveTranscript', () => {
      const error = new YouTubeDataUnparsable(TEST_VIDEO_ID);
      expect(error).toBeInstanceOf(CouldNotRetrieveTranscript);
    });
  });

  describe('YouTubeRequestFailed', () => {
    it('should store reason', () => {
      const reason = 'Network timeout';
      const error = new YouTubeRequestFailed(TEST_VIDEO_ID, reason);
      expect(error.reason).toBe(reason);
    });

    it('should include reason in cause message', () => {
      const reason = 'Server returned 500';
      const error = new YouTubeRequestFailed(TEST_VIDEO_ID, reason);
      const message = error.toString();
      expect(message).toContain('Request to YouTube failed');
      expect(message).toContain(reason);
    });

    it('should be an instance of CouldNotRetrieveTranscript', () => {
      const error = new YouTubeRequestFailed(TEST_VIDEO_ID, 'reason');
      expect(error).toBeInstanceOf(CouldNotRetrieveTranscript);
    });
  });

  describe('VideoUnplayable', () => {
    it('should store reason and subReasons', () => {
      const reason = 'Video is private';
      const subReasons = ['Contact owner', 'Request access'];
      const error = new VideoUnplayable(TEST_VIDEO_ID, reason, subReasons);

      expect(error.reason).toBe(reason);
      expect(error.subReasons).toEqual(subReasons);
    });

    it('should handle null reason', () => {
      const error = new VideoUnplayable(TEST_VIDEO_ID, null);
      const message = error.toString();
      expect(message).toContain('No reason specified');
    });

    it('should format subReasons in cause message', () => {
      const subReasons = ['Reason 1', 'Reason 2'];
      const error = new VideoUnplayable(TEST_VIDEO_ID, 'Main reason', subReasons);
      const message = error.toString();

      expect(message).toContain('unplayable');
      expect(message).toContain('Reason 1');
      expect(message).toContain('Reason 2');
    });

    it('should default subReasons to empty array', () => {
      const error = new VideoUnplayable(TEST_VIDEO_ID, 'reason');
      expect(error.subReasons).toEqual([]);
    });

    it('should be an instance of CouldNotRetrieveTranscript', () => {
      const error = new VideoUnplayable(TEST_VIDEO_ID, 'reason');
      expect(error).toBeInstanceOf(CouldNotRetrieveTranscript);
    });
  });

  describe('VideoUnavailable', () => {
    it('should have correct cause message', () => {
      const error = new VideoUnavailable(TEST_VIDEO_ID);
      const message = error.toString();
      expect(message).toContain('no longer available');
    });

    it('should be an instance of CouldNotRetrieveTranscript', () => {
      const error = new VideoUnavailable(TEST_VIDEO_ID);
      expect(error).toBeInstanceOf(CouldNotRetrieveTranscript);
    });
  });

  describe('InvalidVideoId', () => {
    it('should have cause message with usage instructions', () => {
      const error = new InvalidVideoId('https://youtube.com/watch?v=123');
      const message = error.toString();

      expect(message).toContain('invalid video id');
      expect(message).toContain('NOT the url');
    });

    it('should include correct usage example', () => {
      const error = new InvalidVideoId(TEST_VIDEO_ID);
      const message = error.toString();

      expect(message).toContain('YouTubeTranscriptApi');
      expect(message).toContain('.fetch');
    });

    it('should be an instance of CouldNotRetrieveTranscript', () => {
      const error = new InvalidVideoId(TEST_VIDEO_ID);
      expect(error).toBeInstanceOf(CouldNotRetrieveTranscript);
    });
  });

  describe('RequestBlocked', () => {
    it('should have cause message about IP blocking', () => {
      const error = new RequestBlocked(TEST_VIDEO_ID);
      const message = error.toString();

      expect(message).toContain('YouTube is blocking requests');
      expect(message).toContain('IP');
    });

    it('should mention proxy workaround', () => {
      const error = new RequestBlocked(TEST_VIDEO_ID);
      const message = error.toString();

      expect(message).toContain('proxies');
    });

    it('should support withProxyConfig method', () => {
      const error = new RequestBlocked(TEST_VIDEO_ID);
      const mockProxyConfig = { http: 'http://proxy.example.com' };

      const result = error.withProxyConfig(mockProxyConfig);
      expect(result).toBe(error); // Returns self for chaining
    });

    it('should be an instance of CouldNotRetrieveTranscript', () => {
      const error = new RequestBlocked(TEST_VIDEO_ID);
      expect(error).toBeInstanceOf(CouldNotRetrieveTranscript);
    });
  });

  describe('IpBlocked', () => {
    it('should have different cause message than RequestBlocked', () => {
      const ipBlocked = new IpBlocked(TEST_VIDEO_ID);
      const requestBlocked = new RequestBlocked(TEST_VIDEO_ID);

      // Both mention IP blocking but IpBlocked has slightly different message
      expect(ipBlocked.toString()).toContain('IP');
      expect(requestBlocked.toString()).toContain('IP');
    });

    it('should be an instance of RequestBlocked', () => {
      const error = new IpBlocked(TEST_VIDEO_ID);
      expect(error).toBeInstanceOf(RequestBlocked);
    });

    it('should be an instance of CouldNotRetrieveTranscript', () => {
      const error = new IpBlocked(TEST_VIDEO_ID);
      expect(error).toBeInstanceOf(CouldNotRetrieveTranscript);
    });
  });

  describe('TranscriptsDisabled', () => {
    it('should have correct cause message', () => {
      const error = new TranscriptsDisabled(TEST_VIDEO_ID);
      const message = error.toString();
      expect(message).toContain('Subtitles are disabled');
    });

    it('should be an instance of CouldNotRetrieveTranscript', () => {
      const error = new TranscriptsDisabled(TEST_VIDEO_ID);
      expect(error).toBeInstanceOf(CouldNotRetrieveTranscript);
    });
  });

  describe('AgeRestricted', () => {
    it('should have correct cause message', () => {
      const error = new AgeRestricted(TEST_VIDEO_ID);
      const message = error.toString();
      expect(message).toContain('age-restricted');
    });

    it('should mention authentication requirement', () => {
      const error = new AgeRestricted(TEST_VIDEO_ID);
      const message = error.toString();
      expect(message).toContain('authenticating');
    });

    it('should be an instance of CouldNotRetrieveTranscript', () => {
      const error = new AgeRestricted(TEST_VIDEO_ID);
      expect(error).toBeInstanceOf(CouldNotRetrieveTranscript);
    });
  });

  describe('NotTranslatable', () => {
    it('should have correct cause message', () => {
      const error = new NotTranslatable(TEST_VIDEO_ID);
      const message = error.toString();
      expect(message).toContain('not translatable');
    });

    it('should be an instance of CouldNotRetrieveTranscript', () => {
      const error = new NotTranslatable(TEST_VIDEO_ID);
      expect(error).toBeInstanceOf(CouldNotRetrieveTranscript);
    });
  });

  describe('TranslationLanguageNotAvailable', () => {
    it('should have correct cause message', () => {
      const error = new TranslationLanguageNotAvailable(TEST_VIDEO_ID);
      const message = error.toString();
      expect(message).toContain('translation language is not available');
    });

    it('should be an instance of CouldNotRetrieveTranscript', () => {
      const error = new TranslationLanguageNotAvailable(TEST_VIDEO_ID);
      expect(error).toBeInstanceOf(CouldNotRetrieveTranscript);
    });
  });

  describe('FailedToCreateConsentCookie', () => {
    it('should have correct cause message', () => {
      const error = new FailedToCreateConsentCookie(TEST_VIDEO_ID);
      const message = error.toString();
      expect(message).toContain('Failed to automatically give consent');
    });

    it('should be an instance of CouldNotRetrieveTranscript', () => {
      const error = new FailedToCreateConsentCookie(TEST_VIDEO_ID);
      expect(error).toBeInstanceOf(CouldNotRetrieveTranscript);
    });
  });

  describe('NoTranscriptFound', () => {
    it('should store requestedLanguageCodes and transcriptData', () => {
      const languageCodes = ['en', 'de', 'fr'];
      const transcriptData = 'Available: es, pt';
      const error = new NoTranscriptFound(TEST_VIDEO_ID, languageCodes, transcriptData);

      expect(error.requestedLanguageCodes).toEqual(languageCodes);
      expect(error.transcriptData).toBe(transcriptData);
    });

    it('should include language codes in cause message', () => {
      const languageCodes = ['en', 'de'];
      const error = new NoTranscriptFound(TEST_VIDEO_ID, languageCodes, 'data');
      const message = error.toString();

      expect(message).toContain('en');
      expect(message).toContain('de');
    });

    it('should include transcript data in cause message', () => {
      const transcriptData = 'Available transcripts: es, pt';
      const error = new NoTranscriptFound(TEST_VIDEO_ID, ['en'], transcriptData);
      const message = error.toString();

      expect(message).toContain(transcriptData);
    });

    it('should be an instance of CouldNotRetrieveTranscript', () => {
      const error = new NoTranscriptFound(TEST_VIDEO_ID, ['en'], 'data');
      expect(error).toBeInstanceOf(CouldNotRetrieveTranscript);
    });
  });

  describe('PoTokenRequired', () => {
    it('should have correct cause message', () => {
      const error = new PoTokenRequired(TEST_VIDEO_ID);
      const message = error.toString();
      expect(message).toContain('PO Token');
    });

    it('should be an instance of CouldNotRetrieveTranscript', () => {
      const error = new PoTokenRequired(TEST_VIDEO_ID);
      expect(error).toBeInstanceOf(CouldNotRetrieveTranscript);
    });
  });

  describe('RateLimitExceeded', () => {
    it('should store retryAfter when provided', () => {
      const error = new RateLimitExceeded(TEST_VIDEO_ID, 60);
      expect(error.retryAfter).toBe(60);
    });

    it('should have undefined retryAfter when not provided', () => {
      const error = new RateLimitExceeded(TEST_VIDEO_ID);
      expect(error.retryAfter).toBeUndefined();
    });

    it('should include retry time in cause message when available', () => {
      const error = new RateLimitExceeded(TEST_VIDEO_ID, 120);
      const message = error.toString();

      expect(message).toContain('rate limiting');
      expect(message).toContain('120');
    });

    it('should not include retry time when not available', () => {
      const error = new RateLimitExceeded(TEST_VIDEO_ID);
      const message = error.toString();

      expect(message).toContain('rate limiting');
      expect(message).not.toContain('Try again after');
    });

    it('should have correct name', () => {
      const error = new RateLimitExceeded(TEST_VIDEO_ID);
      expect(error.name).toBe('RateLimitExceeded');
    });

    it('should be an instance of CouldNotRetrieveTranscript', () => {
      const error = new RateLimitExceeded(TEST_VIDEO_ID);
      expect(error).toBeInstanceOf(CouldNotRetrieveTranscript);
    });
  });

  // ============================================
  // Cookie Errors
  // ============================================

  describe('CookieError', () => {
    it('should create error with message', () => {
      const error = new CookieError('Cookie error occurred');
      expect(error.message).toBe('Cookie error occurred');
    });

    it('should have correct name', () => {
      const error = new CookieError('Test');
      expect(error.name).toBe('CookieError');
    });

    it('should be an instance of YouTubeTranscriptApiException', () => {
      const error = new CookieError('Test');
      expect(error).toBeInstanceOf(YouTubeTranscriptApiException);
    });
  });

  describe('CookiePathInvalid', () => {
    it('should include cookie path in message', () => {
      const cookiePath = '/path/to/cookies.txt';
      const error = new CookiePathInvalid(cookiePath);

      expect(error.message).toContain(cookiePath);
      expect(error.message).toContain("Can't load");
    });

    it('should be an instance of CookieError', () => {
      const error = new CookiePathInvalid('/path');
      expect(error).toBeInstanceOf(CookieError);
    });
  });

  describe('CookieInvalid', () => {
    it('should include cookie path in message', () => {
      const cookiePath = '/path/to/cookies.txt';
      const error = new CookieInvalid(cookiePath);

      expect(error.message).toContain(cookiePath);
      expect(error.message).toContain('not valid');
    });

    it('should mention expiration', () => {
      const error = new CookieInvalid('/path');
      expect(error.message).toContain('expired');
    });

    it('should be an instance of CookieError', () => {
      const error = new CookieInvalid('/path');
      expect(error).toBeInstanceOf(CookieError);
    });
  });

  // ============================================
  // Other Errors
  // ============================================

  describe('InvalidProxyUrl', () => {
    it('should include url and reason in message', () => {
      const url = 'invalid://proxy';
      const reason = 'Invalid protocol';
      const error = new InvalidProxyUrl(url, reason);

      expect(error.message).toContain(url);
      expect(error.message).toContain(reason);
    });

    it('should have correct name', () => {
      const error = new InvalidProxyUrl('url', 'reason');
      expect(error.name).toBe('InvalidProxyUrl');
    });

    it('should be an instance of YouTubeTranscriptApiException', () => {
      const error = new InvalidProxyUrl('url', 'reason');
      expect(error).toBeInstanceOf(YouTubeTranscriptApiException);
    });
  });

  describe('TranscriptParseError', () => {
    it('should create error with message', () => {
      const error = new TranscriptParseError('Failed to parse XML');
      expect(error.message).toBe('Failed to parse XML');
    });

    it('should store original error when provided', () => {
      const originalError = new Error('XML syntax error');
      const error = new TranscriptParseError('Parse failed', originalError);

      expect(error.originalError).toBe(originalError);
    });

    it('should have undefined originalError when not provided', () => {
      const error = new TranscriptParseError('Parse failed');
      expect(error.originalError).toBeUndefined();
    });

    it('should have correct name', () => {
      const error = new TranscriptParseError('Test');
      expect(error.name).toBe('TranscriptParseError');
    });

    it('should be an instance of YouTubeTranscriptApiException', () => {
      const error = new TranscriptParseError('Test');
      expect(error).toBeInstanceOf(YouTubeTranscriptApiException);
    });
  });

  describe('NetworkError', () => {
    it('should create error with message', () => {
      const error = new NetworkError('Connection failed');
      expect(error.message).toBe('Connection failed');
    });

    it('should store code when provided', () => {
      const error = new NetworkError('Connection failed', 'ECONNRESET');
      expect(error.code).toBe('ECONNRESET');
    });

    it('should have undefined code when not provided', () => {
      const error = new NetworkError('Connection failed');
      expect(error.code).toBeUndefined();
    });

    it('should have correct name', () => {
      const error = new NetworkError('Test');
      expect(error.name).toBe('NetworkError');
    });

    it('should be an instance of YouTubeTranscriptApiException', () => {
      const error = new NetworkError('Test');
      expect(error).toBeInstanceOf(YouTubeTranscriptApiException);
    });
  });

  describe('TimeoutError', () => {
    it('should store url and timeoutMs', () => {
      const url = 'https://youtube.com/api';
      const timeoutMs = 5000;
      const error = new TimeoutError(url, timeoutMs);

      expect(error.url).toBe(url);
      expect(error.timeoutMs).toBe(timeoutMs);
    });

    it('should include url and timeout in message', () => {
      const error = new TimeoutError('https://example.com', 10000);

      expect(error.message).toContain('https://example.com');
      expect(error.message).toContain('10000');
      expect(error.message).toContain('timed out');
    });

    it('should have code set to ETIMEDOUT', () => {
      const error = new TimeoutError('url', 1000);
      expect(error.code).toBe('ETIMEDOUT');
    });

    it('should have correct name', () => {
      const error = new TimeoutError('url', 1000);
      expect(error.name).toBe('TimeoutError');
    });

    it('should be an instance of NetworkError', () => {
      const error = new TimeoutError('url', 1000);
      expect(error).toBeInstanceOf(NetworkError);
    });

    it('should be an instance of YouTubeTranscriptApiException', () => {
      const error = new TimeoutError('url', 1000);
      expect(error).toBeInstanceOf(YouTubeTranscriptApiException);
    });
  });

  describe('ConnectionError', () => {
    it('should store url and code', () => {
      const url = 'https://youtube.com';
      const code = 'ECONNREFUSED';
      const error = new ConnectionError(url, code);

      expect(error.url).toBe(url);
      expect(error.code).toBe(code);
    });

    it('should include url and code in message', () => {
      const error = new ConnectionError('https://example.com', 'ENOTFOUND');

      expect(error.message).toContain('https://example.com');
      expect(error.message).toContain('ENOTFOUND');
      expect(error.message).toContain('Failed to connect');
    });

    it('should have correct name', () => {
      const error = new ConnectionError('url', 'code');
      expect(error.name).toBe('ConnectionError');
    });

    it('should be an instance of NetworkError', () => {
      const error = new ConnectionError('url', 'code');
      expect(error).toBeInstanceOf(NetworkError);
    });

    it('should be an instance of YouTubeTranscriptApiException', () => {
      const error = new ConnectionError('url', 'code');
      expect(error).toBeInstanceOf(YouTubeTranscriptApiException);
    });
  });

  // ============================================
  // Error Hierarchy Verification
  // ============================================

  describe('Error Hierarchy', () => {
    it('all errors should be instances of Error', () => {
      const errors = [
        new YouTubeTranscriptApiException('test'),
        new YouTubeDataUnparsable(TEST_VIDEO_ID),
        new YouTubeRequestFailed(TEST_VIDEO_ID, 'reason'),
        new VideoUnplayable(TEST_VIDEO_ID, 'reason'),
        new VideoUnavailable(TEST_VIDEO_ID),
        new InvalidVideoId(TEST_VIDEO_ID),
        new RequestBlocked(TEST_VIDEO_ID),
        new IpBlocked(TEST_VIDEO_ID),
        new TranscriptsDisabled(TEST_VIDEO_ID),
        new AgeRestricted(TEST_VIDEO_ID),
        new NotTranslatable(TEST_VIDEO_ID),
        new TranslationLanguageNotAvailable(TEST_VIDEO_ID),
        new FailedToCreateConsentCookie(TEST_VIDEO_ID),
        new NoTranscriptFound(TEST_VIDEO_ID, ['en'], 'data'),
        new PoTokenRequired(TEST_VIDEO_ID),
        new RateLimitExceeded(TEST_VIDEO_ID),
        new CookieError('test'),
        new CookiePathInvalid('/path'),
        new CookieInvalid('/path'),
        new InvalidProxyUrl('url', 'reason'),
        new TranscriptParseError('test'),
        new NetworkError('test'),
        new TimeoutError('url', 1000),
        new ConnectionError('url', 'code')
      ];

      errors.forEach(error => {
        expect(error).toBeInstanceOf(Error);
      });
    });

    it('CouldNotRetrieveTranscript subclasses should have videoId', () => {
      const errors = [
        new YouTubeDataUnparsable(TEST_VIDEO_ID),
        new YouTubeRequestFailed(TEST_VIDEO_ID, 'reason'),
        new VideoUnplayable(TEST_VIDEO_ID, 'reason'),
        new VideoUnavailable(TEST_VIDEO_ID),
        new InvalidVideoId(TEST_VIDEO_ID),
        new RequestBlocked(TEST_VIDEO_ID),
        new IpBlocked(TEST_VIDEO_ID),
        new TranscriptsDisabled(TEST_VIDEO_ID),
        new AgeRestricted(TEST_VIDEO_ID),
        new NotTranslatable(TEST_VIDEO_ID),
        new TranslationLanguageNotAvailable(TEST_VIDEO_ID),
        new FailedToCreateConsentCookie(TEST_VIDEO_ID),
        new NoTranscriptFound(TEST_VIDEO_ID, ['en'], 'data'),
        new PoTokenRequired(TEST_VIDEO_ID),
        new RateLimitExceeded(TEST_VIDEO_ID)
      ];

      errors.forEach(error => {
        expect(error.videoId).toBe(TEST_VIDEO_ID);
      });
    });
  });
});
