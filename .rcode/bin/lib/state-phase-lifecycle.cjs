'use strict';
/**
 * state-phase-lifecycle.cjs — `state <sub>` phase-lifecycle branches,
 * extracted from cmdState() in rcode-tools.cjs (#204 step 3).
 *
 * Covers: set-phase, advance-plan, planned-phase, begin-phase, set-intent,
 * complete-phase, insert-phase.
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
    milestoneCloseNudge,
    PLANNING_DIR,
    PROJECT_ROOT,
    RCODE_DIR,
    STATE_PATH,
  } = deps;
  const statePath = STATE_PATH;
  const sub = subArgs[0];

  if (sub === 'set-phase') {
    const name = subArgs[1];
    // A flag-looking argument is never a phase name. Without this,
    // `state set-phase --phase 99 --status complete` created a phase literally
    // NAMED "--phase", set current_phase to "--phase", and returned ok:true.
    // Silent state corruption reported from a live project.
    if (typeof name === 'string' && name.startsWith('--')) {
      throw new Error(
        `set-phase takes a phase NAME as a positional argument, not flags. ` +
        `Got "${name}". Did you mean:\n` +
        `  state set-phase "Phase name"        (set the current phase pointer)\n` +
        `  phase complete <N>                  (mark a phase complete)\n` +
        `  state planned-phase --phase <N>     (record a phase as planned)`
      );
    }
    const strayFlags = subArgs.slice(2).filter(a => typeof a === 'string' && a.startsWith('--'));
    if (strayFlags.length > 0) {
      throw new Error(
        `set-phase does not accept flags (${strayFlags.join(', ')}). It sets the ` +
        `current-phase pointer only. Use 'phase complete <N>' to change a phase's status.`
      );
    }
    if (!name) throw new Error('set-phase requires a phase name argument');
    const state = readState() || defaultState();
    // Fix #854 — mark the previously active phase as completed before switching.
    if (state.current_phase && state.current_phase !== name && state.phases && state.phases.length > 0) {
      const prevIdx = state.phases.findIndex(p =>
        p.name === state.current_phase ||
        String(p.number) === String(state.current_phase) ||
        String(p.id) === String(state.current_phase)
      );
      if (prevIdx !== -1 && state.phases[prevIdx].status !== 'completed') {
        state.phases[prevIdx].status = 'completed';
        state.phases[prevIdx].completed = new Date().toISOString();
      }
    }
    state.current_phase = name;
    state.current_plan = 0;
    if (!state.phases) state.phases = [];
    const leadingNum = String(name).match(/^(\d+)/);
    const number = leadingNum
      ? parseInt(leadingNum[1], 10)
      : (state.phases.length + 1);
    // Match by number OR name to avoid duplicate phantom entries (#853)
    const existingIdx = state.phases.findIndex(p =>
      p.name === name ||
      String(p.number) === String(number) ||
      String(p.id) === String(number)
    );
    if (existingIdx === -1) {
      state.phases.push({
        number,
        id: String(number),
        name,
        started: new Date().toISOString(),
        completed: null,
        plan_count: 0,
      });
    } else {
      // Update name to canonical form when re-entering a phase
      state.phases[existingIdx].name = name;
    }
    // #894 — Proactively sync state.milestone from ROADMAP when set-phase is called.
    // If ROADMAP.md is readable, find its last active milestone heading and update
    // state.milestone if it differs (state can go stale after milestone transitions).
    try {
      const roadmapPathSP = path.join(PLANNING_DIR, 'ROADMAP.md');
      if (fs.existsSync(roadmapPathSP)) {
        const rmText = fs.readFileSync(roadmapPathSP, 'utf8');
        const mhRe = /^#{1,2}\s+(M\d+[^\n]*)/gm;
        let lastLabel = null, mhM;
        while ((mhM = mhRe.exec(rmText)) !== null) {
          if (/^milestones?\s*$/i.test(mhM[1].trim())) continue;
          lastLabel = mhM[1].trim();
        }
        if (lastLabel && lastLabel !== (state.milestone || '')) {
          state.milestone = lastLabel;
        }
      }
    } catch (_) { /* ROADMAP unreadable; leave milestone as-is */ }

    const spResult = writeState(state);
    // Fix #855 — keep config.yaml in sync when set-phase writes state.json.
    // One-way guard: only sync if config.yaml is already present (i.e. project is initialised).
    try {
      const cfgLib = require(path.join(__dirname, 'config.cjs'));
      const existingCfgPhase = cfgLib.cmdGet(PROJECT_ROOT, 'current_phase');
      if (String(existingCfgPhase || '') !== String(name)) {
        cfgLib.cmdSet(PROJECT_ROOT, 'current_phase', name);
      }
    } catch (_) { /* config.yaml may not exist yet; silently skip */ }
    return spResult;
  }

  // --- advance-plan ---
  if (sub === 'advance-plan') {
    const state = readState() || defaultState();
    if (typeof state.current_plan !== 'number') state.current_plan = 0;
    state.current_plan += 1;
    // Update plan_count on current phase if tracked
    if (state.phases && state.phases.length > 0) {
      const current = state.phases[state.phases.length - 1];
      current.plan_count = state.current_plan;
    }
    return writeState(state);
  }

  // --- snapshot --- (#807)
  // Write current state.json contents to .planning/STATE.md and return state as JSON.
  if (sub === 'insert-phase') {
    const flags = parseFlags(1);
    const phaseNumber = flags.number || '';
    const phaseName = flags.name || '';

    // Validate N.M format
    const phaseRegex = /^\d+\.\d+$/;
    if (!phaseRegex.test(phaseNumber)) {
      throw new Error(`Invalid phase number format: ${phaseNumber}. Expected N.M (e.g., 2.1, 3.2)`);
    }

    if (!phaseName) {
      throw new Error('insert-phase requires --name <phase-name>');
    }

    // Generate slug from name: lowercase, hyphenate spaces/underscores
    const slug = phaseName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (!slug) {
      throw new Error('Phase name must contain at least one alphanumeric character');
    }

    const state = readState() || defaultState();
    if (!state.phases) state.phases = [];

    // Check if phase already exists
    if (state.phases.some(p => p.number === phaseNumber)) {
      throw new Error(`Phase ${phaseNumber} already exists`);
    }

    // Helper to convert phase number to comparable tuple
    function phaseTuple(s) {
      const [maj, min] = s.split('.').map(x => parseInt(x, 10));
      return [maj, min || 0];
    }

    // Helper to compare phase tuples
    function cmpPhase(a, b) {
      const [a1, a2] = phaseTuple(a);
      const [b1, b2] = phaseTuple(b);
      return a1 - b1 || a2 - b2;
    }

    // Insert phase in sorted order
    const newPhase = {
      number: phaseNumber,
      name: phaseName,
      slug: slug,
      created: new Date().toISOString(),
      started: null,
      completed: null,
    };

    const insertIdx = state.phases.findIndex(p => {
      return cmpPhase(p.number, phaseNumber) > 0;
    });

    if (insertIdx === -1) {
      state.phases.push(newPhase);
    } else {
      state.phases.splice(insertIdx, 0, newPhase);
    }

    writeState(state);
    // #942 — surface the milestone close nudge for inserted phases too.
    const insHealth = milestoneCloseNudge();
    return {
      ok: true,
      phase_number: phaseNumber,
      name: phaseName,
      slug: slug,
      directory: path.join(PLANNING_DIR, 'phases', `${phaseNumber}-${slug}`),
      milestone_health: insHealth.milestone_health,
      ...(insHealth.nudge ? { nudge: insHealth.nudge } : {}),
    };
  }

  // --- workstream-validate ---
  if (sub === 'planned-phase') {
    const flags = parseFlags(1);
    if (!flags.phase) throw new Error('planned-phase requires --phase <N>');
    const state = readState() || defaultState();
    if (!state.phases) state.phases = [];
    const phaseKey = String(flags.phase);
    let entry = state.phases.find((p) => String(p.number || p.id || p.name) === phaseKey);
    const previousStatus = entry ? (entry.status || null) : null;
    if (!entry) {
      entry = { number: phaseKey, name: flags.name || phaseKey, plans: Number(flags.plans || 0) };
      state.phases.push(entry);
    }
    entry.status = 'planned';
    entry.name = flags.name || entry.name;
    if (flags.plans !== undefined) entry.plans = Number(flags.plans);
    entry.planned_at = new Date().toISOString();
    writeState(state);
    return { updated: true, phase: phaseKey, status: 'planned', previous_status: previousStatus, name: entry.name, plans: entry.plans };
  }

  if (sub === 'begin-phase') {
    const flags = parseFlags(1);
    if (!flags.phase) throw new Error('begin-phase requires --phase <N>');
    const state = readState() || defaultState();
    if (!state.phases) state.phases = [];
    const phaseKey = String(flags.phase);
    let entry = state.phases.find((p) => String(p.number || p.id || p.name) === phaseKey);
    const previousStatus = entry ? (entry.status || null) : null;
    if (!entry) {
      entry = { number: phaseKey, name: flags.name || phaseKey, plans: Number(flags.plans || 0) };
      state.phases.push(entry);
    }
    // Transition guard: reject complete → executing unless --force
    if (previousStatus === 'complete' && !flags.force) {
      throw new Error(`Phase ${phaseKey} is already complete. Use --force to re-execute.`);
    }
    entry.status = 'executing';
    if (flags.name) entry.name = flags.name;
    if (flags.plans !== undefined) entry.plans = Number(flags.plans);
    entry.started = entry.started || new Date().toISOString();
    state.current_phase = entry.name;
    writeState(state);
    return { updated: true, phase: phaseKey, status: 'executing', previous_status: previousStatus };
  }

  // DEPRECATED (#gap: state-sync audit): no workflow calls this — every
  // completion path uses the top-level `phase complete <N>` subcommand
  // instead. Its stale-executing-phase hygiene warning was ported there.
  // Kept only for backward compatibility with anyone scripting against it
  // directly; do not wire new callers to this — use `phase complete`.
  // Records what the user actually authorized this session — 'plan', 'build',
  // 'research', 'audit'. `resume-work` reads it so "resume" restores POSITION
  // AND SCOPE, not position alone. Without it, a resume after a planning
  // session reads as "keep going" and starts building work nobody asked for.
  if (sub === 'set-intent') {
    const flags = parseFlags(1);
    const intent = flags.intent || subArgs[1];
    const ALLOWED = ['plan', 'build', 'research', 'audit', 'review'];
    if (!intent) throw new Error(`set-intent requires an intent (${ALLOWED.join('|')})`);
    if (!ALLOWED.includes(intent)) {
      throw new Error(`unknown intent "${intent}" — expected one of: ${ALLOWED.join(', ')}`);
    }
    const state = readState() || defaultState();
    const previous = state.last_intent ? state.last_intent.intent : null;
    state.last_intent = {
      intent,
      recorded_at: new Date().toISOString(),
      source: flags.source || 'workflow',
    };
    writeState(state);
    return { ok: true, intent, previous };
  }

  if (sub === 'complete-phase') {
    const flags = parseFlags(1);
    if (!flags.phase) throw new Error('complete-phase requires --phase <N>');
    const state = readState() || defaultState();
    if (!state.phases) state.phases = [];
    const phaseKey = String(flags.phase);
    const entry = state.phases.find((p) => String(p.number || p.id || p.name) === phaseKey);
    if (!entry) throw new Error(`Phase ${phaseKey} not found in state`);
    const previousStatus = entry.status || null;
    // Transition guard: warn if completing from planned (skipped executing)
    if (previousStatus === 'planned') {
      process.stderr.write(`Warning: completing phase ${phaseKey} from 'planned' without executing.\n`);
    }

    // State-hygiene gate (#955): if an earlier-numbered phase is still stuck
    // 'executing' while this later phase gets marked complete, that's exactly
    // the drift that misorients resolveActivePhase() / the SessionStart greeter.
    // Warn rather than block — completing out of order is sometimes correct
    // (parallel workstreams), but it must never happen silently.
    const thisNum = parseFloat(phaseKey);
    const stalePhases = Number.isNaN(thisNum) ? [] : state.phases.filter((p) => {
      if (!p || p.status !== 'executing') return false;
      const n = parseFloat(p.number ?? p.id);
      return !Number.isNaN(n) && n < thisNum;
    });
    if (stalePhases.length > 0 && !flags.force) {
      const staleList = stalePhases.map((p) => p.number ?? p.id).join(', ');
      process.stderr.write(
        `Warning: phase ${phaseKey} marked complete while earlier phase(s) ${staleList} are still 'executing'. ` +
        `Use --force to suppress this warning, or close out the stale phase(s) first.\n`
      );
    }

    entry.status = 'complete';
    entry.completed = new Date().toISOString();
    writeState(state);
    return {
      updated: true,
      phase: phaseKey,
      status: 'complete',
      previous_status: previousStatus,
      stale_executing_phases: stalePhases.map((p) => p.number ?? p.id),
    };
  }

  return undefined;
}

module.exports = { dispatch };
