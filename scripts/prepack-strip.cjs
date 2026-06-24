/**
 * scripts/prepack-strip.cjs — strips devDependencies from package.json before
 * `npm pack` / `npm publish` (#852).
 *
 * WHY: All devDependencies (picocolors, nanospinner, fast-glob, semver, zod,
 * diff, @clack/prompts, esbuild) are bundled into dist/rcode.js via esbuild
 * and are NOT needed at runtime by consumers. Publishing them in
 * devDependencies causes pnpm to try to hoist/resolve them in workspace
 * installs, which triggers spurious ENOENT WARN messages about ts-node bin
 * symlinks when those packages' transitive dep graphs intersect with
 * ts-node already present in the user's monorepo.
 *
 * This script:
 *   1. Backs up package.json → package.json.prepack-backup
 *   2. Writes a clean package.json with devDependencies removed
 *
 * scripts/postpack-restore.cjs reverses step 2.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PKG_PATH = path.join(ROOT, 'package.json');
const BACKUP_PATH = path.join(ROOT, 'package.json.prepack-backup');

const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'));

// Back up the original so postpack-restore.cjs can recover it.
fs.writeFileSync(BACKUP_PATH, JSON.stringify(pkg, null, 2) + '\n');

// Strip devDependencies — all are bundled into dist/rcode.js.
const published = { ...pkg };
delete published.devDependencies;

fs.writeFileSync(PKG_PATH, JSON.stringify(published, null, 2) + '\n');

console.log('✓ prepack: devDependencies stripped from package.json for publish');
