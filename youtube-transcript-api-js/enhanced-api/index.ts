import { YouTubeTranscriptApi } from '../api';
import { ProxyOptions, EnhancedProxyConfig } from '../proxies';
import { YouTubeTranscriptApiException } from '../errors';
import { FormatterLoader } from '../formatters';
import { FetchedTranscript } from '../transcripts/models';

/**
 * Normalized video metadata returned by getVideoMetadata()
 */
export interface VideoMetadataResult {
  id: string;
  title: string;
  description: string;
  author: string;
  channelId: string;
  lengthSeconds: number;
  viewCount: number;
  isLiveContent: boolean;
}

/**
 * YouTube Transcript API with proxy support, formatter output, and video metadata
 */
export class EnhancedYouTubeTranscriptApi {
  private baseApi: YouTubeTranscriptApi;
  private proxyOptions: ProxyOptions;

  constructor(proxyOptions: Partial<ProxyOptions> = {}) {
    this.proxyOptions = {
      enabled: false,
      http: '',
      https: '',
      ...proxyOptions,
    };

    this.baseApi = this.createBaseApi();
  }

  /**
   * Create base API instance with proxy config if enabled
   */
  private createBaseApi(): YouTubeTranscriptApi {
    if (this.proxyOptions.enabled) {
      const proxyConfig = new EnhancedProxyConfig(this.proxyOptions);
      return new YouTubeTranscriptApi(proxyConfig);
    }
    return new YouTubeTranscriptApi();
  }

  /**
   * Configure proxy settings
   */
  public setProxyOptions(options: Partial<ProxyOptions>): void {
    this.proxyOptions = { ...this.proxyOptions, ...options };
    this.baseApi = this.createBaseApi();
  }

  /**
   * Fetch transcript, optionally formatted with a named formatter
   */
  public async fetch(
    videoId: string,
    languages: string[] = ['en'],
    preserveFormatting: boolean = false,
    formatter?: string
  ): Promise<FetchedTranscript | string> {
    const transcript = await this.baseApi.fetch(videoId, languages, preserveFormatting);

    if (formatter) {
      const loader = new FormatterLoader();
      return loader.load(formatter).formatTranscript(transcript);
    }

    return transcript;
  }

  /**
   * List available transcripts
   */
  public async list(videoId: string) {
    return await this.baseApi.list(videoId);
  }

  /**
   * Get video metadata from the Innertube API response
   */
  public async getVideoMetadata(videoId: string): Promise<VideoMetadataResult> {
    const transcriptList = await this.baseApi.list(videoId);
    const metadata = transcriptList.metadata;

    if (!metadata) {
      throw new YouTubeTranscriptApiException(`Could not retrieve metadata for video: ${videoId}`);
    }

    return {
      id: metadata.videoId || videoId,
      title: metadata.title || '',
      description: metadata.shortDescription || '',
      author: metadata.author || '',
      channelId: metadata.channelId || '',
      lengthSeconds: parseInt(metadata.lengthSeconds, 10) || 0,
      viewCount: parseInt(metadata.viewCount, 10) || 0,
      isLiveContent: metadata.isLiveContent ?? false,
    };
  }
}
