'use strict';
/**
 * state-archive.cjs — move bulky sprint/story bodies of finished phases out of
 * .rcode/state.json (#1104, token diet T3b).
 *
 *   state archive-phases [--keep N] [--dry-run]   archive completed phases older than the last N
 *   state restore-phase <N>                       put one archived phase's sprints back
 *
 * Explicit opt-in (never runs implicitly), so `state read` stays byte-compatible
 * for projects that do not use it. An archived phase keeps number/name/status/goal
 * and gains `archived: {path, sprint_count, story_count, at}`; its `sprints` becomes [].
 * Every reader of `phase.sprints` (update-progress, state-sync) treats [] as "nothing
 * to do", and `state restore-phase` is the way back.
 */

const fs = require('fs');
const path = require('path');
const { normalizePhaseKey } = require('./state-digest.cjs');

const ARCHIVE_DIR = 'state-archive';
/** Most recent finished phases left inline: the last ones are still referenced by plan/verify/resume workflows. */
const DEFAULT_KEEP_RECENT_PHASES = 2;
const FINISHED = new Set(['complete', 'completed', 'verified']);

const phaseKey = (p) => normalizePhaseKey(p?.number ?? p?.id);
const countStories = (sprints) => sprints.reduce((n, s) => n + (Array.isArray(s?.stories) ? s.stories.length : 0), 0);

function parseKeep(rest) {
  const i = rest.indexOf('--keep');
  if (i === -1) return DEFAULT_KEEP_RECENT_PHASES;
  const n = Number(rest[i + 1]);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

function archivePhases(rest, deps) {
  const keep = parseKeep(rest);
  if (keep === null) return { ok: false, error: 'Usage: state archive-phases [--keep N] [--dry-run] (N is a non-negative integer)' };
  const dryRun = rest.includes('--dry-run');
  const state = deps.readState();
  const phases = Array.isArray(state?.phases) ? state.phases : [];
  const currentKey = normalizePhaseKey(state?.current_phase);

  const finished = phases.filter((p) => FINISHED.has(p?.status) && !p.archived && phaseKey(p) !== currentKey
    && Array.isArray(p.sprints) && p.sprints.length > 0);
  const candidates = keep === 0 ? finished : finished.slice(0, Math.max(0, finished.length - keep));

  const archived = candidates.map((p) => ({
    number: p.number ?? p.id, sprints: p.sprints.length, stories: countStories(p.sprints),
  }));
  if (dryRun || candidates.length === 0) return { ok: true, dry_run: dryRun, archived, kept_recent: keep };

  const dir = path.join(deps.RCODE_DIR, ARCHIVE_DIR);
  fs.mkdirSync(dir, { recursive: true });
  const at = new Date().toISOString();
  for (const p of candidates) {
    const file = path.join(dir, `phase-${phaseKey(p)}.json`);
    // Archive file first: if the state write below fails nothing is lost.
    fs.writeFileSync(file, JSON.stringify({ number: p.number ?? p.id, name: p.name ?? null, archived_at: at, sprints: p.sprints }, null, 2));
    p.archived = {
      path: path.relative(deps.PROJECT_ROOT, file).split(path.sep).join('/'),
      sprint_count: p.sprints.length, story_count: countStories(p.sprints), at,
    };
    p.sprints = [];
  }
  deps.writeState(state);
  return { ok: true, dry_run: false, archived, kept_recent: keep };
}

function restorePhase(num, deps) {
  if (!num) return { ok: false, error: 'Usage: state restore-phase <N>' };
  const state = deps.readState();
  const phase = (Array.isArray(state?.phases) ? state.phases : []).find((p) => phaseKey(p) === normalizePhaseKey(num));
  if (!phase) return { ok: false, error: `Phase ${num} not found in state` };
  if (!phase.archived) return { ok: false, error: `Phase ${num} is not archived` };
  const file = path.join(deps.PROJECT_ROOT, phase.archived.path);
  if (!fs.existsSync(file)) return { ok: false, error: `Archive file missing: ${phase.archived.path}` };
  phase.sprints = JSON.parse(fs.readFileSync(file, 'utf8')).sprints;
  delete phase.archived;
  deps.writeState(state);
  return { ok: true, restored: phase.number ?? phase.id, sprints: phase.sprints.length };
}

/** @returns {object|undefined} undefined when `sub` is not an archive subcommand */
function dispatch(subArgs, deps) {
  const [sub, ...rest] = subArgs;
  if (sub !== 'archive-phases' && sub !== 'restore-phase') return undefined;
  if (!fs.existsSync(deps.STATE_PATH) || !deps.readState()) return { ok: false, error: 'No state.json to archive.' };
  return sub === 'archive-phases' ? archivePhases(rest, deps) : restorePhase(rest[0], deps);
}

module.exports = { dispatch, DEFAULT_KEEP_RECENT_PHASES };
