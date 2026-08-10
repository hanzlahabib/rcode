/**
 * Brain — pulls/lists/status-checks external "brain" content sources
 * declared in .rcode/brain/sources.yaml (issue #158).
 *
 * Extracted from rcode-tools.cjs's cmdBrain (issue #204) — pure mechanical
 * move, no behavior change. PROJECT_ROOT/RCODE_DIR are passed in from the
 * caller since this module has no access to the dispatcher's module scope.
 */

const fs = require('fs');
const path = require('path');

function cmdBrain(args, { PROJECT_ROOT, RCODE_DIR }) {
  const sub = args[0] || 'help';
  // sources.yaml lives under .rcode/brain/ in user installs (v2.2+).
  // Older installs may have it at rcode/brain/ (pre-v2.2) — fall back for compat.
  let sourcesPath = path.join(RCODE_DIR, 'brain', 'sources.yaml');
  let brainDir = path.join(RCODE_DIR, 'brain');
  if (!fs.existsSync(sourcesPath)) {
    const legacyPath = path.join(PROJECT_ROOT, 'rcode', 'brain', 'sources.yaml');
    if (fs.existsSync(legacyPath)) {
      sourcesPath = legacyPath;
      brainDir = path.join(PROJECT_ROOT, 'rcode', 'brain');
    }
  }

  // Resolve a source's dest directory relative to brainDir.
  // Accepts legacy absolute-looking values ("rcode/brain/rcode-github/") by
  // stripping any leading "rcode/brain/" so the resolved path sits inside the
  // chosen brainDir. New sources.yaml should use bare names ("rcode-github/").
  function resolveDest(dest) {
    const trimmed = String(dest || '').replace(/^rcode\/brain\//, '').replace(/^\/+/, '');
    return path.join(brainDir, trimmed);
  }

  if (!fs.existsSync(sourcesPath)) {
    return {
      ok: false,
      error: `sources.yaml missing at ${sourcesPath}. Run install or see issue #158.`,
    };
  }

  // Minimal YAML reader specifically for sources.yaml — not a general parser.
  // Handles: `version: 1`, `defaults:` block, `sources:` list where each
  // entry is a `- name: X` block with sibling key: value lines and an
  // `paths:` sub-list of strings.
  function parseSourcesYaml(text) {
    const root = { version: null, defaults: {}, sources: [] };
    const lines = text.split('\n');
    let section = null;
    let current = null;     // current source map
    let inPaths = false;
    let inDescription = false;
    let descLines = [];

    function unquote(s) { return s.replace(/^['"]|['"]$/g, ''); }

    for (const raw of lines) {
      if (!raw.trim() || raw.trim().startsWith('#')) continue;

      // Flush description if we were collecting
      if (inDescription && raw.match(/^ {4}\S/) && !raw.trim().startsWith('-')) {
        // still inside the description block
        const m = raw.match(/^ *(.*)$/);
        if (m) descLines.push(m[1]);
        continue;
      } else if (inDescription) {
        current.description = descLines.join(' ').trim();
        inDescription = false;
        descLines = [];
      }

      // Top-level keys
      const top = raw.match(/^(\w+):\s*(.*)$/);
      if (top) {
        const key = top[1], val = top[2].trim();
        if (key === 'version') { root.version = unquote(val); section = null; continue; }
        if (key === 'defaults') { section = 'defaults'; continue; }
        if (key === 'sources') { section = 'sources'; continue; }
      }

      // defaults: indented key-value
      if (section === 'defaults') {
        const m = raw.match(/^ +([\w_]+):\s*(.*)$/);
        if (m) root.defaults[m[1]] = unquote(m[2]);
        continue;
      }

      // sources: list items
      if (section === 'sources') {
        const startItem = raw.match(/^ *- ([\w_-]+):\s*(.*)$/);
        if (startItem) {
          current = {};
          current[startItem[1]] = unquote(startItem[2]);
          root.sources.push(current);
          inPaths = false;
          continue;
        }
        // paths: list-of-strings under current
        const pathsStart = raw.match(/^ +paths:\s*$/);
        if (pathsStart) { current.paths = []; inPaths = true; continue; }
        if (inPaths) {
          const pItem = raw.match(/^ *- (.*)$/);
          if (pItem) { current.paths.push(unquote(pItem[1])); continue; }
          inPaths = false;
        }
        // description: block scalar `>`
        const descStart = raw.match(/^ +description:\s*>\s*$/);
        if (descStart) { inDescription = true; descLines = []; continue; }
        // Regular key: value on current item
        const kv = raw.match(/^ +([\w_-]+):\s*(.*)$/);
        if (kv && current) {
          current[kv[1]] = unquote(kv[2]);
        }
      }
    }
    // final flush
    if (inDescription && current) current.description = descLines.join(' ').trim();
    return root;
  }

  const cfg = parseSourcesYaml(fs.readFileSync(sourcesPath, 'utf8'));
  const sources = Array.isArray(cfg.sources) ? cfg.sources : [];

  if (sub === 'list') {
    return {
      ok: true,
      version: cfg.version,
      sources: sources.map(s => ({
        name: s.name,
        repo: s.repo,
        dest: s.dest,
        placeholder: String(s.repo || '').includes('<PLACEHOLDER'),
      })),
    };
  }

  if (sub === 'status') {
    const report = { ok: true, sources: [] };
    for (const s of sources) {
      const destPath = resolveDest(s.dest);
      const exists = fs.existsSync(destPath);
      report.sources.push({
        name: s.name,
        dest: s.dest,
        fetched: exists,
        placeholder: String(s.repo || '').includes('<PLACEHOLDER'),
      });
    }
    return report;
  }

  if (sub !== 'pull') {
    return {
      ok: false,
      error: `Unknown brain subcommand: ${sub}. Try: pull | status | list`,
    };
  }

  // sub === 'pull'
  const onlyName = args[1];
  const report = { ok: true, pulled: [], skipped: [], errors: [] };

  for (const s of sources) {
    if (onlyName && s.name !== onlyName) continue;
    const repo = String(s.repo || '');

    if (repo.includes('<PLACEHOLDER')) {
      report.skipped.push({ name: s.name, reason: 'placeholder URL — fill in via issue #162 (M5)' });
      continue;
    }

    if (repo === 'self') {
      // In-repo copy — use rsync-ish node copy from paths under project root.
      const destPath = resolveDest(s.dest);
      fs.mkdirSync(destPath, { recursive: true });
      const paths = Array.isArray(s.paths) ? s.paths : [];
      let copied = 0;
      for (const pattern of paths) {
        // Very simple glob: expand ** to recursive copy.
        const base = pattern.split('**')[0].replace(/\/$/, '');
        const srcDir = path.join(PROJECT_ROOT, base);
        if (!fs.existsSync(srcDir)) continue;
        // Recursive copy of .md files
        function walk(dir) {
          for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, e.name);
            if (e.isDirectory()) { walk(full); continue; }
            if (!e.isFile()) continue;
            if (!full.endsWith('.md')) continue;
            const rel = path.relative(srcDir, full);
            const out = path.join(destPath, rel);
            fs.mkdirSync(path.dirname(out), { recursive: true });
            fs.copyFileSync(full, out);
            copied++;
          }
        }
        walk(srcDir);
      }
      report.pulled.push({ name: s.name, kind: 'self', files: copied });
      continue;
    }

    // #925 — supply-chain guard. `brain pull` clones a remote repo and copies
    // its content into every rcode user's project context, so an attacker who
    // can edit sources.yaml (or a typo) must not silently pull untrusted code.
    // Only allow github.com URLs under an approved org allowlist; anything else
    // is rejected unless the user explicitly opts in with
    // RCODE_BRAIN_ALLOW_UNVERIFIED=1. Pinning to a commit SHA (source.ref) is
    // recommended over a moving branch — warn when a source tracks a branch.
    const BRAIN_ALLOWED_HOSTS = new Set(['github.com']);
    const BRAIN_ALLOWED_ORGS = new Set(['hanzlahabib', 'rcode-om']);
    if (process.env.RCODE_BRAIN_ALLOW_UNVERIFIED !== '1') {
      let host = '', org = '';
      const mm = repo.match(/(?:https?:\/\/|git@)([^/:]+)[/:]([^/]+)\//);
      if (mm) { host = mm[1]; org = mm[2]; }
      if (!BRAIN_ALLOWED_HOSTS.has(host) || !BRAIN_ALLOWED_ORGS.has(org)) {
        report.skipped.push({
          name: s.name,
          reason: `repo not in brain allowlist (${host || 'unknown host'}/${org || '?'}). ` +
            `Add the org to BRAIN_ALLOWED_ORGS or set RCODE_BRAIN_ALLOW_UNVERIFIED=1 to override.`,
        });
        continue;
      }
      if (!s.ref) {
        // Tracking a branch is mutable — a force-push changes what you pull.
        // Not fatal, but surface it so maintainers can pin a SHA via `ref:`.
        report.skipped.push({
          name: s.name,
          reason: `no pinned 'ref:' SHA — tracking branch '${s.branch || root.defaults.branch || 'main'}' is mutable. ` +
            `Pin a commit SHA in sources.yaml, or set RCODE_BRAIN_ALLOW_UNVERIFIED=1 to pull the branch tip.`,
        });
        continue;
      }
    }

    // External git source — use sparse checkout into a tmp dir then copy.
    // #170 — global brain cache at ~/.rcode/brain-cache/<sha1(repo+branch+paths)>/.
    // Same source pulled from N projects = N clones today, 1 clone + N copies
    // after this change. Cache TTL is configurable per source (defaults to 6h).
    const { execSync, execFileSync: execFileSyncBrain } = require('child_process');
    const crypto = require('crypto');
    const os = require('os');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rcode-brain-'));
    const branch = s.branch || cfg.defaults?.branch || 'main';
    // #1029 — `sparse-checkout set --no-cone` treats each path as a
    // .gitignore-style pattern, not a literal path pin. A bare filename
    // (no '/', no wildcard) matches that filename at any depth in the repo
    // tree, over-fetching every same-named file repo-wide. Anchor bare
    // filenames to the repo root with a leading '/' so they pin the
    // root-level file only. Patterns that already start with '/', contain a
    // '/', or use wildcards (already scoped or intentionally recursive) are
    // left untouched.
    function anchorBareFilename(p) {
      const str = String(p || '');
      if (str.startsWith('/')) return str;
      if (/[*?[]/.test(str)) return str;
      if (str.includes('/')) return str;
      return `/${str}`;
    }
    const sparsePaths = (Array.isArray(s.paths) ? s.paths : []).map(anchorBareFilename);

    // Cache key = sha1(repo + branch + sparsePaths joined). Changing any of
    // those gets a fresh cache slot. Different projects pulling the same
    // (repo, branch, paths) tuple share one cached download.
    const cacheKey = crypto
      .createHash('sha1')
      .update(`${repo}\n${branch}\n${sparsePaths.sort().join(',')}`)
      .digest('hex')
      .slice(0, 16);
    const cacheRoot = path.join(os.homedir(), '.rcode', 'brain-cache');
    const cacheDir = path.join(cacheRoot, cacheKey);
    const cacheManifest = path.join(cacheDir, '.cache-manifest.json');

    // Parse cache_ttl: accept '6h', '15m', '2d', or seconds as bare number.
    function parseTtlSeconds(raw, fallback) {
      if (raw == null || raw === '') return fallback;
      const s = String(raw).trim();
      const m = s.match(/^(\d+)([smhd]?)$/i);
      if (!m) return fallback;
      const n = parseInt(m[1], 10);
      switch ((m[2] || 's').toLowerCase()) {
        case 'd': return n * 86400;
        case 'h': return n * 3600;
        case 'm': return n * 60;
        default:  return n;
      }
    }
    const ttlSeconds = parseTtlSeconds(s.cache_ttl || cfg.defaults?.cache_ttl, 6 * 3600);

    function readCacheManifest() {
      if (!fs.existsSync(cacheManifest)) return null;
      try { return JSON.parse(fs.readFileSync(cacheManifest, 'utf8')); }
      catch { return null; }
    }
    function isCacheFresh(manifest) {
      if (!manifest || typeof manifest.pulled_at !== 'string') return false;
      const ageMs = Date.now() - Date.parse(manifest.pulled_at);
      return Number.isFinite(ageMs) && (ageMs / 1000) < ttlSeconds;
    }
    function copyTree(src, dst) {
      for (const e of fs.readdirSync(src, { withFileTypes: true })) {
        if (e.name === '.git' || e.name === '.cache-manifest.json') continue;
        const sp = path.join(src, e.name);
        const dp = path.join(dst, e.name);
        if (e.isDirectory()) { fs.mkdirSync(dp, { recursive: true }); copyTree(sp, dp); }
        else if (e.isFile()) fs.copyFileSync(sp, dp);
      }
    }

    const destPath = resolveDest(s.dest);
    try {
      // Cache hit path — copy from ~/.rcode/brain-cache/<key>/ directly.
      const cached = readCacheManifest();
      if (cached && isCacheFresh(cached)) {
        fs.mkdirSync(destPath, { recursive: true });
        copyTree(cacheDir, destPath);
        report.pulled.push({ name: s.name, kind: 'git', repo, branch, cache: 'hit', cache_key: cacheKey });
        continue;
      }

      // Cache miss — clone, then warm the cache for next time.
      // Use --no-checkout + explicit sparse-checkout init + set + checkout
      // because `git clone --sparse` combined with --filter=blob:none has
      // an intermittent failure mode where git misreads the URL as a path.
      // execFileSync — repo/branch/tmp/sparsePaths from user config; no shell so
      // values with spaces, quotes, or semicolons cannot inject commands (#754).
      execFileSyncBrain('git', [
        'clone', '--depth=1', '--filter=blob:none', '--no-checkout',
        `--branch=${branch}`, repo, tmp,
      ], { stdio: 'pipe' });
      execFileSyncBrain('git', ['-C', tmp, 'sparse-checkout', 'init', '--no-cone'], { stdio: 'pipe' });
      execFileSyncBrain('git', ['-C', tmp, 'sparse-checkout', 'set', ...sparsePaths], { stdio: 'pipe' });
      execFileSyncBrain('git', ['-C', tmp, 'checkout'], { stdio: 'pipe' });

      // Warm cache before destination copy so a copy failure to dest still
      // saves the next pull. Replace any stale slot atomically.
      try {
        fs.rmSync(cacheDir, { recursive: true, force: true });
        fs.mkdirSync(cacheDir, { recursive: true });
        copyTree(tmp, cacheDir);
        const commitSha = (() => {
          try { return execFileSyncBrain('git', ['-C', tmp, 'rev-parse', 'HEAD'], { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim(); }
          catch { return null; }
        })();
        fs.writeFileSync(cacheManifest, JSON.stringify({
          repo, branch, paths: sparsePaths,
          pulled_at: new Date().toISOString(),
          commit_sha: commitSha,
          ttl_seconds: ttlSeconds,
        }, null, 2));
      } catch (_) { /* cache warming is best-effort */ }

      fs.mkdirSync(destPath, { recursive: true });
      copyTree(tmp, destPath);
      report.pulled.push({ name: s.name, kind: 'git', repo, branch, cache: 'miss', cache_key: cacheKey });
    } catch (e) {
      report.errors.push({ name: s.name, error: String(e.message || e).slice(0, 200) });
    } finally {
      try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}
    }
  }

  if (report.errors.length) report.ok = false;
  return report;
}

module.exports = { cmdBrain };
