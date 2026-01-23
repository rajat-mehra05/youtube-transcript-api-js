import {
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
  });

  describe('JSONFormatter', () => {
    it('should format transcript as JSON', () => {
      const formatter = new JSONFormatter();
      const result = formatter.formatTranscript(transcript);
      
      expect(() => JSON.parse(result)).not.toThrow();
      expect(result).toContain('Hello world');
    });
  });

  describe('TextFormatter', () => {
    it('should format transcript as plain text', () => {
      const formatter = new TextFormatter();
      const result = formatter.formatTranscript(transcript);
      
      expect(result).toBe('Hello world\nThis is a test');
    });
  });

  describe('SRTFormatter', () => {
    it('should format transcript as SRT', () => {
      const formatter = new SRTFormatter();
      const result = formatter.formatTranscript(transcript);
      
      expect(result).toContain('1\n00:00:00,000 --> 00:00:02,500\nHello world');
      expect(result).toContain('2\n00:00:02,500 --> 00:00:05,500\nThis is a test');
    });
  });

  describe('WebVTTFormatter', () => {
    it('should format transcript as WebVTT', () => {
      const formatter = new WebVTTFormatter();
      const result = formatter.formatTranscript(transcript);
      
      expect(result).toContain('WEBVTT');
      expect(result).toContain('00:00:00.000 --> 00:00:02.500\nHello world');
    });
  });

  describe('FormatterLoader', () => {
    it('should load formatter by type', () => {
      const loader = new FormatterLoader();
      
      expect(loader.load('json')).toBeInstanceOf(JSONFormatter);
      expect(loader.load('text')).toBeInstanceOf(TextFormatter);
      expect(loader.load('srt')).toBeInstanceOf(SRTFormatter);
      expect(loader.load('webvtt')).toBeInstanceOf(WebVTTFormatter);
    });

    it('should throw error for unknown formatter type', () => {
      const loader = new FormatterLoader();
      
      expect(() => loader.load('unknown')).toThrow();
    });

    it('should default to pretty formatter', () => {
      const loader = new FormatterLoader();
      
      expect(loader.load()).toBeInstanceOf(PrettyPrintFormatter);
    });
  });
});
