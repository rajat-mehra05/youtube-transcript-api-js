import axios, { AxiosInstance } from 'axios';
import { TranscriptListFetcher } from '../transcripts/fetcher';
import { TranscriptList, FetchedTranscript } from '../transcripts/models';
import { ProxyConfig } from '../proxies';
import { InvalidProxyUrl, InvalidVideoId } from '../errors';

/**
 * Main YouTube Transcript API class
 */
export class YouTubeTranscriptApi {
  private readonly fetcher: TranscriptListFetcher;

  constructor(proxyConfig?: ProxyConfig, httpClient?: AxiosInstance) {
    const client = httpClient || this.createHttpClient(proxyConfig);
    this.fetcher = new TranscriptListFetcher(client, proxyConfig);
  }

  /**
   * Create HTTP client with proper configuration
   */
  private createHttpClient(proxyConfig?: ProxyConfig): AxiosInstance {
    const client = axios.create({
      timeout: 10000,
      headers: {
        'Accept-Language': 'en-US',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (proxyConfig) {
      const proxyConfigDict = proxyConfig.toRequestsConfig();
      
      // Configure proxy
      client.defaults.proxy = false; // Disable axios proxy handling
      
      // Add proxy configuration to request interceptor
      client.interceptors.request.use((config) => {
        if (proxyConfigDict.http || proxyConfigDict.https) {
          const proxyUrl = proxyConfigDict.https || proxyConfigDict.http!;
          const auth = this.extractProxyAuth(proxyUrl);
          
          config.proxy = {
            protocol: 'http',
            host: this.extractProxyHost(proxyUrl),
            port: this.extractProxyPort(proxyUrl),
            ...(auth && { auth })
          };
        }
        return config;
      });

      // Prevent keeping connections alive for rotating proxies
      if (proxyConfig.preventKeepingConnectionsAlive) {
        client.defaults.headers.common['Connection'] = 'close';
      }
    }

    return client;
  }

  /**
   * Extract proxy host from URL
   */
  private extractProxyHost(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      throw new InvalidProxyUrl(url, 'Unable to parse hostname from URL');
    }
  }

  /**
   * Extract proxy port from URL
   */
  private extractProxyPort(url: string): number {
    try {
      const urlObj = new URL(url);
      return parseInt(urlObj.port) || 80;
    } catch {
      throw new InvalidProxyUrl(url, 'Unable to parse port from URL');
    }
  }

  /**
   * Extract proxy authentication from URL
   */
  private extractProxyAuth(url: string): { username: string; password: string } | undefined {
    try {
      const urlObj = new URL(url);
      if (urlObj.username && urlObj.password) {
        return {
          username: urlObj.username,
          password: urlObj.password
        };
      }
      return undefined;
    } catch {
      throw new InvalidProxyUrl(url, 'Unable to parse authentication from URL');
    }
  }

  /**
   * Validate video ID format
   */
  private validateVideoId(videoId: string | null | undefined): string {
    if (!videoId || typeof videoId !== 'string') {
      throw new InvalidVideoId(String(videoId));
    }
    const trimmed = videoId.trim();
    if (trimmed === '') {
      throw new InvalidVideoId('');
    }
    // Case-insensitive URL detection - reject URLs, defer other validation to API
    const lowerCased = trimmed.toLowerCase();
    if (lowerCased.includes('youtube.com') || lowerCased.includes('youtu.be')) {
      throw new InvalidVideoId(trimmed);
    }
    return trimmed;
  }

  /**
   * Fetch transcript for a single video (shortcut method)
   */
  async fetch(
    videoId: string,
    languages: string[] = ['en'],
    preserveFormatting: boolean = false
  ): Promise<FetchedTranscript> {
    const validatedId = this.validateVideoId(videoId);
    const transcriptList = await this.list(validatedId);
    const transcript = transcriptList.findTranscript(languages);
    return transcript.fetch(preserveFormatting);
  }

  /**
   * Get list of available transcripts for a video
   */
  async list(videoId: string): Promise<TranscriptList> {
    const validatedId = this.validateVideoId(videoId);
    return this.fetcher.fetch(validatedId);
  }
}

/**
 * Convenience function to create a new API instance
 */
export function createYouTubeTranscriptApi(proxyConfig?: ProxyConfig, httpClient?: AxiosInstance): YouTubeTranscriptApi {
  return new YouTubeTranscriptApi(proxyConfig, httpClient);
}

/**
 * Default export
 */
export default YouTubeTranscriptApi;
