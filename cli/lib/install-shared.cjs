/**
 * cli/lib/install-shared.cjs — shared constants and output helpers used
 * across the cli/lib/install-*.cjs modules and cli/install.js itself.
 *
 * Split out of cli/install.js (#1066 Phase 1) — mechanical move, no
 * behavior change. Preserves the exact PACKAGE_ROOT/SOURCE_ROOT values and
 * ok/fail/warn/info/dim/bold formatting used throughout the installer.
 */

const path = require('path');
const pc = require('picocolors');

// Output helpers: always respect NO_COLOR / non-TTY (picocolors handles this).
const ok   = (s) => pc.green('✓') + ' ' + s;
const fail = (s) => pc.red('✗') + ' ' + s;
const warn = (s) => pc.yellow('⚠') + ' ' + s;
const info = (s) => pc.cyan('→') + ' ' + s;
const dim  = (s) => pc.dim(s);
const bold = (s) => pc.bold(s);

// __dirname here is <package>/cli/lib — go up two levels to reach package root.
const PACKAGE_ROOT = path.resolve(__dirname, '..', '..');
const SOURCE_ROOT = path.join(PACKAGE_ROOT, 'rcode');

module.exports = {
  ok,
  fail,
  warn,
  info,
  dim,
  bold,
  PACKAGE_ROOT,
  SOURCE_ROOT,
};
