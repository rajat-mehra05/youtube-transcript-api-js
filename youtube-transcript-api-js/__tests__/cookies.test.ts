import * as fs from 'fs';
import {
  parseNetscapeCookies,
  parseJsonCookies,
  formatCookieHeader,
  loadCookiesFromFile,
} from '../cookies';
import { CookiePathInvalid, CookieInvalid } from '../errors';

jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

const VALID_NETSCAPE = `# Netscape HTTP Cookie File
# https://curl.se/docs/http-cookies.html
.youtube.com\tTRUE\t/\tFALSE\t0\tSID\tabc123
.youtube.com\tTRUE\t/\tTRUE\t1700000000\tHSID\tdef456
.google.com\tTRUE\t/\tFALSE\t0\tNID\tghi789
.example.com\tTRUE\t/\tFALSE\t0\tOTHER\tval`;

const VALID_JSON = JSON.stringify([
  { name: 'SID', value: 'abc123', domain: '.youtube.com', path: '/', secure: false, expirationDate: 0 },
  { name: 'HSID', value: 'def456', domain: '.youtube.com', path: '/', secure: true, expirationDate: 1700000000 },
  { name: 'NID', value: 'ghi789', domain: '.google.com', path: '/', secure: false },
  { name: 'OTHER', value: 'val', domain: '.example.com', path: '/' },
]);

describe('parseNetscapeCookies', () => {
  it('should parse valid Netscape format', () => {
    const cookies = parseNetscapeCookies(VALID_NETSCAPE);
    expect(cookies).toHaveLength(4);
    expect(cookies[0]).toEqual({
      domain: '.youtube.com',
      path: '/',
      secure: false,
      expiry: 0,
      name: 'SID',
      value: 'abc123',
    });
  });

  it('should skip comment lines', () => {
    const content = '# comment\n.youtube.com\tTRUE\t/\tFALSE\t0\tSID\tval';
    const cookies = parseNetscapeCookies(content);
    expect(cookies).toHaveLength(1);
  });

  it('should skip blank lines', () => {
    const content = '\n\n.youtube.com\tTRUE\t/\tFALSE\t0\tSID\tval\n\n';
    const cookies = parseNetscapeCookies(content);
    expect(cookies).toHaveLength(1);
  });

  it('should skip malformed lines with fewer than 7 fields', () => {
    const content = 'only\ttwo\tfields\n.youtube.com\tTRUE\t/\tFALSE\t0\tSID\tval';
    const cookies = parseNetscapeCookies(content);
    expect(cookies).toHaveLength(1);
  });

  it('should handle secure flag case-insensitively', () => {
    const content = '.youtube.com\tTRUE\t/\ttrue\t0\tSID\tval';
    const cookies = parseNetscapeCookies(content);
    expect(cookies[0]!.secure).toBe(true);
  });
});

describe('parseJsonCookies', () => {
  it('should parse valid JSON cookie array', () => {
    const cookies = parseJsonCookies(VALID_JSON);
    expect(cookies).toHaveLength(4);
    expect(cookies[0]).toEqual({
      name: 'SID',
      value: 'abc123',
      domain: '.youtube.com',
      path: '/',
      secure: false,
      expiry: 0,
    });
  });

  it('should handle expirationDate field (browser DevTools format)', () => {
    const json = JSON.stringify([{ name: 'X', value: 'Y', domain: '.youtube.com', expirationDate: 999 }]);
    const cookies = parseJsonCookies(json);
    expect(cookies[0]!.expiry).toBe(999);
  });

  it('should skip entries without name or value', () => {
    const json = JSON.stringify([
      { name: 'GOOD', value: 'ok', domain: '.youtube.com' },
      { name: 'NO_VALUE' },
      { value: 'NO_NAME' },
    ]);
    const cookies = parseJsonCookies(json);
    expect(cookies).toHaveLength(1);
    expect(cookies[0]!.name).toBe('GOOD');
  });

  it('should throw CookieInvalid for invalid JSON', () => {
    expect(() => parseJsonCookies('not json')).toThrow(CookieInvalid);
  });

  it('should throw CookieInvalid for non-array JSON', () => {
    expect(() => parseJsonCookies('{"not": "array"}')).toThrow(CookieInvalid);
  });
});

describe('formatCookieHeader', () => {
  it('should format cookies as header string', () => {
    const cookies = [
      { name: 'SID', value: 'abc', domain: '', path: '', secure: false, expiry: 0 },
      { name: 'HSID', value: 'def', domain: '', path: '', secure: false, expiry: 0 },
    ];
    expect(formatCookieHeader(cookies)).toBe('SID=abc; HSID=def');
  });

  it('should return empty string for empty array', () => {
    expect(formatCookieHeader([])).toBe('');
  });
});

describe('loadCookiesFromFile', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should throw CookiePathInvalid for nonexistent file', () => {
    mockFs.existsSync.mockReturnValue(false);
    expect(() => loadCookiesFromFile('/nonexistent/cookies.txt')).toThrow(CookiePathInvalid);
  });

  it('should auto-detect Netscape format for .txt extension', () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(VALID_NETSCAPE);

    const header = loadCookiesFromFile('/path/to/cookies.txt');
    expect(header).toContain('SID=abc123');
    expect(header).toContain('NID=ghi789');
    // Should NOT include non-YouTube cookies
    expect(header).not.toContain('OTHER=val');
  });

  it('should auto-detect JSON format for .json extension', () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(VALID_JSON);

    const header = loadCookiesFromFile('/path/to/cookies.json');
    expect(header).toContain('SID=abc123');
    expect(header).not.toContain('OTHER=val');
  });

  it('should filter to YouTube/Google domains only', () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(VALID_NETSCAPE);

    const header = loadCookiesFromFile('/path/to/cookies.txt');
    const parts = header.split('; ');
    // Should have 3 cookies: SID (.youtube.com), HSID (.youtube.com), NID (.google.com)
    expect(parts).toHaveLength(3);
  });

  it('should throw CookieInvalid if no YouTube cookies found', () => {
    const nonYouTubeCookies = '.example.com\tTRUE\t/\tFALSE\t0\tFOO\tbar';
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(nonYouTubeCookies);

    expect(() => loadCookiesFromFile('/path/to/cookies.txt')).toThrow(CookieInvalid);
  });

  it('should default to Netscape format for unknown extensions', () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(VALID_NETSCAPE);

    const header = loadCookiesFromFile('/path/to/cookies');
    expect(header).toContain('SID=abc123');
  });
});
