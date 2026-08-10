/**
 * cli/install.js — rcode v2 file-shipping installer (prototype)
 *
 * Compared to the v1 `cli/init.js` (2918 lines of inline string templates),
 * this installer copies real files from the package's `rcode/` directory
 * into a target project. The same file-shipping pattern (no npm deps).
 *
 * Target layout in the user's project:
 *
 *   .rcode/
 *     _config/
 *       manifest.yaml          (version + install date + installed modules)
 *       agent-manifest.csv     (auto-generated from rcode/agents/*.md frontmatter)
 *       files-manifest.csv     (SHA256 hashes for update/doctor)
 *     config.yaml              (user_name, project_name, language, mode)
 *     workflows/
 *       council.md
 *     references/
 *       council-protocol.md
 *       commit-conventions.md
 *     bin/
 *       rcode-tools.cjs
 *       lib/council-panel.cjs
 *   .claude/
 *     agents/
 *       rcode-sadiq.md
 *       rcode-waleed.md
 *       rcode-fatima.md
 *     commands/
 *       rcode/
 *         council.md
 *   .planning/
 *     council-sessions/        (empty dir, populated on first council run)
 *
 * Bundled packages (devDeps, inlined by esbuild in dist/rcode.js):
 *   picocolors, nanospinner, fast-glob, zod, semver, diff
 *
 * Usage:
 *   node cli/install.js [target-project-dir]
 *   node cli/install.js --help
 *
 * Flags:
 *   --force             overwrite existing files without prompting
 *   --yes               non-interactive, accept defaults
 *   --user <name>       set user_name in config.yaml (default: $USER)
 *   --project <name>    set project_name in config.yaml (default: basename of target)
 *   --language <lang>   set communication_language (default: English)
 *   --show-diff         print full unified diff for preserved files during update
 *   --diff-stat         print +N -N summary for preserved files (default on update)
 *   --accept-all        overwrite all user-modified files with source version
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

// Atomic write helper (#687) + symlink-safe rmSync (#688) — protect against
// Ctrl+C mid-write and malicious symlink-traversal during dedup/cleanup.
const { writeFileAtomic, safeRmSync } = require('./lib/fsutil.cjs');

// HOME-aware home resolution (#889) — os.homedir() ignores a stubbed HOME on
// Windows (it reads USERPROFILE), so HOME-isolated tests and CI leaked global
// installs (~/.rcode, ~/.codex, ~/.gemini) into the real profile dir there.
const { homedir } = require('./lib/homedir.cjs');

// Bundled packages — devDeps inlined by esbuild, loaded from node_modules in dev.
const pc = require('picocolors');
const { createSpinner } = require('nanospinner');
const fg = require('fast-glob');
const { z } = require('zod');
const semver = require('semver');
const { createTwoFilesPatch } = require('diff');
const clack = require('@clack/prompts');

// Output helpers: always respect NO_COLOR / non-TTY (picocolors handles this).
const ok   = (s) => pc.green('✓') + ' ' + s;
const fail = (s) => pc.red('✗') + ' ' + s;
const warn = (s) => pc.yellow('⚠') + ' ' + s;
const info = (s) => pc.cyan('→') + ' ' + s;
const dim  = (s) => pc.dim(s);
const bold = (s) => pc.bold(s);

const PACKAGE_ROOT = path.resolve(__dirname, '..');
const SOURCE_ROOT = path.join(PACKAGE_ROOT, 'rcode');

/**
 * Single source of truth for supported IDEs (#697 — W4.3).
 *
 * Order matters: this is the order used in detection, prompts, and error
 * messages. Anywhere code used to inline `['claude','cursor','gemini',
 * 'vscode','antigravity']` it now references this constant. Adding a new
 * IDE is now: append here, add a case to getPathsForIde, add a signal to
 * detectIdeSignals, plus a row to runInstallWizard's multiselect — three
 * sites instead of ten.
 */
const SUPPORTED_IDES = Object.freeze(['claude', 'cursor', 'gemini', 'vscode', 'antigravity', 'windsurf', 'codex', 'grok']);

/**
 * Resolve the stable on-disk location of this package so config.yaml
 * rcode_source_path doesn't point to a temp npm install directory.
 * Issue #831 — process.argv[1] may be /tmp/... when installed via npx.
 * Resolution order: package.json location of @hanzlaa/rcode in global
 * node_modules, then local node_modules, then argv fallback.
 */
function resolveStableSourcePath() {
  const candidateDirs = [
    // pnpm/npm global store
    path.join(process.env.HOME || '', '.pnpm-global', 'node_modules', '@hanzlaa', 'rcode'),
    path.join(process.env.HOME || '', '.npm-global', 'lib', 'node_modules', '@hanzlaa', 'rcode'),
    // local node_modules (most common for pnpm add -D)
    path.join(process.cwd(), 'node_modules', '@hanzlaa', 'rcode'),
    // argv-based fallback (may be /tmp/... on npx)
    path.dirname(path.dirname(process.argv[1] || '')),
  ];
  for (const dir of candidateDirs) {
    if (dir && fs.existsSync(path.join(dir, 'package.json'))) return dir;
  }
  return path.dirname(path.dirname(process.argv[1] || ''));
}

/**
 * Walk up the directory tree from startDir looking for pnpm-workspace.yaml.
 * Returns the first directory that contains the file, or null if not found.
 * Issue #821/#832 — used to detect workspace roots and anchor TARGET_DIR.
 */
function findPnpmWorkspaceRoot(startDir) {
  let dir = startDir;
  while (true) {
    if (fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null; // reached filesystem root
    dir = parent;
  }
}

// Zod schema for .rcode/config.yaml validation (#250).
const ConfigSchema = z.object({
  user_name: z.string().min(1),
  project_name: z.string().min(1),
  communication_language: z.string().default('English'),
  mode: z.enum(['guided', 'yolo'], {
    errorMap: () => ({ message: 'expected "guided" or "yolo"' }),
  }).default('guided'),
  model_profile: z.string().optional(),
  commit_planning: z.boolean().optional(),
  rcode_source_path: z.string().optional(),
  workflow: z.object({
    research_by_default: z.boolean().optional(),
    plan_checker: z.boolean().optional(),
    post_execute_gates: z.boolean().optional(),
    ui_safety_gate: z.boolean().optional(),
    nyquist_validation: z.boolean().optional(),
  }).optional(),
  output: z.object({
    verbose: z.boolean().optional(),
  }).optional(),
  git: z.object({
    branching_strategy: z.string().optional(),
  }).optional(),
  // Declared for validation only — default ('every') lives in the hook (rcode-hooks.cjs prompt-router).
  // Install does NOT write this key; the feature stays dormant until hooks are opted into via /rcode-enable-hooks.
  prompt_nudge: z.enum(['every', 'once-per-intent', 'when-stale', 'off']).optional(),
}).passthrough();

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
    ideProvided: false, // true when --ide is passed explicitly — skip interactive prompt
    help: false,
    modules: [],  // --module core --module execution or empty = all
    // #189 — planning commit policy. null = ask interactively (or default true under --yes).
    // Set true by --commit-planning, false by --no-commit-planning or --ignore-planning.
    commitPlanning: null,
    // #232 — non-destructive update. Preserves files the user modified after install.
    nonDestructive: false,
    // #232 — force-overwrite always wins.
    forceOverwrite: false,
    // #251 — diff display flags
    showDiff: false,
    diffStat: false,
    acceptAll: false,
    // #252 — skip update-notifier check
    noUpdateCheck: false,
    // #381 — skip backup tarball on --force-overwrite (CI escape hatch)
    noBackup: false,
    // #199 — git pre-commit hook. null = install if .git/ present (default).
    // Set false by --no-git-hooks, true by --git-hooks.
    gitHooks: null,
    // global install mode — targets ~/.claude/, skips per-project artifacts
    global: false,
    // silent — suppress non-error output (used by postinstall auto-run)
    silent: false,
    // noPrompt — skip all interactive prompts (used by postinstall auto-run)
    noPrompt: false,
    // localOnly (#938) — force a self-contained project install: write all
    // skills locally instead of deferring to global ~/.claude/skills.
    localOnly: false,
    // dry-run / list-files — preview paths that would be written, then exit
    dryRun: false,
    listFiles: false,
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
    else if (arg === '--ide') {
      opts.ide = argv[++i];
      // Issue #841: normalise 'claude-code' alias — the tool is marketed as
      // "Claude Code" so users pass --ide claude-code expecting it to work.
      if (opts.ide === 'claude-code') opts.ide = 'claude';
      opts.ideProvided = true;
    }
    else if (arg === '--module') opts.modules.push(argv[++i]);
    else if (arg === '--commit-planning') opts.commitPlanning = true;
    else if (arg === '--no-commit-planning' || arg === '--ignore-planning') opts.commitPlanning = false;
    else if (arg === '--non-destructive') opts.nonDestructive = true;
    else if (arg === '--force-overwrite') opts.forceOverwrite = true;
    else if (arg === '--show-diff') opts.showDiff = true;       // #251 full unified diff
    else if (arg === '--diff-stat') opts.diffStat = true;       // #251 +N -N summary (default)
    else if (arg === '--accept-all') opts.acceptAll = true;     // #251 overwrite all preserved
    else if (arg === '--no-update-check') opts.noUpdateCheck = true; // #252
    else if (arg === '--no-backup') opts.noBackup = true;             // #381
    else if (arg === '--no-git-hooks') opts.gitHooks = false;         // #199
    else if (arg === '--git-hooks') opts.gitHooks = true;             // #199
    else if (arg === '--global') opts.global = true;
    else if (arg === '--local-only') opts.localOnly = true; // #938 — force self-contained install (don't defer to global skills)
    else if (arg === '--silent') opts.silent = true;
    else if (arg === '--no-prompt') opts.noPrompt = true;
    else if (arg === '--dry-run') opts.dryRun = true;
    else if (arg === '--list-files') opts.listFiles = true;
    else if (!arg.startsWith('--')) positional.push(arg);
  }
  if (positional[0]) {
    opts.target = path.resolve(positional[0]);
    opts.targetProvided = true;
  }
  // --global without an explicit target means "install to ~/.claude/" — i.e.
  // home dir. Without this, running `rcode install --global` from inside a
  // project directory wrote rcode artifacts to that project, not to the user's
  // home where Claude Code reads global commands from.
  if (opts.global && !opts.targetProvided) {
    opts.target = homedir();
  }
  // Issue #821/#832: pnpm workspace anchor.
  // When `pnpm add -D @hanzlaa/rcode` runs inside a workspace member,
  // pnpm may change process.cwd() to the workspace root (the directory that
  // contains pnpm-workspace.yaml). npm sets INIT_CWD to the original member
  // directory where the user ran the command.
  // Guard 1: CWD is the workspace root + INIT_CWD points inside it → use INIT_CWD.
  // Guard 2: workspace root found above CWD → keep CWD (don't walk up).
  if (!opts.targetProvided && !opts.global) {
    const cwd = process.cwd();
    const hasPnpmWorkspaceHere = fs.existsSync(path.join(cwd, 'pnpm-workspace.yaml'));
    const initCwd = process.env.INIT_CWD;
    if (hasPnpmWorkspaceHere && initCwd && path.resolve(initCwd) !== path.resolve(cwd)) {
      // pnpm changed CWD to workspace root; INIT_CWD has the member directory.
      opts.target = path.resolve(initCwd);
    } else {
      // Check if we're already inside a workspace member (workspace root in a parent).
      const workspaceRoot = findPnpmWorkspaceRoot(path.dirname(cwd));
      if (workspaceRoot) {
        opts.target = cwd; // explicit anchor — do not drift to workspace root
      }
    }
  }
  if (!opts.projectName) opts.projectName = path.basename(opts.target);
  return opts;
}

/**
 * Create a tar.gz backup of every file the install plan would touch BEFORE
 * --force-overwrite clobbers them. Closes #381 — without this, customized
 * .claude/agents/rcode-*.md and similar files were silently lost.
 *
 * Returns { ok, path, warning, fileCount } — ok=false means we couldn't
 * create the backup (tar missing, no paths, etc.); the caller decides
 * whether to abort or continue.
 */
function createInstallBackup(target, plan) {
  const { spawnSync } = require('child_process');

  // Build the list of files that EXIST and are about to be overwritten.
  // Plan items use `rel` (the relative dest path); see plan.push sites in
  // buildInstallPlan / discover* helpers.
  const paths = [];
  for (const item of plan) {
    const relPath = item.rel || item.dest;
    if (!relPath) continue;
    const fullDest = path.join(target, relPath);
    if (fs.existsSync(fullDest)) {
      paths.push(relPath);
    }
  }
  // Also include the package-managed state files even though install
  // explicitly preserves them — defensive: if install regresses and starts
  // touching them, the backup catches it.
  for (const stateFile of [
    '.rcode/config.yaml',
    '.rcode/state.json',
    '.rcode/_config/manifest.yaml',
    '.rcode/_config/files-manifest.csv',
  ]) {
    if (fs.existsSync(path.join(target, stateFile))) {
      paths.push(stateFile);
    }
  }

  if (paths.length === 0) {
    return { ok: false, warning: 'no existing files to back up — fresh install', fileCount: 0 };
  }

  const backupsDir = path.join(target, '.rcode/backups');
  try {
    fs.mkdirSync(backupsDir, { recursive: true });
  } catch (err) {
    return { ok: false, warning: `could not create .rcode/backups/: ${err.message}`, fileCount: 0 };
  }

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupFile = path.join(backupsDir, `install-force-${ts}.tgz`);
  const backupRel = path.relative(target, backupFile);

  const result = spawnSync(
    'tar',
    ['-czf', backupFile, '-C', target, '--files-from=-'],
    {
      input: paths.join('\n') + '\n',
      encoding: 'utf8',
    }
  );

  if (result.status !== 0) {
    return {
      ok: false,
      warning: `tar failed: ${(result.stderr || '').trim().split('\n')[0]}`,
      fileCount: paths.length,
    };
  }

  return { ok: true, path: backupRel, fileCount: paths.length };
}

/**
 * Print the rcode Memory Bank installer header. Box-drawn banner shown once
 * at the top of every interactive install run.
 */
function printInstallHeader(targetVersion) {
  const v = targetVersion || readPackageVersion();
  const lines = [
    '',
    pc.cyan('╭───────────────────────────────────────────────────────────╮'),
    pc.cyan('│') + '                                                           ' + pc.cyan('│'),
    pc.cyan('│') + '   ' + pc.bold(pc.yellow('🕌  rcode Memory Bank')) + '  ' + dim('— installer') + '                       ' + pc.cyan('│'),
    pc.cyan('│') + '   ' + dim('A persistent context-brain for your editor') + '             ' + pc.cyan('│'),
    pc.cyan('│') + '                                                           ' + pc.cyan('│'),
    pc.cyan('│') + '   ' + dim('version  ') + pc.green('v' + v) + '                                          ' + pc.cyan('│'),
    pc.cyan('│') + '   ' + dim('docs     ') + 'github.com/hanzlahabib/rcode               ' + pc.cyan('│'),
    pc.cyan('│') + '   ' + dim('by       ') + 'Hanzla Habib' + '                                    ' + pc.cyan('│'),
    pc.cyan('│') + '                                                           ' + pc.cyan('│'),
    pc.cyan('╰───────────────────────────────────────────────────────────╯'),
    '',
  ];
  console.log(lines.join('\n'));
}

/**
 * Detect which IDEs the user likely uses. Soft signals only — never rejects,
 * just biases the default selection in the interactive prompt.
 * Returns a set like { claude: true, cursor: false, gemini: false }.
 */
function detectIdeSignals(target) {
  const signals = { claude: false, cursor: false, gemini: false, vscode: false, antigravity: false, windsurf: false, codex: false };
  // 1. Project-local install dirs (strongest signal — they already use one)
  if (fs.existsSync(path.join(target, '.claude'))) signals.claude = true;
  if (fs.existsSync(path.join(target, '.cursor'))) signals.cursor = true;
  if (fs.existsSync(path.join(target, '.gemini'))) signals.gemini = true;
  if (fs.existsSync(path.join(target, '.vscode'))) signals.vscode = true;
  if (fs.existsSync(path.join(target, '.antigravity'))) signals.antigravity = true;
  if (fs.existsSync(path.join(target, '.windsurf'))) signals.windsurf = true;
  // 2. User-level config dirs
  const home = homedir();
  if (fs.existsSync(path.join(home, '.claude'))) signals.claude = true;
  if (fs.existsSync(path.join(home, '.cursor'))) signals.cursor = true;
  if (fs.existsSync(path.join(home, '.config', 'Cursor'))) signals.cursor = true;
  if (fs.existsSync(path.join(home, '.gemini'))) signals.gemini = true;
  if (fs.existsSync(path.join(home, '.vscode'))) signals.vscode = true;
  if (fs.existsSync(path.join(home, '.config', 'Code'))) signals.vscode = true;
  if (fs.existsSync(path.join(home, '.antigravity'))) signals.antigravity = true;
  if (fs.existsSync(path.join(home, '.windsurf'))) signals.windsurf = true;
  if (fs.existsSync(path.join(home, '.codeium', 'windsurf'))) signals.windsurf = true;
  // 3. Env vars commonly set by editor terminals
  if (process.env.CURSOR_TRACE_ID || /cursor/i.test(process.env.TERM_PROGRAM || '')) signals.cursor = true;
  if (process.env.CLAUDECODE === '1' || process.env.CLAUDE_CODE_ENTRYPOINT) signals.claude = true;
  if (process.env.VSCODE_PID || /vscode/i.test(process.env.TERM_PROGRAM || '')) signals.vscode = true;
  if (/windsurf/i.test(process.env.TERM_PROGRAM || '')) signals.windsurf = true;
  if (process.env.CODEX_ENV || /codex/i.test(process.env.TERM_PROGRAM || '')) signals.codex = true;
  return signals;
}

/**
 * Resolve target IDE — explicit --ide flag wins, then interactive prompt
 * (when TTY + not --yes + not --ideProvided), else default to 'claude'.
 *
 * Closes the gap where users got auto-installed to claude even when they
 * actually wanted cursor or gemini.
 */
async function resolveIde(opts) {
  // Issue #692: when the wizard has already collected opts.ides (interactive
  // run from main()), resolveIde was re-prompting because it only checked
  // opts.ideProvided (set by --ide flag, not by the wizard). Honor any
  // pre-existing array result so we don't double-prompt.
  if (Array.isArray(opts.ides) && opts.ides.length > 0) return opts.ides;
  if (opts.ideProvided) return [opts.ide];            // user passed --ide, respect it
  if (opts.noPrompt || opts.global) return ['claude']; // auto-install: always claude
  if (opts.yes || !process.stdin.isTTY) {
    // #182 — non-interactive mode: install into every detected IDE, not just
    // the default claude. The interactive flow already preselects detected
    // ones; --yes should match that intent. Falls back to ['claude'] when
    // nothing detected. (Note: opts.ide defaults to 'claude' from parseArgs,
    // so check opts.ideProvided not opts.ide to honor real --ide overrides.)
    const signals = detectIdeSignals(opts.target);
    const detected = SUPPORTED_IDES.filter(k => signals[k]);
    return detected.length > 0 ? detected : ['claude'];
  }

  const signals = detectIdeSignals(opts.target);
  // Antigravity is intentionally excluded from the interactive auto-detect
  // because it's experimental and we don't want to opt-in users without
  // explicit consent. Use SUPPORTED_IDES.filter(k => k !== 'antigravity')
  // to keep the inclusion criteria self-documenting.
  const detected = SUPPORTED_IDES.filter(k => k !== 'antigravity' && signals[k]);

  // Pre-select detected IDEs, or default to claude
  const initialValues = detected.length > 0 ? detected : ['claude'];

  // Use @clack/prompts multiselect for multi-editor support. Closes #449 / #450.
  const choices = await clack.multiselect({
    message: '🎯 Which editor(s) will you use rcode with?',
    initialValues,
    options: [
      { value: 'claude',     label: 'Claude Code',  hint: signals.claude ? '(detected)' : undefined },
      { value: 'cursor',     label: 'Cursor',       hint: signals.cursor ? '(detected)' : undefined },
      { value: 'codex',      label: 'Codex (OpenAI CLI)', hint: signals.codex ? '(detected)' : '(uses AGENTS.md + workflow bridge)' },
      { value: 'gemini',     label: 'Gemini CLI',   hint: signals.gemini ? '(detected)' : '(beta — limited)' },
      { value: 'vscode',     label: 'VS Code',      hint: signals.vscode ? '(detected)' : '(via Continue / Copilot extensions)' },
      { value: 'antigravity', label: 'Antigravity', hint: '(experimental — installs to .antigravity/)' },
    ],
    required: true,
  });

  // Handle Ctrl-C cleanly
  if (clack.isCancel(choices)) {
    clack.cancel('Install cancelled.');
    process.exit(0);
  }

  return choices;
}

/**
 * Resolve commit-planning preference — CLI flag wins, then interactive
 * prompt (when TTY + not --yes), else default to true (commit planning
 * artifacts so they version with the code). #189.
 */
async function resolveCommitPlanning(opts) {
  if (opts.commitPlanning !== null) return opts.commitPlanning;
  if (opts.global) return false; // global install: no planning artifacts
  if (opts.noPrompt) return true; // non-interactive project install: commit planning by default (#936)

  // Issue #685: on re-install, read the existing .rcode/config.yaml and use
  // its commit_planning value as the default. Otherwise the new prompt
  // answer overwrites .gitignore but NOT config.yaml, leaving two sources of
  // truth that silently diverge. Users on re-install almost always want to
  // KEEP their existing setting unless they explicitly pass --commit-planning.
  let existingValue = null;
  try {
    const cfgPath = path.join(opts.target, '.rcode', 'config.yaml');
    if (fs.existsSync(cfgPath)) {
      const cfg = fs.readFileSync(cfgPath, 'utf8');
      const m = cfg.match(/^commit_planning:\s*(true|false)\s*$/m);
      if (m) existingValue = m[1] === 'true';
    }
  } catch { /* fall through to prompt */ }

  if (opts.yes || !process.stdin.isTTY) {
    return existingValue !== null ? existingValue : true; // honor existing on re-install
  }

  const initialValue = existingValue === false ? 'gitignore' : 'commit';
  const choice = await clack.select({
    message: existingValue !== null
      ? '📋 .planning/ tracking — current setting preserved unless you change it.'
      : '📋 .planning/ holds PRDs, roadmaps, sprints, SUMMARY files. How should they be tracked?',
    initialValue,
    options: [
      { value: 'commit',    label: 'Commit',    hint: 'collaborators see the same plans (recommended)' },
      { value: 'gitignore', label: 'Gitignore', hint: 'planning stays local (good for sensitive PRDs)' },
    ],
  });

  if (clack.isCancel(choice)) {
    clack.cancel('Install cancelled.');
    process.exit(0);
  }

  return choice === 'commit';
}

function printHelp() {
  console.log(`
rcode installer

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
  --dry-run          preview what would be written; exit without writing any files
  --list-files       alias for --dry-run
  --help             this text

Installs (IDE-specific):
  claude:  target/.rcode/          config, workflows, references, bin
           target/.claude/agents/  first-class rcode subagents
           target/.claude/commands/rcode/  slash commands
  cursor:  target/.cursor/rules/rcode/    Cursor-specific rules + agents
  gemini:  target/.gemini/rcode/          Gemini CLI commands + agents
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
        commandsDir: path.join(target, '.claude', 'commands'),
        workflowsDir: path.join(target, '.rcode', 'workflows'),
        referencesDir: path.join(target, '.rcode', 'references'),
        binDir: path.join(target, '.rcode', 'bin'),
      };
    case 'cursor':
      return {
        agentsDir: path.join(target, '.cursor', 'rules', 'rcode', 'agents'),
        commandsDir: path.join(target, '.cursor', 'rules', 'rcode', 'commands'),
        workflowsDir: path.join(target, '.rcode', 'workflows'),
        referencesDir: path.join(target, '.rcode', 'references'),
        binDir: path.join(target, '.rcode', 'bin'),
      };
    case 'gemini':
      return {
        agentsDir: path.join(target, '.gemini', 'rcode', 'agents'),
        commandsDir: path.join(target, '.gemini', 'rcode', 'commands'),
        workflowsDir: path.join(target, '.rcode', 'workflows'),
        referencesDir: path.join(target, '.rcode', 'references'),
        binDir: path.join(target, '.rcode', 'bin'),
      };
    case 'vscode':
      // VS Code's Claude Code / Continue / Copilot extensions all read from
      // .claude/ (Claude Code's canonical paths). We install there directly
      // using the SAME layout as the claude case (prefixed-root form) so
      // multi-IDE installs don't double up — see #723 / #635-#643 / #646.
      // The .vscode/rcode/ marker is preserved for workspace settings.
      return {
        agentsDir: path.join(target, '.claude', 'agents'),
        commandsDir: path.join(target, '.claude', 'commands'),
        workflowsDir: path.join(target, '.rcode', 'workflows'),
        referencesDir: path.join(target, '.rcode', 'references'),
        binDir: path.join(target, '.rcode', 'bin'),
        markerDir: path.join(target, '.vscode', 'rcode'),
      };
    case 'antigravity':
      // Antigravity (Google's agentic IDE) — install to .antigravity/ mirroring
      // the .gemini/ structure. Antigravity's plugin protocol is still firming
      // up; the user can adjust paths via .rcode/config.yaml's `extra_install_paths`
      // if Antigravity expects different routing.
      return {
        agentsDir: path.join(target, '.antigravity', 'rcode', 'agents'),
        commandsDir: path.join(target, '.antigravity', 'rcode', 'commands'),
        workflowsDir: path.join(target, '.rcode', 'workflows'),
        referencesDir: path.join(target, '.rcode', 'references'),
        binDir: path.join(target, '.rcode', 'bin'),
      };
    case 'windsurf':
      // Windsurf (Codeium's agentic IDE) — uses .windsurf/rules/ for .mdc rule
      // files, parallel to cursor's .cursor/rules/. cli/lib/manifest.cjs already
      // handles the rules-install verify path (#723 closes the install-side gap).
      return {
        agentsDir: path.join(target, '.windsurf', 'rules', 'rcode', 'agents'),
        commandsDir: path.join(target, '.windsurf', 'rules', 'rcode', 'commands'),
        workflowsDir: path.join(target, '.rcode', 'workflows'),
        referencesDir: path.join(target, '.rcode', 'references'),
        binDir: path.join(target, '.rcode', 'bin'),
      };
    case 'codex':
      // OpenAI Codex CLI reads AGENTS.md from the project root (written by the
      // claude/vscode install paths). We install agent + command files to .claude/
      // so multi-IDE installs share files, and the rcode workflow bridge gives
      // Codex access to lifecycle workflows via `rcode workflow show <name>` (#883).
      // NOTE: Codex surfaces native /slash commands ONLY from ~/.codex/prompts/*.md
      // (home, startup-loaded) — installed separately by installNativeHomeSlashCommands()
      // under the opt-in --global flag, since .claude/commands is invisible to Codex.
      return {
        agentsDir: path.join(target, '.claude', 'agents'),
        commandsDir: path.join(target, '.claude', 'commands'),
        workflowsDir: path.join(target, '.rcode', 'workflows'),
        referencesDir: path.join(target, '.rcode', 'references'),
        binDir: path.join(target, '.rcode', 'bin'),
      };
    case 'grok':
      // Grok Build (xAI CLI) is Claude-Code-compatible: it reads slash commands
      // from .claude/commands/*.md (project) and ~/.claude/commands (global), same
      // as Claude Code. So grok maps to the identical .claude/ layout — verified
      // live: `/rcode-add-phase` surfaces in grok from these dirs.
      return {
        agentsDir: path.join(target, '.claude', 'agents'),
        commandsDir: path.join(target, '.claude', 'commands'),
        workflowsDir: path.join(target, '.rcode', 'workflows'),
        referencesDir: path.join(target, '.rcode', 'references'),
        binDir: path.join(target, '.rcode', 'bin'),
      };
    default:
      throw new Error(`Unknown IDE: ${ide}. Supported: ${SUPPORTED_IDES.join(', ')}`);
  }
}

/**
 * Walk a directory and return absolute file paths. Uses fast-glob so
 * symlink cycles are never followed and patterns can be excluded via
 * .rcodeignore files (#249).
 */
function walkFiles(dir, extraIgnore = []) {
  if (!fs.existsSync(dir)) return [];
  return fg.sync('**/*', {
    cwd: dir,
    dot: true,
    onlyFiles: true,
    followSymbolicLinks: false,
    ignore: extraIgnore,
  }).map((rel) => path.join(dir, rel));
}

/**
 * Read .rcodeignore patterns from a given root directory.
 * Returns an array of glob-style ignore patterns (same syntax as .gitignore).
 */
function readRcodeIgnore(root) {
  const ignoreFile = path.join(root, '.rcodeignore');
  if (!fs.existsSync(ignoreFile)) return [];
  return fs.readFileSync(ignoreFile, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
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
 * workflows work immediately after install. User can /rcode-sprint-planning
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

  // Stub planning files: clearly marked as install templates so users (and
  // /rcode-new-project Step 0.5 detection) can tell them apart from real
  // planning artifacts. See issues #670 #671 #676.
  const STUB_BANNER =
    `<!-- INSTALL STUB — overwritten by /rcode-new-project. Delete this file or run\n` +
    `     /rcode-new-project before committing. See https://github.com/hanzlahabib/rcode/issues/670 -->\n\n`;

  fs.writeFileSync(projectPath,
    STUB_BANNER +
    `# ${name}\n\n` +
    `**One-line:** Describe what this project is in one sentence.\n\n` +
    `## Vision\n\n` +
    `What this project delivers and who it serves.\n\n` +
    `## Stack\n\n` +
    `- Language/framework\n- Key dependencies\n- Deployment target\n`
  );

  fs.writeFileSync(roadmapPath,
    STUB_BANNER +
    `# ${name} — Roadmap\n\n` +
    `**Milestone: M1 — Initial Delivery** (v1.0)\n` +
    `Started: ${today} · Current\n\n` +
    `---\n\n` +
    `> **No phases yet.** Run \`/rcode-new-project\` to design your roadmap,\n` +
    `> or \`/rcode-add-phase <name>\` to add your first phase manually.\n\n` +
    `---\n\n` +
    `## Backlog\n\n` +
    `Ideas and future phases go here.\n`
  );

  fs.writeFileSync(statePath,
    STUB_BANNER +
    `# ${name} — State\n\n` +
    `**Last updated:** ${today}\n` +
    `**Milestone:** M1 — Initial Delivery\n` +
    `**Current phase:** none — run /rcode-new-project or /rcode-add-phase\n` +
    `**Branch:** main\n\n` +
    `---\n\n` +
    `## Decisions\n\n_None yet._\n\n` +
    `## Blockers\n\n_None._\n\n` +
    `## Next Action\n\nRun \`/rcode-new-project <description>\` to bootstrap, or \`/rcode-sprint-planning\` once a real phase exists.\n`
  );

  // Issue #670: do NOT pre-seed .rcode/state.json with a fake project +
  // "Setup & Scaffolding" phase. That made every fresh install look like a
  // real initialized project and broke /rcode-new-project Step 0.5 detection.
  //
  // Write a minimal shell with _seeded_stub:true so:
  //   - rcode-tools doesn't have to re-init on first call (avoids race)
  //   - /rcode-new-project Step 0.5 (issue #671) can detect "stub" reliably
  //   - sprint tools that previously relied on phase 01 will surface a clear
  //     "no phases yet — run /rcode-new-project first" error instead of
  //     silently operating on a fake phase
  //
  // Issue #705: only mark _seeded_stub when the planning ROADMAP is also
  // a stub. If the user manually deletes state.json but has real
  // .planning/ROADMAP.md (no INSTALL STUB banner), seeding _seeded_stub
  // would mis-classify a real project as fresh and let /rcode-new-project
  // overwrite it. Guard with the banner check.
  const rcodeStateJson = path.join(target, '.rcode', 'state.json');
  function planningRoadmapIsStub() {
    const rmPath = path.join(target, '.planning', 'ROADMAP.md');
    if (!fs.existsSync(rmPath)) return true; // missing → fresh install case
    try {
      const text = fs.readFileSync(rmPath, 'utf8');
      return text.includes('<!-- INSTALL STUB');
    } catch { return true; }
  }
  if (!fs.existsSync(rcodeStateJson)) {
    const now = new Date().toISOString();
    const isStubProject = planningRoadmapIsStub();

    // Resolve project name from config.yaml if available (#816)
    let resolvedProject = null;
    const configYamlPath = path.join(target, '.rcode', 'config.yaml');
    if (fs.existsSync(configYamlPath)) {
      try {
        const cfg = fs.readFileSync(configYamlPath, 'utf8');
        const m = cfg.match(/^project_name:\s*"?([^"\n]+)"?/m);
        if (m) resolvedProject = m[1].trim();
      } catch { /* leave null */ }
    }

    // Sync current_phase from ROADMAP.md if it exists and isn't a stub (#810)
    let resolvedPhase = null;
    const roadmapPath = path.join(target, '.planning', 'ROADMAP.md');
    if (!isStubProject && fs.existsSync(roadmapPath)) {
      try {
        const rm = fs.readFileSync(roadmapPath, 'utf8');
        // Format A — pipe table: | 01 | Phase Name | ...
        const tableMatch = rm.match(/^\|\s*(\d+(?:\.\d+)?)\s*\|/m);
        if (tableMatch) {
          resolvedPhase = String(parseInt(tableMatch[1], 10));
        } else {
          // Format B — heading: ## Phase 01 — Name
          const headMatch = rm.match(/^#{2,4}\s*Phase\s+(\d+(?:\.\d+)?)/im);
          if (headMatch) resolvedPhase = String(parseInt(headMatch[1], 10));
        }
      } catch { /* leave null */ }
    }

    const state = {
      version: '1',
      // #940 — match the canonical schema (cli/lib/schemas.cjs stateSchema):
      // schema_version is required, milestones is a plural array. Without these
      // a freshly-installed state.json failed `rcode-tools validate` until the
      // first migrateState() read. Write conformant state up front.
      schema_version: 2,
      project: resolvedProject || path.basename(target),
      ...(isStubProject ? { _seeded_stub: true } : {}),
      created: now,
      updated: now,
      current_phase: resolvedPhase,
      current_plan: 0,
      current_sprint: null,
      phases: [],
      milestones: [],
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
    fs.mkdirSync(path.dirname(rcodeStateJson), { recursive: true });
    writeFileAtomic(rcodeStateJson, JSON.stringify(state, null, 2) + '\n');
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
    '# Edit `commit_planning` in .rcode/config.yaml to flip planning-artifact tracking.',
    '',
    '# Installed methodology files (regenerate with: npx @hanzlaa/rcode install)',
    '.claude/',
    '.rcode/bin/',
    '.rcode/data/',
    '.rcode/workflows/',
    '.rcode/references/',
    '.rcode/commands/',
    '.rcode/skills/',
    '',
    '# Pulled rcode brain content (refresh with: rcode brain pull)',
    '.rcode/brain/rcode-github/',
    '.rcode/brain/rcode-docs/',
    '.rcode/brain/best-practices/',
    '',
    '# Runtime noise',
    'node_modules/',
    '.rcode/state.json.lock',
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
    '#   .rcode/config.yaml        - project mode/language/profile/commit_planning',
    '#   .rcode/state.json         - decisions, roadmap pointer, blockers',
    '#   .rcode/brain/sources.yaml - brain source manifest',
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
      writeFileAtomic(gitignorePath, BLOCK);
      return { action: 'created' };
    }
    const existing = fs.readFileSync(gitignorePath, 'utf8');
    // Replace existing rcode block using indexOf (regex escaping on the
    // sentinel is fiddly — indexOf is deterministic and easier to audit).
    function spliceBlock(text, newBlock) {
      const start = text.indexOf(BEGIN);
      if (start < 0) return null;
      const endIdx = text.indexOf(END, start);
      // If BEGIN exists but END is missing (manual edit removed it), strip
      // everything from BEGIN to EOF and rewrite — avoids duplicate blocks.
      if (endIdx < 0) {
        let sliceStart = start;
        if (sliceStart > 0 && text[sliceStart - 1] === '\n') sliceStart -= 1;
        return text.slice(0, sliceStart) + newBlock;
      }
      let sliceStart = start;
      if (sliceStart > 0 && text[sliceStart - 1] === '\n') sliceStart -= 1;
      let sliceEnd = endIdx + END.length;
      if (text[sliceEnd] === '\n') sliceEnd += 1;
      return text.slice(0, sliceStart) + newBlock + text.slice(sliceEnd);
    }
    if (existing.includes(BEGIN)) {
      const rewritten = spliceBlock(existing, BLOCK);
      if (rewritten !== null && rewritten !== existing) {
        writeFileAtomic(gitignorePath, rewritten);
        return { action: 'updated' };
      }
      return { action: 'already-present' };
    }
    writeFileAtomic(gitignorePath, existing + BLOCK);
    return { action: 'appended' };
  } catch (err) {
    return { action: 'skipped-error', error: err.message };
  }
}

/**
 * Ensure .git/hooks/pre-commit includes the rcode-managed block that auto-syncs
 * state.json when .planning/ or .rcode/brain/sources.yaml files change.
 *
 * Idempotent via sentinels — existing user hook content is preserved.
 * Respects opts.gitHooks: false → skip entirely (--no-git-hooks flag).
 *
 * Returns: { action: 'created' | 'appended' | 'already-present' | 'skipped-no-git' | 'skipped-flag' | 'skipped-error' }
 */
function ensureRcodePreCommitHook(target, options = {}) {
  if (options.gitHooks === false) return { action: 'skipped-flag' };

  const gitDir = path.join(target, '.git');
  if (!fs.existsSync(gitDir) || !fs.statSync(gitDir).isDirectory()) {
    return { action: 'skipped-no-git' };
  }

  const BEGIN = '# ===== rcode-managed pre-commit block =====';
  const END   = '# ===== end rcode pre-commit block =====';

  const BLOCK = [
    '',
    BEGIN,
    '# Auto-syncs .rcode/state.json when planning files change.',
    '# Added by rcode install — safe to re-run (idempotent).',
    'if git diff --cached --name-only | grep -qE "^\\.planning/|^\\.rcode/brain/sources\\.yaml$"; then',
    '  if [ -x .rcode/bin/rcode-tools.cjs ]; then',
    '    node .rcode/bin/rcode-tools.cjs state sync --from-disk > /dev/null 2>&1 || true',
    '    git add .rcode/state.json 2>/dev/null || true',
    '  fi',
    'fi',
    END,
    '',
  ].join('\n');

  const hooksDir = path.join(gitDir, 'hooks');
  const hookPath = path.join(hooksDir, 'pre-commit');

  try {
    fs.mkdirSync(hooksDir, { recursive: true });

    if (!fs.existsSync(hookPath)) {
      writeFileAtomic(hookPath, `#!/bin/sh\n${BLOCK}`, { mode: 0o755 });
      return { action: 'created' };
    }

    const existing = fs.readFileSync(hookPath, 'utf8');

    function spliceBlock(text, newBlock) {
      const start = text.indexOf(BEGIN);
      if (start < 0) return null;
      const endIdx = text.indexOf(END, start);
      // If BEGIN exists but END is missing, strip from BEGIN to EOF and rewrite.
      if (endIdx < 0) {
        let sliceStart = start;
        if (sliceStart > 0 && text[sliceStart - 1] === '\n') sliceStart -= 1;
        return text.slice(0, sliceStart) + newBlock;
      }
      let sliceStart = start;
      if (sliceStart > 0 && text[sliceStart - 1] === '\n') sliceStart -= 1;
      let sliceEnd = endIdx + END.length;
      if (text[sliceEnd] === '\n') sliceEnd += 1;
      return text.slice(0, sliceStart) + newBlock + text.slice(sliceEnd);
    }

    if (existing.includes(BEGIN)) {
      const rewritten = spliceBlock(existing, BLOCK);
      if (rewritten !== null && rewritten !== existing) {
        writeFileAtomic(hookPath, rewritten, { mode: 0o755 });
        return { action: 'updated' };
      }
      return { action: 'already-present' };
    }

    writeFileAtomic(hookPath, existing + BLOCK, { mode: 0o755 });
    return { action: 'appended' };
  } catch (err) {
    return { action: 'skipped-error', error: err.message };
  }
}

/**
 * Install brain scaffold (sources.yaml + README.md) into .rcode/brain/ on target.
 * Actual brain content lands after `brain pull` runs.
 * Closes #188 — previously the package's rcode/brain/sources.yaml was never
 * copied to the target at all, leaving brain pull permanently broken.
 */
function installBrainScaffold(packageRoot, target) {
  const srcDir = path.join(packageRoot, 'rcode', 'brain');
  const destDir = path.join(target, '.rcode', 'brain');
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
  // rcode/skills/_shared/ so a fresh install has working brain content
  // immediately, even before brain pull runs against real upstream URLs.
  const sharedSrc = path.join(packageRoot, 'rcode', 'skills', '_shared');
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
 * User-facing skills  → .claude/skills/rcode-{name}   (phrase-activated, visible as slash commands)
 * Internal skills     → .rcode/skills/rcode-{name}    (utility libs called by other skills, NOT in
 *                                                       .claude/skills/ so they don't pollute the menu)
 *
 * A skill is marked internal by adding `internal: true` to its SKILL.md frontmatter.
 */
function installSkills(packageRoot, target, options = {}) {
  const skillsSource = path.join(packageRoot, 'rcode/skills');
  const skillsDest = path.join(target, '.claude/skills');
  const internalDest = path.join(target, '.rcode/skills');

  if (!fs.existsSync(skillsSource)) return { count: 0, skippedGlobal: 0 };
  fs.mkdirSync(skillsDest, { recursive: true });
  fs.mkdirSync(internalDest, { recursive: true });

  // Issue #679: when ~/.claude/skills/<name>/ already exists with the rcode-
  // prefix, Claude Code reads from BOTH global and project, showing every
  // /rcode-* twice in the slash picker. Skip the project copy for any rcode-*
  // skill that already lives in the global skills dir.
  const globalSkillsDir = path.join(homedir(), '.claude', 'skills');
  const globalRcodeSkills = (options.skipGlobalDuplicates && fs.existsSync(globalSkillsDir))
    ? new Set(fs.readdirSync(globalSkillsDir).filter(n => n.startsWith('rcode-')))
    : new Set();

  let count = 0;
  let skippedGlobal = 0;

  const _internalSkillCache = new Map();
  function isInternalSkill(skillDir) {
    if (_internalSkillCache.has(skillDir)) return _internalSkillCache.get(skillDir);
    const skillMd = path.join(skillDir, 'SKILL.md');
    if (!fs.existsSync(skillMd)) { _internalSkillCache.set(skillDir, false); return false; }
    const text = fs.readFileSync(skillMd, 'utf8');
    const result = /^internal:\s*true\s*$/m.test(text);
    _internalSkillCache.set(skillDir, result);
    return result;
  }

  function hasLocalOverride(destDir) {
    if (!fs.existsSync(destDir)) return false;
    try {
      return fs.readdirSync(destDir).some(f => f.endsWith('.local.md'));
    } catch { return false; }
  }

  function walkForSkills(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const src = path.join(dir, entry.name);
      const hasSkillMd = fs.existsSync(path.join(src, 'SKILL.md'));
      if (hasSkillMd) {
        const destName = entry.name.startsWith('rcode-')
          ? entry.name
          : `rcode-${entry.name}`;
        const internal = isInternalSkill(src);
        const dest = internal
          ? path.join(internalDest, destName)   // internal → .rcode/skills/
          : path.join(skillsDest, destName);     // user-facing → .claude/skills/

        // Skip user-facing (non-internal) rcode-* skills when the same name
        // exists globally — UNLESS the user has a *.local.md override on the
        // project copy, in which case we always preserve their customization.
        if (!internal && globalRcodeSkills.has(destName) && !hasLocalOverride(dest)) {
          // Also remove the existing project copy (left over from previous
          // installs that didn't dedup) so it stops showing in the picker.
          if (fs.existsSync(dest)) {
            // #688 — safeRmSync refuses to traverse symlinks pointing outside target.
            try { safeRmSync(dest, target); } catch { /* non-fatal */ }
          }
          skippedGlobal++;
          continue;
        }
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

  return { count, skippedGlobal };
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
/**
 * Migrate legacy vscode-layout commands (.claude/commands/rcode/{name}.md)
 * to the unified prefixed-root form (.claude/commands/rcode-{name}.md).
 *
 * Idempotent. Safe to run on every install/update — no-op when no legacy
 * dir exists. After move, removes the now-empty rcode/ subdir.
 *
 * Returns { moved, removed_dir } so callers can log the migration count.
 * Designed by Waleed for #723; closes the dual-layout cause of #635, #637,
 * #638, #639, #640, #641, #642, #643, #646.
 */
function migrateVscodeCommandsLayout(target) {
  const legacyDir = path.join(target, '.claude', 'commands', 'rcode');
  const newRoot = path.join(target, '.claude', 'commands');
  if (!fs.existsSync(legacyDir) || !fs.statSync(legacyDir).isDirectory()) {
    return { moved: 0, removed_dir: false };
  }
  let moved = 0;
  for (const entry of fs.readdirSync(legacyDir)) {
    const src = path.join(legacyDir, entry);
    if (!fs.statSync(src).isFile() || !entry.endsWith('.md')) continue;
    const baseName = path.basename(entry, '.md');
    // Don't double-prefix if someone already had rcode-foo.md inside rcode/.
    const targetName = baseName.startsWith('rcode-') ? entry : `rcode-${entry}`;
    const dst = path.join(newRoot, targetName);
    if (fs.existsSync(dst)) {
      // Already migrated by an earlier pass — remove the duplicate at source.
      fs.unlinkSync(src);
      continue;
    }
    fs.renameSync(src, dst);
    moved++;
  }
  // Remove the now-empty legacy dir. fs.rmdir fails if non-empty — that's
  // a signal worth surfacing (manual user files in the dir we shouldn't touch).
  let removedDir = false;
  try {
    fs.rmdirSync(legacyDir);
    removedDir = true;
  } catch (_) {
    // Non-empty (user files we don't manage) — leave it alone.
  }
  return { moved, removed_dir: removedDir };
}

function buildInstallPlan(ide = 'claude', target = process.cwd()) {
  // Support array of IDEs — merge plans with deduplication (#449/#450 multi-IDE).
  if (Array.isArray(ide)) {
    const seen = new Set();
    const merged = [];
    for (const i of ide) {
      for (const entry of buildInstallPlan(i, target)) {
        const key = entry.rel;
        if (!seen.has(key)) {
          seen.add(key);
          merged.push(entry);
        }
      }
    }
    // Note: pre-#723 we had a dual-layout workaround here that filtered
    // vscode subdir entries when claude+vscode were both selected. After
    // Waleed's unification (vscode now writes the same rcode-{name}.md root
    // form as claude), the seen-by-rel dedup above already covers it — both
    // IDEs emit identical `rel` values and only one wins. Layout drift will
    // resurface this filter; it's intentionally deleted, not commented out.
    return merged;
  }

  const plan = [];
  const paths = getPathsForIde(ide, target);

  // Compute relative paths from target root
  const relWorkflows = path.relative(target, paths.workflowsDir);
  const relReferences = path.relative(target, paths.referencesDir);
  const relBin = path.relative(target, paths.binDir);
  const relAgents = path.relative(target, paths.agentsDir);
  const relCommands = path.relative(target, paths.commandsDir);

  // .rcode/workflows/
  for (const f of walkFiles(path.join(SOURCE_ROOT, 'workflows'))) {
    const rel = path.relative(path.join(SOURCE_ROOT, 'workflows'), f);
    plan.push({ src: f, rel: path.join(relWorkflows, rel) });
  }

  // .rcode/references/
  for (const f of walkFiles(path.join(SOURCE_ROOT, 'references'))) {
    const rel = path.relative(path.join(SOURCE_ROOT, 'references'), f);
    plan.push({ src: f, rel: path.join(relReferences, rel) });
  }

  // .rcode/bin/
  for (const f of walkFiles(path.join(SOURCE_ROOT, 'bin'))) {
    const rel = path.relative(path.join(SOURCE_ROOT, 'bin'), f);
    plan.push({ src: f, rel: path.join(relBin, rel), executable: f.endsWith('.cjs') });
  }

  // .rcode/data/
  for (const f of walkFiles(path.join(SOURCE_ROOT, 'data'))) {
    const rel = path.relative(path.join(SOURCE_ROOT, 'data'), f);
    plan.push({ src: f, rel: path.join('.rcode', 'data', rel) });
  }

  // .rcode/templates/projects/  — starter templates consumed by /rcode-from-template
  const projectTemplatesSrc = path.join(SOURCE_ROOT, 'templates', 'projects');
  const relProjectTemplates = path.relative(target, path.join(target, '.rcode', 'templates', 'projects'));
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
  // Claude AND VSCode: output as .claude/commands/rcode-{name}.md (prefixed root).
  // Both target the same commands dir (#723 / Waleed unification) so multi-IDE
  // installs never duplicate. Cursor/Gemini keep the bare-name-in-rcode/-subdir form.
  for (const f of walkFiles(path.join(SOURCE_ROOT, 'commands'))) {
    const rel = path.relative(path.join(SOURCE_ROOT, 'commands'), f);
    const ext = ide === 'cursor' ? '.mdc' : '.md';
    const baseName = path.basename(f, '.md');
    const outName = (ide === 'claude' || ide === 'vscode' || ide === 'grok')
      ? `rcode-${baseName}${ext}`
      : baseName + ext;
    plan.push({ src: f, rel: path.join(relCommands, path.dirname(rel), outName), ide, cursor: ide === 'cursor' });
  }

  // Agent rules (on-demand reference files) — copied to .rcode/agents-rules/
  const agentRulesDir = path.join(target, '.rcode', 'agents-rules');
  for (const f of walkFiles(path.join(SOURCE_ROOT, 'agents', 'rules'))) {
    const rel = path.relative(path.join(SOURCE_ROOT, 'agents', 'rules'), f);
    plan.push({ src: f, rel: path.join('.rcode', 'agents-rules', rel) });
  }

  return plan;
}

/**
 * Parse a module YAML manifest (rcode/modules/{name}.yaml).
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
 * List available module names by scanning rcode/modules/*.yaml
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
    for (const w of mod.workflows) allowed.add(path.join('.rcode', 'workflows', w));
    for (const c of mod.commands) allowed.add(path.join('.claude', 'commands', `rcode-${c}`));
    for (const r of mod.references) allowed.add(path.join('.rcode', 'references', r));
  }
  // Always include bin/ (shared infrastructure, not module-specific)
  return plan.filter((entry) => {
    if (entry.rel.startsWith(path.join('.rcode', 'bin'))) return true;
    if (entry.rel.startsWith(path.join('.rcode', 'data'))) return true;
    return allowed.has(entry.rel);
  });
}

/**
 * Auto-generate agent-manifest.csv from the installed agent files'
 * frontmatter. Columns: id, file, name, description, color.
 *
 * The `id` column strips the `rcode-` prefix so workflow code can match
 * against the council-panel scorer's AGENT_IDS (which use bare names).
 */
function generateAgentManifest(plan, target) {
  const rows = [['id', 'file', 'name', 'description', 'color']];
  const seen = new Set(); // Track IDs already added to avoid duplicates
  // Memoize per-file text reads — same agent .md may be visited across loops 1-3.
  const _textCache = new Map();
  const readAgentText = (p) => {
    if (!_textCache.has(p)) _textCache.set(p, fs.readFileSync(p, 'utf8'));
    return _textCache.get(p);
  };

  for (const entry of plan) {
    if (!entry.rel.startsWith(path.join('.claude', 'agents'))) continue;
    if (!entry.rel.match(/^\.claude[\/\\]agents[\/\\][^\/\\]+\.md$/)) continue;
    const filePath = path.join(target, entry.rel);
    const text = readAgentText(filePath);
    const { frontmatter } = parseFrontmatter(text);
    const name = frontmatter.name || path.basename(entry.rel, '.md');
    const bareId = name.replace(/^rcode-/, '');
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
    const existingFiles = fs.readdirSync(agentDir).filter(f => f.startsWith('rcode-') && f.endsWith('.md'));
    const alreadyIncluded = new Set(plan.filter(e => e.rel.startsWith(path.join('.claude', 'agents'))).map(e => path.basename(e.rel)));
    for (const file of existingFiles) {
      if (alreadyIncluded.has(file)) continue;
      const filePath = path.join(agentDir, file);
      const text = readAgentText(filePath);
      const { frontmatter } = parseFrontmatter(text);
      const name = frontmatter.name || path.basename(file, '.md');
      const bareId = name.replace(/^rcode-/, '');
      if (seen.has(bareId)) continue; // Skip if already added
      seen.add(bareId);
      const desc = (frontmatter.description || '').replace(/"/g, '""');
      rows.push([bareId, path.join('.claude', 'agents', file), name, `"${desc}"`, frontmatter.color || '']);
    }
  }
  // Issues #805/#808/#825: always scan known global locations (not gated on
  // rows.length === 1) so the manifest reflects every installed agent. On a
  // fresh project install agents may live in ~/.claude/agents/ (global slash
  // commands) or in the source tree if local copy was skipped via dedup.
  // Also scan rcode/agents/ in SOURCE_ROOT as a last-resort fallback so the
  // manifest is never empty when the package itself ships agent definitions.
  const extraScans = [
    path.join(homedir(), '.claude', 'agents'),
    path.join(homedir(), '.rcode', 'agents'),
  ];
  // Final fallback: scan the package source itself.
  try {
    const sourceAgentsDir = path.join(SOURCE_ROOT, 'agents');
    if (fs.existsSync(sourceAgentsDir)) extraScans.push(sourceAgentsDir);
  } catch { /* SOURCE_ROOT may not be in scope on some paths */ }

  for (const scanDir of extraScans) {
    if (!fs.existsSync(scanDir)) continue;
    let files;
    try {
      files = fs.readdirSync(scanDir).filter(f => f.startsWith('rcode-') && f.endsWith('.md'));
    } catch { continue; }
    for (const file of files) {
      const filePath = path.join(scanDir, file);
      let text;
      try { text = readAgentText(filePath); } catch { continue; }
      const { frontmatter } = parseFrontmatter(text);
      const name = frontmatter.name || path.basename(file, '.md');
      const bareId = name.replace(/^rcode-/, '');
      if (seen.has(bareId)) continue;
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
function generateFilesManifest(plan, target, { mergeExistingManifest = false, extraScanDirs = [] } = {}) {
  const rows = [['rel', 'sha256', 'size']];
  const newRels = new Set();
  // Memoize Buffer reads — plan loop and merge loop can visit the same file path.
  const _bufCache = new Map();
  const readFileBuf = (p) => {
    if (!_bufCache.has(p)) _bufCache.set(p, fs.readFileSync(p));
    return _bufCache.get(p);
  };

  for (const entry of plan) {
    const filePath = path.join(target, entry.rel);
    if (!fs.existsSync(filePath)) continue;
    const buf = readFileBuf(filePath);
    const rel = entry.rel.split(path.sep).join('/');
    rows.push([rel, sha256(buf), String(buf.length)]);
    newRels.add(rel);
  }

  // Issue #702: skills installed via installSkills() and sidebar stubs
  // generated by cli/generate-command-skills.cjs are NOT in the install plan
  // (they're walked from rcode/skills/ separately and copied directly).
  // Without this scan, files-manifest.csv was missing the largest category
  // of installed files — orphan sweep + doctor drift detection were blind
  // to renamed/removed skills.
  function walkScanDir(absDir) {
    if (!fs.existsSync(absDir)) return;
    for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
      const full = path.join(absDir, entry.name);
      if (entry.isDirectory()) {
        walkScanDir(full);
      } else if (entry.isFile()) {
        const rel = path.relative(target, full).split(path.sep).join('/');
        if (newRels.has(rel)) continue; // already in plan
        // Skip files outside the project root (defense-in-depth — extraScanDirs
        // is a code-controlled set, but cheap to verify).
        if (rel.startsWith('..') || path.isAbsolute(rel)) continue;
        try {
          const buf = readFileBuf(full);
          rows.push([rel, sha256(buf), String(buf.length)]);
          newRels.add(rel);
        } catch { /* unreadable file — skip */ }
      }
    }
  }
  for (const scan of extraScanDirs) walkScanDir(scan);

  // Merge old manifest entries that are still on disk but not in the current
  // plan — this keeps orphaned files traceable by doctor/uninstall even when
  // --force sweep was not run. Without this, a re-install without --force
  // silently drops stale files from the manifest, making them invisible.
  if (mergeExistingManifest) {
    const manifestPath = path.join(target, '.rcode', '_config', 'files-manifest.csv');
    if (fs.existsSync(manifestPath)) {
      try {
        const oldRows = fs.readFileSync(manifestPath, 'utf8').split('\n').slice(1).filter(Boolean);
        for (const row of oldRows) {
          const [rel] = row.split(',');
          if (!rel || newRels.has(rel)) continue;
          const full = path.join(target, rel);
          if (!fs.existsSync(full)) continue; // already gone — don't re-add
          const buf = readFileBuf(full);
          rows.push([rel, sha256(buf), String(buf.length)]);
          newRels.add(rel);
        }
      } catch { /* best-effort */ }
    }
  }

  return rows.map((r) => r.join(',')).join('\n') + '\n';
}

/**
 * Orphan sweep — remove files that were part of a previous install but aren't
 * in the current plan. Reads `.rcode/_config/files-manifest.csv` from the
 * previous install and computes the diff against the new plan.
 *
 * Closes #196 — without this, upgrading rcode leaves stale skill/command
 * files around that show up as ghost slash commands in the IDE.
 *
 * Deliberately conservative:
 *   - Only removes files that appeared in the PREVIOUS manifest.
 *   - Never removes files the user created themselves.
 *   - Never touches .rcode/config.yaml, .rcode/state.json, or .planning/.
 *
 * Returns the number of orphan files removed.
 */
function sweepStaleInstalledFiles(target, newPlan) {
  const manifestPath = path.join(target, '.rcode', '_config', 'files-manifest.csv');
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
  const neverSweep = /^(\.rcode\/config\.yaml|\.rcode\/state\.json|\.rcode\/state\.json\.lock|\.planning\/|\.rcode\/brain\/sources\.yaml)/;
  // #382 — local overrides: files matching <name>.local.md are user-managed.
  // The installer never touches them: not in copy, not in sweep, not even on
  // --force-overwrite. This gives users a stable path to customize agent
  // voice / examples / project-specific rules without losing them on update.
  const isLocalOverride = (rel) => /\.local\.(md|mdc|json|yaml|yml|toml|js|ts)$/.test(rel);

  let removed = 0;
  const emptyCandidateDirs = new Set();
  // Issue #703: a tampered or malformed CSV could contain a rel like
  // '../../etc/passwd'. path.join collapses '..' segments and could escape
  // the project root. Use safeRmSync's project-root containment check —
  // any rel whose realpath escapes target is refused with reason='outside-root'.
  const targetRoot = path.resolve(target);
  for (const rel of oldRels) {
    if (newRelsSet.has(rel)) continue;
    if (neverSweep.test(rel)) continue;
    if (isLocalOverride(rel)) continue; // #382 — never sweep user-owned overrides
    // Reject relative paths that obviously try to escape before even hitting fs.
    if (rel.includes('..') || path.isAbsolute(rel)) continue;
    const full = path.join(target, rel);
    if (!fs.existsSync(full)) continue;
    const result = safeRmSync(full, targetRoot);
    if (result.ok) {
      emptyCandidateDirs.add(path.dirname(full));
      removed += 1;
    }
    // outside-root / lstat / unlink failures are silently skipped — sweep is
    // best-effort and we never want to abort the install on a single bad row.
  }

  // Remove any now-empty parent dirs (bottom-up, so nested emptiness cascades).
  const dirsSortedDeep = Array.from(emptyCandidateDirs).sort((a, b) => b.length - a.length);
  for (const dir of dirsSortedDeep) {
    try {
      if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) {
        fs.rmdirSync(dir);
      }
    } catch (err) {
      console.error('[install] sweepStaleInstalledFiles: failed to remove empty dir', dir + ':', err?.message || err);
    }
  }

  return removed;
}

/**
 * Issue #838 — pnpm lockfile silent failure detection.
 *
 * pnpm add -D can exit 0 and print "Done" even when the lockfile is
 * corrupted, without actually writing package.json. This helper is called
 * after any pnpm add run (including auto-install flows) to confirm the
 * package genuinely landed in devDependencies.
 *
 * Returns { ok: true } when:
 *   - no package.json exists in target (nothing to verify)
 *   - package found in dependencies or devDependencies
 *
 * Returns { ok: false, message } when:
 *   - package.json exists in a pnpm project (pnpm-lock.yaml present) but
 *     @hanzlaa/rcode is absent from both dep sections — strongly suggests
 *     a silent pnpm add failure due to a broken lockfile.
 */
function verifyPnpmAddDevDep(target) {
  const pkgPath = path.join(target, 'package.json');
  const lockPath = path.join(target, 'pnpm-lock.yaml');
  // Only diagnose when both a package.json and pnpm-lock.yaml exist (pnpm project).
  if (!fs.existsSync(pkgPath) || !fs.existsSync(lockPath)) return { ok: true };
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const inDeps = Object.prototype.hasOwnProperty.call(pkg.dependencies || {}, '@hanzlaa/rcode');
    const inDevDeps = Object.prototype.hasOwnProperty.call(pkg.devDependencies || {}, '@hanzlaa/rcode');
    if (!inDeps && !inDevDeps) {
      return {
        ok: false,
        message:
          '@hanzlaa/rcode not found in package.json — if you ran `pnpm add -D @hanzlaa/rcode` ' +
          'and it reported success, your lockfile may be corrupted.\n' +
          '  Fix: pnpm install --fix-lockfile && pnpm add -D @hanzlaa/rcode',
      };
    }
    return { ok: true };
  } catch {
    return { ok: true }; // unreadable package.json — not our problem
  }
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
  // Merge with existing manifest if present; capture previous_version for rollback (#253).
  let existingModules = [];
  let previousVersion = null;
  const existingPath = path.join(opts.target, '.rcode', '_config', 'manifest.yaml');
  if (fs.existsSync(existingPath)) {
    const text = fs.readFileSync(existingPath, 'utf8');
    let inModules = false;
    for (const line of text.split('\n')) {
      if (line.startsWith('version:')) {
        const v = line.replace('version:', '').trim();
        if (semver.valid(v) && v !== version) previousVersion = v;
      }
      if (line.startsWith('modules:')) { inModules = true; continue; }
      if (inModules && line.trim().startsWith('-')) { existingModules.push(line.trim().slice(1).trim()); }
      else if (inModules && !line.startsWith(' ')) { inModules = false; }
    }
  }
  const allModules = [...new Set([...existingModules, ...newModules])];
  const moduleLines = allModules.map((m) => `  - ${m}`).join('\n');
  const lines = [
    '# rcode v2 install manifest',
    `version: ${version}`,
    `installDate: ${new Date().toISOString()}`,
  ];
  if (previousVersion) lines.push(`previous_version: ${previousVersion}`);
  lines.push('modules:', moduleLines, 'ides:', '  - claude-code', '');
  return lines.join('\n');
}

function sanitizeYamlValue(val) {
  return (val || '').replace(/[\n\r]/g, ' ').replace(/"/g, '\\"');
}

function generateConfigYaml(opts) {
  return [
    '# rcode v2 project config',
    '# Generated by install. Safe to edit.',
    `user_name: "${sanitizeYamlValue(opts.userName)}"`,
    `project_name: "${sanitizeYamlValue(opts.projectName)}"`,
    `communication_language: "${sanitizeYamlValue(opts.language)}"`,
    `mode: "${sanitizeYamlValue(opts.mode)}"`,
    `model_profile: "balanced"`,
    `commit_planning: ${opts.commitPlanning !== false}`,
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
 * Validate a parsed config.yaml object against ConfigSchema (#250).
 * Returns { valid: true } or { valid: false, errors: string[] }.
 */
function validateConfig(data) {
  const result = ConfigSchema.safeParse(data);
  if (result.success) return { valid: true };
  const errors = result.error.issues.map((issue) => {
    const field = issue.path.join('.');
    return `  ${field || '(root)'}: ${issue.message}`;
  });
  return { valid: false, errors };
}

/**
 * Parse a minimal YAML key:value file into a plain object.
 * Only handles scalar values — sufficient for config.yaml.
 */
function parseSimpleYaml(text) {
  const obj = {};
  let currentParent = null;
  for (const raw of text.split('\n')) {
    const line = raw.replace(/#.*$/, '');
    if (!line.trim()) continue;
    const indent = line.match(/^(\s*)/)[1].length;
    if (indent === 0) {
      const colonAt = line.indexOf(':');
      if (colonAt === -1) continue;
      const key = line.slice(0, colonAt).trim();
      let val = line.slice(colonAt + 1).trim();
      if (val === '') { currentParent = key; obj[key] = {}; continue; }
      currentParent = null;
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
      if (val === 'true') val = true;
      else if (val === 'false') val = false;
      obj[key] = val;
    } else if (currentParent && indent > 0) {
      const colonAt = line.indexOf(':');
      if (colonAt === -1) continue;
      const key = line.slice(0, colonAt).trim();
      let val = line.slice(colonAt + 1).trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      if (val === 'true') val = true;
      else if (val === 'false') val = false;
      obj[currentParent][key] = val;
    }
  }
  return obj;
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

  // Issue #680: --reset alone is a footgun — silently does nothing. Fail
  // fast with a clear message before any work happens.
  if (opts.reset && !opts.force) {
    console.log('');
    console.log('  ' + warn('--reset has no effect without --force.'));
    console.log('  ' + dim('  --reset wipes config.yaml and state.json. To prevent accidental data loss,'));
    console.log('  ' + dim('  it must be paired with --force. Re-run as:'));
    console.log('  ' + dim('    rcode install --reset --force'));
    console.log('');
    return 2;
  }

  // Issue #691: file lock prevents concurrent installs from racing on the
  // same .rcode/_config/manifest.yaml + files-manifest.csv. Without it, two
  // parallel runs (two terminals, postinstall + manual install, etc.) can
  // each write a manifest the OTHER doesn't see → orphan sweep on the next
  // install deletes files the other run considered legit.
  let releaseLock = () => {};
  if (!opts.global) {
    const lockResult = acquireInstallLock(opts.target);
    if (!lockResult.ok) {
      console.log('');
      console.log('  ' + warn(`Another install is already running here (PID ${lockResult.pid}).`));
      console.log('  ' + dim(`  Lock: ${lockResult.lockPath}`));
      console.log('  ' + dim('  If the other process crashed, delete the lock file and retry:'));
      console.log('  ' + dim(`    rm ${lockResult.lockPath}`));
      console.log('');
      return 3;
    }
    releaseLock = lockResult.release;
    // Make sure the lock is released even if install throws unexpectedly.
    process.on('exit', releaseLock);
  }

  try {
    return await installInner(opts);
  } finally {
    releaseLock();
    process.removeListener('exit', releaseLock);
  }
}

/**
 * Acquire an exclusive install lock at .rcode/.install.lock (issue #691).
 *
 * Returns:
 *   { ok: true, release: () => void }                 lock acquired
 *   { ok: false, pid: number, lockPath: string }      another process holds it
 *
 * Stale-lock detection: if the recorded PID is not alive, the lock is
 * reclaimed automatically.
 */
function acquireInstallLock(target) {
  const lockDir = path.join(target, '.rcode');
  const lockPath = path.join(lockDir, '.install.lock');
  try {
    fs.mkdirSync(lockDir, { recursive: true });
  } catch { /* fall through; openSync will fail with a clearer error */ }

  function isAlive(pid) {
    try { process.kill(pid, 0); return true; } catch { return false; }
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const fd = fs.openSync(lockPath, 'wx'); // exclusive create
      fs.writeSync(fd, String(process.pid));
      fs.closeSync(fd);
      return {
        ok: true,
        release: () => {
          try { fs.unlinkSync(lockPath); } catch (err) { console.error('[install] acquireInstallLock: failed to release lock', lockPath + ':', err?.message || err); }
        },
      };
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
      // Lock exists — check if holder is alive.
      let pid = 0;
      try { pid = parseInt(fs.readFileSync(lockPath, 'utf8'), 10); } catch (err) { console.error('[install] acquireInstallLock: failed to read lock pid from', lockPath + ':', err?.message || err); }
      if (pid && !isAlive(pid)) {
        // Stale lock — remove and retry once.
        try { fs.unlinkSync(lockPath); } catch {}
        continue;
      }
      return { ok: false, pid, lockPath };
    }
  }
  // Should be unreachable, but degrade gracefully.
  return { ok: false, pid: 0, lockPath };
}

// ─────────────────────────────────────────────────────────────────────────────
// Native home-dir slash-command install.
//
// Some agentic CLIs surface their `/slash` command menu ONLY from a fixed
// home directory (not from project dirs the way Claude Code / Grok do):
//   • Codex      → ~/.codex/prompts/<name>.md          (flat prompt files)
//   • Antigravity→ ~/.gemini/antigravity/skills/<name>/SKILL.md (skill dirs)
// For those tools the normal project install writes files the CLI never reads,
// so `/rcode-*` never appears. This installs the commands in each CLI's NATIVE
// format into its NATIVE home dir, gated behind the opt-in `--global` flag.
//
// IDEs that read project dirs (claude, grok, cursor, vscode, windsurf) are a
// no-op here — they already work via getPathsForIde().
//
// Each tool's writer lives in its own helper; the dispatcher routes by ide.
// SOURCE_ROOT/commands/*.md is the canonical command source for all writers.
// ─────────────────────────────────────────────────────────────────────────────

// Codex + Antigravity surface NO file-based slash commands (verified live),
// but BOTH support a prompt-submit hook (UserPromptSubmit / UserPrompt) that
// can inject context. We install a hook ROUTER (cli/rcode-slash-router.cjs)
// into each, plus a home-dir copy of every command body the router reads.
// See cli/rcode-slash-router.cjs for the runtime contract.

// Shared: copy every command body to ~/.rcode/slash-commands/<name>.md and the
// router script to ~/.rcode/bin/. A fixed home-dir location lets the hook read
// commands regardless of the user's cwd. Idempotent (plain overwrite).
function installSlashRouterCommands(opts) {
  const home = homedir();
  const cmdDestDir = path.join(home, '.rcode', 'slash-commands');
  const binDestDir = path.join(home, '.rcode', 'bin');
  ensureDir(cmdDestDir);
  ensureDir(binDestDir);

  const srcCmdDir = path.join(SOURCE_ROOT, 'commands');
  let copied = 0;
  for (const file of fs.readdirSync(srcCmdDir)) {
    if (!file.endsWith('.md')) continue;
    fs.copyFileSync(path.join(srcCmdDir, file), path.join(cmdDestDir, file));
    copied++;
  }

  const routerSrc = path.join(PACKAGE_ROOT, 'cli', 'rcode-slash-router.cjs');
  const routerDest = path.join(binDestDir, 'rcode-slash-router.cjs');
  fs.copyFileSync(routerSrc, routerDest);

  if (opts && opts.global !== 'silent') {
    console.log('  ' + ok(`Slash-router: ${copied} command bodies → ~/.rcode/slash-commands/ + router → ~/.rcode/bin/`));
  }
  return routerDest;
}

// The absolute command a hook entry runs. Matched by substring for idempotency
// and for removal on uninstall — keep the basename stable.
function slashRouterHookCommand() {
  return `node "${path.join(homedir(), '.rcode', 'bin', 'rcode-slash-router.cjs')}"`;
}

// Merge a prompt-submit hook entry into an existing CLI hooks JSON file without
// disturbing any pre-existing entries (e.g. herdr's). `eventKey` is the hook
// event name that CLI uses (codex: UserPromptSubmit, antigravity: UserPrompt).
// Idempotent: re-running detects the router by command substring and no-ops.
function mergeSlashRouterHook(jsonPath, eventKey, command, label) {
  let root = {};
  if (fs.existsSync(jsonPath)) {
    try {
      root = JSON.parse(fs.readFileSync(jsonPath, 'utf8')) || {};
    } catch {
      // Unparseable file — don't clobber the user's config; bail loudly.
      console.log('  ' + warn(`${label}: ${jsonPath} is not valid JSON — skipped slash-router wiring.`));
      return false;
    }
  }
  if (!root.hooks || typeof root.hooks !== 'object') root.hooks = {};
  if (!Array.isArray(root.hooks[eventKey])) root.hooks[eventKey] = [];

  const already = root.hooks[eventKey].some(group =>
    Array.isArray(group?.hooks) &&
    group.hooks.some(h => typeof h?.command === 'string' && h.command.includes('rcode-slash-router.cjs')),
  );
  if (already) {
    console.log('  ' + ok(`${label}: slash-router hook already present (idempotent).`));
    return false;
  }

  root.hooks[eventKey].push({ hooks: [{ type: 'command', command, timeout: 10 }] });
  ensureDir(path.dirname(jsonPath));
  fs.writeFileSync(jsonPath, JSON.stringify(root, null, 2) + '\n');
  console.log('  ' + ok(`${label}: wired slash-router into ${eventKey} hook (existing hooks preserved).`));
  return true;
}

// Codex: ~/.codex/hooks.json, event UserPromptSubmit.
function installCodexSlashRouterHook(opts) {
  installSlashRouterCommands(opts);
  const jsonPath = path.join(homedir(), '.codex', 'hooks.json');
  mergeSlashRouterHook(jsonPath, 'UserPromptSubmit', slashRouterHookCommand(), 'Codex');
}

// Antigravity: ~/.gemini/antigravity/settings.json, event UserPrompt.
function installAntigravitySlashRouterHook(opts) {
  installSlashRouterCommands(opts);
  const jsonPath = path.join(homedir(), '.gemini', 'antigravity', 'settings.json');
  mergeSlashRouterHook(jsonPath, 'UserPrompt', slashRouterHookCommand(), 'Antigravity');
}

function installNativeHomeSlashCommands(opts) {
  if (!opts || !opts.global) return;
  const ides = Array.isArray(opts.ides) ? opts.ides : [opts.ide].filter(Boolean);
  for (const ide of ides) {
    switch (ide) {
      case 'codex': installCodexSlashRouterHook(opts); break;
      case 'antigravity': installAntigravitySlashRouterHook(opts); break;
      default:
        break;
    }
  }
}

async function installInner(opts) {
  const pkgVersion = readPackageVersion();

  // Header banner — only shown for interactive runs to keep CI/non-TTY logs terse.
  const isInteractive = process.stdin.isTTY && !opts.yes;
  if (isInteractive) printInstallHeader(pkgVersion);

  // Resolve target IDE (interactive prompt unless --ide flag, --yes, or non-TTY).
  opts.ides = await resolveIde(opts);

  // Resolve commit-planning preference (interactive prompt or flag) — #189.
  opts.commitPlanning = await resolveCommitPlanning(opts);

  console.log(`\n🕌 ${bold('rcode')} ${pc.cyan('v' + pkgVersion)} ${dim('→')} ${opts.target}`);

  // Detect an existing install and surface it (#195).
  const existingManifestPath = path.join(opts.target, '.rcode', '_config', 'manifest.yaml');
  if (fs.existsSync(existingManifestPath)) {
    const m = fs.readFileSync(existingManifestPath, 'utf8').match(/^version:\s*(.+)$/m);
    const existingVersion = m ? m[1].trim() : 'unknown';
    const isUpgrade = semver.valid(existingVersion) && semver.valid(pkgVersion)
      ? semver.lt(existingVersion, pkgVersion)
      : existingVersion !== pkgVersion;
    if (isUpgrade) {
      console.log('  ' + info(`Upgrading ${pc.dim('v' + existingVersion)} → ${pc.green('v' + pkgVersion)} (config + state + .planning preserved)`));
    } else {
      console.log('  ' + info(`Refreshing v${existingVersion} (config + state + .planning preserved)`));
    }
    if (!opts.force) {
      console.log(dim('    Pass --force to also sweep orphaned files from the previous version.'));
    }
  }
  if (!fs.existsSync(SOURCE_ROOT)) {
    console.error(`✖ Source tree not found at ${SOURCE_ROOT}. Running from wrong dir?`);
    return 1;
  }

  // Validate IDE(s) — structured error for unsupported editors (#197).
  // SUPPORTED_IDES is the module-level constant (#697 / W4.3).
  // Issue #841: also accept 'claude-code' as an alias — normalise any that
  // slipped through resolveIde before reaching this point.
  opts.ides = opts.ides.map(ide => (ide === 'claude-code' ? 'claude' : ide));
  const unsupported = opts.ides.filter(ide => !SUPPORTED_IDES.includes(ide));
  if (unsupported.length > 0) {
    console.error(`✖ --ide ${unsupported.join(', ')} is not supported in v${readPackageVersion()}.`);
    console.error('');
    console.error('  Currently supported:');
    console.error('    claude       — Claude Code native (recommended)');
    console.error('    cursor       — Cursor IDE');
    console.error('    codex        — Codex CLI');
    console.error('    gemini       — Gemini CLI (planned — not yet implemented)');
    console.error('    vscode       — VS Code (with Claude Code / Continue / Copilot extension)');
    console.error('    windsurf     — Windsurf (Codeium)');
    console.error('    antigravity  — Antigravity (experimental)');
    console.error('    grok         — Grok Build (xAI CLI, Claude-Code-compatible)');
    console.error('');
    console.error('  Tracked for future:');
    console.error('    jetbrains    — IntelliJ / PyCharm');
    console.error('    zed          — Zed editor');
    console.error('');
    return 1;
  }

  // VS Code installs to .claude/ paths (extension reads from there). Inform the user.
  if (opts.ides.includes('vscode')) {
    console.log('  ' + dim('VS Code → installing to .claude/ paths (read by Claude Code / Continue / Copilot extensions).'));
  }

  // Codex installs to .claude/ and AGENTS.md; lifecycle via rcode workflow bridge.
  if (opts.ides.includes('codex')) {
    console.log('  ' + dim('Codex → installing to .claude/ paths + AGENTS.md. Use `rcode workflow show <name>` to feed workflows to Codex.'));
    // #908: /rcode-* slash commands in Codex are wired via the UserPromptSubmit
    // hook in ~/.codex/hooks.json, which installNativeHomeSlashCommands() only
    // writes on a GLOBAL install. A project-local install silently leaves Codex
    // with no working slash commands — warn instead of implying success.
    if (!opts.global) {
      console.log('  ' + warn('Codex /rcode-* slash commands need a GLOBAL install — re-run with `--global` to wire the ~/.codex/hooks.json router. This project-local install does NOT enable them.'));
    }
  }

  // Gemini IDE support deferred
  if (opts.ides.includes('gemini')) {
    console.log(`\n⚠️  Gemini CLI install not yet implemented\n`);
    console.log(`Gemini IDE requires aggregating all agents and commands into a single GEMINI.md file.`);
    console.log(`This feature is planned but not yet available.\n`);
    console.log(`For now, use: --ide claude or --ide cursor\n`);
    // Remove gemini from the list so install can continue for other IDEs
    opts.ides = opts.ides.filter(e => e !== 'gemini');
    if (opts.ides.length === 0) return 1;
  }

  // Antigravity install is experimental — best-effort path, user may need to adjust
  if (opts.ides.includes('antigravity')) {
    // #908/#1028: the UserPrompt hook that makes .antigravity/ files functional
    // is only wired on a global install. A project-local install would write
    // guaranteed-inert files, so skip them entirely instead of installing dead
    // weight — see planIdes filtering below.
    if (!opts.global) {
      console.log('  ' + warn('Antigravity /rcode-* slash commands need a GLOBAL install — re-run with `--global`. Skipping .antigravity/ files on this project-local install (they would be inert).'));
    } else {
      console.log('  ' + warn('Antigravity install is experimental. Files land at .antigravity/rcode/{agents,commands}/.'));
      console.log('  ' + dim('If Antigravity expects a different path, adjust .rcode/config.yaml and re-run.'));
    }
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

  // #723 Waleed — migrate legacy vscode subdir layout BEFORE building the plan
  // so the plan never has to reason about both forms. Idempotent + safe.
  if (Array.isArray(opts.ides) && opts.ides.includes('vscode') || (opts.ide === 'vscode')) {
    const migrated = migrateVscodeCommandsLayout(opts.target);
    if (migrated.moved > 0) {
      console.log(`  ↻ Migrated ${migrated.moved} legacy vscode-layout command(s) to .claude/commands/rcode-{name}.md`);
    }
  }

  // #1028: .antigravity/ is only wired up on a GLOBAL install (the hook that
  // makes /rcode-* slash commands work lives in ~/.gemini/antigravity/, written
  // by installAntigravitySlashRouterHook() only when opts.global is set — see
  // the warning above). A project-local install writes guaranteed-inert files;
  // skip them entirely unless --global was actually passed.
  const planIdes = (!opts.global && Array.isArray(opts.ides))
    ? opts.ides.filter(i => i !== 'antigravity')
    : opts.ides;

  const fullPlan = buildInstallPlan(planIdes, opts.target);
  const plan = filterPlanByModules(fullPlan, opts.modules);
  if (plan.length === 0) {
    if (Array.isArray(opts.ides) && opts.ides.includes('antigravity') && !opts.global) {
      console.error('✖ Nothing to install — Antigravity was the only target IDE, and its files need a GLOBAL install.');
      console.error('  Re-run with --global, or pick another --ide.');
      return 1;
    }
    console.error('✖ Nothing to install — install plan is empty.');
    if (opts.modules.length > 0) console.error(`  Modules requested: ${opts.modules.join(', ')}`);
    return 1;
  }
  if (opts.modules.length > 0) {
    console.log(`  Modules: ${opts.modules.join(', ')}`);
  }

  // Dry run / list-files — list paths that would be written and exit without writing
  if (opts.dryRun || opts.listFiles) {
    console.log('DRY RUN: the following paths would be written:');
    for (const entry of plan) {
      console.log('  + ' + entry.rel);
    }
    return 0;
  }

  // Force-overwrite backup — closes #381. Without this, customized
  // .claude/agents/rcode-*.md and similar package-managed files were silently
  // clobbered with no recovery path. Now every --force-overwrite run creates
  // a tar.gz of every existing target before any write happens.
  // Skip when --no-backup is passed (CI escape hatch) or on fresh installs.
  if (opts.forceOverwrite && !opts.noBackup) {
    const backup = createInstallBackup(opts.target, plan);
    if (backup.ok) {
      console.log('  ' + info(
        `${pc.dim('--force-overwrite')} backup: ${pc.cyan(backup.path)} ` +
        `${pc.dim('(' + backup.fileCount + ' files — restore with: tar -xzf ' + backup.path + ')')}`
      ));
    } else if (backup.fileCount > 0) {
      // Files exist but tar failed — fail loud rather than clobbering silently.
      console.error('');
      console.error(`✖ Could not create backup: ${backup.warning}`);
      console.error(`  Refusing to --force-overwrite without a backup. Pass --no-backup to override.`);
      console.error('');
      return 1;
    }
    // backup.fileCount === 0 → fresh install, nothing to back up — proceed silently.
  }

  // Orphan sweep — remove files from previous install not in the new plan (#196).
  // Runs on --force only, to preserve user-edited or hand-dropped files on regular installs.
  let sweptOrphans = 0;
  if (opts.force) {
    sweptOrphans = sweepStaleInstalledFiles(opts.target, plan);
  }

  // Load previous manifest for non-destructive mode (#232).
  // Map<rel, expectedHashFromPriorInstall> — if a file's current hash matches
  // its expected-from-prior-install hash, the user hasn't touched it → safe
  // to overwrite. If hashes differ, user customized it → preserve.
  const priorManifest = new Map();
  if (opts.nonDestructive) {
    const manifestPath = path.join(opts.target, '.rcode', '_config', 'files-manifest.csv');
    if (fs.existsSync(manifestPath)) {
      try {
        const lines = fs.readFileSync(manifestPath, 'utf8').split('\n').slice(1).filter(Boolean);
        for (const line of lines) {
          const [rel, hash] = line.split(',');
          if (rel && hash) priorManifest.set(rel, hash);
        }
      } catch {
        // best-effort — if manifest is malformed, fall back to behaving like fresh install
      }
    }
  }

  // Copy files — spinner gives feedback on long installs (#248).
  let copied = 0;
  let skipped = 0;
  let preserved = 0;
  // #667 — track files the user explicitly chose to update via the conflict
  // resolver. Without this, accepting "Take vN" for 10 files still printed
  // "0 files installed" because `copied` only counts pre-conflict writes.
  let updated = 0;
  const preservedFiles = [];
  const preservedDiffs = [];  // { rel, insertions, deletions, patch } for #251
  const conflictedFiles = []; // { rel, src, destPath, existingContent, sourceContent } for #451 / #453
  const spinner = createSpinner(dim(`Installing ${plan.length} files…`), { color: 'cyan' }).start();

  for (const entry of plan) {
    const destPath = path.join(opts.target, entry.rel);
    const relForward = entry.rel.split(path.sep).join('/');
    ensureDir(path.dirname(destPath));

    // Per-iteration lazy readers — avoids re-reading destPath / entry.src across
    // multiple conditional branches within the same loop body (up to 4 reads of
    // destPath and 5 reads of entry.src in the worst case without this cache).
    let _destBuf = null;
    let _srcBuf = null;
    const readDestBuf = () => { if (!_destBuf) _destBuf = fs.readFileSync(destPath); return _destBuf; };
    const readSrcBuf = () => { if (!_srcBuf) _srcBuf = fs.readFileSync(entry.src); return _srcBuf; };

    // Non-destructive guard (#232): preserve user-modified files.
    // --accept-all (#251) overrides: treat all files as pristine.
    if (opts.nonDestructive && !opts.forceOverwrite && !opts.acceptAll && fs.existsSync(destPath)) {
      const priorHash = priorManifest.get(relForward);
      if (priorHash) {
        const installedContent = readDestBuf().toString('utf8');
        const currentHash = sha256(readDestBuf());
        if (currentHash !== priorHash) {
          // Compute diff stat for display (#251)
          const srcContent = readSrcBuf().toString('utf8');
          const patch = createTwoFilesPatch(relForward, relForward, installedContent, srcContent, 'installed', 'source');
          let ins = 0, del = 0;
          for (const line of patch.split('\n')) {
            if (line.startsWith('+') && !line.startsWith('+++')) ins++;
            if (line.startsWith('-') && !line.startsWith('---')) del++;
          }
          preserved += 1;
          preservedFiles.push(relForward);
          preservedDiffs.push({ rel: relForward, insertions: ins, deletions: del, patch });
          skipped += 1;
          continue;
        }
        // Hash matches prior install → pristine → safe to overwrite
      }
      // No prior hash → new file in this plan → install normally
    }

    if (fs.existsSync(destPath) && !opts.force && !opts.forceOverwrite) {
      const existingHash = sha256(readDestBuf());
      const sourceHash = sha256(readSrcBuf());
      if (existingHash === sourceHash) { skipped++; continue; }
      if (!opts.yes && !opts.nonDestructive) {
        // Buffer the conflict instead of spamming a warning per file (#451).
        // Surfaced as a categorised summary post-install + interactive offer (#453).
        conflictedFiles.push({
          rel: relForward,
          src: entry.src,
          destPath,
          existingContent: readDestBuf().toString('utf8'),
          sourceContent: readSrcBuf().toString('utf8'),
        });
        skipped++;
        continue;
      }
    }

    if (fs.existsSync(destPath) && opts.forceOverwrite) {
      const existing = readDestBuf();
      const incoming = readSrcBuf();
      if (!existing.equals(incoming)) {
        spinner.update({ text: dim(`overwriting ${entry.rel}`) });
      }
    }

    let content = readSrcBuf().toString('utf8');
    if (entry.cursor) content = convertToCursorMdc(content);
    fs.writeFileSync(destPath, content, 'utf8');
    if (entry.executable) fs.chmodSync(destPath, 0o755);
    copied++;
  }

  spinner.success({ text: ok(`${copied} files installed`) });
  // #667 — placeholder; the real count is logged AFTER the conflict resolver
  // runs below. We re-emit a corrected summary line if the user updated files
  // via the resolver so they don't walk away thinking "0 files installed"
  // when they just accepted 10 vN updates.

  // Categorised conflict summary (#451) + interactive resolution offer (#453).
  // Replaces the per-file 'differs from package version' warning spam.
  if (conflictedFiles.length > 0) {
    const byCategory = { workflows: [], agents: [], commands: [], skills: [], references: [], other: [] };
    for (const c of conflictedFiles) {
      if (c.rel.includes('/workflows/')) byCategory.workflows.push(c);
      else if (c.rel.includes('/agents/')) byCategory.agents.push(c);
      else if (c.rel.includes('/commands/')) byCategory.commands.push(c);
      else if (c.rel.includes('/skills/')) byCategory.skills.push(c);
      else if (c.rel.includes('/references/')) byCategory.references.push(c);
      else byCategory.other.push(c);
    }
    console.log('');
    console.log('  ' + warn(`${conflictedFiles.length} file${conflictedFiles.length === 1 ? '' : 's'} have local edits AND v${readPackageVersion()} updates:`));
    for (const [cat, list] of Object.entries(byCategory)) {
      if (list.length === 0) continue;
      console.log('    ' + dim(`${list.length} ${cat}`));
    }
    console.log('');

    if (!opts.yes && process.stdin.isTTY) {
      const action = await clack.select({
        message: 'How should we handle these?',
        initialValue: 'review',
        options: [
          { value: 'review', label: 'Review each one',                hint: 'see the diff, decide per file' },
          { value: 'upstream', label: 'Take v' + readPackageVersion() + ' for all', hint: 'lose local edits, get all bug fixes' },
          { value: 'keep',   label: 'Keep my local edits',            hint: 'skip v' + readPackageVersion() + ' updates for these files (current behaviour)' },
        ],
      });
      if (clack.isCancel(action)) {
        clack.note('Skipped — local edits preserved.');
      } else if (action === 'upstream') {
        let applied = 0;
        for (const c of conflictedFiles) {
          fs.writeFileSync(c.destPath, c.sourceContent, 'utf8');
          applied++;
        }
        updated += applied; // #667 — surface in final summary
        console.log('  ' + ok(`Applied v${readPackageVersion()} to ${applied} file${applied === 1 ? '' : 's'}.`));
      } else if (action === 'review') {
        let applied = 0, kept = 0;
        for (const c of conflictedFiles) {
          const patch = createTwoFilesPatch(c.rel, c.rel, c.existingContent, c.sourceContent, 'local', 'v' + readPackageVersion());
          let ins = 0, del = 0;
          for (const line of patch.split('\n')) {
            if (line.startsWith('+') && !line.startsWith('+++')) ins++;
            if (line.startsWith('-') && !line.startsWith('---')) del++;
          }
          console.log('');
          console.log('  ' + pc.bold(c.rel) + dim('  ') + pc.green(`+${ins}`) + ' ' + pc.red(`-${del}`));
          const decision = await clack.select({
            message: 'Take upstream, keep local, or view diff?',
            initialValue: 'view',
            options: [
              { value: 'upstream', label: 'Take v' + readPackageVersion() },
              { value: 'keep',     label: 'Keep local' },
              { value: 'view',     label: 'View diff first' },
            ],
          });
          let finalAction = decision;
          if (clack.isCancel(decision) || decision === 'view') {
            for (const line of patch.split('\n').slice(4)) {
              if (line.startsWith('+')) process.stdout.write(pc.green(line) + '\n');
              else if (line.startsWith('-')) process.stdout.write(pc.red(line) + '\n');
              else if (line.startsWith('@')) process.stdout.write(pc.cyan(line) + '\n');
              else process.stdout.write(dim(line) + '\n');
            }
            const after = await clack.select({
              message: 'Now: take upstream or keep local?',
              initialValue: 'keep',
              options: [
                { value: 'upstream', label: 'Take v' + readPackageVersion() },
                { value: 'keep',     label: 'Keep local' },
              ],
            });
            finalAction = clack.isCancel(after) ? 'keep' : after;
          }
          if (finalAction === 'upstream') {
            fs.writeFileSync(c.destPath, c.sourceContent, 'utf8');
            applied++;
          } else {
            kept++;
          }
        }
        updated += applied; // #667 — surface in final summary
        console.log('  ' + ok(`Review complete: ${applied} applied, ${kept} kept local.`));
      } else {
        console.log('  ' + dim(`${conflictedFiles.length} file${conflictedFiles.length === 1 ? '' : 's'} kept local. Re-run with --force-overwrite or 'rcode update' anytime.`));
      }
    } else {
      console.log('  ' + dim(`Re-run with --force-overwrite to apply v${readPackageVersion()} updates, or pipe through an interactive shell to resolve per-file.`));
    }
    console.log('');
  }

  // #667 — corrected post-resolver summary. Only re-emit when the conflict
  // resolver actually updated files; preserves the original line otherwise.
  if (updated > 0) {
    console.log('  ' + ok(`Total this run: ${copied} installed · ${updated} updated · ${preserved + skipped} unchanged.`));
    console.log('');
  }

  // In global install mode (~/.claude/), skip per-project artifacts — those are
  // created by `rcode install` inside each project directory at project-init time.
  // Global install only ships the read-only tooling: commands, skills, workflows, bin.
  if (opts.global) {
    // Still write the manifest so the global install is traceable/upgradeable
    const configDir = path.join(opts.target, '.rcode', '_config');
    ensureDir(configDir);
    fs.writeFileSync(path.join(configDir, 'manifest.yaml'), generateInstallManifest(opts));
    // Install skills + sidebar stubs globally — never dedup against globals,
    // because in --global mode the target IS the global dir.
    const skillsResult = installSkills(PACKAGE_ROOT, opts.target);
    let skillsInstalled = skillsResult.count;
    try {
      const { main: generateCommandSkills } = require(path.join(PACKAGE_ROOT, 'cli', 'generate-command-skills.cjs'));
      const stubsDir = path.join(opts.target, '.claude', 'skills');
      const result = generateCommandSkills(PACKAGE_ROOT, stubsDir, readPackageVersion(), {
        skipGlobalDuplicates: true,
      });
      skillsInstalled += result.generated;
    } catch { /* non-fatal */ }
    console.log('');
    console.log(`  ${dim(`${skillsInstalled} skills installed globally`)}`);

    // Native home-dir slash commands for CLIs that can't surface file-based
    // /commands (codex, antigravity) but DO support a prompt-submit hook.
    // This MUST run inside the --global block: the global path returns here,
    // before the non-global call site below. Gated on opts.global inside.
    try {
      installNativeHomeSlashCommands(opts);
    } catch (err) {
      process.stderr.write(pc.yellow(`WARNING: native slash-command install skipped: ${err?.message || err}`) + '\n');
    }
    return 0;
  }

  // Duplicate-prevention: if rcode commands already exist globally in ~/.claude/commands/,
  // skip writing agents/commands to the project's .claude/ directory. Without this,
  // running `npx rcode install` in the home dir AND then in a project creates two sets
  // of identical files — Claude Code shows both as duplicate slash commands.
  const globalClaudeCommands = path.join(homedir(), '.claude', 'commands');
  const projectClaudeCommands = path.join(opts.target, '.claude', 'commands');
  // #938 — --local-only forces a self-contained install: treat it as NOT a
  // global-deferring project install so all skills/commands are written locally.
  const isProjectInstall = opts.target !== homedir() && !opts.localOnly;
  // Run dedup even when force:true — only forceOverwrite skips it.
  if (isProjectInstall && !opts.forceOverwrite) {
    try {
      // Check both root-level rcode-*.md AND the rcode/ subdirectory (vscode-style).
      const globalHasrcode = fs.existsSync(globalClaudeCommands) && (
        fs.readdirSync(globalClaudeCommands).some(f => f.startsWith('rcode-') && f.endsWith('.md')) ||
        fs.existsSync(path.join(globalClaudeCommands, 'rcode'))
      );
      const projectHasrcode = fs.existsSync(projectClaudeCommands) && (
        fs.readdirSync(projectClaudeCommands).some(f => f.startsWith('rcode-') && f.endsWith('.md')) ||
        fs.existsSync(path.join(projectClaudeCommands, 'rcode'))
      );
      if (globalHasrcode && !projectHasrcode) {
        // Global commands exist, project has none yet — filter commands out of the
        // plan so we don't create duplicates. Project gets .rcode/ state only.
        //
        // Issue #1022: agents are NOT deferrable to global the way commands/skills
        // are — they are first-class, project-local files by design (see the
        // createInstallBackup comment above: "closes #381 — without this,
        // customized .claude/agents/rcode-*.md ... were silently lost"). Lumping
        // `.claude/agents/` into this commands-dedup filter meant a project with
        // global rcode commands installed but no project-level commands yet would
        // never get its .claude/agents/*.md files written at all, leaving only
        // whatever pre-existing subdirectories (e.g. rules/) survived untouched.
        const before = plan.length;
        const filtered = plan.filter(e => {
          const rel = e.rel.split(path.sep).join('/');
          return !rel.startsWith('.claude/commands/');
        });
        if (filtered.length < before) {
          plan.length = 0;
          filtered.forEach(e => plan.push(e));
          console.log('  ' + dim('Global rcode commands detected in ~/.claude/ — skipping project-level command install to avoid duplicates.'));
          console.log('  ' + dim('Use --force-overwrite to install locally anyway.'));
        }
      } else if (globalHasrcode && projectHasrcode) {
        // Both exist — project commands are duplicates. Remove project-level ones.
        // Agents are left untouched (#1022) — they are project-local by design,
        // never deduped against the global commands install.
        try {
          // Remove root-level rcode-*.md files
          const projectCommandFiles = fs.readdirSync(projectClaudeCommands)
            .filter(f => f.startsWith('rcode-') && f.endsWith('.md'));
          for (const f of projectCommandFiles) {
            fs.unlinkSync(path.join(projectClaudeCommands, f));
          }
          // Remove rcode/ subdirectory (vscode-style commands).
          // #688 — safeRmSync refuses to traverse out-of-target symlinks.
          const rcodeSubdir = path.join(projectClaudeCommands, 'rcode');
          if (fs.existsSync(rcodeSubdir)) {
            safeRmSync(rcodeSubdir, opts.target);
          }
          console.log('  ' + dim('Removed duplicate project-level rcode commands (global ones in ~/.claude/ take precedence).'));
        } catch { /* non-fatal */ }
        const filtered = plan.filter(e => {
          const rel = e.rel.split(path.sep).join('/');
          return !rel.startsWith('.claude/commands/');
        });
        plan.length = 0;
        filtered.forEach(e => plan.push(e));
      }

    } catch { /* non-fatal — skip detection on permission errors */ }
  }

  // Write .rcode/_config/manifest.yaml + agent-manifest.csv + files-manifest.csv
  const configDir = path.join(opts.target, '.rcode', '_config');
  ensureDir(configDir);
  // Issue #806: ensure .planning/ exists so /rcode-new-project Write calls succeed
  // even when seedStarterPlanning returns early (e.g. ROADMAP.md already present).
  ensureDir(path.join(opts.target, '.planning'));
  fs.writeFileSync(path.join(configDir, 'manifest.yaml'), generateInstallManifest(opts));
  fs.writeFileSync(path.join(configDir, 'agent-manifest.csv'), generateAgentManifest(plan, opts.target));

  // Handle --reset flag: delete config.yaml and state.json if --reset is passed
  const configPath = path.join(opts.target, '.rcode', 'config.yaml');
  const stateDest = path.join(opts.target, '.rcode', 'state.json');
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
  // Note: --reset without --force is rejected at the top of install() (#680).

  // Write .rcode/config.yaml (user_name, project_name, language, mode)
  // Note: config.yaml is user data and should NOT be overwritten on --force (unless --reset)
  if (!fs.existsSync(configPath)) {
    writeFileAtomic(configPath, generateConfigYaml(opts));
  } else {
    // Issue #685: re-install path. config.yaml is preserved BUT if the user
    // just changed commit_planning via the prompt/flag, .gitignore will be
    // rewritten with the new value while config.yaml keeps the old one,
    // creating a silent drift. Update only commit_planning in-place
    // (preserve everything else the user may have customized).
    try {
      const before = fs.readFileSync(configPath, 'utf8');
      const desired = opts.commitPlanning !== false;
      const re = /^commit_planning:\s*(true|false)\s*$/m;
      const match = before.match(re);
      const currentInFile = match ? match[1] === 'true' : null;
      if (match && currentInFile !== desired) {
        const updated = before.replace(re, `commit_planning: ${desired}`);
        writeFileAtomic(configPath, updated);
        console.log('  ' + dim(`Updated commit_planning in config.yaml (${currentInFile} → ${desired}) — closes #685.`));
      } else if (!match) {
        // Older config without the key — append it so the next read finds it.
        const appended = before.replace(/\n*$/, '') + `\ncommit_planning: ${desired}\n`;
        writeFileAtomic(configPath, appended);
      }
    } catch { /* best-effort — never fail install on this */ }
  }
  // Validate config.yaml with zod schema (#250) — warn but never block install.
  try {
    const configText = fs.readFileSync(configPath, 'utf8');
    const configData = parseSimpleYaml(configText);
    const validation = validateConfig(configData);
    if (!validation.valid) {
      console.log('');
      console.log('  ' + warn('config.yaml has validation errors:'));
      for (const e of validation.errors) console.log(pc.yellow(e));
      console.log(dim('  → Edit .rcode/config.yaml to fix, then run /rcode-status'));
    }
  } catch { /* best-effort */ }

  // Seed .rcode/state.json (skip if already exists — don't overwrite on re-install unless --reset)
  if (!fs.existsSync(stateDest)) {
    const stateSrc = path.join(SOURCE_ROOT, 'state.json');
    if (fs.existsSync(stateSrc)) {
      const now = new Date().toISOString();
      // #809/#830: escape projectName for JSON embedding — quotes/backslashes
      // would corrupt the resulting state.json. JSON.stringify wraps in quotes;
      // slice them off because the template already has surrounding quotes.
      const safeProject = JSON.stringify(String(opts.projectName || path.basename(opts.target))).slice(1, -1);
      let stateContent = fs.readFileSync(stateSrc, 'utf8')
        .replace(/__PROJECT_NAME__/g, safeProject)
        .replace(/__INSTALL_DATE__/g, now);

      // Issue #705: the template ships with _seeded_stub:true. If the user
      // already has a real planning ROADMAP (no INSTALL STUB banner) but
      // state.json is missing (manually deleted), restoring with the stub
      // marker would mis-classify a real project as fresh. Strip the marker
      // when ROADMAP exists and isn't itself a stub.
      const rmPath = path.join(opts.target, '.planning', 'ROADMAP.md');
      if (fs.existsSync(rmPath)) {
        try {
          const rm = fs.readFileSync(rmPath, 'utf8');
          if (!rm.includes('<!-- INSTALL STUB')) {
            // Remove "_seeded_stub": true, line. JSON is small + flat enough
            // to do this with a regex; matches whether the field is followed
            // by a comma or sits as the last key.
            stateContent = stateContent.replace(/^\s*"_seeded_stub":\s*true,?\s*\n/m, '');
          }
        } catch { /* fall through with stub marker — safe default */ }
      }

      ensureDir(path.dirname(stateDest));
      writeFileAtomic(stateDest, stateContent);
    }
  }

  // .planning/council-sessions/ empty dir
  ensureDir(path.join(opts.target, '.planning', 'council-sessions'));

  // .rcode/context/ — seed stub files so doctor doesn't report "never initialized"
  // The /rcode-init slash command populates these with real project content.
  const contextDir = path.join(opts.target, '.rcode', 'context');
  ensureDir(contextDir);
  const activeCtx = path.join(contextDir, 'active.md');
  const briefCtx = path.join(contextDir, 'project-brief.md');
  if (!fs.existsSync(activeCtx)) {
    fs.writeFileSync(activeCtx, '# Active Context\n\n_Run `/rcode-init` inside your AI editor to populate this file._\n');
  }
  if (!fs.existsSync(briefCtx)) {
    fs.writeFileSync(briefCtx, '# Project Brief\n\n_Run `/rcode-init` inside your AI editor to populate this file._\n');
  }

  // ~/.rcode/agents/ global agents directory
  const globalAgentsDir = path.join(homedir(), '.rcode', 'agents');
  ensureDir(globalAgentsDir);

  // Issue #702: files-manifest.csv used to be written here, BEFORE
  // installSkills + generateCommandSkills ran. The 100+ skill files those
  // functions install were therefore invisible to sweepStaleInstalledFiles
  // and doctor's drift detection. Manifest generation moved below to AFTER
  // all skill installations complete, with extraScanDirs covering both
  // .claude/skills/ and .rcode/skills/ on disk.

  // Install v1-style phrase-activated skills (scaffold-project, create-prd,
  // retrospective, etc.) into .claude/skills/ alongside the v2 agents/commands.
  // Issue #679: skip rcode-* skills that already exist in ~/.claude/skills/
  // (global precedence) so the slash picker doesn't show every command twice.
  // Reuse the isProjectInstall flag declared earlier in this scope.
  const skillsResult = installSkills(PACKAGE_ROOT, opts.target, {
    skipGlobalDuplicates: isProjectInstall,
  });
  let skillsInstalled = skillsResult.count;
  if (skillsResult.skippedGlobal > 0) {
    console.log('  ' + dim(`Skipped ${skillsResult.skippedGlobal} project-level rcode skills (global ones in ~/.claude/skills/ take precedence) — closes #679.`));
    // #938 — make the global dependency explicit. When local skills are skipped
    // the project relies on whatever rcode version is installed globally; a
    // collaborator without a global install (or on a different version) gets
    // different behavior. Tell the user how to force a self-contained install.
    console.log('  ' + dim('  ↳ This project now depends on your GLOBAL rcode install for those skills.'));
    console.log('  ' + dim('    For a self-contained project (e.g. for collaborators/CI), reinstall with --local-only.'));
  }

  // Generate install-time skill stubs that mirror sidebar-worthy slash commands.
  // Source codebase stays clean — these stubs only exist at the install
  // destination, marked with `generated: true` so they refresh idempotently.
  // See cli/generate-command-skills.cjs for rationale.
  try {
    const { main: generateCommandSkills } = require(path.join(PACKAGE_ROOT, 'cli', 'generate-command-skills.cjs'));
    const stubsDir = path.join(opts.target, '.claude', 'skills');
    const result = generateCommandSkills(PACKAGE_ROOT, stubsDir, readPackageVersion(), {
      skipGlobalDuplicates: isProjectInstall,
    });
    if (result.generated > 0) {
      console.log('  ' + dim(`${result.generated} sidebar skill stub${result.generated === 1 ? '' : 's'} generated for command discoverability`));
      skillsInstalled += result.generated;
    }
    if (result.skippedGlobal > 0) {
      console.log('  ' + dim(`Skipped ${result.skippedGlobal} sidebar stub${result.skippedGlobal === 1 ? '' : 's'} that duplicate global ~/.claude/skills/ — closes #679.`));
    }
  } catch (err) {
    // Non-fatal: install succeeds without sidebar stubs
    console.log('  ' + dim(`(sidebar stub generation skipped: ${err.message})`));
  }

  // Issue #702: write files-manifest.csv NOW, after all installs complete.
  // extraScanDirs picks up the skills + sidebar stubs that aren't in the
  // plan array.
  fs.writeFileSync(
    path.join(configDir, 'files-manifest.csv'),
    generateFilesManifest(plan, opts.target, {
      mergeExistingManifest: !opts.force,
      extraScanDirs: [
        path.join(opts.target, '.claude', 'skills'),
        path.join(opts.target, '.rcode', 'skills'),
      ],
    }),
  );

  // Seed .planning/ with starter ROADMAP + STATE so workflows work immediately
  const starterSeeded = seedStarterPlanning(opts.target, opts.projectName);

  // Install brain scaffolding at .rcode/brain/ (sources.yaml + README).
  // Actual brain content lands after first brain pull runs.
  installBrainScaffold(PACKAGE_ROOT, opts.target);

  // Ensure .gitignore separates installed methodology from committable artifacts.
  // Reads opts.commitPlanning to decide whether .planning/ is in the ignore block.
  const gitignoreReport = ensureRcodeGitignore(opts.target, { commitPlanning: opts.commitPlanning });

  // Install pre-commit hook that auto-syncs state.json when planning files change.
  // Respects --no-git-hooks flag; skips silently when .git/ is absent.
  const hookReport = ensureRcodePreCommitHook(opts.target, { gitHooks: opts.gitHooks });

  // Pull rcode brain content (v2.0 — issue #158).
  // Runs rcode-tools brain pull as a detached background process. Placeholder
  // URLs are skipped gracefully so this does not fail a fresh install.
  //
  // Issue #1030: a cold pull (cache miss) clones + sparse-checks-out a real
  // upstream repo and live-measured ~58s for just 2 small files — dangerously
  // close to the previous 60s execFileSync timeout (#706) and ~6x over the
  // 10s kill criterion issue #162 itself specified. Since brain pull is
  // already best-effort and never fails install (see catch below, historically
  // a timeout was just treated as a pull failure), there is no reason to block
  // install on it at all. Spawn it detached and let install finish immediately;
  // the child keeps running and warms the cache/writes content on its own.
  let brainReport = null;
  let brainBackgrounded = false;
  try {
    const { spawn } = require('child_process');
    const toolsPath = path.join(opts.target, '.rcode', 'bin', 'rcode-tools.cjs');
    if (fs.existsSync(toolsPath)) {
      const child = spawn('node', [toolsPath, 'brain', 'pull'], {
        cwd: opts.target,
        stdio: 'ignore',
        detached: true,
      });
      child.unref();
      brainBackgrounded = true;
    }
  } catch (e) {
    // brain pull is best-effort on install — do not fail the whole install
    brainReport = { ok: false, error: String(e.message || e).slice(0, 200) };
  }

  // Summary
  console.log('');
  if (opts.force && sweptOrphans > 0) console.log('  ' + info(`${sweptOrphans} stale files swept`));
  if (opts.force && existedBefore) {
    console.log('  ' + warn('config.yaml and state.json preserved (pass --reset to wipe)'));
  }
  if (brainBackgrounded) {
    console.log('  ' + dim('Brain: pulling in background (may take up to a minute on a cold cache; run `rcode brain status` to check)'));
  } else if (brainReport && brainReport.error) {
    console.log('  ' + dim(`Brain: skipped (${brainReport.error})`));
  }
  if (gitignoreReport) {
    const gitMsg = {
      'created': '.gitignore created with rcode block',
      'appended': '.gitignore updated — rcode block appended',
      'already-present': '.gitignore rcode block already present',
      'updated': '.gitignore rcode block refreshed',
      'skipped-error': `.gitignore skipped (${gitignoreReport.error})`,
    }[gitignoreReport.action] || '.gitignore unchanged';
    console.log('  ' + dim(gitMsg));
  }
  if (hookReport) {
    const hookMsg = {
      'created': 'pre-commit hook installed (.git/hooks/pre-commit)',
      'appended': 'pre-commit hook updated — rcode block appended',
      'already-present': 'pre-commit hook rcode block already present',
      'updated': 'pre-commit hook rcode block refreshed',
      'skipped-flag': 'pre-commit hook skipped (--no-git-hooks)',
      'skipped-no-git': 'pre-commit hook skipped (no .git/ directory)',
      'skipped-error': `pre-commit hook skipped (${hookReport.error})`,
    }[hookReport.action] || 'pre-commit hook unchanged';
    console.log('  ' + dim(hookMsg));
  }
  if (skipped > 0) console.log('  ' + dim(`${skipped} files skipped (unchanged)`));

  // Diff display for preserved files (#251)
  if (preserved > 0 && opts.nonDestructive) {
    console.log('');
    console.log('  ' + warn(`${preserved} file${preserved === 1 ? '' : 's'} preserved (modified since install):`));
    for (const d of preservedDiffs.slice(0, 10)) {
      const stat = pc.green(`+${d.insertions}`) + ' ' + pc.red(`-${d.deletions}`);
      console.log(`     ${dim(d.rel)}  ${stat}`);
      if (opts.showDiff && d.patch) {
        for (const line of d.patch.split('\n').slice(4)) {  // skip file headers
          if (line.startsWith('+')) process.stdout.write(pc.green(line) + '\n');
          else if (line.startsWith('-')) process.stdout.write(pc.red(line) + '\n');
          else if (line.startsWith('@')) process.stdout.write(pc.cyan(line) + '\n');
          else process.stdout.write(dim(line) + '\n');
        }
      }
    }
    if (preservedDiffs.length > 10) console.log(dim(`     … and ${preservedDiffs.length - 10} more`));
    console.log(dim('  To overwrite: re-run with --force-overwrite  |  To see full diffs: --show-diff'));
    console.log('');
  }

  // Count installed agents + commands dynamically (#190).
  // Prefer the 'claude' IDE paths for counting when claude is in the selected list —
  // that's what actually matters for Claude Code slash command availability.
  // Fall back to the first selected IDE only when claude isn't included.
  const primaryIde = opts.ides.includes('claude') ? 'claude' : opts.ides[0];
  const idePaths = getPathsForIde(primaryIde, opts.target);
  const agentsDir = idePaths.agentsDir;
  const commandsDir = idePaths.commandsDir;
  let agentCount = 0, commandCount = 0;
  let agentsFromGlobal = false, commandsFromGlobal = false;
  try {
    if (fs.existsSync(agentsDir)) {
      agentCount = fs.readdirSync(agentsDir).filter(f => (f.startsWith('rcode-') || f.startsWith('rcode-')) && (f.endsWith('.md') || f.endsWith('.mdc'))).length;
    }
    if (fs.existsSync(commandsDir)) {
      // claude IDE names commands rcode-*.md; other IDEs use plain {name}.md inside a rcode/ subdir
      const commandFilter = primaryIde === 'claude'
        ? f => f.startsWith('rcode-') && (f.endsWith('.md') || f.endsWith('.mdc'))
        : f => f.endsWith('.md') || f.endsWith('.mdc');
      commandCount = fs.readdirSync(commandsDir).filter(commandFilter).length;
    }
    // Issue #669 — when global precedence applied (project copies were
    // intentionally removed), count from ~/.claude/ instead so the summary
    // doesn't lie about the install state.
    // Issue #689: skills count gets the same fallback. After dedup (#679)
    // the project skills folder may have only sidebar stubs while ~/.claude/
    // has the real skills — health check should see those.
    if (agentCount === 0 || commandCount === 0 || skillsInstalled < 20) {
      const homeAgents = path.join(homedir(), '.claude/agents');
      const homeCommands = path.join(homedir(), '.claude/commands');
      const homeSkills = path.join(homedir(), '.claude/skills');
      if (agentCount === 0 && fs.existsSync(homeAgents)) {
        // #669 — count both rcode-* and rcode-* prefixes; missing rcode-
        // branch produced "Agents: 0" alongside "Skills: 120".
        const n = fs.readdirSync(homeAgents)
          .filter(f => (f.startsWith('rcode-') || f.startsWith('rcode-')) && f.endsWith('.md'))
          .length;
        if (n > 0) { agentCount = n; agentsFromGlobal = true; }
      }
      if (commandCount === 0 && fs.existsSync(homeCommands)) {
        const n = fs.readdirSync(homeCommands)
          .filter(f => (f.startsWith('rcode-') || f.startsWith('rcode-')) && f.endsWith('.md'))
          .length;
        if (n > 0) { commandCount = n; commandsFromGlobal = true; }
      }
      if (skillsInstalled < 20 && fs.existsSync(homeSkills)) {
        try {
          const globalSkillCount = fs.readdirSync(homeSkills, { withFileTypes: true })
            .filter(d => d.isDirectory() && d.name.startsWith('rcode-')).length;
          if (globalSkillCount > skillsInstalled) skillsInstalled = globalSkillCount;
        } catch { /* non-fatal */ }
      }
    }
  } catch (err) {
    console.error('[install] installInner: failed to count installed agents/commands:', err?.message || err);
  }

  // Duplicate-namespace detection: warn when both rcode-* and rihal-* entries exist.
  // Having both doubles the roster size with near-identical content.
  try {
    const skillsDir = path.join(opts.target, '.rcode', 'skills');
    const claudeCommandsDir = path.join(opts.target, '.claude', 'commands');
    const dirsToCheck = [skillsDir, claudeCommandsDir];
    let hasRcode = false, hasRihal = false;
    for (const dir of dirsToCheck) {
      if (!fs.existsSync(dir)) continue;
      const entries = fs.readdirSync(dir);
      if (entries.some(e => e.startsWith('rcode-'))) hasRcode = true;
      if (entries.some(e => e.startsWith('rihal-'))) hasRihal = true;
    }
    if (hasRcode && hasRihal) {
      process.stderr.write(pc.yellow('WARNING: rcode-* and rihal-* namespaces both detected — consider removing one to reduce roster size.') + '\n');
    }
  } catch { /* non-fatal */ }

  // Native home-dir slash commands for CLIs that ONLY surface /commands from
  // their own home dir (not project dirs). Opt-in via --global. See the fn def.
  try {
    installNativeHomeSlashCommands(opts);
  } catch (err) {
    process.stderr.write(pc.yellow(`WARNING: native slash-command install skipped: ${err?.message || err}`) + '\n');
  }

  const version = readPackageVersion();
  console.log('');
  console.log(`  ${bold('Version:')}   ${pc.cyan('@hanzlaa/rcode@' + version)}`);
  console.log(`  ${bold('IDE:')}       ${opts.ides.join(', ')}`);
  console.log(`  ${bold('Language:')}  ${opts.language}  ${dim('(change in .rcode/config.yaml)')}`);
  console.log(`  ${bold('Mode:')}      ${opts.mode}  ${dim('(guided=confirm at gates, yolo=autonomous)')}`);
  console.log(`  ${bold('Planning:')}  ${opts.commitPlanning !== false ? 'committed' : 'gitignored'}  ${dim('(flip: rcode-tools gitignore refresh)')}`);
  console.log('');
  // Show the actual install paths so cursor/gemini/antigravity output is accurate
  const relAgents = path.relative(opts.target, idePaths.agentsDir) || idePaths.agentsDir;
  const relCommands = path.relative(opts.target, idePaths.commandsDir) || idePaths.commandsDir;
  console.log(`  ${bold('Agents:')}    ${pc.green(String(agentCount))} in ${agentsFromGlobal ? '~/.claude/agents/ (global)' : relAgents + '/'}`);
  console.log(`  ${bold('Commands:')}  ${pc.green(String(commandCount))} slash commands in ${commandsFromGlobal ? '~/.claude/commands/ (global)' : relCommands + '/'}`);
  if (skillsInstalled > 0) console.log(`  ${bold('Skills:')}    ${pc.green(String(skillsInstalled))} phrase-activated`);
  console.log('');
  if (starterSeeded) {
    console.log('  ' + ok('Starter planning scaffolded in .planning/ (ROADMAP, STATE, PROJECT)'));
    console.log('');
  }
  console.log(`  ${bold('Next:')}`);
  console.log(`    cd ${opts.target}`);
  console.log('    claude              # start Claude Code (reload window if already open)');
  console.log('    /rcode-progress     # where you are, what\'s next');
  console.log('    /rcode-do           # interactive command picker');
  console.log('    /rcode-council <q>  # multi-agent strategic answer');
  console.log('');
  // #665 — when the install came in via npm -g (--global --no-prompt), the
  // interactive IDE/planning prompts were skipped. Tell the user how to
  // configure them per-project so they aren't stranded with defaults.
  if (opts.global || opts.noPrompt) {
    console.log(`  ${dim('Configure interactively (one-time, per project):')}`);
    console.log(`    ${dim('rcode install         # pick IDE + planning policy for THIS project')}`);
    console.log(`    ${dim('rcode config          # adjust defaults later')}`);
    console.log('');
  }
  console.log(dim('  Refresh anytime:'));
  console.log(dim('    pnpm dlx @hanzlaa/rcode@latest install   # recommended (avoids npm 11.x npx issues)'));
  console.log(dim('    npx @hanzlaa/rcode@latest install        # npm / yarn'));
  console.log(dim(`    /rcode-update v${version}              # pin rcode to a specific version`));
  console.log('');
  console.log(dim('  Want the rcode CLI on your PATH? (optional — needed for rcode version / rcode update):'));
  console.log(dim('    npm install -g @hanzlaa/rcode       # installs rcode, rcode, rcode commands'));
  console.log(dim('    rcode version                       # verify'));
  console.log('');
  console.log(dim('  Customize without losing changes on update:'));
  console.log(dim('    Create <name>.local.md siblings (e.g. .claude/agents/rcode-waleed.local.md)'));
  console.log(dim('    *.local.md files are NEVER touched by install / --force-overwrite / uninstall.'));
  console.log('');
  console.log('  ' + warn('If your IDE is already open, reload the window to refresh skills/commands.'));
  console.log(dim('    Claude Code / VS Code / Cursor:  Cmd+Shift+P → Reload Window'));
  console.log('');

  // Lightweight update check (#252) — async background, never blocks install.
  // Suppressed in non-TTY / CI or when --no-update-check is passed.
  if (!opts.noUpdateCheck && process.stdout.isTTY && !process.env.CI && !process.env.RCODE_NO_UPDATE_NOTIFIER) {
    const { execFile } = require('child_process');
    execFile('npm', ['view', '@hanzlaa/rcode', 'version', '--json'], { timeout: 4000 }, (err, stdout) => {
      if (err) return;
      try {
        const latest = JSON.parse(stdout.trim());
        if (semver.valid(latest) && semver.gt(latest, version)) {
          console.log('');
          console.log('  ╭──────────────────────────────────────────────────────╮');
          console.log(`  │  ${pc.yellow('Update available:')} ${pc.dim(version)} → ${pc.green(latest)}${' '.repeat(Math.max(0, 20 - version.length - latest.length))}    │`);
          console.log('  │  Run: npx @hanzlaa/rcode@latest install .            │');
          console.log('  ╰──────────────────────────────────────────────────────╯');
          console.log('');
        }
      } catch { /* ignore parse errors */ }
    });
  }

  // Issue #838: verify pnpm add didn't silently fail (broken lockfile).
  // Only fires in pnpm projects (pnpm-lock.yaml present). Non-blocking.
  if (!opts.global) {
    const pnpmCheck = verifyPnpmAddDevDep(opts.target);
    if (!pnpmCheck.ok) {
      console.log('  ' + warn(pnpmCheck.message));
      console.log('');
    }
  }

  // Health check — smoke test that the install actually works (#193).
  const healthPass = runInstallHealthCheck(opts.target, { agentCount, commandCount, skillsInstalled });
  return healthPass ? 0 : 1;
}

/**
 * Run a 5-point smoke test against the fresh install. Closes #193.
 * Returns true if all pass, false if any critical check failed.
 * Prints a clean ✓/✖ line per check.
 */
function runInstallHealthCheck(target, counts) {
  console.log(`  ${bold('Health check:')}`);
  const { execFileSync } = require('child_process');
  let fails = 0;

  // Issue #689: thresholds were hardcoded at 20 ("expected ≥ 20 agents",
  // "expected ≥ 20 skills", "expected ≥ 20 commands"). If the package ever
  // ships fewer than 20 of any kind, the health check fails on every install
  // even when the install actually succeeded. Worse: if the package ships
  // 22 agents and an install lands 21 (one corrupt copy), the >= 20 threshold
  // passes — false green.
  //
  // Source the expected counts from the package manifest itself. The verifier
  // in cli/lib/manifest.cjs already does this; we mirror its result here.
  let expected = { agents: 20, skills: 20, commands: 20 };
  try {
    const { readPackageManifest } = require('./lib/manifest.cjs');
    const pkgManifest = readPackageManifest(PACKAGE_ROOT);
    if (pkgManifest && pkgManifest.agents instanceof Set && pkgManifest.actions instanceof Set) {
      // Tolerate ~10% loss vs source — global precedence, .local.md
      // overrides, and intentionally-skipped sidebar stubs all reduce the
      // count without indicating a failure.
      const tolerate = (n) => Math.max(1, Math.floor(n * 0.9));
      expected.agents = tolerate(pkgManifest.agents.size);
      expected.skills = tolerate(pkgManifest.actions.size);
      // Commands count comes from rcode/commands/. No bundled enumerator
      // exists; reuse the agents threshold as a proxy floor.
      const commandsDir = path.join(PACKAGE_ROOT, 'rcode', 'commands');
      if (fs.existsSync(commandsDir)) {
        const cmdCount = fs.readdirSync(commandsDir).filter(f => f.endsWith('.md') && !f.startsWith('_')).length;
        expected.commands = tolerate(cmdCount);
      }
    }
  } catch { /* keep hardcoded fallback */ }

  function check(label, fn) {
    try {
      const out = fn();
      console.log(`    ${ok(label)}${out ? dim(' — ' + out) : ''}`);
    } catch (err) {
      fails += 1;
      console.log(`    ${fail(label)} ${pc.red('—')} ${String(err.message || err).slice(0, 120)}`);
    }
  }

  check('rcode-tools.cjs runs', () => {
    const toolsPath = path.join(target, '.rcode', 'bin', 'rcode-tools.cjs');
    if (!fs.existsSync(toolsPath)) throw new Error('bin/rcode-tools.cjs not installed');
    execFileSync('node', ['-c', toolsPath], { stdio: 'pipe' });
    return 'syntax ok';
  });

  check('.rcode/config.yaml present', () => {
    const p = path.join(target, '.rcode', 'config.yaml');
    if (!fs.existsSync(p)) throw new Error('missing');
    const text = fs.readFileSync(p, 'utf8');
    if (!/user_name:|project_name:/.test(text)) throw new Error('config.yaml incomplete');
    return `${fs.statSync(p).size} bytes`;
  });

  check('.rcode/state.json parses', () => {
    const p = path.join(target, '.rcode', 'state.json');
    if (!fs.existsSync(p)) throw new Error('missing');
    JSON.parse(fs.readFileSync(p, 'utf8'));
    return 'valid JSON';
  });

  check('agents installed', () => {
    if ((counts.agentCount || 0) < expected.agents) {
      throw new Error(`only ${counts.agentCount} agents (expected ≥ ${expected.agents})`);
    }
    return `${counts.agentCount}`;
  });

  check('skills + commands installed', () => {
    const issues = [];
    if ((counts.skillsInstalled || 0) < expected.skills) issues.push(`${counts.skillsInstalled} skills (expected ≥ ${expected.skills})`);
    if ((counts.commandCount || 0) < expected.commands) issues.push(`${counts.commandCount} commands (expected ≥ ${expected.commands})`);
    if (issues.length) throw new Error(`low count: ${issues.join(', ')}`);
    return `${counts.skillsInstalled} skills + ${counts.commandCount} commands`;
  });

  if (fails > 0) {
    console.log('');
    console.log('  ' + fail(`${fails} health check${fails === 1 ? '' : 's'} failed — install may be broken.`));
    console.log(dim('     Debug: node .rcode/bin/rcode-tools.cjs state read && ls -la .rcode/'));
    console.log(dim('     Reinstall: rcode install . --force'));
    console.log('');
    return false;
  }
  console.log('');
  return true;
}

async function main() {
  const argv = process.argv.slice(2);
  const opts = parseArgs(argv);

  if (opts.help) { printHelp(); return; }

  // ── Non-interactive fast path (--yes / CI / piped stdin) ─────────────────
  const interactive = !opts.yes && process.stdin.isTTY && !process.env.CI;

  if (interactive) {
    await runInstallWizard(opts);
  }

  try {
    const code = await install(opts);
    process.exit(code);
  } catch (err) {
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
  }
}

/**
 * Interactive install wizard powered by @clack/prompts.
 * Mutates opts in-place. Exits 0 on cancel.
 */
async function runInstallWizard(opts) {
  const { intro, outro, text, select, multiselect, confirm, isCancel, cancel, note } = clack;
  const pkgVersion = readPackageVersion();

  console.log('');
  intro(pc.bold('🕌 rcode') + pc.dim(`  v${pkgVersion}`));

  // ── 1. Install directory ──────────────────────────────────────────────
  if (!opts.targetProvided) {
    const dir = await text({
      message: 'Install directory?',
      placeholder: opts.target,
      defaultValue: opts.target,
      initialValue: opts.target,
    });
    if (isCancel(dir)) { cancel('Installation cancelled.'); process.exit(0); }
    const resolved = path.resolve((dir || opts.target).trim());
    opts.target = resolved;
    opts.projectName = path.basename(resolved);
  }

  // ── 2. Editor / LLM ──────────────────────────────────────────────────
  const editorChoices = await multiselect({
    message: 'Which editor(s) are you installing for?',
    options: [
      { value: 'claude',  label: 'Claude Code',  hint: 'recommended' },
      { value: 'cursor',  label: 'Cursor' },
      { value: 'codex',   label: 'Codex (OpenAI CLI)', hint: 'AGENTS.md + workflow bridge' },
      { value: 'gemini',  label: 'Gemini CLI',   hint: 'coming soon' },
      { value: 'vscode',  label: 'VS Code',      hint: 'via Continue / Copilot extensions' },
      { value: 'antigravity', label: 'Antigravity', hint: 'experimental' },
    ],
    initialValues: opts.ide ? [opts.ide] : ['claude'],
    required: true,
  });
  if (isCancel(editorChoices)) { cancel('Installation cancelled.'); process.exit(0); }
  opts.ides = editorChoices;
  // Issue #692: keep opts.ide and opts.ides consistent so downstream callers
  // that historically read either field see the same answer. Mark provided
  // so any later resolveIde call exits early.
  opts.ide = editorChoices[0];
  opts.ideProvided = true;

  // ── 3. Communication language ─────────────────────────────────────────
  const langChoice = await select({
    message: 'Communication language?',
    options: [
      { value: 'English',  label: 'English' },
      { value: 'Arabic',   label: 'Arabic  (العربية)' },
      { value: 'French',   label: 'French  (Français)' },
      { value: 'Spanish',  label: 'Spanish (Español)' },
      { value: 'Urdu',     label: 'Urdu    (اردو)' },
    ],
    initialValue: opts.language || 'English',
  });
  if (isCancel(langChoice)) { cancel('Installation cancelled.'); process.exit(0); }
  opts.language = langChoice;

  // ── 4. Agent mode ─────────────────────────────────────────────────────
  const modeChoice = await select({
    message: 'Agent mode?',
    options: [
      { value: 'guided', label: 'Guided', hint: 'confirm at key decision gates' },
      { value: 'yolo',   label: 'Yolo',   hint: 'fully autonomous — no confirmation' },
    ],
    initialValue: opts.mode || 'guided',
  });
  if (isCancel(modeChoice)) { cancel('Installation cancelled.'); process.exit(0); }
  opts.mode = modeChoice;

  // ── 5. Planning artifacts ─────────────────────────────────────────────
  const planningChoice = await select({
    message: 'Where should planning artifacts (.planning/) be saved?',
    options: [
      { value: true,  label: 'Commit to git',  hint: 'recommended — team sees the same plans' },
      { value: false, label: 'Keep local',      hint: 'gitignore — good for sensitive PRDs' },
    ],
    initialValue: true,
  });
  if (isCancel(planningChoice)) { cancel('Installation cancelled.'); process.exit(0); }
  opts.commitPlanning = planningChoice;

  // ── 6. User name ──────────────────────────────────────────────────────
  const nameInput = await text({
    message: 'Your name? (used in agent responses)',
    placeholder: opts.userName,
    defaultValue: opts.userName,
    initialValue: opts.userName,
  });
  if (isCancel(nameInput)) { cancel('Installation cancelled.'); process.exit(0); }
  opts.userName = (nameInput || opts.userName).trim();

  // ── Summary before install ────────────────────────────────────────────
  note(
    [
      `${pc.dim('Directory:')}   ${opts.target}`,
      `${pc.dim('Editor:')}      ${opts.ides.join(', ')}`,
      `${pc.dim('Language:')}    ${opts.language}`,
      `${pc.dim('Mode:')}        ${opts.mode}`,
      `${pc.dim('Planning:')}    ${opts.commitPlanning ? 'committed to git' : 'kept local (gitignored)'}`,
      `${pc.dim('User:')}        ${opts.userName}`,
    ].join('\n'),
    'Installing with these settings'
  );

  console.log('');
}

if (require.main === module) main();

/**
 * Handler for cli/index.js — called as `npx rcode install [args]`.
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
module.exports.SUPPORTED_IDES = SUPPORTED_IDES;
module.exports.migrateVscodeCommandsLayout = migrateVscodeCommandsLayout;
module.exports.getPathsForIde = getPathsForIde;
// Slash-router (hook-based /rcode-* support for codex + antigravity).
module.exports.installSlashRouterCommands = installSlashRouterCommands;
module.exports.installCodexSlashRouterHook = installCodexSlashRouterHook;
module.exports.installAntigravitySlashRouterHook = installAntigravitySlashRouterHook;
module.exports.installNativeHomeSlashCommands = installNativeHomeSlashCommands;
