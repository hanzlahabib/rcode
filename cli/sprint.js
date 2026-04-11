/**
 * rihal-code sprint — inspect and mutate per-sprint state.
 *
 * Usage:
 *   rihal-code sprint                       list all sprints across all phases
 *   rihal-code sprint current                show the active sprint's story queue
 *   rihal-code sprint status                 alias for `current`
 *   rihal-code sprint show <sprint-id>       show one specific sprint's detail
 *   rihal-code sprint activate <sprint-id>   set the active sprint
 *   rihal-code sprint story <id> <status>    update a story's status
 *     status ∈ ready | in_progress | blocked | review | done | abandoned
 *   rihal-code sprint init <sprint-id>       initialize an empty sprint state file
 *
 * Flags (apply to any subcommand):
 *   --phase=<phase-id>   operate on a specific phase (default: current_phase
 *                        from .rihal/state.json)
 *   --json               emit machine-readable JSON instead of the pretty table
 *
 * All writes go through sprint-state.cjs → writeJsonAtomic, so Ctrl+C
 * mid-mutation cannot corrupt a sprint's state.json.
 */

const fs = require('fs');
const path = require('path');
const ss = require('./lib/sprint-state.cjs');

function parseArgs(args) {
  const opts = { phase: null, json: false, positional: [] };
  for (const arg of args) {
    if (arg.startsWith('--phase=')) opts.phase = arg.slice('--phase='.length);
    else if (arg === '--json') opts.json = true;
    else opts.positional.push(arg);
  }
  return opts;
}

function ensureRihal(cwd) {
  if (!fs.existsSync(path.join(cwd, '.rihal'))) {
    console.error(`❌ No .rihal/ found in ${cwd}`);
    console.error(`   Run 'rihal-code install' first.`);
    process.exit(1);
  }
}

// ---------- Pretty printing ----------

/**
 * Summary table of all sprints across phases. One row per sprint.
 * Falls back to per-phase sections if there are multiple phases.
 */
function printSprintList(cwd, opts) {
  const phases = opts.phase ? [opts.phase] : ss.listPhases(cwd);
  if (phases.length === 0) {
    console.log(`\n⚠ No phases found in .rihal/phases/.`);
    console.log(`   Run /rihal:kickoff in your editor to create one.\n`);
    return;
  }

  let total = 0;
  for (const phase of phases) {
    const sprints = ss.listSprints(cwd, phase);
    const active = ss.getActiveSprint(cwd, phase);
    total += sprints.length;

    if (sprints.length === 0) {
      if (phases.length > 1) {
        console.log(`\n📁 ${phase}  (no sprints)`);
      }
      continue;
    }

    console.log(`\n📁 ${phase}${phases.length > 1 ? '' : ''}\n`);

    // Column widths
    const idW = Math.max(...sprints.map((s) => s.sprint_id.length), 9);
    const goalW = Math.min(
      Math.max(...sprints.map((s) => (s.goal || '').length), 4),
      40,
    );

    console.log(
      `   ${'sprint'.padEnd(idW)}  ${'status'.padEnd(13)}  stories           bugs   goal`,
    );
    console.log(
      `   ${'-'.repeat(idW)}  ${'-'.repeat(13)}  ${'-'.repeat(17)}  ${'-'.repeat(5)}  ${'-'.repeat(goalW)}`,
    );

    for (const s of sprints) {
      const marker = s.sprint_id === active ? ' ★' : '  ';
      const breakdown = summarizeCounts(s.counts, s.total_stories);
      const bugs = s.bugs_unresolved
        ? `${s.bugs_unresolved}/${s.bugs_raised}`
        : s.bugs_raised
        ? `${s.bugs_raised}`
        : '-';
      const goal = (s.goal || '').slice(0, goalW);
      console.log(
        `   ${s.sprint_id.padEnd(idW)}${marker}${s.status.padEnd(11)}  ${breakdown.padEnd(17)}  ${bugs.padEnd(5)}  ${goal}`,
      );
    }
  }

  if (total === 0) {
    console.log();
    console.log(`   No sprints yet. Run /rihal:kickoff to plan some.\n`);
    return;
  }

  console.log(`\n★ = active sprint`);
  console.log();
}

function summarizeCounts(counts, total) {
  if (total === 0) return '(empty)';
  const parts = [];
  const order = ['done', 'in_progress', 'review', 'blocked', 'ready', 'abandoned'];
  for (const status of order) {
    if (counts[status]) parts.push(`${counts[status]}${status[0]}`);
  }
  return `${parts.join(' ')} /${total}`;
}

/**
 * Detailed view of one sprint: goal, DoD, every story + its status,
 * bugs raised, last activity. This is what `sprint current` shows.
 */
function printSprintDetail(cwd, phase, sprintId) {
  const state = ss.readSprintState(cwd, phase, sprintId);
  if (!state) {
    console.error(`❌ Sprint '${sprintId}' not found in phase '${phase}'.`);
    process.exit(1);
  }
  const active = ss.getActiveSprint(cwd, phase);
  const marker = active === sprintId ? ' ★ ACTIVE' : '';

  console.log(`\n🏃 ${phase} / ${sprintId}${marker}\n`);
  if (state.goal) console.log(`   Goal:         ${state.goal}`);
  console.log(`   Status:       ${state.status}`);
  if (state.started_at) console.log(`   Started:      ${state.started_at}`);
  console.log(`   Last activity: ${state.last_activity}`);
  if (state.capacity && Object.values(state.capacity).some((v) => v)) {
    const cap = [];
    if (state.capacity.devs) cap.push(`${state.capacity.devs} devs`);
    if (state.capacity.days) cap.push(`${state.capacity.days} days`);
    if (state.capacity.points) cap.push(`${state.capacity.points} points`);
    console.log(`   Capacity:     ${cap.join(', ')}`);
  }

  if (state.definition_of_done.length > 0) {
    console.log(`\n   Definition of Done:`);
    for (const dod of state.definition_of_done) console.log(`     • ${dod}`);
  }

  // Stories
  console.log(`\n   Stories (${state.stories.length}):`);
  if (state.stories.length === 0) {
    console.log(`     (no stories yet — run /rihal:generate-sprint ${sprintId} to add some)`);
  } else {
    // Column widths
    const idW = Math.max(...state.stories.map((s) => s.id.length), 6);
    for (const s of state.stories) {
      const symbol = storySymbol(s.status);
      const title = s.title && s.title !== s.id ? ` — ${s.title}` : '';
      const progress =
        s.current_task && s.total_tasks ? ` [${s.current_task}/${s.total_tasks}]` : '';
      const assignee = s.assignee ? ` @${s.assignee}` : '';
      const blocked = s.blocked_on ? ` ⛔ ${s.blocked_on}` : '';
      console.log(
        `     ${symbol} ${s.id.padEnd(idW)}${title}${progress}${assignee}${blocked}`,
      );
    }
  }

  // Bugs
  if (state.bugs_raised.length > 0) {
    console.log(`\n   Bugs raised (${state.bugs_raised.length}):`);
    for (const b of state.bugs_raised) {
      const mark = b.resolved ? '✓' : '⚠';
      console.log(`     ${mark} ${b.id}  [${b.severity}/${b.area}]  ${b.title}`);
    }
  }

  console.log();
}

function storySymbol(status) {
  switch (status) {
    case 'done': return '✓';
    case 'in_progress': return '▶';
    case 'review': return '◐';
    case 'blocked': return '⛔';
    case 'abandoned': return '✗';
    case 'ready':
    default: return '○';
  }
}

// ---------- Subcommand handlers ----------

function cmdList(cwd, opts) {
  if (opts.json) {
    const phases = opts.phase ? [opts.phase] : ss.listPhases(cwd);
    const out = {};
    for (const phase of phases) {
      out[phase] = {
        active: ss.getActiveSprint(cwd, phase),
        sprints: ss.listSprints(cwd, phase),
      };
    }
    console.log(JSON.stringify(out, null, 2));
    return;
  }
  printSprintList(cwd, opts);
}

function cmdCurrent(cwd, opts) {
  const phase = opts.phase || ss.getCurrentPhase(cwd);
  if (!phase) {
    console.error(`❌ No current phase detected. Pass --phase=<id> or run /rihal:kickoff first.`);
    process.exit(1);
  }
  const sprintId = ss.getActiveSprint(cwd, phase);
  if (!sprintId) {
    console.log(`\n⚠ No active sprint in phase '${phase}'.`);
    console.log(`   Activate one with: rihal-code sprint activate <sprint-id>\n`);
    return;
  }
  if (opts.json) {
    console.log(JSON.stringify(ss.readSprintState(cwd, phase, sprintId), null, 2));
    return;
  }
  printSprintDetail(cwd, phase, sprintId);
}

function cmdShow(cwd, opts, sprintId) {
  const phase = opts.phase || ss.getCurrentPhase(cwd);
  if (!phase) {
    console.error(`❌ No current phase. Pass --phase=<id>.`);
    process.exit(1);
  }
  if (opts.json) {
    const state = ss.readSprintState(cwd, phase, sprintId);
    if (!state) {
      console.error(`❌ Sprint '${sprintId}' not found in phase '${phase}'.`);
      process.exit(1);
    }
    console.log(JSON.stringify(state, null, 2));
    return;
  }
  printSprintDetail(cwd, phase, sprintId);
}

function cmdActivate(cwd, opts, sprintId) {
  const phase = opts.phase || ss.getCurrentPhase(cwd);
  if (!phase) {
    console.error(`❌ No current phase. Pass --phase=<id>.`);
    process.exit(1);
  }
  try {
    ss.setActiveSprint(cwd, phase, sprintId);
  } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }
  console.log(`✓ Active sprint set to ${sprintId} (phase ${phase})`);
}

function cmdStoryStatus(cwd, opts, storyId, newStatus) {
  const phase = opts.phase || ss.getCurrentPhase(cwd);
  if (!phase) {
    console.error(`❌ No current phase. Pass --phase=<id>.`);
    process.exit(1);
  }
  const sprintId = ss.getActiveSprint(cwd, phase);
  if (!sprintId) {
    console.error(`❌ No active sprint in phase '${phase}'. Activate one first.`);
    process.exit(1);
  }
  try {
    const story = ss.updateStoryStatus(cwd, phase, sprintId, storyId, { status: newStatus });
    console.log(`✓ ${storyId} → ${story.status}`);
  } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }
}

function cmdInit(cwd, opts, sprintId) {
  const phase = opts.phase || ss.getCurrentPhase(cwd);
  if (!phase) {
    console.error(`❌ No current phase. Pass --phase=<id>.`);
    process.exit(1);
  }
  const state = ss.initSprint(cwd, phase, sprintId);
  console.log(`✓ Sprint '${sprintId}' initialized in phase '${phase}'`);
  console.log(`  Location: .rihal/phases/${phase}/sprints/${sprintId}/state.json`);
  if (opts.json) console.log(JSON.stringify(state, null, 2));
}

// ---------- Dispatch ----------

module.exports = function sprint(args) {
  const cwd = process.cwd();
  ensureRihal(cwd);
  const opts = parseArgs(args);
  const [sub, ...rest] = opts.positional;

  if (!sub) {
    return cmdList(cwd, opts);
  }

  switch (sub) {
    case 'list':
      return cmdList(cwd, opts);
    case 'current':
    case 'status':
      return cmdCurrent(cwd, opts);
    case 'show':
      if (!rest[0]) {
        console.error(`Usage: rihal-code sprint show <sprint-id>`);
        process.exit(1);
      }
      return cmdShow(cwd, opts, rest[0]);
    case 'activate':
      if (!rest[0]) {
        console.error(`Usage: rihal-code sprint activate <sprint-id>`);
        process.exit(1);
      }
      return cmdActivate(cwd, opts, rest[0]);
    case 'story':
      if (!rest[0] || !rest[1]) {
        console.error(`Usage: rihal-code sprint story <id> <ready|in_progress|blocked|review|done|abandoned>`);
        process.exit(1);
      }
      return cmdStoryStatus(cwd, opts, rest[0], rest[1]);
    case 'init':
      if (!rest[0]) {
        console.error(`Usage: rihal-code sprint init <sprint-id>`);
        process.exit(1);
      }
      return cmdInit(cwd, opts, rest[0]);
    default:
      console.error(`Unknown subcommand: ${sub}`);
      console.error(`Usage:`);
      console.error(`  rihal-code sprint [list|current|show|activate|story|init]`);
      process.exit(1);
  }
};
