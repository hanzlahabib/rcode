/**
 * rihal-code handoff — thin CLI over cli/lib/handoff.cjs.
 *
 * Exists so slash command templates never need to know where the library
 * file lives on disk. Templates shell out to `rihal-code handoff <verb>`;
 * the CLI resolves the library internally from its own package root.
 *
 * Usage:
 *   rihal-code handoff read           → prints the current HANDOFF.json as JSON
 *                                        or "null" if none pending
 *   rihal-code handoff read --summary → prints one-line human summary
 *   rihal-code handoff write [flags]  → writes a new handoff; refuses if one
 *                                        already exists unless --force
 *   rihal-code handoff clear          → deletes HANDOFF.json (keeps .continue-here.md)
 *
 * Write flags:
 *   --phase=<phase>               --sprint-id=<sprint-id>
 *   --story-id=<story-id>         --current-task=<N>
 *   --total-tasks=<N>             --last-command=<cmd>
 *   --next-action='...'           --notes='...'
 *   --blocker='...'               (repeatable)
 *   --file='...'                  (repeatable, tracks uncommitted files)
 *   --force                       overwrite existing handoff
 */

const fs = require('fs');
const path = require('path');
const {
  readHandoff,
  writeHandoff,
  clearHandoff,
  summarizeHandoff,
} = require('./lib/handoff.cjs');

function parseArgs(args) {
  const opts = {
    positional: [],
    phase: null,
    sprintId: null,
    storyId: null,
    currentTask: null,
    totalTasks: null,
    lastCommand: null,
    nextAction: null,
    notes: null,
    blockers: [],
    files: [],
    force: false,
    summary: false,
  };
  for (const arg of args) {
    if (arg === '--force') opts.force = true;
    else if (arg === '--summary') opts.summary = true;
    else if (arg.startsWith('--phase=')) opts.phase = arg.slice('--phase='.length);
    else if (arg.startsWith('--sprint-id=')) opts.sprintId = arg.slice('--sprint-id='.length);
    else if (arg.startsWith('--story-id=')) opts.storyId = arg.slice('--story-id='.length);
    else if (arg.startsWith('--current-task=')) opts.currentTask = parseInt(arg.slice('--current-task='.length), 10);
    else if (arg.startsWith('--total-tasks=')) opts.totalTasks = parseInt(arg.slice('--total-tasks='.length), 10);
    else if (arg.startsWith('--last-command=')) opts.lastCommand = arg.slice('--last-command='.length);
    else if (arg.startsWith('--next-action=')) opts.nextAction = arg.slice('--next-action='.length);
    else if (arg.startsWith('--notes=')) opts.notes = arg.slice('--notes='.length);
    else if (arg.startsWith('--blocker=')) opts.blockers.push(arg.slice('--blocker='.length));
    else if (arg.startsWith('--file=')) opts.files.push(arg.slice('--file='.length));
    else opts.positional.push(arg);
  }
  return opts;
}

function ensureRihal(cwd) {
  if (!fs.existsSync(path.join(cwd, '.rihal'))) {
    console.error(`❌ No .rihal/ directory found in ${cwd}`);
    console.error(`   Run 'rihal-code install' first.`);
    process.exit(1);
  }
}

module.exports = function handoff(args) {
  const cwd = process.cwd();
  ensureRihal(cwd);
  const opts = parseArgs(args);
  const [verb] = opts.positional;

  if (!verb) {
    console.error(`Usage: rihal-code handoff <read|write|clear> [flags]`);
    process.exit(1);
  }

  switch (verb) {
    case 'read': {
      const data = readHandoff(cwd);
      if (opts.summary) {
        console.log(summarizeHandoff(data));
      } else {
        console.log(JSON.stringify(data, null, 2));
      }
      return;
    }

    case 'write': {
      const data = {
        phase: opts.phase,
        sprint_id: opts.sprintId,
        story_id: opts.storyId,
        current_task: opts.currentTask,
        total_tasks: opts.totalTasks,
        last_command: opts.lastCommand,
        next_action: opts.nextAction,
        notes: opts.notes,
        blockers: opts.blockers,
        uncommitted_files: opts.files,
      };
      const result = writeHandoff(cwd, data, { force: opts.force });
      if (!result.written) {
        console.error(`❌ ${result.reason || 'write failed'}`);
        if (result.existing) {
          console.error(`   Existing handoff: ${summarizeHandoff(result.existing)}`);
          console.error(`   Pass --force to overwrite, or run 'rihal-code handoff clear' first.`);
        }
        process.exit(1);
      }
      console.log(`✓ Handoff written to ${result.path}`);
      return;
    }

    case 'clear': {
      const result = clearHandoff(cwd);
      if (result.cleared) {
        console.log(`✓ Handoff cleared`);
      } else {
        console.log(`ℹ No pending handoff to clear`);
      }
      return;
    }

    default:
      console.error(`Unknown verb: ${verb}`);
      console.error(`Usage: rihal-code handoff <read|write|clear>`);
      process.exit(1);
  }
};
