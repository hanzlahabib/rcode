#!/usr/bin/env node
/**
 * seo-portfolio-summary.cjs — derives a portfolio-wide table from each SEO
 * project's own `.rcode/seo/PROJECT.md` + `.rcode/seo/STATE.md`, instead of
 * requiring a hand-maintained cross-repo index (see
 * ../references/PORTFOLIO-MANAGEMENT.md for why: SEO sites are independent
 * repos, not subdirectories of one rcode project, so there is nothing to
 * keep in sync except the source files themselves).
 *
 * Uses the same lightweight "Key: value" line parsing idiom already used
 * elsewhere in rcode for frontmatter-ish text (see
 * cli/lib/install-skills.cjs's parseFrontmatter and
 * scripts/build-skills-catalog.cjs's parseFrontmatter) — these two files
 * are plain Markdown bodies, not YAML frontmatter, so this is a small,
 * separate parser tuned to that shape rather than a reuse of those exports.
 *
 * Usage:
 *   node seo-portfolio-summary.cjs [dir1 dir2 ...]
 *
 * With no arguments, scans the sibling directories of the current working
 * directory (i.e. other checked-out project repos next to this one).
 * Directories without `.rcode/seo/STATE.md` are silently skipped — most
 * siblings of a given project will not be rcode SEO projects, and that is
 * expected, not an error.
 *
 * Prints a Markdown table to stdout.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

/**
 * Parse "Key: value" lines from the header block of a project-memory file
 * (everything before the first `##` heading). Keys are normalized to
 * lowercase alphanumeric so "Project type:" and "project-type:" both match
 * the same lookup key.
 *
 * @param {string} text
 * @returns {Record<string, string>}
 */
function parseKeyValueBlock(text) {
  const fields = {};
  for (const rawLine of text.split('\n')) {
    if (/^##\s/.test(rawLine)) break; // header block ends at the first heading
    const line = rawLine.replace(/<!--.*?-->/g, '').trim();
    if (!line) continue;
    const colonAt = line.indexOf(':');
    if (colonAt === -1) continue;
    const key = line.slice(0, colonAt).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const value = line.slice(colonAt + 1).trim();
    if (!key || !value) continue;
    fields[key] = value;
  }
  return fields;
}

/**
 * Extract the first list item under a `## <headingPattern>` section.
 *
 * @param {string} text
 * @param {RegExp} headingPattern - matched against a trimmed heading line
 * @returns {string|null}
 */
function firstListItemUnderHeading(text, headingPattern) {
  const lines = text.split('\n');
  let inSection = false;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (/^##\s/.test(line)) {
      if (inSection) break; // reached the next heading — section is over
      inSection = headingPattern.test(line);
      continue;
    }
    if (!inSection) continue;
    const match = line.match(/^(?:\d+\.|[-*])\s+(.*)$/);
    if (match && match[1].trim()) return match[1].trim();
  }
  return null;
}

/**
 * Read one project's PROJECT.md + STATE.md, if present, into a summary row.
 * Returns null if the directory is not a tracked SEO project (no STATE.md).
 *
 * @param {string} dir
 */
function readProjectRow(dir) {
  const stateFile = path.join(dir, '.rcode', 'seo', 'STATE.md');
  if (!fs.existsSync(stateFile)) return null;

  const stateText = fs.readFileSync(stateFile, 'utf8');
  const stateFields = parseKeyValueBlock(stateText);
  const nextAction = firstListItemUnderHeading(stateText, /^##\s+Next recommended actions/i);

  const projectFile = path.join(dir, '.rcode', 'seo', 'PROJECT.md');
  const projectFields = fs.existsSync(projectFile) ? parseKeyValueBlock(fs.readFileSync(projectFile, 'utf8')) : {};

  return {
    project: projectFields.project || path.basename(dir),
    domain: projectFields.domain || '-',
    type: projectFields.projecttype || '-',
    stage: stateFields.stage || '-',
    priority: stateFields.priority || '-',
    nextAction: nextAction || '-',
  };
}

/**
 * @param {string} baseDir
 * @returns {string[]} sibling directories of baseDir (excluding baseDir itself)
 */
function siblingDirsOf(baseDir) {
  const parent = path.dirname(baseDir);
  let entries;
  try {
    entries = fs.readdirSync(parent, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(parent, entry.name))
    .filter((dir) => path.resolve(dir) !== path.resolve(baseDir));
}

/**
 * Escape a value for safe embedding in a Markdown table cell.
 * @param {string} value
 */
function escapeCell(value) {
  return String(value).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

/**
 * @param {Array<ReturnType<typeof readProjectRow>>} rows
 * @returns {string}
 */
function renderMarkdownTable(rows) {
  const header = '| project | domain | type | stage | priority | next action |';
  const divider = '|---|---|---|---|---|---|';
  if (rows.length === 0) {
    return `${header}\n${divider}\n| _no tracked SEO projects found_ | | | | | |\n`;
  }
  const body = rows
    .map(
      (row) =>
        `| ${escapeCell(row.project)} | ${escapeCell(row.domain)} | ${escapeCell(row.type)} | ${escapeCell(row.stage)} | ${escapeCell(row.priority)} | ${escapeCell(row.nextAction)} |`
    )
    .join('\n');
  return `${header}\n${divider}\n${body}\n`;
}

function main(argv) {
  const explicitDirs = argv.slice(2);
  const dirsToScan = explicitDirs.length > 0 ? explicitDirs.map((d) => path.resolve(d)) : siblingDirsOf(process.cwd());

  for (const dir of dirsToScan) {
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
      throw new Error(`Not a directory: ${dir}`);
    }
  }

  const rows = dirsToScan.map(readProjectRow).filter((row) => row !== null);
  process.stdout.write(renderMarkdownTable(rows));
}

if (require.main === module) {
  try {
    main(process.argv);
  } catch (err) {
    process.stderr.write(`seo-portfolio-summary: ${err.message}\n`);
    process.exit(1);
  }
}

module.exports = { parseKeyValueBlock, firstListItemUnderHeading, readProjectRow, siblingDirsOf, renderMarkdownTable };
