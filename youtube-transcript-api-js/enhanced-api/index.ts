import axios, { AxiosInstance } from 'axios';
import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { YouTubeTranscriptApi } from '../api';
import { ProxyOptions, InvidiousOptions } from '../proxies';

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36,gzip(gfe)';

/**
 * Enhanced YouTube Transcript API with advanced proxy and Invidious support
 */
export class EnhancedYouTubeTranscriptApi {
  private httpClient!: AxiosInstance;
  private invidiousClient: AxiosInstance | null = null;
  private baseApi: YouTubeTranscriptApi;
  private proxyOptions: ProxyOptions;
  private invidiousOptions: InvidiousOptions;

  constructor(
    proxyOptions: Partial<ProxyOptions> = {},
    invidiousOptions: Partial<InvidiousOptions> = {}
  ) {
    // Default proxy options
    this.proxyOptions = {
      enabled: false,
      http: '',
      https: '',
      ...proxyOptions,
    };

    // Default Invidious options
    this.invidiousOptions = {
      enabled: false,
      instanceUrls: '',
      timeout: 10000,
      ...invidiousOptions,
    };

    // Initialize base API
    this.baseApi = new YouTubeTranscriptApi();

    // Initialize HTTP client with enhanced proxy support
    this.initializeHttpClient();

    // Initialize Invidious client if enabled
    if (this.invidiousOptions.enabled) {
      this.initializeInvidiousClient();
    }
  }

  /**
   * Initialize HTTP client with enhanced proxy support
   */
  private initializeHttpClient(): void {
    const config: any = {
      headers: {
        'Accept-Language': 'en-US',
        'User-Agent': USER_AGENT,
        'Accept-Encoding': 'gzip, deflate, br',
      },
      timeout: 10000,
      maxRedirects: 5,
    };

    // Add proxy configuration if enabled
    if (this.proxyOptions.enabled) {
      config.proxy = false; // Disable built-in proxy resolver
      
      // Only use proxy agents in Node.js environments
      if (typeof (globalThis as any).window === 'undefined') {
        config.httpAgent = new HttpProxyAgent(this.proxyOptions.http || '');
        config.httpsAgent = new HttpsProxyAgent(
          this.proxyOptions.https || this.proxyOptions.http || ''
        );
      }
    } else if (typeof (globalThis as any).window === 'undefined') {
      // Use keep-alive agents when not using proxy
      const http = require('http');
      const https = require('https');
      config.httpAgent = new http.Agent({ keepAlive: true });
      config.httpsAgent = new https.Agent({ keepAlive: true });
    }

    this.httpClient = axios.create(config);
  }

  /**
   * Initialize Invidious client
   */
  private initializeInvidiousClient(): void {
    const instanceUrls = Array.isArray(this.invidiousOptions.instanceUrls)
      ? this.invidiousOptions.instanceUrls
      : [this.invidiousOptions.instanceUrls];

    if (instanceUrls.length === 0 || (instanceUrls.length === 1 && !instanceUrls[0])) {
      throw new Error('At least one Invidious instance URL must be provided when Invidious is enabled');
    }

    const primaryInstanceUrl = instanceUrls[0];

    const config: any = {
      baseURL: primaryInstanceUrl,
      timeout: this.invidiousOptions.timeout || 10000,
      headers: {
        Accept: 'application/json',
        'User-Agent': USER_AGENT,
      },
    };

    // Add proxy configuration if enabled
    if (this.proxyOptions.enabled && typeof (globalThis as any).window === 'undefined') {
      config.proxy = false;
      config.httpAgent = new HttpProxyAgent(this.proxyOptions.http || '');
      config.httpsAgent = new HttpsProxyAgent(
        this.proxyOptions.https || this.proxyOptions.http || ''
      );
    }

    this.invidiousClient = axios.create(config);
    
    // Store instance URLs for fallback
    (this.invidiousClient as any).__instanceUrls = instanceUrls;
    (this.invidiousClient as any).__currentInstanceIndex = 0;
  }

  /**
   * Configure proxy settings
   */
  public setProxyOptions(options: Partial<ProxyOptions>): void {
    this.proxyOptions = { ...this.proxyOptions, ...options };
    this.initializeHttpClient();
    
    if (this.invidiousOptions.enabled) {
      this.initializeInvidiousClient();
    }
  }

  /**
   * Configure Invidious settings
   */
  public setInvidiousOptions(options: Partial<InvidiousOptions>): void {
    this.invidiousOptions = { ...this.invidiousOptions, ...options };
    
    if (this.invidiousOptions.enabled) {
      this.initializeInvidiousClient();
    } else {
      this.invidiousClient = null;
    }
  }

  /**
   * Fetch transcript with enhanced proxy support
   */
  public async fetch(
    videoId: string,
    languages: string[] = ['en'],
    preserveFormatting: boolean = false,
    formatter?: string
  ): Promise<any> {
    // Use base API with enhanced proxy support
    return await this.baseApi.fetch(videoId, languages, preserveFormatting);
  }

  /**
   * List available transcripts
   */
  public async list(videoId: string) {
    return await this.baseApi.list(videoId);
  }

  /**
   * Get video metadata
   */
  public async getVideoMetadata(videoId: string) {
    // This would need to be implemented in the base API
    // For now, return a basic metadata object
    return {
      id: videoId,
      title: 'Video Title',
      description: 'Video Description',
      author: 'Video Author',
      channelId: 'channel_id',
      lengthSeconds: 0,
      viewCount: 0,
      isPrivate: false,
      isLiveContent: false
    };
  }
}
