/**
 * rihal-code update — refresh an existing install without losing state.
 *
 * What it does:
 *   1. Verifies Rihal Code is actually installed (.rihal/config.json present)
 *   2. Reads the stored installed_version vs current package version
 *   3. If same → confirms user wants to refresh anyway (files might have
 *      drifted from the package), or exit with --yes
 *   4. Backs up current editor-dir skill files to .rihal/backups/update-{ts}.tgz
 *   5. Delegates file refresh to cli/install.js (single source of truth)
 *   6. Updates installed_version in .rihal/config.json atomically
 *   7. Runs manifest verification to catch drift
 *
 * What it preserves (never touched):
 *   - .rihal/config.json (only installed_version field is updated)
 *   - .rihal/state.json, phases/, plans/, decisions/, artifacts/, progress/, context/
 *   - Project data — user's phase briefs, stories, bugs, research
 *
 * What it refreshes:
 *   - .claude/skills/rihal-* (agent + action skills)
 *   - .claude/commands/rihal/ (slash commands)
 *   - .cursor/rules/rihal-*.mdc
 *   - .windsurf/rules/rihal-*.mdc
 *   - .antigravity/agents/rihal-*
 *   - Rihal section in AGENTS.md (re-appended fresh)
 *
 * Flags:
 *   --yes / -y   skip confirmation prompts
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const clack = require('@clack/prompts');
const { PromptAbortError } = require('./lib/prompts.cjs');
const { writeJsonAtomic } = require('./lib/fsutil.cjs');
const { verifyInstall, formatReport } = require('./lib/manifest.cjs');
const install = require('./install');

function parseArgs(args) {
  const opts = { yes: false };
  for (const arg of args) {
    if (arg === '--yes' || arg === '-y') opts.yes = true;
  }
  return opts;
}

/**
 * Detect which editors have Rihal files installed. Anything we detect
 * will be refreshed on update.
 */
function detectInstalledEditors(cwd) {
  const editors = [];
  if (fs.existsSync(path.join(cwd, '.claude/skills'))) {
    const hasRihal = fs
      .readdirSync(path.join(cwd, '.claude/skills'))
      .some((n) => n.startsWith('rihal-'));
    if (hasRihal) editors.push('claude');
  }
  if (fs.existsSync(path.join(cwd, '.cursor/rules'))) {
    const hasRihal = fs
      .readdirSync(path.join(cwd, '.cursor/rules'))
      .some((n) => n.startsWith('rihal-') && n.endsWith('.mdc'));
    if (hasRihal) editors.push('cursor');
  }
  if (fs.existsSync(path.join(cwd, '.windsurf/rules'))) {
    const hasRihal = fs
      .readdirSync(path.join(cwd, '.windsurf/rules'))
      .some((n) => n.startsWith('rihal-') && n.endsWith('.mdc'));
    if (hasRihal) editors.push('windsurf');
  }
  if (fs.existsSync(path.join(cwd, '.antigravity/agents'))) {
    const hasRihal = fs
      .readdirSync(path.join(cwd, '.antigravity/agents'))
      .some((n) => n.startsWith('rihal-'));
    if (hasRihal) editors.push('antigravity');
  }
  return editors;
}

/**
 * Before touching anything, tar the existing install files so the user
 * can roll back if the new version misbehaves.
 */
function createBackup(cwd, editors) {
  const paths = [];
  if (editors.includes('claude')) {
    paths.push('.claude/skills', '.claude/commands/rihal');
  }
  if (editors.includes('cursor')) paths.push('.cursor/rules');
  if (editors.includes('windsurf')) paths.push('.windsurf/rules');
  if (editors.includes('antigravity')) paths.push('.antigravity/agents');
  if (fs.existsSync(path.join(cwd, 'AGENTS.md'))) paths.push('AGENTS.md');

  // Filter to existing paths only
  const existing = paths.filter((p) => fs.existsSync(path.join(cwd, p)));
  if (existing.length === 0) return { ok: false, warning: 'nothing to back up' };

  const tarCheck = spawnSync('tar', ['--version'], { stdio: 'ignore' });
  if (tarCheck.status !== 0) {
    return { ok: false, warning: 'tar not available' };
  }

  const backupsDir = path.join(cwd, '.rihal/backups');
  try {
    fs.mkdirSync(backupsDir, { recursive: true });
  } catch (err) {
    return { ok: false, warning: `could not create backups dir: ${err.message}` };
  }

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupFile = path.join(backupsDir, `update-${ts}.tgz`);
  const backupRel = path.relative(cwd, backupFile);

  const result = spawnSync(
    'tar',
    ['-czf', backupFile, '-C', cwd, '--files-from=-'],
    { input: existing.join('\n') + '\n', encoding: 'utf8' },
  );

  if (result.status !== 0) {
    return { ok: false, warning: `tar failed: ${(result.stderr || '').trim()}` };
  }
  return { ok: true, path: backupRel };
}

/**
 * Remove existing rihal-* files from the install target before re-copying.
 * Skill files have version-specific content, so overwriting on top of old
 * files can leave stale bits. Clean before overlay.
 */
function removeOldSkillFiles(cwd, editors) {
  const removed = { claude: 0, cursor: 0, windsurf: 0, antigravity: 0 };

  if (editors.includes('claude')) {
    const skillsDir = path.join(cwd, '.claude/skills');
    if (fs.existsSync(skillsDir)) {
      for (const name of fs.readdirSync(skillsDir)) {
        if (name.startsWith('rihal-')) {
          fs.rmSync(path.join(skillsDir, name), { recursive: true, force: true });
          removed.claude++;
        }
      }
    }
    const commandsDir = path.join(cwd, '.claude/commands/rihal');
    if (fs.existsSync(commandsDir)) {
      fs.rmSync(commandsDir, { recursive: true, force: true });
    }
  }

  if (editors.includes('cursor')) {
    const rulesDir = path.join(cwd, '.cursor/rules');
    if (fs.existsSync(rulesDir)) {
      for (const name of fs.readdirSync(rulesDir)) {
        if (name.startsWith('rihal-') && name.endsWith('.mdc')) {
          fs.rmSync(path.join(rulesDir, name));
          removed.cursor++;
        }
      }
    }
  }

  if (editors.includes('windsurf')) {
    const rulesDir = path.join(cwd, '.windsurf/rules');
    if (fs.existsSync(rulesDir)) {
      for (const name of fs.readdirSync(rulesDir)) {
        if (name.startsWith('rihal-') && name.endsWith('.mdc')) {
          fs.rmSync(path.join(rulesDir, name));
          removed.windsurf++;
        }
      }
    }
  }

  if (editors.includes('antigravity')) {
    const agDir = path.join(cwd, '.antigravity/agents');
    if (fs.existsSync(agDir)) {
      for (const name of fs.readdirSync(agDir)) {
        if (name.startsWith('rihal-')) {
          fs.rmSync(path.join(agDir, name));
          removed.antigravity++;
        }
      }
    }
  }

  return removed;
}

/**
 * Strip the Rihal section from AGENTS.md so the install function can
 * re-append a fresh one. Uses the same regex patterns as uninstall.js.
 */
function stripAgentsMdSection(cwd) {
  const agentsMdPath = path.join(cwd, 'AGENTS.md');
  if (!fs.existsSync(agentsMdPath)) return;
  let content = fs.readFileSync(agentsMdPath, 'utf8');
  const patterns = [
    /\n*---\n+## Rihal Code Agents \(installed\)[\s\S]*?(?=\n## |\n*$)/,
    /\n*## Rihal Code Agents \(installed\)[\s\S]*?(?=\n## |\n*$)/,
  ];
  let changed = false;
  for (const pattern of patterns) {
    if (pattern.test(content)) {
      content = content.replace(pattern, '');
      changed = true;
    }
  }
  if (changed) {
    content = content.replace(/\n---\n+$/, '\n');
    const { writeFileAtomic } = require('./lib/fsutil.cjs');
    writeFileAtomic(agentsMdPath, content);
  }
}

module.exports = async function update(args, { packageRoot, packageJson }) {
  try {
    return await runUpdate(args, { packageRoot, packageJson });
  } catch (err) {
    if (err instanceof PromptAbortError) {
      console.log(`\n❌ Update cancelled — ${err.message}.`);
      process.exit(0);
    }
    throw err;
  }
};

async function runUpdate(args, { packageRoot, packageJson }) {
  const cwd = process.cwd();
  const opts = parseArgs(args);
  const packageVersion = packageJson?.version || '0.0.0';

  // ------ Sanity: must be installed ------
  const configPath = path.join(cwd, '.rihal/config.json');
  if (!fs.existsSync(configPath)) {
    console.error(`\n❌ Rihal Code is not installed in this directory.`);
    console.error(`   To install: rcode install\n`);
    process.exit(1);
  }

  let config;
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (err) {
    console.error(`\n❌ .rihal/config.json is not valid JSON: ${err.message}\n`);
    process.exit(1);
  }

  const installedVersion = config.installed_version || '(unknown, pre-tracking)';

  // ------ Detect what's currently installed ------
  const editors = detectInstalledEditors(cwd);
  if (editors.length === 0) {
    console.error(`\n❌ No editor install detected.`);
    console.error(`   Run 'rcode install' to set up at least one editor first.\n`);
    process.exit(1);
  }

  console.log(`\n🕌 Rihal Code — Update\n`);
  console.log(`   Installed: ${installedVersion}`);
  console.log(`   Package:   ${packageVersion}`);
  console.log(`   Editors:   ${editors.join(', ')}`);
  console.log();

  if (installedVersion === packageVersion) {
    console.log(`   ℹ Already at the current package version.`);
    console.log(`     Refreshing files will overwrite any manual changes to`);
    console.log(`     installed skill/command files with the package copies.`);
    console.log();
  }

  // ------ Ask about adding new editors ------
  if (!opts.yes) {
    const ALL_EDITORS = ['claude', 'cursor', 'gemini'];
    const missing = ALL_EDITORS.filter(e => !editors.includes(e));
    if (missing.length > 0) {
      const editorLabels = { claude: 'Claude Code', cursor: 'Cursor', gemini: 'Gemini CLI' };
      const selected = await clack.multiselect({
        message: 'Add support for additional editors?',
        options: missing.map(e => ({ value: e, label: editorLabels[e] || e })),
        required: false,
      });
      if (clack.isCancel(selected)) {
        clack.cancel('Update cancelled.');
        process.exit(0);
      }
      for (const e of selected) editors.push(e);
      console.log(`   Editors to update: ${editors.join(', ')}`);
      console.log();
    }
  }

  // ------ Confirm ------
  if (!opts.yes) {
    const proceed = await clack.confirm({
      message: 'Proceed with update?',
      initialValue: false,
    });
    if (clack.isCancel(proceed) || !proceed) {
      console.log(`\n❌ Update cancelled. Nothing changed.`);
      return;
    }
  }

  // ------ Backup ------
  console.log();
  const backup = createBackup(cwd, editors);
  if (backup.ok) {
    console.log(`   💾 backup: ${backup.path}`);
  } else {
    console.log(`   ⚠ no backup created (${backup.warning}) — continuing anyway`);
  }

  // ------ Remove old skill files ------
  const removed = removeOldSkillFiles(cwd, editors);
  const totalRemoved = removed.claude + removed.cursor + removed.windsurf + removed.antigravity;
  console.log(`   🧹 cleaned ${totalRemoved} old skill files`);

  // ------ Strip old AGENTS.md section so it can be re-appended fresh ------
  stripAgentsMdSection(cwd);

  // ------ Re-run unified installer ------
  // Delegates to cli/install.js which handles all IDE-specific file shipping
  // (agents, commands, skills, workflows, references, bin). install.js is
  // the single source of truth — update.js reuses it with --force.
  console.log();
  for (const ide of editors) {
    if (!['claude', 'cursor', 'gemini'].includes(ide)) continue;
    install.install({
      target: cwd,
      force: true,
      yes: true,
      userName: config.user_name || require('os').userInfo().username,
      projectName: config.project_name || require('path').basename(cwd),
      language: config.language || 'English',
      mode: config.mode || 'guided',
      ide,
      modules: [],
      help: false,
    });
    console.log(`   ✓ ${ide} → refreshed via install.js`);
  }

  // ------ Update installed_version in config.json (atomic) ------
  config.installed_version = packageVersion;
  writeJsonAtomic(configPath, config);
  console.log(`   ✓ .rihal/config.json → installed_version: ${packageVersion}`);

  // ------ Verify manifest ------
  console.log();
  const { reports, hasDrift } = verifyInstall(cwd, packageRoot, editors);
  if (hasDrift) {
    console.log(`⚠ Post-update verification found drift:`);
    console.log(formatReport(reports));
    console.log(`\n   Run 'rcode doctor' for details, or re-run update to retry.`);
  } else {
    console.log(`   ✓ Post-update verification passed.`);
  }

  console.log();
  console.log(
    installedVersion === packageVersion
      ? `✅ Rihal Code ${packageVersion} refreshed.`
      : `✅ Rihal Code updated: ${installedVersion} → ${packageVersion}`,
  );
  if (backup.ok) {
    console.log(`   Rollback: tar -xzf ${backup.path}`);
  }
  console.log();
}
