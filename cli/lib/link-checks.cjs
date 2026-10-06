/**
 * Generic local-reference and skill-reference validators for rcode skill
 * documentation.
 *
 * Extends `rcode doctor`'s package-compliance pass with three checks, run
 * per skill directory (any directory containing a SKILL.md):
 *
 *   1. Local file references — markdown links (`[text](path)`) and
 *      backtick-wrapped tokens ending in `.md` or `.cjs` must resolve to a
 *      real file on disk. Those two extensions are the only ones this
 *      package's own skills use for genuine cross-file references
 *      (doc-to-doc, doc-to-script); every other extension mentioned in
 *      these docs (`.ts`, `.tsx`, `.json`, `.liquid`, `.mjs`, image/asset
 *      files, URL paths, npm package names, `robots.txt`, `sitemap.xml`…)
 *      is an illustrative example of the *consumer* project's file layout
 *      or a third-party web artifact being audited — never a file that
 *      lives in this repo, so checking it would only produce noise.
 *   2. Skill-name references — a small set of idioms this package's own
 *      skills use to declare "this doc depends on skill X" (a
 *      "Related Skill(s):" line, "Delegate ... to", a "Recommended/Next
 *      Best Skill" bullet or heading, or a table whose header names a
 *      "Skill" column) must name a skill or agent that actually exists.
 *   3. Orphaned reference modules — every file under a skill's own
 *      `references/` directory must be reachable from its SKILL.md,
 *      directly or transitively, via check (1)'s local file references.
 *
 * Principled exclusions — a positive shape test, not a growing denylist:
 *   - http(s)/mailto links and bare `#anchor` links are external or
 *     in-page; there is no local file to check.
 *   - A reference is only checked at all when it is INTERNAL-shaped: a bare
 *     filename, a path whose directory is (or contains, once any leading
 *     sibling-skill-name segment is stripped) one of this package's own
 *     `references/`, `rules/`, `templates/`, `scripts/` conventions, or an
 *     explicit repo-relative path starting with `rcode/`. Every genuine
 *     cross-doc reference in this tree already takes one of those shapes.
 *     A path whose directory is anything else (`research/`, `docs/`,
 *     `content/`, `src/`, `.rcode/`, `.planning/`, `memory/`, `.agents/`,
 *     `.claude/`, …) is the CONSUMER project's own file layout — a folder
 *     these skills scaffold or read INSIDE whatever project they run in,
 *     never a file that exists in this repo — so it is out of scope for a
 *     "does this file exist here" check.
 *   - A token containing `<`, `>`, `[`, `]`, or `*` is a template
 *     placeholder or glob pattern for a dynamically-named future file
 *     (`briefs/<slug>.md`, `templates/local-*.md`), not a concrete path.
 *   - Bullets labeled Plugin/Browser/Data/Tools inside an "Integration"
 *     section name external tools or third-party plugins (e.g.
 *     `claude-seo:seo-cluster`, `browser-harness`), not a skill this
 *     package ships — they are excluded from the skill-name check by
 *     their own label, not by name.
 *   - A skill's own `composes_with:` frontmatter array is a structured,
 *     self-declared list of skill dependencies (some of which are globally
 *     installed Claude Code skills this package doesn't ship, e.g.
 *     `autonomous-fix-campaign`); every name listed there is treated as
 *     acknowledged, not guessed.
 *
 * An internal-shaped `.md`/`.cjs` reference that doesn't resolve next to
 * the referencing file gets one more chance: a basename search across the
 * whole bucket's skill tree AND `rcode/templates/<bucket>/` (this
 * package's convention for consumer-project memory-bank templates, e.g.
 * `rcode/templates/seo/STATE.md`) — this is what makes a cross-skill
 * reference like seo-os's `` `TOOL-ACCURACY.md` `` (which actually lives
 * under `seo-astro-implementation`'s sibling `seo-os` skill) resolve
 * correctly. Only if that also fails is it broken.
 *
 * No side effects; every export is a pure function over strings/paths.
 */

const fs = require('fs');
const path = require('path');
const { parseFrontmatter } = require('./schemas.cjs');

// ---------- Skill discovery ----------

/**
 * Repo-relative path, normalized to forward slashes regardless of platform.
 * `path.relative()` returns `\`-separated segments on Windows, but every
 * identifier this module emits (skill dirs, broken-ref file paths,
 * orphaned-reference paths) is displayed in `doctor` output and compared
 * against the `rcode/skills/<bucket>/<skill>` spelling used everywhere else
 * in this repo's docs and tests — so it must be posix-styled on every OS.
 */
function toRepoRelative(from, to) {
  return path.relative(from, to).split(path.sep).join('/');
}

/**
 * Recursively find every directory that contains a SKILL.md under `root`.
 * Skills nest at different depths across buckets (agents/ is flat,
 * actions/ is two levels, seo/ is flat) so this walks unbounded.
 */
function findSkillDirs(root) {
  const results = [];
  if (!fs.existsSync(root)) return results;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const full = path.join(root, entry.name);
    if (fs.existsSync(path.join(full, 'SKILL.md'))) {
      results.push(full);
    } else {
      results.push(...findSkillDirs(full));
    }
  }
  return results;
}

/** Recursively collect every file under `dir` whose name matches `re`. */
function findFiles(dir, re) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findFiles(full, re));
    } else if (entry.isFile() && re.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

const MD_RE = /\.md$/i;
const MD_OR_CJS_RE = /\.(md|cjs)$/i;

/** Recursively collect every `.md` file under `dir` (skill body + references/rules/templates). */
function findMarkdownFiles(dir) {
  return findFiles(dir, MD_RE);
}

// ---------- Known skill/agent identifiers ----------

/**
 * Build the set of valid skill/agent identifiers this package ships, so a
 * skill-name reference can be checked without guessing. Each identifier is
 * stored lowercased, both with and without its `rcode-` prefix, because the
 * docs use both forms interchangeably (`seo-audit` vs `rcode-seo-audit`).
 * Also registers every skill's self-declared `composes_with:` dependencies
 * (see module doc) as acknowledged, whether or not they resolve to a skill
 * this package ships.
 */
function buildKnownIdentifiers(packageRoot) {
  const known = new Set();
  const add = (name) => {
    if (!name || typeof name !== 'string') return;
    const n = name.trim().toLowerCase();
    if (!n) return;
    known.add(n);
    known.add(n.startsWith('rcode-') ? n.slice('rcode-'.length) : `rcode-${n}`);
  };

  // `parseFrontmatter` is a flat parser and doesn't descend into nested
  // mappings (this package's `composes_with` is often nested under
  // `metadata:`), so its self-declared dependencies are pulled with a
  // dedicated regex over the raw frontmatter block instead of relying on
  // the parsed object shape.
  const registerComposesWith = (content) => {
    const fmBlock = content.startsWith('---\n') ? content.slice(4, content.indexOf('\n---', 4)) : '';
    const m = fmBlock.match(/composes_with:\s*\[([^\]]*)\]/);
    if (!m) return;
    for (const item of m[1].split(',')) {
      add(item.trim().replace(/^["']|["']$/g, ''));
    }
  };

  const registerFrontmatter = (frontmatter, content) => {
    add(frontmatter.name);
    registerComposesWith(content);
  };

  const skillsRoot = path.join(packageRoot, 'rcode/skills');
  for (const dir of findSkillDirs(skillsRoot)) {
    add(path.basename(dir));
    try {
      const content = fs.readFileSync(path.join(dir, 'SKILL.md'), 'utf8');
      const { frontmatter } = parseFrontmatter(content);
      registerFrontmatter(frontmatter, content);
    } catch { /* unreadable frontmatter — dir-name form still registered */ }
  }

  // Slash commands are valid skill-ref targets too (`rcode-new-milestone`).
  const commandsRoot = path.join(packageRoot, 'rcode/commands');
  if (fs.existsSync(commandsRoot)) {
    for (const f of fs.readdirSync(commandsRoot)) {
      if (f.endsWith('.md')) add(path.basename(f, '.md'));
    }
  }

  const agentsRoot = path.join(packageRoot, 'rcode/agents');
  if (fs.existsSync(agentsRoot)) {
    for (const f of fs.readdirSync(agentsRoot)) {
      if (!f.endsWith('.md')) continue;
      add(path.basename(f, '.md'));
      try {
        const content = fs.readFileSync(path.join(agentsRoot, f), 'utf8');
        const { frontmatter } = parseFrontmatter(content);
        registerFrontmatter(frontmatter, content);
      } catch { /* unreadable frontmatter — file-name form still registered */ }
    }
  }

  return known;
}

// ---------- Local file references ----------

function isExternalOrInPage(ref) {
  return /^(https?:|mailto:|#)/i.test(ref);
}

/** A template placeholder or glob — describes a dynamically-named future file, not a concrete path. */
function isPlaceholderOrGlob(ref) {
  return /[<>[\]*{}]/.test(ref);
}

// The only directory names this package's own skills use for genuine
// internal cross-references (a module's own reference/rule/template/script
// folder, optionally reached through one leading sibling-skill-name segment,
// e.g. `seo-growth-orchestrator/rules/backlinks.md`).
const INTERNAL_DIRS = new Set(['references', 'rules', 'templates', 'scripts']);

/**
 * True when `ref`'s shape matches this package's own cross-reference
 * conventions (see module doc) rather than the consumer project's file
 * layout. A bare filename always qualifies; a path qualifies if any of its
 * directory segments is a known internal dir, or if it's spelled fully
 * repo-relative from `rcode/`.
 */
function looksInternal(ref) {
  if (!ref.includes('/')) return true;
  if (ref.startsWith('rcode/')) return true;
  const dirSegments = ref.split('/').slice(0, -1);
  return dirSegments.some((seg) => INTERNAL_DIRS.has(seg));
}

/**
 * Extract candidate local file references from markdown content:
 *   - `[text](href)` links, href only
 *   - backtick-wrapped tokens ending in `.md` or `.cjs`
 * Excludes external URLs, in-page anchors, template placeholders/globs, and
 * any reference whose shape isn't one of this package's own conventions
 * (see `looksInternal`).
 */
function extractLocalFileRefs(content) {
  const refs = [];

  const linkRe = /\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  let m;
  while ((m = linkRe.exec(content))) {
    const href = m[2].replace(/#.*$/, '');
    if (!href || isExternalOrInPage(m[2]) || isPlaceholderOrGlob(href) || !looksInternal(href)) continue;
    if (!MD_OR_CJS_RE.test(href)) continue;
    refs.push({ raw: m[2], path: href });
  }

  const tickRe = /`([^`\s]+)`/g;
  while ((m = tickRe.exec(content))) {
    const token = m[1];
    if (isExternalOrInPage(token) || isPlaceholderOrGlob(token) || !looksInternal(token)) continue;
    if (token.includes(':')) continue; // plugin:skill / scheme forms — not a local path
    if (!MD_OR_CJS_RE.test(token)) continue;
    refs.push({ raw: token, path: token });
  }

  return refs;
}

/**
 * Resolve a candidate local reference against the places a skill doc
 * legitimately points: alongside the referencing file, under the skill's
 * own references/rules/templates/scripts, at the skill root, repo-relative
 * from packageRoot, or — as a last resort, by basename only — anywhere else
 * in the same bucket's skill tree or its `rcode/templates/<bucket>/` memory
 * templates (covers a cross-skill mention like seo-os's `rules/backlinks.md`,
 * which actually lives under the sibling `seo-growth-orchestrator` skill).
 * @returns {string|null} the resolved absolute path, or null if none exist
 */
function resolveLocalRef(refPath, sourceFile, skillDir, packageRoot) {
  // `@.rcode/<dir>/x` is the @-include spelling of the INSTALLED layout; the
  // same file lives at rcode/<dir>/x (agents-rules is rcode/agents/rules) in the package.
  const installed = refPath.replace(/^@/, '').replace(/^\.rcode\/agents-rules\//, 'rcode/agents/rules/').replace(/^\.rcode\//, 'rcode/');
  const candidates = [
    path.resolve(packageRoot, installed),
    path.resolve(path.dirname(sourceFile), refPath),
    path.resolve(skillDir, 'references', refPath),
    path.resolve(skillDir, 'rules', refPath),
    path.resolve(skillDir, 'templates', refPath),
    path.resolve(skillDir, 'scripts', refPath),
    path.resolve(skillDir, refPath),
    path.resolve(packageRoot, refPath),
  ];
  const direct = candidates.find((c) => fs.existsSync(c));
  if (direct) return direct;

  const basename = path.basename(refPath);
  const skillsRoot = path.join(packageRoot, 'rcode/skills');
  const bucket = path.relative(skillsRoot, skillDir).split(path.sep)[0];
  const searchRoots = [
    path.join(skillsRoot, bucket),
    path.join(packageRoot, 'rcode/templates', bucket),
  ];
  const basenameRe = new RegExp(`^${basename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  for (const root of searchRoots) {
    const hit = findFiles(root, basenameRe)[0];
    if (hit) return hit;
  }
  return null;
}

// ---------- Skill-name references ----------

const KEBAB_RE = /^[A-Za-z][A-Za-z0-9_]*(?:-[A-Za-z0-9_]+)+$/;
// Labels that mark a bullet as naming something OTHER than an rcode skill
// (an external tool, a plugin, a data source) even inside a section whose
// heading otherwise talks about "skills". Matches both `**Data**:` and
// `**Data:**` (docs in this tree use both colon placements).
const NON_SKILL_LABEL_RE = /^\s*[-*]\s*\*\*(Plugin|Browser|Data|Tools?):?\*\*\s*:?/i;
const RELATED_SKILLS_LABEL_RE = /\*\*Related Skills?\*\*\s*:/i;
const NEXT_SKILL_LABEL_RE = /\*\*(Recommended Next Skill|Next Best Skill)\*\*/i;
const NEXT_SKILL_HEADING_RE = /^#{2,3}\s*.*next\s+(best\s+)?skill/i;
const INTEGRATION_SKILL_HEADING_RE = /^#{2,3}\s*.*\bskills?\b/i;
const DELEGATE_TO_RE = /\bdelegate[sd]?\b[\s\S]{0,40}?\bto\b/i;

function extractBacktickTokens(line) {
  const out = [];
  const re = /`([^`]+)`/g;
  let m;
  while ((m = re.exec(line))) {
    if (KEBAB_RE.test(m[1]) && !m[1].includes(':') && !m[1].includes('/')) out.push(m[1]);
  }
  return out;
}

function extractLinkTextTokens(line) {
  const out = [];
  const re = /\[([^\]]+)\]\([^)]+\)/g;
  let m;
  while ((m = re.exec(line))) {
    if (KEBAB_RE.test(m[1])) out.push(m[1]);
  }
  return out;
}

/**
 * Extract candidate skill-name tokens using this package's own idioms for
 * declaring a skill dependency (see module doc). Returns raw token strings;
 * callers resolve them against `buildKnownIdentifiers`.
 */
function extractSkillRefCandidates(content) {
  const lines = content.split('\n');
  const candidates = [];
  let inSkillHeadingSection = false;
  let inSkillTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headingMatch = /^#{1,6}\s/.test(line);
    if (headingMatch) {
      inSkillHeadingSection = INTEGRATION_SKILL_HEADING_RE.test(line) || NEXT_SKILL_HEADING_RE.test(line);
      inSkillTable = false;
      continue;
    }

    const isTableRow = /^\s*\|/.test(line);
    if (isTableRow && !inSkillTable) {
      // A table's own header row is the first `|` row after a blank/heading;
      // treat any header row naming a Skill/Delegate/Tool column as a signal
      // for the rows that follow (the header row itself carries no tokens).
      if (/\bSkill\b|\bDelegate\b|\bRules?\s*file\b/i.test(line)) {
        inSkillTable = true;
        continue;
      }
    }
    if (isTableRow && inSkillTable) {
      candidates.push(...extractBacktickTokens(line));
      continue;
    }
    if (!isTableRow) inSkillTable = false;

    if (NON_SKILL_LABEL_RE.test(line)) continue; // Plugin/Browser/Data/Tools bullet — skip regardless of section

    if (RELATED_SKILLS_LABEL_RE.test(line) || NEXT_SKILL_LABEL_RE.test(line) || DELEGATE_TO_RE.test(line) || inSkillHeadingSection) {
      candidates.push(...extractBacktickTokens(line));
      candidates.push(...extractLinkTextTokens(line));
      // Bare comma-separated form: "**Related Skills**: a, b, c" (no backticks).
      // Only needed when the line has no backticks at all — a backticked
      // list is already fully captured above, and re-parsing it here would
      // double-count every name (each pushed once as a backtick token, once
      // as a stripped bare token).
      if (RELATED_SKILLS_LABEL_RE.test(line) && !line.includes('`')) {
        const rest = line.split(RELATED_SKILLS_LABEL_RE)[1] || '';
        for (const part of rest.split(',')) {
          const t = part.replace(/[*_]/g, '').trim();
          if (KEBAB_RE.test(t)) candidates.push(t);
        }
      }
    }
  }
  // Dedupe: the same broken/valid name repeated on one line (or across
  // several lines of the same file) should surface once, not once per
  // mention — callers report per (file, ref) pair, not per raw occurrence.
  return [...new Set(candidates)];
}

function resolveSkillRef(token, knownIdentifiers) {
  const n = token.trim().toLowerCase();
  return knownIdentifiers.has(n) || knownIdentifiers.has(n.startsWith('rcode-') ? n.slice(6) : `rcode-${n}`);
}

// ---------- Per-skill check ----------

/**
 * Run all three checks against one skill directory.
 * @returns {{ brokenFileRefs: Array, brokenSkillRefs: Array, orphanedReferences: string[] }}
 */
function checkSkillDir(skillDir, { knownIdentifiers, packageRoot }) {
  const mdFiles = findMarkdownFiles(skillDir);
  const brokenFileRefs = [];
  const brokenSkillRefs = [];
  const reachable = new Set([path.join(skillDir, 'SKILL.md')]);
  const edges = []; // {from, resolved}

  for (const file of mdFiles) {
    const content = fs.readFileSync(file, 'utf8');

    for (const { raw, path: refPath } of extractLocalFileRefs(content)) {
      const resolved = resolveLocalRef(refPath, file, skillDir, packageRoot);
      if (resolved) {
        edges.push({ from: file, resolved });
      } else {
        brokenFileRefs.push({ file, ref: raw });
      }
    }

    for (const token of extractSkillRefCandidates(content)) {
      if (!resolveSkillRef(token, knownIdentifiers)) {
        brokenSkillRefs.push({ file, ref: token });
      }
    }
  }

  // Transitive reachability from SKILL.md through resolved local file refs.
  let changed = true;
  while (changed) {
    changed = false;
    for (const { from, resolved } of edges) {
      if (reachable.has(from) && !reachable.has(resolved)) {
        reachable.add(resolved);
        changed = true;
      }
    }
  }

  const referencesDir = path.join(skillDir, 'references');
  const orphanedReferences = findMarkdownFiles(referencesDir)
    .filter((f) => !reachable.has(f))
    .map((f) => toRepoRelative(packageRoot, f));

  return {
    brokenFileRefs: brokenFileRefs.map((r) => ({ file: toRepoRelative(packageRoot, r.file), ref: r.ref })),
    brokenSkillRefs: brokenSkillRefs.map((r) => ({ file: toRepoRelative(packageRoot, r.file), ref: r.ref })),
    orphanedReferences,
  };
}

// ---------- Package-wide entrypoint ----------

/**
 * Run link checks across skill buckets.
 *
 * @param {string} packageRoot
 * @param {{ enforce: string[], reportOnly: string[] }} buckets bucket dir
 *   names under rcode/skills/ (e.g. 'seo', 'agents'). `enforce` buckets
 *   return per-skill detail and count toward failures; `reportOnly` buckets
 *   are scanned too but only contribute an aggregate count, so pre-existing
 *   debt elsewhere never blocks `doctor` on the seo tree.
 */
function runLinkChecks(packageRoot, { enforce = [], reportOnly = [] } = {}) {
  const knownIdentifiers = buildKnownIdentifiers(packageRoot);
  const enforced = [];
  let reportOnlyCount = 0;

  for (const bucket of enforce) {
    const bucketDir = path.join(packageRoot, 'rcode/skills', bucket);
    for (const skillDir of findSkillDirs(bucketDir)) {
      const result = checkSkillDir(skillDir, { knownIdentifiers, packageRoot });
      const total = result.brokenFileRefs.length + result.brokenSkillRefs.length + result.orphanedReferences.length;
      if (total > 0) {
        enforced.push({ skill: toRepoRelative(packageRoot, skillDir), ...result });
      }
    }
  }

  for (const bucket of reportOnly) {
    const bucketDir = path.join(packageRoot, 'rcode/skills', bucket);
    for (const skillDir of findSkillDirs(bucketDir)) {
      const result = checkSkillDir(skillDir, { knownIdentifiers, packageRoot });
      reportOnlyCount += result.brokenFileRefs.length + result.brokenSkillRefs.length + result.orphanedReferences.length;
    }
  }

  return { enforced, reportOnlyCount };
}

module.exports = {
  findSkillDirs,
  findMarkdownFiles,
  buildKnownIdentifiers,
  extractLocalFileRefs,
  resolveLocalRef,
  extractSkillRefCandidates,
  resolveSkillRef,
  checkSkillDir,
  runLinkChecks,
};
