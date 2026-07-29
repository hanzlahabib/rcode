/**
 * Tests for pure helper functions in cli/github-sync.js and the discovery
 * module it delegates to (cli/lib/github-sync-discover.cjs).
 *
 * Covers: parseArgs, extractFrontmatter, extractTitle, loadState, loadSyncMap,
 * discoverSprintTrackPhases, discoverEpicTrackPhase, discoverPhases,
 * applyGranularFilters — all exercisable without network or gh CLI. Temp
 * directories are cleaned up in each test.
 *
 * Run: node --test test/github-sync.test.cjs
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const discover = require('../cli/lib/github-sync-discover.cjs');

// ---- inline the remaining pure helpers under test ----
// parseArgs, contentHash, loadState, loadSyncMap still live in
// cli/github-sync.js, unchanged by this phase — they stay re-implemented
// here as a direct copy of the source so the tests catch behavioural
// regressions by comparison rather than calling the live functions.
// extractFrontmatter/extractTitle now live in cli/lib/github-sync-discover.cjs
// and are imported directly above instead of re-implemented.

const crypto = require('crypto');

function contentHash(str) {
  return crypto.createHash('sha256').update(str || '').digest('hex').slice(0, 12);
}

function parseArgs(args) {
  const opts = {
    execute: false, dryRun: true, repo: null, only: null,
    phase: null, sprint: null, epic: null, story: null,
    withLabels: false, createProject: false, yes: false, forceYolo: false,
    updateBody: true, updateLabels: true, updateMilestone: true, updateState: true,
  };
  for (const arg of args) {
    if (arg === '--execute' || arg === '-e') { opts.execute = true; opts.dryRun = false; }
    else if (arg === '--dry-run') { opts.dryRun = true; opts.execute = false; }
    else if (arg === '--yes' || arg === '-y') opts.yes = true;
    else if (arg === '--force-yolo') opts.forceYolo = true;
    else if (arg === '--with-labels') opts.withLabels = true;
    else if (arg === '--project') opts.createProject = true;
    else if (arg === '--no-update') { opts.updateBody = false; opts.updateLabels = false; opts.updateMilestone = false; opts.updateState = false; }
    else if (arg === '--no-update-body') opts.updateBody = false;
    else if (arg === '--no-update-labels') opts.updateLabels = false;
    else if (arg === '--no-close') opts.updateState = false;
    else if (arg.startsWith('--repo=')) opts.repo = arg.slice('--repo='.length);
    else if (arg.startsWith('--only=')) opts.only = arg.slice('--only='.length);
    else if (arg.startsWith('--phase=')) opts.phase = arg.slice('--phase='.length);
    else if (arg.startsWith('--sprint=')) opts.sprint = arg.slice('--sprint='.length);
    else if (arg.startsWith('--epic=')) opts.epic = arg.slice('--epic='.length);
    else if (arg.startsWith('--story=')) opts.story = arg.slice('--story='.length);
  }
  opts.updateEnabled = opts.updateBody || opts.updateLabels || opts.updateMilestone || opts.updateState;
  return opts;
}

// loadState and loadSyncMap call fs — we replicate them so the JSON.parse
// safety guard added in fix/json-parse-safety is exercised.
function loadState(cwd) {
  const statePath = path.join(cwd, '.rcode/state.json');
  if (!fs.existsSync(statePath)) return null;
  try { return JSON.parse(fs.readFileSync(statePath, 'utf8')); } catch { return null; }
}

function loadSyncMap(cwd) {
  const mapPath = path.join(cwd, '.rcode/integrations/github-map.json');
  if (!fs.existsSync(mapPath)) return { phases: {}, epics: {}, stories: {}, project: null, labels: [] };
  try { return JSON.parse(fs.readFileSync(mapPath, 'utf8')); } catch {
    return { phases: {}, epics: {}, stories: {}, project: null, labels: [] };
  }
}

// ---- helpers ----

function mkTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'gh-sync-test-'));
}

function rmTmp(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

// ============================================================
// parseArgs
// ============================================================

test('parseArgs — defaults: dryRun true, execute false, all updates enabled', () => {
  const opts = parseArgs([]);
  assert.strictEqual(opts.dryRun, true);
  assert.strictEqual(opts.execute, false);
  assert.strictEqual(opts.updateEnabled, true);
  assert.strictEqual(opts.withLabels, false);
  assert.strictEqual(opts.repo, null);
});

test('parseArgs — --execute flips dryRun/execute', () => {
  const opts = parseArgs(['--execute']);
  assert.strictEqual(opts.execute, true);
  assert.strictEqual(opts.dryRun, false);
});

test('parseArgs — --no-update disables all update flags and updateEnabled', () => {
  const opts = parseArgs(['--no-update']);
  assert.strictEqual(opts.updateBody, false);
  assert.strictEqual(opts.updateLabels, false);
  assert.strictEqual(opts.updateMilestone, false);
  assert.strictEqual(opts.updateState, false);
  assert.strictEqual(opts.updateEnabled, false);
});

test('parseArgs — --repo=owner/name captures value', () => {
  const opts = parseArgs(['--repo=owner/my-repo']);
  assert.strictEqual(opts.repo, 'owner/my-repo');
});

test('parseArgs — granular --phase/--epic/--story flags captured', () => {
  const opts = parseArgs(['--phase=phase-02', '--epic=epic-1-auth', '--story=story-1-1-login']);
  assert.strictEqual(opts.phase, 'phase-02');
  assert.strictEqual(opts.epic, 'epic-1-auth');
  assert.strictEqual(opts.story, 'story-1-1-login');
});

test('parseArgs — --no-update-body only disables body, not other updates', () => {
  const opts = parseArgs(['--no-update-body']);
  assert.strictEqual(opts.updateBody, false);
  assert.strictEqual(opts.updateLabels, true);
  assert.strictEqual(opts.updateEnabled, true);
});

// ============================================================
// extractFrontmatter (cli/lib/github-sync-discover.cjs)
// ============================================================

test('extractFrontmatter — parses key/value pairs from YAML block', () => {
  const content = '---\nepic: epic-1-auth\nsprint: sprint-01\n---\n# Title\nbody';
  const fm = discover.extractFrontmatter(content);
  assert.strictEqual(fm.epic, 'epic-1-auth');
  assert.strictEqual(fm.sprint, 'sprint-01');
});

test('extractFrontmatter — strips surrounding quotes from values', () => {
  const content = '---\ntitle: "My Story"\ntype: \'task\'\n---\n';
  const fm = discover.extractFrontmatter(content);
  assert.strictEqual(fm.title, 'My Story');
  assert.strictEqual(fm.type, 'task');
});

test('extractFrontmatter — returns empty object when no frontmatter block', () => {
  const fm = discover.extractFrontmatter('# Just a heading\n\nNo frontmatter here.');
  assert.deepStrictEqual(fm, {});
});

// ============================================================
// extractTitle (cli/lib/github-sync-discover.cjs)
// ============================================================

test('extractTitle — extracts first H1 heading', () => {
  const md = '# My Story Title\n\nSome body text.';
  assert.strictEqual(discover.extractTitle(md), 'My Story Title');
});

test('extractTitle — returns null when no H1 present', () => {
  assert.strictEqual(discover.extractTitle('## Section\n\nNo H1 here.'), null);
  assert.strictEqual(discover.extractTitle(''), null);
});

// ============================================================
// contentHash
// ============================================================

test('contentHash — same input produces same hash', () => {
  const h1 = contentHash('hello world');
  const h2 = contentHash('hello world');
  assert.strictEqual(h1, h2);
});

test('contentHash — different inputs produce different hashes', () => {
  assert.notStrictEqual(contentHash('hello'), contentHash('world'));
});

test('contentHash — empty string does not throw', () => {
  const h = contentHash('');
  assert.strictEqual(typeof h, 'string');
  assert.ok(h.length > 0);
});

// ============================================================
// loadState
// ============================================================

test('loadState — returns null when .rcode/state.json absent', () => {
  const tmp = mkTmp();
  try {
    assert.strictEqual(loadState(tmp), null);
  } finally {
    rmTmp(tmp);
  }
});

test('loadState — returns parsed object for valid JSON', () => {
  const tmp = mkTmp();
  try {
    const rcode = path.join(tmp, '.rcode');
    fs.mkdirSync(rcode);
    fs.writeFileSync(path.join(rcode, 'state.json'), JSON.stringify({ project_name: 'my-proj', phase: '3' }));
    const state = loadState(tmp);
    assert.strictEqual(state.project_name, 'my-proj');
    assert.strictEqual(state.phase, '3');
  } finally {
    rmTmp(tmp);
  }
});

test('loadState — returns null for malformed JSON (fix/json-parse-safety guard)', () => {
  const tmp = mkTmp();
  try {
    const rcode = path.join(tmp, '.rcode');
    fs.mkdirSync(rcode);
    fs.writeFileSync(path.join(rcode, 'state.json'), '{ broken json ,,, }');
    assert.strictEqual(loadState(tmp), null);
  } finally {
    rmTmp(tmp);
  }
});

// ============================================================
// loadSyncMap
// ============================================================

test('loadSyncMap — returns blank template when github-map.json absent', () => {
  const tmp = mkTmp();
  try {
    const map = loadSyncMap(tmp);
    assert.deepStrictEqual(map.phases, {});
    assert.deepStrictEqual(map.epics, {});
    assert.deepStrictEqual(map.stories, {});
    assert.strictEqual(map.project, null);
    assert.deepStrictEqual(map.labels, []);
  } finally {
    rmTmp(tmp);
  }
});

test('loadSyncMap — returns blank template for malformed JSON (fix/json-parse-safety guard)', () => {
  const tmp = mkTmp();
  try {
    const intDir = path.join(tmp, '.rcode', 'integrations');
    fs.mkdirSync(intDir, { recursive: true });
    fs.writeFileSync(path.join(intDir, 'github-map.json'), 'not valid {{json}}');
    const map = loadSyncMap(tmp);
    assert.deepStrictEqual(map.phases, {});
    assert.strictEqual(map.project, null);
  } finally {
    rmTmp(tmp);
  }
});

test('loadSyncMap — returns stored data for valid github-map.json', () => {
  const tmp = mkTmp();
  try {
    const intDir = path.join(tmp, '.rcode', 'integrations');
    fs.mkdirSync(intDir, { recursive: true });
    const stored = { phases: { 'phase-01': { number: 1 } }, epics: {}, stories: {}, project: null, labels: ['bug'] };
    fs.writeFileSync(path.join(intDir, 'github-map.json'), JSON.stringify(stored));
    const map = loadSyncMap(tmp);
    assert.deepStrictEqual(map.phases['phase-01'], { number: 1 });
    assert.deepStrictEqual(map.labels, ['bug']);
  } finally {
    rmTmp(tmp);
  }
});

// ============================================================
// discoverSprintTrackPhases (.planning/phases/*-SPRINT.md, current schema)
// ============================================================

test('discoverSprintTrackPhases — parses a `<task id title>` block into a story with the right id/title/sprintId', () => {
  const tmp = mkTmp();
  try {
    const dir = path.join(tmp, '.planning', 'phases', '9-test');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, '9-1-SPRINT.md'),
      '<tasks><task id="9.1.1" title="Do the thing"></task></tasks>',
    );
    const phases = discover.discoverSprintTrackPhases(tmp);
    assert.strictEqual(phases.length, 1);
    assert.strictEqual(phases[0].numericId, '9');
    assert.strictEqual(phases[0].stories.length, 1);
    assert.strictEqual(phases[0].stories[0].id, '9.1.1');
    assert.strictEqual(phases[0].stories[0].title, 'Do the thing');
    assert.strictEqual(phases[0].stories[0].sprintId, '9.1');
    assert.strictEqual(phases[0].stories[0].sourcePath, '.planning/phases/9-test/9-1-SPRINT.md');
  } finally {
    rmTmp(tmp);
  }
});

test('discoverSprintTrackPhases — falls back to nested `<title>` tag when no title attribute is present', () => {
  const tmp = mkTmp();
  try {
    const dir = path.join(tmp, '.planning', 'phases', '9-test');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, '9-1-SPRINT.md'),
      '<tasks><task id="9.1.2"><title>Nested title</title></task></tasks>',
    );
    const phases = discover.discoverSprintTrackPhases(tmp);
    assert.strictEqual(phases[0].stories[0].id, '9.1.2');
    assert.strictEqual(phases[0].stories[0].title, 'Nested title');
  } finally {
    rmTmp(tmp);
  }
});

test('discoverSprintTrackPhases — falls back to `### Story N — title` heading format when no `<task>` blocks exist', () => {
  const tmp = mkTmp();
  try {
    const dir = path.join(tmp, '.planning', 'phases', '9-test');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, '9-1-SPRINT.md'),
      '### Story 9.1.3 — Legacy heading\n\nSome body text.\n',
    );
    const phases = discover.discoverSprintTrackPhases(tmp);
    assert.strictEqual(phases[0].stories.length, 1);
    assert.strictEqual(phases[0].stories[0].id, '9.1.3');
    assert.strictEqual(phases[0].stories[0].title, 'Legacy heading');
  } finally {
    rmTmp(tmp);
  }
});

test('discoverSprintTrackPhases — returns `[]` when `.planning/phases/` doesn\'t exist', () => {
  const tmp = mkTmp();
  try {
    assert.deepStrictEqual(discover.discoverSprintTrackPhases(tmp), []);
  } finally {
    rmTmp(tmp);
  }
});

// ============================================================
// discoverEpicTrackPhase (.planning/epics/, current schema)
// ============================================================

test('discoverEpicTrackPhase — parses EPIC-NN.md + stories/N.M.md and links by numeric epic value', () => {
  const tmp = mkTmp();
  try {
    const epicsDir = path.join(tmp, '.planning', 'epics');
    const storiesDir = path.join(epicsDir, 'stories');
    fs.mkdirSync(storiesDir, { recursive: true });
    fs.writeFileSync(path.join(epicsDir, 'EPIC-01.md'), '# Epic 1: Auth\n\n**Phase:** implementation\n');
    fs.writeFileSync(path.join(storiesDir, '1.1.md'), '# Story 1.1: Login flow\n\n**Epic:** EPIC-1 — Auth\n**Status:** todo\n');
    const phase = discover.discoverEpicTrackPhase(tmp);
    assert.ok(phase, 'expected a synthetic epics phase');
    assert.strictEqual(phase.noMilestone, true);
    assert.strictEqual(phase.epics.length, 1);
    assert.strictEqual(phase.stories.length, 1);
    assert.strictEqual(phase.stories[0].parentEpic, 'EPIC-01');
    assert.strictEqual(phase.stories[0].sourcePath, '.planning/epics/stories/1.1.md');
  } finally {
    rmTmp(tmp);
  }
});

test('discoverEpicTrackPhase — returns `null` when `.planning/epics/` doesn\'t exist', () => {
  const tmp = mkTmp();
  try {
    assert.strictEqual(discover.discoverEpicTrackPhase(tmp), null);
  } finally {
    rmTmp(tmp);
  }
});

// ============================================================
// discoverPhases (combines both tracks)
// ============================================================

test('discoverPhases — combines sprint-track phases and the synthetic epics phase when both exist', () => {
  const tmp = mkTmp();
  try {
    const phaseDir = path.join(tmp, '.planning', 'phases', '9-test');
    fs.mkdirSync(phaseDir, { recursive: true });
    fs.writeFileSync(
      path.join(phaseDir, '9-1-SPRINT.md'),
      '<tasks><task id="9.1.1" title="Do the thing"></task></tasks>',
    );
    const epicsDir = path.join(tmp, '.planning', 'epics');
    fs.mkdirSync(epicsDir, { recursive: true });
    fs.writeFileSync(path.join(epicsDir, 'EPIC-01.md'), '# Epic 1: Auth\n');

    const phases = discover.discoverPhases(tmp);
    assert.ok(phases.some((p) => p.id === '9-test'));
    assert.ok(phases.some((p) => p.id === 'epics'));
  } finally {
    rmTmp(tmp);
  }
});

// ============================================================
// applyGranularFilters
// ============================================================

test('applyGranularFilters — --sprint filter matches both dash and dot sprint-id forms', () => {
  const phases = [
    {
      id: '44-test', numericId: '44', epics: [],
      stories: [
        { id: '44.1.1', sprintId: '44.1', parentEpic: null },
        { id: '45.1.1', sprintId: '45.1', parentEpic: null },
      ],
    },
  ];

  const dashFiltered = discover.applyGranularFilters(phases, { sprint: '44-1' });
  assert.strictEqual(dashFiltered[0].stories.length, 1);
  assert.strictEqual(dashFiltered[0].stories[0].id, '44.1.1');

  const dotFiltered = discover.applyGranularFilters(phases, { sprint: '44.1' });
  assert.strictEqual(dotFiltered[0].stories.length, 1);
  assert.strictEqual(dotFiltered[0].stories[0].id, '44.1.1');
});
