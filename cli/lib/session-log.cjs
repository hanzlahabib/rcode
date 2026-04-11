/**
 * Session log writer and search.
 *
 * A session log is a timestamped markdown file under .rihal/progress/
 * that captures what happened during a Claude work session. Structured
 * frontmatter (topics, sprint, story, decisions, learnings, pending)
 * makes the logs searchable later — topic-based search in /rihal:continue
 * uses this.
 *
 * Different from HANDOFF.json (which is transient, one-slot, auto-deleted
 * on resume). Session logs are PERMANENT history. They pile up in
 * .rihal/progress/ and form a searchable trail of every work session.
 *
 * Layout:
 *
 *   .rihal/progress/
 *   ├── session-2026-04-11-auth-flow.md
 *   ├── session-2026-04-11-signup-form.md
 *   ├── session-2026-04-12-payment-bug.md
 *   └── ...
 *
 * Naming: session-{ISO-date}-{slug}.md. Collisions resolved by appending
 * -{counter} (e.g. session-2026-04-11-auth-flow-2.md).
 *
 * Filename is immutable once written — we don't rename. If a session
 * needs a new slug, write a new file.
 */

const fs = require('fs');
const path = require('path');
const { writeFileAtomic } = require('./fsutil.cjs');

// ---------- Slug helpers ----------

function slugify(input) {
  return (input || 'session')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'session';
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function progressDir(cwd) {
  return path.join(cwd, '.rihal', 'progress');
}

/**
 * Pick a filename that doesn't collide. If session-{date}-{slug}.md
 * exists, try -2, -3, etc.
 */
function pickFilename(cwd, date, slug) {
  fs.mkdirSync(progressDir(cwd), { recursive: true });
  const base = `session-${date}-${slug}`;
  let name = `${base}.md`;
  let counter = 1;
  while (fs.existsSync(path.join(progressDir(cwd), name))) {
    counter++;
    name = `${base}-${counter}.md`;
  }
  return name;
}

// ---------- Writing ----------

/**
 * Write a session log. All fields optional except `slug` (or `title`
 * from which the slug is derived). Returns the relative path of the
 * written file.
 *
 * Shape:
 *   {
 *     slug?: string,           // "auth-flow" (or derived from title)
 *     title?: string,          // full human title, optional
 *     topics?: string[],       // ["authentication", "jwt", "session"]
 *     sprint?: string,         // "sprint-01"
 *     story?: string,          // "story-1-2-signup"
 *     phase?: string,          // "phase-01"
 *     outcome?: string,        // one-line summary
 *     decisions?: string[],    // bullet list
 *     learnings?: string[],    // bullet list
 *     pending?: string[],      // checkbox list
 *     filesModified?: string[],// file paths
 *     errors?: string[],       // errors hit + workarounds
 *     notes?: string,          // free text section at the end
 *   }
 */
function writeSessionLog(cwd, data = {}) {
  const date = data.date || today();
  const slug = slugify(data.slug || data.title || data.outcome || 'session');
  const filename = pickFilename(cwd, date, slug);
  const target = path.join(progressDir(cwd), filename);
  const rel = path.relative(cwd, target);

  writeFileAtomic(target, formatSessionMarkdown({ ...data, date, slug }));

  return { path: rel, filename, date, slug };
}

/**
 * Format a session log as Markdown with YAML frontmatter.
 * Deterministic — same input → same output.
 */
function formatSessionMarkdown(data) {
  const fm = [
    `---`,
    `date: ${data.date}`,
    `slug: ${data.slug}`,
  ];

  if (data.title) fm.push(`title: ${yamlEscape(data.title)}`);
  if (data.phase) fm.push(`phase: ${data.phase}`);
  if (data.sprint) fm.push(`sprint: ${data.sprint}`);
  if (data.story) fm.push(`story: ${data.story}`);
  if (data.outcome) fm.push(`outcome: ${yamlEscape(data.outcome)}`);

  if (data.topics && data.topics.length > 0) {
    fm.push(`topics: [${data.topics.map(yamlEscape).join(', ')}]`);
  }
  fm.push(`---`, ``);

  const body = [];
  body.push(`# Session: ${data.date}${data.title ? ' — ' + data.title : ''}`);
  body.push('');

  body.push(`## Quick Reference`);
  body.push('');
  if (data.topics && data.topics.length > 0) {
    body.push(`**Topics:** ${data.topics.join(', ')}`);
  }
  if (data.sprint) body.push(`**Sprint:** ${data.sprint}`);
  if (data.story) body.push(`**Story:** ${data.story}`);
  if (data.outcome) body.push(`**Outcome:** ${data.outcome}`);
  body.push('');

  if (data.decisions && data.decisions.length > 0) {
    body.push(`## Decisions Made`);
    body.push('');
    for (const d of data.decisions) body.push(`- ${d}`);
    body.push('');
  }

  if (data.learnings && data.learnings.length > 0) {
    body.push(`## Key Learnings`);
    body.push('');
    for (const l of data.learnings) body.push(`- ${l}`);
    body.push('');
  }

  if (data.pending && data.pending.length > 0) {
    body.push(`## Pending Tasks`);
    body.push('');
    for (const p of data.pending) body.push(`- [ ] ${p}`);
    body.push('');
  }

  if (data.filesModified && data.filesModified.length > 0) {
    body.push(`## Files Modified`);
    body.push('');
    for (const f of data.filesModified) body.push(`- \`${f}\``);
    body.push('');
  }

  if (data.errors && data.errors.length > 0) {
    body.push(`## Errors & Workarounds`);
    body.push('');
    for (const e of data.errors) body.push(`- ${e}`);
    body.push('');
  }

  if (data.notes) {
    body.push(`## Notes`);
    body.push('');
    body.push(data.notes);
    body.push('');
  }

  return fm.join('\n') + body.join('\n');
}

function yamlEscape(s) {
  if (typeof s !== 'string') return String(s);
  // If the value contains YAML-special chars, wrap in quotes and escape
  if (/[:\[\]{},&*#?|<>=!%@`"']/.test(s) || s.includes('\n')) {
    return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return s;
}

// ---------- Reading / listing ----------

/**
 * Extract frontmatter from a markdown file. Returns { frontmatter, body }.
 * frontmatter is an object with string/array values. Non-throwing —
 * returns {} if no frontmatter block.
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: content };
  const fm = {};
  for (const line of match[1].split(/\r?\n/)) {
    const m = line.match(/^([\w_-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1].trim();
    let value = m[2].trim();
    // Array syntax: [a, b, c]
    if (value.startsWith('[') && value.endsWith(']')) {
      value = value
        .slice(1, -1)
        .split(',')
        .map((v) => v.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
    } else {
      value = value.replace(/^["']|["']$/g, '');
    }
    fm[key] = value;
  }
  return { frontmatter: fm, body: match[2] };
}

/**
 * List session log files with parsed frontmatter metadata only (no body).
 * Fast — reads just the frontmatter block of each file.
 *
 * Options:
 *   limit: max number of logs to return (default: all)
 *   since: ISO date string — skip logs older than this
 */
function listSessionLogs(cwd, { limit = Infinity, since = null } = {}) {
  const dir = progressDir(cwd);
  if (!fs.existsSync(dir)) return [];

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith('session-') && f.endsWith('.md'))
    .sort()
    .reverse(); // Most recent first (filenames are date-prefixed)

  const results = [];
  for (const file of files) {
    if (results.length >= limit) break;
    const full = path.join(dir, file);
    try {
      // Read just enough to grab the frontmatter block. Most frontmatter
      // is under 1KB — read 4KB to be safe.
      const fd = fs.openSync(full, 'r');
      const buf = Buffer.alloc(4096);
      const bytes = fs.readSync(fd, buf, 0, 4096, 0);
      fs.closeSync(fd);
      const chunk = buf.toString('utf8', 0, bytes);
      const { frontmatter } = parseFrontmatter(chunk);
      if (since && frontmatter.date && frontmatter.date < since) continue;
      results.push({
        file,
        path: path.relative(cwd, full),
        ...frontmatter,
      });
    } catch {
      // Skip unreadable files silently
    }
  }
  return results;
}

/**
 * Search session logs by topic. Matches if any topic in the log's
 * frontmatter contains the query (case-insensitive substring match)
 * or if the query appears in title/outcome.
 *
 * Returns logs sorted most-recent-first, limited to `limit` entries.
 */
function searchSessionLogs(cwd, query, { limit = 10 } = {}) {
  if (!query) return [];
  const needle = query.toLowerCase();
  const all = listSessionLogs(cwd, { limit: Infinity });
  const matches = all.filter((log) => {
    const topics = Array.isArray(log.topics) ? log.topics : [];
    const inTopics = topics.some((t) => t.toLowerCase().includes(needle));
    const inTitle = (log.title || '').toLowerCase().includes(needle);
    const inOutcome = (log.outcome || '').toLowerCase().includes(needle);
    const inSlug = (log.slug || '').toLowerCase().includes(needle);
    return inTopics || inTitle || inOutcome || inSlug;
  });
  return matches.slice(0, limit);
}

/**
 * Read a full session log by filename. Returns { frontmatter, body }
 * or null if not found.
 */
function readSessionLog(cwd, filename) {
  const full = path.join(progressDir(cwd), filename);
  if (!fs.existsSync(full)) return null;
  try {
    const content = fs.readFileSync(full, 'utf8');
    return parseFrontmatter(content);
  } catch {
    return null;
  }
}

module.exports = {
  slugify,
  progressDir,
  writeSessionLog,
  formatSessionMarkdown,
  parseFrontmatter,
  listSessionLogs,
  searchSessionLogs,
  readSessionLog,
};
