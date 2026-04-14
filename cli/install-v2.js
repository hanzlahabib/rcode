/**
 * cli/install-v2.js — Rihal v2 file-shipping installer (prototype)
 *
 * Compared to the v1 `cli/init.js` (2918 lines of inline string templates),
 * this installer copies real files from the package's `rihal/v2/` directory
 * into a target project. The same pattern used by BMAD-method v6.3.
 *
 * Target layout in the user's project:
 *
 *   .rihal/
 *     _config/
 *       manifest.yaml          (version + install date + installed modules)
 *       agent-manifest.csv     (auto-generated from rihal/v2/agents/*.md frontmatter)
 *       files-manifest.csv     (SHA256 hashes for update/doctor)
 *     config.yaml              (user_name, project_name, language, mode)
 *     workflows/
 *       council.md
 *     references/
 *       council-protocol.md
 *       commit-conventions.md
 *     bin/
 *       rihal-tools.cjs
 *       lib/council-panel.cjs
 *   .claude/
 *     agents/
 *       rihal-sadiq.md
 *       rihal-waleed.md
 *       rihal-fatima.md
 *     commands/
 *       rihal/
 *         council.md
 *   .planning/
 *     council-sessions/        (empty dir, populated on first council run)
 *
 * Zero external dependencies. Pure Node stdlib.
 *
 * Usage:
 *   node cli/install-v2.js [target-project-dir]
 *   node cli/install-v2.js --help
 *
 * Flags:
 *   --force           overwrite existing files without prompting
 *   --yes             non-interactive, accept defaults
 *   --user <name>     set user_name in config.yaml (default: $USER)
 *   --project <name>  set project_name in config.yaml (default: basename of target)
 *   --language <lang> set communication_language (default: English)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

const PACKAGE_ROOT = path.resolve(__dirname, '..');
const SOURCE_ROOT = path.join(PACKAGE_ROOT, 'rihal', 'v2');

/**
 * Parse command-line args into a normalized options object.
 */
function parseArgs(argv) {
  const opts = {
    target: process.cwd(),
    force: false,
    reset: false,
    yes: false,
    userName: os.userInfo().username || 'User',
    projectName: null,
    language: 'English',
    mode: 'guided',
    ide: 'claude',  // claude, cursor, gemini (copilot = TODO)
    help: false,
    modules: [],  // --module core --module execution or empty = all
  };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg === '--force') opts.force = true;
    else if (arg === '--reset') opts.reset = true;
    else if (arg === '--yes' || arg === '-y') opts.yes = true;
    else if (arg === '--user') opts.userName = argv[++i];
    else if (arg === '--project') opts.projectName = argv[++i];
    else if (arg === '--language') opts.language = argv[++i];
    else if (arg === '--mode') opts.mode = argv[++i];
    else if (arg === '--ide') opts.ide = argv[++i];
    else if (arg === '--module') opts.modules.push(argv[++i]);
    else if (!arg.startsWith('--')) positional.push(arg);
  }
  if (positional[0]) opts.target = path.resolve(positional[0]);
  if (!opts.projectName) opts.projectName = path.basename(opts.target);
  return opts;
}

function printHelp() {
  console.log(`
Rihal v2 installer (prototype)

Usage:
  node cli/install-v2.js [target-dir]

Options:
  --force            overwrite existing files without prompting
  --reset            with --force, also delete config.yaml and state.json to re-init
  --yes              non-interactive, accept defaults
  --user <name>      set user_name in config.yaml (default: $USER)
  --project <name>   set project_name (default: basename of target-dir)
  --language <lang>  set communication_language (default: English)
  --mode <guided|yolo> default mode (default: guided)
  --ide <name>       target IDE (claude, cursor, gemini; default: claude)
  --help             this text

Installs (IDE-specific):
  claude:  target/.rihal/          config, workflows, references, bin
           target/.claude/agents/  first-class Rihal subagents
           target/.claude/commands/rihal/  slash commands
  cursor:  target/.cursor/rules/rihal/    Cursor-specific rules + agents
  gemini:  target/.gemini/rihal/          Gemini CLI commands + agents
  target/.planning/       artifact output dir (all IDEs)
`);
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
        commandsDir: path.join(target, '.claude', 'commands', 'rihal'),
        workflowsDir: path.join(target, '.rihal', 'workflows'),
        referencesDir: path.join(target, '.rihal', 'references'),
        binDir: path.join(target, '.rihal', 'bin'),
      };
    case 'cursor':
      return {
        agentsDir: path.join(target, '.cursor', 'rules', 'rihal', 'agents'),
        commandsDir: path.join(target, '.cursor', 'rules', 'rihal', 'commands'),
        workflowsDir: path.join(target, '.rihal', 'workflows'),
        referencesDir: path.join(target, '.rihal', 'references'),
        binDir: path.join(target, '.rihal', 'bin'),
      };
    case 'gemini':
      return {
        agentsDir: path.join(target, '.gemini', 'rihal', 'agents'),
        commandsDir: path.join(target, '.gemini', 'rihal', 'commands'),
        workflowsDir: path.join(target, '.rihal', 'workflows'),
        referencesDir: path.join(target, '.rihal', 'references'),
        binDir: path.join(target, '.rihal', 'bin'),
      };
    default:
      throw new Error(`Unknown IDE: ${ide}. Supported: claude, cursor, gemini`);
  }
}

/**
 * Recursively walk a directory and return absolute file paths.
 */
function walkFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

/**
 * Parse YAML frontmatter from a markdown file. Returns { frontmatter, body }.
 * Minimal subset — supports `key: value` and quoted strings only. Good
 * enough for our agent and command files.
 */
function parseFrontmatter(text) {
  if (!text.startsWith('---\n')) return { frontmatter: {}, body: text };
  const end = text.indexOf('\n---\n', 4);
  if (end === -1) return { frontmatter: {}, body: text };
  const block = text.slice(4, end);
  const body = text.slice(end + 5);
  const fm = {};
  for (const raw of block.split('\n')) {
    const line = raw.replace(/^#.*$/, '').trimEnd();
    if (!line) continue;
    const colonAt = line.indexOf(':');
    if (colonAt === -1) continue;
    const key = line.slice(0, colonAt).trim();
    let val = line.slice(colonAt + 1).trim();
    if (!key || !val) continue;
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
    fm[key] = val;
  }
  return { frontmatter: fm, body };
}

/**
 * Build the list of (sourcePath, targetRelativePath) install pairs. Each
 * entry describes one file we will copy and where it lands in the target
 * project. Returning the list up-front lets us do a dry-run or hash-check
 * pass before touching the disk.
 *
 * For cursor IDE, converts command files from .md to .mdc format.
 */
function buildInstallPlan(ide = 'claude', target = process.cwd()) {
  const plan = [];
  const paths = getPathsForIde(ide, target);

  // Compute relative paths from target root
  const relWorkflows = path.relative(target, paths.workflowsDir);
  const relReferences = path.relative(target, paths.referencesDir);
  const relBin = path.relative(target, paths.binDir);
  const relAgents = path.relative(target, paths.agentsDir);
  const relCommands = path.relative(target, paths.commandsDir);

  // .rihal/workflows/
  for (const f of walkFiles(path.join(SOURCE_ROOT, 'workflows'))) {
    const rel = path.relative(path.join(SOURCE_ROOT, 'workflows'), f);
    plan.push({ src: f, rel: path.join(relWorkflows, rel) });
  }

  // .rihal/references/
  for (const f of walkFiles(path.join(SOURCE_ROOT, 'references'))) {
    const rel = path.relative(path.join(SOURCE_ROOT, 'references'), f);
    plan.push({ src: f, rel: path.join(relReferences, rel) });
  }

  // .rihal/bin/
  for (const f of walkFiles(path.join(SOURCE_ROOT, 'bin'))) {
    const rel = path.relative(path.join(SOURCE_ROOT, 'bin'), f);
    plan.push({ src: f, rel: path.join(relBin, rel), executable: f.endsWith('.cjs') });
  }

  // Agents — IDE-specific
  for (const f of walkFiles(path.join(SOURCE_ROOT, 'agents'))) {
    const rel = path.relative(path.join(SOURCE_ROOT, 'agents'), f);
    const ext = ide === 'cursor' ? '.mdc' : '.md';
    const outName = path.basename(f, '.md') + ext;
    plan.push({ src: f, rel: path.join(relAgents, path.dirname(rel), outName), ide, cursor: ide === 'cursor' });
  }

  // Commands — IDE-specific
  for (const f of walkFiles(path.join(SOURCE_ROOT, 'commands'))) {
    const rel = path.relative(path.join(SOURCE_ROOT, 'commands'), f);
    const ext = ide === 'cursor' ? '.mdc' : '.md';
    const outName = path.basename(f, '.md') + ext;
    plan.push({ src: f, rel: path.join(relCommands, path.dirname(rel), outName), ide, cursor: ide === 'cursor' });
  }

  // Agent rules (on-demand reference files) — copied to .rihal/agents-rules/
  const agentRulesDir = path.join(target, '.rihal', 'agents-rules');
  for (const f of walkFiles(path.join(SOURCE_ROOT, 'agents', 'rules'))) {
    const rel = path.relative(path.join(SOURCE_ROOT, 'agents', 'rules'), f);
    plan.push({ src: f, rel: path.join('.rihal', 'agents-rules', rel) });
  }

  return plan;
}

/**
 * Parse a module YAML manifest (rihal/v2/modules/{name}.yaml).
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
 * List available module names by scanning rihal/v2/modules/*.yaml
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
    for (const w of mod.workflows) allowed.add(path.join('.rihal', 'workflows', w));
    for (const c of mod.commands) allowed.add(path.join('.claude', 'commands', 'rihal', c));
    for (const r of mod.references) allowed.add(path.join('.rihal', 'references', r));
  }
  // Always include bin/ (shared infrastructure, not module-specific)
  return plan.filter((entry) => {
    if (entry.rel.startsWith(path.join('.rihal', 'bin'))) return true;
    return allowed.has(entry.rel);
  });
}

/**
 * Auto-generate agent-manifest.csv from the installed agent files'
 * frontmatter. Columns: id, file, name, description, color.
 *
 * The `id` column strips the `rihal-` prefix so workflow code can match
 * against the council-panel scorer's AGENT_IDS (which use bare names).
 */
function generateAgentManifest(plan, target) {
  const rows = [['id', 'file', 'name', 'description', 'color']];
  const seen = new Set(); // Track IDs already added to avoid duplicates

  for (const entry of plan) {
    if (!entry.rel.startsWith(path.join('.claude', 'agents'))) continue;
    if (!entry.rel.match(/^\.claude[\/\\]agents[\/\\][^\/\\]+\.md$/)) continue;
    const filePath = path.join(target, entry.rel);
    const text = fs.readFileSync(filePath, 'utf8');
    const { frontmatter } = parseFrontmatter(text);
    const name = frontmatter.name || path.basename(entry.rel, '.md');
    const bareId = name.replace(/^rihal-/, '');
    if (seen.has(bareId)) continue; // Skip duplicate
    seen.add(bareId);
    const desc = (frontmatter.description || '').replace(/"/g, '""');
    rows.push([
      bareId,
      entry.rel,
      name,
      `"${desc}"`,
      frontmatter.color || '',
    ]);
  }
  // Also include agents already on disk but not in current plan
  const agentDir = path.join(target, '.claude', 'agents');
  if (fs.existsSync(agentDir)) {
    const existingFiles = fs.readdirSync(agentDir).filter(f => f.startsWith('rihal-') && f.endsWith('.md'));
    const alreadyIncluded = new Set(plan.filter(e => e.rel.startsWith(path.join('.claude', 'agents'))).map(e => path.basename(e.rel)));
    for (const file of existingFiles) {
      if (alreadyIncluded.has(file)) continue;
      const filePath = path.join(agentDir, file);
      const text = fs.readFileSync(filePath, 'utf8');
      const { frontmatter } = parseFrontmatter(text);
      const name = frontmatter.name || path.basename(file, '.md');
      const bareId = name.replace(/^rihal-/, '');
      if (seen.has(bareId)) continue; // Skip if already added
      seen.add(bareId);
      const desc = (frontmatter.description || '').replace(/"/g, '""');
      rows.push([bareId, path.join('.claude', 'agents', file), name, `"${desc}"`, frontmatter.color || '']);
    }
  }
  return rows.map((r) => r.join(',')).join('\n') + '\n';
}

/**
 * Generate files-manifest.csv with SHA256 per installed file. Used by
 * update/doctor to detect drift. Columns: rel, sha256, size.
 */
function generateFilesManifest(plan, target) {
  const rows = [['rel', 'sha256', 'size']];
  for (const entry of plan) {
    const filePath = path.join(target, entry.rel);
    if (!fs.existsSync(filePath)) continue;
    const buf = fs.readFileSync(filePath);
    rows.push([entry.rel.split(path.sep).join('/'), sha256(buf), String(buf.length)]);
  }
  return rows.map((r) => r.join(',')).join('\n') + '\n';
}

function readPackageVersion() {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(PACKAGE_ROOT, 'package.json'), 'utf8'));
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function generateInstallManifest(opts) {
  const version = readPackageVersion();
  const newModules = opts.modules.length > 0 ? opts.modules : listAvailableModules();
  // Merge with existing manifest if present
  let existingModules = [];
  const existingPath = path.join(opts.target, '.rihal', '_config', 'manifest.yaml');
  if (fs.existsSync(existingPath)) {
    const text = fs.readFileSync(existingPath, 'utf8');
    let inModules = false;
    for (const line of text.split('\n')) {
      if (line.startsWith('modules:')) { inModules = true; continue; }
      if (inModules && line.trim().startsWith('-')) { existingModules.push(line.trim().slice(1).trim()); }
      else if (inModules && !line.startsWith(' ')) { inModules = false; }
    }
  }
  const allModules = [...new Set([...existingModules, ...newModules])];
  const moduleLines = allModules.map((m) => `  - ${m}`).join('\n');
  return [
    '# Rihal v2 install manifest',
    `version: ${version}`,
    `installDate: ${new Date().toISOString()}`,
    'modules:',
    moduleLines,
    'ides:',
    '  - claude-code',
    '',
  ].join('\n');
}

function sanitizeYamlValue(val) {
  return (val || '').replace(/[\n\r]/g, ' ').replace(/"/g, '\\"');
}

function generateConfigYaml(opts) {
  return [
    '# Rihal v2 project config',
    '# Generated by install-v2. Safe to edit.',
    `user_name: "${sanitizeYamlValue(opts.userName)}"`,
    `project_name: "${sanitizeYamlValue(opts.projectName)}"`,
    `communication_language: "${sanitizeYamlValue(opts.language)}"`,
    `mode: "${sanitizeYamlValue(opts.mode)}"`,
    `model_profile: "balanced"`,
    `rihal_source_path: "${sanitizeYamlValue(path.dirname(path.dirname(process.argv[1])))}/"`,
    'workflow:',
    '  research_by_default: false',
    '  plan_checker: true',
    '  post_execute_gates: true',
    '  ui_safety_gate: true',
    'git:',
    '  branching_strategy: "none"',
    '',
  ].join('\n');
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

/**
 * Main install routine. Copies files, generates manifests, writes config.
 */
function install(opts) {
  if (opts.help) { printHelp(); return 0; }

  console.log(`\n🕌 Rihal v2 installer (prototype) → ${opts.target}`);
  if (!fs.existsSync(SOURCE_ROOT)) {
    console.error(`✖ Source tree not found at ${SOURCE_ROOT}. Running from wrong dir?`);
    return 1;
  }

  // Validate IDE
  if (!['claude', 'cursor', 'gemini'].includes(opts.ide)) {
    console.error(`✖ Unknown IDE: ${opts.ide}. Supported: claude, cursor, gemini`);
    return 1;
  }

  // Gemini IDE support deferred
  if (opts.ide === 'gemini') {
    console.log(`\n⚠️  Gemini CLI install not yet implemented\n`);
    console.log(`Gemini IDE requires aggregating all agents and commands into a single GEMINI.md file.`);
    console.log(`This feature is planned but not yet available.\n`);
    console.log(`For now, use: --ide claude or --ide cursor\n`);
    return 1;
  }

  // Validate requested modules exist
  if (opts.modules.length > 0) {
    const available = listAvailableModules();
    const unknownModules = opts.modules.filter(m => !available.includes(m));
    if (unknownModules.length > 0) {
      console.error(`✖ Unknown module(s): ${unknownModules.join(', ')}`);
      console.error(`  Available modules: ${available.join(', ')}`);
      return 1;
    }
  }

  const fullPlan = buildInstallPlan(opts.ide, opts.target);
  const plan = filterPlanByModules(fullPlan, opts.modules);
  if (plan.length === 0) {
    console.error('✖ Nothing to install — install plan is empty.');
    if (opts.modules.length > 0) console.error(`  Modules requested: ${opts.modules.join(', ')}`);
    return 1;
  }
  if (opts.modules.length > 0) {
    console.log(`  Modules: ${opts.modules.join(', ')}`);
  }

  // Copy files
  let copied = 0;
  let skipped = 0;
  for (const entry of plan) {
    const destPath = path.join(opts.target, entry.rel);
    ensureDir(path.dirname(destPath));
    if (fs.existsSync(destPath) && !opts.force) {
      const existingHash = sha256(fs.readFileSync(destPath));
      const sourceHash = sha256(fs.readFileSync(entry.src));
      if (existingHash === sourceHash) { skipped++; continue; }
      if (!opts.yes) {
        console.warn(`  ⚠ ${entry.rel} differs from package version — use --force to overwrite`);
        skipped++;
        continue;
      }
    }

    // Warn if overwriting modified file
    if (fs.existsSync(destPath) && opts.force) {
      const existing = fs.readFileSync(destPath);
      const incoming = fs.readFileSync(entry.src);
      if (!existing.equals(incoming)) {
        console.log(`  ⚠ Overwriting modified file: ${destPath}`);
      }
    }

    // Read source file
    let content = fs.readFileSync(entry.src, 'utf8');

    // Convert to Cursor .mdc format if needed
    if (entry.cursor) {
      content = convertToCursorMdc(content);
    }

    // Write to destination
    fs.writeFileSync(destPath, content, 'utf8');
    if (entry.executable) fs.chmodSync(destPath, 0o755);
    copied++;
  }

  // Write .rihal/_config/manifest.yaml + agent-manifest.csv + files-manifest.csv
  const configDir = path.join(opts.target, '.rihal', '_config');
  ensureDir(configDir);
  fs.writeFileSync(path.join(configDir, 'manifest.yaml'), generateInstallManifest(opts));
  fs.writeFileSync(path.join(configDir, 'agent-manifest.csv'), generateAgentManifest(plan, opts.target));

  // Handle --reset flag: delete config.yaml and state.json if --reset is passed
  const configPath = path.join(opts.target, '.rihal', 'config.yaml');
  const stateDest = path.join(opts.target, '.rihal', 'state.json');
  let existedBefore = false;

  if (opts.reset && opts.force) {
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }
    if (fs.existsSync(stateDest)) {
      fs.unlinkSync(stateDest);
    }
  } else if (opts.force && (fs.existsSync(configPath) || fs.existsSync(stateDest))) {
    existedBefore = true;
  }

  // Write .rihal/config.yaml (user_name, project_name, language, mode)
  // Note: config.yaml is user data and should NOT be overwritten on --force (unless --reset)
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, generateConfigYaml(opts));
  }

  // Seed .rihal/state.json (skip if already exists — don't overwrite on re-install unless --reset)
  if (!fs.existsSync(stateDest)) {
    const stateSrc = path.join(SOURCE_ROOT, 'state.json');
    if (fs.existsSync(stateSrc)) {
      const now = new Date().toISOString();
      const stateContent = fs.readFileSync(stateSrc, 'utf8')
        .replace(/__PROJECT_NAME__/g, opts.projectName)
        .replace(/__INSTALL_DATE__/g, now);
      ensureDir(path.dirname(stateDest));
      fs.writeFileSync(stateDest, stateContent);
    }
  }

  // .planning/council-sessions/ empty dir
  ensureDir(path.join(opts.target, '.planning', 'council-sessions'));

  // ~/.rihal/agents/ global agents directory
  const globalAgentsDir = path.join(os.homedir(), '.rihal', 'agents');
  ensureDir(globalAgentsDir);

  // files-manifest.csv — written LAST so it includes itself's siblings
  // (but not itself, since hashing a file referencing its own hash is
  // self-referential nonsense).
  fs.writeFileSync(
    path.join(configDir, 'files-manifest.csv'),
    generateFilesManifest(plan, opts.target),
  );

  // Summary
  console.log('');
  console.log(`  Installed: ${copied} file${copied === 1 ? '' : 's'}`);
  if (skipped > 0) console.log(`  Skipped:   ${skipped} (already present, unchanged)`);
  if (opts.force && existedBefore) {
    console.log('  ⚠ Preserved: .rihal/config.yaml and .rihal/state.json');
    console.log('     Pass --reset to wipe and re-init those too.');
  }
  console.log('');
  console.log(`  Installed for IDE: ${opts.ide}`);
  console.log(`  Language: ${opts.language}  (change in .rihal/config.yaml → communication_language)`);
  console.log(`  Mode: ${opts.mode}  (guided=confirm at gates, yolo=autonomous)`);
  console.log(`  Model profile: balanced`);
  console.log('');
  console.log('  Agents installed (first-class subagents):');
  console.log('    🧭 rihal-sadiq   — Director of Strategy');
  console.log('    🏗️  rihal-waleed  — CTO');
  console.log('    🛡️  rihal-fatima  — QA Lead');
  console.log('');
  console.log('  Slash commands installed:');
  console.log('    /rihal:council  — parallel multi-agent council');
  console.log('    /rihal:status   — project state dashboard');
  console.log('    /rihal:insert-phase — insert decimal phase for urgent work');
  console.log('');
  console.log('  Next:');
  console.log(`    cd ${opts.target}`);
  console.log('    claude  # start Claude Code (or restart if already open)');
  console.log('    /rihal:init                 # ← run this first to configure');
  console.log('    /rihal:do                   # interactive command picker');
  console.log('    /rihal:council <question>   # multi-agent strategic answer');
  console.log('');
  console.log('  ⚠ If Claude Code is already running, start a new session to load commands.');
  console.log('');
  return 0;
}

function main() {
  const argv = process.argv.slice(2);
  const opts = parseArgs(argv);
  try {
    process.exit(install(opts));
  } catch (err) {
    if (err.code === 'EACCES' || err.code === 'EPERM') {
      console.error(`✖ Permission denied: ${err.path || err.message}`);
      process.exit(1);
    }
    if (err.code === 'ENOENT') {
      console.error(`✖ Path not found: ${err.path || err.message}`);
      process.exit(1);
    }
    console.error(`✖ Install failed: ${err.message}`);
    if (process.env.DEBUG) console.error(err.stack);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { parseArgs, buildInstallPlan, install };
