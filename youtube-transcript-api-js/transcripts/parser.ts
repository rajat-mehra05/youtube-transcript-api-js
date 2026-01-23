import { parseString } from 'xml2js';
import { FetchedTranscriptSnippet } from './models';
import { TranscriptParseError } from '../errors';

/**
 * HTML formatting tags that can be preserved
 */
const FORMATTING_TAGS = [
  'strong',  // important
  'em',      // emphasized
  'b',       // bold
  'i',       // italic
  'mark',    // marked
  'small',   // smaller
  'del',     // deleted
  'ins',     // inserted
  'sub',     // subscript
  'sup',     // superscript
];

/**
 * Parser for YouTube transcript XML data
 */
export class TranscriptParser {
  private readonly preserveFormatting: boolean;
  private readonly htmlRegex: RegExp;

  constructor(preserveFormatting: boolean = false) {
    this.preserveFormatting = preserveFormatting;
    this.htmlRegex = this.getHtmlRegex(preserveFormatting);
  }

  /**
   * Parse raw transcript XML data into snippets
   */
  async parse(rawData: string): Promise<FetchedTranscriptSnippet[]> {
    try {
      const xmlDoc = await this.parseXml(rawData);
      const snippets: FetchedTranscriptSnippet[] = [];

      if (xmlDoc && xmlDoc.transcript && xmlDoc.transcript.text) {
        for (const element of xmlDoc.transcript.text) {
          if (element._) {
            const text = this.cleanText(element._);
            const start = parseFloat(element.$.start || '0');
            const duration = parseFloat(element.$.dur || '0');

            snippets.push(new FetchedTranscriptSnippet(text, start, duration));
          }
        }
      }

      return snippets;
    } catch (error) {
      throw new TranscriptParseError(
        `Failed to parse transcript XML: ${error}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Parse XML string into object
   */
  private parseXml(xmlString: string): Promise<any> {
    return new Promise((resolve, reject) => {
      parseString(xmlString, { explicitArray: false }, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }

  /**
   * Clean text by removing unwanted HTML tags
   */
  private cleanText(text: string): string {
    return text.replace(this.htmlRegex, '').trim();
  }

  /**
   * Get HTML regex based on formatting preservation setting
   */
  private getHtmlRegex(preserveFormatting: boolean): RegExp {
    if (preserveFormatting) {
      const formatsRegex = FORMATTING_TAGS.join('|');
      const pattern = `</?(?!/?(${formatsRegex})\\b).*?\\b>`;
      return new RegExp(pattern, 'gi');
    } else {
      return /<[^>]*>/gi;
    }
  }
}

/**
 * Utility function to parse transcript XML
 */
export async function parseTranscriptXml(rawData: string, preserveFormatting: boolean = false): Promise<FetchedTranscriptSnippet[]> {
  const parser = new TranscriptParser(preserveFormatting);
  return parser.parse(rawData);
}
