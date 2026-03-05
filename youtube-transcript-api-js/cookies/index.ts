import * as fs from 'fs';
import * as path from 'path';
import { CookiePathInvalid, CookieInvalid } from '../errors';

/**
 * Parsed cookie from a cookie file
 */
export interface ParsedCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  secure: boolean;
  expiry: number;
}

/** Domains that YouTube authentication cookies can belong to */
const YOUTUBE_DOMAINS = ['.youtube.com', 'youtube.com', '.google.com', 'google.com'];

/**
 * Check if a cookie domain is relevant for YouTube authentication
 */
function isYouTubeDomain(domain: string): boolean {
  const normalized = domain.toLowerCase();
  return YOUTUBE_DOMAINS.some(yt => normalized === yt || normalized.endsWith(yt));
}

/**
 * Parse cookies from Netscape/Mozilla cookie file format.
 * Format: domain\tflag\tpath\tsecure\texpiry\tname\tvalue
 * Lines starting with # are comments.
 */
export function parseNetscapeCookies(content: string): ParsedCookie[] {
  const cookies: ParsedCookie[] = [];

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const fields = trimmed.split('\t');
    if (fields.length < 7) continue;

    cookies.push({
      domain: fields[0]!,
      path: fields[2]!,
      secure: fields[3]!.toUpperCase() === 'TRUE',
      expiry: parseInt(fields[4]!, 10) || 0,
      name: fields[5]!,
      value: fields[6]!,
    });
  }

  return cookies;
}

/**
 * Parse cookies from JSON format.
 * Expects an array of objects with at least { name, value, domain }.
 */
export function parseJsonCookies(content: string): ParsedCookie[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new CookieInvalid('cookie file');
  }

  if (!Array.isArray(parsed)) {
    throw new CookieInvalid('cookie file');
  }

  return parsed
    .filter((c): c is Record<string, unknown> =>
      c != null && typeof c === 'object' && typeof (c as any).name === 'string' && typeof (c as any).value === 'string'
    )
    .map((c) => ({
      name: c.name as string,
      value: c.value as string,
      domain: (c.domain as string) || '',
      path: (c.path as string) || '/',
      secure: Boolean(c.secure),
      expiry: typeof c.expirationDate === 'number' ? c.expirationDate
        : typeof c.expiry === 'number' ? c.expiry : 0,
    }));
}

/**
 * Format an array of cookies into a Cookie header value.
 */
export function formatCookieHeader(cookies: ParsedCookie[]): string {
  return cookies.map(c => `${c.name}=${c.value}`).join('; ');
}

/**
 * Load cookies from a file and return a Cookie header string.
 * Auto-detects format: .json → JSON, otherwise → Netscape.
 * Only includes cookies for YouTube/Google domains.
 *
 * @throws CookiePathInvalid if the file does not exist
 * @throws CookieInvalid if no YouTube cookies are found or parsing fails
 */
export function loadCookiesFromFile(cookiePath: string): string {
  if (!fs.existsSync(cookiePath)) {
    throw new CookiePathInvalid(cookiePath);
  }

  const content = fs.readFileSync(cookiePath, 'utf-8');
  const ext = path.extname(cookiePath).toLowerCase();

  const cookies = ext === '.json'
    ? parseJsonCookies(content)
    : parseNetscapeCookies(content);

  const youtubeCookies = cookies.filter(c => isYouTubeDomain(c.domain));

  if (youtubeCookies.length === 0) {
    throw new CookieInvalid(cookiePath);
  }

  return formatCookieHeader(youtubeCookies);
}
