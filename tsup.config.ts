import { defineConfig } from 'tsup';

export default defineConfig([
  // Main library build (CJS + ESM)
  {
    entry: ['youtube-transcript-api-js/index.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    outDir: 'dist',
    target: 'es2020',
    minify: false,
    treeshake: true,
    external: ['axios', 'commander', 'html-entities', 'http-proxy-agent', 'https-proxy-agent', 'xml2js'],
  },
  // CLI build (CJS only)
  {
    entry: { 'cli/index': 'youtube-transcript-api-js/cli/index.ts' },
    format: ['cjs'],
    dts: false,
    splitting: false,
    sourcemap: false,
    clean: false,
    outDir: 'dist',
    target: 'es2020',
    minify: false,
    external: ['axios', 'commander', 'html-entities', 'http-proxy-agent', 'https-proxy-agent', 'xml2js'],
  },
]);
