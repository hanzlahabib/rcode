'use strict';
/**
 * memory-select.cjs — relevance-ranked memory selector (#958).
 *
 * Scores files under .rcode/memory/ against the current session context
 * (active phase name/goal, git branch, files touched in recent commits,
 * memory file recency) and returns the top-scoring excerpts that fit a
 * token budget. Pure heuristics — no network or LLM calls. Must stay fast
 * (<200ms) since it runs inline in session-start and pre-compact hooks.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { resolveActivePhase } = require('./state-reader.cjs');

const DEFAULT_BUDGET_TOKENS = 1500;
const CHARS_PER_TOKEN = 4; // rough chars/4 estimate, consistent with rest of the codebase
const TRUNCATION_MARKER = '\n…(truncated)';
const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'this', 'that', 'are', 'was', 'were',
  'has', 'have', 'will', 'not', 'but', 'you', 'your', 'all', 'can', 'its',
]);

function estimateTokens(text) {
  return Math.ceil(String(text || '').length / CHARS_PER_TOKEN);
}

function memoryRoot(cwd) {
  return path.join(cwd, '.rcode', 'memory');
}

/** True when .rcode/memory/ exists and contains at least one non-empty .md file. */
function hasMemory(cwd) {
  return listMemoryFiles(cwd).length > 0;
}

function listMemoryFiles(cwd) {
  const root = memoryRoot(cwd);
  const results = [];
  if (!fs.existsSync(root)) return results;
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        results.push(full);
      }
    }
  }
  return results;
}

function getConfiguredBudget(cwd, fallback) {
  try {
    const { cmdGet } = require('./config.cjs');
    const val = cmdGet(cwd, 'memory_inject_budget');
    const n = val !== null ? parseInt(val, 10) : NaN;
    return Number.isFinite(n) && n > 0 ? n : fallback;
  } catch {
    return fallback;
  }
}

function readGitBranch(cwd) {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD 2>/dev/null', {
      cwd, encoding: 'utf8', timeout: 2000,
    }).trim();
  } catch {
    return '';
  }
}

function readTouchedFiles(cwd) {
  try {
    const out = execSync('git log -5 --name-only --pretty=format: 2>/dev/null', {
      cwd, encoding: 'utf8', timeout: 3000,
    });
    return out.split('\n').map((l) => l.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function tokenizeTerms(str) {
  return String(str || '')
    .split(/[^a-zA-Z0-9]+/)
    .map((s) => s.toLowerCase())
    .filter((s) => s.length > 2 && !STOPWORDS.has(s));
}

/** Build the set of query terms + touched paths that describe "current context". */
function buildQueryContext(cwd, state) {
  const terms = new Set();
  const { activePhase, phaseLabel } = resolveActivePhase(state);

  if (phaseLabel) tokenizeTerms(phaseLabel).forEach((t) => terms.add(t));
  if (activePhase?.name) tokenizeTerms(activePhase.name).forEach((t) => terms.add(t));
  if (activePhase?.goal) tokenizeTerms(activePhase.goal).forEach((t) => terms.add(t));

  const branch = readGitBranch(cwd);
  if (branch) tokenizeTerms(branch).forEach((t) => terms.add(t));

  const touchedPaths = readTouchedFiles(cwd);
  for (const touched of touchedPaths) {
    const base = path.basename(touched, path.extname(touched));
    tokenizeTerms(base).forEach((t) => terms.add(t));
  }

  return { terms: Array.from(terms), touchedPaths };
}

/**
 * Score one memory file against the query context. Higher is more relevant.
 * Signals: keyword overlap (phase/branch/touched-file terms), path mentions
 * (memory file references a path that was touched recently), and recency
 * of the memory file's own mtime.
 */
function scoreFile(filePath, content, ctx) {
  const lowerContent = content.toLowerCase();

  let keywordScore = 0;
  for (const term of ctx.terms) {
    if (!term) continue;
    const re = new RegExp(escapeRegExp(term), 'g');
    const matches = lowerContent.match(re);
    if (matches) keywordScore += Math.min(matches.length, 5);
  }

  let pathScore = 0;
  for (const touched of ctx.touchedPaths) {
    if (!touched) continue;
    if (lowerContent.includes(touched.toLowerCase())) {
      pathScore += 3;
      continue;
    }
    const base = path.basename(touched, path.extname(touched)).toLowerCase();
    if (base.length > 2 && lowerContent.includes(base)) pathScore += 1;
  }

  let recencyScore = 0;
  try {
    const stat = fs.statSync(filePath);
    const ageDays = (Date.now() - stat.mtimeMs) / (1000 * 60 * 60 * 24);
    recencyScore = 10 / (1 + Math.max(0, ageDays));
  } catch {
    /* advisory signal only */
  }

  return keywordScore * 2 + pathScore * 1.5 + recencyScore;
}

/** Truncate content to fit within remainingTokens, leaving room for the marker. */
function excerptFor(content, remainingTokens) {
  const markerTokens = estimateTokens(TRUNCATION_MARKER);
  const budgetForContent = Math.max(0, remainingTokens - markerTokens);
  const maxChars = budgetForContent * CHARS_PER_TOKEN;
  if (maxChars <= 0) return '';
  return content.slice(0, maxChars).trimEnd() + TRUNCATION_MARKER;
}

/**
 * Select the top-K relevant memory chunks that fit within a token budget.
 *
 * @param {string} cwd - project root (must contain .rcode/)
 * @param {object} [opts]
 * @param {number} [opts.budgetTokens] - explicit override, wins over config/default
 * @param {number} [opts.defaultBudget] - fallback when no config value is set
 * @returns {{chunks: Array<{source:string, excerpt:string, score:number, tokens:number}>, totalTokens: number, budget: number, empty: boolean}}
 */
function selectMemoryChunks(cwd, opts = {}) {
  const budget = Number.isFinite(opts.budgetTokens) && opts.budgetTokens > 0
    ? opts.budgetTokens
    : getConfiguredBudget(cwd, opts.defaultBudget ?? DEFAULT_BUDGET_TOKENS);

  const files = listMemoryFiles(cwd);
  if (files.length === 0) {
    return { chunks: [], totalTokens: 0, budget, empty: true };
  }

  let state = null;
  try {
    const statePath = path.join(cwd, '.rcode', 'state.json');
    if (fs.existsSync(statePath)) state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  } catch {
    /* advisory — proceed with no phase context */
  }

  const ctx = buildQueryContext(cwd, state);

  const scored = [];
  for (const filePath of files) {
    let content;
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch {
      continue;
    }
    if (!content.trim()) continue;
    scored.push({ filePath, content, score: scoreFile(filePath, content, ctx) });
  }

  if (scored.length === 0) {
    return { chunks: [], totalTokens: 0, budget, empty: true };
  }

  scored.sort((a, b) => b.score - a.score);

  const chunks = [];
  let used = 0;
  for (const item of scored) {
    if (used >= budget) break;
    const remaining = budget - used;
    const tokens = estimateTokens(item.content);
    const excerpt = tokens <= remaining ? item.content : excerptFor(item.content, remaining);
    if (!excerpt) continue;
    const excerptTokens = estimateTokens(excerpt);
    chunks.push({
      source: path.relative(cwd, item.filePath),
      excerpt,
      score: item.score,
      tokens: excerptTokens,
    });
    used += excerptTokens;
  }

  return { chunks, totalTokens: used, budget, empty: chunks.length === 0 };
}

/** Render a selection into a single Markdown block, or null when there's nothing to inject. */
function formatMemoryContext(selection) {
  if (!selection || selection.empty || selection.chunks.length === 0) return null;
  const lines = ['## Relevant memory', ''];
  for (const chunk of selection.chunks) {
    lines.push(`### ${chunk.source}`);
    lines.push(chunk.excerpt.trim());
    lines.push('');
  }
  return lines.join('\n').trim();
}

module.exports = {
  DEFAULT_BUDGET_TOKENS,
  selectMemoryChunks,
  formatMemoryContext,
  estimateTokens,
  hasMemory,
  memoryRoot,
};
