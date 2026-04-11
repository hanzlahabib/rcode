/**
 * Story commit message formatter + label validator.
 *
 * Produces Conventional Commits messages with structured trailers that
 * github-sync can round-trip as GitHub issue labels. Every story commit
 * carries:
 *   - type(story-id): title                     ← Conventional Commits header
 *   - free-form body                            ← optional
 *   - Refs: #{issue_num}                        ← auto from github-map.json
 *   - Sprint: {sprint_id}
 *   - Story: {story_id}
 *   - Milestone: {milestone_id}                 ← auto-resolved, optional
 *   - Labels: {label1, label2, ...}             ← validated against taxonomy
 *   - Co-ordinated-By: {names}                  ← optional
 *
 * The library is pure: it takes plain data and returns strings. It does
 * NOT shell out to git or read/write state. Shelling is the CLI's job.
 *
 * Label validation uses the taxonomy already defined in cli/github-sync.js
 * (type:, priority:, status:, area:). Unknown labels are rejected with a
 * Levenshtein suggestion reusing the existing suggestClosest helper.
 */

const { suggestClosest } = require('./config.cjs');

// ---------- Label taxonomy (mirrors cli/github-sync.js) ----------

const VALID_LABELS = new Set([
  // Type
  'epic',
  'type:feature',
  'type:task',
  'type:bug',
  'type:docs',
  'type:story',
  // Priority
  'priority:critical',
  'priority:high',
  'priority:medium',
  'priority:low',
  // Status
  'status:backlog',
  'status:todo',
  'status:in-progress',
  'status:blocked',
  'status:review',
  'status:done',
  // Area
  'FE',
  'BE',
  'ML',
  'API',
  'Design',
  'DevOps',
  'QA',
  'Docs',
]);

const VALID_COMMIT_TYPES = new Set([
  'feat',
  'fix',
  'refactor',
  'docs',
  'style',
  'test',
  'chore',
  'perf',
  'revert',
]);

/**
 * Validate an array of label strings against the taxonomy.
 * Returns { ok: true, labels } or { ok: false, invalid, suggestion }.
 * On first invalid label, stops and reports it so the user can fix one
 * at a time rather than seeing a wall of errors.
 */
function validateLabels(labels) {
  if (!Array.isArray(labels)) {
    return { ok: false, invalid: '<not an array>', suggestion: null };
  }
  for (const label of labels) {
    if (!VALID_LABELS.has(label)) {
      return {
        ok: false,
        invalid: label,
        suggestion: suggestClosest(label, [...VALID_LABELS]),
      };
    }
  }
  return { ok: true, labels };
}

/**
 * Format a commit message from structured data. Pure function — no I/O.
 *
 * Required:
 *   type      Conventional Commits type (feat, fix, refactor, ...)
 *   storyId   Story id ("story-1-2-signup")
 *   title     One-line description
 *
 * Optional:
 *   issueNum  GitHub issue number (adds "Refs: #N")
 *   sprint    Sprint id (adds "Sprint: ...")
 *   milestone Milestone id (adds "Milestone: ...")
 *   labels    Array of validated labels (adds "Labels: ...")
 *   coordinatedBy  Array of "Name (role)" strings
 *   bodyLines Array of body lines (or a single string)
 *
 * Throws if type or labels are invalid.
 */
function formatCommitMessage({
  type,
  storyId,
  title,
  issueNum = null,
  sprint = null,
  milestone = null,
  labels = [],
  coordinatedBy = [],
  bodyLines = [],
}) {
  if (!VALID_COMMIT_TYPES.has(type)) {
    const suggestion = suggestClosest(type, [...VALID_COMMIT_TYPES]);
    const err = new Error(
      `Invalid commit type '${type}'. Valid: ${[...VALID_COMMIT_TYPES].join(', ')}` +
      (suggestion ? `. Did you mean '${suggestion}'?` : ''),
    );
    err.suggestion = suggestion;
    throw err;
  }

  if (!storyId || typeof storyId !== 'string') {
    throw new Error('storyId is required');
  }
  if (!title || typeof title !== 'string') {
    throw new Error('title is required');
  }

  // Derive the short scope from the story id. "story-1-2-signup" → "story-1-2"
  const scopeMatch = storyId.match(/^(story-\d+-\d+)/);
  const scope = scopeMatch ? scopeMatch[1] : storyId;

  // Validate labels before anything else — fail fast
  const labelResult = validateLabels(labels);
  if (!labelResult.ok) {
    const err = new Error(
      `Invalid label '${labelResult.invalid}'` +
      (labelResult.suggestion ? `. Did you mean '${labelResult.suggestion}'?` : ''),
    );
    err.suggestion = labelResult.suggestion;
    throw err;
  }

  // Build the message
  const lines = [];
  lines.push(`${type}(${scope}): ${title}`);

  // Body lines (optional)
  const body = Array.isArray(bodyLines)
    ? bodyLines.filter((l) => typeof l === 'string' && l.length > 0)
    : typeof bodyLines === 'string' && bodyLines.length > 0
    ? [bodyLines]
    : [];

  if (body.length > 0) {
    lines.push('');
    for (const line of body) lines.push(line);
  }

  // Trailers section
  const trailers = [];
  if (issueNum !== null && issueNum !== undefined) {
    trailers.push(`Refs: #${issueNum}`);
  }
  if (sprint) trailers.push(`Sprint: ${sprint}`);
  trailers.push(`Story: ${storyId}`);
  if (milestone) trailers.push(`Milestone: ${milestone}`);
  if (labels.length > 0) {
    trailers.push(`Labels: ${labels.join(', ')}`);
  }
  if (coordinatedBy.length > 0) {
    trailers.push(`Co-ordinated-By: ${coordinatedBy.join(', ')}`);
  }

  if (trailers.length > 0) {
    lines.push('');
    for (const t of trailers) lines.push(t);
  }

  return lines.join('\n');
}

/**
 * Parse trailers out of an existing commit message body. Returns an
 * object of trailer key → value. Used by github-sync to round-trip
 * labels from commits back to GitHub issues.
 */
function parseTrailers(message) {
  const trailers = {};
  const lines = (message || '').split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^([A-Za-z][\w-]*):\s*(.+)$/);
    if (!m) continue;
    trailers[m[1]] = m[2].trim();
  }
  return trailers;
}

/**
 * Extract labels from parsed trailers. Returns [] if no Labels trailer.
 */
function extractLabels(trailers) {
  if (!trailers.Labels) return [];
  return trailers.Labels.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

module.exports = {
  VALID_LABELS,
  VALID_COMMIT_TYPES,
  validateLabels,
  formatCommitMessage,
  parseTrailers,
  extractLabels,
};
