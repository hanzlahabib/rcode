/**
 * Install purposes (frontend | seo | strategy | audits) — rcode/profiles.yaml
 * `purposes:`, `--purpose`, persistence, update re-apply, the interactive
 * picker (stubbed prompt), and the removal gate. Real installs go into tmpdirs
 * with an isolated HOME so global-skill dedup never changes the result.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO = path.resolve(__dirname, '..');
const CLI = path.join(REPO, 'cli', 'install.js');
const purposeLib = require(path.join(REPO, 'cli', 'lib', 'install-purpose.cjs'));
const { loadProfiles } = require(path.join(REPO, 'cli', 'lib', 'install-profile.cjs'));
const installer = require(CLI);

const PURPOSES = ['frontend', 'seo', 'strategy', 'audits'];

function tmp() {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'rcode-purpose-')));
  spawnSync('git', ['init', '-q'], { cwd: dir });
  return dir;
}

function install(dir, args = []) {
  const home = path.join(dir, '_home');
  return spawnSync(process.execPath, [CLI, dir, '--yes', '--ide', 'claude', '--no-update-check', ...args], {
    encoding: 'utf8',
    env: { ...process.env, HOME: home, USERPROFILE: home },
  });
}

const ls = (dir, sub) => fs.readdirSync(path.join(dir, sub)).sort();
const manifest = (dir) => fs.readFileSync(path.join(dir, '.rcode', '_config', 'manifest.yaml'), 'utf8');
const hasCommand = (dir, c) => fs.existsSync(path.join(dir, '.claude', 'commands', `rcode-${c}.md`));

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

// ── data ──────────────────────────────────────────────────────────────────

test('profiles.yaml declares exactly the documented purposes, and profiles stay minimal/full', () => {
  const defs = purposeLib.loadPurposes();
  assert.deepStrictEqual(Object.keys(defs).sort(), [...PURPOSES].sort());
  assert.deepStrictEqual(Object.keys(loadProfiles()).sort(), ['full', 'minimal']);
  for (const [name, def] of Object.entries(defs)) {
    assert.ok(def.description.length > 10, `${name} needs a description`);
  }
});

test('every name in every purpose exists in the package and none repeats minimal', () => {
  const defs = purposeLib.loadPurposes();
  const { minimal } = loadProfiles();
  const skills = sourceSkillNames();
  for (const [name, def] of Object.entries(defs)) {
    for (const c of def.commands) {
      assert.ok(fs.existsSync(path.join(REPO, 'rcode', 'commands', `${c}.md`)), `${name}: command ${c}`);
      assert.ok(!minimal.commands.has(c), `${name}: command ${c} is already in minimal`);
    }
    for (const a of def.agents) {
      assert.ok(fs.existsSync(path.join(REPO, 'rcode', 'agents', `${a}.md`)), `${name}: agent ${a}`);
    }
    for (const s of def.skills) assert.ok(skills.has(s), `${name}: skill ${s}`);
    assert.ok(def.commands.length + def.skills.length + def.agents.length > 0, `${name} is empty`);
  }
});

// Agents spawned only behind an opt-in flag may be absent from a bundle.
const FLAG_GATED_AGENTS = new Set(['rcode-edge-case-hunter', 'rcode-security-adversary']);

function workflowFiles(wf) {
  const base = path.join(REPO, 'rcode', 'workflows');
  const out = [path.join(base, `${wf}.md`)];
  const steps = path.join(base, wf, 'steps');
  if (fs.existsSync(steps)) for (const f of fs.readdirSync(steps)) if (f.endsWith('.md')) out.push(path.join(steps, f));
  return out.filter((f) => fs.existsSync(f));
}

for (const purpose of PURPOSES) {
  test(`minimal + ${purpose}: no command workflow spawns an agent the bundle does not install`, () => {
    const def = purposeLib.effectiveProfiles([purpose]).minimal;
    // Agents register under their frontmatter `name` (pinned equal to the file name by agent-name-parity).
    const installed = new Set(def.agents);
    for (const a of def.agents) {
      const fm = fs.readFileSync(path.join(REPO, 'rcode', 'agents', `${a}.md`), 'utf8').match(/^name:\s*(\S+)/m);
      if (fm) installed.add(fm[1]);
    }
    const missing = [];
    for (const cmd of def.commands) {
      const text = fs.readFileSync(path.join(REPO, 'rcode', 'commands', `${cmd}.md`), 'utf8');
      const seen = new Set();
      const queue = [];
      const add = (wf) => { if (!seen.has(wf)) { seen.add(wf); queue.push(wf); } };
      for (const m of text.matchAll(/workflows\/([\w-]+)(?:\.md|\/steps)/g)) add(m[1]);
      while (queue.length) {
        for (const file of workflowFiles(queue.pop())) {
          const body = fs.readFileSync(file, 'utf8');
          for (const m of body.matchAll(/subagent_type\s*[=:]?\s*["']?(rcode-[a-z0-9-]+)/g)) {
            if (!installed.has(m[1]) && !FLAG_GATED_AGENTS.has(m[1])) missing.push(`${cmd} -> ${m[1]} (${path.basename(file)})`);
          }
          for (const m of body.matchAll(/workflows\/([a-z0-9-]+)\.md/g)) add(m[1]);
        }
      }
    }
    assert.deepStrictEqual(missing, []);
  });
}

// A bundle's skills recommend agents by name ("`rcode-mariam` agent"). The
// workflow check above never sees those (a skill-only purpose such as seo has no
// commands), so scan the skill docs themselves.
function skillDirs() {
  const dirs = new Map();
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      const p = path.join(d, e.name);
      if (fs.existsSync(path.join(p, 'SKILL.md'))) dirs.set(e.name.startsWith('rcode-') ? e.name : `rcode-${e.name}`, p);
      else walk(p);
    }
  })(path.join(REPO, 'rcode', 'skills'));
  return dirs;
}

function markdownFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return markdownFiles(p);
    return e.name.endsWith('.md') ? [p] : [];
  });
}

for (const purpose of PURPOSES) {
  test(`minimal + ${purpose}: skills only recommend agents the bundle installs`, () => {
    const def = purposeLib.effectiveProfiles([purpose]).minimal;
    const packageAgents = new Set(fs.readdirSync(path.join(REPO, 'rcode', 'agents')).map((f) => f.replace(/\.md$/, '')));
    const dirs = skillDirs();
    const missing = [];
    for (const skill of purposeLib.loadPurposes()[purpose].skills) {
      for (const file of markdownFiles(dirs.get(skill))) {
        const text = fs.readFileSync(file, 'utf8');
        for (const m of text.matchAll(/`(rcode-[a-z0-9-]+)`\s+agent\b/g)) {
          if (packageAgents.has(m[1]) && !def.agents.has(m[1])) missing.push(`${skill} -> ${m[1]} (${path.basename(file)})`);
        }
      }
    }
    assert.deepStrictEqual(missing, []);
  });
}

// ── flag parsing and precedence (pure) ────────────────────────────────────

test('parsePurposeFlag validates, de-duplicates and lists the valid names on error', () => {
  assert.strictEqual(purposeLib.parsePurposeFlag(null), null);
  assert.deepStrictEqual(purposeLib.parsePurposeFlag('seo, Frontend,seo'), ['seo', 'frontend']);
  assert.deepStrictEqual(purposeLib.parsePurposeFlag('full'), ['full']);
  assert.throws(() => purposeLib.parsePurposeFlag('seo,nope'), /Unknown purpose "nope"\. Available purposes: frontend, seo, strategy, audits, full/);
  assert.throws(() => purposeLib.parsePurposeFlag(''), /Empty --purpose list/);
});

function withManifest(dir, body) {
  fs.mkdirSync(path.join(dir, '.rcode', '_config'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.rcode', '_config', 'manifest.yaml'), body);
}

test('precedence: fresh install, --purpose adds to minimal, --profile full wins', () => {
  const dir = tmp();
  const fresh = purposeLib.resolveSelection({ target: dir });
  assert.deepStrictEqual([fresh.profile, fresh.purposes], ['minimal', []]);
  const seo = purposeLib.resolveSelection({ target: dir, purpose: 'seo' });
  assert.deepStrictEqual([seo.profile, seo.purposes], ['minimal', ['seo']]);
  const viaProfile = purposeLib.resolveSelection({ target: dir, profile: 'full', purpose: 'seo' });
  assert.deepStrictEqual([viaProfile.profile, viaProfile.purposes], ['full', []]);
  const alias = purposeLib.resolveSelection({ target: dir, purpose: 'full' });
  assert.deepStrictEqual([alias.profile, alias.purposes], ['full', []]);
  assert.throws(() => purposeLib.resolveSelection({ target: dir, profile: 'minimal', purpose: 'full' }), /conflicts/);
});

test('precedence: --global stays full unless a purpose is requested', () => {
  const dir = tmp();
  assert.strictEqual(purposeLib.resolveSelection({ target: dir, global: true }).profile, 'full');
  const g = purposeLib.resolveSelection({ target: dir, global: true, purpose: 'audits' });
  assert.deepStrictEqual([g.profile, g.purposes], ['minimal', ['audits']]);
});

test('precedence: persisted purposes are kept, --purpose unions, explicit --profile minimal replaces', () => {
  const dir = tmp();
  withManifest(dir, 'version: 1.0.0\nprofile: minimal\npurposes: [seo, frontend]\n');
  assert.deepStrictEqual(purposeLib.resolveSelection({ target: dir }).purposes, ['seo', 'frontend']);
  assert.deepStrictEqual(purposeLib.resolveSelection({ target: dir, purpose: 'audits' }).purposes, ['seo', 'frontend', 'audits']);
  const replaced = purposeLib.resolveSelection({ target: dir, profile: 'minimal', purpose: 'seo' });
  assert.deepStrictEqual(replaced.purposes, ['seo']);
  assert.deepStrictEqual(replaced.removedPurposes, ['frontend']);
  const reset = purposeLib.resolveSelection({ target: dir, profile: 'minimal' });
  assert.deepStrictEqual(reset.removedPurposes, ['seo', 'frontend']);
});

test('precedence: a full or legacy (no profile key) install stays full when --purpose is passed', () => {
  const dir = tmp();
  withManifest(dir, 'version: 1.0.0\nmodules:\n  - core\n');
  const sel = purposeLib.resolveSelection({ target: dir, purpose: 'seo' });
  assert.deepStrictEqual([sel.profile, sel.purposes], ['full', []]);
});

test('effectiveProfiles widens minimal only; full stays "all"', () => {
  const base = loadProfiles().minimal;
  const eff = purposeLib.effectiveProfiles(['audits']);
  assert.ok(eff.minimal.commands.has('lens-audit') && !base.commands.has('lens-audit'));
  for (const c of base.commands) assert.ok(eff.minimal.commands.has(c), `core command ${c} kept`);
  assert.strictEqual(eff.full.all, true);
  assert.strictEqual(purposeLib.effectiveProfiles([]).minimal.commands.size, base.commands.size);
});

// ── interactive picker (stubbed prompt) ───────────────────────────────────

const noAsk = () => { throw new Error('prompt must not be shown'); };
const tty = { isTTY: true, env: {} };

test('picker choices: one per purpose with counts, plus Everything', () => {
  const opts = purposeLib.pickerOptions();
  assert.deepStrictEqual(opts.map((o) => o.value), [...PURPOSES, 'full']);
  for (const o of opts.slice(0, -1)) assert.match(o.hint, /^\+\d+ commands, \d+ skills, \d+ agents$/);
});

test('picker is shown only on a fresh interactive project install', async () => {
  const dir = tmp();
  const asked = [];
  const opts = { target: dir, yes: false };
  await purposeLib.resolvePurposeChoice(opts, { ...tty, ask: async (o) => { asked.push(o); return ['seo', 'audits']; } });
  assert.strictEqual(asked.length, 1);
  assert.strictEqual(opts.purpose, 'seo,audits');

  const none = { target: dir };
  await purposeLib.resolvePurposeChoice(none, { ...tty, ask: async () => [] });
  assert.ok(!none.purpose, 'choosing nothing leaves minimal');
});

test('picker is skipped for --yes, CI, non-TTY, flags, --global, noPrompt and existing installs', async () => {
  const dir = tmp();
  const cases = [
    [{ target: dir, yes: true }, tty],
    [{ target: dir }, { isTTY: true, env: { CI: 'true' } }],
    [{ target: dir }, { isTTY: false, env: {} }],
    [{ target: dir, profile: 'minimal' }, tty],
    [{ target: dir, purpose: 'seo' }, tty],
    [{ target: dir, global: true }, tty],
    [{ target: dir, noPrompt: true }, tty],
    [{ target: dir, silent: true }, tty],
  ];
  for (const [opts, io] of cases) await purposeLib.resolvePurposeChoice(opts, { ...io, ask: noAsk });
  withManifest(dir, 'version: 1.0.0\nprofile: minimal\n');
  await purposeLib.resolvePurposeChoice({ target: dir }, { ...tty, ask: noAsk });
});

test('an install through the picker records the chosen purposes (in-process, stubbed prompt)', async () => {
  const dir = tmp();
  const home = path.join(dir, '_home');
  const saved = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE };
  process.env.HOME = home;
  process.env.USERPROFILE = home;
  const realLog = console.log;
  console.log = () => {};
  try {
    const opts = installer.parseArgs([dir, '--ide', 'claude', '--no-update-check']);
    opts.purposeIO = { ...tty, ask: async () => ['strategy'] };
    const code = await installer.install(opts);
    assert.strictEqual(code, 0);
  } finally {
    console.log = realLog;
    for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  }
  assert.match(manifest(dir), /^purposes: \[strategy\]$/m);
  assert.ok(hasCommand(dir, 'council'));
});

// ── real installs ─────────────────────────────────────────────────────────

test('--yes without flags is unchanged: minimal, no purposes line', () => {
  const dir = tmp();
  const r = install(dir);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.match(manifest(dir), /^profile: minimal$/m);
  assert.doesNotMatch(manifest(dir), /^purposes:/m);
  assert.strictEqual(ls(dir, '.claude/commands').length, loadProfiles().minimal.commands.size);
});

test('--purpose seo,frontend installs minimal + both bundles and persists them', () => {
  const dir = tmp();
  const r = install(dir, ['--purpose', 'seo,frontend']);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  const m = manifest(dir);
  assert.match(m, /^profile: minimal$/m);
  assert.match(m, /^purposes: \[seo, frontend\]$/m);
  const eff = purposeLib.effectiveProfiles(['seo', 'frontend']).minimal;
  assert.deepStrictEqual(ls(dir, '.claude/commands'), [...eff.commands].map((c) => `rcode-${c}.md`).sort());
  assert.deepStrictEqual(ls(dir, '.claude/agents').filter((f) => f.endsWith('.md')), [...eff.agents].map((a) => `${a}.md`).sort());
  const skills = ls(dir, '.claude/skills');
  assert.ok(skills.includes('rcode-seo-os') && skills.includes('rcode-frontend-design'));
  for (const s of skills) assert.ok(eff.skills.has(s) || s === 'rcode-do', `unexpected skill ${s}`);
  assert.ok(!skills.includes('rcode-majlis-council'), 'strategy skills must not leak into seo+frontend');
  assert.match(r.stdout, /Installed profile: .*minimal \+ seo, frontend/);
  assert.match(r.stdout, /rcode install --purpose strategy/);
});

test('every minimal @.rcode include still resolves in a purpose install', () => {
  const dir = tmp();
  assert.strictEqual(install(dir, ['--purpose', 'audits,strategy']).status, 0);
  for (const f of ls(dir, '.claude/commands')) {
    const text = fs.readFileSync(path.join(dir, '.claude', 'commands', f), 'utf8');
    for (const m of text.matchAll(/@(\.rcode\/[\w./-]+\.md)/g)) {
      assert.ok(fs.existsSync(path.join(dir, m[1])), `${f} includes missing ${m[1]}`);
    }
  }
});

test('re-install and update keep recorded purposes; --purpose adds without dropping', () => {
  const dir = tmp();
  assert.strictEqual(install(dir, ['--purpose', 'seo']).status, 0);
  const again = install(dir, ['--force']);
  assert.strictEqual(again.status, 0, again.stdout + again.stderr);
  assert.match(manifest(dir), /^purposes: \[seo\]$/m);
  assert.ok(fs.existsSync(path.join(dir, '.claude', 'skills', 'rcode-seo-os')));

  const add = install(dir, ['--purpose', 'audits']);
  assert.strictEqual(add.status, 0, add.stdout + add.stderr);
  assert.match(manifest(dir), /^purposes: \[seo, audits\]$/m);
  assert.ok(hasCommand(dir, 'lens-audit'));
  assert.ok(fs.existsSync(path.join(dir, '.claude', 'skills', 'rcode-seo-os')), 'seo survives the additive install');
});

test('update (the programmatic path with no purpose flags) re-applies persisted purposes', async () => {
  const dir = tmp();
  assert.strictEqual(install(dir, ['--purpose', 'frontend']).status, 0);
  const home = path.join(dir, '_home');
  const saved = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE };
  process.env.HOME = home;
  process.env.USERPROFILE = home;
  const realLog = console.log;
  console.log = () => {};
  try {
    // Exactly the argument shape cli/update.js passes.
    const code = await installer.install({
      ...installer.parseArgs([dir]),
      target: dir, force: true, yes: true, ides: ['claude'], modules: [], help: false, noUpdateCheck: true,
    });
    assert.strictEqual(code, 0);
  } finally {
    console.log = realLog;
    for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  }
  assert.match(manifest(dir), /^purposes: \[frontend\]$/m);
  assert.ok(hasCommand(dir, 'ui-review'));
});

test('--profile full drops the purposes line and installs everything; --purpose full is the same', () => {
  for (const args of [['--purpose', 'seo', '--profile', 'full'], ['--purpose', 'full']]) {
    const dir = tmp();
    const r = install(dir, args);
    assert.strictEqual(r.status, 0, r.stdout + r.stderr);
    assert.match(manifest(dir), /^profile: full$/m);
    assert.doesNotMatch(manifest(dir), /^purposes:/m);
    assert.ok(hasCommand(dir, 'council') && hasCommand(dir, 'lens-audit'));
  }
});

test('minimal+purposes -> full adds files and nothing is lost', () => {
  const dir = tmp();
  assert.strictEqual(install(dir, ['--purpose', 'seo']).status, 0);
  const r = install(dir, ['--profile', 'full']);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.match(manifest(dir), /^profile: full$/m);
  assert.doesNotMatch(manifest(dir), /^purposes:/m);
  assert.ok(fs.existsSync(path.join(dir, '.claude', 'skills', 'rcode-seo-os')));
});

test('an unknown purpose is rejected with the valid names', () => {
  const r = install(tmp(), ['--purpose', 'seo,devops']);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /Unknown purpose "devops"\. Available purposes: frontend, seo, strategy, audits, full/);
});

test('dropping a purpose is refused without --force and lists the removals', () => {
  const dir = tmp();
  assert.strictEqual(install(dir, ['--purpose', 'seo,audits']).status, 0);
  const before = ls(dir, '.claude/commands').length;
  const r = install(dir, ['--profile', 'minimal', '--purpose', 'seo']);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /Dropping purpose audits would remove \d+ installed file/);
  assert.match(r.stderr, /rcode-dep-auditor\.md/);
  assert.match(r.stderr, /--force/);
  assert.strictEqual(ls(dir, '.claude/commands').length, before);
  assert.match(manifest(dir), /^purposes: \[seo, audits\]$/m);
});

test('dropping a purpose with --force backs up first, then removes only that bundle', () => {
  const dir = tmp();
  assert.strictEqual(install(dir, ['--purpose', 'seo,audits']).status, 0);
  const r = install(dir, ['--profile', 'minimal', '--purpose', 'seo', '--force']);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /profile switch backup/);
  assert.ok(fs.readdirSync(path.join(dir, '.rcode', 'backups')).some((f) => f.endsWith('.tgz')));
  assert.match(manifest(dir), /^purposes: \[seo\]$/m);
  assert.ok(!hasCommand(dir, 'lens-audit'));
  assert.ok(fs.existsSync(path.join(dir, '.claude', 'skills', 'rcode-seo-os')));
  assert.ok(!fs.existsSync(path.join(dir, '.claude', 'agents', 'rcode-dep-auditor.md')));
});

test('full -> minimal + purpose still goes through the removal gate', () => {
  const dir = tmp();
  assert.strictEqual(install(dir, ['--profile', 'full']).status, 0);
  const refused = install(dir, ['--profile', 'minimal', '--purpose', 'seo']);
  assert.notStrictEqual(refused.status, 0);
  assert.match(refused.stderr, /--profile minimal would remove \d+ installed file/);
  const ok = install(dir, ['--profile', 'minimal', '--purpose', 'seo', '--force']);
  assert.strictEqual(ok.status, 0, ok.stdout + ok.stderr);
  assert.match(manifest(dir), /^purposes: \[seo\]$/m);
});

test('the --help text documents --purpose', () => {
  const r = spawnSync(process.execPath, [CLI, '--help'], { encoding: 'utf8' });
  assert.match(r.stdout, /--purpose <list>/);
  assert.match(r.stdout, /frontend, seo, strategy, audits/);
});

// A pty that reports 0 columns (docker -t, some ssh/CI sessions) made
// nanospinner compute Infinity lines and spin forever in spinner.success(),
// hanging the install at "Installing N files…" (pre-existing since v4.18.0).
test('spinner finishes when the TTY reports 0 columns', () => {
  const script = `
    require('nanospinner/dist/consts').isTTY = true; // force the TTY render path
    const { createSpinner } = require(${JSON.stringify(path.join(REPO, 'cli', 'lib', 'install-shared.cjs'))});
    const out = [];
    const s = createSpinner('x', { stream: { columns: 0, write: (c) => out.push(c) } }).start();
    s.success({ text: 'done' });
    console.log('finished');
  `;
  const r = spawnSync(process.execPath, ['-e', script], { cwd: REPO, encoding: 'utf8', timeout: 15000 });
  assert.strictEqual(r.status, 0, r.stderr || 'timed out (spinner clear() loop)');
  assert.match(r.stdout, /finished/);
});

test('--purpose=seo and --profile=minimal forms are honored, a bare --purpose is an error', () => {
  const eq = tmp();
  assert.strictEqual(install(eq, ['--profile=minimal', '--purpose=seo,audits']).status, 0);
  assert.match(fs.readFileSync(path.join(eq, '.rcode', '_config', 'manifest.yaml'), 'utf8'), /^purposes: \[seo, audits\]$/m);
  const bare = install(tmp(), ['--purpose']);
  assert.strictEqual(bare.status, 1);
  assert.match(bare.stderr + bare.stdout, /Empty --purpose list.*frontend, seo, strategy, audits/);
});

// doctor/update compare the install to the package; a minimal (+purposes)
// install must be measured against its own allow-list, not the whole package.
test('manifest verification expects only the installed profile, so a minimal install shows no drift', () => {
  const { verifyInstall } = require(path.join(REPO, 'cli', 'lib', 'manifest.cjs'));
  for (const args of [[], ['--purpose', 'seo,frontend']]) {
    const dir = tmp();
    assert.strictEqual(install(dir, [...args, '--local-only']).status, 0);
    const home = path.join(dir, '_home');
    const prev = process.env.HOME;
    process.env.HOME = home; // keep the global fallback out of the comparison
    try {
      const { hasDrift, reports } = verifyInstall(dir, REPO, ['claude']);
      assert.strictEqual(hasDrift, false, JSON.stringify(reports.map((r) => [r.kind, r.missing, r.extra])));
    } finally {
      process.env.HOME = prev;
    }
  }
});

// dist/rcode.js inlines cli/lib/*, so __dirname there is <package>/dist, not
// <package>/cli/lib; a fixed `..` hop resolved PACKAGE_ROOT outside the package
// and every installer asset lookup failed in the published build.
test('install-shared resolves the package root from inside a bundle', () => {
  const { buildSync } = require('esbuild');
  const pkg = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'rcode-bundle-')));
  fs.writeFileSync(path.join(pkg, 'package.json'), '{"name":"x"}');
  const out = path.join(pkg, 'dist', 'b.js');
  buildSync({
    stdin: { contents: `console.log(require('./cli/lib/install-shared.cjs').PACKAGE_ROOT)`, resolveDir: REPO },
    bundle: true, platform: 'node', outfile: out, logLevel: 'silent',
    external: ['node:*', 'fs', 'path', 'os', 'readline', 'tty', 'util', 'child_process', 'crypto', 'events', 'stream', 'url', 'process'],
  });
  const r = spawnSync(process.execPath, [out], { encoding: 'utf8' });
  assert.strictEqual(r.stdout.trim(), pkg, r.stderr);
});
