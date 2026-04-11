/**
 * rihal-code bug — mid-sprint bug intake without derailing current work.
 *
 * Captures a bug as a markdown file under .rihal/artifacts/bugs/pending/
 * and registers it in the active sprint's state.json via the shared
 * sprint-state library.
 *
 * Usage:
 *   rihal-code bug <title>                    new bug, prompts for severity/area (guided)
 *   rihal-code bug <title> --severity=high --area=frontend --story=story-1-1
 *   rihal-code bug list                       list all pending bugs
 *   rihal-code bug list --severity=high       filter by severity
 *   rihal-code bug list --area=frontend       filter by area
 *   rihal-code bug list --sprint=sprint-01    filter by sprint
 *   rihal-code bug resolve <bug-id>           move pending → done, mark resolved
 *   rihal-code bug show <bug-id>              show one bug's full content
 *
 * All writes go through writeFileAtomic / sprint-state's atomic helpers
 * so Ctrl+C mid-write can't corrupt either the markdown file or the
 * sprint state.
 */

const fs = require('fs');
const path = require('path');
const { writeFileAtomic } = require('./lib/fsutil.cjs');
const {
  getActiveSprint,
  getCurrentPhase,
  addBugToSprint,
  resolveBugInSprint,
  getInProgressStories,
  readSprintState,
  listSprints,
  listPhases,
} = require('./lib/sprint-state.cjs');
const { loadConfig } = require('./lib/config.cjs');

const VALID_SEVERITIES = new Set(['critical', 'high', 'medium', 'low']);
const VALID_AREAS = new Set([
  'frontend',
  'backend',
  'ml',
  'infra',
  'devops',
  'docs',
  'qa',
  'design',
  'unknown',
]);

// ---------- Paths ----------

function bugsRoot(cwd) {
  return path.join(cwd, '.rihal', 'artifacts', 'bugs');
}

function pendingDir(cwd) {
  return path.join(bugsRoot(cwd), 'pending');
}

function doneDir(cwd) {
  return path.join(bugsRoot(cwd), 'done');
}

function slugify(input) {
  return (input || 'bug')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'bug';
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Generate a unique, sortable bug id like "bug-2026-04-11-login-button-mobile".
 * Appends a counter on collision so multiple bugs on the same day with the
 * same slug still get unique ids.
 */
function generateBugId(cwd, title) {
  const base = `bug-${today()}-${slugify(title)}`;
  fs.mkdirSync(pendingDir(cwd), { recursive: true });
  fs.mkdirSync(doneDir(cwd), { recursive: true });

  const taken = new Set([
    ...fs.readdirSync(pendingDir(cwd)).map((f) => f.replace(/\.md$/, '')),
    ...fs.readdirSync(doneDir(cwd)).map((f) => f.replace(/\.md$/, '')),
  ]);

  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

// ---------- Markdown formatting ----------

/**
 * Build the bug markdown file content. Uses YAML frontmatter so
 * downstream tools (list, resolve, github-sync) can parse it without
 * regex gymnastics.
 */
function formatBugMarkdown({
  id,
  title,
  description,
  severity,
  area,
  phase,
  sprint,
  story_ref,
  reporter,
  found_in,
  component,
  date,
}) {
  const lines = [
    `---`,
    `id: ${id}`,
    `title: ${yamlEscape(title)}`,
    `severity: ${severity}`,
    `area: ${area}`,
    `status: pending`,
    `date: ${date}`,
  ];
  if (phase) lines.push(`phase: ${phase}`);
  if (sprint) lines.push(`sprint: ${sprint}`);
  if (story_ref) lines.push(`story_ref: ${story_ref}`);
  if (reporter) lines.push(`reporter: ${yamlEscape(reporter)}`);
  lines.push(`---`, ``);

  lines.push(`# [Bug] ${title}`, ``);
  lines.push(`**Severity:** ${severity}   **Area:** ${area}   **Status:** 📋 Pending`, ``);
  if (sprint) lines.push(`**Found in:** \`${sprint}\``);
  if (story_ref) lines.push(`**Linked story:** \`${story_ref}\``);
  if (found_in) lines.push(`**Environment:** ${found_in}`);
  if (component) lines.push(`**Component:** ${component}`);
  lines.push('');

  lines.push(`## 🐛 Description`, ``);
  lines.push(description || '_No description provided._', ``);

  lines.push(`## 🔄 Steps to reproduce`, ``);
  lines.push(`1. _Fill in step 1_`);
  lines.push(`2. _Fill in step 2_`);
  lines.push(`3. _Fill in step 3_`, ``);

  lines.push(`## ✅ Expected behavior`, ``);
  lines.push(`_What should happen._`, ``);

  lines.push(`## ❌ Actual behavior`, ``);
  lines.push(`_What happens instead._`, ``);

  lines.push(`## 📎 Notes`, ``);
  lines.push(`_Screenshots, logs, stack traces, relevant file paths._`, ``);

  lines.push(`---`, ``);
  lines.push(`<sub>Captured by \`rihal-code bug\` on ${date}.</sub>`, ``);

  return lines.join('\n');
}

function yamlEscape(s) {
  if (typeof s !== 'string') return String(s);
  if (/[:\[\]{},&*#?|<>=!%@`"']/.test(s) || s.includes('\n')) {
    return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return s;
}

// ---------- Frontmatter parsing (for list/resolve) ----------

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const fm = {};
  for (const line of match[1].split(/\r?\n/)) {
    const m = line.match(/^([\w_-]+)\s*:\s*(.*)$/);
    if (m) fm[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return fm;
}

// ---------- Arg parsing ----------

function parseArgs(args) {
  const opts = {
    severity: null,
    area: null,
    story: null,
    sprint: null,
    reporter: null,
    description: null,
    positional: [],
  };
  for (const arg of args) {
    if (arg.startsWith('--severity=')) opts.severity = arg.slice('--severity='.length);
    else if (arg.startsWith('--area=')) opts.area = arg.slice('--area='.length);
    else if (arg.startsWith('--story=')) opts.story = arg.slice('--story='.length);
    else if (arg.startsWith('--sprint=')) opts.sprint = arg.slice('--sprint='.length);
    else if (arg.startsWith('--reporter=')) opts.reporter = arg.slice('--reporter='.length);
    else if (arg.startsWith('--description=')) opts.description = arg.slice('--description='.length);
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

function validateSeverity(s) {
  if (!VALID_SEVERITIES.has(s)) {
    console.error(`❌ Invalid severity '${s}'.`);
    console.error(`   Valid: ${[...VALID_SEVERITIES].join(', ')}`);
    process.exit(1);
  }
}

function validateArea(a) {
  if (!VALID_AREAS.has(a)) {
    console.error(`❌ Invalid area '${a}'.`);
    console.error(`   Valid: ${[...VALID_AREAS].join(', ')}`);
    process.exit(1);
  }
}

// ---------- Subcommands ----------

/**
 * Create a new bug. Writes the markdown file to pending/ and registers
 * the bug in the active sprint's state.json (if one is active).
 */
function cmdCreate(cwd, title, opts) {
  const config = loadConfig(cwd);
  const severity = opts.severity || 'medium';
  const area = opts.area || 'unknown';
  validateSeverity(severity);
  validateArea(area);

  const phase = getCurrentPhase(cwd);
  // Sprint + story inference — use explicit flags, fall back to active sprint state
  let sprintId = opts.sprint || null;
  let storyRef = opts.story || null;

  if (!sprintId && phase) {
    sprintId = getActiveSprint(cwd, phase);
  }

  if (!storyRef && phase && sprintId) {
    const inProgress = getInProgressStories(cwd, phase, sprintId);
    if (inProgress.length === 1) {
      // Unambiguous — one in-flight story
      storyRef = inProgress[0].id;
    }
    // If multiple in-flight, leave unlinked; the user can pass --story explicitly
  }

  const id = generateBugId(cwd, title);
  const date = today();
  const reporter = opts.reporter || config.user_name || 'Team';

  const content = formatBugMarkdown({
    id,
    title,
    description: opts.description,
    severity,
    area,
    phase,
    sprint: sprintId,
    story_ref: storyRef,
    reporter,
    date,
  });

  fs.mkdirSync(pendingDir(cwd), { recursive: true });
  const target = path.join(pendingDir(cwd), `${id}.md`);
  writeFileAtomic(target, content);

  // Register in sprint state if there's an active sprint
  let registered = false;
  if (phase && sprintId) {
    try {
      addBugToSprint(cwd, phase, sprintId, {
        id,
        title,
        severity,
        area,
        story_ref: storyRef,
      });
      registered = true;
    } catch (err) {
      // Sprint doesn't exist yet — file is still written, state update skipped
      console.warn(`   ⚠ Could not register in sprint state: ${err.message}`);
    }
  }

  const rel = path.relative(cwd, target);
  console.log(`\n🐛 Bug captured: ${id}`);
  console.log(`   Severity: ${severity}`);
  console.log(`   Area:     ${area}`);
  if (sprintId) console.log(`   Sprint:   ${sprintId}${registered ? ' (linked to sprint state)' : ''}`);
  if (storyRef) console.log(`   Story:    ${storyRef}`);
  console.log(`   File:     ${rel}`);

  if (severity === 'critical') {
    console.log();
    console.log(`   ⚠ This is a CRITICAL bug. Consider pausing current work:`);
    console.log(`     rihal-code sprint story <current-story-id> blocked`);
    console.log(`     /rihal:pause   (from your editor)`);
  }
  console.log();

  return { id, path: rel };
}

/**
 * List all pending bugs with filters. Reads frontmatter only — fast.
 */
function cmdList(cwd, opts) {
  const dir = pendingDir(cwd);
  if (!fs.existsSync(dir)) {
    console.log(`\n   No pending bugs. (.rihal/artifacts/bugs/pending/ is empty)`);
    console.log();
    return;
  }

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort().reverse();

  const bugs = [];
  for (const file of files) {
    try {
      // Read first 2KB for frontmatter only
      const full = path.join(dir, file);
      const fd = fs.openSync(full, 'r');
      const buf = Buffer.alloc(2048);
      const bytes = fs.readSync(fd, buf, 0, 2048, 0);
      fs.closeSync(fd);
      const chunk = buf.toString('utf8', 0, bytes);
      const fm = parseFrontmatter(chunk);
      bugs.push({ file, ...fm });
    } catch {
      // skip unreadable
    }
  }

  // Apply filters
  let filtered = bugs;
  if (opts.severity) {
    validateSeverity(opts.severity);
    filtered = filtered.filter((b) => b.severity === opts.severity);
  }
  if (opts.area) {
    validateArea(opts.area);
    filtered = filtered.filter((b) => b.area === opts.area);
  }
  if (opts.sprint) {
    filtered = filtered.filter((b) => b.sprint === opts.sprint);
  }

  if (filtered.length === 0) {
    console.log(`\n   No pending bugs match the filter.`);
    console.log();
    return;
  }

  // Group by severity
  const bySeverity = { critical: [], high: [], medium: [], low: [] };
  for (const bug of filtered) {
    const sev = bug.severity || 'medium';
    (bySeverity[sev] || bySeverity.medium).push(bug);
  }

  console.log(`\n🐛 Pending bugs (${filtered.length})\n`);
  for (const sev of ['critical', 'high', 'medium', 'low']) {
    if (bySeverity[sev].length === 0) continue;
    const symbol = sev === 'critical' ? '🔴' : sev === 'high' ? '🟠' : sev === 'medium' ? '🟡' : '🟢';
    console.log(`${symbol} ${sev.toUpperCase()} (${bySeverity[sev].length})`);
    for (const bug of bySeverity[sev]) {
      const parts = [];
      if (bug.area && bug.area !== 'unknown') parts.push(bug.area);
      if (bug.sprint) parts.push(bug.sprint);
      if (bug.story_ref) parts.push(`→ ${bug.story_ref}`);
      const meta = parts.length > 0 ? `  [${parts.join(' · ')}]` : '';
      console.log(`   • ${bug.id}${meta}`);
      if (bug.title && bug.title !== bug.id) console.log(`     ${bug.title}`);
    }
    console.log();
  }
}

/**
 * Resolve a bug: move file from pending/ to done/ and mark resolved in
 * sprint state if it was registered.
 */
function cmdResolve(cwd, bugId) {
  const src = path.join(pendingDir(cwd), `${bugId}.md`);
  if (!fs.existsSync(src)) {
    console.error(`❌ Bug not found: ${bugId}`);
    console.error(`   Looked in: ${path.relative(cwd, src)}`);
    process.exit(1);
  }

  // Read to grab frontmatter so we know which sprint to update
  const content = fs.readFileSync(src, 'utf8');
  const fm = parseFrontmatter(content);

  // Rewrite status in frontmatter to resolved
  const updatedContent = content.replace(/^status:\s*pending$/m, 'status: resolved');

  fs.mkdirSync(doneDir(cwd), { recursive: true });
  const dest = path.join(doneDir(cwd), `${bugId}.md`);
  writeFileAtomic(dest, updatedContent);
  fs.unlinkSync(src);

  // Update sprint state if the bug was registered there
  let stateUpdated = false;
  if (fm.phase && fm.sprint) {
    const result = resolveBugInSprint(cwd, fm.phase, fm.sprint, bugId);
    if (result) stateUpdated = true;
  }

  console.log(`\n✅ Bug resolved: ${bugId}`);
  console.log(`   Moved to: ${path.relative(cwd, dest)}`);
  if (stateUpdated) console.log(`   Sprint state updated: ${fm.sprint}`);
  console.log();
}

/**
 * Show full content of one bug (from pending or done).
 */
function cmdShow(cwd, bugId) {
  const candidates = [
    path.join(pendingDir(cwd), `${bugId}.md`),
    path.join(doneDir(cwd), `${bugId}.md`),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      console.log(fs.readFileSync(p, 'utf8'));
      return;
    }
  }
  console.error(`❌ Bug not found: ${bugId}`);
  process.exit(1);
}

// ---------- Dispatch ----------

module.exports = function bug(args) {
  const cwd = process.cwd();
  ensureRihal(cwd);
  const opts = parseArgs(args);
  const [sub, ...rest] = opts.positional;

  // If no subcommand, show usage
  if (!sub) {
    console.log(`\nrihal-code bug — mid-sprint bug intake\n`);
    console.log(`Usage:`);
    console.log(`  rihal-code bug <title> [flags]              capture a new bug`);
    console.log(`  rihal-code bug list [--severity=] [--area=] list pending bugs`);
    console.log(`  rihal-code bug resolve <bug-id>             mark resolved`);
    console.log(`  rihal-code bug show <bug-id>                show full content`);
    console.log();
    console.log(`Flags for 'bug <title>':`);
    console.log(`  --severity=critical|high|medium|low   default: medium`);
    console.log(`  --area=frontend|backend|ml|infra|...  default: unknown`);
    console.log(`  --story=<story-id>                    link to specific story`);
    console.log(`  --sprint=<sprint-id>                  override auto-detected sprint`);
    console.log(`  --description='<multi-line>'          pre-fill description`);
    console.log(`  --reporter='<name>'                   default: config user_name`);
    console.log();
    return;
  }

  // Subcommand routing
  switch (sub) {
    case 'list':
      return cmdList(cwd, opts);
    case 'resolve':
      if (!rest[0]) {
        console.error(`Usage: rihal-code bug resolve <bug-id>`);
        process.exit(1);
      }
      return cmdResolve(cwd, rest[0]);
    case 'show':
      if (!rest[0]) {
        console.error(`Usage: rihal-code bug show <bug-id>`);
        process.exit(1);
      }
      return cmdShow(cwd, rest[0]);
    default:
      // Not a subcommand → treat everything as the bug title
      // Reconstruct: sub is the first positional, rest is the rest
      const title = [sub, ...rest].join(' ');
      return cmdCreate(cwd, title, opts);
  }
};
