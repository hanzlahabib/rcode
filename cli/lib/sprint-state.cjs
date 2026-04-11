/**
 * Per-sprint state machine for Rihal Code.
 *
 * Owns everything about: which sprints exist, which one is active, which
 * stories are in-progress vs done vs blocked, which bugs were raised
 * during a sprint, and how to resume a half-finished sprint.
 *
 * Layout it expects on disk:
 *
 *   .rihal/phases/{phase}/
 *     ├── brief.md                         (phase brief — not touched here)
 *     ├── sprints.md                       (human-edited sprint plan)
 *     └── sprints/
 *         ├── active-sprint                (plain text file, contents = sprint-id)
 *         ├── sprint-01/
 *         │   ├── state.json               (per-sprint state — this library's job)
 *         │   ├── plan.md                  (goal, capacity, DoD — written by kickoff)
 *         │   └── stories/
 *         │       └── story-1-1-login.md   (individual story files)
 *         ├── sprint-02/
 *         │   └── ...
 *
 * Why per-sprint directories instead of a single sprint-status.yaml:
 *   - Context of "sprint 1" doesn't bleed into "sprint 2" reading
 *   - Each sprint has its own story files on disk — scan is cheap
 *   - Atomic writes are simpler (one small file per sprint, not a big one)
 *   - Multi-sprint projects can resume any sprint independently
 *
 * Every write goes through writeJsonAtomic so a Ctrl+C mid-write can't
 * corrupt the state.
 */

const fs = require('fs');
const path = require('path');
const { writeJsonAtomic } = require('./fsutil.cjs');

// ---------- Schema ----------

const SPRINT_STATUS_VALUES = new Set([
  'planned',      // exists but not started
  'in_progress', // has at least one story in flight
  'completed',    // all stories done
  'abandoned',    // user gave up on this sprint
]);

const STORY_STATUS_VALUES = new Set([
  'ready',        // available to work on
  'in_progress', // dev-story in flight
  'blocked',      // can't proceed, see blocked_on
  'review',       // tests pass, waiting for review
  'done',         // shipped
  'abandoned',    // dropped from this sprint
]);

/**
 * Default shape for a newly-initialized sprint state.
 * All fields have a default so partial writes don't leave holes.
 */
function defaultSprintState({ sprintId, phase, goal = '', capacity = {} }) {
  return {
    sprint_id: sprintId,
    phase,
    goal,
    status: 'planned',
    started_at: null,
    last_activity: new Date().toISOString(),
    capacity: {
      devs: capacity.devs || null,
      days: capacity.days || null,
      points: capacity.points || null,
    },
    definition_of_done: [],
    stories: [],           // array of { id, title, status, assignee, points, current_task, total_tasks, blocked_on, started_at, completed_at, commits }
    bugs_raised: [],       // array of { id, title, severity, area, story_ref, resolved, raised_at }
    retrospective: null,   // filled in when sprint closes
  };
}

/**
 * Default shape for a story entry added to a sprint's story queue.
 */
function defaultStoryEntry({ id, title = '', points = null, assignee = null }) {
  return {
    id,
    title: title || id,
    status: 'ready',
    assignee,
    points,
    current_task: null,
    total_tasks: null,
    blocked_on: null,
    started_at: null,
    completed_at: null,
    commits: [],
  };
}

// ---------- Paths ----------

function sprintsRoot(cwd, phase) {
  return path.join(cwd, '.rihal', 'phases', phase, 'sprints');
}

function sprintDir(cwd, phase, sprintId) {
  return path.join(sprintsRoot(cwd, phase), sprintId);
}

function sprintStatePath(cwd, phase, sprintId) {
  return path.join(sprintDir(cwd, phase, sprintId), 'state.json');
}

function activeSprintMarkerPath(cwd, phase) {
  return path.join(sprintsRoot(cwd, phase), 'active-sprint');
}

// ---------- Phase discovery helpers ----------

/**
 * Find all phase directories under .rihal/phases/. Returns array of phase
 * ids (directory names). Empty array if .rihal/phases/ doesn't exist.
 */
function listPhases(cwd) {
  const phasesDir = path.join(cwd, '.rihal', 'phases');
  if (!fs.existsSync(phasesDir)) return [];
  return fs
    .readdirSync(phasesDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

/**
 * Read .rihal/state.json and return `current_phase` (if set), or fall back
 * to the highest-numbered phase that has a brief.md file, or null.
 */
function getCurrentPhase(cwd) {
  const statePath = path.join(cwd, '.rihal', 'state.json');
  try {
    if (fs.existsSync(statePath)) {
      const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
      if (state.current_phase) return state.current_phase;
    }
  } catch {
    // fall through
  }
  // Fallback: highest phase with a brief
  const phases = listPhases(cwd);
  for (let i = phases.length - 1; i >= 0; i--) {
    if (fs.existsSync(path.join(cwd, '.rihal/phases', phases[i], 'brief.md'))) {
      return phases[i];
    }
  }
  return phases[phases.length - 1] || null;
}

// ---------- Sprint I/O ----------

/**
 * Load sprint state. Returns null if the sprint doesn't exist or the
 * state file is missing/corrupt (caller handles the null).
 */
function readSprintState(cwd, phase, sprintId) {
  const p = sprintStatePath(cwd, phase, sprintId);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Write sprint state atomically. Creates the sprint directory tree if it
 * doesn't exist. Updates `last_activity` automatically.
 */
function writeSprintState(cwd, phase, sprintId, state) {
  const dir = sprintDir(cwd, phase, sprintId);
  fs.mkdirSync(path.join(dir, 'stories'), { recursive: true });
  const merged = {
    ...state,
    sprint_id: sprintId,
    phase,
    last_activity: new Date().toISOString(),
  };
  writeJsonAtomic(sprintStatePath(cwd, phase, sprintId), merged);
  return merged;
}

/**
 * Initialize a new sprint with default state. No-op if it already exists
 * unless `force` is true (which overwrites).
 */
function initSprint(cwd, phase, sprintId, initArgs = {}, { force = false } = {}) {
  const existing = readSprintState(cwd, phase, sprintId);
  if (existing && !force) return existing;
  const state = defaultSprintState({ sprintId, phase, ...initArgs });
  return writeSprintState(cwd, phase, sprintId, state);
}

// ---------- Active sprint ----------

/**
 * Get the active sprint id for a phase. Returns null if no active-sprint
 * marker exists. Uses a plain text file (not JSON) so it's trivially
 * atomic — a single rename.
 */
function getActiveSprint(cwd, phase = null) {
  const targetPhase = phase || getCurrentPhase(cwd);
  if (!targetPhase) return null;
  const markerPath = activeSprintMarkerPath(cwd, targetPhase);
  if (!fs.existsSync(markerPath)) return null;
  try {
    return fs.readFileSync(markerPath, 'utf8').trim();
  } catch {
    return null;
  }
}

/**
 * Set the active sprint for a phase. Refuses to set a sprint that doesn't
 * have a state.json yet — forces initSprint to happen first so we never
 * activate a phantom sprint id.
 */
function setActiveSprint(cwd, phase, sprintId) {
  const state = readSprintState(cwd, phase, sprintId);
  if (!state) {
    throw new Error(
      `Cannot activate sprint '${sprintId}' in phase '${phase}': state.json does not exist. ` +
      `Call initSprint() first.`,
    );
  }
  fs.mkdirSync(sprintsRoot(cwd, phase), { recursive: true });
  // Use writeFileSync — sprint marker is a single line, atomicity via
  // rename isn't worth the extra complexity for a 20-byte file.
  fs.writeFileSync(activeSprintMarkerPath(cwd, phase), `${sprintId}\n`);
  return sprintId;
}

// ---------- Sprint listing ----------

/**
 * List all sprints in a phase with summary stats (status, story counts).
 * Used by the `rihal-code sprint` list view.
 */
function listSprints(cwd, phase) {
  const root = sprintsRoot(cwd, phase);
  if (!fs.existsSync(root)) return [];
  const entries = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((n) => n.startsWith('sprint-'))
    .sort();

  const result = [];
  for (const sprintId of entries) {
    const state = readSprintState(cwd, phase, sprintId);
    if (!state) continue;
    const counts = countStoriesByStatus(state.stories);
    result.push({
      sprint_id: sprintId,
      phase,
      goal: state.goal,
      status: state.status,
      last_activity: state.last_activity,
      total_stories: state.stories.length,
      counts,
      bugs_raised: state.bugs_raised.length,
      bugs_unresolved: state.bugs_raised.filter((b) => !b.resolved).length,
    });
  }
  return result;
}

function countStoriesByStatus(stories) {
  const counts = {};
  for (const s of stories) {
    counts[s.status] = (counts[s.status] || 0) + 1;
  }
  return counts;
}

// ---------- Story mutations ----------

/**
 * Update one story's fields by id. Accepts a partial patch. Validates
 * status transitions against STORY_STATUS_VALUES. Automatically sets
 * started_at when status becomes in_progress, completed_at when done.
 */
function updateStoryStatus(cwd, phase, sprintId, storyId, patch) {
  const state = readSprintState(cwd, phase, sprintId);
  if (!state) {
    throw new Error(`Sprint '${sprintId}' in phase '${phase}' not found.`);
  }
  const idx = state.stories.findIndex((s) => s.id === storyId);
  if (idx < 0) {
    throw new Error(
      `Story '${storyId}' not found in sprint '${sprintId}'. ` +
      `Available: ${state.stories.map((s) => s.id).join(', ') || '(none)'}`,
    );
  }

  if (patch.status && !STORY_STATUS_VALUES.has(patch.status)) {
    throw new Error(
      `Invalid story status '${patch.status}'. Valid: ${[...STORY_STATUS_VALUES].join(', ')}`,
    );
  }

  const story = { ...state.stories[idx], ...patch };
  const now = new Date().toISOString();
  if (patch.status === 'in_progress' && !story.started_at) {
    story.started_at = now;
  }
  if (patch.status === 'done' && !story.completed_at) {
    story.completed_at = now;
  }
  state.stories[idx] = story;

  // Sprint-level status auto-update
  const inProgress = state.stories.some((s) => s.status === 'in_progress');
  const allDone = state.stories.length > 0 && state.stories.every((s) => s.status === 'done');
  if (allDone) {
    state.status = 'completed';
  } else if (inProgress && state.status === 'planned') {
    state.status = 'in_progress';
    if (!state.started_at) state.started_at = now;
  }

  writeSprintState(cwd, phase, sprintId, state);
  return story;
}

/**
 * Add a story to a sprint's queue. Fails if the story already exists.
 * Useful when sprint planning generates stories incrementally.
 */
function addStoryToSprint(cwd, phase, sprintId, storyArgs) {
  const state = readSprintState(cwd, phase, sprintId);
  if (!state) {
    throw new Error(`Sprint '${sprintId}' in phase '${phase}' not found.`);
  }
  if (state.stories.some((s) => s.id === storyArgs.id)) {
    throw new Error(`Story '${storyArgs.id}' already exists in sprint '${sprintId}'.`);
  }
  state.stories.push(defaultStoryEntry(storyArgs));
  writeSprintState(cwd, phase, sprintId, state);
  return state.stories[state.stories.length - 1];
}

/**
 * Append a bug entry to a sprint's `bugs_raised` list. Non-blocking —
 * doesn't change any story's status. Severity/area validated loosely.
 */
function addBugToSprint(cwd, phase, sprintId, bug) {
  const state = readSprintState(cwd, phase, sprintId);
  if (!state) {
    throw new Error(`Sprint '${sprintId}' in phase '${phase}' not found.`);
  }
  const entry = {
    id: bug.id,
    title: bug.title || '(no title)',
    severity: bug.severity || 'medium',
    area: bug.area || 'unknown',
    story_ref: bug.story_ref || null,
    resolved: false,
    raised_at: new Date().toISOString(),
    ...bug,
  };
  state.bugs_raised.push(entry);
  writeSprintState(cwd, phase, sprintId, state);
  return entry;
}

/**
 * Mark a bug resolved. Move flag only — does NOT delete the entry so the
 * sprint retrospective can count "N bugs raised, M resolved".
 */
function resolveBugInSprint(cwd, phase, sprintId, bugId) {
  const state = readSprintState(cwd, phase, sprintId);
  if (!state) return null;
  const idx = state.bugs_raised.findIndex((b) => b.id === bugId);
  if (idx < 0) return null;
  state.bugs_raised[idx].resolved = true;
  state.bugs_raised[idx].resolved_at = new Date().toISOString();
  writeSprintState(cwd, phase, sprintId, state);
  return state.bugs_raised[idx];
}

// ---------- Cross-sprint queries ----------

/**
 * Scan ALL sprints across ALL phases and return any story stuck in
 * `in_progress` or `blocked`. Used by /rihal:resume to answer "what was
 * I in the middle of when I stopped?"
 */
function findInterruptedStories(cwd) {
  const out = [];
  for (const phase of listPhases(cwd)) {
    for (const sprint of listSprints(cwd, phase)) {
      const state = readSprintState(cwd, phase, sprint.sprint_id);
      if (!state) continue;
      for (const story of state.stories) {
        if (story.status === 'in_progress' || story.status === 'blocked') {
          out.push({
            phase,
            sprint_id: sprint.sprint_id,
            story,
            last_activity: state.last_activity,
          });
        }
      }
    }
  }
  // Most recently touched first
  out.sort((a, b) => (b.last_activity || '').localeCompare(a.last_activity || ''));
  return out;
}

/**
 * Get the in-progress stories for one sprint. Helper for sprint status
 * printing.
 */
function getInProgressStories(cwd, phase, sprintId) {
  const state = readSprintState(cwd, phase, sprintId);
  if (!state) return [];
  return state.stories.filter((s) => s.status === 'in_progress');
}

/**
 * Pick the next story that's `ready` and route it to the caller.
 * Used by /rihal:next when it becomes sprint-aware.
 * Returns null if nothing is ready in the active sprint.
 */
function getNextReadyStory(cwd, phase = null, sprintId = null) {
  const targetPhase = phase || getCurrentPhase(cwd);
  if (!targetPhase) return null;
  const targetSprint = sprintId || getActiveSprint(cwd, targetPhase);
  if (!targetSprint) return null;
  const state = readSprintState(cwd, targetPhase, targetSprint);
  if (!state) return null;
  return state.stories.find((s) => s.status === 'ready') || null;
}

// ---------- Exports ----------

module.exports = {
  // Constants
  SPRINT_STATUS_VALUES,
  STORY_STATUS_VALUES,

  // Path helpers
  sprintsRoot,
  sprintDir,
  sprintStatePath,
  activeSprintMarkerPath,

  // Phase helpers
  listPhases,
  getCurrentPhase,

  // Sprint I/O
  readSprintState,
  writeSprintState,
  initSprint,
  defaultSprintState,
  defaultStoryEntry,

  // Active sprint
  getActiveSprint,
  setActiveSprint,

  // Listing
  listSprints,

  // Story mutations
  updateStoryStatus,
  addStoryToSprint,

  // Bug intake
  addBugToSprint,
  resolveBugInSprint,

  // Cross-sprint queries
  findInterruptedStories,
  getInProgressStories,
  getNextReadyStory,
};
