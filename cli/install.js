/**
 * cli/install.js — Rihal v2 file-shipping installer (prototype)
 *
 * Compared to the v1 `cli/init.js` (2918 lines of inline string templates),
 * this installer copies real files from the package's `rihal/` directory
 * into a target project. The same file-shipping pattern (no npm deps).
 *
 * Target layout in the user's project:
 *
 *   .rihal/
 *     _config/
 *       manifest.yaml          (version + install date + installed modules)
 *       agent-manifest.csv     (auto-generated from rihal/agents/*.md frontmatter)
 *       files-manifest.csv     (SHA256 hashes for update/doctor)
 *     config.yaml              (user_name, project_name, language, mode)
 *     workflows/
 *       council.md
 *     references/
 *       council-protocol.md
 *       commit-conventions.md
 *     bin/
 *       rihal-tools.cjs
 *       lib/council-panel.cjs
 *   .claude/
 *     agents/
 *       rihal-sadiq.md
 *       rihal-waleed.md
 *       rihal-fatima.md
 *     commands/
 *       rihal/
 *         council.md
 *   .planning/
 *     council-sessions/        (empty dir, populated on first council run)
 *
 * Zero external dependencies. Pure Node stdlib.
 *
 * Usage:
 *   node cli/install.js [target-project-dir]
 *   node cli/install.js --help
 *
 * Flags:
 *   --force           overwrite existing files without prompting
 *   --yes             non-interactive, accept defaults
 *   --user <name>     set user_name in config.yaml (default: $USER)
 *   --project <name>  set project_name in config.yaml (default: basename of target)
 *   --language <lang> set communication_language (default: English)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

const PACKAGE_ROOT = path.resolve(__dirname, '..');
const SOURCE_ROOT = path.join(PACKAGE_ROOT, 'rihal');

/**
 * Parse command-line args into a normalized options object.
 */
function parseArgs(argv) {
  const opts = {
    target: process.cwd(),
    targetProvided: false,
    force: false,
    reset: false,
    yes: false,
    userName: os.userInfo().username || 'User',
    projectName: null,
    language: 'English',
    mode: 'guided',
    ide: 'claude',  // claude, cursor, gemini (copilot = TODO)
    help: false,
    modules: [],  // --module core --module execution or empty = all
    // #189 — planning commit policy. null = ask interactively (or default true under --yes).
    // Set true by --commit-planning, false by --no-commit-planning or --ignore-planning.
    commitPlanning: null,
  };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg === '--force') opts.force = true;
    else if (arg === '--reset') opts.reset = true;
    else if (arg === '--yes' || arg === '-y') opts.yes = true;
    else if (arg === '--user') opts.userName = argv[++i];
    else if (arg === '--project') opts.projectName = argv[++i];
    else if (arg === '--language') opts.language = argv[++i];
    else if (arg === '--mode') opts.mode = argv[++i];
    else if (arg === '--ide') opts.ide = argv[++i];
    else if (arg === '--module') opts.modules.push(argv[++i]);
    else if (arg === '--commit-planning') opts.commitPlanning = true;
    else if (arg === '--no-commit-planning' || arg === '--ignore-planning') opts.commitPlanning = false;
    else if (!arg.startsWith('--')) positional.push(arg);
  }
  if (positional[0]) {
    opts.target = path.resolve(positional[0]);
    opts.targetProvided = true;
  }
  if (!opts.projectName) opts.projectName = path.basename(opts.target);
  return opts;
}

/**
 * Resolve commit-planning preference — CLI flag wins, then interactive
 * prompt (when TTY + not --yes), else GSD-style default: true.
 * #189.
 */
async function resolveCommitPlanning(opts) {
  if (opts.commitPlanning !== null) return opts.commitPlanning;
  if (opts.yes || !process.stdin.isTTY) return true; // non-interactive default

  const readline = require('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const prompt = (q) => new Promise(r => rl.question(q, a => r(a)));
  console.log('');
  console.log('📋 .planning/ holds PRDs, roadmaps, sprints, SUMMARY files.');
  console.log('   Commit them to git, or keep them local?');
  console.log('');
  console.log('   [Y] Commit — collaborators see the same plans  (default, recommended)');
  console.log('   [n] Gitignore — planning stays local  (good for sensitive PRDs)');
  console.log('');
  const answer = (await prompt('   Commit planning artifacts? [Y/n]: ')).trim().toLowerCase();
  rl.close();
  return !(answer === 'n' || answer === 'no');
}

function printHelp() {
  console.log(`
Rihal Code installer

Usage:
  node cli/install.js [target-dir]

Options:
  --force            overwrite existing files without prompting
  --reset            with --force, also delete config.yaml and state.json to re-init
  --yes              non-interactive, accept defaults
  --user <name>      set user_name in config.yaml (default: $USER)
  --project <name>   set project_name (default: basename of target-dir)
  --language <lang>  set communication_language (default: English)
  --mode <guided|yolo> default mode (default: guided)
  --ide <name>       target IDE (claude, cursor, gemini; default: claude)
  --help             this text

Installs (IDE-specific):
  claude:  target/.rihal/          config, workflows, references, bin
           target/.claude/agents/  first-class Rihal subagents
           target/.claude/commands/rihal/  slash commands
  cursor:  target/.cursor/rules/rihal/    Cursor-specific rules + agents
  gemini:  target/.gemini/rihal/          Gemini CLI commands + agents
  target/.planning/       artifact output dir (all IDEs)
`);
}

/**
 * Get install paths for the target IDE.
 * Returns { agentsDir, commandsDir, workflowsDir, referencesDir, binDir }
 */
function getPathsForIde(ide, target) {
  switch (ide) {
    case 'claude':
      return {
        agentsDir: path.join(target, '.claude', 'agents'),
        commandsDir: path.join(target, '.claude', 'commands', 'rihal'),
        workflowsDir: path.join(target, '.rihal', 'workflows'),
        referencesDir: path.join(target, '.rihal', 'references'),
        binDir: path.join(target, '.rihal', 'bin'),
      };
    case 'cursor':
      return {
        agentsDir: path.join(target, '.cursor', 'rules', 'rihal', 'agents'),
        commandsDir: path.join(target, '.cursor', 'rules', 'rihal', 'commands'),
        workflowsDir: path.join(target, '.rihal', 'workflows'),
        referencesDir: path.join(target, '.rihal', 'references'),
        binDir: path.join(target, '.rihal', 'bin'),
      };
    case 'gemini':
      return {
        agentsDir: path.join(target, '.gemini', 'rihal', 'agents'),
        commandsDir: path.join(target, '.gemini', 'rihal', 'commands'),
        workflowsDir: path.join(target, '.rihal', 'workflows'),
        referencesDir: path.join(target, '.rihal', 'references'),
        binDir: path.join(target, '.rihal', 'bin'),
      };
    default:
      throw new Error(`Unknown IDE: ${ide}. Supported: claude, cursor, gemini`);
  }
}

/**
 * Recursively walk a directory and return absolute file paths.
 */
function walkFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

/**
 * Recursive directory copy (pure Node stdlib, no deps).
 */
function copyDirRecursive(source, dest) {
  if (!fs.existsSync(source)) return;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const srcPath = path.join(source, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDirRecursive(srcPath, destPath);
    else if (entry.isFile()) fs.copyFileSync(srcPath, destPath);
  }
}

/**
 * Seed .planning/ with starter ROADMAP.md + STATE.md + PROJECT.md so
 * workflows work immediately after install. User can /rihal:sprint-planning
 * on a fresh install without manual setup.
 *
 * Only seeds if .planning/ROADMAP.md doesn't already exist (preserves user data).
 */
function seedStarterPlanning(target, projectName) {
  const planningDir = path.join(target, '.planning');
  const roadmapPath = path.join(planningDir, 'ROADMAP.md');
  const statePath = path.join(planningDir, 'STATE.md');
  const projectPath = path.join(planningDir, 'PROJECT.md');

  if (fs.existsSync(roadmapPath)) return false; // preserve existing

  fs.mkdirSync(planningDir, { recursive: true });

  const today = new Date().toISOString().slice(0, 10);
  const name = projectName || path.basename(target);

  fs.writeFileSync(projectPath,
    `# ${name}\n\n` +
    `**One-line:** Describe what this project is in one sentence.\n\n` +
    `## Vision\n\n` +
    `What this project delivers and who it serves.\n\n` +
    `## Stack\n\n` +
    `- Language/framework\n- Key dependencies\n- Deployment target\n`
  );

  fs.writeFileSync(roadmapPath,
    `# ${name} — Roadmap\n\n` +
    `**Milestone: M1 — Initial Delivery** (v1.0)\n` +
    `Started: ${today} · Current\n\n` +
    `---\n\n` +
    `## Phase 01 — Setup & Scaffolding\n\n` +
    `**Goal:** Lay the foundation. Replace this with your first phase when ready.\n\n` +
    `**Status:** Planned\n\n` +
    `**Acceptance:** Working dev environment; first feature in progress.\n\n` +
    `---\n\n` +
    `## Backlog\n\n` +
    `Ideas and future phases go here.\n`
  );

  fs.writeFileSync(statePath,
    `# ${name} — State\n\n` +
    `**Last updated:** ${today}\n` +
    `**Milestone:** M1 — Initial Delivery\n` +
    `**Current phase:** 01 — Setup & Scaffolding\n` +
    `**Branch:** main\n\n` +
    `---\n\n` +
    `## Decisions\n\n_None yet._\n\n` +
    `## Blockers\n\n_None._\n\n` +
    `## Next Action\n\nSay "plan a sprint" or run \`/rihal:sprint-planning\` to break Phase 01 into stories.\n`
  );

  // Also pre-seed .rihal/state.json with Phase 01 so sprint tools work
  // immediately (otherwise auto-init in rihal-tools.cjs creates state with
  // empty phases[], requiring manual set-phase before sprint add).
  const rihalStateJson = path.join(target, '.rihal', 'state.json');
  if (!fs.existsSync(rihalStateJson)) {
    const now = new Date().toISOString();
    const state = {
      version: '1',
      project: name,
      created: now,
      updated: now,
      current_phase: '01',
      current_plan: 0,
      current_sprint: null,
      milestone: 'M1 — Initial Delivery',
      phases: [
        { id: '01', name: 'Setup & Scaffolding', status: 'planned' }
      ],
      executions: [],
      decisions: [],
      blockers: [],
      council_sessions: [],
      chains: [],
      workstreams: [],
      active_workstream: null,
      last_session: null,
      velocity_history: [],
    };
    fs.mkdirSync(path.dirname(rihalStateJson), { recursive: true });
    fs.writeFileSync(rihalStateJson, JSON.stringify(state, null, 2) + '\n');
  }

  return true;
}

/**
 * Ensure the target project's .gitignore has the rcode-managed block.
 *
 * Idempotent via a sentinel comment line. On first install, appends a block
 * that separates:
 *   - installed methodology files (ignored; re-install to refresh)
 *   - user's project config, state, and planning artifacts (committable)
 *
 * If the user already has a block (marker present) we leave their customizations
 * alone. This function is best-effort — never throws. A missing .gitignore
 * is created. A read/write error is logged and install continues.
 *
 * Returns: { action: 'created' | 'appended' | 'already-present' | 'skipped-error' }
 */
function ensureRcodeGitignore(target, options = {}) {
  const commitPlanning = options.commitPlanning !== false; // default true
  const BEGIN = '# ===== rcode-managed gitignore block (npx @hanzlaa/rcode install) =====';
  const END   = '# ===== end rcode-managed gitignore block =====';

  const lines = [
    '',
    BEGIN,
    '# Added automatically on first rcode install. Idempotent — safe to re-run.',
    '# Edit `commit_planning` in .rihal/config.yaml to flip planning-artifact tracking.',
    '',
    '# Installed methodology files (regenerate with: npx @hanzlaa/rcode install)',
    '.claude/',
    '.rihal/bin/',
    '.rihal/workflows/',
    '.rihal/references/',
    '.rihal/commands/',
    '.rihal/skills/',
    '',
    '# Pulled Rihal brain content (refresh with: rcode brain pull)',
    '.rihal/brain/rihal-github/',
    '.rihal/brain/rihal-docs/',
    '.rihal/brain/best-practices/',
    '',
    '# Runtime noise',
    '.rihal/state.json.lock',
    '.planning/debug/',
    '.planning/_backup/',
  ];

  if (!commitPlanning) {
    lines.push(
      '',
      '# Planning artifacts — kept local (commit_planning: false)',
      '.planning/'
    );
  }

  lines.push(
    '',
    '# What you DO commit:',
    '#   .rihal/config.yaml        - project mode/language/profile/commit_planning',
    '#   .rihal/state.json         - decisions, roadmap pointer, blockers',
    '#   .rihal/brain/sources.yaml - brain source manifest',
    commitPlanning
      ? '#   .planning/                - PRD, roadmap, sprints, SUMMARY.md files'
      : '#   (planning artifacts are NOT committed — see commit_planning in config)',
    END,
    ''
  );
  const BLOCK = lines.join('\n');

  const gitignorePath = path.join(target, '.gitignore');
  try {
    if (!fs.existsSync(gitignorePath)) {
      fs.writeFileSync(gitignorePath, BLOCK);
      return { action: 'created' };
    }
    const existing = fs.readFileSync(gitignorePath, 'utf8');
    // Replace existing rcode block using indexOf (regex escaping on the
    // sentinel is fiddly — indexOf is deterministic and easier to audit).
    function spliceBlock(text, newBlock) {
      const start = text.indexOf(BEGIN);
      if (start < 0) return null;
      const endIdx = text.indexOf(END, start);
      if (endIdx < 0) return null;
      let sliceStart = start;
      if (sliceStart > 0 && text[sliceStart - 1] === '\n') sliceStart -= 1;
      let sliceEnd = endIdx + END.length;
      if (text[sliceEnd] === '\n') sliceEnd += 1;
      return text.slice(0, sliceStart) + newBlock + text.slice(sliceEnd);
    }
    if (existing.includes(BEGIN)) {
      const rewritten = spliceBlock(existing, BLOCK);
      if (rewritten !== null && rewritten !== existing) {
        fs.writeFileSync(gitignorePath, rewritten);
        return { action: 'updated' };
      }
      return { action: 'already-present' };
    }
    fs.writeFileSync(gitignorePath, existing + BLOCK);
    return { action: 'appended' };
  } catch (err) {
    return { action: 'skipped-error', error: err.message };
  }
}

/**
 * Install brain scaffold (sources.yaml + README.md) into .rihal/brain/ on target.
 * Actual brain content lands after `brain pull` runs.
 * Closes #188 — previously the package's rihal/brain/sources.yaml was never
 * copied to the target at all, leaving brain pull permanently broken.
 */
function installBrainScaffold(packageRoot, target) {
  const srcDir = path.join(packageRoot, 'rihal', 'brain');
  const destDir = path.join(target, '.rihal', 'brain');
  fs.mkdirSync(destDir, { recursive: true });
  let copied = 0;
  for (const name of ['sources.yaml', 'README.md']) {
    const src = path.join(srcDir, name);
    const dest = path.join(destDir, name);
    if (fs.existsSync(src) && !fs.existsSync(dest)) {
      fs.copyFileSync(src, dest);
      copied++;
    }
  }
  // Also pre-seed the best-practices subfolder from the package's
  // rihal/skills/_shared/ so a fresh install has working brain content
  // immediately, even before brain pull runs against real upstream URLs.
  const sharedSrc = path.join(packageRoot, 'rihal', 'skills', '_shared');
  if (fs.existsSync(sharedSrc)) {
    const bpDest = path.join(destDir, 'best-practices');
    fs.mkdirSync(bpDest, { recursive: true });
    for (const entry of fs.readdirSync(sharedSrc, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith('.md')) {
        const dest = path.join(bpDest, entry.name);
        if (!fs.existsSync(dest)) {
          fs.copyFileSync(path.join(sharedSrc, entry.name), dest);
          copied++;
        }
      }
    }
  }
  return copied;
}

/**
 * Install v1-style skills into the target project.
 *
 * User-facing skills  → .claude/skills/rihal-{name}   (phrase-activated, visible as slash commands)
 * Internal skills     → .rihal/skills/rihal-{name}    (utility libs called by other skills, NOT in
 *                                                       .claude/skills/ so they don't pollute the menu)
 *
 * A skill is marked internal by adding `internal: true` to its SKILL.md frontmatter.
 */
function installSkills(packageRoot, target) {
  const skillsSource = path.join(packageRoot, 'rihal/skills');
  const skillsDest = path.join(target, '.claude/skills');
  const internalDest = path.join(target, '.rihal/skills');

  if (!fs.existsSync(skillsSource)) return 0;
  fs.mkdirSync(skillsDest, { recursive: true });
  fs.mkdirSync(internalDest, { recursive: true });

  let count = 0;

  function isInternalSkill(skillDir) {
    const skillMd = path.join(skillDir, 'SKILL.md');
    if (!fs.existsSync(skillMd)) return false;
    const text = fs.readFileSync(skillMd, 'utf8');
    return /^internal:\s*true\s*$/m.test(text);
  }

  function walkForSkills(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const src = path.join(dir, entry.name);
      const hasSkillMd = fs.existsSync(path.join(src, 'SKILL.md'));
      if (hasSkillMd) {
        const destName = entry.name.startsWith('rihal-')
          ? entry.name
          : `rihal-${entry.name}`;
        const dest = isInternalSkill(src)
          ? path.join(internalDest, destName)   // internal → .rihal/skills/
          : path.join(skillsDest, destName);     // user-facing → .claude/skills/
        copyDirRecursive(src, dest);
        count++;
      } else {
        walkForSkills(src);
      }
    }
  }

  for (const bucket of ['agents', 'actions', 'core']) {
    walkForSkills(path.join(skillsSource, bucket));
  }

  return count;
}

/**
 * Parse YAML frontmatter from a markdown file. Returns { frontmatter, body }.
 * Minimal subset — supports `key: value` and quoted strings only. Good
 * enough for our agent and command files.
 */
function parseFrontmatter(text) {
  if (!text.startsWith('---\n')) return { frontmatter: {}, body: text };
  const end = text.indexOf('\n---\n', 4);
  if (end === -1) return { frontmatter: {}, body: text };
  const block = text.slice(4, end);
  const body = text.slice(end + 5);
  const fm = {};
  for (const raw of block.split('\n')) {
    const line = raw.replace(/^#.*$/, '').trimEnd();
    if (!line) continue;
    const colonAt = line.indexOf(':');
    if (colonAt === -1) continue;
    const key = line.slice(0, colonAt).trim();
    let val = line.slice(colonAt + 1).trim();
    if (!key || !val) continue;
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
    fm[key] = val;
  }
  return { frontmatter: fm, body };
}

/**
 * Build the list of (sourcePath, targetRelativePath) install pairs. Each
 * entry describes one file we will copy and where it lands in the target
 * project. Returning the list up-front lets us do a dry-run or hash-check
 * pass before touching the disk.
 *
 * For cursor IDE, converts command files from .md to .mdc format.
 */
function buildInstallPlan(ide = 'claude', target = process.cwd()) {
  const plan = [];
  const paths = getPathsForIde(ide, target);

  // Compute relative paths from target root
  const relWorkflows = path.relative(target, paths.workflowsDir);
  const relReferences = path.relative(target, paths.referencesDir);
  const relBin = path.relative(target, paths.binDir);
  const relAgents = path.relative(target, paths.agentsDir);
  const relCommands = path.relative(target, paths.commandsDir);

  // .rihal/workflows/
  for (const f of walkFiles(path.join(SOURCE_ROOT, 'workflows'))) {
    const rel = path.relative(path.join(SOURCE_ROOT, 'workflows'), f);
    plan.push({ src: f, rel: path.join(relWorkflows, rel) });
  }

  // .rihal/references/
  for (const f of walkFiles(path.join(SOURCE_ROOT, 'references'))) {
    const rel = path.relative(path.join(SOURCE_ROOT, 'references'), f);
    plan.push({ src: f, rel: path.join(relReferences, rel) });
  }

  // .rihal/bin/
  for (const f of walkFiles(path.join(SOURCE_ROOT, 'bin'))) {
    const rel = path.relative(path.join(SOURCE_ROOT, 'bin'), f);
    plan.push({ src: f, rel: path.join(relBin, rel), executable: f.endsWith('.cjs') });
  }

  // .rihal/templates/projects/  — starter templates consumed by /rihal:from-template
  const projectTemplatesSrc = path.join(SOURCE_ROOT, 'templates', 'projects');
  const relProjectTemplates = path.relative(target, path.join(target, '.rihal', 'templates', 'projects'));
  for (const f of walkFiles(projectTemplatesSrc)) {
    const rel = path.relative(projectTemplatesSrc, f);
    plan.push({ src: f, rel: path.join(relProjectTemplates, rel) });
  }

  // Agents — IDE-specific
  for (const f of walkFiles(path.join(SOURCE_ROOT, 'agents'))) {
    const rel = path.relative(path.join(SOURCE_ROOT, 'agents'), f);
    const ext = ide === 'cursor' ? '.mdc' : '.md';
    const outName = path.basename(f, '.md') + ext;
    plan.push({ src: f, rel: path.join(relAgents, path.dirname(rel), outName), ide, cursor: ide === 'cursor' });
  }

  // Commands — IDE-specific
  for (const f of walkFiles(path.join(SOURCE_ROOT, 'commands'))) {
    const rel = path.relative(path.join(SOURCE_ROOT, 'commands'), f);
    const ext = ide === 'cursor' ? '.mdc' : '.md';
    const outName = path.basename(f, '.md') + ext;
    plan.push({ src: f, rel: path.join(relCommands, path.dirname(rel), outName), ide, cursor: ide === 'cursor' });
  }

  // Agent rules (on-demand reference files) — copied to .rihal/agents-rules/
  const agentRulesDir = path.join(target, '.rihal', 'agents-rules');
  for (const f of walkFiles(path.join(SOURCE_ROOT, 'agents', 'rules'))) {
    const rel = path.relative(path.join(SOURCE_ROOT, 'agents', 'rules'), f);
    plan.push({ src: f, rel: path.join('.rihal', 'agents-rules', rel) });
  }

  return plan;
}

/**
 * Parse a module YAML manifest (rihal/modules/{name}.yaml).
 * Returns { name, requires[], agents[], workflows[], commands[], references[] }.
 */
function readModuleManifest(moduleName) {
  const modPath = path.join(SOURCE_ROOT, 'modules', `${moduleName}.yaml`);
  if (!fs.existsSync(modPath)) return null;
  const text = fs.readFileSync(modPath, 'utf8');
  const mod = { name: moduleName, requires: [], agents: [], workflows: [], commands: [], references: [] };
  let currentKey = null;
  for (const raw of text.split('\n')) {
    const line = raw.replace(/#.*$/, '').trimEnd();
    if (!line.trim()) continue;
    // Top-level key detection
    const keyMatch = line.match(/^(\w+):/);
    if (keyMatch && !line.startsWith('  ') && !line.startsWith('-')) {
      const key = keyMatch[1];
      const val = line.slice(line.indexOf(':') + 1).trim();
      if (['agents', 'workflows', 'commands', 'references', 'requires'].includes(key)) {
        currentKey = key;
        if (val && val !== '[]') {
          // inline single value
          mod[key] = val.replace(/^\[|\]$/g, '').split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
        }
      } else {
        currentKey = null;
        if (key === 'name') mod.name = val.replace(/^["']|["']$/g, '');
      }
      continue;
    }
    // List item under current key
    if (currentKey && line.trim().startsWith('-')) {
      const item = line.trim().slice(1).trim().replace(/^["']|["']$/g, '');
      if (item) mod[currentKey].push(item);
    }
  }
  return mod;
}

/**
 * List available module names by scanning rihal/modules/*.yaml
 */
function listAvailableModules() {
  const modulesDir = path.join(SOURCE_ROOT, 'modules');
  if (!fs.existsSync(modulesDir)) return [];
  return fs.readdirSync(modulesDir)
    .filter((f) => f.endsWith('.yaml'))
    .map((f) => f.replace('.yaml', ''));
}

/**
 * Filter an install plan to only files belonging to specified modules.
 * If moduleNames is empty, returns the full plan (backward compatible).
 */
function filterPlanByModules(plan, moduleNames) {
  if (moduleNames.length === 0) return plan; // no filter = install everything
  const allowed = new Set();
  for (const modName of moduleNames) {
    const mod = readModuleManifest(modName);
    if (!mod) { console.warn(`  ⚠ Unknown module: ${modName}`); continue; }
    for (const a of mod.agents) allowed.add(path.join('.claude', 'agents', a));
    for (const w of mod.workflows) allowed.add(path.join('.rihal', 'workflows', w));
    for (const c of mod.commands) allowed.add(path.join('.claude', 'commands', 'rihal', c));
    for (const r of mod.references) allowed.add(path.join('.rihal', 'references', r));
  }
  // Always include bin/ (shared infrastructure, not module-specific)
  return plan.filter((entry) => {
    if (entry.rel.startsWith(path.join('.rihal', 'bin'))) return true;
    return allowed.has(entry.rel);
  });
}

/**
 * Auto-generate agent-manifest.csv from the installed agent files'
 * frontmatter. Columns: id, file, name, description, color.
 *
 * The `id` column strips the `rihal-` prefix so workflow code can match
 * against the council-panel scorer's AGENT_IDS (which use bare names).
 */
function generateAgentManifest(plan, target) {
  const rows = [['id', 'file', 'name', 'description', 'color']];
  const seen = new Set(); // Track IDs already added to avoid duplicates

  for (const entry of plan) {
    if (!entry.rel.startsWith(path.join('.claude', 'agents'))) continue;
    if (!entry.rel.match(/^\.claude[\/\\]agents[\/\\][^\/\\]+\.md$/)) continue;
    const filePath = path.join(target, entry.rel);
    const text = fs.readFileSync(filePath, 'utf8');
    const { frontmatter } = parseFrontmatter(text);
    const name = frontmatter.name || path.basename(entry.rel, '.md');
    const bareId = name.replace(/^rihal-/, '');
    if (seen.has(bareId)) continue; // Skip duplicate
    seen.add(bareId);
    const desc = (frontmatter.description || '').replace(/"/g, '""');
    rows.push([
      bareId,
      entry.rel,
      name,
      `"${desc}"`,
      frontmatter.color || '',
    ]);
  }
  // Also include agents already on disk but not in current plan
  const agentDir = path.join(target, '.claude', 'agents');
  if (fs.existsSync(agentDir)) {
    const existingFiles = fs.readdirSync(agentDir).filter(f => f.startsWith('rihal-') && f.endsWith('.md'));
    const alreadyIncluded = new Set(plan.filter(e => e.rel.startsWith(path.join('.claude', 'agents'))).map(e => path.basename(e.rel)));
    for (const file of existingFiles) {
      if (alreadyIncluded.has(file)) continue;
      const filePath = path.join(agentDir, file);
      const text = fs.readFileSync(filePath, 'utf8');
      const { frontmatter } = parseFrontmatter(text);
      const name = frontmatter.name || path.basename(file, '.md');
      const bareId = name.replace(/^rihal-/, '');
      if (seen.has(bareId)) continue; // Skip if already added
      seen.add(bareId);
      const desc = (frontmatter.description || '').replace(/"/g, '""');
      rows.push([bareId, path.join('.claude', 'agents', file), name, `"${desc}"`, frontmatter.color || '']);
    }
  }
  return rows.map((r) => r.join(',')).join('\n') + '\n';
}

/**
 * Generate files-manifest.csv with SHA256 per installed file. Used by
 * update/doctor to detect drift. Columns: rel, sha256, size.
 */
function generateFilesManifest(plan, target) {
  const rows = [['rel', 'sha256', 'size']];
  for (const entry of plan) {
    const filePath = path.join(target, entry.rel);
    if (!fs.existsSync(filePath)) continue;
    const buf = fs.readFileSync(filePath);
    rows.push([entry.rel.split(path.sep).join('/'), sha256(buf), String(buf.length)]);
  }
  return rows.map((r) => r.join(',')).join('\n') + '\n';
}

/**
 * Orphan sweep — remove files that were part of a previous install but aren't
 * in the current plan. Reads `.rihal/_config/files-manifest.csv` from the
 * previous install and computes the diff against the new plan.
 *
 * Closes #196 — without this, upgrading rcode leaves stale skill/command
 * files around that show up as ghost slash commands in the IDE.
 *
 * Deliberately conservative:
 *   - Only removes files that appeared in the PREVIOUS manifest.
 *   - Never removes files the user created themselves.
 *   - Never touches .rihal/config.yaml, .rihal/state.json, or .planning/.
 *
 * Returns the number of orphan files removed.
 */
function sweepStaleInstalledFiles(target, newPlan) {
  const manifestPath = path.join(target, '.rihal', '_config', 'files-manifest.csv');
  if (!fs.existsSync(manifestPath)) return 0;

  let oldRels;
  try {
    const rows = fs.readFileSync(manifestPath, 'utf8').split('\n').slice(1).filter(Boolean);
    oldRels = rows.map(r => r.split(',')[0]).filter(Boolean);
  } catch {
    return 0;
  }

  const newRelsSet = new Set(newPlan.map(e => e.rel.split(path.sep).join('/')));
  // Safety — never sweep these, even if they somehow landed in the manifest.
  const neverSweep = /^(\.rihal\/config\.yaml|\.rihal\/state\.json|\.rihal\/state\.json\.lock|\.planning\/|\.rihal\/brain\/sources\.yaml)/;

  let removed = 0;
  const emptyCandidateDirs = new Set();
  for (const rel of oldRels) {
    if (newRelsSet.has(rel)) continue;
    if (neverSweep.test(rel)) continue;
    const full = path.join(target, rel);
    try {
      if (fs.existsSync(full)) {
        fs.rmSync(full, { force: true });
        emptyCandidateDirs.add(path.dirname(full));
        removed += 1;
      }
    } catch {
      // ignore individual failures — sweep is best-effort
    }
  }

  // Remove any now-empty parent dirs (bottom-up, so nested emptiness cascades).
  const dirsSortedDeep = Array.from(emptyCandidateDirs).sort((a, b) => b.length - a.length);
  for (const dir of dirsSortedDeep) {
    try {
      if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) {
        fs.rmdirSync(dir);
      }
    } catch {}
  }

  return removed;
}

function readPackageVersion() {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(PACKAGE_ROOT, 'package.json'), 'utf8'));
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function generateInstallManifest(opts) {
  const version = readPackageVersion();
  const newModules = opts.modules.length > 0 ? opts.modules : listAvailableModules();
  // Merge with existing manifest if present
  let existingModules = [];
  const existingPath = path.join(opts.target, '.rihal', '_config', 'manifest.yaml');
  if (fs.existsSync(existingPath)) {
    const text = fs.readFileSync(existingPath, 'utf8');
    let inModules = false;
    for (const line of text.split('\n')) {
      if (line.startsWith('modules:')) { inModules = true; continue; }
      if (inModules && line.trim().startsWith('-')) { existingModules.push(line.trim().slice(1).trim()); }
      else if (inModules && !line.startsWith(' ')) { inModules = false; }
    }
  }
  const allModules = [...new Set([...existingModules, ...newModules])];
  const moduleLines = allModules.map((m) => `  - ${m}`).join('\n');
  return [
    '# Rihal v2 install manifest',
    `version: ${version}`,
    `installDate: ${new Date().toISOString()}`,
    'modules:',
    moduleLines,
    'ides:',
    '  - claude-code',
    '',
  ].join('\n');
}

function sanitizeYamlValue(val) {
  return (val || '').replace(/[\n\r]/g, ' ').replace(/"/g, '\\"');
}

function generateConfigYaml(opts) {
  return [
    '# Rihal v2 project config',
    '# Generated by install. Safe to edit.',
    `user_name: "${sanitizeYamlValue(opts.userName)}"`,
    `project_name: "${sanitizeYamlValue(opts.projectName)}"`,
    `communication_language: "${sanitizeYamlValue(opts.language)}"`,
    `mode: "${sanitizeYamlValue(opts.mode)}"`,
    `model_profile: "balanced"`,
    `commit_planning: ${opts.commitPlanning !== false}`,
    `rihal_source_path: "${sanitizeYamlValue(path.dirname(path.dirname(process.argv[1])))}/"`,
    'workflow:',
    '  research_by_default: false',
    '  plan_checker: true',
    '  post_execute_gates: true',
    '  ui_safety_gate: true',
    'git:',
    '  branching_strategy: "none"',
    '',
  ].join('\n');
}

/**
 * Convert a markdown command/agent file to Cursor's .mdc format.
 * Wraps the file with Cursor-specific rules frontmatter.
 */
function convertToCursorMdc(sourceText) {
  // Cursor .mdc format wraps markdown in a rules block
  // Pattern: <!-- rules: { "rule": "value" } --> ... content ... <!-- /rules -->
  // For now, we pass through as-is since Cursor treats .mdc as markdown with metadata
  return sourceText;
}

/**
 * Main install routine. Copies files, generates manifests, writes config.
 */
async function install(opts) {
  if (opts.help) { printHelp(); return 0; }

  // Resolve commit-planning preference (interactive prompt or flag) — #189.
  opts.commitPlanning = await resolveCommitPlanning(opts);

  console.log(`\n🕌 Rihal Code v${readPackageVersion()} installer → ${opts.target}`);
  if (!fs.existsSync(SOURCE_ROOT)) {
    console.error(`✖ Source tree not found at ${SOURCE_ROOT}. Running from wrong dir?`);
    return 1;
  }

  // Validate IDE
  if (!['claude', 'cursor', 'gemini'].includes(opts.ide)) {
    console.error(`✖ Unknown IDE: ${opts.ide}. Supported: claude, cursor, gemini`);
    return 1;
  }

  // Gemini IDE support deferred
  if (opts.ide === 'gemini') {
    console.log(`\n⚠️  Gemini CLI install not yet implemented\n`);
    console.log(`Gemini IDE requires aggregating all agents and commands into a single GEMINI.md file.`);
    console.log(`This feature is planned but not yet available.\n`);
    console.log(`For now, use: --ide claude or --ide cursor\n`);
    return 1;
  }

  // Validate requested modules exist
  if (opts.modules.length > 0) {
    const available = listAvailableModules();
    const unknownModules = opts.modules.filter(m => !available.includes(m));
    if (unknownModules.length > 0) {
      console.error(`✖ Unknown module(s): ${unknownModules.join(', ')}`);
      console.error(`  Available modules: ${available.join(', ')}`);
      return 1;
    }
  }

  const fullPlan = buildInstallPlan(opts.ide, opts.target);
  const plan = filterPlanByModules(fullPlan, opts.modules);
  if (plan.length === 0) {
    console.error('✖ Nothing to install — install plan is empty.');
    if (opts.modules.length > 0) console.error(`  Modules requested: ${opts.modules.join(', ')}`);
    return 1;
  }
  if (opts.modules.length > 0) {
    console.log(`  Modules: ${opts.modules.join(', ')}`);
  }

  // Orphan sweep — remove files from previous install not in the new plan (#196).
  // Runs on --force only, to preserve user-edited or hand-dropped files on regular installs.
  let sweptOrphans = 0;
  if (opts.force) {
    sweptOrphans = sweepStaleInstalledFiles(opts.target, plan);
  }

  // Copy files
  let copied = 0;
  let skipped = 0;
  for (const entry of plan) {
    const destPath = path.join(opts.target, entry.rel);
    ensureDir(path.dirname(destPath));
    if (fs.existsSync(destPath) && !opts.force) {
      const existingHash = sha256(fs.readFileSync(destPath));
      const sourceHash = sha256(fs.readFileSync(entry.src));
      if (existingHash === sourceHash) { skipped++; continue; }
      if (!opts.yes) {
        console.warn(`  ⚠ ${entry.rel} differs from package version — use --force to overwrite`);
        skipped++;
        continue;
      }
    }

    // Warn if overwriting modified file
    if (fs.existsSync(destPath) && opts.force) {
      const existing = fs.readFileSync(destPath);
      const incoming = fs.readFileSync(entry.src);
      if (!existing.equals(incoming)) {
        console.log(`  ⚠ Overwriting modified file: ${destPath}`);
      }
    }

    // Read source file
    let content = fs.readFileSync(entry.src, 'utf8');

    // Convert to Cursor .mdc format if needed
    if (entry.cursor) {
      content = convertToCursorMdc(content);
    }

    // Write to destination
    fs.writeFileSync(destPath, content, 'utf8');
    if (entry.executable) fs.chmodSync(destPath, 0o755);
    copied++;
  }

  // Write .rihal/_config/manifest.yaml + agent-manifest.csv + files-manifest.csv
  const configDir = path.join(opts.target, '.rihal', '_config');
  ensureDir(configDir);
  fs.writeFileSync(path.join(configDir, 'manifest.yaml'), generateInstallManifest(opts));
  fs.writeFileSync(path.join(configDir, 'agent-manifest.csv'), generateAgentManifest(plan, opts.target));

  // Handle --reset flag: delete config.yaml and state.json if --reset is passed
  const configPath = path.join(opts.target, '.rihal', 'config.yaml');
  const stateDest = path.join(opts.target, '.rihal', 'state.json');
  let existedBefore = false;

  if (opts.reset && opts.force) {
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }
    if (fs.existsSync(stateDest)) {
      fs.unlinkSync(stateDest);
    }
  } else if (opts.force && (fs.existsSync(configPath) || fs.existsSync(stateDest))) {
    existedBefore = true;
  }

  // Write .rihal/config.yaml (user_name, project_name, language, mode)
  // Note: config.yaml is user data and should NOT be overwritten on --force (unless --reset)
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, generateConfigYaml(opts));
  }

  // Seed .rihal/state.json (skip if already exists — don't overwrite on re-install unless --reset)
  if (!fs.existsSync(stateDest)) {
    const stateSrc = path.join(SOURCE_ROOT, 'state.json');
    if (fs.existsSync(stateSrc)) {
      const now = new Date().toISOString();
      const stateContent = fs.readFileSync(stateSrc, 'utf8')
        .replace(/__PROJECT_NAME__/g, opts.projectName)
        .replace(/__INSTALL_DATE__/g, now);
      ensureDir(path.dirname(stateDest));
      fs.writeFileSync(stateDest, stateContent);
    }
  }

  // .planning/council-sessions/ empty dir
  ensureDir(path.join(opts.target, '.planning', 'council-sessions'));

  // ~/.rihal/agents/ global agents directory
  const globalAgentsDir = path.join(os.homedir(), '.rihal', 'agents');
  ensureDir(globalAgentsDir);

  // files-manifest.csv — written LAST so it includes itself's siblings
  // (but not itself, since hashing a file referencing its own hash is
  // self-referential nonsense).
  fs.writeFileSync(
    path.join(configDir, 'files-manifest.csv'),
    generateFilesManifest(plan, opts.target),
  );

  // Install v1-style phrase-activated skills (scaffold-project, create-prd,
  // retrospective, etc.) into .claude/skills/ alongside the v2 agents/commands.
  const skillsInstalled = installSkills(PACKAGE_ROOT, opts.target);

  // Seed .planning/ with starter ROADMAP + STATE so workflows work immediately
  const starterSeeded = seedStarterPlanning(opts.target, opts.projectName);

  // Install brain scaffolding at .rihal/brain/ (sources.yaml + README).
  // Actual brain content lands after first brain pull runs.
  installBrainScaffold(PACKAGE_ROOT, opts.target);

  // Ensure .gitignore separates installed methodology from committable artifacts.
  // Reads opts.commitPlanning to decide whether .planning/ is in the ignore block.
  const gitignoreReport = ensureRcodeGitignore(opts.target, { commitPlanning: opts.commitPlanning });

  // Pull Rihal brain content (v2.0 — issue #158).
  // Runs rihal-tools brain pull as a child process. Placeholder URLs
  // are skipped gracefully so this does not fail a fresh install.
  let brainReport = null;
  try {
    const { execFileSync } = require('child_process');
    const toolsPath = path.join(opts.target, '.rihal', 'bin', 'rihal-tools.cjs');
    if (fs.existsSync(toolsPath)) {
      const out = execFileSync('node', [toolsPath, 'brain', 'pull'], {
        cwd: opts.target,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      try { brainReport = JSON.parse(out); } catch {}
    }
  } catch (e) {
    // brain pull is best-effort on install — do not fail the whole install
    brainReport = { ok: false, error: String(e.message || e).slice(0, 200) };
  }

  // Summary
  console.log('');
  console.log(`  Files:     ${copied} installed` + (opts.force && sweptOrphans > 0 ? `, ${sweptOrphans} stale swept` : ''));
  if (brainReport && brainReport.ok) {
    const pulledCount = (brainReport.pulled || []).length;
    const skippedCount = (brainReport.skipped || []).length;
    console.log(`  Brain:     ${pulledCount} source${pulledCount === 1 ? '' : 's'} pulled` +
      (skippedCount ? `, ${skippedCount} skipped (placeholder URLs — see issue #162)` : ''));
  } else if (brainReport && brainReport.error) {
    console.log(`  Brain:     skipped (${brainReport.error})`);
  }
  if (gitignoreReport) {
    const gitMsg = {
      'created': '.gitignore created with rcode block',
      'appended': '.gitignore updated — rcode block appended',
      'already-present': '.gitignore rcode block already present',
      'updated': '.gitignore rcode block refreshed',
      'skipped-error': `.gitignore skipped (${gitignoreReport.error})`,
    }[gitignoreReport.action] || '.gitignore unchanged';
    console.log(`  Gitignore: ${gitMsg}`);
  }
  if (skipped > 0) console.log(`  Skipped:   ${skipped} (already present, unchanged)`);
  if (opts.force && existedBefore) {
    console.log('  ⚠ Preserved: .rihal/config.yaml and .rihal/state.json');
    console.log('     Pass --reset to wipe and re-init those too.');
  }

  // Count installed agents + commands dynamically (#190).
  const agentsDir = path.join(opts.target, '.claude', 'agents');
  const commandsDir = path.join(opts.target, '.claude', 'commands', 'rihal');
  let agentCount = 0, commandCount = 0;
  try {
    if (fs.existsSync(agentsDir)) {
      agentCount = fs.readdirSync(agentsDir).filter(f => f.startsWith('rihal-') && f.endsWith('.md')).length;
    }
    if (fs.existsSync(commandsDir)) {
      commandCount = fs.readdirSync(commandsDir).filter(f => f.endsWith('.md')).length;
    }
  } catch {}

  console.log('');
  console.log(`  Version:   @hanzlaa/rcode@${readPackageVersion()}`);
  console.log(`  IDE:       ${opts.ide}`);
  console.log(`  Language:  ${opts.language}  (change in .rihal/config.yaml)`);
  console.log(`  Mode:      ${opts.mode}  (guided=confirm at gates, yolo=autonomous)`);
  console.log(`  Profile:   balanced`);
  console.log(`  Planning:  ${opts.commitPlanning !== false ? 'committed' : 'gitignored'}  (flip: rihal-tools gitignore refresh)`);
  console.log('');
  console.log(`  Agents:    ${agentCount} installed in .claude/agents/  (e.g. rihal-sadiq, rihal-waleed, rihal-fatima)`);
  console.log(`             Full roster: node .rihal/bin/rihal-tools.cjs list-agents`);
  console.log(`  Commands:  ${commandCount} slash commands in .claude/commands/rihal/  (e.g. /rihal:council, /rihal:create-prd, /rihal:progress)`);
  console.log(`             Full list:   ls .claude/commands/rihal/`);
  if (skillsInstalled > 0) {
    console.log(`  Skills:    ${skillsInstalled} phrase-activated in .claude/skills/`);
  }
  console.log('');
  if (starterSeeded) {
    console.log('  ✓ Starter planning scaffolded in .planning/ (ROADMAP, STATE, PROJECT)');
    console.log('');
  }
  console.log('  Next:');
  console.log(`    cd ${opts.target}`);
  console.log('    claude              # start Claude Code (reload window if already open)');
  console.log('    /rihal:progress     # where you are, what\'s next');
  console.log('    /rihal:do           # interactive command picker');
  console.log('    /rihal:council <q>  # multi-agent strategic answer');
  console.log('');
  console.log('  Refresh anytime:');
  console.log('    npx @hanzlaa/rcode@latest install   # pull the latest rcode + brain');
  console.log('    /rihal:update v2.2.0                # pin rcode to a specific version');
  console.log('');
  console.log('  ⚠ If your IDE is already open, reload the window to refresh skills/commands.');
  console.log('    Claude Code / VS Code / Cursor:  Cmd+Shift+P → Reload Window');
  console.log('');
  return 0;
}

async function main() {
  const argv = process.argv.slice(2);
  const opts = parseArgs(argv);

  // Prompt for target directory when not explicitly provided and not --yes
  if (!opts.targetProvided && !opts.yes && !opts.help) {
    const { askText, askChoice, PromptAbortError } = require('./lib/prompts.cjs');
    try {
      console.log('');
      const answer = await askText(
        `Install Rihal Code into which directory?\n  (press Enter for current directory: ${opts.target})`,
        { default: opts.target }
      );
      const resolved = path.resolve(answer.trim() || opts.target);
      opts.target = resolved;
      opts.projectName = path.basename(resolved);

      const ideAnswer = await askChoice(
        'Which editor are you installing for?',
        {
          choices: [
            { id: 'claude',  label: 'Claude Code' },
            { id: 'cursor',  label: 'Cursor' },
            { id: 'gemini',  label: 'Gemini CLI' },
            { id: 'all',     label: 'All (Claude + Cursor + Gemini)' },
          ],
          default: 'claude',
        }
      );
      opts.ide = ideAnswer[0];
      console.log('');
    } catch (err) {
      if (err.name === 'PromptAbortError') process.exit(0);
      throw err;
    }
  }

  install(opts).then(code => process.exit(code)).catch(err => {
    if (err.code === 'EACCES' || err.code === 'EPERM') {
      console.error(`✖ Permission denied: ${err.path || err.message}`);
      process.exit(1);
    }
    if (err.code === 'ENOENT') {
      console.error(`✖ Path not found: ${err.path || err.message}`);
      process.exit(1);
    }
    console.error(`✖ Install failed: ${err.message}`);
    if (process.env.DEBUG) console.error(err.stack);
    process.exit(1);
  });
}

if (require.main === module) main();

/**
 * Handler for cli/index.js — called as `npx rihal-code install [args]`.
 * Converts the index.js-style (args, ctx) signature into a cli/install.js
 * parseArgs-compatible argv and runs install().
 */
async function runFromCli(args /* , ctx */) {
  const argv = Array.isArray(args) ? args : [];
  const opts = parseArgs(argv);
  const code = await install(opts);
  if (code !== 0) process.exit(code);
}

module.exports = runFromCli;
module.exports.parseArgs = parseArgs;
module.exports.buildInstallPlan = buildInstallPlan;
module.exports.install = install;
