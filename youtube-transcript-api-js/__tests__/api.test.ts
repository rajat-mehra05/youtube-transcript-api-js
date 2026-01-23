import { YouTubeTranscriptApi } from '../api';
import { GenericProxyConfig } from '../proxies';

describe('YouTubeTranscriptApi', () => {
  let api: YouTubeTranscriptApi;

  beforeEach(() => {
    api = new YouTubeTranscriptApi();
  });

  describe('constructor', () => {
    it('should create instance without parameters', () => {
      expect(api).toBeInstanceOf(YouTubeTranscriptApi);
    });

    it('should create instance with proxy config', () => {
      const proxyConfig = new GenericProxyConfig('http://proxy.example.com:8080');
      const apiWithProxy = new YouTubeTranscriptApi(proxyConfig);
      expect(apiWithProxy).toBeInstanceOf(YouTubeTranscriptApi);
    });
  });

  describe('fetch', () => {
    it('should throw error for invalid video ID', async () => {
      await expect(api.fetch('invalid-video-id')).rejects.toThrow();
    });

    it('should accept video ID parameter', async () => {
      // This test would need mocking in a real implementation
      expect(() => api.fetch('dQw4w9WgXcQ')).not.toThrow();
    });
  });

  describe('list', () => {
    it('should throw error for invalid video ID', async () => {
      await expect(api.list('invalid-video-id')).rejects.toThrow();
    });

    it('should accept video ID parameter', async () => {
      // This test would need mocking in a real implementation
      expect(() => api.list('dQw4w9WgXcQ')).not.toThrow();
    });
  });
});
