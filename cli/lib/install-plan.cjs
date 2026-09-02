/**
 * cli/lib/install-plan.cjs — install-plan construction: build the file list
 * for a target IDE, parse rcode/modules/*.yaml manifests, and filter a plan
 * to a module subset.
 *
 * Split out of cli/install.js (#1066 Phase 1) — mechanical move, no
 * behavior change.
 */

const fs = require('fs');
const path = require('path');
const fg = require('fast-glob');
const { SOURCE_ROOT } = require('./install-shared.cjs');
const { getPathsForIde } = require('./install-ide.cjs');

/**
 * Walk a directory and return absolute file paths. Uses fast-glob so
 * symlink cycles are never followed and patterns can be excluded via
 * .rcodeignore files (#249).
 */
function walkFiles(dir, extraIgnore = []) {
  if (!fs.existsSync(dir)) return [];
  return fg.sync('**/*', {
    cwd: dir,
    dot: true,
    onlyFiles: true,
    followSymbolicLinks: false,
    ignore: extraIgnore,
  }).map((rel) => path.join(dir, rel));
}

/**
 * Read .rcodeignore patterns from a given root directory.
 * Returns an array of glob-style ignore patterns (same syntax as .gitignore).
 */
function readRcodeIgnore(root) {
  const ignoreFile = path.join(root, '.rcodeignore');
  if (!fs.existsSync(ignoreFile)) return [];
  return fs.readFileSync(ignoreFile, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
}

function buildInstallPlan(ide = 'claude', target = process.cwd()) {
  // Support array of IDEs — merge plans with deduplication (#449/#450 multi-IDE).
  if (Array.isArray(ide)) {
    const seen = new Set();
    const merged = [];
    for (const i of ide) {
      for (const entry of buildInstallPlan(i, target)) {
        const key = entry.rel;
        if (!seen.has(key)) {
          seen.add(key);
          merged.push(entry);
        }
      }
    }
    // Note: pre-#723 we had a dual-layout workaround here that filtered
    // vscode subdir entries when claude+vscode were both selected. After
    // Waleed's unification (vscode now writes the same rcode-{name}.md root
    // form as claude), the seen-by-rel dedup above already covers it — both
    // IDEs emit identical `rel` values and only one wins. Layout drift will
    // resurface this filter; it's intentionally deleted, not commented out.
    return merged;
  }

  const plan = [];
  const paths = getPathsForIde(ide, target);

  // Compute relative paths from target root
  const relWorkflows = path.relative(target, paths.workflowsDir);
  const relReferences = path.relative(target, paths.referencesDir);
  const relBin = path.relative(target, paths.binDir);
  const relAgents = path.relative(target, paths.agentsDir);
  const relCommands = path.relative(target, paths.commandsDir);

  // .rcode/workflows/
  for (const f of walkFiles(path.join(SOURCE_ROOT, 'workflows'))) {
    const rel = path.relative(path.join(SOURCE_ROOT, 'workflows'), f);
    plan.push({ src: f, rel: path.join(relWorkflows, rel) });
  }

  // .rcode/references/
  for (const f of walkFiles(path.join(SOURCE_ROOT, 'references'))) {
    const rel = path.relative(path.join(SOURCE_ROOT, 'references'), f);
    plan.push({ src: f, rel: path.join(relReferences, rel) });
  }

  // .rcode/bin/
  for (const f of walkFiles(path.join(SOURCE_ROOT, 'bin'))) {
    const rel = path.relative(path.join(SOURCE_ROOT, 'bin'), f);
    plan.push({ src: f, rel: path.join(relBin, rel), executable: f.endsWith('.cjs') });
  }

  // .rcode/data/
  for (const f of walkFiles(path.join(SOURCE_ROOT, 'data'))) {
    const rel = path.relative(path.join(SOURCE_ROOT, 'data'), f);
    plan.push({ src: f, rel: path.join('.rcode', 'data', rel) });
  }

  // .rcode/templates/ — every template, not just the starter projects.
  //
  // Only `templates/projects/` was ever copied, so a fresh install had NO
  // .md templates at all while workflows went on reading them:
  // plan-research-validation.md and validate-phase.md both read
  // `.rcode/templates/VALIDATION.md`, which never existed. Any templates found
  // in an older project were leftovers from a version that did copy them, which
  // is why this stayed invisible — it only broke on FRESH installs.
  for (const f of walkFiles(path.join(SOURCE_ROOT, 'templates'))) {
    const rel = path.relative(path.join(SOURCE_ROOT, 'templates'), f);
    if (rel.startsWith('projects' + path.sep) || rel === 'projects') continue; // handled below
    plan.push({ src: f, rel: path.join('.rcode', 'templates', rel) });
  }

  // .rcode/templates/projects/  — starter templates consumed by /rcode-from-template
  const projectTemplatesSrc = path.join(SOURCE_ROOT, 'templates', 'projects');
  const relProjectTemplates = path.relative(target, path.join(target, '.rcode', 'templates', 'projects'));
  for (const f of walkFiles(projectTemplatesSrc)) {
    const rel = path.relative(projectTemplatesSrc, f);
    plan.push({ src: f, rel: path.join(relProjectTemplates, rel) });
  }

  // Agents — IDE-specific
  for (const f of walkFiles(path.join(SOURCE_ROOT, 'agents'))) {
    const rel = path.relative(path.join(SOURCE_ROOT, 'agents'), f);
    const ext = ide === 'cursor' ? '.mdc' : '.md';
    const outName = path.basename(f, '.md') + ext;
    plan.push({ src: f, rel: path.join(relAgents, path.dirname(rel), outName), ide, cursor: ide === 'cursor' });
  }

  // Commands — IDE-specific
  // Claude AND VSCode: output as .claude/commands/rcode-{name}.md (prefixed root).
  // Both target the same commands dir (#723 / Waleed unification) so multi-IDE
  // installs never duplicate. Cursor/Gemini keep the bare-name-in-rcode/-subdir form.
  for (const f of walkFiles(path.join(SOURCE_ROOT, 'commands'))) {
    const rel = path.relative(path.join(SOURCE_ROOT, 'commands'), f);
    const ext = ide === 'cursor' ? '.mdc' : '.md';
    const baseName = path.basename(f, '.md');
    const outName = (ide === 'claude' || ide === 'vscode' || ide === 'grok')
      ? `rcode-${baseName}${ext}`
      : baseName + ext;
    plan.push({ src: f, rel: path.join(relCommands, path.dirname(rel), outName), ide, cursor: ide === 'cursor' });
  }

  // Agent rules (on-demand reference files) — copied to .rcode/agents-rules/
  const agentRulesDir = path.join(target, '.rcode', 'agents-rules');
  for (const f of walkFiles(path.join(SOURCE_ROOT, 'agents', 'rules'))) {
    const rel = path.relative(path.join(SOURCE_ROOT, 'agents', 'rules'), f);
    plan.push({ src: f, rel: path.join('.rcode', 'agents-rules', rel) });
  }

  return plan;
}

/**
 * Parse a module YAML manifest (rcode/modules/{name}.yaml).
 * Returns { name, requires[], agents[], workflows[], commands[], references[] }.
 */
function readModuleManifest(moduleName) {
  const modPath = path.join(SOURCE_ROOT, 'modules', `${moduleName}.yaml`);
  if (!fs.existsSync(modPath)) return null;
  const text = fs.readFileSync(modPath, 'utf8');
  const mod = { name: moduleName, requires: [], agents: [], workflows: [], commands: [], references: [] };
  let currentKey = null;
  for (const raw of text.split('\n')) {
    const line = raw.replace(/#.*$/, '').trimEnd();
    if (!line.trim()) continue;
    // Top-level key detection
    const keyMatch = line.match(/^(\w+):/);
    if (keyMatch && !line.startsWith('  ') && !line.startsWith('-')) {
      const key = keyMatch[1];
      const val = line.slice(line.indexOf(':') + 1).trim();
      if (['agents', 'workflows', 'commands', 'references', 'requires'].includes(key)) {
        currentKey = key;
        if (val && val !== '[]') {
          // inline single value
          mod[key] = val.replace(/^\[|\]$/g, '').split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
        }
      } else {
        currentKey = null;
        if (key === 'name') mod.name = val.replace(/^["']|["']$/g, '');
      }
      continue;
    }
    // List item under current key
    if (currentKey && line.trim().startsWith('-')) {
      const item = line.trim().slice(1).trim().replace(/^["']|["']$/g, '');
      if (item) mod[currentKey].push(item);
    }
  }
  return mod;
}

/**
 * List available module names by scanning rcode/modules/*.yaml
 */
function listAvailableModules() {
  const modulesDir = path.join(SOURCE_ROOT, 'modules');
  if (!fs.existsSync(modulesDir)) return [];
  return fs.readdirSync(modulesDir)
    .filter((f) => f.endsWith('.yaml'))
    .map((f) => f.replace('.yaml', ''));
}

/**
 * Filter an install plan to only files belonging to specified modules.
 * If moduleNames is empty, returns the full plan (backward compatible).
 */
function filterPlanByModules(plan, moduleNames) {
  if (moduleNames.length === 0) return plan; // no filter = install everything
  const allowed = new Set();
  for (const modName of moduleNames) {
    const mod = readModuleManifest(modName);
    if (!mod) { console.warn(`  ⚠ Unknown module: ${modName}`); continue; }
    for (const a of mod.agents) allowed.add(path.join('.claude', 'agents', a));
    for (const w of mod.workflows) allowed.add(path.join('.rcode', 'workflows', w));
    for (const c of mod.commands) allowed.add(path.join('.claude', 'commands', `rcode-${c}`));
    for (const r of mod.references) allowed.add(path.join('.rcode', 'references', r));
  }
  // Always include bin/ (shared infrastructure, not module-specific)
  return plan.filter((entry) => {
    if (entry.rel.startsWith(path.join('.rcode', 'bin'))) return true;
    if (entry.rel.startsWith(path.join('.rcode', 'data'))) return true;
    return allowed.has(entry.rel);
  });
}

module.exports = {
  walkFiles,
  readRcodeIgnore,
  buildInstallPlan,
  readModuleManifest,
  listAvailableModules,
  filterPlanByModules,
};
