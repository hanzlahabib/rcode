/**
 * Unit tests for cli/lib/link-checks.cjs — the doctor extension covering
 * rcode/skills/seo/ (and, report-only, every other skill bucket) for:
 *   1. local file references (markdown links + backtick paths)
 *   2. skill-name references (Related Skills / Delegate.../Next Best Skill)
 *   3. orphaned reference modules (unreachable from SKILL.md)
 *
 * Fixtures are built fresh per test under a temp dir shaped like a real
 * package root (`rcode/skills/<bucket>/<skill>/...`, `rcode/agents/*.md`)
 * so the checks run against real files on disk, not mocked fs calls.
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const {
  buildKnownIdentifiers,
  extractLocalFileRefs,
  resolveLocalRef,
  extractSkillRefCandidates,
  resolveSkillRef,
  checkSkillDir,
  runLinkChecks,
} = require('../cli/lib/link-checks.cjs');
const { makeTempDir, cleanup } = require('./helpers.cjs');

function write(root, relPath, content) {
  const full = path.join(root, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
  return full;
}

// ---------- extractLocalFileRefs ----------

test('extractLocalFileRefs: picks up markdown links and backtick .md/.cjs refs', () => {
  const content = [
    'See [references/foo.md](references/foo.md) and `references/bar.md`.',
    'Also `scripts/build.cjs` and [a script](scripts/build.cjs).',
  ].join('\n');
  const refs = extractLocalFileRefs(content).map((r) => r.path);
  assert.ok(refs.includes('references/foo.md'));
  assert.ok(refs.includes('references/bar.md'));
  assert.ok(refs.includes('scripts/build.cjs'));
});

test('extractLocalFileRefs: ignores external URLs, anchors, and non-md/cjs extensions', () => {
  const content = [
    'See [external](https://example.com/references/foo.md).',
    'See [anchor](#section).',
    'Consumer file: `src/lib/jsonld.ts` and `config.json`.',
  ].join('\n');
  const refs = extractLocalFileRefs(content);
  assert.strictEqual(refs.length, 0);
});

test('extractLocalFileRefs: ignores paths outside this package\'s own conventions (consumer project layout)', () => {
  const content = [
    'Consumer output: `research/01-competitor-analysis.md`.',
    'Consumer runtime: `.rcode/seo/STATE.md` and `memory/decisions.md`.',
  ].join('\n');
  const refs = extractLocalFileRefs(content);
  assert.strictEqual(refs.length, 0);
});

test('extractLocalFileRefs: ignores template placeholders and glob patterns', () => {
  const content = 'See `briefs/<slug>.md` and `templates/local-*.md`.';
  const refs = extractLocalFileRefs(content);
  assert.strictEqual(refs.length, 0);
});

test('extractLocalFileRefs: bare filenames and sibling-skill-prefixed internal paths are checked', () => {
  const content = 'See `LOCAL-SEO.md` and `seo-growth-orchestrator/rules/backlinks.md`.';
  const refs = extractLocalFileRefs(content).map((r) => r.path);
  assert.ok(refs.includes('LOCAL-SEO.md'));
  assert.ok(refs.includes('seo-growth-orchestrator/rules/backlinks.md'));
});

// ---------- resolveLocalRef ----------

test('resolveLocalRef: resolves alongside the referencing file and under references/rules/templates/scripts', (t) => {
  const root = makeTempDir();
  t.after(() => cleanup(root));
  const skillDir = path.join(root, 'rcode/skills/seo/my-skill');
  const skillMd = write(root, 'rcode/skills/seo/my-skill/SKILL.md', '# My Skill');
  write(root, 'rcode/skills/seo/my-skill/references/foo.md', '# Foo');
  write(root, 'rcode/skills/seo/my-skill/rules/bar.md', '# Bar');
  write(root, 'rcode/skills/seo/my-skill/scripts/build.cjs', '// noop');

  assert.ok(resolveLocalRef('references/foo.md', skillMd, skillDir, root));
  assert.ok(resolveLocalRef('rules/bar.md', skillMd, skillDir, root));
  assert.ok(resolveLocalRef('scripts/build.cjs', skillMd, skillDir, root));
  assert.strictEqual(resolveLocalRef('nope.md', skillMd, skillDir, root), null);
});

test('resolveLocalRef: falls back to a bucket-wide basename search for a cross-skill bare filename', (t) => {
  const root = makeTempDir();
  t.after(() => cleanup(root));
  const skillA = path.join(root, 'rcode/skills/seo/skill-a');
  const skillAMd = write(root, 'rcode/skills/seo/skill-a/SKILL.md', '# A');
  // TOOL-ACCURACY.md actually lives in a sibling skill's references/.
  write(root, 'rcode/skills/seo/skill-b/references/TOOL-ACCURACY.md', '# Tool accuracy');

  const resolved = resolveLocalRef('TOOL-ACCURACY.md', skillAMd, skillA, root);
  assert.ok(resolved);
  assert.match(resolved, /skill-b[/\\]references[/\\]TOOL-ACCURACY\.md$/);
});

test('resolveLocalRef: falls back to rcode/templates/<bucket>/ for project-memory template names', (t) => {
  const root = makeTempDir();
  t.after(() => cleanup(root));
  const skillDir = path.join(root, 'rcode/skills/seo/my-skill');
  const skillMd = write(root, 'rcode/skills/seo/my-skill/SKILL.md', '# My Skill');
  write(root, 'rcode/templates/seo/STATE.md', '# State template');

  const resolved = resolveLocalRef('STATE.md', skillMd, skillDir, root);
  assert.ok(resolved);
  assert.match(resolved, /rcode[/\\]templates[/\\]seo[/\\]STATE\.md$/);
});

// ---------- extractSkillRefCandidates + resolveSkillRef ----------

test('extractSkillRefCandidates: finds names in a Related Skills line, Delegate...to, and Next Best Skill', () => {
  const content = [
    '- **Related Skills**: `foo-skill`, `bar-skill`',
    'Delegate mechanics to `baz-skill`.',
    '## Next Best Skill',
    '- **Primary**: [qux-skill](../qux-skill/SKILL.md)',
  ].join('\n');
  const found = extractSkillRefCandidates(content);
  assert.ok(found.includes('foo-skill'));
  assert.ok(found.includes('bar-skill'));
  assert.ok(found.includes('baz-skill'));
  assert.ok(found.includes('qux-skill'));
});

test('extractSkillRefCandidates: a bare comma-separated Related Skills line (no backticks) is parsed too', () => {
  const content = '- **Related Skills**: foo-skill, bar-skill, seo-growth-orchestrator';
  const found = extractSkillRefCandidates(content);
  assert.deepStrictEqual(found.sort(), ['bar-skill', 'foo-skill', 'seo-growth-orchestrator'].sort());
});

test('extractSkillRefCandidates: a table with a Skill/Delegate header column is scanned row by row', () => {
  const content = [
    '| Skill | Used for |',
    '|-------|----------|',
    '| `foo-skill` | Thing one |',
    '| `bar-skill` | Thing two |',
  ].join('\n');
  const found = extractSkillRefCandidates(content);
  assert.ok(found.includes('foo-skill'));
  assert.ok(found.includes('bar-skill'));
});

test('extractSkillRefCandidates: Plugin/Browser/Data/Tools-labeled bullets are excluded even inside an Integration section', () => {
  const content = [
    '## Integration',
    '',
    '- **Related skills**: `foo-skill`',
    '- **Plugin**: `claude-seo:seo-cluster`',
    '- **Browser**: needs `browser-harness` logged in.',
    '- **Data:** GSC via `some-external-tool`.',
  ].join('\n');
  const found = extractSkillRefCandidates(content);
  assert.ok(found.includes('foo-skill'));
  assert.ok(!found.includes('browser-harness'));
  assert.ok(!found.includes('some-external-tool'));
});

test('resolveSkillRef: matches with or without the rcode- prefix', () => {
  const known = new Set(['seo-audit', 'rcode-seo-audit']);
  assert.ok(resolveSkillRef('seo-audit', known));
  assert.ok(resolveSkillRef('rcode-seo-audit', known));
  assert.ok(!resolveSkillRef('nonexistent-skill', known));
});

// ---------- buildKnownIdentifiers ----------

test('buildKnownIdentifiers: registers skill dir names, frontmatter names, and nested composes_with', (t) => {
  const root = makeTempDir();
  t.after(() => cleanup(root));
  write(
    root,
    'rcode/skills/seo/my-skill/SKILL.md',
    [
      '---',
      'name: rcode-my-skill',
      'metadata:',
      '  composes_with: ["herdr-orchestration", "autonomous-fix-campaign"]',
      '---',
      '# My Skill',
    ].join('\n'),
  );

  const known = buildKnownIdentifiers(root);
  assert.ok(known.has('my-skill'));
  assert.ok(known.has('rcode-my-skill'));
  assert.ok(known.has('herdr-orchestration'));
  assert.ok(known.has('autonomous-fix-campaign'));
});

// ---------- checkSkillDir (integration) ----------

test('checkSkillDir: a clean skill (all refs resolve, all references/ reachable) reports nothing', (t) => {
  const root = makeTempDir();
  t.after(() => cleanup(root));
  write(
    root,
    'rcode/skills/seo/good-skill/SKILL.md',
    [
      '# Good Skill',
      'See [references/foo.md](references/foo.md).',
      '- **Related Skills**: `good-skill-2`',
    ].join('\n'),
  );
  write(root, 'rcode/skills/seo/good-skill/references/foo.md', '# Foo');
  write(root, 'rcode/skills/seo/good-skill-2/SKILL.md', '# Good Skill 2');

  const knownIdentifiers = buildKnownIdentifiers(root);
  const result = checkSkillDir(path.join(root, 'rcode/skills/seo/good-skill'), { knownIdentifiers, packageRoot: root });
  assert.deepStrictEqual(result.brokenFileRefs, []);
  assert.deepStrictEqual(result.brokenSkillRefs, []);
  assert.deepStrictEqual(result.orphanedReferences, []);
});

test('checkSkillDir: flags a broken file ref, a broken skill ref, and an orphaned reference module', (t) => {
  const root = makeTempDir();
  t.after(() => cleanup(root));
  write(
    root,
    'rcode/skills/seo/bad-skill/SKILL.md',
    [
      '# Bad Skill',
      'See [references/missing.md](references/missing.md).',
      '- **Related Skills**: `nonexistent-skill`',
    ].join('\n'),
  );
  // A references/ file that exists on disk but nothing links to.
  write(root, 'rcode/skills/seo/bad-skill/references/orphan.md', '# Orphan');

  const knownIdentifiers = buildKnownIdentifiers(root);
  const result = checkSkillDir(path.join(root, 'rcode/skills/seo/bad-skill'), { knownIdentifiers, packageRoot: root });

  assert.strictEqual(result.brokenFileRefs.length, 1);
  assert.strictEqual(result.brokenFileRefs[0].ref, 'references/missing.md');

  assert.strictEqual(result.brokenSkillRefs.length, 1);
  assert.strictEqual(result.brokenSkillRefs[0].ref, 'nonexistent-skill');

  assert.strictEqual(result.orphanedReferences.length, 1);
  assert.match(result.orphanedReferences[0], /references[/\\]orphan\.md$/);
});

test('checkSkillDir: transitive reachability — SKILL.md -> references.md -> references/deep.md', (t) => {
  const root = makeTempDir();
  t.after(() => cleanup(root));
  write(root, 'rcode/skills/seo/chain-skill/SKILL.md', 'See [references.md](references.md).');
  write(root, 'rcode/skills/seo/chain-skill/references.md', 'See [references/deep.md](references/deep.md).');
  write(root, 'rcode/skills/seo/chain-skill/references/deep.md', '# Deep');

  const knownIdentifiers = buildKnownIdentifiers(root);
  const result = checkSkillDir(path.join(root, 'rcode/skills/seo/chain-skill'), { knownIdentifiers, packageRoot: root });
  assert.deepStrictEqual(result.orphanedReferences, []);
});

// ---------- runLinkChecks (enforce vs report-only) ----------

test('runLinkChecks: enforced buckets return per-skill detail; report-only buckets only contribute a count', (t) => {
  const root = makeTempDir();
  t.after(() => cleanup(root));
  // Broken skill in the enforced bucket.
  write(root, 'rcode/skills/seo/broken-skill/SKILL.md', '- **Related Skills**: `missing-skill`');
  // An equally broken skill in a report-only bucket.
  write(root, 'rcode/skills/agents/other-broken/SKILL.md', '- **Related Skills**: `also-missing`');

  const { enforced, reportOnlyCount } = runLinkChecks(root, {
    enforce: ['seo'],
    reportOnly: ['agents'],
  });

  assert.strictEqual(enforced.length, 1);
  assert.strictEqual(enforced[0].skill, 'rcode/skills/seo/broken-skill');
  assert.strictEqual(reportOnlyCount, 1);
});

test('runLinkChecks: a fully clean enforced bucket returns no findings', (t) => {
  const root = makeTempDir();
  t.after(() => cleanup(root));
  write(root, 'rcode/skills/seo/clean-skill/SKILL.md', '# Clean Skill\nNothing to see here.');

  const { enforced } = runLinkChecks(root, { enforce: ['seo'], reportOnly: [] });
  assert.deepStrictEqual(enforced, []);
});
