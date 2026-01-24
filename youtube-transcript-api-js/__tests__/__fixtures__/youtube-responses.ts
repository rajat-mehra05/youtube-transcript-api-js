/**
 * Test fixtures for YouTube transcript API tests
 */

// Valid transcript XML with multiple text elements
export const VALID_TRANSCRIPT_XML = `<?xml version="1.0" encoding="utf-8" ?>
<transcript>
  <text start="0" dur="2.5">Hello world</text>
  <text start="2.5" dur="3.0">This is a test transcript</text>
  <text start="5.5" dur="2.0">With multiple snippets</text>
</transcript>`;

// Empty transcript XML (no text elements)
export const EMPTY_TRANSCRIPT_XML = `<?xml version="1.0" encoding="utf-8" ?>
<transcript>
</transcript>`;

// Malformed XML for error testing
export const MALFORMED_XML = `<?xml version="1.0" encoding="utf-8" ?>
<transcript>
  <text start="0" dur="2.5">Unclosed element
</transcript`;

// XML with HTML tags in text
export const HTML_FORMATTED_XML = `<?xml version="1.0" encoding="utf-8" ?>
<transcript>
  <text start="0" dur="2.5"><b>Bold text</b> and <i>italic text</i></text>
  <text start="2.5" dur="3.0"><strong>Strong</strong> and <em>emphasized</em></text>
  <text start="5.5" dur="2.0"><mark>Highlighted</mark> and <small>small</small></text>
  <text start="8.0" dur="2.0"><del>Deleted</del> and <ins>Inserted</ins></text>
  <text start="10.0" dur="2.0">H<sub>2</sub>O and E=mc<sup>2</sup></text>
</transcript>`;

// XML with missing attributes
export const MISSING_ATTRIBUTES_XML = `<?xml version="1.0" encoding="utf-8" ?>
<transcript>
  <text>Text without start or duration</text>
  <text start="2.5">Text without duration</text>
  <text dur="3.0">Text without start</text>
</transcript>`;

// XML with empty text elements
export const EMPTY_TEXT_ELEMENTS_XML = `<?xml version="1.0" encoding="utf-8" ?>
<transcript>
  <text start="0" dur="2.5">Valid text</text>
  <text start="2.5" dur="3.0"></text>
  <text start="5.5" dur="2.0">Another valid text</text>
</transcript>`;

// Single element XML
export const SINGLE_ELEMENT_XML = `<?xml version="1.0" encoding="utf-8" ?>
<transcript>
  <text start="0" dur="5.0">Single snippet</text>
</transcript>`;

// XML with special characters
export const SPECIAL_CHARACTERS_XML = `<?xml version="1.0" encoding="utf-8" ?>
<transcript>
  <text start="0" dur="2.5">&amp; &lt; &gt; &quot; &apos;</text>
  <text start="2.5" dur="3.0">Unicode: é à ü ñ 中文 日本語</text>
</transcript>`;

// Mock video page HTML with INNERTUBE_API_KEY
export const VIDEO_PAGE_HTML = `
<!DOCTYPE html>
<html>
<head><title>Test Video</title></head>
<body>
<script>
  var ytInitialPlayerResponse = {
    "captions": {
      "playerCaptionsTracklistRenderer": {
        "captionTracks": [
          {
            "baseUrl": "https://www.youtube.com/api/timedtext?v=test123&lang=en",
            "name": {"simpleText": "English"},
            "vssId": ".en",
            "languageCode": "en",
            "isTranslatable": true
          }
        ],
        "translationLanguages": [
          {"languageCode": "es", "languageName": {"simpleText": "Spanish"}},
          {"languageCode": "fr", "languageName": {"simpleText": "French"}}
        ]
      }
    }
  };
  var INNERTUBE_API_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
</script>
</body>
</html>`;

// Mock INNERTUBE player response with captions
export const INNERTUBE_RESPONSE = {
  captions: {
    playerCaptionsTracklistRenderer: {
      captionTracks: [
        {
          baseUrl: 'https://www.youtube.com/api/timedtext?v=test123&lang=en',
          name: { simpleText: 'English' },
          vssId: '.en',
          languageCode: 'en',
          isTranslatable: true
        },
        {
          baseUrl: 'https://www.youtube.com/api/timedtext?v=test123&lang=es',
          name: { simpleText: 'Spanish' },
          vssId: 'a.es',
          languageCode: 'es',
          isTranslatable: false
        }
      ],
      translationLanguages: [
        { languageCode: 'de', languageName: { simpleText: 'German' } },
        { languageCode: 'fr', languageName: { simpleText: 'French' } }
      ]
    }
  }
};

// Rate limit response headers
export const RATE_LIMIT_HEADERS = {
  'retry-after': '60',
  'content-type': 'text/html'
};

// Test video IDs
export const TEST_VIDEO_ID = 'dQw4w9WgXcQ';
export const INVALID_VIDEO_ID = 'invalid-id-12345';

// Mock HTTP responses
export const MOCK_429_RESPONSE = {
  status: 429,
  statusText: 'Too Many Requests',
  headers: RATE_LIMIT_HEADERS,
  data: 'Rate limit exceeded'
};

export const MOCK_404_RESPONSE = {
  status: 404,
  statusText: 'Not Found',
  data: 'Video not found'
};

export const MOCK_200_RESPONSE = {
  status: 200,
  statusText: 'OK',
  data: VALID_TRANSCRIPT_XML
};
