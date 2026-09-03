/**
 * cli/lib/install-ide.cjs — IDE detection, path resolution, and IDE-layout
 * migrations (vscode legacy commands layout, Cursor .mdc pass-through).
 *
 * Split out of cli/install.js (#1066 Phase 1) — mechanical move, no
 * behavior change. SUPPORTED_IDES is the single source of truth for
 * supported IDEs (#697 — W4.3): order matters (detection/prompts/errors).
 */

const fs = require('fs');
const path = require('path');
const clack = require('@clack/prompts');
const { homedir } = require('./homedir.cjs');

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
      //
      // What Codex actually reads — verified live against Codex CLI 0.150.1:
      //   AGENTS.md              → project instructions  ✅ written here
      //   ~/.codex/prompts/*.md  → /slash commands       (--global only)
      //   ~/.codex/skills/<n>/   → skills                (--global only)
      //   (no agents surface)    → Codex has NO subagent concept at all
      //
      // The agentsDir below is therefore written for MULTI-IDE SHARING ONLY.
      // Codex itself never reads it, and rcode's agents cannot appear in Codex
      // in any form — not a bug to fix, an absent surface. Skills are the only
      // place rcode's capabilities can surface there.
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

module.exports = {
  SUPPORTED_IDES,
  detectIdeSignals,
  resolveIde,
  getPathsForIde,
  migrateVscodeCommandsLayout,
  convertToCursorMdc,
};
