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
const { createSpinner: createNanoSpinner } = require('nanospinner');

// Output helpers: always respect NO_COLOR / non-TTY (picocolors handles this).
const ok   = (s) => pc.green('✓') + ' ' + s;
const fail = (s) => pc.red('✗') + ' ' + s;
const warn = (s) => pc.yellow('⚠') + ' ' + s;
const info = (s) => pc.cyan('→') + ' ' + s;
const dim  = (s) => pc.dim(s);
const bold = (s) => pc.bold(s);

// Fallback width when the TTY reports 0 columns (a pty with no window size:
// `docker run -t`, some ssh/CI/`script` sessions). nanospinner divides the
// line length by stream.columns; 0 yields Infinity "lines" and its clear()
// loop then never terminates, hanging the install at "Installing N files…".
const FALLBACK_COLUMNS = 80;

function createSpinner(text, opts = {}) {
  const base = opts.stream || process.stderr;
  const stream = {
    get columns() { return base.columns > 0 ? base.columns : FALLBACK_COLUMNS; },
    write: (chunk) => base.write(chunk),
  };
  return createNanoSpinner(text, { ...opts, stream });
}

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
  createSpinner,
  FALLBACK_COLUMNS,
  PACKAGE_ROOT,
  SOURCE_ROOT,
};
