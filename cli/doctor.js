/**
 * rihal-code doctor — preflight + compliance checks
 *
 * Two sections:
 *   1. Preflight — environment checks that affect whether install/sync will work
 *      (node version, writable .rihal/, model-profiles.json validity, optional
 *      git/gh availability, agent manifest drift)
 *   2. Package compliance — 5-component skill standard on the package source
 *
 * Exit codes:
 *   0 — everything green (some warn-only items may still have printed ⚠)
 *   1 — any hard failure (preflight BLOCK or compliance failures)
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { verifyInstall, formatReport } = require('./lib/manifest.cjs');
const { checkStaleness } = require('./lib/memory-bank.cjs');
const {
  parseFrontmatter,
  validateSkillFrontmatter,
  validateAgentFrontmatter,
} = require('./lib/schemas.cjs');

// ---------- Shared helpers ----------

function findSkillFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findSkillFiles(full));
    } else if (entry.isFile() && entry.name === 'SKILL.md') {
      results.push(full);
    }
  }
  return results;
}

/**
 * One-level scan of `rihal/agents/` for `.md` files. There is no existing
 * agent-file iterator (findSkillFiles matches only files named SKILL.md),
 * so the schema-validation pass needs its own shallow glob.
 */
function findAgentFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.md'))
    .map((e) => path.join(dir, e.name));
}

function checkCompliance(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const missing = [];
  if (!/^name:/m.test(content)) missing.push('name');
  if (!/^description:/m.test(content)) missing.push('description');
  if (!/^## Output Format/m.test(content)) missing.push('Output Format');
  if (!/^## Examples/m.test(content)) missing.push('Examples');
  return missing;
}

function isWritable(dir) {
  try {
    fs.accessSync(dir, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function commandAvailable(cmd) {
  // 'which' is POSIX-only; 'where' is Windows. Try both so this works cross-platform.
  const checker = process.platform === 'win32' ? 'where' : 'which';
  const result = spawnSync(checker, [cmd], { stdio: 'ignore' });
  return result.status === 0;
}

// ---------- Preflight checks ----------

/**
 * Each check returns { label, status, message }.
 * status ∈ 'ok' | 'warn' | 'fail'.
 *
 * ok   — no output beyond the ✓
 * warn — optional capability missing; non-fatal
 * fail — hard problem; exits non-zero
 */
function runPreflight(cwd, packageRoot) {
  const checks = [];

  // 1. Node version ≥ 18 (from package.json engines)
  const nodeVersion = process.versions.node;
  const major = parseInt(nodeVersion.split('.')[0], 10);
  checks.push({
    label: 'Node.js ≥ 18',
    status: major >= 18 ? 'ok' : 'fail',
    message: `v${nodeVersion}${major < 18 ? ' — upgrade to 18 LTS or newer' : ''}`,
  });

  // 2. .rihal/ state directory — only check if project is initialized
  const rihalDir = path.join(cwd, '.rihal');
  if (fs.existsSync(rihalDir)) {
    checks.push({
      label: '.rihal/ writable',
      status: isWritable(rihalDir) ? 'ok' : 'fail',
      message: rihalDir,
    });
  } else {
    checks.push({
      label: '.rihal/ state',
      status: 'warn',
      message: 'not initialized in this directory (run `rcode install`)',
    });
  }

  // 3. Package model-profiles.json parses and has expected profiles
  const profilesPath = path.join(packageRoot, 'rihal/config/model-profiles.json');
  if (fs.existsSync(profilesPath)) {
    try {
      const profiles = JSON.parse(fs.readFileSync(profilesPath, 'utf8'));
      const expected = ['quality', 'balanced', 'budget', 'inherit'];
      const names = Object.keys(profiles.profiles || profiles);
      const missing = expected.filter((p) => !names.includes(p));
      if (missing.length === 0) {
        checks.push({
          label: 'model-profiles.json',
          status: 'ok',
          message: `${names.length} profiles (${names.join(', ')})`,
        });
      } else {
        checks.push({
          label: 'model-profiles.json',
          status: 'fail',
          message: `missing expected profiles: ${missing.join(', ')}`,
        });
      }
    } catch (e) {
      checks.push({
        label: 'model-profiles.json',
        status: 'fail',
        message: `invalid JSON: ${e.message}`,
      });
    }
  } else {
    checks.push({
      label: 'model-profiles.json',
      status: 'fail',
      message: 'missing from package',
    });
  }

  // 4. git availability — warn-only (many features don't need it)
  checks.push({
    label: 'git CLI',
    status: commandAvailable('git') ? 'ok' : 'warn',
    message: commandAvailable('git') ? 'available' : 'not found (some features disabled)',
  });

  // 5. gh availability — warn-only (only github-sync needs it)
  checks.push({
    label: 'gh CLI',
    status: commandAvailable('gh') ? 'ok' : 'warn',
    message: commandAvailable('gh')
      ? 'available (github-sync ready)'
      : 'not found (github-sync unavailable)',
  });

  // 6. Agent manifest drift (only if .rihal/ is initialized — indicates installed editors)
  if (fs.existsSync(rihalDir)) {
    const editors = [];
    if (fs.existsSync(path.join(cwd, '.claude/skills'))) editors.push('claude');
    if (fs.existsSync(path.join(cwd, '.cursor/rules'))) editors.push('cursor');
    if (fs.existsSync(path.join(cwd, '.windsurf/rules'))) editors.push('windsurf');
    if (fs.existsSync(path.join(cwd, '.antigravity/agents'))) editors.push('antigravity');

    if (editors.length > 0) {
      const { reports, hasDrift } = verifyInstall(cwd, packageRoot, editors);
      if (hasDrift) {
        checks.push({
          label: 'Agent manifest',
          status: 'fail',
          message: `drift detected across ${editors.join(', ')}`,
          detail: formatReport(reports),
        });
      } else {
        const totals = reports
          .map((r) => `${r.editor}:${r.installedCount}`)
          .join(' ');
        checks.push({
          label: 'Agent manifest',
          status: 'ok',
          message: totals,
        });
      }
    }

    // 7. Memory bank freshness (warn-only — stale memory bank doesn't
    // break anything, it just degrades answer quality over time).
    const staleness = checkStaleness(cwd);
    if (staleness.status === 'fresh') {
      checks.push({
        label: 'Memory bank',
        status: 'ok',
        message: 'fresh',
      });
    } else if (staleness.status === 'never') {
      checks.push({
        label: 'Memory bank',
        status: 'warn',
        message: 'never initialized (run /rihal-init to populate)',
      });
    } else {
      checks.push({
        label: 'Memory bank',
        status: 'warn',
        message: `STALE — ${staleness.reasons[0]}${staleness.reasons.length > 1 ? ` (+${staleness.reasons.length - 1} more)` : ''}`,
      });
    }
  }

  return checks;
}

function printChecks(checks) {
  let failures = 0;
  for (const c of checks) {
    const symbol = c.status === 'ok' ? '✓' : c.status === 'warn' ? '⚠' : '✗';
    console.log(`   ${symbol} ${c.label.padEnd(22)} ${c.message}`);
    if (c.detail) {
      console.log(c.detail);
    }
    if (c.status === 'fail') failures++;
  }
  return failures;
}

// ---------- Package compliance ----------

function runCompliance(packageRoot) {
  const skillDirs = [
    path.join(packageRoot, 'rihal/skills/agents'),
    path.join(packageRoot, 'rihal/skills/actions'),
  ];

  let totalSkills = 0;
  let failing = 0;
  const problems = [];

  for (const dir of skillDirs) {
    const files = findSkillFiles(dir);
    for (const file of files) {
      totalSkills++;
      const missing = checkCompliance(file);
      if (missing.length > 0) {
        failing++;
        const rel = path.relative(packageRoot, file);
        problems.push({ file: rel, missing });
      }
    }
  }

  if (problems.length > 0) {
    console.log(`   ✗ ${failing} / ${totalSkills} skills are non-compliant:\n`);
    for (const p of problems) {
      console.log(`     ${p.file}`);
      console.log(`       missing: ${p.missing.join(', ')}`);
    }
  } else {
    console.log(
      `   ✓ All ${totalSkills} skills compliant with 5-component standard`
    );
  }

  return failing;
}

// ---------- Schema validation ----------

/**
 * Validate SKILL.md and agent frontmatter against the zod schemas in
 * cli/lib/schemas.cjs (issue #747). Hard failures (missing name, too few
 * trigger phrases, missing negative boundary, missing tools) count toward
 * the non-zero exit path; advisory warnings (e.g. >12 trigger phrases) just
 * print a ⚠.
 *
 * @returns {number} count of artifacts with hard failures
 */
function runSchemaValidation(packageRoot) {
  const skillDirs = [
    path.join(packageRoot, 'rihal/skills/agents'),
    path.join(packageRoot, 'rihal/skills/actions'),
  ];

  let totalSkills = 0;
  let totalAgents = 0;
  let failing = 0;
  let warned = 0;

  for (const dir of skillDirs) {
    for (const file of findSkillFiles(dir)) {
      totalSkills++;
      const { frontmatter, body } = parseFrontmatter(fs.readFileSync(file, 'utf8'));
      const result = validateSkillFrontmatter(frontmatter, body);
      const rel = path.relative(packageRoot, file);
      if (!result.ok) {
        failing++;
        console.log(`   ✗ ${rel}`);
        for (const err of result.errors) console.log(`       ${err}`);
      }
      if (result.warnings && result.warnings.length > 0) {
        warned++;
        for (const w of result.warnings) console.log(`   ⚠ ${rel}: ${w}`);
      }
    }
  }

  for (const file of findAgentFiles(path.join(packageRoot, 'rihal/agents'))) {
    totalAgents++;
    const { frontmatter } = parseFrontmatter(fs.readFileSync(file, 'utf8'));
    const result = validateAgentFrontmatter(frontmatter);
    if (!result.ok) {
      failing++;
      const rel = path.relative(packageRoot, file);
      console.log(`   ✗ ${rel}`);
      for (const err of result.errors) console.log(`       ${err}`);
    }
  }

  if (failing === 0) {
    console.log(
      `   ✓ ${totalSkills} skill + ${totalAgents} agent frontmatter blocks pass schema validation` +
        (warned > 0 ? ` (${warned} with advisory warnings)` : ''),
    );
  } else {
    console.log(`   ✗ ${failing} artifact(s) failed schema validation`);
  }

  return failing;
}

// ---------- Duplicate-installation check ----------

/**
 * Detect rcode/rihal-code installations across all known package managers.
 * Multiple installs cause duplicate slash commands in Claude Code (#637-#644).
 * Returns { count, installs[], warnings[] }.
 */
function checkDuplicateInstalls() {
  const os = require('os');
  const home = os.homedir();
  const installs = [];

  // Resolve every global node_modules dir we know about.
  const dirs = [];
  for (const cmd of [['npm', ['root', '-g']], ['pnpm', ['root', '-g']]]) {
    try {
      const r = spawnSync(cmd[0], cmd[1], { encoding: 'utf8' });
      if (r.status === 0 && r.stdout.trim()) dirs.push({ manager: cmd[0], dir: r.stdout.trim() });
    } catch { /* not installed */ }
  }
  // Also scan all nvm node versions — npm root -g only covers the active one.
  const nvmRoot = path.join(home, '.nvm', 'versions', 'node');
  if (fs.existsSync(nvmRoot)) {
    for (const v of fs.readdirSync(nvmRoot)) {
      const dir = path.join(nvmRoot, v, 'lib', 'node_modules');
      if (fs.existsSync(dir) && !dirs.some(d => d.dir === dir)) {
        dirs.push({ manager: `nvm/${v}`, dir });
      }
    }
  }

  for (const { manager, dir } of dirs) {
    for (const scope of ['@hanzlaa', '@hanzlahabib']) {
      const scopeDir = path.join(dir, scope);
      if (!fs.existsSync(scopeDir)) continue;
      for (const pkg of fs.readdirSync(scopeDir)) {
        if (pkg === 'rcode' || pkg === 'rihal-code' || pkg.startsWith('rihal')) {
          let version = 'unknown';
          try {
            const pkgJson = JSON.parse(fs.readFileSync(path.join(scopeDir, pkg, 'package.json'), 'utf8'));
            version = pkgJson.version;
          } catch {}
          installs.push({ manager, scope, pkg, version, dir: path.join(scopeDir, pkg) });
        }
      }
    }
  }

  return { count: installs.length, installs };
}

function printDuplicateChecks(result) {
  if (result.count === 0) {
    console.log(`   ✓ No global rcode installs found`);
    return 0;
  }
  if (result.count === 1) {
    const i = result.installs[0];
    console.log(`   ✓ Single global install: [${i.manager}] ${i.scope}/${i.pkg}@${i.version}`);
    return 0;
  }
  // Multiple installs — DUPLICATE — this causes the duplicate-commands bug.
  console.log(`   ✗ ${result.count} global installs detected — this causes duplicate slash commands!`);
  for (const i of result.installs) {
    console.log(`     [${i.manager}] ${i.scope}/${i.pkg}@${i.version}`);
    console.log(`       ${i.dir}`);
  }
  console.log(`\n     Fix: rcode nuke --yes && npm install -g @hanzlaa/rcode`);
  return 1;
}

// ---------- Entrypoint ----------

module.exports = function doctor(args, { packageRoot }) {
  const cwd = process.cwd();

  console.log(`\n🕌 Rihal Code — Doctor\n`);

  console.log(`Preflight:`);
  const checks = runPreflight(cwd, packageRoot);
  const preflightFailures = printChecks(checks);

  console.log(`\nDuplicate installations:`);
  const dupResult = checkDuplicateInstalls();
  const duplicateFailures = printDuplicateChecks(dupResult);

  console.log(`\nPackage compliance:`);
  const complianceFailures = runCompliance(packageRoot);

  console.log(`\nArtifact schema validation:`);
  const schemaFailures = runSchemaValidation(packageRoot);

  const totalFailures =
    preflightFailures + complianceFailures + duplicateFailures + schemaFailures;
  console.log();
  if (totalFailures === 0) {
    console.log(`✅ All checks passed.`);
  } else {
    console.log(`❌ ${totalFailures} check(s) failed — see above.`);
  }
  console.log();
  process.exit(totalFailures > 0 ? 1 : 0);
};
