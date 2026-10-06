/**
 * No shipped file may `@`-include a path the install does not create.
 *
 * Installs real profiles into tmpdirs (isolated HOME) and resolves every
 * `@.rcode/...`, `@rcode/...` and `@.claude/...` include found in the
 * installed agents, commands, skills and .rcode tree against the files that
 * install actually produced. `@rcode/...` is the in-repo layout and never
 * exists in a consumer project, so it always counts as dangling.
 *
 * Fenced code blocks are skipped: they hold example output and templates
 * (e.g. a sample `@path` mention inside a PR body), not includes the model
 * is told to load.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO = path.resolve(__dirname, '..');
const CLI = path.join(REPO, 'cli', 'install.js');
const SCAN_ROOTS = ['.claude', '.rcode'];
// Never scanned: backups hold prior installs, and brain/ best-practices are fetched content.
const SKIP_DIRS = new Set(['backups', 'node_modules', '.git']);
// Include token: starts a line or follows whitespace / opening punctuation.
const INCLUDE_RE = /(?:^|[\s`("'<[])(@\.?(?:rcode|claude)\/[\w./*{}-]+)/g;

function install(args) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'rcode-inc-')));
  const home = path.join(dir, '_home');
  const r = spawnSync(process.execPath, [CLI, dir, '--yes', '--ide', 'claude', '--no-update-check', ...args], {
    encoding: 'utf8',
    env: { ...process.env, HOME: home, USERPROFILE: home },
  });
  assert.strictEqual(r.status, 0, r.stderr || r.stdout);
  return dir;
}

function textFiles(root) {
  const out = [];
  (function walk(d) {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) walk(path.join(d, e.name)); continue; }
      if (/\.(md|mdc)$/.test(e.name)) out.push(path.join(d, e.name));
    }
  })(root);
  return out;
}

function resolves(dir, include) {
  if (include.startsWith('@rcode/')) return false;
  const rel = include.slice(1).replace(/[.,;:)'"`*]+$/, '');
  if (!rel.includes('*')) return fs.existsSync(path.join(dir, ...rel.split('/')));
  // `a/*/b`: some child of `a` must contain `b`.
  const [pre, post] = rel.split('*');
  const base = path.join(dir, ...pre.split('/').filter(Boolean));
  return fs.existsSync(base) && fs.readdirSync(base).some((n) => fs.existsSync(path.join(base, n, ...post.split('/').filter(Boolean))));
}

function danglingIncludes(dir) {
  const bad = [];
  for (const root of SCAN_ROOTS) {
    for (const file of textFiles(path.join(dir, root))) {
      let fenced = false;
      fs.readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, i) => {
        if (/^\s*(```|~~~)/.test(line)) { fenced = !fenced; return; }
        if (fenced) return;
        for (const m of line.matchAll(INCLUDE_RE)) {
          if (!resolves(dir, m[1])) bad.push(`${path.relative(dir, file).split(path.sep).join('/')}:${i + 1} ${m[1]}`);
        }
      });
    }
  }
  return bad;
}

for (const [label, args] of [
  ['full', ['--profile', 'full']],
  ['minimal', ['--profile', 'minimal']],
  ['minimal + every purpose', ['--profile', 'minimal', '--purpose', 'frontend,seo,strategy,audits']],
]) {
  test(`${label} install: every @-include resolves to an installed file`, () => {
    const dir = install(args);
    try {
      assert.deepStrictEqual(danglingIncludes(dir), []);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
}

test('checker flags a missing include (self-test)', () => {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'rcode-inc-self-')));
  try {
    fs.mkdirSync(path.join(dir, '.rcode', 'references'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.rcode', 'references', 'a.md'), '@.rcode/references/missing.md\n@rcode/references/a.md\n```\n@.rcode/nope.md\n```\n');
    assert.strictEqual(danglingIncludes(dir).length, 2);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
