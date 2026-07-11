---
'youtube-transcript-api-js': major
---

Harden request and parsing, and remove the non-functional Invidious feature.

Security hardening: URL-encode the video ID before building the watch URL so a caller-supplied ID cannot inject query parameters, bound the HTML tag-stripping regexes so hostile caption text cannot trigger quadratic backtracking, and cap the HTTP client's response and request body size (10 MB) so a malicious or compromised upstream cannot stream an unbounded body into memory.

Removal (breaking for TypeScript consumers referencing the removed names): `EnhancedYouTubeTranscriptApi` no longer accepts Invidious options. The `InvidiousOptions` type, the `setInvidiousOptions` method, and the constructor's second argument are gone. The Invidious client was constructed but never used to fetch anything, so no runtime behavior changes. Its unused internal HTTP client was removed too. Proxy support, formatter output, and `getVideoMetadata` are unchanged.
