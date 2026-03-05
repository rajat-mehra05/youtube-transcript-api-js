import { defineConfig } from 'tsup';
import pkg from './package.json';

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
    external: ['axios', 'commander', 'html-entities', 'http-proxy-agent', 'https-proxy-agent', 'fast-xml-parser'],
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
    define: {
      'process.env.PACKAGE_VERSION': JSON.stringify(pkg.version),
    },
    external: ['axios', 'commander', 'html-entities', 'http-proxy-agent', 'https-proxy-agent', 'fast-xml-parser'],
  },
]);
