import { AxiosInstance } from 'axios';
import * as fs from 'fs';
import { YouTubeTranscriptCli, main } from '../cli/index';
import { YouTubeTranscriptApi } from '../api';
import { FormatterLoader } from '../formatters';
import { TranscriptList, FetchedTranscript, FetchedTranscriptSnippet, Transcript, TranslationLanguage } from '../transcripts/models';
import { GenericProxyConfig, WebshareProxyConfig } from '../proxies';

// Mock the API module
jest.mock('../api');

// Mock fs module
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

// Mock the formatters module
jest.mock('../formatters', () => ({
  FormatterLoader: jest.fn().mockImplementation(() => ({
    load: jest.fn().mockReturnValue({
      formatTranscript: jest.fn().mockReturnValue('formatted transcript'),
      formatTranscripts: jest.fn().mockReturnValue('formatted transcripts'),
    }),
  })),
}));

describe('YouTubeTranscriptCli', () => {
  let cli: YouTubeTranscriptCli;
  let mockApi: jest.Mocked<YouTubeTranscriptApi>;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let processExitSpy: jest.SpyInstance;

  // Create mock transcript data
  const createMockTranscript = (videoId: string, lang: string = 'en', isGenerated: boolean = false) => {
    const snippets = [
      new FetchedTranscriptSnippet('Hello world', 0, 2.5),
      new FetchedTranscriptSnippet('Test transcript', 2.5, 3.0),
    ];
    return new FetchedTranscript(snippets, videoId, lang === 'en' ? 'English' : 'Spanish', lang, isGenerated);
  };

  const createMockTranscriptList = (videoId: string) => {
    const mockHttpClient = { get: jest.fn() } as unknown as jest.Mocked<AxiosInstance>;
    const translationLanguages = [new TranslationLanguage('Spanish', 'es')];

    const englishManual = new Transcript(
      mockHttpClient,
      videoId,
      'https://www.youtube.com/api/timedtext?v=' + videoId,
      'English',
      'en',
      false,
      translationLanguages
    );

    const englishGenerated = new Transcript(
      mockHttpClient,
      videoId,
      'https://www.youtube.com/api/timedtext?v=' + videoId,
      'English (auto-generated)',
      'en',
      true,
      []
    );

    const manualTranscripts = new Map([['en', englishManual]]);
    const generatedTranscripts = new Map([['en', englishGenerated]]);

    return new TranscriptList(videoId, manualTranscripts, generatedTranscripts, translationLanguages);
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Mock process.exit - throw error so we can test error handling
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit(${code})`);
    });

    // Setup mock API
    mockApi = {
      list: jest.fn(),
      fetch: jest.fn(),
    } as any;

    (YouTubeTranscriptApi as jest.Mock).mockImplementation(() => mockApi);

    cli = new YouTubeTranscriptCli();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  describe('constructor', () => {
    it('should create CLI instance', () => {
      expect(cli).toBeInstanceOf(YouTubeTranscriptCli);
    });
  });

  describe('run', () => {
    it('should fetch transcript for a single video ID', async () => {
      const mockTranscriptList = createMockTranscriptList('test123');
      const mockFetchedTranscript = createMockTranscript('test123');

      // Mock the transcript's fetch method
      const mockTranscript = {
        fetch: jest.fn().mockResolvedValue(mockFetchedTranscript),
        translate: jest.fn(),
      };

      mockTranscriptList.findTranscript = jest.fn().mockReturnValue(mockTranscript);
      mockApi.list.mockResolvedValue(mockTranscriptList);

      await cli.run(['test123']);

      expect(YouTubeTranscriptApi).toHaveBeenCalled();
      expect(mockApi.list).toHaveBeenCalledWith('test123');
    });

    it('should handle --list-transcripts flag', async () => {
      const mockTranscriptList = createMockTranscriptList('test123');
      mockApi.list.mockResolvedValue(mockTranscriptList);

      await cli.run(['test123', '--list-transcripts']);

      expect(mockApi.list).toHaveBeenCalledWith('test123');
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should handle --languages option', async () => {
      const mockTranscriptList = createMockTranscriptList('test123');
      const mockFetchedTranscript = createMockTranscript('test123', 'de');

      const mockTranscript = {
        fetch: jest.fn().mockResolvedValue(mockFetchedTranscript),
      };

      mockTranscriptList.findTranscript = jest.fn().mockReturnValue(mockTranscript);
      mockApi.list.mockResolvedValue(mockTranscriptList);

      await cli.run(['test123', '--languages', 'de', 'en']);

      expect(mockTranscriptList.findTranscript).toHaveBeenCalledWith(['de', 'en']);
    });

    it('should handle --exclude-generated flag', async () => {
      const mockTranscriptList = createMockTranscriptList('test123');
      const mockFetchedTranscript = createMockTranscript('test123');

      const mockTranscript = {
        fetch: jest.fn().mockResolvedValue(mockFetchedTranscript),
      };

      mockTranscriptList.findManuallyCreatedTranscript = jest.fn().mockReturnValue(mockTranscript);
      mockApi.list.mockResolvedValue(mockTranscriptList);

      await cli.run(['test123', '--exclude-generated']);

      expect(mockTranscriptList.findManuallyCreatedTranscript).toHaveBeenCalled();
    });

    it('should handle --exclude-manually-created flag', async () => {
      const mockTranscriptList = createMockTranscriptList('test123');
      const mockFetchedTranscript = createMockTranscript('test123', 'en', true);

      const mockTranscript = {
        fetch: jest.fn().mockResolvedValue(mockFetchedTranscript),
      };

      mockTranscriptList.findGeneratedTranscript = jest.fn().mockReturnValue(mockTranscript);
      mockApi.list.mockResolvedValue(mockTranscriptList);

      await cli.run(['test123', '--exclude-manually-created']);

      expect(mockTranscriptList.findGeneratedTranscript).toHaveBeenCalled();
    });

    it('should error when both exclude flags are used together', async () => {
      expect.assertions(2);
      try {
        await cli.run(['test123', '--exclude-manually-created', '--exclude-generated']);
      } catch (e: any) {
        expect(e.message).toContain('process.exit(1)');
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cannot use both --exclude-manually-created and --exclude-generated')
      );
    });

    it('should handle --translate option', async () => {
      const mockTranscriptList = createMockTranscriptList('test123');
      const mockFetchedTranscript = createMockTranscript('test123', 'es');

      const mockTranslatedTranscript = {
        fetch: jest.fn().mockResolvedValue(mockFetchedTranscript),
      };

      const mockTranscript = {
        fetch: jest.fn().mockResolvedValue(mockFetchedTranscript),
        translate: jest.fn().mockReturnValue(mockTranslatedTranscript),
      };

      mockTranscriptList.findTranscript = jest.fn().mockReturnValue(mockTranscript);
      mockApi.list.mockResolvedValue(mockTranscriptList);

      await cli.run(['test123', '--translate', 'es']);

      expect(mockTranscript.translate).toHaveBeenCalledWith('es');
    });

    it('should handle --format option', async () => {
      const mockTranscriptList = createMockTranscriptList('test123');
      const mockFetchedTranscript = createMockTranscript('test123');

      const mockTranscript = {
        fetch: jest.fn().mockResolvedValue(mockFetchedTranscript),
      };

      mockTranscriptList.findTranscript = jest.fn().mockReturnValue(mockTranscript);
      mockApi.list.mockResolvedValue(mockTranscriptList);

      await cli.run(['test123', '--format', 'json']);

      expect(FormatterLoader).toHaveBeenCalled();
    });

    it('should handle --webshare-proxy-username and --webshare-proxy-password options', async () => {
      const mockTranscriptList = createMockTranscriptList('test123');
      const mockFetchedTranscript = createMockTranscript('test123');

      const mockTranscript = {
        fetch: jest.fn().mockResolvedValue(mockFetchedTranscript),
      };

      mockTranscriptList.findTranscript = jest.fn().mockReturnValue(mockTranscript);
      mockApi.list.mockResolvedValue(mockTranscriptList);

      await cli.run([
        'test123',
        '--webshare-proxy-username', 'user',
        '--webshare-proxy-password', 'pass'
      ]);

      expect(YouTubeTranscriptApi).toHaveBeenCalled();
      // Check that WebshareProxyConfig was passed
      const apiCall = (YouTubeTranscriptApi as jest.Mock).mock.calls[0];
      expect(apiCall[0]).toBeInstanceOf(WebshareProxyConfig);
    });

    it('should handle --http-proxy option', async () => {
      const mockTranscriptList = createMockTranscriptList('test123');
      const mockFetchedTranscript = createMockTranscript('test123');

      const mockTranscript = {
        fetch: jest.fn().mockResolvedValue(mockFetchedTranscript),
      };

      mockTranscriptList.findTranscript = jest.fn().mockReturnValue(mockTranscript);
      mockApi.list.mockResolvedValue(mockTranscriptList);

      await cli.run(['test123', '--http-proxy', 'http://proxy.example.com:8080']);

      expect(YouTubeTranscriptApi).toHaveBeenCalled();
      const apiCall = (YouTubeTranscriptApi as jest.Mock).mock.calls[0];
      expect(apiCall[0]).toBeInstanceOf(GenericProxyConfig);
    });

    it('should handle --https-proxy option', async () => {
      const mockTranscriptList = createMockTranscriptList('test123');
      const mockFetchedTranscript = createMockTranscript('test123');

      const mockTranscript = {
        fetch: jest.fn().mockResolvedValue(mockFetchedTranscript),
      };

      mockTranscriptList.findTranscript = jest.fn().mockReturnValue(mockTranscript);
      mockApi.list.mockResolvedValue(mockTranscriptList);

      await cli.run(['test123', '--https-proxy', 'https://proxy.example.com:8443']);

      expect(YouTubeTranscriptApi).toHaveBeenCalled();
      const apiCall = (YouTubeTranscriptApi as jest.Mock).mock.calls[0];
      expect(apiCall[0]).toBeInstanceOf(GenericProxyConfig);
    });

    it('should handle multiple video IDs', async () => {
      const mockTranscriptList1 = createMockTranscriptList('video1');
      const mockTranscriptList2 = createMockTranscriptList('video2');
      const mockFetchedTranscript1 = createMockTranscript('video1');
      const mockFetchedTranscript2 = createMockTranscript('video2');

      const mockTranscript1 = {
        fetch: jest.fn().mockResolvedValue(mockFetchedTranscript1),
      };
      const mockTranscript2 = {
        fetch: jest.fn().mockResolvedValue(mockFetchedTranscript2),
      };

      mockTranscriptList1.findTranscript = jest.fn().mockReturnValue(mockTranscript1);
      mockTranscriptList2.findTranscript = jest.fn().mockReturnValue(mockTranscript2);

      mockApi.list
        .mockResolvedValueOnce(mockTranscriptList1)
        .mockResolvedValueOnce(mockTranscriptList2);

      await cli.run(['video1', 'video2']);

      expect(mockApi.list).toHaveBeenCalledTimes(2);
      expect(mockApi.list).toHaveBeenCalledWith('video1');
      expect(mockApi.list).toHaveBeenCalledWith('video2');
    });

    it('should handle errors gracefully and collect them', async () => {
      mockApi.list.mockRejectedValue(new Error('Network error'));

      await cli.run(['test123']);

      // Errors are collected and printed
      expect(consoleLogSpy).toHaveBeenCalled();
      const logOutput = consoleLogSpy.mock.calls.flat().join('\n');
      expect(logOutput).toContain('Network error');
    });

    it('should create API without proxy when no proxy options provided', async () => {
      const mockTranscriptList = createMockTranscriptList('test123');
      const mockFetchedTranscript = createMockTranscript('test123');

      const mockTranscript = {
        fetch: jest.fn().mockResolvedValue(mockFetchedTranscript),
      };

      mockTranscriptList.findTranscript = jest.fn().mockReturnValue(mockTranscript);
      mockApi.list.mockResolvedValue(mockTranscriptList);

      await cli.run(['test123']);

      const call = (YouTubeTranscriptApi as jest.Mock).mock.calls[0]!;
      expect(call[0]).toBeUndefined(); // proxyConfig
      expect(call[1]).toBeUndefined(); // httpClient
      expect(call[2]).toBeUndefined(); // options
    });

    it('should prioritize webshare proxy over generic proxy', async () => {
      const mockTranscriptList = createMockTranscriptList('test123');
      const mockFetchedTranscript = createMockTranscript('test123');

      const mockTranscript = {
        fetch: jest.fn().mockResolvedValue(mockFetchedTranscript),
      };

      mockTranscriptList.findTranscript = jest.fn().mockReturnValue(mockTranscript);
      mockApi.list.mockResolvedValue(mockTranscriptList);

      await cli.run([
        'test123',
        '--webshare-proxy-username', 'user',
        '--webshare-proxy-password', 'pass',
        '--http-proxy', 'http://proxy.example.com:8080'
      ]);

      const apiCall = (YouTubeTranscriptApi as jest.Mock).mock.calls[0];
      expect(apiCall[0]).toBeInstanceOf(WebshareProxyConfig);
    });

    it('should extract video IDs from process.argv when passed empty array', async () => {
      const mockTranscriptList = createMockTranscriptList('argvVideo');
      const mockFetchedTranscript = createMockTranscript('argvVideo');

      const mockTranscript = {
        fetch: jest.fn().mockResolvedValue(mockFetchedTranscript),
      };

      mockTranscriptList.findTranscript = jest.fn().mockReturnValue(mockTranscript);
      mockApi.list.mockResolvedValue(mockTranscriptList);

      // Set up process.argv with video ID
      const originalArgv = process.argv;
      process.argv = ['node', 'cli.js', 'argvVideo'];

      try {
        // Create new CLI instance and run with empty array to trigger fallback to process.argv
        const testCli = new YouTubeTranscriptCli();

        // We need to trigger the else branch by passing something that isn't a valid video ID array
        // The condition checks: Array.isArray(videoIds) && videoIds.length > 0 && typeof videoIds[0] === 'string' && !videoIds[0].startsWith('--')
        // Passing an array starting with '--' should trigger the else branch
        await testCli.run(['--format', 'json']);

        // Should have extracted 'argvVideo' from process.argv
        expect(mockApi.list).toHaveBeenCalledWith('argvVideo');
      } finally {
        process.argv = originalArgv;
      }
    });

    it('should skip flag values when extracting video IDs from process.argv', async () => {
      const mockTranscriptList = createMockTranscriptList('argvVideo');
      const mockFetchedTranscript = createMockTranscript('argvVideo');

      const mockTranscript = {
        fetch: jest.fn().mockResolvedValue(mockFetchedTranscript),
      };

      mockTranscriptList.findTranscript = jest.fn().mockReturnValue(mockTranscript);
      mockApi.list.mockResolvedValue(mockTranscriptList);

      const originalArgv = process.argv;
      // Include a FLAGS_WITH_VALUES flag so the i++ skip path (line 146) is exercised
      process.argv = ['node', 'cli.js', 'argvVideo', '--format', 'json'];

      try {
        const testCli = new YouTubeTranscriptCli();
        await testCli.run(['--format', 'json']);

        // Should extract 'argvVideo' but NOT 'json' (value of --format flag)
        expect(mockApi.list).toHaveBeenCalledWith('argvVideo');
        expect(mockApi.list).toHaveBeenCalledTimes(1);
      } finally {
        process.argv = originalArgv;
      }
    });

    it('should show help and exit when no video IDs provided anywhere', async () => {
      expect.assertions(1);
      // Set up process.argv with no video IDs (only flags)
      const originalArgv = process.argv;
      process.argv = ['node', 'cli.js'];

      // Mock stdout to capture help output
      const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation();

      try {
        const testCli = new YouTubeTranscriptCli();
        await testCli.run([]);
      } catch (e: any) {
        // process.exit is called by Commander help - could be 0 or undefined
        expect(processExitSpy).toHaveBeenCalled();
      } finally {
        process.argv = originalArgv;
        stdoutSpy.mockRestore();
      }
    });

    it('should handle when videoIds starts with option flag', async () => {
      const mockTranscriptList = createMockTranscriptList('fallbackVideo');
      const mockFetchedTranscript = createMockTranscript('fallbackVideo');

      const mockTranscript = {
        fetch: jest.fn().mockResolvedValue(mockFetchedTranscript),
      };

      mockTranscriptList.findTranscript = jest.fn().mockReturnValue(mockTranscript);
      mockApi.list.mockResolvedValue(mockTranscriptList);

      const originalArgv = process.argv;
      process.argv = ['node', 'cli.js', 'fallbackVideo', '--list-transcripts'];

      try {
        const testCli = new YouTubeTranscriptCli();
        // Pass array starting with '--' to trigger process.argv fallback
        await testCli.run(['--list-transcripts']);

        expect(mockApi.list).toHaveBeenCalledWith('fallbackVideo');
      } finally {
        process.argv = originalArgv;
      }
    });

  });

  describe('--cookies flag', () => {
    it('should pass cookiePath to YouTubeTranscriptApi options', async () => {
      const mockTranscriptList = createMockTranscriptList('test123');
      const mockFetchedTranscript = createMockTranscript('test123');
      const mockTranscript = { fetch: jest.fn().mockResolvedValue(mockFetchedTranscript) };
      mockTranscriptList.findTranscript = jest.fn().mockReturnValue(mockTranscript);
      mockApi.list.mockResolvedValue(mockTranscriptList);

      await cli.run(['test123', '--cookies', '/path/to/cookies.txt']);

      expect(YouTubeTranscriptApi).toHaveBeenCalledWith(
        undefined, undefined, { cookiePath: '/path/to/cookies.txt' }
      );
    });
  });

  describe('--verbose flag', () => {
    it('should write debug output to stderr', async () => {
      const stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);

      const mockTranscriptList = createMockTranscriptList('test123');
      const mockFetchedTranscript = createMockTranscript('test123');
      const mockTranscript = { fetch: jest.fn().mockResolvedValue(mockFetchedTranscript) };
      mockTranscriptList.findTranscript = jest.fn().mockReturnValue(mockTranscript);
      mockApi.list.mockResolvedValue(mockTranscriptList);

      await cli.run(['test123', '--verbose']);

      const stderrCalls = stderrSpy.mock.calls.map(c => c[0]);
      expect(stderrCalls.some(c => typeof c === 'string' && c.includes('[verbose]'))).toBe(true);
      expect(stderrCalls.some(c => typeof c === 'string' && c.includes('Fetching transcript for: test123'))).toBe(true);

      stderrSpy.mockRestore();
    });

    it('should log proxy configuration when verbose and proxy are both set', async () => {
      const stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);

      const mockTranscriptList = createMockTranscriptList('test123');
      const mockFetchedTranscript = createMockTranscript('test123');
      const mockTranscript = { fetch: jest.fn().mockResolvedValue(mockFetchedTranscript) };
      mockTranscriptList.findTranscript = jest.fn().mockReturnValue(mockTranscript);
      mockApi.list.mockResolvedValue(mockTranscriptList);

      await cli.run(['test123', '--verbose', '--http-proxy', 'http://proxy.example.com:8080']);

      const stderrCalls = stderrSpy.mock.calls.map(c => c[0]);
      expect(stderrCalls.some(c => typeof c === 'string' && c.includes('Using proxy:'))).toBe(true);

      stderrSpy.mockRestore();
    });

    it('should not write verbose output without flag', async () => {
      const stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);

      const mockTranscriptList = createMockTranscriptList('test123');
      const mockFetchedTranscript = createMockTranscript('test123');
      const mockTranscript = { fetch: jest.fn().mockResolvedValue(mockFetchedTranscript) };
      mockTranscriptList.findTranscript = jest.fn().mockReturnValue(mockTranscript);
      mockApi.list.mockResolvedValue(mockTranscriptList);

      await cli.run(['test123']);

      const stderrCalls = stderrSpy.mock.calls.map(c => c[0]);
      expect(stderrCalls.some(c => typeof c === 'string' && c.includes('[verbose]'))).toBe(false);

      stderrSpy.mockRestore();
    });
  });

  describe('--save flag', () => {
    it('should write output to file instead of stdout', async () => {
      mockFs.writeFileSync.mockImplementation(() => {});

      const mockTranscriptList = createMockTranscriptList('test123');
      const mockFetchedTranscript = createMockTranscript('test123');
      const mockTranscript = { fetch: jest.fn().mockResolvedValue(mockFetchedTranscript) };
      mockTranscriptList.findTranscript = jest.fn().mockReturnValue(mockTranscript);
      mockApi.list.mockResolvedValue(mockTranscriptList);

      await cli.run(['test123', '--save', '/tmp/output.txt']);

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '/tmp/output.txt', expect.any(String), 'utf-8'
      );
      // Should NOT write to stdout when saving to file
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('--batch-file flag', () => {
    it('should read video IDs from file', async () => {
      mockFs.existsSync.mockReturnValue(true);
      (mockFs.readFileSync as jest.Mock).mockReturnValue('video1\nvideo2\n# comment\n\nvideo3\n');

      const mockTranscriptList = createMockTranscriptList('video1');
      const mockFetchedTranscript = createMockTranscript('video1');
      const mockTranscript = { fetch: jest.fn().mockResolvedValue(mockFetchedTranscript) };
      mockTranscriptList.findTranscript = jest.fn().mockReturnValue(mockTranscript);
      mockApi.list.mockResolvedValue(mockTranscriptList);

      await cli.run(['--batch-file', '/tmp/ids.txt']);

      // Should have called list for video1, video2, video3 (not comment or blank)
      expect(mockApi.list).toHaveBeenCalledTimes(3);
      expect(mockApi.list).toHaveBeenCalledWith('video1');
      expect(mockApi.list).toHaveBeenCalledWith('video2');
      expect(mockApi.list).toHaveBeenCalledWith('video3');
    });

    it('should merge batch file IDs with command-line IDs', async () => {
      mockFs.existsSync.mockReturnValue(true);
      (mockFs.readFileSync as jest.Mock).mockReturnValue('batchVideo\n');

      const mockTranscriptList = createMockTranscriptList('cliVideo');
      const mockFetchedTranscript = createMockTranscript('cliVideo');
      const mockTranscript = { fetch: jest.fn().mockResolvedValue(mockFetchedTranscript) };
      mockTranscriptList.findTranscript = jest.fn().mockReturnValue(mockTranscript);
      mockApi.list.mockResolvedValue(mockTranscriptList);

      await cli.run(['cliVideo', '--batch-file', '/tmp/ids.txt']);

      expect(mockApi.list).toHaveBeenCalledTimes(2);
      expect(mockApi.list).toHaveBeenCalledWith('cliVideo');
      expect(mockApi.list).toHaveBeenCalledWith('batchVideo');
    });

    it('should error if batch file does not exist', async () => {
      expect.assertions(2);
      mockFs.existsSync.mockReturnValue(false);

      try {
        await cli.run(['--batch-file', '/nonexistent.txt']);
      } catch (e: any) {
        expect(e.message).toBe('process.exit(1)');
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error: Batch file not found: /nonexistent.txt');
    });
  });

  describe('--fail-fast flag', () => {
    it('should stop on first error and exit non-zero when --fail-fast is set', async () => {
      expect.assertions(3);
      mockApi.list
        .mockRejectedValueOnce(new Error('Failed for video1'))
        .mockResolvedValueOnce(createMockTranscriptList('video2'));

      try {
        await cli.run(['video1', 'video2', '--fail-fast']);
      } catch (e: any) {
        expect(e.message).toBe('process.exit(1)');
      }

      // Should only have called list once (stopped after first error)
      expect(mockApi.list).toHaveBeenCalledTimes(1);
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should continue on error without --fail-fast (default)', async () => {
      const mockTranscriptList = createMockTranscriptList('video2');
      const mockFetchedTranscript = createMockTranscript('video2');
      const mockTranscript = { fetch: jest.fn().mockResolvedValue(mockFetchedTranscript) };
      mockTranscriptList.findTranscript = jest.fn().mockReturnValue(mockTranscript);

      mockApi.list
        .mockRejectedValueOnce(new Error('Failed for video1'))
        .mockResolvedValueOnce(mockTranscriptList);

      await cli.run(['video1', 'video2']);

      // Should have called list for both videos
      expect(mockApi.list).toHaveBeenCalledTimes(2);
    });
  });
});

describe('main function', () => {
  let consoleErrorSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;
  let processExitSpy: jest.SpyInstance;
  let originalArgv: string[];

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit(${code})`);
    });
    originalArgv = process.argv;
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
    processExitSpy.mockRestore();
    process.argv = originalArgv;
  });

  it('should be a function', () => {
    expect(typeof main).toBe('function');
  });

  it('should export YouTubeTranscriptCli class', () => {
    expect(typeof YouTubeTranscriptCli).toBe('function');
  });

  it('should handle Error objects and exit with code 1', async () => {
    expect.assertions(3);
    process.argv = ['node', 'cli.js', 'test123'];

    // Mock YouTubeTranscriptCli to throw when run() is called
    const mockError = new Error('Test error message');
    jest.spyOn(YouTubeTranscriptCli.prototype, 'run').mockRejectedValueOnce(mockError);

    try {
      await main();
    } catch (e: any) {
      expect(e.message).toBe('process.exit(1)');
    }

    expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', 'Test error message');
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  it('should handle non-Error objects and exit with code 1', async () => {
    expect.assertions(3);
    process.argv = ['node', 'cli.js', 'test123'];

    // Mock YouTubeTranscriptCli to throw a non-Error object when run() is called
    jest.spyOn(YouTubeTranscriptCli.prototype, 'run').mockRejectedValueOnce('String error');

    try {
      await main();
    } catch (e: any) {
      expect(e.message).toBe('process.exit(1)');
    }

    expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', 'String error');
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  it('should run CLI with process.argv arguments', async () => {
    process.argv = ['node', 'cli.js', 'videoId123'];

    const mockTranscriptList = {
      findTranscript: jest.fn().mockReturnValue({
        fetch: jest.fn().mockResolvedValue({
          snippets: [],
          videoId: 'videoId123',
          language: 'English',
          languageCode: 'en',
          isGenerated: false,
        }),
      }),
    };

    const mockApi = {
      list: jest.fn().mockResolvedValue(mockTranscriptList),
    };

    (YouTubeTranscriptApi as jest.Mock).mockImplementation(() => mockApi);

    await main();

    expect(mockApi.list).toHaveBeenCalledWith('videoId123');
  });
});
