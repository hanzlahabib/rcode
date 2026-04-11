/**
 * Permanent memory file — the project's long-term brain.
 *
 * Lives at .rihal/context/permanent.md. Written by /rihal:preserve
 * incrementally as the user captures durable learnings. Grows over
 * time; auto-archives oldest sections to .rihal/context/permanent-archive.md
 * when it exceeds the size budget so the active file stays lean.
 *
 * Structure (sections are fixed — /rihal:preserve routes entries to
 * the right one):
 *
 *   # Permanent Memory — {project_name}
 *
 *   ## Conventions
 *   - {entry with date prefix}
 *
 *   ## Architecture Decisions
 *   - {entry}
 *
 *   ## Key File Paths
 *   - {entry}
 *
 *   ## Common Workflows
 *   - {entry}
 *
 *   ## Gotchas
 *   - {entry}
 *
 *   ## Misc
 *   - {entry}
 *
 * Size budget: 200 lines (roughly 3k tokens). When exceeded, the auto-
 * archive routine moves the oldest entries (not sections) to
 * permanent-archive.md until the active file is back under 150 lines.
 *
 * The 50-line headroom between the 200-line trigger and the 150-line
 * post-archive target prevents thrashing on every add.
 */

const fs = require('fs');
const path = require('path');
const { writeFileAtomic } = require('./fsutil.cjs');

const FILE_NAME = 'permanent.md';
const ARCHIVE_NAME = 'permanent-archive.md';
const ARCHIVE_TRIGGER_LINES = 200;
const ARCHIVE_TARGET_LINES = 150;

const SECTIONS = [
  'Conventions',
  'Architecture Decisions',
  'Key File Paths',
  'Common Workflows',
  'Gotchas',
  'Misc',
];

// ---------- Paths ----------

function contextDir(cwd) {
  return path.join(cwd, '.rihal', 'context');
}

function permanentPath(cwd) {
  return path.join(contextDir(cwd), FILE_NAME);
}

function archivePath(cwd) {
  return path.join(contextDir(cwd), ARCHIVE_NAME);
}

// ---------- Load / parse ----------

/**
 * Parse permanent.md into a section map. Each section is an array of
 * { date, text } entries (date parsed from `[YYYY-MM-DD]` prefix).
 * Preserves order within a section — oldest first.
 *
 * If the file doesn't exist, returns an empty map with all default
 * sections present.
 */
function parsePermanent(content) {
  const sections = {};
  for (const s of SECTIONS) sections[s] = [];

  if (!content) return sections;

  let current = null;
  for (const line of content.split(/\r?\n/)) {
    const header = line.match(/^##\s+(.+)$/);
    if (header) {
      current = header[1].trim();
      if (!sections[current]) sections[current] = [];
      continue;
    }
    if (!current) continue;
    const entry = line.match(/^-\s+(?:\[(\d{4}-\d{2}-\d{2})\]\s*)?(.+)$/);
    if (entry) {
      sections[current].push({
        date: entry[1] || null,
        text: entry[2].trim(),
      });
    }
  }
  return sections;
}

function loadPermanent(cwd) {
  const p = permanentPath(cwd);
  if (!fs.existsSync(p)) return { sections: parsePermanent(''), exists: false };
  const content = fs.readFileSync(p, 'utf8');
  return { sections: parsePermanent(content), exists: true, raw: content };
}

function loadArchive(cwd) {
  const p = archivePath(cwd);
  if (!fs.existsSync(p)) return parsePermanent('');
  return parsePermanent(fs.readFileSync(p, 'utf8'));
}

// ---------- Serialize ----------

function serialize(sections, header) {
  const lines = [];
  if (header) {
    lines.push(header);
    lines.push('');
  }
  for (const section of SECTIONS) {
    const entries = sections[section] || [];
    if (entries.length === 0) continue;
    lines.push(`## ${section}`);
    lines.push('');
    for (const e of entries) {
      const datePrefix = e.date ? `[${e.date}] ` : '';
      lines.push(`- ${datePrefix}${e.text}`);
    }
    lines.push('');
  }
  // Emit any extra (user-added) sections at the end
  for (const key of Object.keys(sections)) {
    if (SECTIONS.includes(key)) continue;
    const entries = sections[key];
    if (!entries || entries.length === 0) continue;
    lines.push(`## ${key}`);
    lines.push('');
    for (const e of entries) {
      const datePrefix = e.date ? `[${e.date}] ` : '';
      lines.push(`- ${datePrefix}${e.text}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// ---------- Add entry ----------

/**
 * Add an entry to a section. Automatically prefixes with today's date
 * so the auto-archive routine can pick oldest-first. If the requested
 * section doesn't exist in SECTIONS, it creates a new section (treated
 * as "extra" and serialized after the fixed ones).
 *
 * Returns { path, section, added, archived }:
 *   added: the new entry object
 *   archived: number of entries moved to archive during auto-archive
 */
function addEntry(cwd, section, text, { projectName } = {}) {
  if (!text || !text.trim()) {
    throw new Error('Empty entry — nothing to preserve.');
  }
  const { sections } = loadPermanent(cwd);
  if (!sections[section]) sections[section] = [];
  const entry = { date: todayISO(), text: text.trim() };
  sections[section].push(entry);

  fs.mkdirSync(contextDir(cwd), { recursive: true });
  const header = `# Permanent Memory${projectName ? ' — ' + projectName : ''}`;
  let content = serialize(sections, header);

  // Auto-archive if over trigger
  let archivedCount = 0;
  let lineCount = content.split(/\r?\n/).length;
  if (lineCount > ARCHIVE_TRIGGER_LINES) {
    const result = autoArchive(cwd, sections, { projectName });
    content = result.content;
    archivedCount = result.archived;
  }

  writeFileAtomic(permanentPath(cwd), content);

  return {
    path: permanentPath(cwd),
    section,
    entry,
    archived: archivedCount,
  };
}

// ---------- Auto-archive ----------

/**
 * Move oldest entries from permanent → archive until the permanent file
 * is back under ARCHIVE_TARGET_LINES. Entries are picked by date; no-date
 * entries are skipped (they're assumed to be user-added manual content
 * we shouldn't touch).
 *
 * Returns the new serialized permanent content + count of moved entries.
 */
function autoArchive(cwd, sections, { projectName } = {}) {
  const header = `# Permanent Memory${projectName ? ' — ' + projectName : ''}`;

  // Flatten all dated entries with their section, sort by date asc
  const all = [];
  for (const section of Object.keys(sections)) {
    for (const entry of sections[section]) {
      if (entry.date) all.push({ section, entry });
    }
  }
  all.sort((a, b) => (a.entry.date || '').localeCompare(b.entry.date || ''));

  // Remove oldest one at a time until line count is under target
  const archiveSections = loadArchive(cwd);
  let moved = 0;
  let content = serialize(sections, header);
  while (content.split(/\r?\n/).length > ARCHIVE_TARGET_LINES && all.length > 0) {
    const { section, entry } = all.shift();
    // Remove from active sections
    const idx = sections[section].findIndex(
      (e) => e.date === entry.date && e.text === entry.text,
    );
    if (idx >= 0) sections[section].splice(idx, 1);
    // Add to archive
    if (!archiveSections[section]) archiveSections[section] = [];
    archiveSections[section].push(entry);
    moved++;
    content = serialize(sections, header);
  }

  if (moved > 0) {
    const archiveHeader = `# Permanent Memory Archive${projectName ? ' — ' + projectName : ''}`;
    writeFileAtomic(archivePath(cwd), serialize(archiveSections, archiveHeader));
  }

  return { content, archived: moved };
}

// ---------- Stats ----------

/**
 * Count entries per section and total lines. Used by the CLI/slash
 * command to show "how full is the permanent memory?".
 */
function stats(cwd) {
  const { sections, exists, raw } = loadPermanent(cwd);
  const perSection = {};
  let total = 0;
  for (const section of Object.keys(sections)) {
    perSection[section] = sections[section].length;
    total += sections[section].length;
  }
  const lineCount = raw ? raw.split(/\r?\n/).length : 0;
  const archiveExists = fs.existsSync(archivePath(cwd));
  const archiveStats = archiveExists
    ? {
        exists: true,
        lineCount: fs.readFileSync(archivePath(cwd), 'utf8').split(/\r?\n/).length,
      }
    : { exists: false, lineCount: 0 };

  return {
    exists,
    total_entries: total,
    per_section: perSection,
    line_count: lineCount,
    trigger_at: ARCHIVE_TRIGGER_LINES,
    target_after_archive: ARCHIVE_TARGET_LINES,
    percent_full: Math.round((lineCount / ARCHIVE_TRIGGER_LINES) * 100),
    archive: archiveStats,
  };
}

module.exports = {
  FILE_NAME,
  ARCHIVE_NAME,
  ARCHIVE_TRIGGER_LINES,
  ARCHIVE_TARGET_LINES,
  SECTIONS,
  permanentPath,
  archivePath,
  parsePermanent,
  loadPermanent,
  loadArchive,
  addEntry,
  autoArchive,
  stats,
};
