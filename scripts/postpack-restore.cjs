/**
 * scripts/postpack-restore.cjs — restores package.json after npm pack/publish
 * from the backup written by scripts/prepack-strip.cjs (#852).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PKG_PATH = path.join(ROOT, 'package.json');
const BACKUP_PATH = path.join(ROOT, 'package.json.prepack-backup');

if (!fs.existsSync(BACKUP_PATH)) {
  // Nothing to restore — prepack-strip may not have run (e.g., direct build).
  process.exit(0);
}

fs.copyFileSync(BACKUP_PATH, PKG_PATH);
fs.unlinkSync(BACKUP_PATH);

console.log('✓ postpack: package.json restored from backup');
