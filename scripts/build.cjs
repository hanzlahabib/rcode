/**
 * scripts/build.cjs — esbuild bundler for the rcode CLI (#245)
 *
 * Bundles cli/index.js + all devDependency packages into a single
 * self-contained dist/rcode.js. The published npm artifact has zero
 * external requires — all packages are inlined.
 *
 * Run: node scripts/build.cjs
 *       npm run build:cli
 */

'use strict';

const { buildSync } = require('esbuild');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'dist', 'rcode.js');

fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });

const result = buildSync({
  entryPoints: [path.join(ROOT, 'cli', 'index.js')],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outfile: OUT,
  // Mark only true Node.js built-ins as external — everything else gets bundled.
  packages: 'bundle',
  external: [
    'node:*',
    'fs', 'path', 'crypto', 'os', 'child_process', 'readline',
    'http', 'https', 'net', 'tls', 'stream', 'url', 'util', 'events',
    'assert', 'buffer', 'zlib', 'string_decoder', 'querystring',
    'worker_threads', 'cluster', 'dns', 'dgram', 'tty', 'v8', 'vm',
  ],
  // No banner here — we prepend the shebang + comment manually after build
  // to guarantee exactly one shebang on line 1 regardless of esbuild shebang handling.
  minify: false,
  sourcemap: false,
  logLevel: 'info',
});

if (result.errors && result.errors.length > 0) {
  console.error('Build failed:', result.errors);
  process.exit(1);
}

// Prepend exactly one shebang + build comment. Strip any shebang esbuild
// may have preserved from the source file to avoid a duplicate on line 2.
let bundle = fs.readFileSync(OUT, 'utf8');
bundle = bundle.replace(/^#!.*\n/, '');  // strip any existing shebang
bundle = '#!/usr/bin/env node\n/* rcode — built with esbuild. Source: github.com/hanzlahabib/rihal-code */\n' + bundle;
fs.writeFileSync(OUT, bundle, 'utf8');

// Make the bundle executable
fs.chmodSync(OUT, 0o755);

const sizeKb = (fs.statSync(OUT).size / 1024).toFixed(1);
console.log(`✓ dist/rcode.js  ${sizeKb} KB`);
