/**
 * Milestone library — top-level organizing concept for rihal-code.
 *
 * A milestone groups multiple phases (and their sprints and stories)
 * into a shippable unit. Examples: v0.2.0, v0.3.0, "Q1 auth overhaul".
 *
 * Design principles:
 *
 *   1. Milestone state.json holds ONLY metadata (id, name, goal, status,
 *      target_date, github mapping). It does NOT store arrays of linked
 *      phases / sprints / stories. Ever.
 *
 *   2. Linkage lives in YAML frontmatter on the existing phase / sprint /
 *      story files. A phase declares `milestone: m-0.2.0` at the top of
 *      its brief.md; sprints and stories inherit unless they override.
 *
 *   3. "Which items belong to milestone X?" is answered by SCANNING, not
 *      by reading a centralized list. No arrays means no drift.
 *
 *   4. Projects without any milestones keep working. Every query returns
 *      null and callers fall back to today's behavior.
 *
 * Layout:
 *
 *   .rihal/
 *   ├── MILESTONES.md               (append-only history, newest first)
 *   └── milestones/
 *       ├── active-milestone        (plain text, contents = milestone id)
 *       ├── m-0.2.0/
 *       │   └── state.json
 *       └── m-0.3.0/
 *           └── state.json
 *
 * All writes atomic via writeJsonAtomic / writeFileAtomic. Zero deps.
 */

const fs = require('fs');
const path = require('path');
const { writeJsonAtomic, writeFileAtomic } = require('./fsutil.cjs');

// ---------- Constants ----------

const MILESTONE_STATUS_VALUES = new Set([
  'planned',
  'in_progress',
  'completed',
  'abandoned',
]);

// Valid milestone id format: m-{semver-ish} or m-{slug}. Keeps filenames
// filesystem-safe and sortable. Examples: m-0.2.0, m-0.2.1, m-auth-q1.
const VALID_ID_PATTERN = /^m-[a-z0-9][a-z0-9._-]*$/;

// ---------- Paths ----------

function milestonesRoot(cwd) {
  return path.join(cwd, '.rihal', 'milestones');
}

function milestoneDir(cwd, id) {
  return path.join(milestonesRoot(cwd), id);
}

function milestoneStatePath(cwd, id) {
  return path.join(milestoneDir(cwd, id), 'state.json');
}

function activeMarkerPath(cwd) {
  return path.join(milestonesRoot(cwd), 'active-milestone');
}

function historyPath(cwd) {
  return path.join(cwd, '.rihal', 'MILESTONES.md');
}

// ---------- Frontmatter (tiny inline parser, no YAML dep) ----------

/**
 * Read the `milestone:` field from a file's YAML frontmatter block.
 * Returns the value (string) or null if missing/unparseable.
 */
function readMilestoneField(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    // Read first 4KB — enough for any reasonable frontmatter block
    const fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(4096);
    const bytes = fs.readSync(fd, buf, 0, 4096, 0);
    fs.closeSync(fd);
    const chunk = buf.toString('utf8', 0, bytes);
    const match = chunk.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) return null;
    const fmLine = match[1]
      .split(/\r?\n/)
      .find((l) => /^milestone\s*:/.test(l));
    if (!fmLine) return null;
    const value = fmLine.split(':').slice(1).join(':').trim().replace(/^["']|["']$/g, '');
    return value || null;
  } catch {
    return null;
  }
}

/**
 * Write or upsert a `milestone:` field in a file's frontmatter.
 * - If the file has a frontmatter block, replace or insert the field
 * - If no frontmatter, prepend a minimal block at the top
 * - Passing value=null removes the field entirely
 * Returns true if the file was modified.
 */
function writeMilestoneField(filePath, value) {
  if (!fs.existsSync(filePath)) return false;
  const content = fs.readFileSync(filePath, 'utf8');
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---(\r?\n)?/);

  if (match) {
    const fm = match[1];
    const rest = content.slice(match[0].length);
    const lines = fm.split(/\r?\n/);
    const idx = lines.findIndex((l) => /^milestone\s*:/.test(l));

    let newLines;
    if (value === null) {
      if (idx < 0) return false; // already absent
      newLines = lines.filter((_, i) => i !== idx);
    } else if (idx >= 0) {
      newLines = lines.map((l, i) => (i === idx ? `milestone: ${value}` : l));
    } else {
      newLines = [...lines, `milestone: ${value}`];
    }

    const newFm = newLines.join('\n');
    if (newFm === fm) return false;
    const newContent = `---\n${newFm}\n---\n${rest}`;
    writeFileAtomic(filePath, newContent);
    return true;
  }

  // No frontmatter — prepend a new block (skip if value is null)
  if (value === null) return false;
  const newContent = `---\nmilestone: ${value}\n---\n\n${content}`;
  writeFileAtomic(filePath, newContent);
  return true;
}

// ---------- Core I/O ----------

function defaultMilestoneState({ id, name, goal = '', target_date = null }) {
  return {
    id,
    name: name || id,
    goal,
    status: 'planned',
    target_date,
    created_at: new Date().toISOString(),
    last_activity: new Date().toISOString(),
    github: { number: null, url: null },
  };
}

function readMilestone(cwd, id) {
  const p = milestoneStatePath(cwd, id);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function writeMilestone(cwd, id, state) {
  fs.mkdirSync(milestoneDir(cwd, id), { recursive: true });
  const merged = {
    ...state,
    id,
    last_activity: new Date().toISOString(),
  };
  writeJsonAtomic(milestoneStatePath(cwd, id), merged);
  return merged;
}

/**
 * Create a milestone if it doesn't exist, or return existing state.
 * Idempotent — re-running with the same args is a no-op unless
 * { force: true } is passed.
 */
function initMilestone(cwd, id, args = {}, { force = false } = {}) {
  if (!VALID_ID_PATTERN.test(id)) {
    throw new Error(
      `Invalid milestone id '${id}'. Must match ${VALID_ID_PATTERN} ` +
      `(e.g. m-0.2.0, m-0.2.1, m-auth-q1).`,
    );
  }
  const existing = readMilestone(cwd, id);
  if (existing && !force) return existing;
  const state = defaultMilestoneState({ id, ...args });
  return writeMilestone(cwd, id, state);
}

// ---------- Active milestone marker ----------

function getActiveMilestone(cwd) {
  const p = activeMarkerPath(cwd);
  if (!fs.existsSync(p)) return null;
  try {
    return fs.readFileSync(p, 'utf8').trim() || null;
  } catch {
    return null;
  }
}

function setActiveMilestone(cwd, id) {
  const existing = readMilestone(cwd, id);
  if (!existing) {
    throw new Error(
      `Cannot activate milestone '${id}': state.json not found. ` +
      `Call initMilestone() first.`,
    );
  }
  fs.mkdirSync(milestonesRoot(cwd), { recursive: true });
  fs.writeFileSync(activeMarkerPath(cwd), `${id}\n`);
  return id;
}

function clearActiveMilestone(cwd) {
  const p = activeMarkerPath(cwd);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

// ---------- Listing ----------

function listMilestones(cwd) {
  const root = milestonesRoot(cwd);
  if (!fs.existsSync(root)) return [];
  const active = getActiveMilestone(cwd);

  const ids = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((n) => n.startsWith('m-'))
    .sort();

  const result = [];
  for (const id of ids) {
    const state = readMilestone(cwd, id);
    if (!state) continue;
    const linked = countLinkedItems(cwd, id);
    result.push({
      id,
      name: state.name,
      goal: state.goal,
      status: state.status,
      target_date: state.target_date,
      last_activity: state.last_activity,
      active: id === active,
      ...linked,
    });
  }
  return result;
}

// ---------- Resolution (walk: story → sprint → phase → active) ----------

/**
 * What milestone does phase X belong to?
 * Reads `milestone:` from .rihal/phases/{phase}/brief.md frontmatter.
 * Falls back to the active milestone marker.
 */
function resolveMilestoneForPhase(cwd, phase) {
  const briefPath = path.join(cwd, '.rihal/phases', phase, 'brief.md');
  const explicit = readMilestoneField(briefPath);
  if (explicit) return explicit;
  return getActiveMilestone(cwd);
}

/**
 * What milestone does sprint X belong to?
 * Walk: sprint plan.md → phase brief → active marker.
 */
function resolveMilestoneForSprint(cwd, phase, sprintId) {
  const planPath = path.join(
    cwd,
    '.rihal/phases',
    phase,
    'sprints',
    sprintId,
    'plan.md',
  );
  const explicit = readMilestoneField(planPath);
  if (explicit) return explicit;
  return resolveMilestoneForPhase(cwd, phase);
}

/**
 * What milestone does story X belong to?
 * Walk: story file → sprint plan → phase brief → active marker.
 */
function resolveMilestoneForStory(cwd, phase, sprintId, storyId) {
  // Check both legacy phase-level stories and per-sprint stories
  const candidates = [
    path.join(cwd, '.rihal/phases', phase, 'sprints', sprintId, 'stories', `${storyId}.md`),
    path.join(cwd, '.rihal/phases', phase, 'stories', `${storyId}.md`),
  ];
  for (const p of candidates) {
    const explicit = readMilestoneField(p);
    if (explicit) return explicit;
  }
  return resolveMilestoneForSprint(cwd, phase, sprintId);
}

// ---------- Computed linkage (scan-based) ----------

/**
 * Return phase ids belonging to a milestone. Computes by reading
 * every phase brief.md frontmatter.
 */
function linkedPhases(cwd, milestoneId) {
  const phasesDir = path.join(cwd, '.rihal/phases');
  if (!fs.existsSync(phasesDir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(phasesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const resolved = resolveMilestoneForPhase(cwd, entry.name);
    if (resolved === milestoneId) out.push(entry.name);
  }
  return out.sort();
}

/**
 * Return sprint refs belonging to a milestone.
 * Each element: { phase, sprint_id }.
 */
function linkedSprints(cwd, milestoneId) {
  const out = [];
  const phasesDir = path.join(cwd, '.rihal/phases');
  if (!fs.existsSync(phasesDir)) return out;
  for (const phaseEntry of fs.readdirSync(phasesDir, { withFileTypes: true })) {
    if (!phaseEntry.isDirectory()) continue;
    const sprintsDir = path.join(phasesDir, phaseEntry.name, 'sprints');
    if (!fs.existsSync(sprintsDir)) continue;
    for (const sprintEntry of fs.readdirSync(sprintsDir, { withFileTypes: true })) {
      if (!sprintEntry.isDirectory() || !sprintEntry.name.startsWith('sprint-')) continue;
      const resolved = resolveMilestoneForSprint(cwd, phaseEntry.name, sprintEntry.name);
      if (resolved === milestoneId) {
        out.push({ phase: phaseEntry.name, sprint_id: sprintEntry.name });
      }
    }
  }
  return out;
}

/**
 * Return story refs belonging to a milestone.
 * Each element: { phase, sprint_id, story_id, status }.
 * Reads sprint state.json for story status; frontmatter only for resolution.
 */
function linkedStories(cwd, milestoneId) {
  const out = [];
  const sprints = linkedSprints(cwd, milestoneId);
  for (const { phase, sprint_id } of sprints) {
    const stateFile = path.join(
      cwd,
      '.rihal/phases',
      phase,
      'sprints',
      sprint_id,
      'state.json',
    );
    if (!fs.existsSync(stateFile)) continue;
    try {
      const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      for (const story of state.stories || []) {
        out.push({
          phase,
          sprint_id,
          story_id: story.id,
          status: story.status,
        });
      }
    } catch {
      // skip corrupt state
    }
  }
  return out;
}

/**
 * Compact counts for list/dashboard display. Single-pass scan.
 */
function countLinkedItems(cwd, milestoneId) {
  const phases = linkedPhases(cwd, milestoneId);
  const sprints = linkedSprints(cwd, milestoneId);
  const stories = linkedStories(cwd, milestoneId);
  const byStatus = {};
  for (const s of stories) {
    byStatus[s.status] = (byStatus[s.status] || 0) + 1;
  }
  return {
    phases: phases.length,
    sprints: sprints.length,
    stories: stories.length,
    stories_by_status: byStatus,
  };
}

// ---------- Linking mutations ----------

/**
 * Link a phase to a milestone by writing `milestone:` into the phase's
 * brief.md frontmatter. Creates brief.md if it doesn't exist yet.
 */
function linkPhaseToMilestone(cwd, phase, milestoneId) {
  const existing = readMilestone(cwd, milestoneId);
  if (!existing) {
    throw new Error(`Milestone '${milestoneId}' not found. Create it first.`);
  }
  const briefPath = path.join(cwd, '.rihal/phases', phase, 'brief.md');
  fs.mkdirSync(path.dirname(briefPath), { recursive: true });
  if (!fs.existsSync(briefPath)) {
    // Seed a minimal brief so the frontmatter has somewhere to live
    writeFileAtomic(briefPath, `# ${phase}\n\n_Phase brief pending._\n`);
  }
  return writeMilestoneField(briefPath, milestoneId);
}

function unlinkPhaseFromMilestone(cwd, phase) {
  const briefPath = path.join(cwd, '.rihal/phases', phase, 'brief.md');
  return writeMilestoneField(briefPath, null);
}

// ---------- Close + history ----------

/**
 * Close a milestone: status → completed, append an entry to MILESTONES.md.
 * Does NOT delete anything. Linked phases/sprints/stories remain readable
 * (still show up under linkedPhases etc., just with a completed milestone
 * behind them).
 */
function closeMilestone(cwd, id) {
  const state = readMilestone(cwd, id);
  if (!state) {
    throw new Error(`Milestone '${id}' not found.`);
  }
  state.status = 'completed';
  state.completed_at = new Date().toISOString();
  writeMilestone(cwd, id, state);

  // Append to history log
  appendToHistory(cwd, state);

  // If this was the active milestone, clear the marker
  if (getActiveMilestone(cwd) === id) {
    clearActiveMilestone(cwd);
  }

  return state;
}

/**
 * Append a completed milestone entry to .rihal/MILESTONES.md.
 * File is created on first call. Newest entries go at the top
 * so the most recent milestone is visible without scrolling.
 */
function appendToHistory(cwd, state) {
  const p = historyPath(cwd);
  const date = (state.completed_at || new Date().toISOString()).slice(0, 10);
  const counts = countLinkedItems(cwd, state.id);

  const entry = [
    `## ${state.id} — ${state.name} (completed ${date})`,
    ``,
    state.goal ? `**Goal:** ${state.goal}` : null,
    ``,
    `- Phases: ${counts.phases}`,
    `- Sprints: ${counts.sprints}`,
    `- Stories: ${counts.stories} total${
      Object.keys(counts.stories_by_status).length > 0
        ? ' — ' +
          Object.entries(counts.stories_by_status)
            .map(([k, v]) => `${v} ${k}`)
            .join(', ')
        : ''
    }`,
    state.target_date ? `- Target: ${state.target_date}` : null,
    ``,
    `---`,
    ``,
  ]
    .filter((l) => l !== null)
    .join('\n');

  let content;
  if (fs.existsSync(p)) {
    const existing = fs.readFileSync(p, 'utf8');
    // Preserve the header if present
    const headerMatch = existing.match(/^(# [^\n]*\n+)/);
    if (headerMatch) {
      content = headerMatch[1] + entry + existing.slice(headerMatch[1].length);
    } else {
      content = entry + existing;
    }
  } else {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    content = `# Milestones\n\n_Append-only history of completed milestones. Newest first._\n\n${entry}`;
  }
  writeFileAtomic(p, content);
}

// ---------- Exports ----------

module.exports = {
  // Constants
  MILESTONE_STATUS_VALUES,
  VALID_ID_PATTERN,

  // Paths
  milestonesRoot,
  milestoneDir,
  milestoneStatePath,
  activeMarkerPath,
  historyPath,

  // Frontmatter (reused by other libs if needed)
  readMilestoneField,
  writeMilestoneField,

  // Core I/O
  defaultMilestoneState,
  readMilestone,
  writeMilestone,
  initMilestone,

  // Active marker
  getActiveMilestone,
  setActiveMilestone,
  clearActiveMilestone,

  // Listing
  listMilestones,

  // Resolution
  resolveMilestoneForPhase,
  resolveMilestoneForSprint,
  resolveMilestoneForStory,

  // Linkage
  linkedPhases,
  linkedSprints,
  linkedStories,
  countLinkedItems,

  // Mutations
  linkPhaseToMilestone,
  unlinkPhaseFromMilestone,
  closeMilestone,

  // History
  appendToHistory,
};
