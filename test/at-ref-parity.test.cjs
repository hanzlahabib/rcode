/**
 * @-reference parity test.
 *
 * Workflows and agents reference files via the `@<path>.md` syntax,
 * resolved at runtime by Claude Code. References that don't resolve
 * silently load nothing — the agent runs without the rule it claims
 * to load.
 *
 * Snapshot baseline 2026-04-30: 5 missing refs (tracked in #483 —
 * source-vs-install layout drift). They resolve in the source layout
 * (rcode/) but not the install layout (.rcode/). Test ratchets the
 * count down as #483 gets fixed.
 *
 * Run: node --test test/at-ref-parity.test.cjs
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SCAN_DIR = path.join(PROJECT_ROOT, 'rcode');
const BASELINE_BROKEN_REFS = 0;

const REF_RE = /@((?:\.rcode|rcode)\/[a-zA-Z0-9_/.\-]+\.md)/g;

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) walk(f, out);
    else if (e.isFile() && f.endsWith('.md')) out.push(f);
  }
  return out;
}

// `.rcode/` is the install-time mirror of the `rcode/` source tree. A
// `@.rcode/<rest>` ref is valid if it resolves in EITHER layout — the install
// copy OR the `rcode/<rest>` source. Checking only the install copy produces
// false positives whenever the local install is stale (#761 / #483).
function refResolves(ref) {
  if (fs.existsSync(path.join(PROJECT_ROOT, ref))) return true;
  if (ref.startsWith('.rcode/')) {
    return fs.existsSync(path.join(PROJECT_ROOT, 'rcode/' + ref.slice('.rcode/'.length)));
  }
  return false;
}

function findBrokenRefs() {
  const broken = new Set();
  for (const f of walk(SCAN_DIR)) {
    const text = fs.readFileSync(f, 'utf8');
    let m;
    while ((m = REF_RE.exec(text)) !== null) {
      const ref = m[1];
      if (!refResolves(ref)) broken.add(ref);
    }
  }
  return [...broken].sort();
}

test('broken @-references do not regress past baseline', () => {
  const broken = findBrokenRefs();
  if (broken.length > BASELINE_BROKEN_REFS) {
    assert.fail(
      `Broken @-references regressed: ${broken.length} (baseline: ${BASELINE_BROKEN_REFS}).\n` +
        broken.map((r) => `  - ${r}`).join('\n') +
        `\nFix the ref to an existing path or create the file.`,
    );
  }
  if (broken.length < BASELINE_BROKEN_REFS) {
    // eslint-disable-next-line no-console
    console.log(
      `# at-ref-parity: ${broken.length} broken refs ` +
        `(baseline ${BASELINE_BROKEN_REFS}). Drop BASELINE_BROKEN_REFS in this test.`,
    );
  }
});
