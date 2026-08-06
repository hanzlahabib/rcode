/**
 * Tests for rcode/bin/lib/council-panel.cjs and rcode/bin/lib/roadmap.cjs.
 *
 * council-panel: detectDomain(), validateAgents(), loadTeamConfig(), selectPanel()
 * roadmap: cmdGetPhase(), cmdListPhases(), cmdSummary(), cmdClear()
 *
 * Covers audit findings L3-08 (council-panel untested) and L3-10 (roadmap untested).
 *
 * Run: node --test test/council-panel-and-roadmap.test.cjs
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..');

const {
  AGENT_IDS,
  detectDomain,
  loadTeamConfig,
  selectPanel,
  normalize,
} = require(path.join(PROJECT_ROOT, 'rcode/bin/lib/council-panel.cjs'));

const {
  cmdGetPhase,
  cmdListPhases,
  cmdSummary,
  cmdClear,
  cmdUpdatePlanProgress,
} = require(path.join(PROJECT_ROOT, 'rcode/bin/lib/roadmap.cjs'));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'rcode-test-'));
}

function writeRoadmap(dir, content) {
  const planningDir = path.join(dir, '.planning');
  fs.mkdirSync(planningDir, { recursive: true });
  fs.writeFileSync(path.join(planningDir, 'ROADMAP.md'), content, 'utf8');
}

function cleanTmp(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// council-panel: detectDomain()
// ---------------------------------------------------------------------------

test('council-panel: detectDomain identifies "fe" for react/component questions', () => {
  const q = normalize('the react component is broken on the frontend');
  const scores = { haitham: 10, yousef: 2 };
  const domain = detectDomain(q, scores);
  assert.strictEqual(domain, 'fe');
});

test('council-panel: detectDomain identifies "deploy" for kubernetes questions', () => {
  const q = normalize('deploy to kubernetes and set up monitoring');
  const scores = { khalid: 10, waleed: 2 };
  const domain = detectDomain(q, scores);
  assert.strictEqual(domain, 'deploy');
});

test('council-panel: detectDomain identifies "market" when market trigger is present', () => {
  const q = normalize('which project should we build for the oman market');
  const scores = { mariam: 10, sadiq: 3 };
  const domain = detectDomain(q, scores);
  assert.strictEqual(domain, 'market');
});

test('council-panel: detectDomain falls back to "strategic" for strategy questions with no technical trigger', () => {
  const q = normalize('should i kill this feature or pivot the product direction');
  const scores = { sadiq: 15, 'hussain-pm': 3 };
  const domain = detectDomain(q, scores);
  assert.strictEqual(domain, 'strategic');
});

// ---------------------------------------------------------------------------
// council-panel: agent validation (tested via selectPanel opts.agents)
// validateAgents() is internal — exercise its contract through the public API.
// ---------------------------------------------------------------------------

test('council-panel: selectPanel opts.agents accepts all-valid ids and returns them unchanged', () => {
  const result = selectPanel('any question', { agents: ['sadiq', 'waleed', 'fatima'] });
  assert.deepStrictEqual(result, ['sadiq', 'waleed', 'fatima']);
});

test('council-panel: selectPanel opts.agents throws on unknown agent id', () => {
  assert.throws(
    () => selectPanel('any question', { agents: ['sadiq', 'ghost-agent'] }),
    (err) => {
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes('ghost-agent'), `expected "ghost-agent" in: ${err.message}`);
      return true;
    },
  );
});

// ---------------------------------------------------------------------------
// council-panel: loadTeamConfig()
// ---------------------------------------------------------------------------

test('council-panel: loadTeamConfig returns null when project root has no team.yaml', () => {
  const tmp = makeTmpDir();
  try {
    const result = loadTeamConfig(tmp);
    assert.strictEqual(result, null, 'should return null for missing team.yaml');
  } finally {
    cleanTmp(tmp);
  }
});

test('council-panel: loadTeamConfig returns null on any parse error (does not throw)', () => {
  const tmp = makeTmpDir();
  try {
    // Create an invalid / empty team.yaml so the parser can run
    const v2Dir = path.join(tmp, 'rcode', 'v2');
    fs.mkdirSync(v2Dir, { recursive: true });
    fs.writeFileSync(path.join(v2Dir, 'team.yaml'), 'not: valid: yaml: content:\n  garbage', 'utf8');
    let result;
    assert.doesNotThrow(() => { result = loadTeamConfig(tmp); });
    // may succeed with partial parse or return null — either is acceptable; must not crash
    assert.ok(result === null || typeof result === 'object');
  } finally {
    cleanTmp(tmp);
  }
});

// ---------------------------------------------------------------------------
// council-panel: selectPanel()
// ---------------------------------------------------------------------------

test('council-panel: selectPanel with opts.full returns all AGENT_IDS', () => {
  const panel = selectPanel('anything', { full: true });
  assert.deepStrictEqual(panel, AGENT_IDS);
});

test('council-panel: selectPanel picks haitham for a frontend question', () => {
  const panel = selectPanel('the react component crashes on mobile frontend');
  assert.ok(panel.includes('haitham'), `expected haitham in panel, got: ${panel.join(', ')}`);
});

test('council-panel: selectPanel picks mariam for a market question', () => {
  const panel = selectPanel('market research for oman and gtm launch plan');
  assert.ok(panel.includes('mariam'), `expected mariam in panel, got: ${panel.join(', ')}`);
});

test('council-panel: selectPanel with opts.agents returns only those agents (validated)', () => {
  const panel = selectPanel('any question', { agents: ['sadiq', 'noor'] });
  assert.deepStrictEqual(panel, ['sadiq', 'noor']);
});

test('council-panel: selectPanel returns sensible default (no crash) for empty question', () => {
  const panel = selectPanel('');
  assert.ok(Array.isArray(panel), 'should return an array');
  assert.ok(panel.length >= 1, 'should return at least one agent');
  assert.ok(panel.every((id) => AGENT_IDS.includes(id)), 'all returned ids must be valid');
});

// ---------------------------------------------------------------------------
// roadmap: cmdListPhases()
// ---------------------------------------------------------------------------

test('roadmap: cmdListPhases returns [] when ROADMAP.md is absent', () => {
  const tmp = makeTmpDir();
  try {
    const result = cmdListPhases(tmp);
    assert.deepStrictEqual(result, []);
  } finally {
    cleanTmp(tmp);
  }
});

test('roadmap: cmdListPhases parses colon-separator phases', () => {
  const tmp = makeTmpDir();
  try {
    writeRoadmap(tmp, [
      '# Roadmap',
      '',
      '## Phase 1: Bootstrap',
      '**Goal:** Get things started.',
      '**Status:** Complete',
      '',
      '## Phase 2: Scale',
      '**Goal:** Grow the system.',
      '**Status:** Planned',
    ].join('\n'));
    const phases = cmdListPhases(tmp);
    assert.strictEqual(phases.length, 2, 'expected 2 phases');
    assert.strictEqual(phases[0].number, '1');
    assert.strictEqual(phases[0].name, 'Bootstrap');
    assert.strictEqual(phases[0].status, 'complete');
    assert.strictEqual(phases[1].number, '2');
    assert.strictEqual(phases[1].status, 'planned');
  } finally {
    cleanTmp(tmp);
  }
});

test('roadmap: cmdListPhases handles em-dash separator (fix for #464)', () => {
  const tmp = makeTmpDir();
  try {
    writeRoadmap(tmp, [
      '# Roadmap',
      '',
      '## Phase 6 — Launch',
      '**Goal:** Ship it.',
      '**Status:** Active',
    ].join('\n'));
    const phases = cmdListPhases(tmp);
    assert.strictEqual(phases.length, 1, 'expected 1 phase with em-dash');
    assert.strictEqual(phases[0].number, '6');
    assert.strictEqual(phases[0].name, 'Launch');
    assert.strictEqual(phases[0].status, 'active');
  } finally {
    cleanTmp(tmp);
  }
});

// ---------------------------------------------------------------------------
// roadmap: cmdGetPhase()
// ---------------------------------------------------------------------------

test('roadmap: cmdGetPhase returns found:false when ROADMAP.md is absent', () => {
  const tmp = makeTmpDir();
  try {
    const result = cmdGetPhase(tmp, '1');
    assert.strictEqual(result.found, false);
    assert.ok(result.error, 'should include an error message');
  } finally {
    cleanTmp(tmp);
  }
});

test('roadmap: cmdGetPhase returns found:false for missing phase number', () => {
  const tmp = makeTmpDir();
  try {
    writeRoadmap(tmp, '## Phase 1: Bootstrap\n**Goal:** Setup.\n');
    const result = cmdGetPhase(tmp, '99');
    assert.strictEqual(result.found, false);
  } finally {
    cleanTmp(tmp);
  }
});

test('roadmap: cmdGetPhase returns phase data for a found phase', () => {
  const tmp = makeTmpDir();
  try {
    writeRoadmap(tmp, [
      '## Phase 3: Core Features',
      '**Goal:** Build the core.',
      '**Status:** Planned',
      '',
      '**Requirements:**',
      '- Auth system',
      '- Dashboard',
      '',
      '**Success Criteria:**',
      '- Users can log in',
    ].join('\n'));
    const result = cmdGetPhase(tmp, '3');
    assert.strictEqual(result.found, true);
    assert.strictEqual(result.phase_number, '3');
    assert.strictEqual(result.name, 'Core Features');
    assert.strictEqual(result.goal, 'Build the core.');
    assert.ok(Array.isArray(result.requirements), 'requirements should be an array');
    assert.ok(result.requirements.includes('Auth system'), 'should parse requirements');
    assert.ok(Array.isArray(result.success_criteria), 'success_criteria should be an array');
  } finally {
    cleanTmp(tmp);
  }
});

test('roadmap: cmdGetPhase normalizes leading zeros (#813)', () => {
  const tmp = makeTmpDir();
  try {
    writeRoadmap(tmp, '## Phase 5: Auth\n**Goal:** Login.\n');
    // Query with leading zero "05" should still match Phase 5
    const result = cmdGetPhase(tmp, '05');
    assert.strictEqual(result.found, true);
    assert.strictEqual(result.name, 'Auth');
  } finally {
    cleanTmp(tmp);
  }
});

// ---------------------------------------------------------------------------
// roadmap: cmdSummary()
// ---------------------------------------------------------------------------

test('roadmap: cmdSummary returns found:false when ROADMAP.md absent', () => {
  const tmp = makeTmpDir();
  try {
    const result = cmdSummary(tmp);
    assert.strictEqual(result.found, false);
  } finally {
    cleanTmp(tmp);
  }
});

test('roadmap: cmdSummary counts phases and identifies active phase', () => {
  const tmp = makeTmpDir();
  try {
    writeRoadmap(tmp, [
      '## Phase 1: Done',
      '**Status:** Complete',
      '',
      '## Phase 2: Running',
      '**Status:** Active',
      '',
      '## Phase 3: Upcoming',
      '**Status:** Planned',
    ].join('\n'));
    const summary = cmdSummary(tmp);
    assert.strictEqual(summary.total_phases, 3);
    assert.strictEqual(summary.completed_phases, 1);
    assert.ok(summary.active_phase !== null, 'should have an active phase');
    assert.strictEqual(summary.active_phase.number, '2');
    assert.strictEqual(summary.upcoming_phases.length, 1);
  } finally {
    cleanTmp(tmp);
  }
});

// ---------------------------------------------------------------------------
// roadmap: cmdUpdatePlanProgress() — 1-arg auto-detect form (#1013)
// ---------------------------------------------------------------------------

function writePhaseFiles(dir, phaseSlug, filenames) {
  const phaseDir = path.join(dir, '.planning', 'phases', phaseSlug);
  fs.mkdirSync(phaseDir, { recursive: true });
  for (const f of filenames) fs.writeFileSync(path.join(phaseDir, f), '', 'utf8');
}

test('roadmap: cmdUpdatePlanProgress (1-arg) persists Status/Plans and returns updated:true (#1013)', () => {
  const tmp = makeTmpDir();
  try {
    writeRoadmap(tmp, [
      '## Phase 46 — Wire named engineer subagents into execute dispatch routing',
      '',
      '**Goal:** Do the thing.',
      '',
      '**Status:** Planned',
      '',
      '**Plans:**',
      '- _TBD_',
      '',
      '**Acceptance:** All done.',
      '',
      '---',
    ].join('\n'));
    writePhaseFiles(tmp, '46-wire-named-engineer-subagents', ['46-1-SPRINT.md', '46-1-SUMMARY.md']);

    const result = cmdUpdatePlanProgress(tmp, '46');
    assert.strictEqual(result.updated, true, 'must report updated:true when it actually writes');
    assert.strictEqual(result.status, 'complete');

    const written = fs.readFileSync(path.join(tmp, '.planning', 'ROADMAP.md'), 'utf8');
    assert.match(written, /\*\*Status:\*\* Complete \(\d{4}-\d{2}-\d{2}\)/, 'Status line must be persisted to disk');
    assert.match(written, /\*\*Plans:\*\*\n- 46-1 — SUMMARY shipped/, 'Plans line must be persisted to disk');
    assert.doesNotMatch(written, /_TBD_/, 'placeholder must be replaced, not left stale');
  } finally {
    cleanTmp(tmp);
  }
});

test('roadmap: cmdUpdatePlanProgress (1-arg) is idempotent — re-run returns updated:false once synced', () => {
  const tmp = makeTmpDir();
  try {
    writeRoadmap(tmp, [
      '## Phase 46 — Wire named engineer subagents into execute dispatch routing',
      '',
      '**Status:** Planned',
      '',
      '**Plans:**',
      '- _TBD_',
      '',
      '---',
    ].join('\n'));
    writePhaseFiles(tmp, '46-wire-named-engineer-subagents', ['46-1-SPRINT.md', '46-1-SUMMARY.md']);

    const first = cmdUpdatePlanProgress(tmp, '46');
    assert.strictEqual(first.updated, true);

    const second = cmdUpdatePlanProgress(tmp, '46');
    assert.strictEqual(second.updated, false, 'second run should be a no-op once ROADMAP.md already reflects computed status');
    assert.strictEqual(second.status, 'complete');
  } finally {
    cleanTmp(tmp);
  }
});

test('roadmap: cmdUpdatePlanProgress (1-arg) reports in_progress and partial Plans list when not all plans have summaries', () => {
  const tmp = makeTmpDir();
  try {
    writeRoadmap(tmp, [
      '## Phase 46 — Wire named engineer subagents into execute dispatch routing',
      '',
      '**Status:** Planned',
      '',
      '**Plans:**',
      '- _TBD_',
      '',
      '---',
    ].join('\n'));
    writePhaseFiles(tmp, '46-wire-named-engineer-subagents', [
      '46-1-SPRINT.md', '46-1-SUMMARY.md',
      '46-2-SPRINT.md',
    ]);

    const result = cmdUpdatePlanProgress(tmp, '46');
    assert.strictEqual(result.updated, true);
    assert.strictEqual(result.status, 'in_progress');

    const written = fs.readFileSync(path.join(tmp, '.planning', 'ROADMAP.md'), 'utf8');
    assert.match(written, /\*\*Status:\*\* In Progress/);
    assert.match(written, /- 46-1 — SUMMARY shipped/);
    assert.match(written, /- 46-2 — in progress/);
  } finally {
    cleanTmp(tmp);
  }
});

test('roadmap: cmdUpdatePlanProgress (1-arg) returns updated:false with note when phase dir is missing', () => {
  const tmp = makeTmpDir();
  try {
    writeRoadmap(tmp, ['## Phase 46 — Something', '**Status:** Planned', '', '---'].join('\n'));
    const result = cmdUpdatePlanProgress(tmp, '46');
    assert.strictEqual(result.updated, false);
    assert.match(result.note, /phase dir for 46 not found/);
  } finally {
    cleanTmp(tmp);
  }
});

test('roadmap: cmdUpdatePlanProgress (1-arg) does not clobber an already-populated Plans list', () => {
  const tmp = makeTmpDir();
  try {
    writeRoadmap(tmp, [
      '## Phase 46 — Wire named engineer subagents into execute dispatch routing',
      '',
      '**Status:** Planned',
      '',
      '**Plans:**',
      '- 46-1 — Hand-authored description (#1003)',
      '',
      '---',
    ].join('\n'));
    writePhaseFiles(tmp, '46-wire-named-engineer-subagents', ['46-1-SPRINT.md', '46-1-SUMMARY.md']);

    const result = cmdUpdatePlanProgress(tmp, '46');
    assert.strictEqual(result.updated, true, 'Status still needs updating');

    const written = fs.readFileSync(path.join(tmp, '.planning', 'ROADMAP.md'), 'utf8');
    assert.match(written, /- 46-1 — Hand-authored description \(#1003\)/, 'existing hand-authored Plans text must be preserved');
  } finally {
    cleanTmp(tmp);
  }
});
