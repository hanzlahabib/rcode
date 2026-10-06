/**
 * Every `/rcode-<name>` hint a shipped file prints must name something real.
 *
 *  1. Source level: the name is a command (rcode/commands/<name>.md) or a skill.
 *     Catches commands that were renamed or never existed (/rcode-tea, /rcode-research).
 *  2. Install level: in agents and skills (the surfaces loaded into context),
 *     a hint to a command the profile/purpose does not install must say so on
 *     the same line ("purpose" or "profile"), so a minimal user is not sent to
 *     a command that is not there.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO = path.resolve(__dirname, '..');
const CLI = path.join(REPO, 'cli', 'install.js');
const SOURCE_DIRS = ['agents', 'skills', 'commands', 'workflows', 'references', 'templates'];
// `/rcode-x`, not a path segment (`bin/rcode-tools.cjs`), a file, or the `/rcode-memory-*` glob.
const SLASH_RE = /(?<![\w.\/~-])\/(rcode-[a-z0-9]+(?:-[a-z0-9]+)*)(?![a-z0-9-])(?![\w/.]*\.(?:cjs|js|md|json|yaml))/g;
const QUALIFIER_RE = /\b(purpose|profile)\b/i;

function mdFiles(dir) {
  const out = [];
  (function walk(d) {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.md')) out.push(p);
    }
  })(dir);
  return out;
}

function sourceSkillNames() {
  const names = new Set();
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      const p = path.join(d, e.name);
      if (fs.existsSync(path.join(p, 'SKILL.md'))) names.add(e.name.startsWith('rcode-') ? e.name : `rcode-${e.name}`);
      else walk(p);
    }
  })(path.join(REPO, 'rcode', 'skills'));
  return names;
}

function hints(file) {
  const found = [];
  fs.readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, i) => {
    for (const m of line.matchAll(SLASH_RE)) found.push({ name: m[1], line: i + 1, text: line });
  });
  return found;
}

test('every /rcode-* hint in shipped source names a real command or skill', () => {
  const real = new Set(sourceSkillNames());
  for (const f of fs.readdirSync(path.join(REPO, 'rcode', 'commands'))) {
    if (f.endsWith('.md')) real.add(`rcode-${f.slice(0, -3)}`);
  }
  const bad = [];
  for (const d of SOURCE_DIRS) {
    for (const f of mdFiles(path.join(REPO, 'rcode', d))) {
      for (const h of hints(f)) {
        if (!real.has(h.name)) bad.push(`${path.relative(REPO, f).split(path.sep).join('/')}:${h.line} /${h.name}`);
      }
    }
  }
  assert.deepStrictEqual(bad, []);
});

for (const [label, args] of [
  ['minimal', ['--profile', 'minimal']],
  ['minimal + frontend', ['--profile', 'minimal', '--purpose', 'frontend']],
  ['minimal + seo', ['--profile', 'minimal', '--purpose', 'seo']],
  ['minimal + strategy', ['--profile', 'minimal', '--purpose', 'strategy']],
  ['minimal + audits', ['--profile', 'minimal', '--purpose', 'audits']],
]) {
  test(`${label}: agent and skill hints to commands the install lacks are qualified`, () => {
    const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'rcode-slash-')));
    try {
      const home = path.join(dir, '_home');
      const r = spawnSync(process.execPath, [CLI, dir, '--yes', '--ide', 'claude', '--no-update-check', ...args], {
        encoding: 'utf8',
        env: { ...process.env, HOME: home, USERPROFILE: home },
      });
      assert.strictEqual(r.status, 0, r.stderr || r.stdout);
      const have = new Set();
      for (const sub of ['commands', 'skills']) {
        const d = path.join(dir, '.claude', sub);
        if (fs.existsSync(d)) for (const f of fs.readdirSync(d)) have.add(f.replace(/\.md$/, ''));
      }
      const bad = [];
      for (const sub of ['agents', 'skills']) {
        for (const f of mdFiles(path.join(dir, '.claude', sub))) {
          if (f.split(path.sep).includes('rules')) continue; // on-demand rule files cite the full command set
          for (const h of hints(f)) {
            if (!have.has(h.name) && !QUALIFIER_RE.test(h.text)) {
              bad.push(`${path.relative(dir, f).split(path.sep).join('/')}:${h.line} /${h.name}`);
            }
          }
        }
      }
      assert.deepStrictEqual(bad, []);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
}
