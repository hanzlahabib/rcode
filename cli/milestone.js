/**
 * rihal-code milestone — top-level organizing concept.
 *
 * Usage:
 *   rihal-code milestone                              list all with status + counts
 *   rihal-code milestone current                      show active milestone detail
 *   rihal-code milestone show <id>                    show one by id
 *   rihal-code milestone create <id> [--name=...] [--goal=...] [--target=YYYY-MM-DD]
 *   rihal-code milestone activate <id>
 *   rihal-code milestone close <id>                   append to MILESTONES.md history
 *   rihal-code milestone link <phase-id> [--to=<id>]  link a phase via frontmatter
 *   rihal-code milestone unlink <phase-id>            remove milestone field from phase brief
 *
 * Flags:
 *   --json   machine-readable output
 *
 * All writes atomic via the lib. Style mirrors rihal-code sprint.
 */

const fs = require('fs');
const path = require('path');
const m = require('./lib/milestones.cjs');

function parseArgs(args) {
  const opts = { json: false, name: null, goal: null, target: null, to: null, positional: [] };
  for (const arg of args) {
    if (arg === '--json') opts.json = true;
    else if (arg.startsWith('--name=')) opts.name = arg.slice('--name='.length);
    else if (arg.startsWith('--goal=')) opts.goal = arg.slice('--goal='.length);
    else if (arg.startsWith('--target=')) opts.target = arg.slice('--target='.length);
    else if (arg.startsWith('--to=')) opts.to = arg.slice('--to='.length);
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

function statusSymbol(status) {
  switch (status) {
    case 'completed': return '✓';
    case 'in_progress': return '▶';
    case 'abandoned': return '✗';
    case 'planned':
    default: return '○';
  }
}

function storyStatusBreakdown(byStatus) {
  const order = ['done', 'in_progress', 'review', 'blocked', 'ready', 'abandoned'];
  const parts = [];
  for (const s of order) {
    if (byStatus[s]) parts.push(`${byStatus[s]}${s[0]}`);
  }
  return parts.join(' ');
}

// ---------- Subcommand handlers ----------

function cmdList(cwd, opts) {
  const list = m.listMilestones(cwd);

  if (opts.json) {
    console.log(JSON.stringify(list, null, 2));
    return;
  }

  if (list.length === 0) {
    console.log(`\n⚠ No milestones yet.`);
    console.log();
    console.log(`   Create one with: rihal-code milestone create m-0.1.0 --name="Initial"`);
    console.log();
    return;
  }

  // Column widths
  const idW = Math.max(...list.map((x) => x.id.length), 8);
  const nameW = Math.min(Math.max(...list.map((x) => (x.name || '').length), 4), 40);

  console.log();
  console.log(
    `   ${'milestone'.padEnd(idW)}  ${'status'.padEnd(14)}  ${'p/s/stories'.padEnd(13)}  ${'name'.padEnd(nameW)}`,
  );
  console.log(
    `   ${'-'.repeat(idW)}  ${'-'.repeat(14)}  ${'-'.repeat(13)}  ${'-'.repeat(nameW)}`,
  );

  for (const ms of list) {
    const marker = ms.active ? ' ★' : '  ';
    const sym = statusSymbol(ms.status);
    const counts = `${ms.phases}/${ms.sprints}/${ms.stories}`;
    const name = (ms.name || '').slice(0, nameW);
    console.log(
      `   ${ms.id.padEnd(idW)}${marker}${sym} ${ms.status.padEnd(12)}  ${counts.padEnd(13)}  ${name}`,
    );
  }
  console.log();
  console.log(`★ = active milestone   ·   columns: phases/sprints/stories`);
  console.log();
}

function cmdShow(cwd, opts, id) {
  const state = m.readMilestone(cwd, id);
  if (!state) {
    console.error(`❌ Milestone '${id}' not found.`);
    process.exit(1);
  }
  const active = m.getActiveMilestone(cwd);
  const counts = m.countLinkedItems(cwd, id);
  const phases = m.linkedPhases(cwd, id);
  const sprints = m.linkedSprints(cwd, id);
  const stories = m.linkedStories(cwd, id);

  if (opts.json) {
    console.log(JSON.stringify({ ...state, active: id === active, counts, phases, sprints, stories }, null, 2));
    return;
  }

  const marker = active === id ? ' ★ ACTIVE' : '';
  console.log(`\n🎯 ${state.id}${marker}\n`);
  if (state.name) console.log(`   Name:     ${state.name}`);
  if (state.goal) console.log(`   Goal:     ${state.goal}`);
  console.log(`   Status:   ${state.status}`);
  if (state.target_date) console.log(`   Target:   ${state.target_date}`);
  console.log(`   Created:  ${state.created_at}`);
  if (state.completed_at) console.log(`   Closed:   ${state.completed_at}`);
  if (state.github && state.github.number) {
    console.log(`   GitHub:   #${state.github.number}  ${state.github.url || ''}`);
  }

  console.log();
  if (phases.length > 0) {
    console.log(`   Phases (${phases.length}):   ${phases.join(', ')}`);
  } else {
    console.log(`   Phases:   (none linked)`);
  }

  if (sprints.length > 0) {
    console.log(`   Sprints (${sprints.length}): ${sprints.map((s) => `${s.phase}/${s.sprint_id}`).join(', ')}`);
  } else {
    console.log(`   Sprints:  (none)`);
  }

  if (stories.length > 0) {
    const breakdown = storyStatusBreakdown(counts.stories_by_status);
    console.log(`   Stories:  ${stories.length} total${breakdown ? `  [${breakdown}]` : ''}`);
  } else {
    console.log(`   Stories:  (none)`);
  }

  console.log();
}

function cmdCurrent(cwd, opts) {
  const id = m.getActiveMilestone(cwd);
  if (!id) {
    if (opts.json) {
      console.log('null');
      return;
    }
    console.log(`\n⚠ No active milestone.`);
    console.log();
    console.log(`   Set one with: rihal-code milestone activate <id>`);
    console.log(`   List available: rihal-code milestone`);
    console.log();
    return;
  }
  cmdShow(cwd, opts, id);
}

function cmdCreate(cwd, opts, id) {
  try {
    const state = m.initMilestone(cwd, id, {
      name: opts.name || undefined,
      goal: opts.goal || undefined,
      target_date: opts.target || null,
    });
    console.log(`\n✓ Created milestone ${id}`);
    console.log(`  Name: ${state.name}`);
    if (state.goal) console.log(`  Goal: ${state.goal}`);
    if (state.target_date) console.log(`  Target: ${state.target_date}`);
    console.log();
    console.log(`  Activate: rihal-code milestone activate ${id}`);
    console.log();
  } catch (err) {
    console.error(`\n❌ ${err.message}`);
    process.exit(1);
  }
}

function cmdActivate(cwd, opts, id) {
  try {
    m.setActiveMilestone(cwd, id);
    console.log(`\n✓ Active milestone set to ${id}`);
    console.log();
  } catch (err) {
    console.error(`\n❌ ${err.message}`);
    process.exit(1);
  }
}

function cmdClose(cwd, opts, id) {
  try {
    const state = m.closeMilestone(cwd, id);
    console.log(`\n✓ Closed milestone ${id}`);
    console.log(`  Status: ${state.status}`);
    console.log(`  Entry appended to .rihal/MILESTONES.md`);
    console.log();
  } catch (err) {
    console.error(`\n❌ ${err.message}`);
    process.exit(1);
  }
}

function cmdLink(cwd, opts, phaseId) {
  const targetId = opts.to || m.getActiveMilestone(cwd);
  if (!targetId) {
    console.error(`\n❌ No active milestone. Pass --to=<milestone-id> or activate one first.`);
    process.exit(1);
  }
  try {
    const changed = m.linkPhaseToMilestone(cwd, phaseId, targetId);
    if (changed) {
      console.log(`\n✓ Linked ${phaseId} → ${targetId}`);
      console.log(`  Wrote 'milestone: ${targetId}' to .rihal/phases/${phaseId}/brief.md`);
    } else {
      console.log(`\n✓ ${phaseId} already linked to ${targetId} (no change)`);
    }
    console.log();
  } catch (err) {
    console.error(`\n❌ ${err.message}`);
    process.exit(1);
  }
}

function cmdUnlink(cwd, opts, phaseId) {
  const changed = m.unlinkPhaseFromMilestone(cwd, phaseId);
  if (changed) {
    console.log(`\n✓ Unlinked ${phaseId} from its milestone`);
  } else {
    console.log(`\n✓ ${phaseId} had no milestone set (no change)`);
  }
  console.log();
}

// ---------- Dispatch ----------

module.exports = function milestone(args) {
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
      return cmdCurrent(cwd, opts);
    case 'show':
      if (!rest[0]) {
        console.error(`Usage: rihal-code milestone show <id>`);
        process.exit(1);
      }
      return cmdShow(cwd, opts, rest[0]);
    case 'create':
      if (!rest[0]) {
        console.error(`Usage: rihal-code milestone create <id> [--name=] [--goal=] [--target=]`);
        process.exit(1);
      }
      return cmdCreate(cwd, opts, rest[0]);
    case 'activate':
      if (!rest[0]) {
        console.error(`Usage: rihal-code milestone activate <id>`);
        process.exit(1);
      }
      return cmdActivate(cwd, opts, rest[0]);
    case 'close':
      if (!rest[0]) {
        console.error(`Usage: rihal-code milestone close <id>`);
        process.exit(1);
      }
      return cmdClose(cwd, opts, rest[0]);
    case 'link':
      if (!rest[0]) {
        console.error(`Usage: rihal-code milestone link <phase-id> [--to=<milestone-id>]`);
        process.exit(1);
      }
      return cmdLink(cwd, opts, rest[0]);
    case 'unlink':
      if (!rest[0]) {
        console.error(`Usage: rihal-code milestone unlink <phase-id>`);
        process.exit(1);
      }
      return cmdUnlink(cwd, opts, rest[0]);
    default:
      console.error(`Unknown subcommand: ${sub}`);
      console.error(`Usage:`);
      console.error(`  rihal-code milestone [list|current|show|create|activate|close|link|unlink]`);
      process.exit(1);
  }
};
