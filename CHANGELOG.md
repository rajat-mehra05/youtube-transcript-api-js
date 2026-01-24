# youtube-transcript-api-js

## 2.0.2

### Patch Changes

- 1851e58: update workflow and bump version

## 2.0.1

### Patch Changes

- Updated publish workflow and release script

## 2.0.0

### Major Changes

- Renamed package from `@rajat-mehra/youtube-transcript-api-js` to `youtube-transcript-api-js`

**Migration:** Update your imports and package.json dependency:

```bash
npm uninstall @rajat-mehra/youtube-transcript-api-js
npm install youtube-transcript-api-js
```

Then update all imports:

```typescript
// Before
import { YouTubeTranscriptApi } from '@rajat-mehra/youtube-transcript-api-js';

// After
import { YouTubeTranscriptApi } from 'youtube-transcript-api-js';
```

## 1.2.0

### Minor Changes

- 3fd0083: update readme with correct usage

## 1.1.0

### Minor Changes

- aa05bd5: bumpo package version and add changeset config
