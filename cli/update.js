/**
 * rcode update — refresh an existing install without losing state.
 *
 * What it does:
 *   1. Verifies rcode is actually installed (.rcode/config.json present)
 *   2. Reads the stored installed_version vs current package version
 *   3. If same → confirms user wants to refresh anyway (files might have
 *      drifted from the package), or exit with --yes
 *   4. Backs up current editor-dir skill files to .rcode/backups/update-{ts}.tgz
 *   5. Delegates file refresh to cli/install.js (single source of truth)
 *   6. Updates installed_version in .rcode/config.json atomically
 *   7. Runs manifest verification to catch drift
 *
 * What it preserves (never touched):
 *   - .rcode/config.json (only installed_version field is updated)
 *   - .rcode/state.json, phases/, plans/, decisions/, artifacts/, progress/, context/
 *   - Project data — user's phase briefs, stories, bugs, research
 *
 * What it refreshes:
 *   - .claude/skills/rcode-* (agent + action skills)
 *   - .claude/commands/rcode/ (slash commands)
 *   - .cursor/rules/rcode-*.mdc
 *   - .windsurf/rules/rcode-*.mdc
 *   - .antigravity/agents/rcode-*
 *   - rcode section in AGENTS.md (re-appended fresh)
 *
 * Flags:
 *   --yes / -y   skip confirmation prompts
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const clack = require('@clack/prompts');
const { PromptAbortError } = require('./lib/prompts.cjs');
const { writeFileAtomic } = require('./lib/fsutil.cjs');
// HOME-aware home resolution (#889): os.homedir() ignores HOME on Windows.
const { homedir } = require('./lib/homedir.cjs');
const { verifyInstall, formatReport } = require('./lib/manifest.cjs');
const install = require('./install');

/**
 * Issue #701: update.js used to read .rcode/config.json with JSON.parse, but
 * the installer writes .rcode/config.yaml. So `rcode update` errored on
 * every real install. Read config.yaml with the same minimal parser the
 * installer uses, and write it back as YAML preserving every other field.
 */
function readConfigYaml(configPath) {
  const text = fs.readFileSync(configPath, 'utf8');
  const obj = {};
  for (const raw of text.split('\n')) {
    const line = raw.replace(/#.*$/, '').trimEnd();
    if (!line) continue;
    if (line.startsWith(' ')) continue; // ignore nested keys (rare; preserved on disk via raw text path)
    const colonAt = line.indexOf(':');
    if (colonAt === -1) continue;
    const key = line.slice(0, colonAt).trim();
    let val = line.slice(colonAt + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (val === 'true') val = true;
    else if (val === 'false') val = false;
    obj[key] = val;
  }
  return { obj, raw: text };
}

/**
 * Surgically update a single key in a YAML config without rewriting the
 * whole file (preserves comments, ordering, and nested keys we don't parse).
 * If the key doesn't exist, append it.
 */
function setYamlKey(rawText, key, value) {
  const re = new RegExp(`^${key}:\\s*.*$`, 'm');
  const replacement = typeof value === 'string'
    ? `${key}: "${value.replace(/"/g, '\\"')}"`
    : `${key}: ${value}`;
  if (re.test(rawText)) {
    return rawText.replace(re, replacement);
  }
  return rawText.replace(/\n*$/, '') + `\n${replacement}\n`;
}

function parseArgs(args) {
  const opts = { yes: false };
  for (const arg of args) {
    if (arg === '--yes' || arg === '-y') opts.yes = true;
  }
  return opts;
}

/**
 * Detect which editors have rcode files installed. Anything we detect
 * will be refreshed on update.
 */
function detectInstalledEditors(cwd) {
  const editors = [];

  // Issue #701: post-#679 dedup leaves .claude/skills/ empty when ~/.claude/
  // already has the rcode-* set. Detect "claude install" by looking at
  // .rcode/config.yaml as the canonical signal — if config exists, the
  // project ran rcode install at least once for claude. The presence of
  // any commands/agents/skills then becomes secondary evidence.
  const homeSkills = path.join(homedir(), '.claude/skills');
  const projectClaude = (
    (fs.existsSync(path.join(cwd, '.claude/skills')) &&
      fs.readdirSync(path.join(cwd, '.claude/skills')).some(n => n.startsWith('rcode-'))) ||
    (fs.existsSync(path.join(cwd, '.claude/agents')) &&
      fs.readdirSync(path.join(cwd, '.claude/agents')).some(n => n.startsWith('rcode-'))) ||
    (fs.existsSync(path.join(cwd, '.claude/commands')) &&
      fs.readdirSync(path.join(cwd, '.claude/commands')).some(n => n.startsWith('rcode-')))
  );
  const globalClaude = (
    fs.existsSync(homeSkills) &&
    fs.readdirSync(homeSkills).some(n => n.startsWith('rcode-'))
  );
  const configIndicatesClaude = fs.existsSync(path.join(cwd, '.rcode/config.yaml'));
  if (projectClaude || (configIndicatesClaude && globalClaude)) editors.push('claude');

  if (fs.existsSync(path.join(cwd, '.cursor/rules'))) {
    const hasrcode = fs
      .readdirSync(path.join(cwd, '.cursor/rules'))
      .some((n) => n.startsWith('rcode-') && n.endsWith('.mdc'));
    if (hasrcode) editors.push('cursor');
  }
  if (fs.existsSync(path.join(cwd, '.windsurf/rules'))) {
    const hasrcode = fs
      .readdirSync(path.join(cwd, '.windsurf/rules'))
      .some((n) => n.startsWith('rcode-') && n.endsWith('.mdc'));
    if (hasrcode) editors.push('windsurf');
  }
  if (fs.existsSync(path.join(cwd, '.antigravity/agents'))) {
    const hasrcode = fs
      .readdirSync(path.join(cwd, '.antigravity/agents'))
      .some((n) => n.startsWith('rcode-'));
    if (hasrcode) editors.push('antigravity');
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
    paths.push('.claude/skills', '.claude/commands/rcode');
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

  const backupsDir = path.join(cwd, '.rcode/backups');
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
 * Remove existing rcode-* files from the install target before re-copying.
 * Skill files have version-specific content, so overwriting on top of old
 * files can leave stale bits. Clean before overlay.
 */
function removeOldSkillFiles(cwd, editors) {
  const removed = { claude: 0, cursor: 0, windsurf: 0, antigravity: 0 };

  if (editors.includes('claude')) {
    const skillsDir = path.join(cwd, '.claude/skills');
    if (fs.existsSync(skillsDir)) {
      for (const name of fs.readdirSync(skillsDir)) {
        if (name.startsWith('rcode-')) {
          fs.rmSync(path.join(skillsDir, name), { recursive: true, force: true });
          removed.claude++;
        }
      }
    }
    // Remove vscode-style subdir .claude/commands/rcode/
    const commandsSubdir = path.join(cwd, '.claude/commands/rcode');
    if (fs.existsSync(commandsSubdir)) {
      fs.rmSync(commandsSubdir, { recursive: true, force: true });
    }
    // Remove claude-style root-level .claude/commands/rcode-*.md files
    const commandsRoot = path.join(cwd, '.claude/commands');
    if (fs.existsSync(commandsRoot)) {
      for (const f of fs.readdirSync(commandsRoot)) {
        if (f.startsWith('rcode-') && (f.endsWith('.md') || f.endsWith('.mdc'))) {
          fs.unlinkSync(path.join(commandsRoot, f));
        }
      }
    }
  }

  if (editors.includes('cursor')) {
    const rulesDir = path.join(cwd, '.cursor/rules');
    if (fs.existsSync(rulesDir)) {
      for (const name of fs.readdirSync(rulesDir)) {
        if (name.startsWith('rcode-') && name.endsWith('.mdc')) {
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
        if (name.startsWith('rcode-') && name.endsWith('.mdc')) {
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
        if (name.startsWith('rcode-')) {
          fs.rmSync(path.join(agDir, name));
          removed.antigravity++;
        }
      }
    }
  }

  return removed;
}

/**
 * Strip the rcode section from AGENTS.md so the install function can
 * re-append a fresh one. Uses the same regex patterns as uninstall.js.
 */
function stripAgentsMdSection(cwd) {
  const agentsMdPath = path.join(cwd, 'AGENTS.md');
  if (!fs.existsSync(agentsMdPath)) return;
  let content = fs.readFileSync(agentsMdPath, 'utf8');
  const patterns = [
    /\n*---\n+## rcode Agents \(installed\)[\s\S]*?(?=\n## |\n*$)/,
    /\n*## rcode Agents \(installed\)[\s\S]*?(?=\n## |\n*$)/,
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
  // Issue #701: installer writes .rcode/config.yaml, not config.json.
  // Tolerate both shapes for users who upgrade across the rename window,
  // but the canonical path is YAML.
  const configYamlPath = path.join(cwd, '.rcode/config.yaml');
  const configJsonPath = path.join(cwd, '.rcode/config.json');
  const configPath = fs.existsSync(configYamlPath) ? configYamlPath : configJsonPath;

  if (!fs.existsSync(configPath)) {
    console.error(`\n❌ rcode is not installed in this directory.`);
    console.error(`   To install: rcode install\n`);
    process.exit(1);
  }

  let config;
  let configRaw = '';
  const isYaml = configPath.endsWith('.yaml');
  try {
    if (isYaml) {
      const parsed = readConfigYaml(configPath);
      config = parsed.obj;
      configRaw = parsed.raw;
    } else {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (err) {
    console.error(`\n❌ ${path.basename(configPath)} is not parseable: ${err.message}\n`);
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

  console.log(`\n🕌 rcode — Update\n`);
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
  // the single source of truth — call once with the full IDE array so that
  // buildInstallPlan can deduplicate across IDEs (e.g. claude+vscode).
  console.log();
  const supportedIdes = editors.filter(ide => ['claude', 'cursor', 'gemini'].includes(ide));
  if (supportedIdes.length > 0) {
    if (editors.some(ide => !['claude', 'cursor', 'gemini'].includes(ide))) {
      const unsupported = editors.filter(ide => !['claude', 'cursor', 'gemini'].includes(ide));
      console.log(`   ⚠ ${unsupported.join(', ')} refresh not yet supported by installer — skipping`);
    }
    install.install({
      target: cwd,
      force: true,
      yes: true,
      userName: config.user_name || require('os').userInfo().username,
      projectName: config.project_name || require('path').basename(cwd),
      language: config.language || 'English',
      mode: config.mode || 'guided',
      ides: supportedIdes,
      modules: [],
      help: false,
    });
    console.log(`   ✓ [${supportedIdes.join(', ')}] → refreshed via install.js`);
  }

  // ------ Update installed_version in config (atomic) ------
  // Issue #701: write back in the same format we read. YAML uses surgical
  // single-key replace so other fields, comments, ordering survive.
  if (isYaml) {
    const updated = setYamlKey(configRaw, 'installed_version', packageVersion);
    writeFileAtomic(configPath, updated);
  } else {
    config.installed_version = packageVersion;
    const { writeJsonAtomic } = require('./lib/fsutil.cjs');
    writeJsonAtomic(configPath, config);
  }
  console.log(`   ✓ ${path.relative(cwd, configPath)} → installed_version: ${packageVersion}`);

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
      ? `✅ rcode ${packageVersion} refreshed.`
      : `✅ rcode updated: ${installedVersion} → ${packageVersion}`,
  );
  if (backup.ok) {
    console.log(`   Rollback: tar -xzf ${backup.path}`);
  }
  console.log();
}

// Re-exports for unit tests (W3.4 — issue #694 follow-up).
module.exports.parseArgs = parseArgs;
module.exports.detectInstalledEditors = detectInstalledEditors;
