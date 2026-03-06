import { YouTubeTranscriptApi, createYouTubeTranscriptApi } from '../api';
import YouTubeTranscriptApiDefault from '../api';
import { GenericProxyConfig } from '../proxies';
import { InvalidVideoId, InvalidProxyUrl } from '../errors';
import axios from 'axios';
import { VALID_TRANSCRIPT_XML, TEST_VIDEO_ID } from './__fixtures__/youtube-responses';
import { loadCookiesFromFile } from '../cookies';

// Mock axios
jest.mock('axios');
jest.mock('../cookies');

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedLoadCookies = loadCookiesFromFile as jest.MockedFunction<typeof loadCookiesFromFile>;

// Mock HTML with correct INNERTUBE_API_KEY format
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

// Mock Innertube response with playability
const MOCK_INNERTUBE_RESPONSE = {
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
          isTranslatable: true,
        },
        {
          baseUrl: 'https://www.youtube.com/api/timedtext?v=test123&lang=es',
          name: { runs: [{ text: 'Spanish' }] },
          vssId: '.es',
          languageCode: 'es',
          isTranslatable: true,
        },
      ],
      translationLanguages: [
        { languageCode: 'de', languageName: { runs: [{ text: 'German' }] } },
      ],
    },
  },
};

describe('YouTubeTranscriptApi', () => {
  let api: YouTubeTranscriptApi;
  let mockAxiosInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock axios instance
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      defaults: {
        headers: { common: {} },
        proxy: undefined,
      },
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);

    api = new YouTubeTranscriptApi();
  });

  describe('constructor', () => {
    it('should create instance without parameters', () => {
      expect(api).toBeInstanceOf(YouTubeTranscriptApi);
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 10000,
          headers: expect.objectContaining({
            'Accept-Language': 'en-US',
            'User-Agent': expect.stringContaining('Mozilla'),
          }),
        })
      );
    });

    it('should create instance with proxy config', () => {
      const proxyConfig = new GenericProxyConfig('http://proxy.example.com:8080');
      const apiWithProxy = new YouTubeTranscriptApi(proxyConfig);

      expect(apiWithProxy).toBeInstanceOf(YouTubeTranscriptApi);
      expect(mockedAxios.create).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
    });

    it('should create instance with custom HTTP client', () => {
      const customClient = mockAxiosInstance;
      const apiWithCustomClient = new YouTubeTranscriptApi(undefined, customClient);

      expect(apiWithCustomClient).toBeInstanceOf(YouTubeTranscriptApi);
      // Should not call axios.create when custom client is provided
      expect(mockedAxios.create).toHaveBeenCalledTimes(1); // Only from beforeEach api creation
    });

    it('should disable axios default proxy handling when proxy config is provided', () => {
      const proxyConfig = new GenericProxyConfig('http://proxy.example.com:8080');
      new YouTubeTranscriptApi(proxyConfig);

      expect(mockAxiosInstance.defaults.proxy).toBe(false);
    });

    it('should load cookies from file when cookiePath is provided', () => {
      mockedLoadCookies.mockReturnValueOnce('YSC=abc; VISITOR_INFO=xyz');

      new YouTubeTranscriptApi(undefined, undefined, { cookiePath: '/tmp/cookies.txt' });

      expect(mockedLoadCookies).toHaveBeenCalledWith('/tmp/cookies.txt');
      expect(mockAxiosInstance.defaults.headers.common['Cookie']).toBe('YSC=abc; VISITOR_INFO=xyz');
    });

    it('should append cookies to existing cookies when cookiePath is provided', () => {
      mockAxiosInstance.defaults.headers.common['Cookie'] = 'EXISTING=old';
      mockedLoadCookies.mockReturnValueOnce('YSC=abc');

      new YouTubeTranscriptApi(undefined, mockAxiosInstance, { cookiePath: '/tmp/cookies.txt' });

      expect(mockAxiosInstance.defaults.headers.common['Cookie']).toBe('EXISTING=old; YSC=abc');
    });
  });

  describe('proxy configuration', () => {
    it('should configure proxy with host and port', () => {
      const proxyConfig = new GenericProxyConfig('http://proxy.example.com:8080');
      new YouTubeTranscriptApi(proxyConfig);

      // Get the interceptor callback
      const interceptorCallback = mockAxiosInstance.interceptors.request.use.mock.calls[0][0];
      const config = { proxy: undefined as any };
      const result = interceptorCallback(config);

      expect(result.proxy).toEqual(
        expect.objectContaining({
          protocol: 'http',
          host: 'proxy.example.com',
          port: 8080,
        })
      );
    });

    it('should default to port 80 when port is not specified', () => {
      const proxyConfig = new GenericProxyConfig('http://proxy.example.com');
      new YouTubeTranscriptApi(proxyConfig);

      const interceptorCallback = mockAxiosInstance.interceptors.request.use.mock.calls[0][0];
      const config = { proxy: undefined as any };
      const result = interceptorCallback(config);

      expect(result.proxy.port).toBe(80);
    });

    it('should configure proxy with authentication', () => {
      const proxyConfig = new GenericProxyConfig('http://user:pass@proxy.example.com:8080');
      new YouTubeTranscriptApi(proxyConfig);

      const interceptorCallback = mockAxiosInstance.interceptors.request.use.mock.calls[0][0];
      const config = { proxy: undefined as any };
      const result = interceptorCallback(config);

      expect(result.proxy).toEqual(
        expect.objectContaining({
          host: 'proxy.example.com',
          port: 8080,
          auth: {
            username: 'user',
            password: 'pass',
          },
        })
      );
    });

    it('should prefer HTTPS proxy over HTTP proxy', () => {
      // Create a mock proxy config that returns both http and https
      const mockProxyConfig = {
        toRequestsConfig: () => ({
          http: 'http://http-proxy.example.com:8080',
          https: 'http://https-proxy.example.com:8443',
        }),
        preventKeepingConnectionsAlive: false,
      };

      new YouTubeTranscriptApi(mockProxyConfig as any);

      const interceptorCallback = mockAxiosInstance.interceptors.request.use.mock.calls[0][0];
      const config = { proxy: undefined as any };
      const result = interceptorCallback(config);

      expect(result.proxy.host).toBe('https-proxy.example.com');
      expect(result.proxy.port).toBe(8443);
    });

    it('should set Connection header to close when preventKeepingConnectionsAlive is true', () => {
      const mockProxyConfig = {
        toRequestsConfig: () => ({
          http: 'http://proxy.example.com:8080',
        }),
        preventKeepingConnectionsAlive: true,
      };

      new YouTubeTranscriptApi(mockProxyConfig as any);

      expect(mockAxiosInstance.defaults.headers.common['Connection']).toBe('close');
    });

    it('should not set Connection header when preventKeepingConnectionsAlive is false', () => {
      const proxyConfig = new GenericProxyConfig('http://proxy.example.com:8080');
      new YouTubeTranscriptApi(proxyConfig);

      expect(mockAxiosInstance.defaults.headers.common['Connection']).toBeUndefined();
    });

    it('should throw InvalidProxyUrl for invalid proxy URL hostname', () => {
      const mockProxyConfig = {
        toRequestsConfig: () => ({
          http: 'not-a-valid-url',
        }),
        preventKeepingConnectionsAlive: false,
      };

      new YouTubeTranscriptApi(mockProxyConfig as any);
      const interceptorCallback = mockAxiosInstance.interceptors.request.use.mock.calls[0][0];

      expect(() => interceptorCallback({})).toThrow(InvalidProxyUrl);
    });
  });

  describe('createYouTubeTranscriptApi', () => {
    it('should create API instance via factory function', () => {
      const factoryApi = createYouTubeTranscriptApi();
      expect(factoryApi).toBeInstanceOf(YouTubeTranscriptApi);
    });

    it('should create API instance with proxy via factory function', () => {
      const proxyConfig = new GenericProxyConfig('http://proxy.example.com:8080');
      const factoryApi = createYouTubeTranscriptApi(proxyConfig);
      expect(factoryApi).toBeInstanceOf(YouTubeTranscriptApi);
    });

    it('should create API instance with custom HTTP client via factory function', () => {
      const factoryApi = createYouTubeTranscriptApi(undefined, mockAxiosInstance);
      expect(factoryApi).toBeInstanceOf(YouTubeTranscriptApi);
    });
  });

  describe('default export', () => {
    it('should export YouTubeTranscriptApi as default', () => {
      expect(YouTubeTranscriptApiDefault).toBe(YouTubeTranscriptApi);
    });
  });

  describe('fetch', () => {
    describe('video ID validation', () => {
      it('should throw InvalidVideoId for empty string', async () => {
        await expect(api.fetch('')).rejects.toThrow(InvalidVideoId);
      });

      it('should throw InvalidVideoId for null', async () => {
        await expect(api.fetch(null as unknown as string)).rejects.toThrow(InvalidVideoId);
      });

      it('should throw InvalidVideoId for undefined', async () => {
        await expect(api.fetch(undefined as unknown as string)).rejects.toThrow(InvalidVideoId);
      });

      it('should throw InvalidVideoId for YouTube URL', async () => {
        await expect(api.fetch('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).rejects.toThrow(
          InvalidVideoId
        );
      });

      it('should throw InvalidVideoId for youtu.be URL', async () => {
        await expect(api.fetch('https://youtu.be/dQw4w9WgXcQ')).rejects.toThrow(InvalidVideoId);
      });

      it('should throw InvalidVideoId for YouTube URL (case insensitive)', async () => {
        await expect(api.fetch('HTTPS://YOUTUBE.COM/watch?v=abc')).rejects.toThrow(InvalidVideoId);
      });

      it('should throw InvalidVideoId for whitespace-only string', async () => {
        await expect(api.fetch('   ')).rejects.toThrow(InvalidVideoId);
      });

      it('should trim whitespace from video ID', async () => {
        mockAxiosInstance.get
          .mockResolvedValueOnce({ data: MOCK_VIDEO_HTML, status: 200 })
          .mockResolvedValueOnce({ data: VALID_TRANSCRIPT_XML, status: 200 });

        mockAxiosInstance.post.mockResolvedValueOnce({
          data: MOCK_INNERTUBE_RESPONSE,
          status: 200,
        });

        const result = await api.fetch(`  ${TEST_VIDEO_ID}  `);

        expect(result).toBeDefined();
        // Verify the trimmed ID was used in the request
        expect(mockAxiosInstance.get).toHaveBeenCalledWith(
          expect.stringContaining(TEST_VIDEO_ID.trim())
        );
      });
    });

    describe('successful fetch', () => {
      beforeEach(() => {
        mockAxiosInstance.get
          .mockResolvedValueOnce({ data: MOCK_VIDEO_HTML, status: 200 })
          .mockResolvedValueOnce({ data: VALID_TRANSCRIPT_XML, status: 200 });

        mockAxiosInstance.post.mockResolvedValueOnce({
          data: MOCK_INNERTUBE_RESPONSE,
          status: 200,
        });
      });

      it('should fetch transcript for valid video ID', async () => {
        const result = await api.fetch(TEST_VIDEO_ID);

        expect(result.videoId).toBe(TEST_VIDEO_ID);
        expect(result.snippets).toHaveLength(3);
        expect(result.snippets[0]!.text).toBe('Hello world');
        expect(result.snippets[0]!.start).toBe(0);
        expect(result.snippets[0]!.duration).toBe(2.5);
      });

      it('should use default language (en) when not specified', async () => {
        const result = await api.fetch(TEST_VIDEO_ID);

        expect(result).toBeDefined();
        expect(result.language).toBe('English');
        expect(result.languageCode).toBe('en');
      });

      it('should fetch transcript with specified language', async () => {
        // Reset mocks for this test
        mockAxiosInstance.get.mockReset();
        mockAxiosInstance.post.mockReset();

        mockAxiosInstance.get
          .mockResolvedValueOnce({ data: MOCK_VIDEO_HTML, status: 200 })
          .mockResolvedValueOnce({ data: VALID_TRANSCRIPT_XML, status: 200 });

        mockAxiosInstance.post.mockResolvedValueOnce({
          data: MOCK_INNERTUBE_RESPONSE,
          status: 200,
        });

        const result = await api.fetch(TEST_VIDEO_ID, ['es']);

        expect(result).toBeDefined();
        expect(result.languageCode).toBe('es');
      });

      it('should try multiple languages in order of preference', async () => {
        // Reset mocks for this test
        mockAxiosInstance.get.mockReset();
        mockAxiosInstance.post.mockReset();

        mockAxiosInstance.get
          .mockResolvedValueOnce({ data: MOCK_VIDEO_HTML, status: 200 })
          .mockResolvedValueOnce({ data: VALID_TRANSCRIPT_XML, status: 200 });

        mockAxiosInstance.post.mockResolvedValueOnce({
          data: MOCK_INNERTUBE_RESPONSE,
          status: 200,
        });

        // Request fr first (not available), then en (available)
        const result = await api.fetch(TEST_VIDEO_ID, ['fr', 'en']);

        expect(result).toBeDefined();
        expect(result.languageCode).toBe('en');
      });
    });

    describe('preserveFormatting option', () => {
      it('should pass preserveFormatting=false by default', async () => {
        mockAxiosInstance.get
          .mockResolvedValueOnce({ data: MOCK_VIDEO_HTML, status: 200 })
          .mockResolvedValueOnce({ data: VALID_TRANSCRIPT_XML, status: 200 });

        mockAxiosInstance.post.mockResolvedValueOnce({
          data: MOCK_INNERTUBE_RESPONSE,
          status: 200,
        });

        const result = await api.fetch(TEST_VIDEO_ID);

        expect(result).toBeDefined();
        expect(result.snippets.length).toBeGreaterThan(0);
        // Formatting should be stripped by default
        expect(result.snippets[0]!.text).not.toContain('<');
      });

      it('should accept preserveFormatting=true', async () => {
        mockAxiosInstance.get
          .mockResolvedValueOnce({ data: MOCK_VIDEO_HTML, status: 200 })
          .mockResolvedValueOnce({ data: VALID_TRANSCRIPT_XML, status: 200 });

        mockAxiosInstance.post.mockResolvedValueOnce({
          data: MOCK_INNERTUBE_RESPONSE,
          status: 200,
        });

        const result = await api.fetch(TEST_VIDEO_ID, ['en'], true);

        expect(result.videoId).toBe(TEST_VIDEO_ID);
        expect(result.snippets).toHaveLength(3);
        expect(result.languageCode).toBe('en');
      });
    });
  });

  describe('list', () => {
    describe('video ID validation', () => {
      it('should throw InvalidVideoId for empty string', async () => {
        await expect(api.list('')).rejects.toThrow(InvalidVideoId);
      });

      it('should throw InvalidVideoId for null', async () => {
        await expect(api.list(null as unknown as string)).rejects.toThrow(InvalidVideoId);
      });

      it('should throw InvalidVideoId for undefined', async () => {
        await expect(api.list(undefined as unknown as string)).rejects.toThrow(InvalidVideoId);
      });

      it('should throw InvalidVideoId for YouTube URL (case insensitive)', async () => {
        await expect(api.list('HTTPS://WWW.YOUTUBE.COM/watch?v=dQw4w9WgXcQ')).rejects.toThrow(
          InvalidVideoId
        );
      });

      it('should throw InvalidVideoId for youtu.be URL', async () => {
        await expect(api.list('https://youtu.be/abc123')).rejects.toThrow(InvalidVideoId);
      });
    });

    describe('successful list', () => {
      beforeEach(() => {
        mockAxiosInstance.get.mockResolvedValueOnce({
          data: MOCK_VIDEO_HTML,
          status: 200,
        });

        mockAxiosInstance.post.mockResolvedValueOnce({
          data: MOCK_INNERTUBE_RESPONSE,
          status: 200,
        });
      });

      it('should list available transcripts for valid video ID', async () => {
        const result = await api.list(TEST_VIDEO_ID);

        expect(result).toBeDefined();
        expect(result.videoId).toBe(TEST_VIDEO_ID);
      });

      it('should provide findTranscript method', async () => {
        const result = await api.list(TEST_VIDEO_ID);

        expect(typeof result.findTranscript).toBe('function');
        expect(typeof result.findGeneratedTranscript).toBe('function');
        expect(typeof result.findManuallyCreatedTranscript).toBe('function');
      });

      it('should return transcripts that can be iterated', async () => {
        const result = await api.list(TEST_VIDEO_ID);
        const transcripts = result.getAllTranscripts();

        expect(Array.isArray(transcripts)).toBe(true);
        expect(transcripts.length).toBeGreaterThan(0);
      });

      it('should include multiple transcripts when available', async () => {
        const result = await api.list(TEST_VIDEO_ID);
        const transcripts = result.getAllTranscripts();

        expect(transcripts.length).toBe(2); // English and Spanish from mock
      });

      it('should allow finding transcript by language code', async () => {
        const result = await api.list(TEST_VIDEO_ID);
        const transcript = result.findTranscript(['es']);

        expect(transcript.languageCode).toBe('es');
      });
    });
  });
});
