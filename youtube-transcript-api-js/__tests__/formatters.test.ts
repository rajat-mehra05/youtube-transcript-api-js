import {
  Formatter,
  JSONFormatter,
  PrettyPrintFormatter,
  TextFormatter,
  SRTFormatter,
  WebVTTFormatter,
  FormatterLoader
} from '../formatters';
import { FetchedTranscript, FetchedTranscriptSnippet } from '../transcripts/models';

describe('Formatters', () => {
  let transcript: FetchedTranscript;
  let transcript2: FetchedTranscript;

  beforeEach(() => {
    const snippets = [
      new FetchedTranscriptSnippet('Hello world', 0, 2.5),
      new FetchedTranscriptSnippet('This is a test', 2.5, 3.0)
    ];

    transcript = new FetchedTranscript(
      snippets,
      'test-video-id',
      'English',
      'en',
      false
    );

    const snippets2 = [
      new FetchedTranscriptSnippet('Second transcript', 0, 2.0),
      new FetchedTranscriptSnippet('More content', 2.0, 3.0)
    ];

    transcript2 = new FetchedTranscript(
      snippets2,
      'test-video-id-2',
      'English',
      'en',
      false
    );
  });

  // ============================================
  // PrettyPrintFormatter
  // ============================================

  describe('PrettyPrintFormatter', () => {
    it('should format transcript as pretty JSON', () => {
      const formatter = new PrettyPrintFormatter();
      const result = formatter.formatTranscript(transcript);

      expect(() => JSON.parse(result)).not.toThrow();
      expect(result).toContain('Hello world');
      expect(result).toContain('\n'); // Pretty printed with newlines
    });

    it('should format multiple transcripts as pretty JSON', () => {
      const formatter = new PrettyPrintFormatter();
      const result = formatter.formatTranscripts([transcript, transcript2]);

      const parsed = JSON.parse(result);
      expect(parsed).toHaveLength(2);
      expect(parsed[0]).toHaveLength(2);
      expect(parsed[1]).toHaveLength(2);
    });

    it('should format empty transcript array', () => {
      const emptyTranscript = new FetchedTranscript([], 'empty', 'English', 'en', false);
      const formatter = new PrettyPrintFormatter();
      const result = formatter.formatTranscript(emptyTranscript);

      expect(result).toBe('[]');
    });

    it('should be an instance of Formatter', () => {
      const formatter = new PrettyPrintFormatter();
      expect(formatter).toBeInstanceOf(Formatter);
    });
  });

  // ============================================
  // JSONFormatter
  // ============================================

  describe('JSONFormatter', () => {
    it('should format transcript as JSON', () => {
      const formatter = new JSONFormatter();
      const result = formatter.formatTranscript(transcript);

      expect(() => JSON.parse(result)).not.toThrow();
      expect(result).toContain('Hello world');
    });

    it('should format transcript with indent option', () => {
      const formatter = new JSONFormatter();
      const resultWithIndent = formatter.formatTranscript(transcript, { indent: 2 });
      const resultWithoutIndent = formatter.formatTranscript(transcript, { indent: 0 });

      expect(resultWithIndent).toContain('\n');
      expect(resultWithoutIndent).not.toContain('\n');
    });

    it('should format multiple transcripts as JSON', () => {
      const formatter = new JSONFormatter();
      const result = formatter.formatTranscripts([transcript, transcript2]);

      const parsed = JSON.parse(result);
      expect(parsed).toHaveLength(2);
    });

    it('should format multiple transcripts with indent option', () => {
      const formatter = new JSONFormatter();
      const result = formatter.formatTranscripts([transcript], { indent: 4 });

      expect(result).toContain('\n');
      expect(() => JSON.parse(result)).not.toThrow();
    });

    it('should be an instance of Formatter', () => {
      const formatter = new JSONFormatter();
      expect(formatter).toBeInstanceOf(Formatter);
    });
  });

  // ============================================
  // TextFormatter
  // ============================================

  describe('TextFormatter', () => {
    it('should format transcript as plain text', () => {
      const formatter = new TextFormatter();
      const result = formatter.formatTranscript(transcript);

      expect(result).toBe('Hello world\nThis is a test');
    });

    it('should format multiple transcripts with triple newline separator', () => {
      const formatter = new TextFormatter();
      const result = formatter.formatTranscripts([transcript, transcript2]);

      expect(result).toContain('Hello world');
      expect(result).toContain('Second transcript');
      expect(result).toContain('\n\n\n'); // Triple newline separator
    });

    it('should handle empty transcript', () => {
      const emptyTranscript = new FetchedTranscript([], 'empty', 'English', 'en', false);
      const formatter = new TextFormatter();
      const result = formatter.formatTranscript(emptyTranscript);

      expect(result).toBe('');
    });

    it('should be an instance of Formatter', () => {
      const formatter = new TextFormatter();
      expect(formatter).toBeInstanceOf(Formatter);
    });
  });

  // ============================================
  // SRTFormatter
  // ============================================

  describe('SRTFormatter', () => {
    it('should format transcript as SRT', () => {
      const formatter = new SRTFormatter();
      const result = formatter.formatTranscript(transcript);

      expect(result).toContain('1\n00:00:00,000 --> 00:00:02,500\nHello world');
      expect(result).toContain('2\n00:00:02,500 --> 00:00:05,500\nThis is a test');
    });

    it('should format multiple transcripts as SRT', () => {
      const formatter = new SRTFormatter();
      const result = formatter.formatTranscripts([transcript, transcript2]);

      expect(result).toContain('Hello world');
      expect(result).toContain('Second transcript');
    });

    it('should handle timestamps with hours', () => {
      const longSnippets = [
        new FetchedTranscriptSnippet('Long content', 3661.5, 2.5) // 1h 1m 1.5s
      ];
      const longTranscript = new FetchedTranscript(longSnippets, 'long', 'English', 'en', false);

      const formatter = new SRTFormatter();
      const result = formatter.formatTranscript(longTranscript);

      expect(result).toContain('01:01:01,500');
    });

    it('should handle overlapping timestamps', () => {
      const overlappingSnippets = [
        new FetchedTranscriptSnippet('First', 0, 5.0), // ends at 5.0
        new FetchedTranscriptSnippet('Second', 2.0, 3.0) // starts at 2.0 (before first ends)
      ];
      const overlappingTranscript = new FetchedTranscript(
        overlappingSnippets, 'overlap', 'English', 'en', false
      );

      const formatter = new SRTFormatter();
      const result = formatter.formatTranscript(overlappingTranscript);

      // Should use next snippet's start time as end time when overlapping
      expect(result).toContain('00:00:00,000 --> 00:00:02,000');
    });

    it('should be an instance of Formatter', () => {
      const formatter = new SRTFormatter();
      expect(formatter).toBeInstanceOf(Formatter);
    });

    it('should handle empty transcript', () => {
      const emptyTranscript = new FetchedTranscript([], 'empty', 'English', 'en', false);
      const formatter = new SRTFormatter();
      const result = formatter.formatTranscript(emptyTranscript);

      expect(result).toBe('\n');
    });
  });

  // ============================================
  // WebVTTFormatter
  // ============================================

  describe('WebVTTFormatter', () => {
    it('should format transcript as WebVTT', () => {
      const formatter = new WebVTTFormatter();
      const result = formatter.formatTranscript(transcript);

      expect(result).toContain('WEBVTT');
      expect(result).toContain('00:00:00.000 --> 00:00:02.500\nHello world');
    });

    it('should format multiple transcripts as WebVTT', () => {
      const formatter = new WebVTTFormatter();
      const result = formatter.formatTranscripts([transcript, transcript2]);

      expect(result).toContain('WEBVTT');
      expect(result).toContain('Hello world');
    });

    it('should use period instead of comma for milliseconds', () => {
      const formatter = new WebVTTFormatter();
      const result = formatter.formatTranscript(transcript);

      expect(result).toContain('.000'); // WebVTT uses period
      expect(result).not.toContain(',000'); // SRT uses comma
    });

    it('should handle timestamps with hours', () => {
      const longSnippets = [
        new FetchedTranscriptSnippet('Long content', 7261.123, 2.5) // 2h 1m 1.123s
      ];
      const longTranscript = new FetchedTranscript(longSnippets, 'long', 'English', 'en', false);

      const formatter = new WebVTTFormatter();
      const result = formatter.formatTranscript(longTranscript);

      expect(result).toContain('02:01:01.123');
    });

    it('should be an instance of Formatter', () => {
      const formatter = new WebVTTFormatter();
      expect(formatter).toBeInstanceOf(Formatter);
    });
  });

  // ============================================
  // FormatterLoader
  // ============================================

  describe('FormatterLoader', () => {
    it('should load formatter by type', () => {
      const loader = new FormatterLoader();

      expect(loader.load('json')).toBeInstanceOf(JSONFormatter);
      expect(loader.load('text')).toBeInstanceOf(TextFormatter);
      expect(loader.load('srt')).toBeInstanceOf(SRTFormatter);
      expect(loader.load('webvtt')).toBeInstanceOf(WebVTTFormatter);
      expect(loader.load('pretty')).toBeInstanceOf(PrettyPrintFormatter);
    });

    it('should throw error for unknown formatter type', () => {
      const loader = new FormatterLoader();

      expect(() => loader.load('unknown')).toThrow(
        "The format 'unknown' is not supported"
      );
    });

    it('should include supported types in error message', () => {
      const loader = new FormatterLoader();

      expect(() => loader.load('invalid')).toThrow('json');
      expect(() => loader.load('invalid')).toThrow('pretty');
      expect(() => loader.load('invalid')).toThrow('text');
      expect(() => loader.load('invalid')).toThrow('webvtt');
      expect(() => loader.load('invalid')).toThrow('srt');
    });

    it('should default to pretty formatter', () => {
      const loader = new FormatterLoader();

      expect(loader.load()).toBeInstanceOf(PrettyPrintFormatter);
    });

    it('should return all supported types', () => {
      const types = FormatterLoader.getSupportedTypes();

      expect(types).toContain('json');
      expect(types).toContain('pretty');
      expect(types).toContain('text');
      expect(types).toContain('webvtt');
      expect(types).toContain('srt');
      expect(types).toHaveLength(5);
    });
  });
});
