/**
 * State digest — slim, subagent-facing extract of .rcode/state.json (#948).
 *
 * Every hop in a multi-agent workflow (rcode-phase-researcher, rcode-planner)
 * is currently told to Read the raw state.json via `{state_path}` in its
 * <files_to_read> block (see plan-spawn-planner.md, research-phase.md,
 * plan-research-validation.md). In a mature project that file accumulates the
 * full phases[]/sprints[]/stories[] history for every phase ever run — in
 * this repo, 20 of 26 phases are already complete and carry their full sprint
 * breakdowns, none of which a researcher/planner working on the CURRENT phase
 * consumes (verified against the actual prompt templates, not guessed).
 *
 * buildStateDigest() keeps exactly what those prompts read state.json for:
 *   - current_phase / current_plan / active_workstream (orientation)
 *   - the ACTIVE phase's own entry in full (its sprints/stories — legitimate
 *     "what happened so far in this phase" signal for a continuation plan)
 *   - every other phase collapsed to {number, name, status} (existence +
 *     status only, no nested sprint/story bodies)
 *   - the most recent decisions (bounded — "Project decisions and history"
 *     per research-phase.md, not the full ADR log)
 *   - open (unresolved) blockers only
 *
 * Deliberately excluded: velocity_history, executions[], council_sessions[],
 * chains[], the completed-phase sprint/story bodies, and resolved blockers —
 * none of these are read by any workflow/agent prompt that consumes the
 * digest (verified via grep across rcode/workflows and rcode/agents).
 */

const RECENT_DECISIONS_LIMIT = 10;

/** Normalize a phase number/id for comparison, stripping legacy leading zeros. */
function normalizePhaseKey(v) {
  const s = String(v ?? '').trim();
  return s.replace(/^0+(?=\d)/, '');
}

/**
 * @param {object|null} state - parsed state.json (post-migration)
 * @param {string|number|null} phaseNumber - the phase currently being worked on
 * @returns {object|null} slim digest, or null when state is absent
 */
function buildStateDigest(state, phaseNumber) {
  if (!state) return null;

  const phases = Array.isArray(state.phases) ? state.phases : [];
  const decisions = Array.isArray(state.decisions) ? state.decisions : [];
  const blockers = Array.isArray(state.blockers) ? state.blockers : [];

  const targetKey = phaseNumber != null ? normalizePhaseKey(phaseNumber) : null;
  const activePhase = targetKey
    ? phases.find((p) => normalizePhaseKey(p?.number ?? p?.id) === targetKey)
    : null;

  return {
    project: state.project ?? null,
    current_phase: state.current_phase ?? null,
    current_plan: state.current_plan ?? null,
    active_workstream: state.active_workstream ?? null,
    last_session: state.last_session ?? null,
    phase: activePhase ? {
      number: activePhase.number ?? null,
      name: activePhase.name ?? null,
      status: activePhase.status ?? null,
      started: activePhase.started ?? null,
      completed: activePhase.completed ?? null,
      goal: activePhase.goal ?? null,
      sprints: Array.isArray(activePhase.sprints) ? activePhase.sprints : [],
    } : null,
    phase_history: phases.map((p) => ({
      number: p?.number ?? p?.id ?? null,
      name: p?.name ?? null,
      status: p?.status ?? null,
    })),
    recent_decisions: decisions.slice(-RECENT_DECISIONS_LIMIT).map((d) => ({
      summary: d?.summary ?? d?.description ?? null,
      phase: d?.phase ?? null,
      date: d?.date ?? null,
    })),
    open_blockers: blockers
      .filter((b) => b && !b.resolved)
      .map((b) => ({
        description: b?.description ?? null,
        date: b?.date ?? null,
      })),
  };
}

module.exports = { buildStateDigest, normalizePhaseKey, RECENT_DECISIONS_LIMIT };
