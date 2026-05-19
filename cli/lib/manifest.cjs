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
 * `agents` are the bare names (no rihal- prefix, no .md) of the agent files
 *   under rihal/agents/*.md — these are what install ships to
 *   .claude/agents/rihal-<name>.md, .cursor/rules/rihal/agents/, etc.
 *   NOT the phrase-activated agent skills under rihal/skills/agents/.
 * `actions` are the skill dir names under rihal/skills/actions/, plus the
 *   nested rihal/skills/actions/research/ children (flattened — matches how
 *   installSkills() copies them).
 */
function readPackageManifest(packageRoot) {
  const skillsRoot = path.join(packageRoot, 'rihal/skills');
  const manifest = { agents: new Set(), actions: new Set() };

  // Issue #783 — agents are file-based (rihal/agents/*.md), not the skill
  // directories under rihal/skills/agents/. The installer ships rihal/agents/
  // to every editor target; the old skill-dir source produced a different
  // namespace ("fatima-qa" vs "fatima") and made doctor report constant drift.
  const agentsDir = path.join(packageRoot, 'rihal/agents');
  if (fs.existsSync(agentsDir)) {
    for (const entry of fs.readdirSync(agentsDir, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      if (!entry.name.startsWith('rihal-') || !entry.name.endsWith('.md')) continue;
      manifest.agents.add(entry.name.replace(/^rihal-/, '').replace(/\.md$/, ''));
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
function verifyClaudeInstall(cwd, packageRoot, options = {}) {
  // Issue #698: tests assert against an isolated tempdir cwd. The global
  // fallback (#664) makes that impossible because it reads the contributor's
  // real ~/.claude/. Tests can pass { globalFallback: false } to disable it.
  // Default remains true to preserve the runtime behavior introduced in #664.
  const globalFallback = options.globalFallback !== false;
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

  // Issue #664 — global precedence fallback.
  // The installer (cli/install.js ~line 1773) intentionally removes project-
  // level .claude/agents/rihal-*.md when the user's ~/.claude/ already has
  // them, to avoid duplicate commands. Without this fallback the verifier
  // reports 0 agents on every successful install in that scenario.
  if (installedAgents.size === 0 && globalFallback) {
    try {
      const os = require('os');
      const globalAgentsDir = path.join(os.homedir(), '.claude/agents');
      if (fs.existsSync(globalAgentsDir)) {
        for (const f of fs.readdirSync(globalAgentsDir)) {
          if (f.startsWith('rihal-') && f.endsWith('.md')) {
            installedAgents.add(f.replace(/^rihal-/, '').replace(/\.md$/, ''));
          }
        }
      }
    } catch { /* non-fatal — permission errors etc. */ }
  }

  // Actions: .claude/skills/rihal-<name>/. installSkills (cli/install.js)
  // prefixes every action with rihal-, and readPackageManifest does the
  // same — so both sides are normalized. The previous version filtered OUT
  // rihal-* dirs which excluded ALL real actions and made the diff always
  // report "everything missing." Compare directly against the prefixed set.
  const allInstalled = readInstalledDirs(skillsDir);
  let actionsInstalled = new Set([...allInstalled].filter((n) => pkg.actions.has(n)));

  // Issue #783 — global precedence fallback for action skills, mirroring the
  // agent fallback above. installSkills() skips project-level skills when
  // ~/.claude/skills/ already has them (#679), leaving the project skills dir
  // with only command stubs. Without this fallback the verifier reports
  // "actions 0/37" on every successful install in that scenario.
  if (actionsInstalled.size === 0 && globalFallback) {
    try {
      const os = require('os');
      const globalSkillsDir = path.join(os.homedir(), '.claude/skills');
      const globalInstalled = readInstalledDirs(globalSkillsDir);
      actionsInstalled = new Set([...globalInstalled].filter((n) => pkg.actions.has(n)));
    } catch { /* non-fatal — permission errors etc. */ }
  }

  return [
    diffSet('claude', 'agents', pkg.agents, installedAgents),
    diffSet('claude', 'actions', pkg.actions, actionsInstalled),
  ];
}

/**
 * Verify a Cursor or Windsurf install. Issue #783: the installer ships one
 * .mdc agent rule per rihal/agents/*.md into the NESTED directory
 *   .cursor/rules/rihal/agents/rihal-<name>.mdc   (cursor)
 *   .windsurf/rules/rihal/agents/rihal-<name>.mdc (windsurf)
 * — not flat digest-based rules at .<ide>/rules/. Compare against the same
 * agent set the Claude install uses.
 */
function verifyRulesInstall(editor, cwd, packageRoot) {
  const pkg = readPackageManifest(packageRoot);
  const base = editor === 'cursor' ? '.cursor/rules' : '.windsurf/rules';
  const agentsDir = path.join(cwd, base, 'rihal', 'agents');

  const installed = new Set();
  if (fs.existsSync(agentsDir)) {
    for (const entry of fs.readdirSync(agentsDir, { withFileTypes: true })) {
      if (!entry.isFile()) continue; // skip the nested rules/ subdir
      if (!entry.name.startsWith('rihal-') || !entry.name.endsWith('.mdc')) continue;
      installed.add(entry.name.replace(/^rihal-/, '').replace(/\.mdc$/, ''));
    }
  }

  return [diffSet(editor, 'agents', pkg.agents, installed)];
}

/**
 * Verify an Antigravity install. Issue #783: the installer ships agent files
 * to the NESTED .antigravity/rihal/agents/rihal-<name>.md — not
 * .antigravity/agents/. Compare against the package agent set.
 */
function verifyAntigravityInstall(cwd, packageRoot) {
  const pkg = readPackageManifest(packageRoot);
  const agentsDir = path.join(cwd, '.antigravity/rihal/agents');
  const installed = new Set();
  if (fs.existsSync(agentsDir)) {
    for (const entry of fs.readdirSync(agentsDir, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      if (!entry.name.startsWith('rihal-') || !entry.name.endsWith('.md')) continue;
      installed.add(entry.name.replace(/^rihal-/, '').replace(/\.md$/, ''));
    }
  }

  return [diffSet('antigravity', 'agents', pkg.agents, installed)];
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
