/**
 * Pause/resume handoff protocol.
 *
 * Borrowed from GSD's HANDOFF.json + .continue-here.md pattern — a
 * structured file that captures exactly what the user was doing so
 * they can come back later (hours, days, a week) and resume exactly
 * where they left off.
 *
 * Two files:
 *
 *   .rihal/HANDOFF.json
 *     Machine-readable. One per project. Auto-deleted after successful
 *     resume. If present at the start of any workflow command, the
 *     command asks "you have a pending handoff, resume first?"
 *
 *   .rihal/phases/{phase}/sprints/{sprint-id}/.continue-here.md
 *     Human-readable. Same content as HANDOFF.json formatted for eyes.
 *     Does NOT get deleted after resume — kept as a trail of where
 *     you've been.
 *
 * Why a singleton HANDOFF.json at the project root instead of per-sprint:
 *   You can only be paused on one thing at a time. If you try to create
 *   a second handoff while one exists, we warn and require the first to
 *   be resumed or cleared. This forces the user to think about state.
 *
 * Atomic writes via writeJsonAtomic so a Ctrl+C mid-write can't corrupt
 * the file. Reading is always safe (returns null if missing or invalid).
 */

const fs = require('fs');
const path = require('path');
const { writeJsonAtomic, writeFileAtomic } = require('./fsutil.cjs');

const SCHEMA_VERSION = 1;

// ---------- Paths ----------

function handoffPath(cwd) {
  return path.join(cwd, '.rihal', 'HANDOFF.json');
}

function continueHerePath(cwd, phase, sprintId) {
  return path.join(
    cwd,
    '.rihal',
    'phases',
    phase,
    'sprints',
    sprintId,
    '.continue-here.md',
  );
}

// ---------- Schema ----------

/**
 * Default empty handoff. Callers typically override most fields.
 */
function defaultHandoff() {
  return {
    schema_version: SCHEMA_VERSION,
    paused_at: new Date().toISOString(),
    phase: null,
    sprint_id: null,
    story_id: null,
    current_task: null,
    total_tasks: null,
    last_command: null,
    blockers: [],
    uncommitted_files: [],
    next_action: null,
    notes: null,
  };
}

// ---------- Reads ----------

/**
 * Read the current handoff. Returns null if no handoff is pending or
 * the file is invalid. Non-throwing — safe to call from any command's
 * entry check.
 */
function readHandoff(cwd) {
  const p = handoffPath(cwd);
  if (!fs.existsSync(p)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Check whether a handoff is pending. Cheap — one stat call.
 */
function hasHandoff(cwd) {
  return fs.existsSync(handoffPath(cwd));
}

// ---------- Writes ----------

/**
 * Write a new handoff. If one already exists, refuses unless `force`
 * is true. This is deliberate — we don't want two commands silently
 * overwriting each other's handoff data.
 *
 * Returns { written: true, path } on success or
 *         { written: false, reason: 'exists', existing } if blocked.
 */
function writeHandoff(cwd, data, { force = false } = {}) {
  const existing = readHandoff(cwd);
  if (existing && !force) {
    return {
      written: false,
      reason: 'exists',
      existing,
      path: handoffPath(cwd),
    };
  }

  const merged = { ...defaultHandoff(), ...data, schema_version: SCHEMA_VERSION };
  merged.paused_at = merged.paused_at || new Date().toISOString();

  const target = handoffPath(cwd);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  writeJsonAtomic(target, merged);

  // Also write the human-readable .continue-here.md if we have a phase
  // + sprint_id. Gracefully skip if not.
  if (merged.phase && merged.sprint_id) {
    const mdPath = continueHerePath(cwd, merged.phase, merged.sprint_id);
    fs.mkdirSync(path.dirname(mdPath), { recursive: true });
    writeFileAtomic(mdPath, formatContinueMarkdown(merged));
  }

  return { written: true, path: target };
}

/**
 * Delete the handoff file. Called by /rihal:resume after successful
 * resume so a second `readHandoff` returns null. Idempotent — no-op
 * if there's no handoff.
 *
 * Does NOT delete the .continue-here.md files — those are history.
 */
function clearHandoff(cwd) {
  const p = handoffPath(cwd);
  if (!fs.existsSync(p)) return { cleared: false };
  try {
    fs.unlinkSync(p);
    return { cleared: true };
  } catch (err) {
    return { cleared: false, error: err.message };
  }
}

// ---------- Markdown formatting ----------

function formatContinueMarkdown(data) {
  const lines = [
    `---`,
    `schema_version: ${data.schema_version}`,
    `paused_at: ${data.paused_at}`,
    `phase: ${data.phase || '(unknown)'}`,
    `sprint_id: ${data.sprint_id || '(unknown)'}`,
    data.story_id ? `story_id: ${data.story_id}` : null,
    data.current_task && data.total_tasks
      ? `task: ${data.current_task}/${data.total_tasks}`
      : null,
    data.last_command ? `last_command: ${data.last_command}` : null,
    `---`,
    ``,
    `# Continue here`,
    ``,
    `_This file is a human-readable snapshot of where work was paused on_`,
    `_${data.paused_at}. The corresponding machine state is (was) in_`,
    `_.rihal/HANDOFF.json at the project root._`,
    ``,
    `## Context`,
    ``,
    `- **Phase:** ${data.phase || '(unknown)'}`,
    `- **Sprint:** ${data.sprint_id || '(unknown)'}`,
  ];

  if (data.story_id) {
    lines.push(`- **Story:** ${data.story_id}`);
  }
  if (data.current_task && data.total_tasks) {
    lines.push(`- **Task progress:** ${data.current_task}/${data.total_tasks}`);
  }
  if (data.last_command) {
    lines.push(`- **Last command:** \`${data.last_command}\``);
  }

  lines.push('', '## Blockers');
  if (data.blockers && data.blockers.length > 0) {
    for (const b of data.blockers) lines.push(`- ${b}`);
  } else {
    lines.push(`_None recorded._`);
  }

  lines.push('', '## Uncommitted files');
  if (data.uncommitted_files && data.uncommitted_files.length > 0) {
    for (const f of data.uncommitted_files) lines.push(`- \`${f}\``);
  } else {
    lines.push(`_None recorded._`);
  }

  lines.push('', '## Next action');
  lines.push('');
  lines.push(data.next_action || '_Not specified. Re-read this file and sprint state to decide._');

  if (data.notes) {
    lines.push('', '## Notes');
    lines.push('');
    lines.push(data.notes);
  }

  lines.push('');
  return lines.join('\n');
}

// ---------- Summary helpers ----------

/**
 * One-line summary used by commands that detect a pending handoff at
 * entry. Example:
 *
 *   "Pending handoff from 2026-04-11 (sprint-01 / story-1-2-signup, task 3/7)"
 */
function summarizeHandoff(data) {
  if (!data) return '(no handoff)';
  const parts = [];
  if (data.sprint_id) parts.push(data.sprint_id);
  if (data.story_id) parts.push(data.story_id);
  if (data.current_task && data.total_tasks) {
    parts.push(`task ${data.current_task}/${data.total_tasks}`);
  }
  const where = parts.length ? ` (${parts.join(' / ')})` : '';
  const when = data.paused_at ? ` from ${data.paused_at.slice(0, 10)}` : '';
  return `Pending handoff${when}${where}`;
}

module.exports = {
  SCHEMA_VERSION,
  handoffPath,
  continueHerePath,
  defaultHandoff,
  readHandoff,
  hasHandoff,
  writeHandoff,
  clearHandoff,
  formatContinueMarkdown,
  summarizeHandoff,
};
