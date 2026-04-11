/**
 * rihal-code session — thin CLI over cli/lib/session-log.cjs.
 *
 * Slash commands (/rihal:save-session, /rihal:continue with topic arg)
 * shell out to this so they never need to require the library from
 * a disk path.
 *
 * Subcommands:
 *   rihal-code session save [flags]        write a new session log
 *   rihal-code session list [--limit=N]    list recent sessions (metadata)
 *   rihal-code session search <query>      search by topic/title/outcome
 *   rihal-code session show <filename>     print a single log
 *
 * Save flags:
 *   --title='...'
 *   --topics=a,b,c              comma-separated
 *   --phase=phase-01
 *   --sprint=sprint-01
 *   --story=story-1-2
 *   --outcome='one-line outcome'
 *   --notes='free-form text'
 *   --decision='...'            repeatable
 *   --learning='...'            repeatable
 *   --pending='...'             repeatable
 *   --file='path/to/file.ts'    repeatable (marks file as modified)
 *   --error='...'               repeatable
 *
 * All save flags optional — the library auto-picks a filename from
 * the title or slug. Empty fields are omitted from the output.
 */

const fs = require('fs');
const path = require('path');
const sl = require('./lib/session-log.cjs');

function parseArgs(args) {
  const opts = {
    positional: [],
    title: null,
    topics: [],
    phase: null,
    sprint: null,
    story: null,
    outcome: null,
    notes: null,
    decisions: [],
    learnings: [],
    pending: [],
    files: [],
    errors: [],
    limit: 10,
    json: false,
  };
  for (const arg of args) {
    if (arg === '--json') opts.json = true;
    else if (arg.startsWith('--title=')) opts.title = arg.slice('--title='.length);
    else if (arg.startsWith('--topics=')) opts.topics = arg.slice('--topics='.length).split(',').map((s) => s.trim()).filter(Boolean);
    else if (arg.startsWith('--phase=')) opts.phase = arg.slice('--phase='.length);
    else if (arg.startsWith('--sprint=')) opts.sprint = arg.slice('--sprint='.length);
    else if (arg.startsWith('--story=')) opts.story = arg.slice('--story='.length);
    else if (arg.startsWith('--outcome=')) opts.outcome = arg.slice('--outcome='.length);
    else if (arg.startsWith('--notes=')) opts.notes = arg.slice('--notes='.length);
    else if (arg.startsWith('--decision=')) opts.decisions.push(arg.slice('--decision='.length));
    else if (arg.startsWith('--learning=')) opts.learnings.push(arg.slice('--learning='.length));
    else if (arg.startsWith('--pending=')) opts.pending.push(arg.slice('--pending='.length));
    else if (arg.startsWith('--file=')) opts.files.push(arg.slice('--file='.length));
    else if (arg.startsWith('--error=')) opts.errors.push(arg.slice('--error='.length));
    else if (arg.startsWith('--limit=')) opts.limit = parseInt(arg.slice('--limit='.length), 10);
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

function cmdSave(cwd, opts) {
  const result = sl.writeSessionLog(cwd, {
    title: opts.title,
    topics: opts.topics,
    phase: opts.phase,
    sprint: opts.sprint,
    story: opts.story,
    outcome: opts.outcome,
    notes: opts.notes,
    decisions: opts.decisions,
    learnings: opts.learnings,
    pending: opts.pending,
    filesModified: opts.files,
    errors: opts.errors,
  });
  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  console.log();
  console.log(`💾 Session saved: ${result.path}`);
  if (opts.topics.length > 0) console.log(`   Topics:    ${opts.topics.join(', ')}`);
  if (opts.sprint) console.log(`   Sprint:    ${opts.sprint}`);
  if (opts.decisions.length > 0) console.log(`   Decisions: ${opts.decisions.length}`);
  if (opts.learnings.length > 0) console.log(`   Learnings: ${opts.learnings.length}`);
  if (opts.pending.length > 0) console.log(`   Pending:   ${opts.pending.length}`);
  if (opts.files.length > 0) console.log(`   Files:     ${opts.files.length}`);
  console.log();
}

function cmdList(cwd, opts) {
  const logs = sl.listSessionLogs(cwd, { limit: opts.limit });
  if (opts.json) {
    console.log(JSON.stringify(logs, null, 2));
    return;
  }
  if (logs.length === 0) {
    console.log(`\n   No session logs found.\n`);
    return;
  }
  console.log();
  for (const log of logs) {
    const topics = Array.isArray(log.topics) ? log.topics.join(', ') : '';
    console.log(`   ${log.date}  ${log.slug}${topics ? `  [${topics}]` : ''}`);
    if (log.outcome) console.log(`     ${log.outcome}`);
  }
  console.log();
}

function cmdSearch(cwd, opts, query) {
  const hits = sl.searchSessionLogs(cwd, query, { limit: opts.limit });
  if (opts.json) {
    console.log(JSON.stringify(hits, null, 2));
    return;
  }
  if (hits.length === 0) {
    console.log(`\n   No session logs match '${query}'.\n`);
    return;
  }
  console.log();
  console.log(`🔍 ${hits.length} session log(s) matching '${query}':`);
  console.log();
  for (const hit of hits) {
    const topics = Array.isArray(hit.topics) ? hit.topics.join(', ') : '';
    console.log(`   ${hit.date}  ${hit.slug}${topics ? `  [${topics}]` : ''}`);
    if (hit.outcome) console.log(`     ${hit.outcome}`);
  }
  console.log();
}

function cmdShow(cwd, opts, filename) {
  const log = sl.readSessionLog(cwd, filename);
  if (!log) {
    console.error(`❌ Session log '${filename}' not found.`);
    process.exit(1);
  }
  if (opts.json) {
    console.log(JSON.stringify(log, null, 2));
    return;
  }
  console.log(log.body);
}

module.exports = function session(args) {
  const cwd = process.cwd();
  ensureRihal(cwd);
  const opts = parseArgs(args);
  const [sub, ...rest] = opts.positional;

  if (!sub) {
    console.error(`Usage: rihal-code session <save|list|search|show> [flags]`);
    process.exit(1);
  }

  switch (sub) {
    case 'save':
      return cmdSave(cwd, opts);
    case 'list':
      return cmdList(cwd, opts);
    case 'search':
      if (!rest[0]) {
        console.error(`Usage: rihal-code session search <query>`);
        process.exit(1);
      }
      return cmdSearch(cwd, opts, rest[0]);
    case 'show':
      if (!rest[0]) {
        console.error(`Usage: rihal-code session show <filename>`);
        process.exit(1);
      }
      return cmdShow(cwd, opts, rest[0]);
    default:
      console.error(`Unknown subcommand: ${sub}`);
      process.exit(1);
  }
};
