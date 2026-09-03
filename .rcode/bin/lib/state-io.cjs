'use strict';
/**
 * state-io.cjs — canonical state.json read/write plus the small shared
 * `cmdState` helpers (flag parsing, the cross-project global decision log).
 *
 * Extracted from rcode-tools.cjs (#204 step 2). Before this, readState()/
 * writeState()/migrateState()/defaultState()/writeStateCompact() lived at
 * module scope in rcode-tools.cjs (already hoisted out of cmdState's own
 * closure per #1060, so every subcommand family could share the locked,
 * atomic writer) and cmdState() additionally nested four more helpers
 * (parseFlags, globalDecisionsPath, appendGlobalDecision,
 * readGlobalDecisions) in its own closure. This module is their single new
 * home so every future state-* family (#204 step 3) shares one
 * implementation instead of each re-deriving it.
 *
 * readState/writeState/writeStateCompact/defaultState take the caller's
 * statePath/rcodeDir/projectRoot explicitly rather than re-deriving
 * PROJECT_ROOT — that detection (env override, installed-vs-source check)
 * stays a single source of truth in rcode-tools.cjs, which calls in here
 * through thin zero-arg wrappers that close over its own constants. Pure
 * Node stdlib. No external dependencies.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Canonical phase status enum (#955, reconciled #1060). Single source of
// truth for valid phase statuses — both migrateState()'s alias
// normalization and `phase set-status`'s validation read from it, so the
// two can no longer drift the way they did before (validStatuses used to
// list its own hand-maintained, differently-spelled array).
//
// 'executed' and 'verified' are DISTINCT pipeline states, not legacy
// spellings of 'complete' — execute.md's two-step gate (executed → only
// promoted to complete once VERIFICATION.md passes) has nothing real to
// check against if the alias table silently collapses 'executed' into
// 'complete' on every read. Only 'completed' (a spelling variant of the
// same state) is aliased.
const PHASE_STATUS_ALIASES = {
  completed: 'complete',
};
const PHASE_STATUS_ENUM = new Set(['planned', 'executing', 'executed', 'complete', 'blocked']);

/** Map a legacy status spelling to the canonical enum value (idempotent). */
function normalizePhaseStatus(status) {
  if (typeof status !== 'string') return status;
  return PHASE_STATUS_ALIASES[status] ?? status;
}

/**
 * migrateState — pure normalizer that upgrades any legacy state shape to v2.
 *
 * v0: { milestone: string, no phases[], no schema_version }
 * v1: { phases[] with mixed shapes, schema_version: 1 }
 * v2 (target): { schema_version: 2, phases[] uniform, milestones[] array }
 *
 * This function is PURE — it never writes to disk. readState() calls it on
 * every read so all callers transparently receive v2-shaped data. (#735)
 */
function migrateState(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  const state = Object.assign({}, raw);

  // --- milestones[] array (v0 → v2) ---
  // v0 state has milestone as a plain string and no milestones array.
  if (typeof state.milestone === 'string' && !Array.isArray(state.milestones)) {
    state.milestones = [{
      id: state.milestone,
      name: state.milestone,
      status: 'active',
    }];
  }
  if (!Array.isArray(state.milestones)) {
    state.milestones = [];
  }

  // --- phases[] uniform shape (v1 → v2) ---
  // v1 phases have mixed shapes: some {number, name}, others {id, name, status}.
  if (Array.isArray(state.phases)) {
    state.phases = state.phases.map(p => {
      if (!p || typeof p !== 'object') return p;
      // Resolve number: prefer p.number, fall back to numeric part of p.id
      let number = p.number ?? null;
      if (number === null && typeof p.id === 'string') {
        const m = p.id.match(/^(\d+(?:\.\d+)?)/);
        if (m) number = m[1];
      }
      // Resolve id: prefer p.id, synthesize from number
      const id = p.id ?? (number !== null ? String(number) : undefined);

      // --- unify entry.plans (legacy scalar count) into entry.sprints[] (#1069) ---
      // entry.plans was a plain count set by 'planned-phase'/'begin-phase';
      // entry.sprints[] is the array set by 'sprint add'. The two were never
      // reconciled (see the "Known schema divergence" comments at those
      // subcommands) — a phase could report `plans: 3` while `sprints` held
      // 0, 1, or 3 differently-shaped entries. entry.sprints[] is now the
      // single source of truth: backfill stub sprint entries for any count
      // entry.plans claims that entry.sprints[] doesn't already have, then
      // drop entry.plans entirely so nothing reads the stale scalar again.
      const sprints = Array.isArray(p.sprints) ? p.sprints.slice() : [];
      if (typeof p.plans === 'number' && p.plans > sprints.length) {
        const phaseNum = number ?? id ?? p.plans;
        for (let i = sprints.length; i < p.plans; i++) {
          const sprintNum = i + 1;
          sprints.push({
            id: `${phaseNum}.${sprintNum}`,
            number: sprintNum,
            goal: null,
            status: 'planned',
            velocity_target: null,
            velocity_actual: null,
            started_at: null,
            completed_at: null,
            stories: [],
            // Marks this entry as synthesized from the legacy plans count
            // rather than a real 'sprint add' call — no goal/stories exist
            // for it yet.
            migrated_from_plans_count: true,
          });
        }
      }

      return {
        number: number ?? p.id ?? null,
        id: id ?? null,
        name: p.name ?? null,
        status: normalizePhaseStatus(p.status ?? 'planned'),
        started: p.started ?? null,
        completed: p.completed ?? null,
        sprints,
        // Preserve any extra fields that callers may rely on — except
        // `plans`, which is unified into sprints[] above and intentionally
        // dropped so entry.sprints.length is the only count going forward.
        ...Object.fromEntries(
          Object.entries(p).filter(([k]) =>
            !['number', 'id', 'name', 'status', 'started', 'completed', 'sprints', 'plans'].includes(k)
          )
        ),
      };
    });
  }

  state.schema_version = 2;
  return state;
}

/** Read state or return null if it doesn't exist. */
function readState(statePath, rcodeDir, projectRoot) {
  if (!fs.existsSync(statePath)) return null;
  const stats = fs.statSync(statePath);
  if (stats.size > 10 * 1024 * 1024) {
    throw new Error('state.json exceeds 10 MB limit — possible corruption');
  }
  try {
    const raw = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    const migrated = migrateState(raw);
    // One-time idempotent status migration (#955): persist the normalized
    // phase statuses back to disk the first time legacy aliases are found,
    // so state.json itself becomes canonical and every other reader (e.g.
    // resolveActivePhase() in state-reader.cjs, which reads the file
    // directly rather than through this helper) sees clean values too.
    // Idempotent: once written, raw already matches migrated and this is a
    // no-op on every subsequent load.
    const rawPhases = Array.isArray(raw?.phases) ? raw.phases : [];
    const migratedPhases = Array.isArray(migrated?.phases) ? migrated.phases : [];
    const hasLegacyStatus = rawPhases.some((p, i) => p?.status !== migratedPhases[i]?.status);
    // entry.plans (legacy scalar count) is unified into entry.sprints[] by
    // migrateState() above and dropped from the migrated shape (#1069).
    // Persist that unification back to disk for the same reason as
    // hasLegacyStatus: readers that bypass migrateState() and parse
    // state.json directly (e.g. state-reader.cjs) must see the canonical
    // shape too, not just in-memory callers of readState().
    const hasLegacyPlans = rawPhases.some((p) => typeof p?.plans === 'number');
    if (hasLegacyStatus || hasLegacyPlans) {
      writeState(migrated, statePath, rcodeDir, projectRoot);
    }
    return migrated;
  } catch (e) {
    throw new Error(`Invalid JSON in state.json: ${e.message}`);
  }
}

/** Atomic write: write to temp file then rename. */
function writeState(state, statePath, rcodeDir, projectRoot) {
  function isProcessAlive(pid) {
    try { process.kill(pid, 0); return true; } catch { return false; }
  }
  // #8 — stamp schema_version on every write so legacy state files
  // (no field) auto-gain the explicit tag. Never demotes an existing
  // higher version — only fills the missing case. Bumping the version
  // is the migrator's job, not this helper.
  if (typeof state.schema_version !== 'number') state.schema_version = 1;

  // Issue #681: auto-clear the install-time _seeded_stub marker once the
  // state has graduated to a real project (project field set + at least one
  // real phase OR REQUIREMENTS.md present). project-status (#675) reads
  // _seeded_stub; if no writer ever clears it, every project stays "stub"
  // forever and downstream workflows misroute.
  if (state._seeded_stub === true) {
    const phases = Array.isArray(state.phases) ? state.phases : [];
    const firstPhaseName = phases[0]?.name || '';
    const hasRealPhase = phases.length > 1 ||
      (firstPhaseName && firstPhaseName !== 'Setup & Scaffolding');
    const hasRequirements = (() => {
      try {
        return fs.existsSync(path.join(projectRoot, '.planning', 'REQUIREMENTS.md'));
      } catch { return false; }
    })();
    if ((state.project && hasRealPhase) || hasRequirements) {
      delete state._seeded_stub;
    }
  }

  state.updated = new Date().toISOString();
  fs.mkdirSync(rcodeDir, { recursive: true });
  const lockPath = statePath + '.lock';
  let attempts = 0;
  while (fs.existsSync(lockPath) && attempts < 50) {
    // Check if lock holder is alive
    const lockPid = parseInt(fs.readFileSync(lockPath, 'utf8'), 10);
    if (lockPid && !isProcessAlive(lockPid)) {
      console.error(`Stale lock from PID ${lockPid} — removing`);
      try { fs.unlinkSync(lockPath); } catch {}
      break;
    }
    require('child_process').execSync('sleep 0.05'); // 50ms backoff
    attempts++;
  }
  if (attempts >= 50) throw new Error('state.json locked too long');

  try {
    fs.writeFileSync(lockPath, String(process.pid));
    const tmp = statePath + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2) + '\n');
    fs.renameSync(tmp, statePath);
  } finally {
    try { fs.unlinkSync(lockPath); } catch {}
  }
  return { ok: true, state };
}

/** Write state and return compact result (hides full state from output) */
function writeStateCompact(state, meta, statePath, rcodeDir, projectRoot) {
  writeState(state, statePath, rcodeDir, projectRoot);
  return { ok: true, ...meta };
}

function defaultState(projectName, projectRoot) {
  const now = new Date().toISOString();
  return {
    version: '1',
    // #8 / #735 — explicit schema_version field for migration framework.
    // v2: phases[] uniform shape + milestones[] array. migrateState() upgrades
    // older state files transparently on read. New state starts at v2.
    schema_version: 2,
    project: projectName || path.basename(projectRoot),
    created: now,
    updated: now,
    current_phase: null,
    current_plan: 0,
    current_sprint: null,
    phases: [],
    milestones: [],
    velocity_history: [],
    executions: [],
    decisions: [],
    blockers: [],
    council_sessions: [],
    last_session: null,
    workstreams: [],
    active_workstream: null,
  };
}

/** Parse --key value flags from a subArgs array, starting at index. */
function parseFlags(subArgs, startIdx) {
  const flags = {};
  for (let i = startIdx; i < subArgs.length; i++) {
    if (subArgs[i].startsWith('--')) {
      const key = subArgs[i].slice(2);
      flags[key] = subArgs[i + 1] || '';
      i++;
    }
  }
  return flags;
}

/** Cross-project decision log at ~/.rcode/decisions.jsonl. One JSON record per line. */
function globalDecisionsPath() {
  return path.join(os.homedir(), '.rcode', 'decisions.jsonl');
}

function appendGlobalDecision(record) {
  const file = globalDecisionsPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, JSON.stringify(record) + '\n', 'utf8');
}

function readGlobalDecisions() {
  const file = globalDecisionsPath();
  if (!fs.existsSync(file)) return [];
  const raw = fs.readFileSync(file, 'utf8');
  const out = [];
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (!t) continue;
    try { out.push(JSON.parse(t)); } catch (_) { /* skip malformed */ }
  }
  return out;
}

module.exports = {
  PHASE_STATUS_ALIASES,
  PHASE_STATUS_ENUM,
  normalizePhaseStatus,
  migrateState,
  readState,
  writeState,
  writeStateCompact,
  defaultState,
  parseFlags,
  globalDecisionsPath,
  appendGlobalDecision,
  readGlobalDecisions,
};
