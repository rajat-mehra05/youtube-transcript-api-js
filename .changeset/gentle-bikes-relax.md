---
'youtube-transcript-api-js': patch
---

Remove the unused html-entities dependency. It was declared but never imported anywhere in source; HTML unescaping is hand-rolled in fetcher.ts
