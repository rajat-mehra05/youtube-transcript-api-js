import { EnhancedYouTubeTranscriptApi } from '../enhanced-api';
import { YouTubeTranscriptApi } from '../api';
import axios from 'axios';

// Mock dependencies
jest.mock('axios');
jest.mock('../api');
jest.mock('http-proxy-agent', () => ({
  HttpProxyAgent: jest.fn().mockImplementation((url: string) => ({ url })),
}));
jest.mock('https-proxy-agent', () => ({
  HttpsProxyAgent: jest.fn().mockImplementation((url: string) => ({ url })),
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('EnhancedYouTubeTranscriptApi', () => {
  let mockAxiosInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock axios instance
    mockAxiosInstance = {
      get: jest.fn(),
      defaults: { headers: { common: {} } },
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);

    // Mock YouTubeTranscriptApi
    (YouTubeTranscriptApi as jest.Mock).mockImplementation(() => ({
      list: jest.fn().mockResolvedValue({ findTranscript: jest.fn() }),
      fetch: jest.fn().mockResolvedValue({ snippets: [] }),
    }));
  });

  describe('constructor', () => {
    it('should create instance with default options', () => {
      const api = new EnhancedYouTubeTranscriptApi();

      expect(api).toBeInstanceOf(EnhancedYouTubeTranscriptApi);
      expect(mockedAxios.create).toHaveBeenCalled();
    });

    it('should create instance with proxy options', () => {
      const api = new EnhancedYouTubeTranscriptApi({
        enabled: true,
        http: 'http://proxy.example.com:8080',
        https: 'https://proxy.example.com:8443',
      });

      expect(api).toBeInstanceOf(EnhancedYouTubeTranscriptApi);
      expect(mockedAxios.create).toHaveBeenCalled();
    });

    it('should create instance with proxy disabled', () => {
      const api = new EnhancedYouTubeTranscriptApi({
        enabled: false,
      });

      expect(api).toBeInstanceOf(EnhancedYouTubeTranscriptApi);
    });

    it('should create instance with Invidious options enabled', () => {
      const api = new EnhancedYouTubeTranscriptApi(
        {},
        {
          enabled: true,
          instanceUrls: 'https://invidious.example.com',
        }
      );

      expect(api).toBeInstanceOf(EnhancedYouTubeTranscriptApi);
      // Axios should be called twice - once for main client, once for Invidious client
      expect(mockedAxios.create).toHaveBeenCalledTimes(2);
    });

    it('should create instance with multiple Invidious instance URLs', () => {
      const api = new EnhancedYouTubeTranscriptApi(
        {},
        {
          enabled: true,
          instanceUrls: ['https://invidious1.example.com', 'https://invidious2.example.com'],
        }
      );

      expect(api).toBeInstanceOf(EnhancedYouTubeTranscriptApi);
    });

    it('should throw error when Invidious enabled without instance URLs', () => {
      expect(() => {
        new EnhancedYouTubeTranscriptApi(
          {},
          {
            enabled: true,
            instanceUrls: '',
          }
        );
      }).toThrow('At least one Invidious instance URL must be provided when Invidious is enabled');
    });

    it('should create instance with both proxy and Invidious options', () => {
      const api = new EnhancedYouTubeTranscriptApi(
        {
          enabled: true,
          http: 'http://proxy.example.com:8080',
        },
        {
          enabled: true,
          instanceUrls: 'https://invidious.example.com',
          timeout: 5000,
        }
      );

      expect(api).toBeInstanceOf(EnhancedYouTubeTranscriptApi);
    });

    it('should use default timeout for Invidious when not specified', () => {
      const api = new EnhancedYouTubeTranscriptApi(
        {},
        {
          enabled: true,
          instanceUrls: 'https://invidious.example.com',
        }
      );

      expect(api).toBeInstanceOf(EnhancedYouTubeTranscriptApi);
    });
  });

  describe('setProxyOptions', () => {
    it('should update proxy options', () => {
      const api = new EnhancedYouTubeTranscriptApi();

      api.setProxyOptions({
        enabled: true,
        http: 'http://newproxy.example.com:8080',
      });

      // HTTP client should be reinitialized
      expect(mockedAxios.create).toHaveBeenCalledTimes(2);
    });

    it('should reinitialize Invidious client when proxy changes and Invidious is enabled', () => {
      const api = new EnhancedYouTubeTranscriptApi(
        {},
        {
          enabled: true,
          instanceUrls: 'https://invidious.example.com',
        }
      );

      // Clear the call count
      mockedAxios.create.mockClear();

      api.setProxyOptions({
        enabled: true,
        http: 'http://newproxy.example.com:8080',
      });

      // Should reinitialize both HTTP and Invidious clients
      expect(mockedAxios.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('setInvidiousOptions', () => {
    it('should enable Invidious', () => {
      const api = new EnhancedYouTubeTranscriptApi();

      mockedAxios.create.mockClear();

      api.setInvidiousOptions({
        enabled: true,
        instanceUrls: 'https://invidious.example.com',
      });

      expect(mockedAxios.create).toHaveBeenCalled();
    });

    it('should disable Invidious', () => {
      const api = new EnhancedYouTubeTranscriptApi(
        {},
        {
          enabled: true,
          instanceUrls: 'https://invidious.example.com',
        }
      );

      api.setInvidiousOptions({
        enabled: false,
        instanceUrls: '',
      });

      // Invidious client should be set to null
      expect(api).toBeInstanceOf(EnhancedYouTubeTranscriptApi);
    });

    it('should update Invidious options', () => {
      const api = new EnhancedYouTubeTranscriptApi(
        {},
        {
          enabled: true,
          instanceUrls: 'https://invidious1.example.com',
        }
      );

      mockedAxios.create.mockClear();

      api.setInvidiousOptions({
        enabled: true,
        instanceUrls: 'https://invidious2.example.com',
        timeout: 15000,
      });

      expect(mockedAxios.create).toHaveBeenCalled();
    });
  });

  describe('fetch', () => {
    it('should fetch transcript using base API', async () => {
      const mockBaseApi = {
        fetch: jest.fn().mockResolvedValue({
          snippets: [{ text: 'Hello', start: 0, duration: 1 }],
        }),
        list: jest.fn(),
      };

      (YouTubeTranscriptApi as jest.Mock).mockImplementation(() => mockBaseApi);

      const api = new EnhancedYouTubeTranscriptApi();

      const result = await api.fetch('test123');

      expect(mockBaseApi.fetch).toHaveBeenCalledWith('test123', ['en'], false);
      expect(result.snippets).toHaveLength(1);
    });

    it('should fetch transcript with custom languages', async () => {
      const mockBaseApi = {
        fetch: jest.fn().mockResolvedValue({ snippets: [] }),
        list: jest.fn(),
      };

      (YouTubeTranscriptApi as jest.Mock).mockImplementation(() => mockBaseApi);

      const api = new EnhancedYouTubeTranscriptApi();

      await api.fetch('test123', ['de', 'en']);

      expect(mockBaseApi.fetch).toHaveBeenCalledWith('test123', ['de', 'en'], false);
    });

    it('should fetch transcript with preserve formatting', async () => {
      const mockBaseApi = {
        fetch: jest.fn().mockResolvedValue({ snippets: [] }),
        list: jest.fn(),
      };

      (YouTubeTranscriptApi as jest.Mock).mockImplementation(() => mockBaseApi);

      const api = new EnhancedYouTubeTranscriptApi();

      await api.fetch('test123', ['en'], true);

      expect(mockBaseApi.fetch).toHaveBeenCalledWith('test123', ['en'], true);
    });
  });

  describe('list', () => {
    it('should list transcripts using base API', async () => {
      const mockTranscriptList = {
        videoId: 'test123',
        findTranscript: jest.fn(),
      };

      const mockBaseApi = {
        fetch: jest.fn(),
        list: jest.fn().mockResolvedValue(mockTranscriptList),
      };

      (YouTubeTranscriptApi as jest.Mock).mockImplementation(() => mockBaseApi);

      const api = new EnhancedYouTubeTranscriptApi();

      const result = await api.list('test123');

      expect(mockBaseApi.list).toHaveBeenCalledWith('test123');
      expect(result.videoId).toBe('test123');
    });
  });

  describe('getVideoMetadata', () => {
    it('should return basic video metadata', async () => {
      const api = new EnhancedYouTubeTranscriptApi();

      const metadata = await api.getVideoMetadata('test123');

      expect(metadata).toEqual({
        id: 'test123',
        title: 'Video Title',
        description: 'Video Description',
        author: 'Video Author',
        channelId: 'channel_id',
        lengthSeconds: 0,
        viewCount: 0,
        isPrivate: false,
        isLiveContent: false,
      });
    });

    it('should return metadata with provided video ID', async () => {
      const api = new EnhancedYouTubeTranscriptApi();

      const metadata = await api.getVideoMetadata('customVideoId');

      expect(metadata.id).toBe('customVideoId');
    });
  });

  describe('proxy configuration scenarios', () => {
    // Save original globalThis.window
    const originalWindow = (globalThis as any).window;

    afterEach(() => {
      // Restore original globalThis.window
      if (originalWindow === undefined) {
        delete (globalThis as any).window;
      } else {
        (globalThis as any).window = originalWindow;
      }
    });

    it('should configure proxy agents in Node.js environment', () => {
      // Ensure we're in Node.js environment (no window)
      delete (globalThis as any).window;

      const api = new EnhancedYouTubeTranscriptApi({
        enabled: true,
        http: 'http://proxy.example.com:8080',
      });

      expect(api).toBeInstanceOf(EnhancedYouTubeTranscriptApi);
      expect(mockedAxios.create).toHaveBeenCalled();
    });

    it('should handle browser environment without proxy agents', () => {
      // Simulate browser environment
      (globalThis as any).window = {};

      const api = new EnhancedYouTubeTranscriptApi({
        enabled: true,
        http: 'http://proxy.example.com:8080',
      });

      expect(api).toBeInstanceOf(EnhancedYouTubeTranscriptApi);
    });

    it('should use keep-alive agents when proxy is disabled in Node.js', () => {
      delete (globalThis as any).window;

      const api = new EnhancedYouTubeTranscriptApi({
        enabled: false,
      });

      expect(api).toBeInstanceOf(EnhancedYouTubeTranscriptApi);
      expect(mockedAxios.create).toHaveBeenCalled();
    });
  });
});
