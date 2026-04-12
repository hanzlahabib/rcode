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
    yes: false,
    userName: os.userInfo().username || 'User',
    projectName: null,
    language: 'English',
    mode: 'guided',
    help: false,
    modules: [],  // --module core --module execution or empty = all
  };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg === '--force') opts.force = true;
    else if (arg === '--yes' || arg === '-y') opts.yes = true;
    else if (arg === '--user') opts.userName = argv[++i];
    else if (arg === '--project') opts.projectName = argv[++i];
    else if (arg === '--language') opts.language = argv[++i];
    else if (arg === '--mode') opts.mode = argv[++i];
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
  --yes              non-interactive, accept defaults
  --user <name>      set user_name in config.yaml (default: $USER)
  --project <name>   set project_name (default: basename of target-dir)
  --language <lang>  set communication_language (default: English)
  --mode <guided|yolo> default mode (default: guided)
  --help             this text

Installs:
  target/.rihal/          config, workflows, references, bin, manifests
  target/.claude/agents/  first-class Rihal subagents (rihal-sadiq, rihal-waleed, rihal-fatima)
  target/.claude/commands/rihal/  slash commands (/rihal:council)
  target/.planning/       artifact output dir
`);
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
 */
function buildInstallPlan() {
  const plan = [];

  // .rihal/workflows/
  for (const f of walkFiles(path.join(SOURCE_ROOT, 'workflows'))) {
    const rel = path.relative(path.join(SOURCE_ROOT, 'workflows'), f);
    plan.push({ src: f, rel: path.join('.rihal', 'workflows', rel) });
  }

  // .rihal/references/
  for (const f of walkFiles(path.join(SOURCE_ROOT, 'references'))) {
    const rel = path.relative(path.join(SOURCE_ROOT, 'references'), f);
    plan.push({ src: f, rel: path.join('.rihal', 'references', rel) });
  }

  // .rihal/bin/
  for (const f of walkFiles(path.join(SOURCE_ROOT, 'bin'))) {
    const rel = path.relative(path.join(SOURCE_ROOT, 'bin'), f);
    plan.push({ src: f, rel: path.join('.rihal', 'bin', rel), executable: f.endsWith('.cjs') });
  }

  // .claude/agents/
  for (const f of walkFiles(path.join(SOURCE_ROOT, 'agents'))) {
    const rel = path.relative(path.join(SOURCE_ROOT, 'agents'), f);
    plan.push({ src: f, rel: path.join('.claude', 'agents', rel) });
  }

  // .claude/commands/rihal/
  for (const f of walkFiles(path.join(SOURCE_ROOT, 'commands'))) {
    const rel = path.relative(path.join(SOURCE_ROOT, 'commands'), f);
    plan.push({ src: f, rel: path.join('.claude', 'commands', 'rihal', rel) });
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
  for (const entry of plan) {
    if (!entry.rel.startsWith(path.join('.claude', 'agents'))) continue;
    const filePath = path.join(target, entry.rel);
    const text = fs.readFileSync(filePath, 'utf8');
    const { frontmatter } = parseFrontmatter(text);
    const name = frontmatter.name || path.basename(entry.rel, '.md');
    const bareId = name.replace(/^rihal-/, '');
    const desc = (frontmatter.description || '').replace(/"/g, '""');
    rows.push([
      bareId,
      entry.rel,
      name,
      `"${desc}"`,
      frontmatter.color || '',
    ]);
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
  const modules = opts.modules.length > 0 ? opts.modules : listAvailableModules();
  const moduleLines = modules.map((m) => `  - ${m}`).join('\n');
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

function generateConfigYaml(opts) {
  return [
    '# Rihal v2 project config',
    '# Generated by install-v2. Safe to edit.',
    `user_name: ${opts.userName}`,
    `project_name: ${opts.projectName}`,
    `communication_language: ${opts.language}`,
    `mode: ${opts.mode}`,
    '',
  ].join('\n');
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

  const fullPlan = buildInstallPlan();
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
    fs.copyFileSync(entry.src, destPath);
    if (entry.executable) fs.chmodSync(destPath, 0o755);
    copied++;
  }

  // Write .rihal/_config/manifest.yaml + agent-manifest.csv + files-manifest.csv
  const configDir = path.join(opts.target, '.rihal', '_config');
  ensureDir(configDir);
  fs.writeFileSync(path.join(configDir, 'manifest.yaml'), generateInstallManifest(opts));
  fs.writeFileSync(path.join(configDir, 'agent-manifest.csv'), generateAgentManifest(plan, opts.target));

  // Write .rihal/config.yaml (user_name, project_name, language, mode)
  const configPath = path.join(opts.target, '.rihal', 'config.yaml');
  if (!fs.existsSync(configPath) || opts.force) {
    fs.writeFileSync(configPath, generateConfigYaml(opts));
  }

  // Seed .rihal/state.json (skip if already exists — don't overwrite on re-install)
  const stateDest = path.join(opts.target, '.rihal', 'state.json');
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
  console.log('');
  console.log('  Agents installed (first-class subagents):');
  console.log('    🧭 rihal-sadiq   — Director of Strategy');
  console.log('    🏗️  rihal-waleed  — CTO');
  console.log('    🛡️  rihal-fatima  — QA Lead');
  console.log('');
  console.log('  Slash commands installed:');
  console.log('    /rihal:council  — parallel multi-agent council');
  console.log('    /rihal:status   — project state dashboard');
  console.log('');
  console.log('  Next:');
  console.log(`    cd ${opts.target}`);
  console.log('    claude  # start Claude Code');
  console.log('    /rihal:council should I rewrite this auth layer?');
  console.log('');
  return 0;
}

function main() {
  const argv = process.argv.slice(2);
  const opts = parseArgs(argv);
  process.exit(install(opts));
}

if (require.main === module) main();

module.exports = { parseArgs, buildInstallPlan, install };
