/**
 * Base exception class for all YouTube Transcript API errors
 */
export class YouTubeTranscriptApiException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'YouTubeTranscriptApiException';
  }
}

/**
 * Base class for errors that prevent transcript retrieval
 */
export class CouldNotRetrieveTranscript extends YouTubeTranscriptApiException {
  public readonly videoId: string;
  
  protected static readonly ERROR_MESSAGE = '\nCould not retrieve a transcript for the video {videoUrl}!';
  protected static readonly CAUSE_MESSAGE_INTRO = ' This is most likely caused by:\n\n{cause}';
  protected static readonly GITHUB_REFERRAL = 
    '\n\nIf you are sure that the described cause is not responsible for this error ' +
    'and that a transcript should be retrievable, please create an issue at ' +
    'https://github.com/jdepoix/youtube-transcript-api/issues. ' +
    'Please add which version of youtube_transcript_api you are using ' +
    'and provide the information needed to replicate the error. ' +
    'Also make sure that there are no open issues which already describe your problem!';

  constructor(videoId: string) {
    super('');
    this.videoId = videoId;
  }

  protected buildErrorMessage(): string {
    const videoUrl = `https://www.youtube.com/watch?v=${this.videoId}`;
    let errorMessage = CouldNotRetrieveTranscript.ERROR_MESSAGE.replace('{videoUrl}', videoUrl);
    
    const cause = this.getCause();
    if (cause) {
      errorMessage += CouldNotRetrieveTranscript.CAUSE_MESSAGE_INTRO.replace('{cause}', cause) + 
                     CouldNotRetrieveTranscript.GITHUB_REFERRAL;
    }
    
    return errorMessage;
  }

  protected getCause(): string {
    return '';
  }

  toString(): string {
    return this.buildErrorMessage();
  }
}

export class YouTubeDataUnparsable extends CouldNotRetrieveTranscript {
  protected getCause(): string {
    return 'The data required to fetch the transcript is not parsable. This should ' +
           'not happen, please open an issue (make sure to include the video ID)!';
  }
}

export class YouTubeRequestFailed extends CouldNotRetrieveTranscript {
  public readonly reason: string;

  constructor(videoId: string, reason: string) {
    super(videoId);
    this.reason = reason;
  }

  protected getCause(): string {
    return `Request to YouTube failed: ${this.reason}`;
  }
}

export class VideoUnplayable extends CouldNotRetrieveTranscript {
  public readonly reason: string | null;
  public readonly subReasons: string[];

  constructor(videoId: string, reason: string | null, subReasons: string[] = []) {
    super(videoId);
    this.reason = reason;
    this.subReasons = subReasons;
  }

  protected getCause(): string {
    const reasonText = this.reason || 'No reason specified!';
    if (this.subReasons.length > 0) {
      const subReasonsText = this.subReasons.map(r => ` - ${r}`).join('\n');
      return `The video is unplayable for the following reason: ${reasonText}\n\nAdditional Details:\n${subReasonsText}`;
    }
    return `The video is unplayable for the following reason: ${reasonText}`;
  }
}

export class VideoUnavailable extends CouldNotRetrieveTranscript {
  protected getCause(): string {
    return 'The video is no longer available';
  }
}

export class InvalidVideoId extends CouldNotRetrieveTranscript {
  protected getCause(): string {
    return 'You provided an invalid video id. Make sure you are using the video id and NOT the url!\n\n' +
           'Do NOT run: `YouTubeTranscriptApi().fetch("https://www.youtube.com/watch?v=1234")`\n' +
           'Instead run: `YouTubeTranscriptApi().fetch("1234")`';
  }
}

export class RequestBlocked extends CouldNotRetrieveTranscript {
  protected static readonly BASE_CAUSE_MESSAGE = 
    'YouTube is blocking requests from your IP. This usually is due to one of the ' +
    'following reasons:\n' +
    '- You have done too many requests and your IP has been blocked by YouTube\n' +
    '- You are doing requests from an IP belonging to a cloud provider (like AWS, ' +
    'Google Cloud Platform, Azure, etc.). Unfortunately, most IPs from cloud ' +
    'providers are blocked by YouTube.\n\n';

  protected static readonly CAUSE_MESSAGE = 
    RequestBlocked.BASE_CAUSE_MESSAGE +
    'There are two things you can do to work around this:\n' +
    '1. Use proxies to hide your IP address, as explained in the "Working around ' +
    'IP bans" section of the README ' +
    '(https://github.com/jdepoix/youtube-transcript-api' +
    '?tab=readme-ov-file' +
    '#working-around-ip-bans-requestblocked-or-ipblocked-exception).\n' +
    '2. (NOT RECOMMENDED) If you authenticate your requests using cookies, you ' +
    'will be able to continue doing requests for a while. However, YouTube will ' +
    'eventually permanently ban the account that you have used to authenticate ' +
    'with! So only do this if you don\'t mind your account being banned!';

  private _proxyConfig: any = null;

  constructor(videoId: string) {
    super(videoId);
  }

  withProxyConfig(proxyConfig: any): RequestBlocked {
    this._proxyConfig = proxyConfig;
    return this;
  }

  protected getCause(): string {
    if (this._proxyConfig) {
      // Add proxy-specific error messages here
      return RequestBlocked.CAUSE_MESSAGE;
    }
    return RequestBlocked.CAUSE_MESSAGE;
  }
}

export class IpBlocked extends RequestBlocked {
  protected getCause(): string {
    return RequestBlocked.BASE_CAUSE_MESSAGE +
           'Ways to work around this are explained in the "Working around IP ' +
           'bans" section of the README (https://github.com/jdepoix/youtube-transcript-api' +
           '?tab=readme-ov-file' +
           '#working-around-ip-bans-requestblocked-or-ipblocked-exception).\n';
  }
}

export class TranscriptsDisabled extends CouldNotRetrieveTranscript {
  protected getCause(): string {
    return 'Subtitles are disabled for this video';
  }
}

export class AgeRestricted extends CouldNotRetrieveTranscript {
  protected getCause(): string {
    return 'This video is age-restricted. Therefore, you are unable to retrieve ' +
           'transcripts for it without authenticating yourself.\n\n' +
           'Unfortunately, Cookie Authentication is temporarily unsupported in ' +
           'youtube-transcript-api, as recent changes in YouTube\'s API broke the previous ' +
           'implementation. I will do my best to re-implement it as soon as possible.';
  }
}

export class NotTranslatable extends CouldNotRetrieveTranscript {
  protected getCause(): string {
    return 'The requested language is not translatable';
  }
}

export class TranslationLanguageNotAvailable extends CouldNotRetrieveTranscript {
  protected getCause(): string {
    return 'The requested translation language is not available';
  }
}

export class FailedToCreateConsentCookie extends CouldNotRetrieveTranscript {
  protected getCause(): string {
    return 'Failed to automatically give consent to saving cookies';
  }
}

export class NoTranscriptFound extends CouldNotRetrieveTranscript {
  public readonly requestedLanguageCodes: string[];
  public readonly transcriptData: any;

  constructor(videoId: string, requestedLanguageCodes: string[], transcriptData: any) {
    super(videoId);
    this.requestedLanguageCodes = requestedLanguageCodes;
    this.transcriptData = transcriptData;
  }

  protected getCause(): string {
    return `No transcripts were found for any of the requested language codes: ${this.requestedLanguageCodes.join(', ')}\n\n${this.transcriptData}`;
  }
}

export class PoTokenRequired extends CouldNotRetrieveTranscript {
  protected getCause(): string {
    return 'The requested video cannot be retrieved without a PO Token. If this happens, ' +
           'please open a GitHub issue!';
  }
}

// Cookie-related errors (currently disabled)
export class CookieError extends YouTubeTranscriptApiException {
  constructor(message: string) {
    super(message);
    this.name = 'CookieError';
  }
}

export class CookiePathInvalid extends CookieError {
  constructor(cookiePath: string) {
    super(`Can't load the provided cookie file: ${cookiePath}`);
  }
}

export class CookieInvalid extends CookieError {
  constructor(cookiePath: string) {
    super(`The cookies provided are not valid (may have expired): ${cookiePath}`);
  }
}

export class InvalidProxyUrl extends YouTubeTranscriptApiException {
  constructor(url: string, reason: string) {
    super(`Invalid proxy URL "${url}": ${reason}`);
    this.name = 'InvalidProxyUrl';
  }
}
