'use strict';
/**
 * state-reader.cjs — shared state-reading helpers for rcode-hooks.cjs subcommands.
 * Extracted from preCompact to keep rcode-hooks.cjs under 1000 lines. (#947)
 * Pure Node stdlib. No external dependencies.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Legacy status spellings that mean "complete" (#955). resolveActivePhase()
// may see raw, unmigrated state.json (callers here read the file directly
// rather than through rcode-tools.cjs's migrateState()), so it normalizes
// inline instead of assuming its input already went through migration.
const COMPLETE_PHASE_STATUSES = new Set(['complete', 'completed', 'executed', 'verified']);

/**
 * Resolve the active phase entry and a human-readable label from state.json.
 * Returns { activePhase, phaseLabel } — both may be null if state is absent.
 *
 * Preference order (#955): an explicit current_phase match is the authoritative
 * pointer and wins first. Falling back to "first/last phase with status
 * 'executing'" is what caused the bug — a stale executing entry earlier in the
 * roadmap (e.g. phase 37) shadowed real current work (phase 43, already
 * complete) whenever current_phase didn't match by exact string. Instead, the
 * fallback is the highest-numbered phase that isn't complete.
 */
function resolveActivePhase(state) {
  const phases = Array.isArray(state?.phases) ? state.phases : [];

  const matched = phases.find(
    (p) => p && (p.name === state?.current_phase || p.number === state?.current_phase)
  );

  let activePhase = matched || null;
  if (!activePhase) {
    const nonComplete = phases.filter((p) => p && !COMPLETE_PHASE_STATUSES.has(p.status));
    activePhase = nonComplete.reduce((highest, p) => {
      const n = parseFloat(p.number ?? p.id);
      if (Number.isNaN(n)) return highest;
      const highestN = highest ? parseFloat(highest.number ?? highest.id) : -Infinity;
      return n > highestN ? p : highest;
    }, null);
  }

  const phaseLabel = activePhase
    ? (activePhase.number || activePhase.name || state?.current_phase)
    : (state?.current_phase || null);
  return { activePhase, phaseLabel };
}

/**
 * Read the most recent SPRINT.md under .planning/phases/<phaseLabel>-* and return
 * sprint progress counts + up to 10 incomplete task strings.
 * Returns { completedCount: { done, total }, incompleteTasks: string[] }.
 */
function readSprintProgress(phaseLabel, cwd) {
  const completedCount = { done: 0, total: 0 };
  const incompleteTasks = [];
  const planningBase = path.join(cwd, '.planning', 'phases');
  if (!phaseLabel || !fs.existsSync(planningBase)) {
    return { completedCount, incompleteTasks };
  }
  try {
    const phaseDirs = fs.readdirSync(planningBase)
      .filter(d => d.startsWith(String(phaseLabel)));
    for (const pd of phaseDirs) {
      const pdPath = path.join(planningBase, pd);
      if (!fs.statSync(pdPath).isDirectory()) continue;
      const sprintFiles = fs.readdirSync(pdPath)
        .filter(f => f.endsWith('-SPRINT.md'))
        .sort()
        .reverse();
      if (sprintFiles.length === 0) continue;
      const sprintText = fs.readFileSync(path.join(pdPath, sprintFiles[0]), 'utf8');
      for (const line of sprintText.split('\n')) {
        const done = /^\s*-\s*\[x\]/i.test(line);
        const pending = /^\s*-\s*\[ \]/.test(line);
        if (done || pending) completedCount.total++;
        if (done) completedCount.done++;
        if (pending) {
          const task = line.replace(/^\s*-\s*\[ \]\s*/, '').trim();
          if (task) incompleteTasks.push(task);
        }
      }
      break; // use first matching phase dir only
    }
  } catch { /* ignore — readSprintProgress is advisory */ }
  return { completedCount, incompleteTasks: incompleteTasks.slice(0, 10) };
}

/**
 * Read the 5 most recent git commit subjects. Returns string[].
 * Returns [] when git is unavailable or outside a repository.
 */
function readRecentCommits(cwd) {
  try {
    const log = execSync('git log --oneline -5 --no-decorate 2>/dev/null', {
      cwd, encoding: 'utf8', timeout: 3000,
    }).trim();
    return log ? log.split('\n').filter(Boolean) : [];
  } catch { return []; }
}

/**
 * Read the milestone hint from state.json or .planning/ROADMAP.md.
 * Returns a string or null.
 *
 * L1 (#952 review): the per-file readFileSync is wrapped in a silent catch by
 * design — a milestone hint is advisory, so an unreadable ROADMAP (permissions,
 * race) must degrade to "no hint", never propagate and break an advisory hook.
 * This is an intentional resilience improvement over the original inline code.
 */
function readMilestoneHint(state, cwd) {
  if (state?.milestone) return state.milestone;
  for (const rp of ['.planning/ROADMAP.md', '.planning/milestones/ROADMAP.md']) {
    const full = path.join(cwd, rp);
    if (!fs.existsSync(full)) continue;
    try {
      const m = fs.readFileSync(full, 'utf8').match(/^##\s+Milestone\s+(M\d+[^\n]*)/m);
      if (m) return m[1].trim();
    } catch { /* ignore */ }
  }
  return null;
}

module.exports = { resolveActivePhase, readSprintProgress, readRecentCommits, readMilestoneHint };
