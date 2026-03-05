import { AxiosError, AxiosInstance } from 'axios';
import {
  NotTranslatable,
  TranslationLanguageNotAvailable,
  PoTokenRequired,
  NoTranscriptFound,
  RateLimitExceeded,
  NetworkError,
  TimeoutError,
  ConnectionError
} from '../errors';

/**
 * Parses the Retry-After header value which can be either seconds or an HTTP-date
 */
function parseRetryAfter(retryAfter: string | undefined): number | undefined {
  if (!retryAfter) {
    return undefined;
  }

  // First, try parsing as an integer (seconds)
  const seconds = parseInt(retryAfter, 10);
  if (!isNaN(seconds)) {
    return seconds;
  }

  // Try parsing as an HTTP-date
  const dateMs = Date.parse(retryAfter);
  if (!isNaN(dateMs)) {
    const secondsUntil = Math.ceil((dateMs - Date.now()) / 1000);
    return secondsUntil > 0 ? secondsUntil : undefined;
  }

  return undefined;
}

/**
 * Wraps axios errors with contextual error classes
 */
function wrapNetworkError(error: unknown, url: string, videoId: string): never {
  if (error instanceof AxiosError) {
    // Handle HTTP status codes
    if (error.response) {
      const status = error.response.status;

      if (status === 429) {
        const retryAfter = error.response.headers['retry-after'];
        const retryAfterSeconds = parseRetryAfter(retryAfter);
        throw new RateLimitExceeded(videoId, retryAfterSeconds);
      }
    }

    // Handle network-level errors
    if (error.code) {
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        const timeout = error.config?.timeout || 0;
        throw new TimeoutError(url, timeout);
      }

      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ENETUNREACH') {
        throw new ConnectionError(url, error.code);
      }

      throw new NetworkError(`Request to ${url} failed: ${error.message}`, error.code);
    }

    // Generic axios error
    throw new NetworkError(`Request to ${url} failed: ${error.message}`);
  }

  // Re-throw non-axios errors
  throw error;
}

/**
 * Video metadata extracted from the Innertube API response
 */
export interface VideoMetadata {
  videoId: string;
  title: string;
  lengthSeconds: string;
  channelId: string;
  shortDescription: string;
  thumbnail: { thumbnails: Array<{ url: string; width: number; height: number }> };
  viewCount: string;
  author: string;
  isLiveContent: boolean;
}

/**
 * Represents a single transcript snippet with timing information
 */
export class FetchedTranscriptSnippet {
  public readonly text: string;
  public readonly start: number;
  public readonly duration: number;

  constructor(text: string, start: number, duration: number) {
    this.text = text;
    this.start = start;
    this.duration = duration;
  }

  /**
   * Convert to plain object for serialization
   */
  toRawData(): { text: string; start: number; duration: number } {
    return {
      text: this.text,
      start: this.start,
      duration: this.duration
    };
  }
}

/**
 * Represents a fetched transcript containing multiple snippets
 */
export class FetchedTranscript {
  public readonly snippets: FetchedTranscriptSnippet[];
  public readonly videoId: string;
  public readonly language: string;
  public readonly languageCode: string;
  public readonly isGenerated: boolean;
  public readonly metadata: VideoMetadata | undefined;

  constructor(
    snippets: FetchedTranscriptSnippet[],
    videoId: string,
    language: string,
    languageCode: string,
    isGenerated: boolean,
    metadata?: VideoMetadata
  ) {
    this.snippets = snippets;
    this.videoId = videoId;
    this.language = language;
    this.languageCode = languageCode;
    this.isGenerated = isGenerated;
    this.metadata = metadata;
  }

  /**
   * Get snippet at specific index
   */
  getSnippet(index: number): FetchedTranscriptSnippet | undefined {
    return this.snippets[index];
  }

  /**
   * Get total number of snippets
   */
  get length(): number {
    return this.snippets.length;
  }

  /**
   * Convert to plain object for serialization
   */
  toRawData(): Array<{ text: string; start: number; duration: number }> {
    return this.snippets.map(snippet => snippet.toRawData());
  }

  /**
   * Iterator for snippets
   */
  *[Symbol.iterator](): Iterator<FetchedTranscriptSnippet> {
    for (const snippet of this.snippets) {
      yield snippet;
    }
  }
}

/**
 * Represents a translation language option
 */
export class TranslationLanguage {
  public readonly language: string;
  public readonly languageCode: string;

  constructor(language: string, languageCode: string) {
    this.language = language;
    this.languageCode = languageCode;
  }
}

/**
 * Represents an individual transcript with metadata
 */
export class Transcript {
  public readonly videoId: string;
  public readonly language: string;
  public readonly languageCode: string;
  public readonly isGenerated: boolean;
  public readonly translationLanguages: TranslationLanguage[];
  public readonly metadata: VideoMetadata | undefined;

  private readonly httpClient: AxiosInstance;
  private readonly url: string;
  private readonly translationLanguagesDict: Map<string, string>;

  constructor(
    httpClient: AxiosInstance,
    videoId: string,
    url: string,
    language: string,
    languageCode: string,
    isGenerated: boolean,
    translationLanguages: TranslationLanguage[],
    metadata?: VideoMetadata
  ) {
    this.httpClient = httpClient;
    this.videoId = videoId;
    this.url = url;
    this.language = language;
    this.languageCode = languageCode;
    this.isGenerated = isGenerated;
    this.translationLanguages = translationLanguages;
    this.metadata = metadata;

    this.translationLanguagesDict = new Map(
      translationLanguages.map(tl => [tl.languageCode, tl.language])
    );
  }

  /**
   * Check if this transcript can be translated
   */
  get isTranslatable(): boolean {
    return this.translationLanguages.length > 0;
  }

  /**
   * Fetch the actual transcript data
   */
  async fetch(preserveFormatting: boolean = false): Promise<FetchedTranscript> {
    if (this.url.includes('&exp=xpe')) {
      throw new PoTokenRequired(this.videoId);
    }

    let response;
    try {
      response = await this.httpClient.get(this.url);
    } catch (error) {
      wrapNetworkError(error, this.url, this.videoId);
    }
    const snippets = await this.parseTranscript(response.data, preserveFormatting);

    return new FetchedTranscript(
      snippets,
      this.videoId,
      this.language,
      this.languageCode,
      this.isGenerated,
      this.metadata
    );
  }

  /**
   * Translate this transcript to another language
   */
  translate(languageCode: string): Transcript {
    if (!this.isTranslatable) {
      throw new NotTranslatable(this.videoId);
    }

    if (!this.translationLanguagesDict.has(languageCode)) {
      throw new TranslationLanguageNotAvailable(this.videoId);
    }

    const translatedUrl = `${this.url}&tlang=${languageCode}`;
    const translatedLanguage = this.translationLanguagesDict.get(languageCode)!;

    return new Transcript(
      this.httpClient,
      this.videoId,
      translatedUrl,
      translatedLanguage,
      languageCode,
      true, // Translated transcripts are always generated
      [], // Translated transcripts can't be further translated
      this.metadata
    );
  }

  /**
   * Parse transcript XML data into snippets
   */
  private async parseTranscript(rawData: string, preserveFormatting: boolean): Promise<FetchedTranscriptSnippet[]> {
    const { parseTranscriptXml } = await import('./parser');
    return parseTranscriptXml(rawData, preserveFormatting);
  }

  /**
   * String representation
   */
  toString(): string {
    const translationDescription = this.isTranslatable ? '[TRANSLATABLE]' : '';
    return `${this.languageCode} ("${this.language}")${translationDescription}`;
  }
}

/**
 * Represents a list of available transcripts for a video
 */
export class TranscriptList {
  public readonly videoId: string;
  public readonly metadata: VideoMetadata | undefined;
  private readonly manuallyCreatedTranscripts: Map<string, Transcript>;
  private readonly generatedTranscripts: Map<string, Transcript>;
  private readonly translationLanguages: TranslationLanguage[];

  constructor(
    videoId: string,
    manuallyCreatedTranscripts: Map<string, Transcript>,
    generatedTranscripts: Map<string, Transcript>,
    translationLanguages: TranslationLanguage[],
    metadata?: VideoMetadata
  ) {
    this.videoId = videoId;
    this.manuallyCreatedTranscripts = manuallyCreatedTranscripts;
    this.generatedTranscripts = generatedTranscripts;
    this.translationLanguages = translationLanguages;
    this.metadata = metadata;
  }

  /**
   * Find a transcript by language codes (prioritizes manually created)
   */
  findTranscript(languageCodes: string[]): Transcript {
    return this.findTranscriptInSources(languageCodes, [
      this.manuallyCreatedTranscripts,
      this.generatedTranscripts
    ]);
  }

  /**
   * Find only generated transcripts
   */
  findGeneratedTranscript(languageCodes: string[]): Transcript {
    return this.findTranscriptInSources(languageCodes, [this.generatedTranscripts]);
  }

  /**
   * Find only manually created transcripts
   */
  findManuallyCreatedTranscript(languageCodes: string[]): Transcript {
    return this.findTranscriptInSources(languageCodes, [this.manuallyCreatedTranscripts]);
  }

  /**
   * Internal method to find transcript in specified sources
   */
  private findTranscriptInSources(
    languageCodes: string[],
    transcriptSources: Map<string, Transcript>[]
  ): Transcript {
    for (const languageCode of languageCodes) {
      for (const transcriptSource of transcriptSources) {
        if (transcriptSource.has(languageCode)) {
          return transcriptSource.get(languageCode)!;
        }
      }
    }

    throw new NoTranscriptFound(this.videoId, languageCodes, this.toString());
  }

  /**
   * Get all transcripts as an array
   */
  getAllTranscripts(): Transcript[] {
    return [
      ...this.manuallyCreatedTranscripts.values(),
      ...this.generatedTranscripts.values()
    ];
  }

  /**
   * Iterator for all transcripts
   */
  *[Symbol.iterator](): Iterator<Transcript> {
    for (const transcript of this.manuallyCreatedTranscripts.values()) {
      yield transcript;
    }
    for (const transcript of this.generatedTranscripts.values()) {
      yield transcript;
    }
  }

  /**
   * String representation
   */
  toString(): string {
    const manuallyCreated = Array.from(this.manuallyCreatedTranscripts.values())
      .map(t => ` - ${t.toString()}`)
      .join('\n');
    
    const generated = Array.from(this.generatedTranscripts.values())
      .map(t => ` - ${t.toString()}`)
      .join('\n');
    
    const translations = this.translationLanguages
      .map(tl => ` - ${tl.languageCode} ("${tl.language}")`)
      .join('\n');

    return `For this video (${this.videoId}) transcripts are available in the following languages:\n\n` +
           `(MANUALLY CREATED)\n${manuallyCreated || 'None'}\n\n` +
           `(GENERATED)\n${generated || 'None'}\n\n` +
           `(TRANSLATION LANGUAGES)\n${translations || 'None'}`;
  }
}
