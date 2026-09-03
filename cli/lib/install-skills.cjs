/**
 * cli/lib/install-skills.cjs — v1-style skills installer, brain scaffold
 * seeding, and markdown frontmatter parsing.
 *
 * Split out of cli/install.js (#1066 Phase 1) — mechanical move, no
 * behavior change.
 */

const fs = require('fs');
const path = require('path');
const { safeRmSync } = require('./fsutil.cjs');
const { homedir } = require('./homedir.cjs');
const { copyDirRecursive } = require('./install-scaffold.cjs');

/**
 * Install brain scaffold (sources.yaml + README.md) into .rcode/brain/ on target.
 * Actual brain content lands after `brain pull` runs.
 * Closes #188 — previously the package's rcode/brain/sources.yaml was never
 * copied to the target at all, leaving brain pull permanently broken.
 */
function installBrainScaffold(packageRoot, target) {
  const srcDir = path.join(packageRoot, 'rcode', 'brain');
  const destDir = path.join(target, '.rcode', 'brain');
  fs.mkdirSync(destDir, { recursive: true });
  let copied = 0;
  for (const name of ['sources.yaml', 'README.md']) {
    const src = path.join(srcDir, name);
    const dest = path.join(destDir, name);
    if (fs.existsSync(src) && !fs.existsSync(dest)) {
      fs.copyFileSync(src, dest);
      copied++;
    }
  }
  // Also pre-seed the best-practices subfolder from the package's
  // rcode/skills/_shared/ so a fresh install has working brain content
  // immediately, even before brain pull runs against real upstream URLs.
  const sharedSrc = path.join(packageRoot, 'rcode', 'skills', '_shared');
  if (fs.existsSync(sharedSrc)) {
    const bpDest = path.join(destDir, 'best-practices');
    fs.mkdirSync(bpDest, { recursive: true });
    for (const entry of fs.readdirSync(sharedSrc, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith('.md')) {
        const dest = path.join(bpDest, entry.name);
        if (!fs.existsSync(dest)) {
          fs.copyFileSync(path.join(sharedSrc, entry.name), dest);
          copied++;
        }
      }
    }
  }
  return copied;
}

/**
 * Install v1-style skills into the target project.
 *
 * User-facing skills  → .claude/skills/rcode-{name}   (phrase-activated, visible as slash commands)
 * Internal skills     → .rcode/skills/rcode-{name}    (utility libs called by other skills, NOT in
 *                                                       .claude/skills/ so they don't pollute the menu)
 *
 * A skill is marked internal by adding `internal: true` to its SKILL.md frontmatter.
 */
function installSkills(packageRoot, target, options = {}) {
  const skillsSource = path.join(packageRoot, 'rcode/skills');
  const skillsDest = path.join(target, '.claude/skills');
  const internalDest = path.join(target, '.rcode/skills');

  if (!fs.existsSync(skillsSource)) return { count: 0, skippedGlobal: 0 };
  fs.mkdirSync(skillsDest, { recursive: true });
  fs.mkdirSync(internalDest, { recursive: true });

  // Issue #679: when ~/.claude/skills/<name>/ already exists with the rcode-
  // prefix, Claude Code reads from BOTH global and project, showing every
  // /rcode-* twice in the slash picker. Skip the project copy for any rcode-*
  // skill that already lives in the global skills dir.
  const globalSkillsDir = path.join(homedir(), '.claude', 'skills');
  const globalRcodeSkills = (options.skipGlobalDuplicates && fs.existsSync(globalSkillsDir))
    ? new Set(fs.readdirSync(globalSkillsDir).filter(n => n.startsWith('rcode-')))
    : new Set();

  let count = 0;
  let skippedGlobal = 0;

  const _internalSkillCache = new Map();
  // `user-invocable: true` WINS over `internal: true`.
  //
  // These two flags contradict each other and 36 of the 38 internal skills
  // declared both. The installer read only `internal`, so every one of those
  // skills went to .rcode/skills/ instead of .claude/skills/ — which means the
  // model never saw their descriptions and they could never auto-activate. They
  // worked only if the user typed the exact slash command.
  //
  // That is how "review this PR <url>" reached the built-in code-review skill
  // instead of rcode's: rcode's reviewer was invisible, not out-competed.
  //
  // A skill that declares user-invocable, writes its description for activation
  // ("Activates when the user says..."), and lists trigger phrases is user-facing
  // by every signal it gives. `internal` is for genuine utility libraries that
  // other skills call — and those do not claim to be user-invocable.
  function isInternalSkill(skillDir) {
    if (_internalSkillCache.has(skillDir)) return _internalSkillCache.get(skillDir);
    const skillMd = path.join(skillDir, 'SKILL.md');
    if (!fs.existsSync(skillMd)) { _internalSkillCache.set(skillDir, false); return false; }
    const text = fs.readFileSync(skillMd, 'utf8');
    const internal = /^internal:\s*true\s*$/m.test(text);
    const userInvocable = /^user-invocable:\s*true\s*$/m.test(text);
    const result = internal && !userInvocable;
    _internalSkillCache.set(skillDir, result);
    return result;
  }

  function hasLocalOverride(destDir) {
    if (!fs.existsSync(destDir)) return false;
    try {
      return fs.readdirSync(destDir).some(f => f.endsWith('.local.md'));
    } catch { return false; }
  }

  function walkForSkills(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const src = path.join(dir, entry.name);
      const hasSkillMd = fs.existsSync(path.join(src, 'SKILL.md'));
      if (hasSkillMd) {
        const destName = entry.name.startsWith('rcode-')
          ? entry.name
          : `rcode-${entry.name}`;
        const internal = isInternalSkill(src);
        const dest = internal
          ? path.join(internalDest, destName)   // internal → .rcode/skills/
          : path.join(skillsDest, destName);     // user-facing → .claude/skills/

        // Skip user-facing (non-internal) rcode-* skills when the same name
        // exists globally — UNLESS the user has a *.local.md override on the
        // project copy, in which case we always preserve their customization.
        if (!internal && globalRcodeSkills.has(destName) && !hasLocalOverride(dest)) {
          // Also remove the existing project copy (left over from previous
          // installs that didn't dedup) so it stops showing in the picker.
          if (fs.existsSync(dest)) {
            // #688 — safeRmSync refuses to traverse symlinks pointing outside target.
            try { safeRmSync(dest, target); } catch { /* non-fatal */ }
          }
          skippedGlobal++;
          continue;
        }
        copyDirRecursive(src, dest);
        count++;
      } else {
        walkForSkills(src);
      }
    }
  }

  for (const bucket of ['agents', 'actions', 'core']) {
    walkForSkills(path.join(skillsSource, bucket));
  }

  return { count, skippedGlobal };
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

module.exports = {
  installBrainScaffold,
  installSkills,
  parseFrontmatter,
};
