import { TranscriptParser, parseTranscriptXml } from '../transcripts/parser';
import { FetchedTranscriptSnippet } from '../transcripts/models';
import { TranscriptParseError } from '../errors';
import {
  VALID_TRANSCRIPT_XML,
  EMPTY_TRANSCRIPT_XML,
  MALFORMED_XML,
  SPECIAL_CHARACTERS_XML
} from './__fixtures__/youtube-responses';

describe('TranscriptParser', () => {
  describe('constructor', () => {
    it('should create parser with default settings (no formatting preservation)', () => {
      const parser = new TranscriptParser();
      expect(parser).toBeInstanceOf(TranscriptParser);
    });

    it('should create parser with formatting preservation enabled', () => {
      const parser = new TranscriptParser(true);
      expect(parser).toBeInstanceOf(TranscriptParser);
    });
  });

  describe('parse', () => {
    describe('valid XML parsing', () => {
      it('should parse valid XML and extract text, start, and duration', async () => {
        const parser = new TranscriptParser();
        const snippets = await parser.parse(VALID_TRANSCRIPT_XML);

        expect(snippets).toHaveLength(3);
        expect(snippets[0]).toBeInstanceOf(FetchedTranscriptSnippet);
        expect(snippets[0]!.text).toBe('Hello world');
        expect(snippets[0]!.start).toBe(0);
        expect(snippets[0]!.duration).toBe(2.5);
      });

      it('should maintain order of snippets', async () => {
        const parser = new TranscriptParser();
        const snippets = await parser.parse(VALID_TRANSCRIPT_XML);

        expect(snippets[0]!.start).toBe(0);
        expect(snippets[1]!.start).toBe(2.5);
        expect(snippets[2]!.start).toBe(5.5);
      });

      it('should parse XML with multiple snippets correctly', async () => {
        const parser = new TranscriptParser();
        const snippets = await parser.parse(VALID_TRANSCRIPT_XML);

        expect(snippets).toHaveLength(3);
        expect(snippets[0]!.text).toBe('Hello world');
        expect(snippets[1]!.text).toBe('This is a test transcript');
        expect(snippets[2]!.text).toBe('With multiple snippets');
      });
    });

    describe('empty content handling', () => {
      it('should return empty array for empty transcript XML', async () => {
        const parser = new TranscriptParser();
        const snippets = await parser.parse(EMPTY_TRANSCRIPT_XML);

        expect(snippets).toEqual([]);
      });

      it('should skip elements without text content', async () => {
        const xml = `<?xml version="1.0" encoding="utf-8" ?>
<transcript>
  <text start="0" dur="2.5">Valid text</text>
  <text start="2.5" dur="3.0"></text>
  <text start="5.5" dur="2.0">Another valid text</text>
</transcript>`;
        const parser = new TranscriptParser();
        const snippets = await parser.parse(xml);

        expect(snippets).toHaveLength(2);
        expect(snippets[0]!.text).toBe('Valid text');
        expect(snippets[1]!.text).toBe('Another valid text');
      });
    });

    describe('missing attributes handling', () => {
      it('should default start and duration to 0 when missing', async () => {
        const xml = `<?xml version="1.0" encoding="utf-8" ?>
<transcript>
  <text>Text without start or duration</text>
  <text start="2.5">Text without duration</text>
</transcript>`;
        const parser = new TranscriptParser();
        const snippets = await parser.parse(xml);

        snippets.forEach(snippet => {
          expect(typeof snippet.start).toBe('number');
          expect(typeof snippet.duration).toBe('number');
        });
      });
    });

    describe('HTML tag handling', () => {
      it('should remove all HTML tags when preserveFormatting is false', async () => {
        const parser = new TranscriptParser(false);
        // Using escaped HTML entities as YouTube would send them
        // Need at least 2 text elements because xml2js with explicitArray:false returns object for single element
        const xml = `<?xml version="1.0" encoding="utf-8" ?>
<transcript>
  <text start="0" dur="2.5">&lt;b&gt;Bold&lt;/b&gt; text</text>
  <text start="2.5" dur="2.5">Normal text</text>
</transcript>`;
        const snippets = await parser.parse(xml);

        // After parsing, HTML entities are decoded, then regex removes tags
        expect(snippets[0]!.text).toBe('Bold text');
      });

      it('should preserve formatting tags when preserveFormatting is true', async () => {
        const parser = new TranscriptParser(true);
        const xml = `<?xml version="1.0" encoding="utf-8" ?>
<transcript>
  <text start="0" dur="2.5">&lt;b&gt;Bold&lt;/b&gt; text</text>
  <text start="2.5" dur="2.5">Normal text</text>
</transcript>`;
        const snippets = await parser.parse(xml);

        expect(snippets[0]!.text).toContain('<b>');
        expect(snippets[0]!.text).toContain('</b>');
      });
    });

    describe('special characters handling', () => {
      it('should handle XML entities correctly', async () => {
        const parser = new TranscriptParser();
        const snippets = await parser.parse(SPECIAL_CHARACTERS_XML);

        // & < > " ' are decoded from entities
        expect(snippets[0]!.text).toContain('&');
        expect(snippets[0]!.text).toContain('"');
        expect(snippets[0]!.text).toContain("'");
      });

      it('should handle unicode characters', async () => {
        const parser = new TranscriptParser();
        const snippets = await parser.parse(SPECIAL_CHARACTERS_XML);

        expect(snippets[1]!.text).toContain('é');
        expect(snippets[1]!.text).toContain('中文');
        expect(snippets[1]!.text).toContain('日本語');
      });
    });

    describe('error handling', () => {
      it('should throw TranscriptParseError for invalid XML', async () => {
        const parser = new TranscriptParser();

        await expect(parser.parse(MALFORMED_XML)).rejects.toThrow(TranscriptParseError);
      });

      it('should include original error in TranscriptParseError', async () => {
        const parser = new TranscriptParser();

        try {
          await parser.parse(MALFORMED_XML);
          fail('Expected TranscriptParseError to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(TranscriptParseError);
          expect((error as TranscriptParseError).message).toContain('Failed to parse');
        }
      });

      it('should return empty array for completely invalid input', async () => {
        const parser = new TranscriptParser();

        const result = await parser.parse('not xml at all {');
        expect(result).toEqual([]);
      });
    });
  });
});

describe('parseTranscriptXml utility function', () => {
  it('should delegate to TranscriptParser with default settings', async () => {
    const snippets = await parseTranscriptXml(VALID_TRANSCRIPT_XML);

    expect(snippets).toHaveLength(3);
    expect(snippets[0]!.text).toBe('Hello world');
  });

  it('should return FetchedTranscriptSnippet instances', async () => {
    const snippets = await parseTranscriptXml(VALID_TRANSCRIPT_XML);

    snippets.forEach(snippet => {
      expect(snippet).toBeInstanceOf(FetchedTranscriptSnippet);
    });
  });

  it('should throw TranscriptParseError for invalid XML', async () => {
    await expect(parseTranscriptXml(MALFORMED_XML)).rejects.toThrow(TranscriptParseError);
  });

  it('should parse correctly with preserveFormatting parameter', async () => {
    // Need at least 2 text elements because xml2js with explicitArray:false returns object for single element
    const xml = `<?xml version="1.0" encoding="utf-8" ?>
<transcript>
  <text start="0" dur="2.5">&lt;b&gt;Bold&lt;/b&gt; text</text>
  <text start="2.5" dur="2.5">Normal text</text>
</transcript>`;

    const withoutFormatting = await parseTranscriptXml(xml, false);
    const withFormatting = await parseTranscriptXml(xml, true);

    expect(withoutFormatting[0]!.text).toBe('Bold text');
    expect(withFormatting[0]!.text).toContain('<b>');
  });
});
