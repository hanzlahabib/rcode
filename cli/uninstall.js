/**
 * rihal-code uninstall — remove Rihal Code from the current project.
 *
 * Cleanly removes:
 *   - .claude/skills/rihal-*            (agent + action skills)
 *   - .claude/commands/rihal/            (slash commands)
 *   - .cursor/rules/rihal-*.mdc          (cursor rules)
 *   - .windsurf/rules/rihal-*.mdc        (windsurf rules)
 *   - .antigravity/agents/rihal-*        (antigravity agents)
 *   - Rihal Code section in AGENTS.md    (appended section only — file preserved)
 *   - .rihal/                            (ONLY if user explicitly confirms — contains project state)
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
const readline = require('readline');

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

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
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
 * Build the plan of what would be removed, without actually removing anything.
 * Returns an object with per-editor counts and a list of absolute paths.
 */
function buildPlan(cwd, editors) {
  const plan = {
    claude: { skills: [], commands: [] },
    cursor: [],
    windsurf: [],
    antigravity: [],
    agentsMd: null, // null = no section; 'present' = section present
    stateDir: null, // null = missing; { files: N } = present
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
    fs.writeFileSync(agentsMdPath, content);
  }
  return changed;
}

module.exports = async function uninstall(args) {
  const opts = parseArgs(args);
  const cwd = process.cwd();

  const editors = opts.editor
    ? (opts.editor === 'all' ? ['claude', 'cursor', 'windsurf', 'antigravity'] : [opts.editor])
    : ['claude', 'cursor', 'windsurf', 'antigravity'];

  console.log(`\n🕌 Rihal Code — Uninstall\n`);
  console.log(`   Project: ${cwd}`);
  console.log(`   Scope:   ${editors.join(', ')}`);
  console.log();

  // Build the plan
  const plan = buildPlan(cwd, editors);

  const totalSkills = plan.claude.skills.length;
  const totalCommands = plan.claude.commands.length;
  const totalCursor = plan.cursor.length;
  const totalWindsurf = plan.windsurf.length;
  const totalAG = plan.antigravity.length;
  const totalItems = totalSkills + totalCommands + totalCursor + totalWindsurf + totalAG;

  if (totalItems === 0 && !plan.agentsMd && !plan.stateDir) {
    console.log(`   ℹ Nothing to uninstall — no Rihal Code files found in this project.`);
    return;
  }

  console.log(`What will be removed:\n`);
  if (editors.includes('claude')) {
    console.log(`   Claude Code`);
    console.log(`     .claude/skills/ (rihal-*):    ${totalSkills} skills`);
    console.log(`     .claude/commands/rihal/:      ${totalCommands} slash commands`);
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
    const answer = await prompt(`Proceed with removing ${totalItems} skill/command files${plan.agentsMd ? ' + AGENTS.md section' : ''}? [y/N] `);
    if (answer !== 'y' && answer !== 'yes') {
      console.log(`\n❌ Aborted. Nothing was removed.`);
      return;
    }
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

    // If .claude/commands/ is now empty, clean it up too
    const commandsRoot = path.join(cwd, '.claude/commands');
    if (fs.existsSync(commandsRoot) && fs.readdirSync(commandsRoot).length === 0) {
      fs.rmSync(commandsRoot, { recursive: true, force: true });
    }
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
      const answer = await prompt(`Also delete .rihal/ state? This is destructive and cannot be undone. [y/N] `);
      shouldDeleteState = (answer === 'y' || answer === 'yes');
    }

    if (shouldDeleteState) {
      fs.rmSync(rihalDir, { recursive: true, force: true });
      console.log(`   ✓ removed .rihal/ state directory`);
    } else {
      console.log(`   ℹ kept .rihal/ state directory (your project data is preserved)`);
    }
  }

  console.log(`\n✅ Uninstall complete. Removed ${removed} files.`);

  // Hint about reinstalling
  console.log(`\nTo reinstall later:`);
  console.log(`   npx --yes github:hanzlahabib/rihal-code install`);
};
