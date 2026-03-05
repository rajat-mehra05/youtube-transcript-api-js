import { FetchedTranscript, FetchedTranscriptSnippet } from '../transcripts/models';

/**
 * Options for formatting transcripts
 */
export interface FormatterOptions {
  /** JSON indentation level (used by JSONFormatter) */
  indent?: number;
  /** Group snippets into time buckets of N seconds (used by TimestampedTextFormatter) */
  groupBySeconds?: number;
}

/**
 * Base formatter class
 */
export abstract class Formatter {
  /**
   * Format a single transcript
   */
  abstract formatTranscript(transcript: FetchedTranscript, options?: FormatterOptions): string;

  /**
   * Format multiple transcripts
   */
  abstract formatTranscripts(transcripts: FetchedTranscript[], options?: FormatterOptions): string;
}

/**
 * Pretty print formatter
 */
export class PrettyPrintFormatter extends Formatter {
  formatTranscript(transcript: FetchedTranscript, options: FormatterOptions = {}): string {
    return JSON.stringify(transcript.toRawData(), null, 2);
  }

  formatTranscripts(transcripts: FetchedTranscript[], options: FormatterOptions = {}): string {
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
  formatTranscript(transcript: FetchedTranscript, options: FormatterOptions = {}): string {
    return JSON.stringify(transcript.toRawData(), null, options.indent || 0);
  }

  formatTranscripts(transcripts: FetchedTranscript[], options: FormatterOptions = {}): string {
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
  formatTranscript(transcript: FetchedTranscript, options: FormatterOptions = {}): string {
    return transcript.snippets.map(snippet => snippet.text).join('\n');
  }

  formatTranscripts(transcripts: FetchedTranscript[], options: FormatterOptions = {}): string {
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

  formatTranscript(transcript: FetchedTranscript, options: FormatterOptions = {}): string {
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
 * Timestamped text formatter for LLM-friendly output
 * Produces lines like: [0:00] Hello world
 * Supports grouping snippets into time buckets via groupBySeconds option
 */
export class TimestampedTextFormatter extends Formatter {
  formatTranscript(transcript: FetchedTranscript, options: FormatterOptions = {}): string {
    const snippets = transcript.snippets;
    if (snippets.length === 0) return '';

    const groupBySeconds: number = options.groupBySeconds || 0;

    if (groupBySeconds > 0) {
      return this.formatGrouped(snippets, groupBySeconds);
    }

    return snippets
      .map(s => `${this.formatTime(s.start)} ${s.text}`)
      .join('\n');
  }

  formatTranscripts(transcripts: FetchedTranscript[], options: FormatterOptions = {}): string {
    return transcripts
      .map(t => this.formatTranscript(t, options))
      .join('\n\n\n');
  }

  private formatGrouped(snippets: FetchedTranscriptSnippet[], groupBySeconds: number): string {
    const buckets = new Map<number, string[]>();

    for (const snippet of snippets) {
      const bucketKey = Math.floor(snippet.start / groupBySeconds) * groupBySeconds;
      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, []);
      }
      buckets.get(bucketKey)!.push(snippet.text);
    }

    const lines: string[] = [];
    for (const bucketStart of Array.from(buckets.keys()).sort((a, b) => a - b)) {
      lines.push(`${this.formatTime(bucketStart)} ${buckets.get(bucketStart)!.join(' ')}`);
    }

    return lines.join('\n');
  }

  private formatTime(seconds: number): string {
    const totalMinutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `[${totalMinutes}:${secs.toString().padStart(2, '0')}]`;
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
    timestamped: TimestampedTextFormatter,
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