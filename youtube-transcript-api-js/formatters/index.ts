import { FetchedTranscript } from '../transcripts/models';

/**
 * Base formatter class
 */
export abstract class Formatter {
  /**
   * Format a single transcript
   */
  abstract formatTranscript(transcript: FetchedTranscript, options?: any): string;

  /**
   * Format multiple transcripts
   */
  abstract formatTranscripts(transcripts: FetchedTranscript[], options?: any): string;
}

/**
 * Pretty print formatter
 */
export class PrettyPrintFormatter extends Formatter {
  formatTranscript(transcript: FetchedTranscript, options: any = {}): string {
    return JSON.stringify(transcript.toRawData(), null, 2);
  }

  formatTranscripts(transcripts: FetchedTranscript[], options: any = {}): string {
    return JSON.stringify(
      transcripts.map(t => t.toRawData()),
      null,
      2
    );
  }
}

/**
 * JSON formatter
 */
export class JSONFormatter extends Formatter {
  formatTranscript(transcript: FetchedTranscript, options: any = {}): string {
    return JSON.stringify(transcript.toRawData(), null, options.indent || 0);
  }

  formatTranscripts(transcripts: FetchedTranscript[], options: any = {}): string {
    return JSON.stringify(
      transcripts.map(t => t.toRawData()),
      null,
      options.indent || 0
    );
  }
}

/**
 * Plain text formatter
 */
export class TextFormatter extends Formatter {
  formatTranscript(transcript: FetchedTranscript, options: any = {}): string {
    return transcript.snippets.map(snippet => snippet.text).join('\n');
  }

  formatTranscripts(transcripts: FetchedTranscript[], options: any = {}): string {
    return transcripts
      .map(transcript => this.formatTranscript(transcript, options))
      .join('\n\n\n');
  }
}

/**
 * Base class for text-based formatters with timestamps
 */
export abstract class TextBasedFormatter extends TextFormatter {
  /**
   * Format timestamp in specific format
   */
  protected abstract formatTimestamp(hours: number, mins: number, secs: number, ms: number): string;

  /**
   * Format transcript header
   */
  protected abstract formatTranscriptHeader(lines: string[]): string;

  /**
   * Format individual transcript line
   */
  protected abstract formatTranscriptLine(index: number, timeText: string, snippet: any): string;

  /**
   * Convert seconds to timestamp
   */
  protected secondsToTimestamp(time: number): string {
    const hours = Math.floor(time / 3600);
    const remainder = time % 3600;
    const mins = Math.floor(remainder / 60);
    const secs = Math.floor(remainder % 60);
    const ms = Math.round((time - Math.floor(time)) * 1000);

    return this.formatTimestamp(hours, mins, secs, ms);
  }

  formatTranscript(transcript: FetchedTranscript, options: any = {}): string {
    const lines: string[] = [];

    for (let i = 0; i < transcript.snippets.length; i++) {
      const snippet = transcript.snippets[i];
      if (!snippet) continue;
      
      const end = snippet.start + snippet.duration;
      
      // Use next snippet's start time if available and earlier than calculated end
      let endTime = end;
      if (i < transcript.snippets.length - 1) {
        const nextSnippet = transcript.snippets[i + 1];
        if (nextSnippet && nextSnippet.start < end) {
          endTime = nextSnippet.start;
        }
      }

      const timeText = `${this.secondsToTimestamp(snippet.start)} --> ${this.secondsToTimestamp(endTime)}`;
      lines.push(this.formatTranscriptLine(i, timeText, snippet));
    }

    return this.formatTranscriptHeader(lines);
  }
}

/**
 * SRT formatter
 */
export class SRTFormatter extends TextBasedFormatter {
  protected formatTimestamp(hours: number, mins: number, secs: number, ms: number): string {
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  }

  protected formatTranscriptHeader(lines: string[]): string {
    return lines.join('\n\n') + '\n';
  }

  protected formatTranscriptLine(index: number, timeText: string, snippet: any): string {
    return `${index + 1}\n${timeText}\n${snippet.text}`;
  }
}

/**
 * WebVTT formatter
 */
export class WebVTTFormatter extends TextBasedFormatter {
  protected formatTimestamp(hours: number, mins: number, secs: number, ms: number): string {
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  }

  protected formatTranscriptHeader(lines: string[]): string {
    return 'WEBVTT\n\n' + lines.join('\n\n') + '\n';
  }

  protected formatTranscriptLine(index: number, timeText: string, snippet: any): string {
    return `${timeText}\n${snippet.text}`;
  }
}

/**
 * Formatter loader
 */
export class FormatterLoader {
  private static readonly TYPES: Record<string, new () => Formatter> = {
    json: JSONFormatter,
    pretty: PrettyPrintFormatter,
    text: TextFormatter,
    webvtt: WebVTTFormatter,
    srt: SRTFormatter,
  };

  /**
   * Load formatter by type
   */
  load(formatterType: string = 'pretty'): Formatter {
    if (!(formatterType in FormatterLoader.TYPES)) {
      const supportedTypes = Object.keys(FormatterLoader.TYPES).join(', ');
      throw new Error(
        `The format '${formatterType}' is not supported. ` +
        `Choose one of the following formats: ${supportedTypes}`
      );
    }

    const FormatterClass = FormatterLoader.TYPES[formatterType];
    if (!FormatterClass) {
      throw new Error(`Formatter class not found for type: ${formatterType}`);
    }

    return new FormatterClass();
  }

  /**
   * Get all supported formatter types
   */
  static getSupportedTypes(): string[] {
    return Object.keys(FormatterLoader.TYPES);
  }
}