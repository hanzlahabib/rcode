/**
 * Unit tests for cli/uninstall.js pure helpers (Wave 3 W3.2 — issue #694
 * follow-up). Closes the test-coverage gap called out by lens audit Lens 15.
 *
 * Pure functions only — no fs / spawn / process state. The destructive
 * --purge round-trip lives in test/uninstall-purge.test.cjs (integration).
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const uninstall = require('../cli/uninstall.js');
const { makeTempDir, cleanup } = require('./helpers.cjs');

// ---- isLocalOverride ----

test('isLocalOverride matches *.local.<ext> for known extensions', () => {
  for (const name of [
    'foo.local.md',
    'foo.local.mdc',
    'config.local.json',
    'agents.local.yaml',
    'agents.local.yml',
    'data.local.toml',
    'helper.local.js',
    'helper.local.ts',
  ]) {
    assert.strictEqual(uninstall.isLocalOverride(name), true, `expected ${name} to match`);
  }
});

test('isLocalOverride does NOT match plain rcode files', () => {
  for (const name of [
    'rihal-waleed.md',
    'foo.md',
    'foo.local.txt',          // unsupported extension
    'foo.localmd',             // missing dot
    'localfoo.md',             // missing .local.
    'foo.LOCAL.md',            // case-sensitive by design
  ]) {
    assert.strictEqual(uninstall.isLocalOverride(name), false, `expected ${name} NOT to match`);
  }
});

// ---- stripRihalGitignoreBlock — issue #684 ----

test('stripRihalGitignoreBlock removes the current sentinel block', () => {
  const before = `node_modules/
*.tmp

# ===== rcode-managed gitignore block =====
.rihal/state.json
.planning/_backup/
# ===== end rcode-managed gitignore block =====

other-stuff
`;
  const after = uninstall.stripRihalGitignoreBlock(before);
  assert.doesNotMatch(after, /rcode-managed/);
  assert.match(after, /node_modules\//);
  assert.match(after, /\*\.tmp/);
  assert.match(after, /other-stuff/);
});

test('stripRihalGitignoreBlock removes legacy >>>/<<< fenced shape', () => {
  const before = `keep-me

# >>> rihal-code >>>
.rihal/
# <<< rihal-code <<<

keep-me-too
`;
  const after = uninstall.stripRihalGitignoreBlock(before);
  assert.doesNotMatch(after, />>> rihal-code >>>/);
  assert.doesNotMatch(after, /<<< rihal-code <<</);
  assert.match(after, /keep-me/);
  assert.match(after, /keep-me-too/);
});

test('stripRihalGitignoreBlock preserves user comments starting with "# rcode"', () => {
  // The very bug #684 fixed — make sure we don't regress.
  const before = `node_modules/

# ===== rcode-managed gitignore block =====
.rihal/state.json
# ===== end rcode-managed gitignore block =====

# rcode is great — this is MY note
my-secret.txt
# rcode-related thoughts
keep-me.txt
`;
  const after = uninstall.stripRihalGitignoreBlock(before);
  // rcode block is gone
  assert.doesNotMatch(after, /rcode-managed/);
  // User content is preserved
  assert.match(after, /# rcode is great/);
  assert.match(after, /my-secret\.txt/);
  assert.match(after, /# rcode-related thoughts/);
  assert.match(after, /keep-me\.txt/);
});

test('stripRihalGitignoreBlock is a no-op when no rcode block is present', () => {
  const before = '# rcode is mentioned here but no block exists\nfoo.txt\n';
  const after = uninstall.stripRihalGitignoreBlock(before);
  assert.strictEqual(after, before);
});

test('stripRihalGitignoreBlock collapses 3+ blank lines down to 2', () => {
  const before = 'a\n\n\n\n\nb\n';
  const after = uninstall.stripRihalGitignoreBlock(before);
  assert.strictEqual(after, 'a\n\nb\n');
});

// ---- planToPathList — issue #683 ----

function emptyPlan() {
  return {
    claude:   { skills: [], commands: [], agents: [] },
    cursor:   [],
    windsurf: [],
    antigravity: [],
    agentsMd: false,
  };
}

test('planToPathList without --purge does NOT include .rihal/ or .planning/', () => {
  const dir = makeTempDir();
  const plan = emptyPlan();
  plan.claude.skills = ['rihal-do', 'rihal-noor'];
  plan.claude.commands = ['rihal-status'];
  plan.claude.agents = ['rihal-waleed.md'];

  const paths = uninstall.planToPathList(plan, dir, { purge: false });

  assert.ok(paths.includes(path.join('.claude/skills', 'rihal-do')));
  assert.ok(paths.includes(path.join('.claude/skills', 'rihal-noor')));
  assert.ok(paths.includes('.claude/commands/rihal'));
  assert.ok(paths.includes(path.join('.claude/agents', 'rihal-waleed.md')));
  // No purge → no state dirs
  assert.ok(!paths.some(p => p.startsWith('.rihal')));
  assert.ok(!paths.includes('.planning'));

  cleanup(dir);
});

test('planToPathList with --purge includes .rihal/<children> AND .planning/', (t) => {
  const dir = makeTempDir();
  t.after(() => cleanup(dir));

  // Seed a fake .rihal/ with three subdirs and one file. Backups dir must
  // be excluded so the tarball doesn't try to read itself.
  fs.mkdirSync(path.join(dir, '.rihal', 'context'), { recursive: true });
  fs.mkdirSync(path.join(dir, '.rihal', 'backups'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.rihal', 'state.json'), '{}');
  fs.writeFileSync(path.join(dir, '.rihal', 'config.yaml'), '');
  fs.mkdirSync(path.join(dir, '.planning'), { recursive: true });

  const paths = uninstall.planToPathList(emptyPlan(), dir, { purge: true });

  // Each .rihal/ entry except backups/ shows up.
  assert.ok(paths.includes(path.join('.rihal', 'context')), '.rihal/context missing');
  assert.ok(paths.includes(path.join('.rihal', 'state.json')), '.rihal/state.json missing');
  assert.ok(paths.includes(path.join('.rihal', 'config.yaml')), '.rihal/config.yaml missing');
  assert.ok(!paths.includes(path.join('.rihal', 'backups')), 'backups dir should be excluded');
  // .planning/ included as a single dir.
  assert.ok(paths.includes('.planning'), '.planning missing');
});

test('planToPathList includes AGENTS.md only when plan.agentsMd is true and the file exists', (t) => {
  const dir = makeTempDir();
  t.after(() => cleanup(dir));

  // Case 1: plan says yes but file missing → not included.
  let plan = emptyPlan();
  plan.agentsMd = true;
  let paths = uninstall.planToPathList(plan, dir, { purge: false });
  assert.ok(!paths.includes('AGENTS.md'));

  // Case 2: plan says yes and file exists → included.
  fs.writeFileSync(path.join(dir, 'AGENTS.md'), '# AGENTS\n');
  paths = uninstall.planToPathList(plan, dir, { purge: false });
  assert.ok(paths.includes('AGENTS.md'));
});

// ---- discoverKnownActionSkills ----

test('discoverKnownActionSkills returns the actions from the package manifest', () => {
  const skills = uninstall.discoverKnownActionSkills();
  // Must be an array and include a known stable skill name.
  assert.ok(Array.isArray(skills));
  assert.ok(skills.length > 0, 'expected at least one action skill discovered');
  // Names should all start with rihal- after the manifest normalisation
  // (cli/lib/manifest.cjs:50 prefixes the bareId).
  for (const s of skills) {
    assert.ok(s.startsWith('rihal-'), `expected rihal- prefix on ${s}`);
  }
});
