/**
 * Token-budget gate (umbrella #1101 / T5 #1106).
 *
 * 1. The source-computed fixed listing and the direct cost of the top commands
 *    stay under the thresholds in scripts/token-budget.cjs.
 * 2. The source computation agrees with a REAL install of each profile, so the
 *    gate cannot drift from what Claude Code actually lists.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO = path.resolve(__dirname, '..');
const gate = require(path.join(REPO, 'scripts', 'token-budget.cjs'));
const CLI = path.join(REPO, 'cli', 'install.js');
// Real installs rewrite nothing in descriptions, but frontmatter folding and
// the generated rcode-do stub can differ by a few chars; 3% absorbs that
// without hiding a missing surface (a skipped file is >= 5% of minimal).
const DRIFT_TOLERANCE = 0.03;

const result = gate.measure();

test('token budget: fixed listing per profile is under its threshold', () => {
  for (const [name, limit] of Object.entries(gate.LISTING_THRESHOLDS)) {
    assert.ok(result.listing[name].total <= limit,
      `${name} listing ${result.listing[name].total} tokens > ${limit}\n${gate.formatTable(result)}`);
  }
});

test('token budget: every purpose bundle is measured, bounded, and larger than minimal', () => {
  const names = Object.keys(result.purposes);
  assert.deepStrictEqual(names.sort(), Object.keys(gate.PURPOSE_THRESHOLDS).sort(), 'every purpose needs a threshold');
  for (const name of names) {
    const total = result.purposes[name].total;
    assert.ok(total <= gate.PURPOSE_THRESHOLDS[name], `minimal+${name} lists ${total} tokens > ${gate.PURPOSE_THRESHOLDS[name]}`);
    assert.ok(total > result.listing.minimal.total, `${name} must add something to minimal`);
    assert.ok(total < result.listing.full.total, `${name} must stay below full`);
  }
});

test('token budget: top commands stay under their direct-cost threshold', () => {
  for (const [id, limit] of Object.entries(gate.DIRECT_THRESHOLDS)) {
    assert.notStrictEqual(result.direct[id], null, `rcode/commands/${id}.md is missing`);
    assert.ok(result.direct[id] <= limit,
      `/rcode-${id} direct cost ${result.direct[id]} tokens > ${limit}\n${gate.formatTable(result)}`);
  }
});

test('token budget: minimal is smaller than full', () => {
  assert.ok(result.listing.minimal.total < result.listing.full.total);
});

/** Same formula as the gate, applied to what an install actually wrote. */
function installedListingTokens(dir) {
  let chars = 0;
  const add = (name, fm) => {
    chars += name.length + (fm.description || '').length + gate.CHARS_PER_TOKEN;
  };
  for (const sub of ['commands', 'agents']) {
    const base = path.join(dir, '.claude', sub);
    for (const f of fs.readdirSync(base).filter((n) => n.endsWith('.md'))) {
      const fm = gate.readFrontmatter(fs.readFileSync(path.join(base, f), 'utf8'));
      add(sub === 'commands' ? f.slice(0, -3) : fm.name || f.slice(0, -3), fm);
    }
  }
  const skills = path.join(dir, '.claude', 'skills');
  for (const s of fs.readdirSync(skills)) {
    const fm = gate.readFrontmatter(fs.readFileSync(path.join(skills, s, 'SKILL.md'), 'utf8'));
    if (String(fm['disable-model-invocation']).trim() === 'true') continue;
    add(s, fm);
  }
  return Math.ceil(chars / gate.CHARS_PER_TOKEN);
}

for (const profile of Object.keys(gate.LISTING_THRESHOLDS)) {
  test(`token budget: source computation matches a real ${profile} install`, () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), `rcode-tokens-${profile}-`));
    try {
      spawnSync('git', ['init', '-q'], { cwd: dir });
      const home = path.join(dir, '_home');
      const r = spawnSync('node', [CLI, dir, '--yes', '--ide', 'claude', '--no-update-check', '--profile', profile], {
        encoding: 'utf8', env: { ...process.env, HOME: home, USERPROFILE: home },
      });
      assert.strictEqual(r.status, 0, r.stdout + r.stderr);
      const real = installedListingTokens(dir);
      const source = result.listing[profile].total;
      const drift = Math.abs(real - source) / real;
      assert.ok(drift <= DRIFT_TOLERANCE,
        `${profile}: source computes ${source} tokens, a real install lists ${real} (${(drift * 100).toFixed(1)}% drift)`);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
}

for (const purpose of Object.keys(gate.PURPOSE_THRESHOLDS)) {
  test(`token budget: source computation matches a real --purpose ${purpose} install`, () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), `rcode-tokens-${purpose}-`));
    try {
      spawnSync('git', ['init', '-q'], { cwd: dir });
      const home = path.join(dir, '_home');
      const r = spawnSync('node', [CLI, dir, '--yes', '--ide', 'claude', '--no-update-check', '--purpose', purpose], {
        encoding: 'utf8', env: { ...process.env, HOME: home, USERPROFILE: home },
      });
      assert.strictEqual(r.status, 0, r.stdout + r.stderr);
      const real = installedListingTokens(dir);
      const source = result.purposes[purpose].total;
      const drift = Math.abs(real - source) / real;
      assert.ok(drift <= DRIFT_TOLERANCE,
        `${purpose}: source computes ${source} tokens, a real install lists ${real} (${(drift * 100).toFixed(1)}% drift)`);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
}
