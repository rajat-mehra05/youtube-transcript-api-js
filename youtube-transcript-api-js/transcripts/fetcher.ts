import { AxiosInstance } from 'axios';
import { TranscriptList, Transcript, TranslationLanguage, VideoMetadata } from './models';
import { ProxyConfig } from '../proxies';
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
  RateLimitExceeded
} from '../errors';
import { RetryConfig, DEFAULT_RETRY_CONFIG, isRetryableError, calculateDelay, sleep } from '../retry';
import {
  WATCH_URL,
  INNERTUBE_API_URL,
  INNERTUBE_CONTEXT,
  PLAYABILITY_STATUS,
  PLAYABILITY_FAILED_REASON
} from './constants';
import { wrapNetworkError } from './network-errors';

/**
 * Handles fetching transcript lists from YouTube
 */
export class TranscriptListFetcher {
  private readonly httpClient: AxiosInstance;
  private readonly proxyConfig: ProxyConfig | undefined;
  private readonly retryConfig: RetryConfig;

  constructor(httpClient: AxiosInstance, proxyConfig?: ProxyConfig, retryConfig?: Partial<RetryConfig>) {
    this.httpClient = httpClient;
    this.proxyConfig = proxyConfig;

    const rawMaxRetries = retryConfig?.maxRetries
      ?? (proxyConfig?.retriesWhenBlocked ?? DEFAULT_RETRY_CONFIG.maxRetries);

    // Sanitize all numeric fields: finite + non-negative, fall back to defaults if invalid
    const clampNonNeg = (val: number | undefined, fallback: number) =>
      val !== undefined && Number.isFinite(val) && val >= 0 ? val : fallback;

    const effectiveMaxRetries = clampNonNeg(rawMaxRetries, DEFAULT_RETRY_CONFIG.maxRetries);
    const baseDelayMs = clampNonNeg(retryConfig?.baseDelayMs, DEFAULT_RETRY_CONFIG.baseDelayMs);
    const maxDelayMs = clampNonNeg(retryConfig?.maxDelayMs, DEFAULT_RETRY_CONFIG.maxDelayMs);
    const effectiveBaseDelay = Math.min(baseDelayMs, maxDelayMs);
    const jitterFactor = retryConfig?.jitterFactor !== undefined
      && Number.isFinite(retryConfig.jitterFactor)
      && retryConfig.jitterFactor >= 0 && retryConfig.jitterFactor <= 1
      ? retryConfig.jitterFactor
      : DEFAULT_RETRY_CONFIG.jitterFactor;

    this.retryConfig = {
      maxRetries: Math.floor(effectiveMaxRetries),
      baseDelayMs: effectiveBaseDelay,
      maxDelayMs,
      jitterFactor,
    };
  }

  /**
   * Fetch transcript list for a video
   */
  async fetch(videoId: string): Promise<TranscriptList> {
    const { captionsJson, videoDetails } = await this.fetchCaptionsJson(videoId);
    return this.buildTranscriptList(videoId, captionsJson, videoDetails);
  }

  /**
   * Fetch captions JSON data from YouTube with retry + exponential backoff
   */
  private async fetchCaptionsJson(videoId: string): Promise<{ captionsJson: Record<string, unknown>; videoDetails?: VideoMetadata }> {
    const maxAttempts = this.retryConfig.maxRetries + 1;
    let lastError: unknown;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const html = await this.fetchVideoHtml(videoId);
        const apiKey = this.extractInnertubeApiKey(html, videoId);
        const innertubeData = await this.fetchInnertubeData(videoId, apiKey);
        return this.extractCaptionsJson(innertubeData, videoId);
      } catch (error) {
        lastError = error;

        if (!isRetryableError(error) || attempt === maxAttempts - 1) {
          if (error instanceof RequestBlocked) {
            throw error.withProxyConfig(this.proxyConfig);
          }
          throw error;
        }

        const retryAfter = error instanceof RateLimitExceeded ? error.retryAfter : undefined;
        const delay = calculateDelay(attempt, this.retryConfig, retryAfter);
        await sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Extract Innertube API key from HTML
   */
  private extractInnertubeApiKey(html: string, videoId: string): string {
    const pattern = /"INNERTUBE_API_KEY":\s*"([a-zA-Z0-9_-]+)"/;
    const match = html.match(pattern);
    
    if (match && match[1]) {
      return match[1];
    }
    
    if (html.includes('class="g-recaptcha"')) {
      throw new IpBlocked(videoId);
    }
    
    throw new YouTubeDataUnparsable(videoId);
  }

  /**
   * Extract captions JSON from Innertube data
   */
  private extractCaptionsJson(innertubeData: Record<string, any>, videoId: string): { captionsJson: Record<string, any>; videoDetails?: VideoMetadata } {
    this.assertPlayability(innertubeData.playabilityStatus, videoId);

    const captionsJson = innertubeData.captions?.playerCaptionsTracklistRenderer;
    if (!captionsJson || !captionsJson.captionTracks) {
      throw new TranscriptsDisabled(videoId);
    }

    return { captionsJson, videoDetails: innertubeData.videoDetails || undefined };
  }

  /**
   * Assert video playability status
   */
  private assertPlayability(playabilityStatusData: Record<string, any>, videoId: string): void {
    const playabilityStatus = playabilityStatusData?.status;
    
    if (playabilityStatus && playabilityStatus !== PLAYABILITY_STATUS.OK) {
      const reason = playabilityStatusData.reason;
      
      if (playabilityStatus === PLAYABILITY_STATUS.LOGIN_REQUIRED) {
        if (reason === PLAYABILITY_FAILED_REASON.BOT_DETECTED) {
          throw new RequestBlocked(videoId);
        }
        if (reason === PLAYABILITY_FAILED_REASON.AGE_RESTRICTED) {
          throw new AgeRestricted(videoId);
        }
      }
      
      if (playabilityStatus === PLAYABILITY_STATUS.ERROR && 
          reason === PLAYABILITY_FAILED_REASON.VIDEO_UNAVAILABLE) {
        if (videoId.startsWith('http://') || videoId.startsWith('https://')) {
          throw new InvalidVideoId(videoId);
        }
        throw new VideoUnavailable(videoId);
      }
      
      const subreasons = playabilityStatusData.errorScreen?.playerErrorMessageRenderer?.subreason?.runs || [];
      const subreasonTexts = subreasons.map((run: any) => run.text || '').filter(Boolean);
      
      throw new VideoUnplayable(videoId, reason, subreasonTexts);
    }
  }

  /**
   * Create consent cookie for GDPR compliance
   */
  private createConsentCookie(html: string, videoId: string): void {
    const match = html.match(/name="v" value="(.*?)"/);
    if (!match) {
      throw new FailedToCreateConsentCookie(videoId);
    }
    
    // Replace any existing CONSENT cookie, preserve other cookies
    const consentCookie = `CONSENT=YES+${match[1]}`;
    const existing = this.httpClient.defaults.headers.common['Cookie'];
    if (existing) {
      const filtered = String(existing)
        .split(/;\s*/)
        .filter(token => !token.startsWith('CONSENT='))
        .join('; ');
      this.httpClient.defaults.headers.common['Cookie'] = filtered
        ? `${filtered}; ${consentCookie}`
        : consentCookie;
    } else {
      this.httpClient.defaults.headers.common['Cookie'] = consentCookie;
    }
  }

  /**
   * Fetch video HTML page
   */
  private async fetchVideoHtml(videoId: string): Promise<string> {
    let html = await this.fetchHtml(videoId);
    
    if (html.includes('action="https://consent.youtube.com/s"')) {
      this.createConsentCookie(html, videoId);
      html = await this.fetchHtml(videoId);
      
      if (html.includes('action="https://consent.youtube.com/s"')) {
        throw new FailedToCreateConsentCookie(videoId);
      }
    }
    
    return html;
  }

  /**
   * Fetch HTML content
   */
  private async fetchHtml(videoId: string): Promise<string> {
    const url = WATCH_URL.replace('{videoId}', videoId);
    try {
      const response = await this.httpClient.get(url);
      return this.unescapeHtml(response.data);
    } catch (error) {
      wrapNetworkError(error, url, videoId);
    }
  }

  /**
   * Fetch Innertube API data
   */
  private async fetchInnertubeData(videoId: string, apiKey: string): Promise<Record<string, any>> {
    const url = INNERTUBE_API_URL.replace('{apiKey}', apiKey);
    try {
      const response = await this.httpClient.post(url, {
        context: INNERTUBE_CONTEXT,
        videoId: videoId
      });
      return response.data;
    } catch (error) {
      wrapNetworkError(error, url, videoId);
    }
  }

  /**
   * Build TranscriptList from captions JSON
   */
  private buildTranscriptList(videoId: string, captionsJson: Record<string, any>, videoDetails?: VideoMetadata): TranscriptList {
    const translationLanguages = (captionsJson.translationLanguages || []).map((tl: any) => 
      new TranslationLanguage(
        tl.languageName.runs[0].text,
        tl.languageCode
      )
    );

    const manuallyCreatedTranscripts = new Map<string, Transcript>();
    const generatedTranscripts = new Map<string, Transcript>();

    for (const caption of captionsJson.captionTracks) {
      const isGenerated = caption.kind === 'asr';
      const transcriptMap = isGenerated ? generatedTranscripts : manuallyCreatedTranscripts;
      
      const transcript = new Transcript(
        this.httpClient,
        videoId,
        caption.baseUrl.replace('&fmt=srv3', ''),
        caption.name.runs[0].text,
        caption.languageCode,
        isGenerated,
        caption.isTranslatable ? translationLanguages : [],
        videoDetails
      );
      
      transcriptMap.set(caption.languageCode, transcript);
    }

    return new TranscriptList(
      videoId,
      manuallyCreatedTranscripts,
      generatedTranscripts,
      translationLanguages,
      videoDetails
    );
  }

  /**
   * Unescape HTML entities
   */
  private unescapeHtml(html: string): string {
    return html
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');
  }
}
