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

// Output helpers, package/source roots — cli/lib/install-shared.cjs (#1066 Phase 1).
const {
  ok, fail, warn, info, dim, bold, PACKAGE_ROOT, SOURCE_ROOT,
} = require('./lib/install-shared.cjs');
// IDE detection/paths/layout migration — cli/lib/install-ide.cjs.
const {
  SUPPORTED_IDES, resolveIde, getPathsForIde, migrateVscodeCommandsLayout, convertToCursorMdc,
} = require('./lib/install-ide.cjs');
// Install-plan construction + module manifest filtering — cli/lib/install-plan.cjs.
const {
  buildInstallPlan, listAvailableModules, filterPlanByModules,
} = require('./lib/install-plan.cjs');
// Manifest generation + orphan sweep — cli/lib/install-manifest.cjs.
const {
  sha256, readPackageVersion, generateAgentManifest, generateFilesManifest,
  sweepStaleInstalledFiles, generateInstallManifest,
} = require('./lib/install-manifest.cjs');
// Skills installer + brain scaffold — cli/lib/install-skills.cjs.
const {
  installBrainScaffold, installSkills,
} = require('./lib/install-skills.cjs');
// Directory scaffolding — cli/lib/install-scaffold.cjs.
const {
  ensureDir, seedStarterPlanning,
} = require('./lib/install-scaffold.cjs');
// Install-time prompts + marked-block writers — cli/lib/install-hooks.cjs.
const {
  resolveCommitPlanning, resolveEnableHooks, ensureRcodeSettingsHooks,
  ensureRcodeGitignore, ensureRcodePreferredCommandRule, ensureRcodePreCommitHook,
} = require('./lib/install-hooks.cjs');
// config.yaml generation/validation/parsing — cli/lib/install-config.cjs.
const {
  generateConfigYaml, validateConfig, parseSimpleYaml,
} = require('./lib/install-config.cjs');
// Pre-overwrite backups, pnpm dep check, health check — cli/lib/install-backup.cjs.
const {
  createInstallBackup, verifyPnpmAddDevDep, runInstallHealthCheck,
} = require('./lib/install-backup.cjs');
// Global slash-router install (Codex/Antigravity) — cli/lib/install-router.cjs.
const {
  installSlashRouterCommands, installCodexSlashRouterHook,
  installAntigravitySlashRouterHook, installNativeHomeSlashCommands,
} = require('./lib/install-router.cjs');

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
    // Claude Code guardrail hooks (.claude/settings.json). null = resolve via
    // resolveEnableHooks() (interactive prompt, or default-on for --yes/non-TTY).
    // Set false by --no-hooks, true by --enable-hooks.
    enableHooks: null,
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
    else if (arg === '--no-hooks') opts.enableHooks = false;
    else if (arg === '--enable-hooks') opts.enableHooks = true;
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
  --enable-hooks     merge rcode guardrail hooks into .claude/settings.json (default: on)
  --no-hooks         skip guardrail hooks; enable later via /rcode-enable-hooks
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
 * Build the list of (sourcePath, targetRelativePath) install pairs. Each
 * entry describes one file we will copy and where it lands in the target
 * project. Returning the list up-front lets us do a dry-run or hash-check
 * pass before touching the disk.
 *
 * For cursor IDE, converts command files from .md to .mdc format.
 */
















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








/**
 * Validate the resolved IDE list and print per-IDE informational/warning
 * messages. Mutates opts.ides in place (claude-code alias normalization,
 * dropping unimplemented gemini). Returns an installInner exit code (0/1)
 * when validation fails or the IDE list becomes empty, else null to signal
 * "continue".
 *
 * Split out of installInner() (#1066 Phase 2) — mechanical extraction, no
 * behavior change.
 */
function validateAndAnnotateIdes(opts) {
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
      console.log('  ' + warn('Codex needs a GLOBAL install — re-run with `--global` to wire the ~/.codex/hooks.json router AND copy rcode skills to ~/.codex/skills/. This project-local install enables NEITHER: Codex reads slash commands and skills only from its home dir, and has no agents surface at all.'));
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

  return null;
}

/**
 * Validate --modules, migrate legacy vscode layout, build + filter the
 * install plan, and handle the dry-run/list-files early exit. Returns
 * { exitCode, plan } — exitCode is null to continue (plan is then the
 * resolved install plan array), or an installInner exit code (0/1) to
 * return immediately.
 *
 * Split out of installInner() (#1066 Phase 2) — mechanical extraction, no
 * behavior change.
 */
function resolveInstallPlan(opts) {
  // Validate requested modules exist
  if (opts.modules.length > 0) {
    const available = listAvailableModules();
    const unknownModules = opts.modules.filter(m => !available.includes(m));
    if (unknownModules.length > 0) {
      console.error(`✖ Unknown module(s): ${unknownModules.join(', ')}`);
      console.error(`  Available modules: ${available.join(', ')}`);
      return { exitCode: 1, plan: null };
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
      return { exitCode: 1, plan: null };
    }
    console.error('✖ Nothing to install — install plan is empty.');
    if (opts.modules.length > 0) console.error(`  Modules requested: ${opts.modules.join(', ')}`);
    return { exitCode: 1, plan: null };
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
    return { exitCode: 0, plan: null };
  }

  return { exitCode: null, plan };
}

/**
 * Duplicate-prevention: when rcode commands already exist globally in
 * ~/.claude/commands/, skip writing project-level commands (or remove
 * untracked project-level duplicates that already exist) so a global +
 * project install doesn't double every slash command. Agents are never
 * deduped (#1022 — they're project-local by design). Git-tracked project
 * command files are preserved even when a global duplicate exists (#1062 —
 * dedup removes redundant copies, not deliberately-committed ones).
 *
 * Mutates `plan` in place (matches the pre-extraction in-place filter
 * pattern the rest of installInner relies on). Returns { isProjectInstall }
 * — also needed later in installInner for skills/stub install dedup.
 *
 * Split out of installInner() (#1066 Phase 2) — mechanical extraction, no
 * behavior change.
 */
function dedupeAgainstGlobalCommands(plan, opts) {
  // Duplicate-prevention: if rcode commands already exist globally in ~/.claude/commands/,
  // skip writing agents/commands to the project's .claude/ directory. Without this,
  // running `npx rcode install` in the home dir AND then in a project creates two sets
  // of identical files — Claude Code shows both as duplicate slash commands.
  const globalClaudeCommands = path.join(homedir(), '.claude', 'commands');
  const projectClaudeCommands = path.join(opts.target, '.claude', 'commands');
  // #938 — --local-only forces a self-contained install: treat it as NOT a
  // global-deferring project install so all skills/commands are written locally.
  // --local-only is self-containment with a running cost, and the cost only
  // becomes visible in a pull request. State it here instead.
  if (opts.localOnly && opts.target !== homedir()) {
    console.log('  ' + warn('--local-only: writing all commands and skills into this project.'));
    console.log('    ' + dim('They are gitignored by default. If you force-track them for collaborators/CI,'));
    console.log('    ' + dim('every rcode update becomes a diff of tens of thousands of lines, and any local'));
    console.log('    ' + dim('edit to them is silently overwritten by the next install.'));
    console.log('    ' + dim('The alternative is one setup step: npx @hanzlaa/rcode install (CI + new clones).'));
  }

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

          // A file the project chose to COMMIT is not a duplicate — it is a
          // decision. Deleting tracked files here turned a routine update into a
          // 218-deletion PR that the user had to stop and question, under a flag
          // literally named --non-destructive. Dedup removes redundant copies;
          // it does not overrule what a repo deliberately tracks.
          const { spawnSync: _spawn } = require('child_process');
          const isTracked = (abs) => {
            const r = _spawn('git', ['ls-files', '--error-unmatch', abs],
              { cwd: opts.target, stdio: 'ignore' });
            return r.status === 0;
          };

          let removedCmds = 0, keptTracked = 0;
          for (const f of projectCommandFiles) {
            const abs = path.join(projectClaudeCommands, f);
            if (isTracked(abs)) { keptTracked++; continue; }
            fs.unlinkSync(abs);
            removedCmds++;
          }
          // Remove rcode/ subdirectory (vscode-style commands).
          // #688 — safeRmSync refuses to traverse out-of-target symlinks.
          const rcodeSubdir = path.join(projectClaudeCommands, 'rcode');
          if (fs.existsSync(rcodeSubdir)) {
            safeRmSync(rcodeSubdir, opts.target);
          }
          if (removedCmds > 0) {
            console.log('  ' + dim(`Removed ${removedCmds} untracked duplicate project-level rcode command(s) — the global ones in ~/.claude/ take precedence.`));
          }
          if (keptTracked > 0) {
            console.log('  ' + ok(`Kept ${keptTracked} git-tracked project command(s) — this repo commits them deliberately, so they were left alone.`));
          }
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

  return { isProjectInstall };
}

/**
 * Write .rcode/_config/manifest.yaml + agent-manifest.csv, handle --reset,
 * write/refresh .rcode/config.yaml (preserving user edits while syncing
 * commit_planning drift — #685), validate it against ConfigSchema (#250,
 * warn-only), seed .rcode/state.json (preserving the _seeded_stub marker
 * logic from #705), and scaffold .planning/council-sessions/,
 * .rcode/context/ stubs, and ~/.rcode/agents/. Returns { existedBefore } —
 * needed later in installInner's summary ("config.yaml and state.json
 * preserved" note).
 *
 * Split out of installInner() (#1066 Phase 2) — mechanical extraction, no
 * behavior change. configDir is passed in (not recomputed) so the caller's
 * later files-manifest.csv write shares the exact same path.
 */
function writeInstallConfigAndState(opts, plan, configDir) {
  // Write .rcode/_config/manifest.yaml + agent-manifest.csv + files-manifest.csv
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

  return { existedBefore };
}

/**
 * Print the post-install summary: swept/preserved counters, gitignore/
 * pre-commit-hook/guardrail-hooks/preferred-command-rule action lines,
 * preserved-file diffs (#251), agent/command/skill counts (with global-
 * precedence fallback, #669/#689), the namespace-collision warning
 * (rcode-* vs rihal-*), the "Next steps" block, the async update check
 * (#252), the pnpm lockfile check (#838), and the final health check
 * (#193) — whose pass/fail becomes installInner's own return value.
 *
 * Takes a structured `report` object rather than closing over installInner
 * locals, per #1066 Phase 2's design: { sweptOrphans, existedBefore,
 * brainBackgrounded, brainReport, gitignoreReport, hookReport,
 * settingsHooksReport, preferredCommandReports, skipped, preserved,
 * preservedDiffs, skillsInstalled, starterSeeded }.
 *
 * Split out of installInner() (#1066 Phase 2) — mechanical extraction, no
 * behavior change.
 */
function printInstallSummary(opts, report) {
  const {
    sweptOrphans, existedBefore, brainBackgrounded, brainReport,
    gitignoreReport, hookReport, settingsHooksReport, preferredCommandReports,
    skipped, preserved, preservedDiffs, starterSeeded,
  } = report;
  let skillsInstalled = report.skillsInstalled;

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
  if (settingsHooksReport) {
    const settingsHooksMsg = {
      'merged': 'guardrail hooks enabled (.claude/settings.json)',
      'skipped-flag': 'guardrail hooks skipped (--no-hooks or declined)',
      'skipped-template-missing': 'guardrail hooks skipped (settings-hooks.json template missing)',
      'skipped-error': 'guardrail hooks skipped (error merging .claude/settings.json)',
    }[settingsHooksReport.action] || 'guardrail hooks unchanged';
    console.log('  ' + dim(settingsHooksMsg));
  }
  if (preferredCommandReports && Object.keys(preferredCommandReports).length > 0) {
    const RULE_FILE = { claude: 'CLAUDE.md', codex: 'AGENTS.md', cursor: '.cursor/rules/rcode-prefer-do.mdc', windsurf: '.windsurf/rules/rcode-prefer-do.mdc' };
    for (const [ide, report2] of Object.entries(preferredCommandReports)) {
      const file = RULE_FILE[ide] || ide;
      const msg = {
        'created': `${file}: /rcode-do rule added`,
        'appended': `${file}: /rcode-do rule appended`,
        'updated': `${file}: /rcode-do rule refreshed`,
        'already-present': `${file}: /rcode-do rule already present`,
        'written': `${file}: /rcode-do rule written`,
        'skipped-error': `${file}: /rcode-do rule skipped (${report2.error})`,
      }[report2.action] || `${file}: /rcode-do rule unchanged`;
      console.log('  ' + dim(msg));
    }
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

async function installInner(opts) {
  const pkgVersion = readPackageVersion();

  // Header banner — only shown for interactive runs to keep CI/non-TTY logs terse.
  const isInteractive = process.stdin.isTTY && !opts.yes;
  if (isInteractive) printInstallHeader(pkgVersion);

  // Resolve target IDE (interactive prompt unless --ide flag, --yes, or non-TTY).
  opts.ides = await resolveIde(opts);

  // Resolve commit-planning preference (interactive prompt or flag) — #189.
  opts.commitPlanning = await resolveCommitPlanning(opts);

  // Resolve guardrail-hooks preference (interactive prompt or flag). Default on.
  opts.enableHooks = await resolveEnableHooks(opts);

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

  // IDE validation + per-IDE messaging — #1066 Phase 2 extraction.
  const idesExitCode = validateAndAnnotateIdes(opts);
  if (idesExitCode !== null) return idesExitCode;

  // --modules validation, vscode-layout migration, plan build/filter, and
  // the dry-run/list-files early exit — #1066 Phase 2 extraction.
  const { exitCode: planExitCode, plan } = resolveInstallPlan(opts);
  if (planExitCode !== null) return planExitCode;

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
      } catch (err) {
        // #1062 — an empty priorManifest makes every file look "new" to the
        // preserve-user-edits check below, which silently falls through to an
        // unconditional overwrite. That defeats the entire point of
        // --non-destructive, so a corrupt manifest must abort, not degrade.
        console.error('');
        console.error(`✖ --non-destructive: could not read prior install manifest at ${manifestPath}`);
        console.error(`  (${err.message})`);
        console.error(`  Refusing to install — a missing manifest means locally-modified files`);
        console.error(`  can't be told apart from pristine ones, so this would risk silently`);
        console.error(`  overwriting your edits.`);
        console.error(`  Fix or remove the corrupted manifest, or re-run without --non-destructive.`);
        console.error('');
        return 1;
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

  // Command-dedup against global ~/.claude/commands/ (incl. git-tracked-file
  // check) — #1066 Phase 2 extraction. Mutates `plan` in place.
  const { isProjectInstall } = dedupeAgainstGlobalCommands(plan, opts);

  // config.yaml/manifest/state.json writing incl. stub-marker + commit_planning
  // drift-preserving logic — #1066 Phase 2 extraction.
  const configDir = path.join(opts.target, '.rcode', '_config');
  const { existedBefore } = writeInstallConfigAndState(opts, plan, configDir);

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

  // Merge rcode guardrail hooks into .claude/settings.json (pre-edit, bash-guard,
  // prompt-router, etc). Default-on; resolved above via resolveEnableHooks().
  const settingsHooksReport = ensureRcodeSettingsHooks(opts.target, { enableHooks: opts.enableHooks });

  // Point each installed IDE's rule file at /rcode-do as the preferred entry point
  // for non-trivial work — an rcode-owned marked block/file, not a full rewrite.
  const preferredCommandReports = ensureRcodePreferredCommandRule(opts.target, opts.ides);

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

  // Post-install summary + counting + health check — #1066 Phase 2 extraction.
  // Structured report object, not closures (per plan).
  return printInstallSummary(opts, {
    sweptOrphans, existedBefore, brainBackgrounded, brainReport,
    gitignoreReport, hookReport, settingsHooksReport, preferredCommandReports,
    skipped, preserved, preservedDiffs, skillsInstalled, starterSeeded,
  });
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
