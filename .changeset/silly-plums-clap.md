---
'youtube-transcript-api-js': patch
---

Modernize the dev toolchain: upgrade eslint to 10.x (flat config), migrate to the unified typescript-eslint package (8.x), upgrade jest to 30.x with matching @types/jest, upgrade @types/node to 24.x, and override esbuild to 0.28.1. Fixes the remaining transitive CVEs (minimatch, ajv, esbuild) and the last Dependabot alerts from the security audit
