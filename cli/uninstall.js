/**
 * rihal-code uninstall — remove Rihal Code from the current project.
 *
 * Cleanly removes:
 *   - .claude/skills/rihal-*             (phrase-activated skills)
 *   - .claude/commands/rihal/             (slash commands)
 *   - .claude/agents/rihal-*.md           (v2 subagents: sadiq, waleed, yousef, zayd, etc.)
 *   - .cursor/rules/rihal-*.mdc           (cursor rules)
 *   - .windsurf/rules/rihal-*.mdc         (windsurf rules)
 *   - .antigravity/agents/rihal-*         (antigravity agents)
 *   - Rihal Code section in AGENTS.md     (appended section only — file preserved)
 *   - .rihal/                             (ONLY if user explicitly confirms — contains project state)
 *
 * Default: interactive preview → confirmation → delete.
 *
 * Flags:
 *   --editor=claude|cursor|windsurf|antigravity|all   Limit scope
 *   --keep-state                                      Never touch .rihal/
 *   --delete-state                                    Also delete .rihal/ (skip prompt)
 *   --yes / -y                                        Skip the main confirmation
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { askConfirm, PromptAbortError } = require('./lib/prompts.cjs');
const { writeFileAtomic } = require('./lib/fsutil.cjs');

function parseArgs(args) {
  const opts = {
    editor: null,           // null = all
    keepState: false,       // if true, never delete .rihal/
    deleteState: false,     // if true, delete .rihal/ without prompting
    yes: false,             // skip the main confirmation
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
    }
  }
  return opts;
}

/**
 * Walk a directory and remove all files/subdirs whose name matches a predicate.
 * Returns the number of entries removed.
 */
function removeMatching(dir, predicate) {
  if (!fs.existsSync(dir)) return 0;
  let count = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!predicate(entry.name)) continue;
    const full = path.join(dir, entry.name);
    fs.rmSync(full, { recursive: true, force: true });
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
 * Never touches `.rihal/` — that's managed separately by the state
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
    claude: { skills: [], commands: [], agents: [] },
    cursor: [],
    windsurf: [],
    antigravity: [],
    agentsMd: null, // null = no section; 'present' = section present
    stateDir: null, // null = missing; { files: N } = present
    planningDir: null, // null = missing; { files: N } = present
  };

  if (editors.includes('claude')) {
    const skillsDir = path.join(cwd, '.claude/skills');
    if (fs.existsSync(skillsDir)) {
      plan.claude.skills = fs
        .readdirSync(skillsDir)
        .filter((name) => name.startsWith('rihal-') || isKnownSkillName(name));
    }
    const commandsDir = path.join(cwd, '.claude/commands/rihal');
    if (fs.existsSync(commandsDir)) {
      plan.claude.commands = fs.readdirSync(commandsDir);
    }
    // v2 installs agents to .claude/agents/rihal-*.md — scan for them
    const agentsDir = path.join(cwd, '.claude/agents');
    if (fs.existsSync(agentsDir)) {
      plan.claude.agents = fs
        .readdirSync(agentsDir)
        .filter((name) => name.startsWith('rihal-') && name.endsWith('.md'));
    }
  }

  if (editors.includes('cursor')) {
    const cursorDir = path.join(cwd, '.cursor/rules');
    if (fs.existsSync(cursorDir)) {
      plan.cursor = fs
        .readdirSync(cursorDir)
        .filter((name) => name.startsWith('rihal-') || name === 'rihal-code.mdc' || name === 'rihal-method.mdc');
    }
  }

  if (editors.includes('windsurf')) {
    const windsurfDir = path.join(cwd, '.windsurf/rules');
    if (fs.existsSync(windsurfDir)) {
      plan.windsurf = fs
        .readdirSync(windsurfDir)
        .filter((name) => name.startsWith('rihal-') || name === 'rihal-code.mdc' || name === 'rihal-method.mdc');
    }
  }

  if (editors.includes('antigravity')) {
    const agDir = path.join(cwd, '.antigravity/agents');
    if (fs.existsSync(agDir)) {
      plan.antigravity = fs
        .readdirSync(agDir)
        .filter((name) => name.startsWith('rihal-'));
    }
  }

  // Check AGENTS.md for Rihal section
  const agentsMdPath = path.join(cwd, 'AGENTS.md');
  if (fs.existsSync(agentsMdPath)) {
    const content = fs.readFileSync(agentsMdPath, 'utf8');
    if (content.includes('## Rihal Code Agents (installed)') || content.includes('## Rihal Method Agents (installed)')) {
      plan.agentsMd = 'present';
    }
  }

  // Check .rihal/ state directory
  const rihalDir = path.join(cwd, '.rihal');
  if (fs.existsSync(rihalDir)) {
    let fileCount = 0;
    function countFiles(dir) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) countFiles(path.join(dir, entry.name));
        else fileCount++;
      }
    }
    try { countFiles(rihalDir); } catch {}
    plan.stateDir = { files: fileCount };
  }

  return plan;
}

/**
 * List of action-skill names the installer places in .claude/skills/.
 * These do NOT start with `rihal-` (e.g., `rihal-domain-research` does, but
 * for safety we also keep a known list).
 */
const KNOWN_ACTION_SKILLS = [
  'rihal-check-implementation-readiness',
  'rihal-code-review',
  'rihal-correct-course',
  'rihal-create-architecture',
  'rihal-create-epics-and-stories',
  'rihal-create-prd',
  'rihal-create-story',
  'rihal-create-ux-design',
  'rihal-dev-story',
  'rihal-document-project',
  'rihal-domain-research',
  'rihal-edit-prd',
  'rihal-frontend-design',
  'rihal-generate-project-context',
  'rihal-market-research',
  'rihal-product-brief',
  'rihal-qa-generate-e2e-tests',
  'rihal-retrospective',
  'rihal-sprint-planning',
  'rihal-sprint-status',
  'rihal-technical-research',
  'rihal-validate-prd',
  'rihal-clone-website',
];

function isKnownSkillName(name) {
  return KNOWN_ACTION_SKILLS.includes(name);
}

/**
 * Build the list of files/dirs (relative to cwd) that the uninstall plan
 * will delete or mutate. Used to feed `tar --files-from=-`.
 */
function planToPathList(plan, cwd) {
  const paths = [];

  for (const name of plan.claude.skills) {
    paths.push(path.join('.claude/skills', name));
  }
  if (plan.claude.commands.length > 0) {
    paths.push('.claude/commands/rihal');
  }
  for (const name of plan.claude.agents) {
    paths.push(path.join('.claude/agents', name));
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
  // AGENTS.md is mutated (stripped), not deleted — but we back it up so the
  // user can restore the stripped content.
  if (plan.agentsMd && fs.existsSync(path.join(cwd, 'AGENTS.md'))) {
    paths.push('AGENTS.md');
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
function createBackup(cwd, plan) {
  const paths = planToPathList(plan, cwd);
  if (paths.length === 0) {
    return { ok: false, warning: 'nothing to back up' };
  }

  // tar must exist. On Linux/macOS it's always available; Windows without
  // WSL may not have it — warn and skip there.
  const tarCheck = spawnSync('tar', ['--version'], { stdio: 'ignore' });
  if (tarCheck.status !== 0) {
    return { ok: false, warning: 'tar not available on this system' };
  }

  const backupsDir = path.join(cwd, '.rihal/backups');
  try {
    fs.mkdirSync(backupsDir, { recursive: true });
  } catch (err) {
    return { ok: false, warning: `could not create .rihal/backups/: ${err.message}` };
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
 * Remove the Rihal Code section from AGENTS.md without deleting the whole file.
 * The section starts with `## Rihal Code Agents (installed)` or the older
 * `## Rihal Method Agents (installed)` header and ends at either EOF or the
 * next `## ` top-level heading.
 */
function stripRihalFromAgentsMd(agentsMdPath) {
  if (!fs.existsSync(agentsMdPath)) return false;
  let content = fs.readFileSync(agentsMdPath, 'utf8');
  let changed = false;

  // Match the Rihal section and everything until the next `## ` or EOF
  const patterns = [
    /\n*---\n+## Rihal Code Agents \(installed\)[\s\S]*?(?=\n## |\n*$)/,
    /\n*---\n+## Rihal Method Agents \(installed\)[\s\S]*?(?=\n## |\n*$)/,
    /\n*## Rihal Code Agents \(installed\)[\s\S]*?(?=\n## |\n*$)/,
    /\n*## Rihal Method Agents \(installed\)[\s\S]*?(?=\n## |\n*$)/,
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

  const editors = opts.editor
    ? (opts.editor === 'all' ? ['claude', 'cursor', 'windsurf', 'antigravity'] : [opts.editor])
    : ['claude', 'cursor', 'windsurf', 'antigravity'];

  console.log(`\n🕌 Rihal Code — Uninstall\n`);
  console.log(`   Project: ${cwd}`);
  console.log(`   Scope:   ${editors.join(', ')}`);
  console.log();

  // Fast path: is Rihal Code installed here at all? Check our own marker
  // (.rihal/config.json) + any editor install trace. If nothing, exit cleanly
  // with a clear message so users don't wonder "did it work?"
  const hasConfig = fs.existsSync(path.join(cwd, '.rihal/config.json'));
  const hasAnyEditorFiles =
    fs.existsSync(path.join(cwd, '.claude/skills')) ||
    fs.existsSync(path.join(cwd, '.cursor/rules')) ||
    fs.existsSync(path.join(cwd, '.windsurf/rules')) ||
    fs.existsSync(path.join(cwd, '.antigravity/agents'));
  if (!hasConfig && !hasAnyEditorFiles) {
    console.log(`\n❌ Rihal Code is not installed in this directory.`);
    console.log(`   Nothing to uninstall.`);
    console.log();
    console.log(`   To install: npx --yes github:hanzlahabib/rihal-code install`);
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
  // (e.g. user manually deleted Rihal files but left dirs). Exit clean.
  if (totalItems === 0 && !plan.agentsMd && !plan.stateDir) {
    console.log(`\n❌ No Rihal Code files found to remove.`);
    console.log(`   The install markers are present but all files have already been deleted.`);
    console.log();
    return;
  }

  console.log(`What will be removed:\n`);
  if (editors.includes('claude')) {
    console.log(`   Claude Code`);
    console.log(`     .claude/skills/ (rihal-*):    ${totalSkills} skills`);
    console.log(`     .claude/commands/rihal/:      ${totalCommands} slash commands`);
    console.log(`     .claude/agents/rihal-*.md:    ${totalAgents} agents`);
  }
  if (editors.includes('cursor')) {
    console.log(`   Cursor`);
    console.log(`     .cursor/rules/rihal-*.mdc:    ${totalCursor} rules`);
  }
  if (editors.includes('windsurf')) {
    console.log(`   Windsurf`);
    console.log(`     .windsurf/rules/rihal-*.mdc:  ${totalWindsurf} rules`);
  }
  if (editors.includes('antigravity')) {
    console.log(`   Antigravity`);
    console.log(`     .antigravity/agents/rihal-*:  ${totalAG} agents`);
  }
  if (plan.agentsMd) {
    console.log(`   AGENTS.md`);
    console.log(`     Rihal Code section will be stripped (file preserved)`);
  }
  if (plan.stateDir) {
    console.log();
    console.log(`⚠️  .rihal/ state directory detected`);
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
  console.log();
  const backup = createBackup(cwd, plan);
  if (backup.ok) {
    console.log(`   💾 backup created: ${backup.path}`);
  } else {
    console.log(`   ⚠ no backup created (${backup.warning}) — continuing anyway`);
  }

  // Execute removal
  console.log();
  let removed = 0;

  if (editors.includes('claude')) {
    const skillsDir = path.join(cwd, '.claude/skills');
    const n = removeMatching(skillsDir, (name) => name.startsWith('rihal-') || isKnownSkillName(name));
    removed += n;
    if (n > 0) console.log(`   ✓ removed ${n} Claude skills`);

    const commandsDir = path.join(cwd, '.claude/commands/rihal');
    if (fs.existsSync(commandsDir)) {
      fs.rmSync(commandsDir, { recursive: true, force: true });
      removed += plan.claude.commands.length;
      console.log(`   ✓ removed .claude/commands/rihal/ (${plan.claude.commands.length} slash commands)`);
    }

    // v2: .claude/agents/rihal-*.md
    const agentsDir = path.join(cwd, '.claude/agents');
    const nAgents = removeMatching(agentsDir, (name) =>
      name.startsWith('rihal-') && name.endsWith('.md'),
    );
    removed += nAgents;
    if (nAgents > 0) console.log(`   ✓ removed ${nAgents} Claude agents`);

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
      name.startsWith('rihal-') || name === 'rihal-code.mdc' || name === 'rihal-method.mdc',
    );
    removed += n;
    if (n > 0) console.log(`   ✓ removed ${n} Cursor rules`);
  }

  if (editors.includes('windsurf')) {
    const windsurfDir = path.join(cwd, '.windsurf/rules');
    const n = removeMatching(windsurfDir, (name) =>
      name.startsWith('rihal-') || name === 'rihal-code.mdc' || name === 'rihal-method.mdc',
    );
    removed += n;
    if (n > 0) console.log(`   ✓ removed ${n} Windsurf rules`);
  }

  if (editors.includes('antigravity')) {
    const agDir = path.join(cwd, '.antigravity/agents');
    const n = removeMatching(agDir, (name) => name.startsWith('rihal-'));
    removed += n;
    if (n > 0) console.log(`   ✓ removed ${n} Antigravity agents`);
  }

  // Strip AGENTS.md section
  if (plan.agentsMd) {
    const agentsMdPath = path.join(cwd, 'AGENTS.md');
    const stripped = stripRihalFromAgentsMd(agentsMdPath);
    if (stripped) {
      console.log(`   ✓ stripped Rihal Code section from AGENTS.md`);
    }
  }

  // Cleanup empty editor directories left behind after removing rihal-*
  // entries. Only removes dirs that are COMPLETELY empty — never touches
  // user content. Order matters: innermost first so each parent gets a
  // chance to become empty after its child is removed.
  // Not touching .rihal/ — that's handled by the state preservation flow.
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

  // Always remove .rihal/brain/ — it's pulled rcode content (issue #202),
  // not user data. Refreshed by `brain pull` on next install.
  const brainDir = path.join(cwd, '.rihal', 'brain');
  if (fs.existsSync(brainDir)) {
    fs.rmSync(brainDir, { recursive: true, force: true });
    console.log(`   ✓ removed .rihal/brain/ (pulled content, will refresh on reinstall)`);
  }

  // Handle .rihal/ state directory
  if (plan.stateDir) {
    const rihalDir = path.join(cwd, '.rihal');
    let shouldDeleteState = opts.deleteState;

    if (!opts.deleteState && !opts.keepState && !opts.yes) {
      console.log();
      console.log(`⚠️  The .rihal/ state directory contains your project data:`);
      console.log(`   - phases, decisions, progress, artifacts, context`);
      console.log(`   - ${plan.stateDir.files} files total`);
      console.log();
      shouldDeleteState = await askConfirm(
        `Also delete .rihal/ state? This is destructive and cannot be undone. [y/N] `,
        { default: 'n' },
      );
    }

    if (shouldDeleteState) {
      fs.rmSync(rihalDir, { recursive: true, force: true });
      console.log(`   ✓ removed .rihal/ state directory`);
    } else {
      console.log(`   ℹ kept .rihal/ state directory (your project data is preserved)`);
    }
  }

  console.log(`\n✅ Uninstall complete. Removed ${removed} files.`);
  if (backup.ok) {
    console.log(`   Backup: ${backup.path} (restore with: tar -xzf ${backup.path})`);
  }

  // Hint about reinstalling
  console.log(`\nTo reinstall later:`);
  console.log(`   npx --yes github:hanzlahabib/rihal-code install`);
}

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
