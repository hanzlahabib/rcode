'use strict';
/**
 * state-schema.cjs — `state <sub>` schema-migration branches, extracted
 * from cmdState() in rcode-tools.cjs (#204 step 3).
 *
 * Covers: schema-status, migrate-schema.
 *
 * Deps are injected via the `deps` object (same pattern as lib/phase.cjs).
 */

const fs = require('fs');
const path = require('path');

function dispatch(subArgs, deps) {
  const {
    readState,
    writeState,
    writeStateCompact,
    defaultState,
    migrateState,
    parseFlags,
    PLANNING_DIR,
    PROJECT_ROOT,
    RCODE_DIR,
    STATE_PATH,
  } = deps;
  const statePath = STATE_PATH;
  const sub = subArgs[0];

  if (sub === 'schema-status') {
    const CURRENT_SCHEMA_VERSION = 1;
    if (!fs.existsSync(statePath)) {
      return { ok: false, error: 'state.json not found' };
    }
    let state;
    try { state = JSON.parse(fs.readFileSync(statePath, 'utf8')); }
    catch (e) { return { ok: false, error: `Invalid JSON: ${e.message}` }; }
    const recorded = state.schema_version;
    // Treat missing schema_version as v1 (legacy state files). Never crash.
    const effective = typeof recorded === 'number' ? recorded : 1;
    return {
      ok: true,
      file: path.relative(PROJECT_ROOT, statePath),
      schema_version: effective,
      current_version: CURRENT_SCHEMA_VERSION,
      drift: effective !== CURRENT_SCHEMA_VERSION,
      explicit: typeof recorded === 'number',
      message: typeof recorded === 'number'
        ? (effective === CURRENT_SCHEMA_VERSION
            ? 'Up to date.'
            : `state.json is at v${effective}, current is v${CURRENT_SCHEMA_VERSION}. Run: rcode-tools state migrate-schema`)
        : 'state.json has no schema_version field — treated as v1. Next write will stamp the explicit field.',
    };
  }

  // =====================================================================
  // state migrate-schema: normalise phases array to current schema
  // Handles 3 known schema variants in the wild:
  //   Schema A (v1 old) — phases[N] has {id, goal, ...} but no status
  //   Schema B (v1 mid) — phases[N] has {number, name, status?, ...}
  //   Schema C (v2)     — phases[N] has {number, name, status, planned_at?, ...}
  // After migration every entry has: number, name, status (defaulting to 'complete'
  // for entries that have a SUMMARY.md path or missing status).
  // =====================================================================
  if (sub === 'migrate-schema') {
    // Closes #735. Full normalizer: phases array + all top-level array fields.
    const state = readState();
    if (!state) return { ok: false, error: 'state.json not found or empty' };
    if (!Array.isArray(state.phases)) {
      state.phases = [];
    }

    let changed = 0;

    // 1. Normalize phases entries
    state.phases = state.phases.map((p) => {
      const updated = Object.assign({}, p);

      // Normalise identifier: prefer number, fall back to id or name
      if (!updated.number && (updated.id || updated.name)) {
        updated.number = String(updated.id || updated.name);
        changed++;
      }

      // Normalise name
      if (!updated.name && updated.goal) {
        updated.name = String(updated.goal).slice(0, 60);
        changed++;
      }

      // Normalise status: missing → infer from completion markers
      if (!updated.status) {
        if (updated.completed || updated.summary_path) {
          updated.status = 'complete';
        } else if (updated.started) {
          updated.status = 'executing';
        } else {
          updated.status = 'planned';
        }
        changed++;
      }

      return updated;
    });

    // 2. Ensure all required top-level arrays are present (never crash on legacy state).
    const requiredArrays = [
      'velocity_history', 'executions', 'decisions',
      'blockers', 'council_sessions', 'workstreams',
    ];
    for (const key of requiredArrays) {
      if (!Array.isArray(state[key])) {
        state[key] = [];
        changed++;
      }
    }

    // 3. Ensure required scalar fields
    if (!state.project) { state.project = path.basename(PROJECT_ROOT); changed++; }
    if (!state.created) { state.created = state.updated || new Date().toISOString(); changed++; }
    if (state.current_phase === undefined) { state.current_phase = null; changed++; }
    if (state.current_plan  === undefined) { state.current_plan  = 0;    changed++; }
    if (state.current_sprint === undefined) { state.current_sprint = null; changed++; }
    if (state.last_session   === undefined) { state.last_session  = null; changed++; }
    if (state.active_workstream === undefined) { state.active_workstream = null; changed++; }

    // 4. Bump schema_version if still at implicit v1 and we made structural changes
    if (typeof state.schema_version !== 'number') {
      state.schema_version = 1;
      changed++;
    }

    if (changed > 0) {
      writeState(state);
    }
    return {
      ok: true, changed,
      schema_version: state.schema_version,
      phase_count: state.phases.length,
      message: `Schema migration complete — ${changed} field(s) normalised (${state.phases.length} phases)`,
    };
  }

  return undefined;
}

module.exports = { dispatch };
