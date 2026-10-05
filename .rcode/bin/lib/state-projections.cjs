'use strict';
/**
 * state-projections.cjs — token-cheap read projections of .rcode/state.json (#1104).
 *
 * `state read` dumps the whole file (tens of thousands of tokens on a mature
 * project). Workflows almost never need that, so these subcommands return only
 * the slice a caller asks for:
 *
 *   state brief [--phase N] [--full-history]   compact JSON digest (state-digest.cjs)
 *   state get <path> [<path> ...]              JSON of only those dot-paths
 *   state field <path>                         one raw scalar, for $(...) capture
 *   state phase-status [N]                     {number,name,status} for one phase, or all
 *
 * `state read` and bare `state get` stay the full dump (backward compatible).
 */

const fs = require('fs');
const { buildStateDigest, normalizePhaseKey } = require('./state-digest.cjs');
const lifecycle = require('./state-lifecycle.cjs');

/** Marker so main() prints text verbatim instead of pretty-printed JSON (pretty JSON costs ~30% more tokens). */
class RawOutput {
  constructor(text) { this.text = text; }
}

const NO_STATE = {
  ok: false,
  error: 'No state.json yet. Run /rcode-install to set up this project, or `state init --project <name>` directly.',
};

function compact(value) {
  return new RawOutput(JSON.stringify(value));
}

/** Walk a dot-path ("phases.3.status"); returns undefined when any segment is absent. */
function resolvePath(obj, dotPath) {
  let cur = obj;
  for (const seg of String(dotPath).split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[seg];
  }
  return cur;
}

function phaseSummary(p) {
  return { number: p?.number ?? p?.id ?? null, name: p?.name ?? null, status: p?.status ?? null };
}

function takeFlag(args, name) {
  const i = args.indexOf(name);
  if (i === -1) return null;
  const value = args[i + 1];
  args.splice(i, value === undefined || value.startsWith('--') ? 1 : 2);
  return value && !value.startsWith('--') ? value : true;
}

function brief(state, rest) {
  const args = [...rest];
  const phaseFlag = takeFlag(args, '--phase');
  const fullHistory = takeFlag(args, '--full-history') === true;
  let phase = phaseFlag && phaseFlag !== true ? phaseFlag : state.current_phase;
  const phases = Array.isArray(state.phases) ? state.phases : [];
  const known = (k) => phases.some((p) => normalizePhaseKey(p?.number ?? p?.id) === normalizePhaseKey(k));
  if (!phaseFlag && !known(phase)) {
    // current_phase is sometimes a free-text title rather than a number; fall back to the running phase.
    phase = phases.find((p) => p?.status === 'in_progress')?.number ?? phase;
  }
  const digest = buildStateDigest(state, phase);
  if (fullHistory) {
    // Forensics/session-report need run history; still never story bodies.
    digest.executions = Array.isArray(state.executions) ? state.executions : [];
    digest.council_sessions = Array.isArray(state.council_sessions) ? state.council_sessions : [];
  }
  return compact(digest);
}

function get(state, paths) {
  const out = {};
  for (const p of paths) {
    // Bare `phases` returns the status list; full sprint/story bodies live behind explicit paths like `phases.3`.
    out[p] = p === 'phases' && Array.isArray(state.phases)
      ? state.phases.map(phaseSummary)
      : (resolvePath(state, p) ?? null);
  }
  return compact(out);
}

function field(state, dotPath) {
  const v = resolvePath(state, dotPath);
  if (v == null) return new RawOutput('');
  return new RawOutput(typeof v === 'object' ? JSON.stringify(v) : String(v));
}

function phaseStatus(state, num) {
  const phases = Array.isArray(state.phases) ? state.phases : [];
  if (num == null) return compact(phases.map(phaseSummary));
  const key = normalizePhaseKey(num);
  const hit = phases.find((p) => normalizePhaseKey(p?.number ?? p?.id) === key);
  return compact(hit ? phaseSummary(hit) : null);
}

/**
 * @returns {RawOutput|object|undefined} undefined when `sub` is not a projection
 */
function dispatch(subArgs, deps) {
  const [sub, ...rest] = subArgs;
  const isProjection = sub === 'brief' || sub === 'field' || sub === 'phase-status'
    || (sub === 'get' && rest.length > 0);
  if (!isProjection) return undefined;

  let state;
  if (fs.existsSync(deps.STATE_PATH)) {
    state = deps.readState();
  } else {
    // Same first-read behavior as `state read`: auto-init when config.yaml exists.
    const created = lifecycle.dispatch(['read'], deps);
    state = created && created.ok !== false ? created : null;
  }
  // `field` is captured with $(...): an error blob would be read as a value, so say nothing.
  if (!state) return sub === 'field' ? new RawOutput('') : NO_STATE;

  switch (sub) {
    case 'brief': return brief(state, rest);
    case 'get': return get(state, rest);
    case 'field':
      if (!rest[0]) return { ok: false, error: 'Usage: state field <name>' };
      return field(state, rest[0]);
    default: return phaseStatus(state, rest[0]);
  }
}

module.exports = { dispatch, RawOutput, resolvePath };
