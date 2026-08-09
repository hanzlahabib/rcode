'use strict';
/**
 * Legacy rihal-* → rcode-* namespace cleanup (#954).
 *
 * The rcode↔rihal rename left rihal-* skills/commands installed alongside
 * their rcode-* twins everywhere — every session loaded each command 2-4x.
 * This module scans for safe-to-remove legacy artifacts (a rihal-* entry is
 * only ever flagged when its rcode-* twin already exists — never delete
 * something with no replacement) and, on request, backs them up under
 * ~/.claude/.rcode-backup/<timestamp>/ before deleting.
 *
 * Read-only scan functions (findLegacyRihalArtifacts, findUnprefixedTwinDupes,
 * findCrossScopeDupes, scanNamespaceDuplication) are reused by `rcode doctor`
 * for report-only checks. The destructive migrateNamespace() is reused by
 * `rcode update` and `rcode migrate-namespace`.
 */

const fs = require('fs');
const path = require('path');

function listDirSafe(dir) {
  if (!fs.existsSync(dir)) return [];
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

/**
 * Legacy rihal-* skill dirs / command files whose rcode-* twin exists in
 * the SAME .claude dir. Read-only.
 */
function findLegacyRihalArtifacts(claudeDir) {
  const skills = [];
  const skillsDir = path.join(claudeDir, 'skills');
  for (const entry of listDirSafe(skillsDir)) {
    if (!entry.isDirectory() || !entry.name.startsWith('rihal-')) continue;
    const twinName = 'rcode-' + entry.name.slice('rihal-'.length);
    if (fs.existsSync(path.join(skillsDir, twinName))) {
      skills.push({
        name: entry.name,
        twin: twinName,
        srcPath: path.join(skillsDir, entry.name),
        kind: 'skill',
      });
    }
  }

  const commands = [];
  const commandsDir = path.join(claudeDir, 'commands');
  for (const entry of listDirSafe(commandsDir)) {
    if (!entry.isFile() || !entry.name.startsWith('rihal-') || !entry.name.endsWith('.md')) continue;
    const twinName = 'rcode-' + entry.name.slice('rihal-'.length);
    if (fs.existsSync(path.join(commandsDir, twinName))) {
      commands.push({
        name: entry.name,
        twin: twinName,
        srcPath: path.join(commandsDir, entry.name),
        kind: 'command',
      });
    }
  }

  const agents = [];
  const agentsDir = path.join(claudeDir, 'agents');
  for (const entry of listDirSafe(agentsDir)) {
    if (!entry.isFile() || !entry.name.startsWith('rihal-') || !entry.name.endsWith('.md')) continue;
    const twinName = 'rcode-' + entry.name.slice('rihal-'.length);
    if (fs.existsSync(path.join(agentsDir, twinName))) {
      agents.push({
        name: entry.name,
        twin: twinName,
        srcPath: path.join(agentsDir, entry.name),
        kind: 'agent',
      });
    }
  }

  return { skills, commands, agents };
}

/**
 * Unprefixed command files (e.g. `do.md`) that duplicate an already-installed
 * `rcode-do.md` twin in the SAME .claude/commands dir. Read-only.
 */
function findUnprefixedTwinDupes(claudeDir) {
  const dupes = [];
  const commandsDir = path.join(claudeDir, 'commands');
  for (const entry of listDirSafe(commandsDir)) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
    if (entry.name.startsWith('rcode-') || entry.name.startsWith('rihal-')) continue;
    const twinName = 'rcode-' + entry.name;
    if (fs.existsSync(path.join(commandsDir, twinName))) {
      dupes.push({
        name: entry.name,
        twin: twinName,
        srcPath: path.join(commandsDir, entry.name),
        kind: 'command',
      });
    }
  }
  return dupes;
}

/**
 * Unprefixed command basenames registered in BOTH project and global scope.
 * Project always wins — the returned entries point at the GLOBAL copy,
 * which is the one safe to remove (the project copy stays canonical).
 */
function findCrossScopeDupes(projectClaudeDir, globalClaudeDir) {
  const dupes = [];
  if (path.resolve(projectClaudeDir) === path.resolve(globalClaudeDir)) return dupes;
  const projectCommandsDir = path.join(projectClaudeDir, 'commands');
  const globalCommandsDir = path.join(globalClaudeDir, 'commands');
  const projectNames = new Set(
    listDirSafe(projectCommandsDir)
      .filter((e) => e.isFile() && e.name.endsWith('.md'))
      .map((e) => e.name),
  );
  for (const entry of listDirSafe(globalCommandsDir)) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
    if (projectNames.has(entry.name)) {
      dupes.push({
        name: entry.name,
        srcPath: path.join(globalCommandsDir, entry.name),
        keptPath: path.join(projectCommandsDir, entry.name),
        kind: 'command',
      });
    }
  }
  return dupes;
}

/**
 * Full duplication report across project + global scopes. Pure read — safe
 * to call from `rcode doctor` on every run.
 */
function scanNamespaceDuplication(projectDir, homeDir) {
  const projectClaudeDir = path.join(projectDir, '.claude');
  const globalClaudeDir = path.join(homeDir, '.claude');

  const projectLegacy = findLegacyRihalArtifacts(projectClaudeDir);
  const globalLegacy = findLegacyRihalArtifacts(globalClaudeDir);
  const projectUnprefixed = findUnprefixedTwinDupes(projectClaudeDir);
  const globalUnprefixed = findUnprefixedTwinDupes(globalClaudeDir);
  const crossScope = findCrossScopeDupes(projectClaudeDir, globalClaudeDir);

  const legacySkillCount = projectLegacy.skills.length + globalLegacy.skills.length;
  const legacyCommandCount = projectLegacy.commands.length + globalLegacy.commands.length;
  const legacyAgentCount = projectLegacy.agents.length + globalLegacy.agents.length;
  const unprefixedCount = projectUnprefixed.length + globalUnprefixed.length;
  const crossScopeCount = crossScope.length;

  return {
    legacySkillCount,
    legacyCommandCount,
    legacyAgentCount,
    unprefixedCount,
    crossScopeCount,
    totalCount: legacySkillCount + legacyCommandCount + legacyAgentCount + unprefixedCount + crossScopeCount,
    detail: { projectLegacy, globalLegacy, projectUnprefixed, globalUnprefixed, crossScope },
  };
}

/**
 * Move `srcPath` under `backupRoot/<scope>/<skills|commands>/`, then delete
 * the original. Idempotent: if srcPath no longer exists (already migrated
 * in an earlier pass, or removed by an earlier step in this same pass),
 * this is a no-op that returns false.
 */
function backupAndRemove(srcPath, backupRoot, scope, kind) {
  if (!fs.existsSync(srcPath)) return false;
  const destDirName = kind === 'skill' ? 'skills' : kind === 'agent' ? 'agents' : 'commands';
  const destDir = path.join(backupRoot, scope, destDirName);
  fs.mkdirSync(destDir, { recursive: true });
  const dest = path.join(destDir, path.basename(srcPath));
  fs.cpSync(srcPath, dest, { recursive: true });
  fs.rmSync(srcPath, { recursive: true, force: true });
  return true;
}

/**
 * Execute the cleanup: back up + remove every legacy rihal-* artifact and
 * unprefixed/cross-scope duplicate found by scanNamespaceDuplication(), for
 * real. Idempotent — running twice in a row removes 0 the second time
 * because the scan re-runs fresh each call and finds nothing left to flag.
 *
 * Backups always land under ~/.claude/.rcode-backup/<timestamp>/ regardless
 * of whether the artifact came from the project or global scope, so a
 * single rollback location covers everything from one migrate run.
 */
function migrateNamespace(projectDir, homeDir) {
  const scan = scanNamespaceDuplication(projectDir, homeDir);
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupRoot = path.join(homeDir, '.claude', '.rcode-backup', ts);

  const summary = {
    backupDir: null,
    removed: { legacySkills: 0, legacyCommands: 0, legacyAgents: 0, unprefixedDupes: 0, crossScopeDupes: 0 },
  };

  const removeAll = (items, scope, kind) => {
    let count = 0;
    for (const item of items) {
      if (backupAndRemove(item.srcPath, backupRoot, scope, kind)) count++;
    }
    return count;
  };

  summary.removed.legacySkills =
    removeAll(scan.detail.projectLegacy.skills, 'project', 'skill') +
    removeAll(scan.detail.globalLegacy.skills, 'global', 'skill');
  summary.removed.legacyCommands =
    removeAll(scan.detail.projectLegacy.commands, 'project', 'command') +
    removeAll(scan.detail.globalLegacy.commands, 'global', 'command');
  summary.removed.legacyAgents =
    removeAll(scan.detail.projectLegacy.agents, 'project', 'agent') +
    removeAll(scan.detail.globalLegacy.agents, 'global', 'agent');
  summary.removed.unprefixedDupes =
    removeAll(scan.detail.projectUnprefixed, 'project', 'command') +
    removeAll(scan.detail.globalUnprefixed, 'global', 'command');
  summary.removed.crossScopeDupes = removeAll(scan.detail.crossScope, 'global', 'command');

  const totalRemoved = Object.values(summary.removed).reduce((a, b) => a + b, 0);
  if (totalRemoved > 0) summary.backupDir = backupRoot;

  return summary;
}

module.exports = {
  findLegacyRihalArtifacts,
  findUnprefixedTwinDupes,
  findCrossScopeDupes,
  scanNamespaceDuplication,
  migrateNamespace,
};
