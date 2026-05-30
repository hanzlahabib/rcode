/**
 * rcode uninstall — remove rcode from the current project.
 *
 * Cleanly removes:
 *   - .claude/skills/rcode-*             (phrase-activated skills)
 *   - .claude/commands/rcode/             (slash commands)
 *   - .claude/agents/rcode-*.md           (v2 subagents: sadiq, waleed, yousef, zayd, etc.)
 *   - .cursor/rules/rcode-*.mdc           (cursor rules)
 *   - .windsurf/rules/rcode-*.mdc         (windsurf rules)
 *   - .antigravity/agents/rcode-*         (antigravity agents)
 *   - rcode section in AGENTS.md     (appended section only — file preserved)
 *   - .rcode/                             (ONLY if user explicitly confirms — contains project state)
 *
 * Default: interactive preview → confirmation → delete.
 *
 * Flags:
 *   --editor=claude|cursor|windsurf|antigravity|all   Limit scope
 *   --keep-state                                      Never touch .rcode/
 *   --delete-state                                    Also delete .rcode/ (skip prompt)
 *   --purge / --all                                   Wipe everything — editor files,
 *                                                       .rcode/, .planning/, gitignore block.
 *                                                       Use when you want /rcode-init to
 *                                                       report "fresh" on next install.
 *   --yes / -y                                        Skip the main confirmation
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { askConfirm, PromptAbortError } = require('./lib/prompts.cjs');
const { writeFileAtomic, safeRmSync } = require('./lib/fsutil.cjs');

function parseArgs(args) {
  const opts = {
    editor: null,           // null = all
    keepState: false,       // if true, never delete .rcode/
    deleteState: false,     // if true, delete .rcode/ without prompting
    yes: false,             // skip the main confirmation
    purge: false,           // wipe everything: editor files + .rcode/ + .planning/ + gitignore block
  };
  for (const arg of args) {
    if (arg.startsWith('--editor=')) {
      opts.editor = arg.slice('--editor='.length);
    } else if (arg === '--keep-state') {
      opts.keepState = true;
    } else if (arg === '--delete-state') {
      opts.deleteState = true;
    } else if (arg === '--yes' || arg === '-y') {
      opts.yes = true;
    } else if (arg === '--purge' || arg === '--all') {
      // --purge implies --delete-state and removes .planning/ + gitignore block.
      // Use this when you want a clean slate so /rcode-init reports "fresh" next time.
      opts.purge = true;
      opts.deleteState = true;
    }
  }
  return opts;
}

/**
 * #382 — Local overrides: files matching <name>.local.md (or .local.mdc /
 * .local.json / etc.) are user-managed. The uninstaller never removes them
 * — they survive both regular uninstall AND --purge. Users can customize
 * an agent voice / skill / command by creating a .local.md sibling, knowing
 * it'll persist across updates and uninstalls.
 */
function isLocalOverride(name) {
  return /\.local\.(md|mdc|json|yaml|yml|toml|js|ts)$/.test(name);
}

/**
 * Strip the rcode-managed block from a .gitignore string.
 *
 * Pure function (no fs) so it can be unit-tested independently. Issue #684
 * fixed the over-broad legacy regex; this helper centralises the logic so
 * any future shape change has exactly one site to update.
 *
 * Both supported shapes require BOTH the opener AND the closer to match —
 * user comments starting with "# rcode" are safe.
 */
function stripRcodeGitignoreBlock(text) {
  return text
    // Current shape (install.js BEGIN/END markers — exact match).
    .replace(/\n?# ===== rcode-managed gitignore block[\s\S]*?# ===== end rcode-managed gitignore block =====\n?/g, '\n')
    // Legacy >>> / <<< fenced shape.
    .replace(/\n?# >>> rcode >>>[\s\S]*?# <<< rcode <<<\n?/g, '\n')
    .replace(/\n{3,}/g, '\n\n');
}

/**
 * Strip the rcode-managed block from .git/hooks/pre-commit.
 * Removes the file entirely when only the shebang + rcode block remain.
 * Returns 'removed' | 'stripped' | 'unchanged' | 'skipped'.
 */
function cleanRcodePreCommitHook(cwd) {
  const hookPath = path.join(cwd, '.git', 'hooks', 'pre-commit');
  if (!fs.existsSync(hookPath)) return 'skipped';

  const BEGIN = '# ===== rcode-managed pre-commit block =====';
  const END   = '# ===== end rcode pre-commit block =====';

  let content;
  try { content = fs.readFileSync(hookPath, 'utf8'); } catch { return 'skipped'; }

  if (!content.includes(BEGIN)) return 'unchanged';

  const startIdx = content.indexOf(BEGIN);
  const endIdx = content.indexOf(END, startIdx);
  if (endIdx < 0) return 'unchanged'; // malformed — leave it

  // Trim the newline that precedes BEGIN and the newline that follows END
  let lo = startIdx;
  if (lo > 0 && content[lo - 1] === '\n') lo--;
  let hi = endIdx + END.length;
  if (hi < content.length && content[hi] === '\n') hi++;

  const stripped = content.slice(0, lo) + content.slice(hi);

  // If only a shebang (or blank) remains, remove the whole file
  const remnant = stripped.trim();
  if (remnant === '' || remnant === '#!/bin/sh' || remnant === '#!/bin/bash') {
    try { fs.unlinkSync(hookPath); return 'removed'; } catch { return 'skipped'; }
  }

  try {
    writeFileAtomic(hookPath, stripped, { mode: 0o755 });
    return 'stripped';
  } catch { return 'skipped'; }
}

/**
 * Walk a directory and remove all files/subdirs whose name matches a predicate.
 * Returns the number of entries removed. Always skips local overrides (#382).
 */
function removeMatching(dir, predicate) {
  if (!fs.existsSync(dir)) return 0;
  let count = 0;
  // Issue #688: project root for symlink-traversal guard. Anything we
  // remove from inside the project must resolve to within the project.
  const projectRoot = path.resolve(process.cwd());
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (isLocalOverride(entry.name)) continue; // #382 — never remove user overrides
    if (!predicate(entry.name)) continue;
    const full = path.join(dir, entry.name);
    const result = safeRmSync(full, projectRoot);
    if (!result.ok && result.reason === 'outside-root') {
      console.log(`   ⚠ refused to remove ${full} — symlink resolves outside project root`);
      continue;
    }
    count++;
  }
  return count;
}

/**
 * Remove a directory only if it is completely empty. Safe — will never
 * delete user content. Returns true if removed.
 */
function rmdirIfEmpty(dir) {
  if (!fs.existsSync(dir)) return false;
  try {
    if (fs.readdirSync(dir).length === 0) {
      fs.rmdirSync(dir);
      return true;
    }
  } catch {
    // ignore — could be a file, permission error, etc.
  }
  return false;
}

/**
 * Cascade `rmdirIfEmpty` upward through a list of paths.
 * Order matters: pass innermost first so each parent has a chance to
 * become empty after its child is removed.
 *
 * Never touches `.rcode/` — that's managed separately by the state
 * preservation flow.
 */
function cleanupEmptyDirs(cwd, relPaths) {
  for (const rel of relPaths) {
    rmdirIfEmpty(path.join(cwd, rel));
  }
}

/**
 * Build the plan of what would be removed, without actually removing anything.
 * Returns an object with per-editor counts and a list of absolute paths.
 */
function buildPlan(cwd, editors) {
  const plan = {
    claude: { skills: [], commands: [], agents: [], agentsRulesDir: false },
    cursor: [],
    windsurf: [],
    antigravity: [],
    gemini: [],   // #706 — added when --editor=gemini or --editor=all
    vscode: [],   // #706 — vscode marker dir cleanup (commands share .claude/)
    agentsMd: null, // null = no section; 'present' = section present
    stateDir: null, // null = missing; { files: N } = present
    planningDir: null, // null = missing; { files: N } = present
  };

  // Issue #706: vscode and gemini are in SUPPORTED_IDES but uninstall.js had
  // no branches for them. vscode shares .claude/ for commands+agents+skills
  // — fold into the claude branch. gemini has its own .gemini/rcode/ tree.
  if (editors.includes('vscode')) {
    if (!editors.includes('claude')) editors.push('claude'); // share scan
    const markerDir = path.join(cwd, '.vscode/rcode');
    if (fs.existsSync(markerDir)) plan.vscode.push('.vscode/rcode');
  }

  if (editors.includes('claude')) {
    const skillsDir = path.join(cwd, '.claude/skills');
    if (fs.existsSync(skillsDir)) {
      plan.claude.skills = fs
        .readdirSync(skillsDir)
        .filter((name) => name.startsWith('rcode-') || isKnownSkillName(name));
    }
    // Collect commands from vscode-style subdir (.claude/commands/rcode/) and
    // claude-style root-level files (.claude/commands/rcode-*.md).
    const commandsSubdir = path.join(cwd, '.claude/commands/rcode');
    if (fs.existsSync(commandsSubdir)) {
      plan.claude.commands = fs.readdirSync(commandsSubdir);
    }
    const commandsRoot = path.join(cwd, '.claude/commands');
    if (fs.existsSync(commandsRoot)) {
      const rootFiles = fs.readdirSync(commandsRoot)
        .filter(f => f.startsWith('rcode-') && (f.endsWith('.md') || f.endsWith('.mdc')));
      plan.claude.commands = [...plan.claude.commands, ...rootFiles];
    }
    // v2 installs agents to .claude/agents/rcode-*.md — scan for them
    const agentsDir = path.join(cwd, '.claude/agents');
    if (fs.existsSync(agentsDir)) {
      plan.claude.agents = fs
        .readdirSync(agentsDir)
        .filter((name) => name.startsWith('rcode-') && name.endsWith('.md'));
    }
    // Installer copies rcode/agents/rules/ tree → .claude/agents/rules/ (#876)
    if (fs.existsSync(path.join(cwd, '.claude/agents/rules'))) {
      plan.claude.agentsRulesDir = true;
    }
  }

  if (editors.includes('cursor')) {
    const cursorDir = path.join(cwd, '.cursor/rules');
    if (fs.existsSync(cursorDir)) {
      plan.cursor = fs
        .readdirSync(cursorDir)
        // 'rcode' matches the .cursor/rules/rcode/ subdir installed by the cursor IDE path (#876)
        .filter((name) => name.startsWith('rcode-') || name === 'rcode.mdc' || name === 'rcode-method.mdc' || name === 'rcode');
    }
  }

  if (editors.includes('windsurf')) {
    const windsurfDir = path.join(cwd, '.windsurf/rules');
    if (fs.existsSync(windsurfDir)) {
      plan.windsurf = fs
        .readdirSync(windsurfDir)
        .filter((name) => name.startsWith('rcode-') || name === 'rcode.mdc' || name === 'rcode-method.mdc');
    }
  }

  if (editors.includes('antigravity')) {
    const agDir = path.join(cwd, '.antigravity/agents');
    if (fs.existsSync(agDir)) {
      plan.antigravity = fs
        .readdirSync(agDir)
        .filter((name) => name.startsWith('rcode-'));
    }
  }

  if (editors.includes('gemini')) {
    // #706 — gemini installs to .gemini/rcode/{agents,commands}
    for (const sub of ['agents', 'commands']) {
      const dir = path.join(cwd, '.gemini', 'rcode', sub);
      if (fs.existsSync(dir)) {
        for (const name of fs.readdirSync(dir)) {
          if (name.startsWith('rcode-') || name.endsWith('.md')) {
            plan.gemini.push(path.join('.gemini/rcode', sub, name));
          }
        }
      }
    }
  }

  // Check AGENTS.md for rcode section
  const agentsMdPath = path.join(cwd, 'AGENTS.md');
  if (fs.existsSync(agentsMdPath)) {
    const content = fs.readFileSync(agentsMdPath, 'utf8');
    if (content.includes('## rcode Agents (installed)') || content.includes('## rcode Method Agents (installed)')) {
      plan.agentsMd = 'present';
    }
  }

  // Check .rcode/ state directory
  const rcodeDir = path.join(cwd, '.rcode');
  if (fs.existsSync(rcodeDir)) {
    let fileCount = 0;
    function countFiles(dir) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) countFiles(path.join(dir, entry.name));
        else fileCount++;
      }
    }
    try { countFiles(rcodeDir); } catch {}
    plan.stateDir = { files: fileCount };
  }

  return plan;
}

/**
 * Names of action-skill directories the installer places under .claude/skills/.
 *
 * Issue #693: this used to be a hardcoded array of 23 names that drifted from
 * the source the moment anyone added or removed a skill in `rcode/skills/`.
 * We now derive it from the package's own manifest (cli/lib/manifest.cjs)
 * with a static fallback for the rare case where the manifest module isn't
 * resolvable from the uninstall context.
 */
function discoverKnownActionSkills() {
  try {
    const { readPackageManifest } = require('./lib/manifest.cjs');
    const packageRoot = path.resolve(__dirname, '..');
    const pkg = readPackageManifest(packageRoot);
    if (pkg && pkg.actions instanceof Set && pkg.actions.size > 0) {
      return Array.from(pkg.actions);
    }
  } catch { /* fall through to static list */ }
  // Static fallback — kept minimal, only the names that don't start with
  // 'rcode-' would actually need this list since we already match
  // 'rcode-*' via prefix. This is defensive only.
  return [];
}
const KNOWN_ACTION_SKILLS = discoverKnownActionSkills();

function isKnownSkillName(name) {
  return KNOWN_ACTION_SKILLS.includes(name);
}

/**
 * Build the list of files/dirs (relative to cwd) that the uninstall plan
 * will delete or mutate. Used to feed `tar --files-from=-`.
 *
 * @param {object} plan — uninstall plan
 * @param {string} cwd — project root
 * @param {object} [options]
 * @param {boolean} [options.purge=false] — when true, also include .rcode/
 *   and .planning/ in the backup so --purge users can recover state.json,
 *   decisions, and planning artifacts. Issue #683.
 */
function planToPathList(plan, cwd, options = {}) {
  const paths = [];

  for (const name of plan.claude.skills) {
    paths.push(path.join('.claude/skills', name));
  }
  // Issue #704: claude IDE installs slash commands as flat
  // .claude/commands/rcode-*.md files (post-#697 layout). The previous
  // backup only added the legacy '.claude/commands/rcode' subdir, so on
  // any modern claude install the tarball was missing every slash command.
  // Add each flat file individually if present, plus the legacy subdir.
  for (const name of plan.claude.commands) {
    // plan.claude.commands holds entries from BOTH layouts:
    //   - 'rcode-foo.md' (claude flat)
    //   - 'foo.md' (vscode subdir)
    // Disambiguate by the rcode- prefix.
    if (name.startsWith('rcode-') && name.endsWith('.md')) {
      paths.push(path.join('.claude/commands', name));
    }
  }
  // Legacy vscode-style subdir is added once if any subdir entries exist.
  const hasSubdirCommand = plan.claude.commands.some(n => !n.startsWith('rcode-'));
  if (hasSubdirCommand) {
    paths.push('.claude/commands/rcode');
  }
  for (const name of plan.claude.agents) {
    paths.push(path.join('.claude/agents', name));
  }
  if (plan.claude.agentsRulesDir) {
    paths.push('.claude/agents/rules');
  }
  for (const name of plan.cursor) {
    paths.push(path.join('.cursor/rules', name));
  }
  for (const name of plan.windsurf) {
    paths.push(path.join('.windsurf/rules', name));
  }
  for (const name of plan.antigravity) {
    paths.push(path.join('.antigravity/agents', name));
  }
  // #706 — gemini paths are already relative (built that way in buildPlan).
  if (Array.isArray(plan.gemini)) {
    for (const rel of plan.gemini) paths.push(rel);
  }
  if (Array.isArray(plan.vscode)) {
    for (const rel of plan.vscode) paths.push(rel);
  }
  // AGENTS.md is mutated (stripped), not deleted — but we back it up so the
  // user can restore the stripped content.
  if (plan.agentsMd && fs.existsSync(path.join(cwd, 'AGENTS.md'))) {
    paths.push('AGENTS.md');
  }

  // Issue #683: --purge wipes .rcode/ AND .planning/ but the backup never
  // included them. User loses state.json, decisions, planning artifacts with
  // no recovery. Add them when purging — but EXCLUDE .rcode/backups/ itself
  // (we'd be writing into the dir we're tar-ing).
  if (options.purge) {
    const rcodeDir = path.join(cwd, '.rcode');
    if (fs.existsSync(rcodeDir)) {
      // Walk one level deep and add everything except backups/
      try {
        for (const entry of fs.readdirSync(rcodeDir)) {
          if (entry === 'backups') continue;
          paths.push(path.join('.rcode', entry));
        }
      } catch { /* fall through; ok=false from tar will warn */ }
    }
    if (fs.existsSync(path.join(cwd, '.planning'))) {
      paths.push('.planning');
    }
  }

  return paths;
}

/**
 * Create a timestamped tar.gz backup of all files the uninstall will touch.
 *
 * Returns { ok, path, warning } — ok=false means we couldn't write a backup
 * (tar missing, no paths, etc.); the caller should warn the user but may
 * still proceed since the user already confirmed the destructive action.
 */
function createBackup(cwd, plan, options = {}) {
  const paths = planToPathList(plan, cwd, { purge: options.purge === true });
  if (paths.length === 0) {
    return { ok: false, warning: 'nothing to back up' };
  }

  // tar must exist. On Linux/macOS it's always available; Windows without
  // WSL may not have it — warn and skip there.
  const tarCheck = spawnSync('tar', ['--version'], { stdio: 'ignore' });
  if (tarCheck.status !== 0) {
    return { ok: false, warning: 'tar not available on this system' };
  }

  // Issue #683: when --purge wipes .rcode/, a backup written into
  // .rcode/backups/ would be deleted moments later. Write to a sibling
  // .rcode-backups/ at the project root instead so the backup survives.
  // For non-purge runs, keep the historical .rcode/backups/ location.
  const backupsDir = options.purge
    ? path.join(cwd, '.rcode-backups')
    : path.join(cwd, '.rcode/backups');
  try {
    fs.mkdirSync(backupsDir, { recursive: true });
  } catch (err) {
    return { ok: false, warning: `could not create ${path.relative(cwd, backupsDir)}/: ${err.message}` };
  }

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupFile = path.join(backupsDir, `uninstall-${ts}.tgz`);
  const backupRel = path.relative(cwd, backupFile);

  // Feed file list via stdin; tar -T - reads NUL or newline-separated paths.
  // We pass them newline-separated and use --files-from=- (GNU tar) which is
  // equivalent to -T -.
  const result = spawnSync(
    'tar',
    ['-czf', backupFile, '-C', cwd, '--files-from=-'],
    {
      input: paths.join('\n') + '\n',
      encoding: 'utf8',
    }
  );

  if (result.status !== 0) {
    return {
      ok: false,
      warning: `tar exited ${result.status}: ${(result.stderr || '').trim()}`,
    };
  }

  return { ok: true, path: backupRel };
}

/**
 * Remove the rcode section from AGENTS.md without deleting the whole file.
 * The section starts with `## rcode Agents (installed)` or the older
 * `## rcode Method Agents (installed)` header and ends at either EOF or the
 * next `## ` top-level heading.
 */
function stripRcodeFromAgentsMd(agentsMdPath) {
  if (!fs.existsSync(agentsMdPath)) return false;
  let content = fs.readFileSync(agentsMdPath, 'utf8');
  let changed = false;

  // Match the rcode section and everything until the next `## ` or EOF
  const patterns = [
    /\n*---\n+## rcode Agents \(installed\)[\s\S]*?(?=\n## |\n*$)/,
    /\n*---\n+## rcode Method Agents \(installed\)[\s\S]*?(?=\n## |\n*$)/,
    /\n*## rcode Agents \(installed\)[\s\S]*?(?=\n## |\n*$)/,
    /\n*## rcode Method Agents \(installed\)[\s\S]*?(?=\n## |\n*$)/,
  ];

  for (const pattern of patterns) {
    if (pattern.test(content)) {
      content = content.replace(pattern, '');
      changed = true;
    }
  }

  if (changed) {
    // Clean up any trailing `---` that's now alone
    content = content.replace(/\n---\n+$/, '\n');
    // Atomic so a Ctrl+C mid-strip can't truncate the user's AGENTS.md.
    writeFileAtomic(agentsMdPath, content);
  }
  return changed;
}

module.exports = async function uninstall(args) {
  try {
    return await runUninstall(args);
  } catch (err) {
    if (err instanceof PromptAbortError) {
      console.log(`\n❌ Uninstall cancelled — ${err.message}.`);
      process.exit(0);
    }
    throw err;
  }
};

async function runUninstall(args) {
  const opts = parseArgs(args);
  const cwd = process.cwd();

  // Issue #693 + #697 (W4.3): keep the IDE list in sync with the installer
  // by importing the single source of truth. Adding an IDE to install.js
  // SUPPORTED_IDES is now the only edit needed for parity.
  const { SUPPORTED_IDES } = require('./install.js');
  const editors = opts.editor
    ? (opts.editor === 'all' ? Array.from(SUPPORTED_IDES) : [opts.editor])
    : Array.from(SUPPORTED_IDES);

  console.log(`\n🕌 rcode — Uninstall\n`);
  console.log(`   Project: ${cwd}`);
  console.log(`   Scope:   ${editors.join(', ')}`);
  console.log();

  // Fast path: is rcode installed here at all? Check our own marker
  // (.rcode/config.yaml) + any editor install trace. If nothing, exit cleanly
  // with a clear message so users don't wonder "did it work?"
  // (Was checking config.json — a long-standing typo since the installer
  // writes config.yaml. The check still worked thanks to the editor-files
  // fallback, but a project with .rcode/ and no editor files would falsely
  // report "not installed".)
  const hasConfig = fs.existsSync(path.join(cwd, '.rcode/config.yaml'))
    || fs.existsSync(path.join(cwd, '.rcode/config.json'));
  const hasAnyEditorFiles =
    fs.existsSync(path.join(cwd, '.claude/skills')) ||
    fs.existsSync(path.join(cwd, '.cursor/rules')) ||
    fs.existsSync(path.join(cwd, '.windsurf/rules')) ||
    fs.existsSync(path.join(cwd, '.antigravity/agents'));
  if (!hasConfig && !hasAnyEditorFiles) {
    console.log(`\n❌ rcode is not installed in this directory.`);
    console.log(`   Nothing to uninstall.`);
    console.log();
    console.log(`   To install: rcode install`);
    console.log();
    return;
  }

  // Build the plan
  const plan = buildPlan(cwd, editors);

  const totalSkills = plan.claude.skills.length;
  const totalCommands = plan.claude.commands.length;
  const totalCursor = plan.cursor.length;
  const totalWindsurf = plan.windsurf.length;
  const totalAG = plan.antigravity.length;
  const totalAgents = plan.claude.agents.length;
  const totalItems = totalSkills + totalCommands + totalAgents + totalCursor + totalWindsurf + totalAG;

  // Edge case: install traces exist but no actual files match our patterns
  // (e.g. user manually deleted rcode files but left dirs). Exit clean.
  if (totalItems === 0 && !plan.agentsMd && !plan.stateDir) {
    console.log(`\n❌ No rcode files found to remove.`);
    console.log(`   The install markers are present but all files have already been deleted.`);
    console.log();
    return;
  }

  console.log(`What will be removed:\n`);
  if (editors.includes('claude')) {
    console.log(`   Claude Code`);
    console.log(`     .claude/skills/ (rcode-*):    ${totalSkills} skills`);
    console.log(`     .claude/commands/rcode/:      ${totalCommands} slash commands`);
    console.log(`     .claude/agents/rcode-*.md:    ${totalAgents} agents`);
  }
  if (editors.includes('cursor')) {
    console.log(`   Cursor`);
    console.log(`     .cursor/rules/rcode-*.mdc:    ${totalCursor} rules`);
  }
  if (editors.includes('windsurf')) {
    console.log(`   Windsurf`);
    console.log(`     .windsurf/rules/rcode-*.mdc:  ${totalWindsurf} rules`);
  }
  if (editors.includes('antigravity')) {
    console.log(`   Antigravity`);
    console.log(`     .antigravity/agents/rcode-*:  ${totalAG} agents`);
  }
  if (plan.agentsMd) {
    console.log(`   AGENTS.md`);
    console.log(`     rcode section will be stripped (file preserved)`);
  }
  if (plan.stateDir) {
    console.log();
    console.log(`⚠️  .rcode/ state directory detected`);
    console.log(`   Contains ${plan.stateDir.files} files (phases, decisions, progress, artifacts)`);
    console.log(`   This is YOUR PROJECT DATA — not the skill files.`);
    if (opts.deleteState) {
      console.log(`   → Will be DELETED (--delete-state flag)`);
    } else if (opts.keepState) {
      console.log(`   → Will be KEPT (--keep-state flag)`);
    } else {
      console.log(`   → Will ask separately after the main confirmation.`);
    }
  }
  console.log();

  // Main confirmation (skills + commands + rules + AGENTS.md section)
  if (!opts.yes) {
    const proceed = await askConfirm(
      `Proceed with removing ${totalItems} skill/command files${plan.agentsMd ? ' + AGENTS.md section' : ''}? [y/N] `,
      { default: 'n' },
    );
    if (!proceed) {
      console.log(`\n❌ Aborted. Nothing was removed.`);
      return;
    }
  }

  // Create a timestamped backup before doing anything destructive.
  // Non-fatal on failure — the user already confirmed, we just warn.
  // Issue #683: --purge backs up .rcode/ and .planning/ too so users can
  // recover state.json, decisions log, and planning artifacts.
  console.log();
  const backup = createBackup(cwd, plan, { purge: opts.purge === true });
  if (backup.ok) {
    console.log(`   💾 backup created: ${backup.path}`);
    if (opts.purge) {
      console.log('      includes .rcode/ and .planning/ (state, decisions, planning artifacts)');
    }
  } else {
    console.log(`   ⚠ no backup created (${backup.warning}) — continuing anyway`);
  }

  // Execute removal
  console.log();
  let removed = 0;

  if (editors.includes('claude')) {
    const skillsDir = path.join(cwd, '.claude/skills');
    const n = removeMatching(skillsDir, (name) => name.startsWith('rcode-') || isKnownSkillName(name));
    removed += n;
    if (n > 0) console.log(`   ✓ removed ${n} Claude skills`);

    // Remove vscode-style subdir .claude/commands/rcode/
    const commandsDir = path.join(cwd, '.claude/commands/rcode');
    if (fs.existsSync(commandsDir)) {
      const r = safeRmSync(commandsDir, path.resolve(cwd));
      if (!r.ok && r.reason === 'outside-root') {
        console.log(`   ⚠ refused to remove ${commandsDir} — symlink resolves outside project root`);
      }
    }
    // Remove claude-style root-level rcode-*.md files
    const commandsRoot = path.join(cwd, '.claude/commands');
    let commandsRemoved = 0;
    if (fs.existsSync(commandsRoot)) {
      for (const f of fs.readdirSync(commandsRoot)) {
        if (f.startsWith('rcode-') && (f.endsWith('.md') || f.endsWith('.mdc'))) {
          fs.unlinkSync(path.join(commandsRoot, f));
          commandsRemoved++;
        }
      }
    }
    const totalCommandsRemoved = plan.claude.commands.length;
    removed += totalCommandsRemoved;
    if (totalCommandsRemoved > 0) {
      console.log(`   ✓ removed ${totalCommandsRemoved} slash commands from .claude/commands/`);
    }

    // v2: .claude/agents/rcode-*.md
    const agentsDir = path.join(cwd, '.claude/agents');
    const nAgents = removeMatching(agentsDir, (name) =>
      name.startsWith('rcode-') && name.endsWith('.md'),
    );
    removed += nAgents;
    if (nAgents > 0) console.log(`   ✓ removed ${nAgents} Claude agents`);

    // .claude/agents/rules/ — installed by the agent-rules sub-tree (#876)
    if (plan.claude.agentsRulesDir) {
      const rulesDir = path.join(cwd, '.claude/agents/rules');
      const r = safeRmSync(rulesDir, path.resolve(cwd));
      if (r.ok && r.reason !== 'missing') {
        console.log(`   ✓ removed .claude/agents/rules/ (agent reference rules)`);
      } else if (r.reason === 'outside-root') {
        console.log(`   ⚠ refused to remove .claude/agents/rules/ — symlink resolves outside project root`);
      }
    }

    // Clean up now-empty .claude/commands and .claude/agents dirs
    try {
      if (fs.existsSync(path.join(cwd, '.claude/commands')) && fs.readdirSync(path.join(cwd, '.claude/commands')).length === 0) {
        fs.rmdirSync(path.join(cwd, '.claude/commands'));
      }
      if (fs.existsSync(agentsDir) && fs.readdirSync(agentsDir).length === 0) {
        fs.rmdirSync(agentsDir);
      }
    } catch { /* best effort */ }
  }

  if (editors.includes('cursor')) {
    const cursorDir = path.join(cwd, '.cursor/rules');
    const n = removeMatching(cursorDir, (name) =>
      name.startsWith('rcode-') || name === 'rcode.mdc' || name === 'rcode-method.mdc' || name === 'rcode',
    );
    removed += n;
    if (n > 0) console.log(`   ✓ removed ${n} Cursor rules`);
  }

  if (editors.includes('windsurf')) {
    const windsurfDir = path.join(cwd, '.windsurf/rules');
    const n = removeMatching(windsurfDir, (name) =>
      name.startsWith('rcode-') || name === 'rcode.mdc' || name === 'rcode-method.mdc',
    );
    removed += n;
    if (n > 0) console.log(`   ✓ removed ${n} Windsurf rules`);
  }

  if (editors.includes('antigravity')) {
    const agDir = path.join(cwd, '.antigravity/agents');
    const n = removeMatching(agDir, (name) => name.startsWith('rcode-'));
    removed += n;
    if (n > 0) console.log(`   ✓ removed ${n} Antigravity agents`);
  }

  // #706 — gemini removal (.gemini/rcode/{agents,commands})
  if (editors.includes('gemini')) {
    let n = 0;
    for (const sub of ['agents', 'commands']) {
      const dir = path.join(cwd, '.gemini', 'rcode', sub);
      n += removeMatching(dir, (name) => name.startsWith('rcode-') || name.endsWith('.md'));
    }
    removed += n;
    if (n > 0) console.log(`   ✓ removed ${n} Gemini files`);
  }

  // #706 — vscode marker dir cleanup. Commands+skills+agents share .claude/
  // and were already removed under the claude branch.
  if (editors.includes('vscode')) {
    const markerDir = path.join(cwd, '.vscode/rcode');
    if (fs.existsSync(markerDir)) {
      const r = safeRmSync(markerDir, path.resolve(cwd));
      if (r.ok) {
        removed += 1;
        console.log(`   ✓ removed .vscode/rcode/ marker`);
      }
    }
  }

  // Strip AGENTS.md section
  if (plan.agentsMd) {
    const agentsMdPath = path.join(cwd, 'AGENTS.md');
    const stripped = stripRcodeFromAgentsMd(agentsMdPath);
    if (stripped) {
      console.log(`   ✓ stripped rcode section from AGENTS.md`);
    }
  }

  // Strip the rcode block from .gitignore — always, not just on --purge (#876)
  const gitignorePath = path.join(cwd, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    try {
      const before = fs.readFileSync(gitignorePath, 'utf8');
      const after = stripRcodeGitignoreBlock(before);
      if (after !== before) {
        fs.writeFileSync(gitignorePath, after);
        console.log(`   ✓ stripped rcode block from .gitignore`);
      }
    } catch (err) {
      console.log(`   ⚠ could not strip .gitignore block: ${err.message}`);
    }
  }

  // Remove .git/hooks/pre-commit rcode block (or the whole file if rcode-only) (#876)
  const hookResult = cleanRcodePreCommitHook(cwd);
  if (hookResult === 'removed') {
    console.log(`   ✓ removed .git/hooks/pre-commit (was rcode-only)`);
  } else if (hookResult === 'stripped') {
    console.log(`   ✓ stripped rcode block from .git/hooks/pre-commit`);
  }

  // Cleanup empty editor directories left behind after removing rcode-*
  // entries. Only removes dirs that are COMPLETELY empty — never touches
  // user content. Order matters: innermost first so each parent gets a
  // chance to become empty after its child is removed.
  // Not touching .rcode/ — that's handled by the state preservation flow.
  cleanupEmptyDirs(cwd, [
    '.claude/skills',
    '.claude/commands',
    '.claude',
    '.cursor/rules',
    '.cursor',
    '.windsurf/rules',
    '.windsurf',
    '.antigravity/agents',
    '.antigravity',
  ]);

  // Always remove .rcode/brain/ — it's pulled rcode content (issue #202),
  // not user data. Refreshed by `brain pull` on next install.
  const brainDir = path.join(cwd, '.rcode', 'brain');
  if (fs.existsSync(brainDir)) {
    const r = safeRmSync(brainDir, path.resolve(cwd));
    if (r.ok) {
      console.log(`   ✓ removed .rcode/brain/ (pulled content, will refresh on reinstall)`);
    } else if (r.reason === 'outside-root') {
      console.log(`   ⚠ refused to remove .rcode/brain/ — symlink resolves outside project root`);
    }
  }

  // Handle .rcode/ state directory
  if (plan.stateDir) {
    const rcodeDir = path.join(cwd, '.rcode');
    let shouldDeleteState = opts.deleteState;

    if (!opts.deleteState && !opts.keepState && !opts.yes) {
      console.log();
      console.log(`⚠️  The .rcode/ state directory contains your project data:`);
      console.log(`   - config.yaml, state.json, JOURNEY.md`);
      console.log(`   - phases, decisions, progress, artifacts, context`);
      console.log(`   - ${plan.stateDir.files} files total`);
      console.log();
      console.log(`   If you keep it: /rcode-init will report "already configured"`);
      console.log(`     and reuse your existing config + history on next install.`);
      console.log(`   If you delete it: next install starts fresh — no carry-over.`);
      console.log();
      shouldDeleteState = await askConfirm(
        `Also delete .rcode/ state? This is destructive and cannot be undone. [y/N] `,
        { default: 'n' },
      );
    }

    if (shouldDeleteState) {
      const r = safeRmSync(rcodeDir, path.resolve(cwd));
      if (r.ok) {
        console.log(`   ✓ removed .rcode/ state directory`);
      } else if (r.reason === 'outside-root') {
        console.log(`   ⚠ refused to remove .rcode/ — symlink resolves outside project root`);
      } else {
        console.log(`   ⚠ could not remove .rcode/: ${r.reason}`);
      }
    } else {
      console.log(`   ℹ kept .rcode/ state directory (your project data is preserved)`);
    }
  }

  // --purge: also wipe .planning/ artifacts (user project data beyond .rcode/).
  // Without this, "uninstall + reinstall" carries forward stale phases /
  // sprints / SUMMARY files even after .rcode/ is gone.
  if (opts.purge) {
    const planningDir = path.join(cwd, '.planning');
    if (fs.existsSync(planningDir)) {
      const r = safeRmSync(planningDir, path.resolve(cwd));
      if (r.ok) {
        console.log(`   ✓ removed .planning/ (--purge)`);
      } else if (r.reason === 'outside-root') {
        console.log(`   ⚠ refused to remove .planning/ — symlink resolves outside project root`);
      } else {
        console.log(`   ⚠ could not remove .planning/: ${r.reason}`);
      }
    }
  }

  console.log(`\n✅ Uninstall complete. Removed ${removed} files.`);
  if (backup.ok) {
    console.log(`   Backup: ${backup.path} (restore with: tar -xzf ${backup.path})`);
  }

  // Notice about what was intentionally preserved (#876 — never delete user data silently)
  const rcodeStillExists = plan.stateDir && fs.existsSync(path.join(cwd, '.rcode'));
  const planningStillExists = !opts.purge && fs.existsSync(path.join(cwd, '.planning'));
  if (rcodeStillExists || planningStillExists) {
    console.log();
    console.log(`ℹ  Preserved (your project data — not removed by default):`);
    if (rcodeStillExists) {
      console.log(`      .rcode/     phases, decisions, progress, config`);
      console.log(`                  /rcode-init will detect this on reinstall`);
    }
    if (planningStillExists) {
      console.log(`      .planning/  planning scaffolds (ROADMAP, STATE, PROJECT)`);
    }
    console.log(`   To remove these on next uninstall: rcode uninstall --purge`);
  }

  // IDE cache reload hint — Claude Code caches the slash-command list in memory.
  // Without a window reload the removed commands remain visible.
  console.log();
  console.log(`💡 IDE reload required:`);
  console.log(`   VS Code / Cursor: Cmd+Shift+P → "Developer: Reload Window"`);
  console.log(`   If commands still appear after reload, check ~/.claude/commands/ for`);
  console.log(`   any globally-installed rcode-* items (rcode does not touch global installs).`);

  // Hint about reinstalling
  console.log(`\nTo reinstall later:`);
  console.log(`   rcode install`);
}

// Re-exports for unit tests (W3.2 — issue #694 follow-up). The default
// export remains the async runner; these are attached afterwards so pure
// functions can be exercised without spawning a child process.
module.exports.isLocalOverride = isLocalOverride;
module.exports.planToPathList = planToPathList;
module.exports.discoverKnownActionSkills = discoverKnownActionSkills;
module.exports.stripRcodeGitignoreBlock = stripRcodeGitignoreBlock;

// Direct invocation — allow `node cli/uninstall.js [flags]` to run end-to-end.
// When called via cli/index.js, module.exports is invoked directly.
if (require.main === module) {
  module.exports(process.argv.slice(2))
    .catch((err) => {
      if (err instanceof PromptAbortError) {
        console.log('\n❌ Aborted.');
        process.exit(1);
      }
      console.error(`\n❌ Uninstall failed: ${err.message}`);
      if (process.env.DEBUG) console.error(err.stack);
      process.exit(1);
    });
}
