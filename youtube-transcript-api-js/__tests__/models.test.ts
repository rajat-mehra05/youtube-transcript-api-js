import { AxiosInstance } from 'axios';
import {
  FetchedTranscriptSnippet,
  FetchedTranscript,
  TranslationLanguage,
  Transcript,
  TranscriptList,
  VideoMetadata
} from '../transcripts/models';
import {
  NotTranslatable,
  TranslationLanguageNotAvailable,
  NoTranscriptFound,
  PoTokenRequired,
  RateLimitExceeded,
  TimeoutError,
  ConnectionError,
  NetworkError
} from '../errors';
import { AxiosError } from 'axios';

describe('Models', () => {
  const TEST_VIDEO_ID = 'dQw4w9WgXcQ';

  const MOCK_METADATA: VideoMetadata = {
    videoId: TEST_VIDEO_ID,
    title: 'Test Video',
    lengthSeconds: '300',
    channelId: 'UCtest',
    shortDescription: 'A test video',
    thumbnail: { thumbnails: [] },
    viewCount: '1000',
    author: 'Test Author',
    isLiveContent: false,
  };

  // ============================================
  // FetchedTranscriptSnippet
  // ============================================

  describe('FetchedTranscriptSnippet', () => {
    describe('constructor', () => {
      it('should set text, start, and duration as readonly properties', () => {
        const snippet = new FetchedTranscriptSnippet('Hello world', 0, 2.5);

        expect(snippet.text).toBe('Hello world');
        expect(snippet.start).toBe(0);
        expect(snippet.duration).toBe(2.5);
      });

      it('should handle floating point values', () => {
        const snippet = new FetchedTranscriptSnippet('Test', 1.234, 5.678);

        expect(snippet.start).toBe(1.234);
        expect(snippet.duration).toBe(5.678);
      });

      it('should handle empty text', () => {
        const snippet = new FetchedTranscriptSnippet('', 0, 1);

        expect(snippet.text).toBe('');
      });

      it('should handle zero values', () => {
        const snippet = new FetchedTranscriptSnippet('Zero', 0, 0);

        expect(snippet.start).toBe(0);
        expect(snippet.duration).toBe(0);
      });
    });

    describe('toRawData', () => {
      it('should return object with text, start, and duration', () => {
        const snippet = new FetchedTranscriptSnippet('Hello world', 1.5, 3.0);
        const rawData = snippet.toRawData();

        expect(rawData).toEqual({
          text: 'Hello world',
          start: 1.5,
          duration: 3.0
        });
      });

      it('should return a plain object (not the snippet instance)', () => {
        const snippet = new FetchedTranscriptSnippet('Test', 0, 1);
        const rawData = snippet.toRawData();

        expect(rawData).not.toBeInstanceOf(FetchedTranscriptSnippet);
        expect(typeof rawData).toBe('object');
      });
    });
  });

  // ============================================
  // FetchedTranscript
  // ============================================

  describe('FetchedTranscript', () => {
    let snippets: FetchedTranscriptSnippet[];
    let transcript: FetchedTranscript;

    beforeEach(() => {
      snippets = [
        new FetchedTranscriptSnippet('First', 0, 2),
        new FetchedTranscriptSnippet('Second', 2, 3),
        new FetchedTranscriptSnippet('Third', 5, 2)
      ];
      transcript = new FetchedTranscript(
        snippets,
        TEST_VIDEO_ID,
        'English',
        'en',
        false
      );
    });

    describe('constructor', () => {
      it('should set all properties', () => {
        expect(transcript.snippets).toEqual(snippets);
        expect(transcript.videoId).toBe(TEST_VIDEO_ID);
        expect(transcript.language).toBe('English');
        expect(transcript.languageCode).toBe('en');
        expect(transcript.isGenerated).toBe(false);
      });

      it('should handle isGenerated=true', () => {
        const generatedTranscript = new FetchedTranscript(
          snippets,
          TEST_VIDEO_ID,
          'English',
          'en',
          true
        );

        expect(generatedTranscript.isGenerated).toBe(true);
      });

      it('should handle empty snippets array', () => {
        const emptyTranscript = new FetchedTranscript(
          [],
          TEST_VIDEO_ID,
          'English',
          'en',
          false
        );

        expect(emptyTranscript.snippets).toEqual([]);
        expect(emptyTranscript.length).toBe(0);
      });
    });

    describe('getSnippet', () => {
      it('should return snippet at valid index', () => {
        expect(transcript.getSnippet(0)).toBe(snippets[0]);
        expect(transcript.getSnippet(1)).toBe(snippets[1]);
        expect(transcript.getSnippet(2)).toBe(snippets[2]);
      });

      it('should return undefined for out of bounds index', () => {
        expect(transcript.getSnippet(10)).toBeUndefined();
        expect(transcript.getSnippet(-1)).toBeUndefined();
      });
    });

    describe('length', () => {
      it('should return snippets count', () => {
        expect(transcript.length).toBe(3);
      });

      it('should return 0 for empty transcript', () => {
        const emptyTranscript = new FetchedTranscript([], TEST_VIDEO_ID, 'en', 'en', false);
        expect(emptyTranscript.length).toBe(0);
      });
    });

    describe('toRawData', () => {
      it('should map all snippets to raw data', () => {
        const rawData = transcript.toRawData();

        expect(rawData).toHaveLength(3);
        expect(rawData[0]).toEqual({ text: 'First', start: 0, duration: 2 });
        expect(rawData[1]).toEqual({ text: 'Second', start: 2, duration: 3 });
        expect(rawData[2]).toEqual({ text: 'Third', start: 5, duration: 2 });
      });

      it('should return empty array for empty transcript', () => {
        const emptyTranscript = new FetchedTranscript([], TEST_VIDEO_ID, 'en', 'en', false);
        expect(emptyTranscript.toRawData()).toEqual([]);
      });
    });

    describe('iterator', () => {
      it('should yield all snippets in order', () => {
        const yielded: FetchedTranscriptSnippet[] = [];

        for (const snippet of transcript) {
          yielded.push(snippet);
        }

        expect(yielded).toHaveLength(3);
        expect(yielded[0]!.text).toBe('First');
        expect(yielded[1]!.text).toBe('Second');
        expect(yielded[2]!.text).toBe('Third');
      });

      it('should work with spread operator', () => {
        const spreadSnippets = [...transcript];

        expect(spreadSnippets).toHaveLength(3);
        expect(spreadSnippets).toEqual(snippets);
      });

      it('should work with Array.from', () => {
        const arraySnippets = Array.from(transcript);

        expect(arraySnippets).toHaveLength(3);
        expect(arraySnippets).toEqual(snippets);
      });
    });

    describe('metadata', () => {
      it('should store metadata when provided', () => {
        const withMetadata = new FetchedTranscript(
          snippets,
          TEST_VIDEO_ID,
          'English',
          'en',
          false,
          MOCK_METADATA
        );

        expect(withMetadata.metadata).toEqual(MOCK_METADATA);
      });

      it('should be undefined when not provided', () => {
        expect(transcript.metadata).toBeUndefined();
      });
    });
  });

  // ============================================
  // TranslationLanguage
  // ============================================

  describe('TranslationLanguage', () => {
    describe('constructor', () => {
      it('should set language and languageCode', () => {
        const translationLang = new TranslationLanguage('Spanish', 'es');

        expect(translationLang.language).toBe('Spanish');
        expect(translationLang.languageCode).toBe('es');
      });
    });
  });

  // ============================================
  // Transcript
  // ============================================

  describe('Transcript', () => {
    const mockHttpClient = {
      get: jest.fn()
    } as unknown as jest.Mocked<AxiosInstance>;
    const testUrl = 'https://www.youtube.com/api/timedtext?v=test123&lang=en';
    const translationLanguages = [
      new TranslationLanguage('Spanish', 'es'),
      new TranslationLanguage('French', 'fr')
    ];

    describe('constructor', () => {
      it('should set all properties', () => {
        const transcript = new Transcript(
          mockHttpClient,
          TEST_VIDEO_ID,
          testUrl,
          'English',
          'en',
          false,
          translationLanguages
        );

        expect(transcript.videoId).toBe(TEST_VIDEO_ID);
        expect(transcript.language).toBe('English');
        expect(transcript.languageCode).toBe('en');
        expect(transcript.isGenerated).toBe(false);
        expect(transcript.translationLanguages).toEqual(translationLanguages);
      });

      it('should handle isGenerated=true', () => {
        const transcript = new Transcript(
          mockHttpClient,
          TEST_VIDEO_ID,
          testUrl,
          'English',
          'en',
          true,
          []
        );

        expect(transcript.isGenerated).toBe(true);
      });
    });

    describe('isTranslatable', () => {
      it('should return true when translationLanguages is not empty', () => {
        const transcript = new Transcript(
          mockHttpClient,
          TEST_VIDEO_ID,
          testUrl,
          'English',
          'en',
          false,
          translationLanguages
        );

        expect(transcript.isTranslatable).toBe(true);
      });

      it('should return false when translationLanguages is empty', () => {
        const transcript = new Transcript(
          mockHttpClient,
          TEST_VIDEO_ID,
          testUrl,
          'English',
          'en',
          false,
          []
        );

        expect(transcript.isTranslatable).toBe(false);
      });
    });

    describe('translate', () => {
      it('should return new Transcript with tlang URL param', () => {
        const transcript = new Transcript(
          mockHttpClient,
          TEST_VIDEO_ID,
          testUrl,
          'English',
          'en',
          false,
          translationLanguages
        );

        const translated = transcript.translate('es');

        expect(translated.languageCode).toBe('es');
        expect(translated.language).toBe('Spanish');
      });

      it('should throw NotTranslatable when transcript is not translatable', () => {
        const transcript = new Transcript(
          mockHttpClient,
          TEST_VIDEO_ID,
          testUrl,
          'English',
          'en',
          false,
          []
        );

        expect(() => transcript.translate('es')).toThrow(NotTranslatable);
      });

      it('should throw TranslationLanguageNotAvailable for invalid language code', () => {
        const transcript = new Transcript(
          mockHttpClient,
          TEST_VIDEO_ID,
          testUrl,
          'English',
          'en',
          false,
          translationLanguages
        );

        expect(() => transcript.translate('invalid')).toThrow(TranslationLanguageNotAvailable);
      });

      it('translated transcript should have isGenerated=true', () => {
        const transcript = new Transcript(
          mockHttpClient,
          TEST_VIDEO_ID,
          testUrl,
          'English',
          'en',
          false,
          translationLanguages
        );

        const translated = transcript.translate('es');

        expect(translated.isGenerated).toBe(true);
      });

      it('translated transcript should have empty translationLanguages', () => {
        const transcript = new Transcript(
          mockHttpClient,
          TEST_VIDEO_ID,
          testUrl,
          'English',
          'en',
          false,
          translationLanguages
        );

        const translated = transcript.translate('es');

        expect(translated.translationLanguages).toEqual([]);
        expect(translated.isTranslatable).toBe(false);
      });
    });

    describe('toString', () => {
      it('should format as languageCode ("language")[TRANSLATABLE] when translatable', () => {
        const transcript = new Transcript(
          mockHttpClient,
          TEST_VIDEO_ID,
          testUrl,
          'English',
          'en',
          false,
          translationLanguages
        );

        expect(transcript.toString()).toBe('en ("English")[TRANSLATABLE]');
      });

      it('should format without [TRANSLATABLE] when not translatable', () => {
        const transcript = new Transcript(
          mockHttpClient,
          TEST_VIDEO_ID,
          testUrl,
          'English',
          'en',
          false,
          []
        );

        expect(transcript.toString()).toBe('en ("English")');
      });
    });

    describe('fetch', () => {
      const validXml = `<?xml version="1.0" encoding="utf-8" ?>
<transcript>
  <text start="0" dur="2.5">Hello world</text>
  <text start="2.5" dur="3.0">Test transcript</text>
</transcript>`;

      beforeEach(() => {
        mockHttpClient.get.mockReset();
      });

      it('should fetch and parse transcript successfully', async () => {
        mockHttpClient.get.mockResolvedValue({ data: validXml });

        const transcript = new Transcript(
          mockHttpClient,
          TEST_VIDEO_ID,
          testUrl,
          'English',
          'en',
          false,
          []
        );

        const fetched = await transcript.fetch();

        expect(mockHttpClient.get).toHaveBeenCalledWith(testUrl);
        expect(fetched).toBeInstanceOf(FetchedTranscript);
        expect(fetched.snippets).toHaveLength(2);
        expect(fetched.snippets[0]!.text).toBe('Hello world');
      });

      it('should pass preserveFormatting parameter', async () => {
        mockHttpClient.get.mockResolvedValue({ data: validXml });

        const transcript = new Transcript(
          mockHttpClient,
          TEST_VIDEO_ID,
          testUrl,
          'English',
          'en',
          false,
          []
        );

        const fetched = await transcript.fetch(true);

        expect(fetched).toBeInstanceOf(FetchedTranscript);
      });

      it('should throw PoTokenRequired when URL contains &exp=xpe', async () => {
        const xpeUrl = 'https://www.youtube.com/api/timedtext?v=test123&lang=en&exp=xpe';

        const transcript = new Transcript(
          mockHttpClient,
          TEST_VIDEO_ID,
          xpeUrl,
          'English',
          'en',
          false,
          []
        );

        await expect(transcript.fetch()).rejects.toThrow(PoTokenRequired);
      });

      // NOTE: The wrapNetworkError tests below overlap with fetcher.test.ts because
      // models.ts and fetcher.ts contain duplicate wrapNetworkError implementations.
      // Consider extracting the shared function into a common module.

      it('should throw RateLimitExceeded on 429 response', async () => {
        const axiosError = new AxiosError('Rate limited', 'ERR_BAD_REQUEST');
        (axiosError as any).response = {
          status: 429,
          headers: { 'retry-after': '60' }
        };
        mockHttpClient.get.mockRejectedValue(axiosError);

        const transcript = new Transcript(
          mockHttpClient,
          TEST_VIDEO_ID,
          testUrl,
          'English',
          'en',
          false,
          []
        );

        await expect(transcript.fetch()).rejects.toThrow(RateLimitExceeded);
      });

      it('should throw TimeoutError on ECONNABORTED', async () => {
        const axiosError = new AxiosError('Timeout', 'ECONNABORTED');
        axiosError.code = 'ECONNABORTED';
        (axiosError as any).config = { timeout: 10000 };
        mockHttpClient.get.mockRejectedValue(axiosError);

        const transcript = new Transcript(
          mockHttpClient,
          TEST_VIDEO_ID,
          testUrl,
          'English',
          'en',
          false,
          []
        );

        await expect(transcript.fetch()).rejects.toThrow(TimeoutError);
      });

      it('should throw TimeoutError on ETIMEDOUT', async () => {
        const axiosError = new AxiosError('Timeout', 'ETIMEDOUT');
        axiosError.code = 'ETIMEDOUT';
        (axiosError as any).config = { timeout: 5000 };
        mockHttpClient.get.mockRejectedValue(axiosError);

        const transcript = new Transcript(
          mockHttpClient,
          TEST_VIDEO_ID,
          testUrl,
          'English',
          'en',
          false,
          []
        );

        await expect(transcript.fetch()).rejects.toThrow(TimeoutError);
      });

      it('should throw ConnectionError on ECONNREFUSED', async () => {
        const axiosError = new AxiosError('Connection refused', 'ECONNREFUSED');
        axiosError.code = 'ECONNREFUSED';
        mockHttpClient.get.mockRejectedValue(axiosError);

        const transcript = new Transcript(
          mockHttpClient,
          TEST_VIDEO_ID,
          testUrl,
          'English',
          'en',
          false,
          []
        );

        await expect(transcript.fetch()).rejects.toThrow(ConnectionError);
      });

      it('should throw ConnectionError on ENOTFOUND', async () => {
        const axiosError = new AxiosError('Not found', 'ENOTFOUND');
        axiosError.code = 'ENOTFOUND';
        mockHttpClient.get.mockRejectedValue(axiosError);

        const transcript = new Transcript(
          mockHttpClient,
          TEST_VIDEO_ID,
          testUrl,
          'English',
          'en',
          false,
          []
        );

        await expect(transcript.fetch()).rejects.toThrow(ConnectionError);
      });

      it('should throw ConnectionError on ENETUNREACH', async () => {
        const axiosError = new AxiosError('Network unreachable', 'ENETUNREACH');
        axiosError.code = 'ENETUNREACH';
        mockHttpClient.get.mockRejectedValue(axiosError);

        const transcript = new Transcript(
          mockHttpClient,
          TEST_VIDEO_ID,
          testUrl,
          'English',
          'en',
          false,
          []
        );

        await expect(transcript.fetch()).rejects.toThrow(ConnectionError);
      });

      it('should throw NetworkError on other axios errors with code', async () => {
        const axiosError = new AxiosError('Unknown error', 'UNKNOWN_CODE');
        axiosError.code = 'UNKNOWN_CODE';
        mockHttpClient.get.mockRejectedValue(axiosError);

        const transcript = new Transcript(
          mockHttpClient,
          TEST_VIDEO_ID,
          testUrl,
          'English',
          'en',
          false,
          []
        );

        await expect(transcript.fetch()).rejects.toThrow(NetworkError);
      });

      it('should throw NetworkError on generic axios errors', async () => {
        const axiosError = new AxiosError('Generic error');
        mockHttpClient.get.mockRejectedValue(axiosError);

        const transcript = new Transcript(
          mockHttpClient,
          TEST_VIDEO_ID,
          testUrl,
          'English',
          'en',
          false,
          []
        );

        await expect(transcript.fetch()).rejects.toThrow(NetworkError);
      });

      it('should re-throw non-axios errors', async () => {
        const customError = new Error('Custom error');
        mockHttpClient.get.mockRejectedValue(customError);

        const transcript = new Transcript(
          mockHttpClient,
          TEST_VIDEO_ID,
          testUrl,
          'English',
          'en',
          false,
          []
        );

        await expect(transcript.fetch()).rejects.toThrow('Custom error');
      });

      it('should handle RateLimitExceeded with HTTP-date Retry-After header', async () => {
        const futureDate = new Date(Date.now() + 60000).toUTCString();
        const axiosError = new AxiosError('Rate limited', 'ERR_BAD_REQUEST');
        (axiosError as any).response = {
          status: 429,
          headers: { 'retry-after': futureDate }
        };
        mockHttpClient.get.mockRejectedValue(axiosError);

        const transcript = new Transcript(
          mockHttpClient,
          TEST_VIDEO_ID,
          testUrl,
          'English',
          'en',
          false,
          []
        );

        await expect(transcript.fetch()).rejects.toThrow(RateLimitExceeded);
      });

      it('should handle RateLimitExceeded with no Retry-After header', async () => {
        const axiosError = new AxiosError('Rate limited', 'ERR_BAD_REQUEST');
        (axiosError as any).response = {
          status: 429,
          headers: {}
        };
        mockHttpClient.get.mockRejectedValue(axiosError);

        const transcript = new Transcript(
          mockHttpClient,
          TEST_VIDEO_ID,
          testUrl,
          'English',
          'en',
          false,
          []
        );

        await expect(transcript.fetch()).rejects.toThrow(RateLimitExceeded);
      });

      it('should handle RateLimitExceeded with past date in Retry-After header', async () => {
        const pastDate = new Date(Date.now() - 60000).toUTCString();
        const axiosError = new AxiosError('Rate limited', 'ERR_BAD_REQUEST');
        (axiosError as any).response = {
          status: 429,
          headers: { 'retry-after': pastDate }
        };
        mockHttpClient.get.mockRejectedValue(axiosError);

        const transcript = new Transcript(
          mockHttpClient,
          TEST_VIDEO_ID,
          testUrl,
          'English',
          'en',
          false,
          []
        );

        await expect(transcript.fetch()).rejects.toThrow(RateLimitExceeded);
      });

      it('should handle RateLimitExceeded with invalid Retry-After header', async () => {
        const axiosError = new AxiosError('Rate limited', 'ERR_BAD_REQUEST');
        (axiosError as any).response = {
          status: 429,
          headers: { 'retry-after': 'invalid-value' }
        };
        mockHttpClient.get.mockRejectedValue(axiosError);

        const transcript = new Transcript(
          mockHttpClient,
          TEST_VIDEO_ID,
          testUrl,
          'English',
          'en',
          false,
          []
        );

        await expect(transcript.fetch()).rejects.toThrow(RateLimitExceeded);
      });
    });

    describe('metadata', () => {
      const validXml = `<?xml version="1.0" encoding="utf-8" ?>
<transcript>
  <text start="0" dur="2.5">Hello world</text>
  <text start="2.5" dur="3.0">Test transcript</text>
</transcript>`;

      beforeEach(() => {
        mockHttpClient.get.mockReset();
      });

      it('should pass metadata through to FetchedTranscript on fetch()', async () => {
        mockHttpClient.get.mockResolvedValue({ data: validXml });

        const transcript = new Transcript(
          mockHttpClient,
          TEST_VIDEO_ID,
          testUrl,
          'English',
          'en',
          false,
          [],
          MOCK_METADATA
        );

        const fetched = await transcript.fetch();

        expect(fetched.metadata).toEqual(MOCK_METADATA);
      });

      it('should have undefined metadata on FetchedTranscript when not provided', async () => {
        mockHttpClient.get.mockResolvedValue({ data: validXml });

        const transcript = new Transcript(
          mockHttpClient,
          TEST_VIDEO_ID,
          testUrl,
          'English',
          'en',
          false,
          []
        );

        const fetched = await transcript.fetch();

        expect(fetched.metadata).toBeUndefined();
      });

      it('should preserve metadata through translate()', () => {
        const transcript = new Transcript(
          mockHttpClient,
          TEST_VIDEO_ID,
          testUrl,
          'English',
          'en',
          false,
          translationLanguages,
          MOCK_METADATA
        );

        const translated = transcript.translate('es');

        expect(translated.metadata).toEqual(MOCK_METADATA);
      });
    });
  });

  // ============================================
  // TranscriptList
  // ============================================

  describe('TranscriptList', () => {
    const mockHttpClient = { get: jest.fn() } as unknown as jest.Mocked<AxiosInstance>;
    const translationLanguages = [
      new TranslationLanguage('Spanish', 'es'),
      new TranslationLanguage('French', 'fr')
    ];

    let manualTranscripts: Map<string, Transcript>;
    let generatedTranscripts: Map<string, Transcript>;
    let transcriptList: TranscriptList;

    beforeEach(() => {
      const englishManual = new Transcript(
        mockHttpClient,
        TEST_VIDEO_ID,
        'url',
        'English',
        'en',
        false,
        translationLanguages
      );
      const germanManual = new Transcript(
        mockHttpClient,
        TEST_VIDEO_ID,
        'url',
        'German',
        'de',
        false,
        []
      );
      const englishGenerated = new Transcript(
        mockHttpClient,
        TEST_VIDEO_ID,
        'url',
        'English (auto-generated)',
        'en',
        true,
        []
      );
      const spanishGenerated = new Transcript(
        mockHttpClient,
        TEST_VIDEO_ID,
        'url',
        'Spanish (auto-generated)',
        'es',
        true,
        []
      );

      manualTranscripts = new Map([
        ['en', englishManual],
        ['de', germanManual]
      ]);
      generatedTranscripts = new Map([
        ['en', englishGenerated],
        ['es', spanishGenerated]
      ]);

      transcriptList = new TranscriptList(
        TEST_VIDEO_ID,
        manualTranscripts,
        generatedTranscripts,
        translationLanguages
      );
    });

    describe('constructor', () => {
      it('should set videoId', () => {
        expect(transcriptList.videoId).toBe(TEST_VIDEO_ID);
      });
    });

    describe('findTranscript', () => {
      it('should prioritize manual over generated', () => {
        const transcript = transcriptList.findTranscript(['en']);

        expect(transcript.isGenerated).toBe(false);
        expect(transcript.languageCode).toBe('en');
      });

      it('should fall back to generated if manual not found', () => {
        const transcript = transcriptList.findTranscript(['es']);

        expect(transcript.isGenerated).toBe(true);
        expect(transcript.languageCode).toBe('es');
      });

      it('should find first matching language in priority order', () => {
        const transcript = transcriptList.findTranscript(['fr', 'de', 'en']);

        expect(transcript.languageCode).toBe('de');
      });

      it('should throw NoTranscriptFound when no match found', () => {
        expect(() => transcriptList.findTranscript(['fr', 'it'])).toThrow(NoTranscriptFound);
      });

      it('should include requested language codes in error', () => {
        expect.assertions(2);
        try {
          transcriptList.findTranscript(['fr', 'it']);
        } catch (error) {
          expect(error).toBeInstanceOf(NoTranscriptFound);
          expect((error as NoTranscriptFound).requestedLanguageCodes).toEqual(['fr', 'it']);
        }
      });
    });

    describe('findGeneratedTranscript', () => {
      it('should only search generated transcripts', () => {
        const transcript = transcriptList.findGeneratedTranscript(['en']);

        expect(transcript.isGenerated).toBe(true);
      });

      it('should throw NoTranscriptFound when no generated match', () => {
        expect(() => transcriptList.findGeneratedTranscript(['de'])).toThrow(NoTranscriptFound);
      });
    });

    describe('findManuallyCreatedTranscript', () => {
      it('should only search manual transcripts', () => {
        const transcript = transcriptList.findManuallyCreatedTranscript(['en']);

        expect(transcript.isGenerated).toBe(false);
      });

      it('should throw NoTranscriptFound when no manual match', () => {
        expect(() => transcriptList.findManuallyCreatedTranscript(['es'])).toThrow(NoTranscriptFound);
      });
    });

    describe('getAllTranscripts', () => {
      it('should return combined array of manual and generated', () => {
        const allTranscripts = transcriptList.getAllTranscripts();

        expect(allTranscripts).toHaveLength(4);
      });

      it('should include both manual and generated transcripts', () => {
        const allTranscripts = transcriptList.getAllTranscripts();

        const manual = allTranscripts.filter(t => !t.isGenerated);
        const generated = allTranscripts.filter(t => t.isGenerated);

        expect(manual).toHaveLength(2);
        expect(generated).toHaveLength(2);
      });
    });

    describe('iterator', () => {
      it('should yield manual first, then generated', () => {
        const transcripts: Transcript[] = [];

        for (const transcript of transcriptList) {
          transcripts.push(transcript);
        }

        // First 2 should be manual
        expect(transcripts[0]!.isGenerated).toBe(false);
        expect(transcripts[1]!.isGenerated).toBe(false);
        // Last 2 should be generated
        expect(transcripts[2]!.isGenerated).toBe(true);
        expect(transcripts[3]!.isGenerated).toBe(true);
      });

      it('should work with spread operator', () => {
        const transcripts = [...transcriptList];

        expect(transcripts).toHaveLength(4);
      });
    });

    describe('toString', () => {
      it('should format listing of all transcripts', () => {
        const str = transcriptList.toString();

        expect(str).toContain(TEST_VIDEO_ID);
        expect(str).toContain('MANUALLY CREATED');
        expect(str).toContain('GENERATED');
        expect(str).toContain('TRANSLATION LANGUAGES');
      });

      it('should include transcript language codes', () => {
        const str = transcriptList.toString();

        expect(str).toContain('en');
        expect(str).toContain('de');
        expect(str).toContain('es');
      });

      it('should show "None" for empty manual transcripts', () => {
        const emptyManualList = new TranscriptList(
          TEST_VIDEO_ID,
          new Map(),
          generatedTranscripts,
          translationLanguages
        );

        const str = emptyManualList.toString();

        expect(str).toContain('(MANUALLY CREATED)\nNone');
      });

      it('should show "None" for empty generated transcripts', () => {
        const emptyGeneratedList = new TranscriptList(
          TEST_VIDEO_ID,
          manualTranscripts,
          new Map(),
          translationLanguages
        );

        const str = emptyGeneratedList.toString();

        expect(str).toContain('(GENERATED)\nNone');
      });

      it('should show "None" for empty translation languages', () => {
        const noTranslationList = new TranscriptList(
          TEST_VIDEO_ID,
          manualTranscripts,
          generatedTranscripts,
          []
        );

        const str = noTranslationList.toString();

        expect(str).toContain('(TRANSLATION LANGUAGES)\nNone');
      });
    });

    describe('metadata', () => {
      it('should store metadata when provided', () => {
        const listWithMetadata = new TranscriptList(
          TEST_VIDEO_ID,
          manualTranscripts,
          generatedTranscripts,
          translationLanguages,
          MOCK_METADATA
        );

        expect(listWithMetadata.metadata).toEqual(MOCK_METADATA);
      });

      it('should be undefined when not provided', () => {
        expect(transcriptList.metadata).toBeUndefined();
      });
    });
  });
});
