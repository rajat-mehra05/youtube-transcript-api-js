import { EnhancedYouTubeTranscriptApi } from '../enhanced-api';
import { YouTubeTranscriptApi } from '../api';
import { YouTubeTranscriptApiException } from '../errors';
import { FormatterLoader } from '../formatters';
import { FetchedTranscript } from '../transcripts/models';

jest.mock('../api');
jest.mock('../formatters');

describe('EnhancedYouTubeTranscriptApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (YouTubeTranscriptApi as jest.Mock).mockImplementation(() => ({
      list: jest.fn().mockResolvedValue({ findTranscript: jest.fn() }),
      fetch: jest.fn().mockResolvedValue({ snippets: [] }),
    }));
  });

  describe('constructor', () => {
    it('should create instance with default options', () => {
      const api = new EnhancedYouTubeTranscriptApi();

      expect(api).toBeInstanceOf(EnhancedYouTubeTranscriptApi);
      expect(YouTubeTranscriptApi).toHaveBeenCalled();
    });

    it('should pass EnhancedProxyConfig to base API when proxy is enabled', () => {
      new EnhancedYouTubeTranscriptApi({
        enabled: true,
        http: 'http://proxy.example.com:8080',
      });

      expect(YouTubeTranscriptApi).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            enabled: true,
            http: 'http://proxy.example.com:8080',
          }),
        })
      );
    });

    it('should not pass proxy config to base API when proxy is disabled', () => {
      new EnhancedYouTubeTranscriptApi({ enabled: false });

      expect(YouTubeTranscriptApi).toHaveBeenCalled();
      expect((YouTubeTranscriptApi as jest.Mock).mock.calls[0]![0]).toBeUndefined();
    });
  });

  describe('setProxyOptions', () => {
    it('should re-create base API with proxy when enabled', () => {
      const api = new EnhancedYouTubeTranscriptApi();
      (YouTubeTranscriptApi as jest.Mock).mockClear();

      api.setProxyOptions({
        enabled: true,
        http: 'http://newproxy.example.com:8080',
      });

      expect(YouTubeTranscriptApi).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            enabled: true,
            http: 'http://newproxy.example.com:8080',
          }),
        })
      );
    });

    it('should re-create base API without proxy when disabled', () => {
      const api = new EnhancedYouTubeTranscriptApi({
        enabled: true,
        http: 'http://proxy.example.com:8080',
      });
      (YouTubeTranscriptApi as jest.Mock).mockClear();

      api.setProxyOptions({ enabled: false });

      expect(YouTubeTranscriptApi).toHaveBeenCalled();
      expect((YouTubeTranscriptApi as jest.Mock).mock.calls[0]![0]).toBeUndefined();
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
      expect((result as FetchedTranscript).snippets).toHaveLength(1);
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

    it('should apply formatter when formatter param is provided', async () => {
      const mockTranscript = { snippets: [{ text: 'Hello', start: 0, duration: 1 }] };
      const mockBaseApi = {
        fetch: jest.fn().mockResolvedValue(mockTranscript),
        list: jest.fn(),
      };

      (YouTubeTranscriptApi as jest.Mock).mockImplementation(() => mockBaseApi);

      const mockFormatTranscript = jest.fn().mockReturnValue('formatted output');
      const mockLoad = jest.fn().mockReturnValue({ formatTranscript: mockFormatTranscript });
      (FormatterLoader as unknown as jest.Mock).mockImplementation(() => ({ load: mockLoad }));

      const api = new EnhancedYouTubeTranscriptApi();
      const result = await api.fetch('test123', ['en'], false, 'json');

      expect(mockLoad).toHaveBeenCalledWith('json');
      expect(mockFormatTranscript).toHaveBeenCalledWith(mockTranscript);
      expect(result).toBe('formatted output');
    });

    it('should return raw transcript when formatter is not provided', async () => {
      const mockTranscript = { snippets: [{ text: 'Hello', start: 0, duration: 1 }] };
      const mockBaseApi = {
        fetch: jest.fn().mockResolvedValue(mockTranscript),
        list: jest.fn(),
      };

      (YouTubeTranscriptApi as jest.Mock).mockImplementation(() => mockBaseApi);

      const api = new EnhancedYouTubeTranscriptApi();
      const result = await api.fetch('test123');

      expect(result).toBe(mockTranscript);
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
    it('should return mapped metadata from baseApi.list()', async () => {
      const mockBaseApi = {
        fetch: jest.fn(),
        list: jest.fn().mockResolvedValue({
          metadata: {
            videoId: 'test123',
            title: 'Test Video',
            lengthSeconds: '300',
            channelId: 'UCtest',
            shortDescription: 'A test description',
            thumbnail: { thumbnails: [] },
            viewCount: '12345',
            author: 'Test Author',
            isLiveContent: false,
          },
        }),
      };

      (YouTubeTranscriptApi as jest.Mock).mockImplementation(() => mockBaseApi);

      const api = new EnhancedYouTubeTranscriptApi();
      const metadata = await api.getVideoMetadata('test123');

      expect(mockBaseApi.list).toHaveBeenCalledWith('test123');
      expect(metadata).toEqual({
        id: 'test123',
        title: 'Test Video',
        description: 'A test description',
        author: 'Test Author',
        channelId: 'UCtest',
        lengthSeconds: 300,
        viewCount: 12345,
        isLiveContent: false,
      });
    });

    it('should throw YouTubeTranscriptApiException when metadata is undefined', async () => {
      const mockBaseApi = {
        fetch: jest.fn(),
        list: jest.fn().mockResolvedValue({ metadata: undefined }),
      };

      (YouTubeTranscriptApi as jest.Mock).mockImplementation(() => mockBaseApi);

      const api = new EnhancedYouTubeTranscriptApi();

      await expect(api.getVideoMetadata('test123')).rejects.toThrow(
        YouTubeTranscriptApiException
      );
      await expect(api.getVideoMetadata('test123')).rejects.toThrow(
        'Could not retrieve metadata for video: test123'
      );
    });

    it('should use fallback values for missing fields', async () => {
      const mockBaseApi = {
        fetch: jest.fn(),
        list: jest.fn().mockResolvedValue({
          metadata: {
            videoId: 'test123',
            title: '',
            lengthSeconds: '',
            channelId: '',
            shortDescription: '',
            thumbnail: { thumbnails: [] },
            viewCount: '',
            author: '',
            isLiveContent: undefined,
          },
        }),
      };

      (YouTubeTranscriptApi as jest.Mock).mockImplementation(() => mockBaseApi);

      const api = new EnhancedYouTubeTranscriptApi();
      const metadata = await api.getVideoMetadata('test123');

      expect(metadata.title).toBe('');
      expect(metadata.description).toBe('');
      expect(metadata.author).toBe('');
      expect(metadata.channelId).toBe('');
      expect(metadata.lengthSeconds).toBe(0);
      expect(metadata.viewCount).toBe(0);
      expect(metadata.isLiveContent).toBe(false);
    });

    it('should fall back to argument videoId when metadata.videoId is missing', async () => {
      const mockBaseApi = {
        fetch: jest.fn(),
        list: jest.fn().mockResolvedValue({
          metadata: {
            videoId: '',
            title: 'Some Video',
            lengthSeconds: '60',
            channelId: 'UC123',
            shortDescription: '',
            thumbnail: { thumbnails: [] },
            viewCount: '0',
            author: 'Author',
            isLiveContent: false,
          },
        }),
      };

      (YouTubeTranscriptApi as jest.Mock).mockImplementation(() => mockBaseApi);

      const api = new EnhancedYouTubeTranscriptApi();
      const metadata = await api.getVideoMetadata('myVideoId');

      expect(metadata.id).toBe('myVideoId');
    });

    it('should propagate errors from baseApi.list()', async () => {
      const mockBaseApi = {
        fetch: jest.fn(),
        list: jest.fn().mockRejectedValue(new Error('Video unavailable')),
      };

      (YouTubeTranscriptApi as jest.Mock).mockImplementation(() => mockBaseApi);

      const api = new EnhancedYouTubeTranscriptApi();

      await expect(api.getVideoMetadata('test123')).rejects.toThrow('Video unavailable');
    });
  });
});
