/**
 * Agent / skill manifest verification.
 *
 * After an install runs, we want to confirm that every expected skill
 * actually landed on disk. A Ctrl+C mid-copy, disk full, or permission
 * error could leave a partial install behind — the user thinks everything
 * worked but half the agents are missing. This module compares the
 * package's source skills against what was written to the project.
 *
 * Reused by:
 *   - cli/index.js  — post-install verification with friendly report
 *   - cli/doctor.js — preflight/healthcheck
 */

const fs = require('fs');
const path = require('path');

/**
 * Read the expected skill set from the package source.
 * Returns { agents: Set<string>, actions: Set<string> }.
 *
 * `agents` are the directory names under rihal/skills/agents/ (e.g. "waleed-cto").
 * `actions` are the skill dir names under rihal/skills/actions/, plus the
 *   nested rihal/skills/actions/research/ children (flattened — matches how
 *   installSkills() copies them).
 */
function readPackageManifest(packageRoot) {
  const skillsRoot = path.join(packageRoot, 'rihal/skills');
  const manifest = { agents: new Set(), actions: new Set() };

  const agentsDir = path.join(skillsRoot, 'agents');
  if (fs.existsSync(agentsDir)) {
    for (const entry of fs.readdirSync(agentsDir, { withFileTypes: true })) {
      if (entry.isDirectory()) manifest.agents.add(entry.name);
    }
  }

  // Mirror installSkills() walkForSkills: recurse into action bucket dirs
  // (1-analysis, 2-plan, etc.) until a dir with SKILL.md is found, then add
  // the dir name as installed. Bucket dirs themselves are never installed.
  function walkActions(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const full = path.join(dir, entry.name);
      if (fs.existsSync(path.join(full, 'SKILL.md'))) {
        // Use the name as it lands in .claude/skills/ (installSkills prefixes
        // non-rihal- dirs with 'rihal-', but all current skills already have it)
        const installedName = entry.name.startsWith('rihal-')
          ? entry.name
          : `rihal-${entry.name}`;
        manifest.actions.add(installedName);
      } else {
        walkActions(full);
      }
    }
  }
  walkActions(path.join(skillsRoot, 'actions'));

  return manifest;
}

/**
 * Read the set of installed skills (by directory name) under an install target.
 * Directory must exist; returns empty Set if not.
 */
function readInstalledDirs(dir, prefix = null) {
  if (!fs.existsSync(dir)) return new Set();
  const names = new Set();
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (prefix && !entry.name.startsWith(prefix)) continue;
    names.add(prefix ? entry.name.slice(prefix.length) : entry.name);
  }
  return names;
}

/**
 * Compare expected vs installed for one editor target.
 *
 * Returns {
 *   editor, kind, expectedCount, installedCount, missing: string[], extra: string[]
 * }
 *
 * `missing` is items in expected but not installed.
 * `extra`   is items in installed but not expected (helpful for detecting
 *           stale installs after a version bump).
 */
function diffSet(editor, kind, expected, installed) {
  const missing = [...expected].filter((x) => !installed.has(x)).sort();
  const extra = [...installed].filter((x) => !expected.has(x)).sort();
  return {
    editor,
    kind,
    expectedCount: expected.size,
    installedCount: installed.size,
    missing,
    extra,
  };
}

/**
 * Verify a Claude install. Agents live at .claude/agents/rihal-<name>.md.
 * Action skills live at .claude/skills/<name>/ (bare name, no rihal- prefix).
 *
 * Note: .claude/skills/ ALSO contains rihal-<name>/ directories that are
 * auto-generated command stubs by generate-command-skills.cjs (so commands
 * appear in the IDE sidebar). Those are NOT agents — counting them as agents
 * makes doctor report drift like "agents 119/23" when nothing is wrong.
 * That's why the agent count comes from .claude/agents/, not .claude/skills/.
 */
function verifyClaudeInstall(cwd, packageRoot) {
  const pkg = readPackageManifest(packageRoot);
  const agentsDir = path.join(cwd, '.claude/agents');
  const skillsDir = path.join(cwd, '.claude/skills');

  // Agents: .claude/agents/rihal-<name>.md (file-based, not dir-based).
  const installedAgents = new Set();
  if (fs.existsSync(agentsDir)) {
    for (const f of fs.readdirSync(agentsDir)) {
      if (f.startsWith('rihal-') && f.endsWith('.md')) {
        installedAgents.add(f.replace(/^rihal-/, '').replace(/\.md$/, ''));
      }
    }
  }

  // Actions: .claude/skills/<bare-name>/ — exclude rihal-* dirs (those are
  // either agent stubs or command stubs, never action skills).
  const allInstalled = readInstalledDirs(skillsDir);
  const actionsInstalled = new Set(
    [...allInstalled].filter((n) => !n.startsWith('rihal-'))
  );

  return [
    diffSet('claude', 'agents', pkg.agents, installedAgents),
    diffSet('claude', 'actions', pkg.actions, actionsInstalled),
  ];
}

/**
 * Verify a Cursor or Windsurf install. Both install 19 digest-based
 * .mdc rules (one per agent) + a rihal-code.mdc overview rule.
 */
function verifyRulesInstall(editor, cwd, packageRoot) {
  const pkg = readPackageManifest(packageRoot);
  const rulesDir = path.join(
    cwd,
    editor === 'cursor' ? '.cursor/rules' : '.windsurf/rules'
  );

  const installed = new Set();
  if (fs.existsSync(rulesDir)) {
    for (const file of fs.readdirSync(rulesDir)) {
      if (!file.startsWith('rihal-') || !file.endsWith('.mdc')) continue;
      if (file === 'rihal-code.mdc') continue; // overview meta-rule, not per-agent
      installed.add(file.replace(/^rihal-/, '').replace(/\.mdc$/, ''));
    }
  }

  // Rules are generated from digests, not agent skill dirs. Build expected
  // set from rihal/digests/*.md.
  const digestsDir = path.join(packageRoot, 'rihal/digests');
  const expected = new Set();
  if (fs.existsSync(digestsDir)) {
    for (const file of fs.readdirSync(digestsDir)) {
      if (!file.endsWith('.md') || file === 'README.md') continue;
      expected.add(file.replace(/\.md$/, ''));
    }
  }

  return [diffSet(editor, 'rules', expected, installed)];
}

/**
 * Verify an Antigravity install: .antigravity/agents/rihal-<agent>.md files.
 * One per digest.
 */
function verifyAntigravityInstall(cwd, packageRoot) {
  const agentsDir = path.join(cwd, '.antigravity/agents');
  const installed = new Set();
  if (fs.existsSync(agentsDir)) {
    for (const file of fs.readdirSync(agentsDir)) {
      if (!file.startsWith('rihal-') || !file.endsWith('.md')) continue;
      installed.add(file.replace(/^rihal-/, '').replace(/\.md$/, ''));
    }
  }

  const digestsDir = path.join(packageRoot, 'rihal/digests');
  const expected = new Set();
  if (fs.existsSync(digestsDir)) {
    for (const file of fs.readdirSync(digestsDir)) {
      if (!file.endsWith('.md') || file === 'README.md') continue;
      expected.add(file.replace(/\.md$/, ''));
    }
  }

  return [diffSet('antigravity', 'agents', expected, installed)];
}

/**
 * Run verification across every editor the user installed for.
 * Returns { reports, hasDrift } where hasDrift is true if any report has
 * missing or extra entries.
 */
function verifyInstall(cwd, packageRoot, editors) {
  const reports = [];
  if (editors.includes('claude')) {
    reports.push(...verifyClaudeInstall(cwd, packageRoot));
  }
  if (editors.includes('cursor')) {
    reports.push(...verifyRulesInstall('cursor', cwd, packageRoot));
  }
  if (editors.includes('windsurf')) {
    reports.push(...verifyRulesInstall('windsurf', cwd, packageRoot));
  }
  if (editors.includes('antigravity')) {
    reports.push(...verifyAntigravityInstall(cwd, packageRoot));
  }

  const hasDrift = reports.some((r) => r.missing.length > 0 || r.extra.length > 0);
  return { reports, hasDrift };
}

/**
 * Pretty-print the verification report. Returns a multi-line string.
 * Use an empty-case symbol (✓) when everything matches; warn symbol (⚠) when
 * there's drift.
 */
function formatReport(reports) {
  const lines = [];
  for (const r of reports) {
    const symbol = r.missing.length === 0 && r.extra.length === 0 ? '✓' : '⚠';
    lines.push(
      `   ${symbol} ${r.editor.padEnd(12)} ${r.kind.padEnd(8)} ${r.installedCount}/${r.expectedCount}`
    );
    if (r.missing.length > 0) {
      lines.push(`      missing: ${r.missing.join(', ')}`);
    }
    if (r.extra.length > 0) {
      lines.push(`      extra:   ${r.extra.join(', ')}`);
    }
  }
  return lines.join('\n');
}

module.exports = {
  readPackageManifest,
  verifyInstall,
  verifyClaudeInstall,
  verifyRulesInstall,
  verifyAntigravityInstall,
  formatReport,
};
