/**
 * Council panel selection — pure function that picks the right 3-5 agents
 * for a given strategic question.
 *
 * This is the v2 version of the scorer, installed alongside rihal-tools.cjs
 * at {project-root}/.rihal/bin/lib/council-panel.cjs. The helper binary
 * loads it via require() for the `init council` and `select-panel`
 * subcommands.
 *
 * Design principles:
 *
 *   - Pure function: (question, opts) → string[]. No filesystem, no
 *     network, no LLM. Deterministic across machines.
 *   - Testable: keyword table is a module constant, scoring is a
 *     straightforward weighted-match loop.
 *   - Auditable: `explainSelection()` returns per-agent scores so users
 *     running with `--explain` can see why each agent was picked.
 *   - Cheap: zero LLM calls before the council starts.
 *
 * Scoring algorithm:
 *
 *   1. Normalize the question (lowercase, strip punctuation).
 *   2. For each agent, sum the weight of every keyword that appears.
 *   3. Apply priority boosts (Sadiq for strategic triggers, Hussain-PM
 *      for scope triggers).
 *   4. Named-agent mentions get +20 (overrides topic score).
 *   5. Sort by score desc. Tiebreaker: STRATEGIC_PADDING_ORDER for
 *      strategic questions, AGENT_IDS for others.
 *   6. Take top K (default maxPanel = 5). Pad to minPanel (default 3) if
 *      fewer agents scored non-zero, using STRATEGIC_PADDING_ORDER (or
 *      AGENT_IDS for non-strategic) as the fill pool.
 *   7. If opts.full, return AGENT_IDS (canonical order).
 *   8. If opts.agents, return that exact list (validated).
 *
 * The orchestrator is responsible for filtering the result to installed
 * agents. This module returns the "ideal" panel; the workflow validates
 * against what's actually on disk.
 */

const AGENT_IDS = [
  'sadiq', 'hussain-pm', 'waleed', 'ahmed-hassani', 'nasser',
  'layla', 'zahra', 'haitham', 'yousef', 'zayd',
  'fatima', 'khalid', 'mariam', 'noor',
];

const KEYWORDS = {
  sadiq: [
    { word: 'strategy', weight: 3 },
    { word: 'kill', weight: 3 },
    { word: 'prioriti', weight: 3 },
    { word: 'market fit', weight: 3 },
    { word: 'pivot', weight: 3 },
    { word: 'new project', weight: 3 },
    { word: 'start new', weight: 3 },
    { word: 'product direction', weight: 3 },
    { word: 'outcome', weight: 2 },
    { word: 'worth', weight: 2 },
    { word: 'user', weight: 1 },
    { word: 'jobs to be done', weight: 2 },
    { word: 'jtbd', weight: 2 },
  ],
  'hussain-pm': [
    { word: 'scope', weight: 3 },
    { word: 'feature', weight: 3 },
    { word: 'requirement', weight: 3 },
    { word: 'roadmap', weight: 3 },
    { word: 'prd', weight: 3 },
    { word: 'sprint', weight: 2 },
    { word: 'story', weight: 2 },
    { word: 'user story', weight: 3 },
    { word: 'backlog', weight: 2 },
    { word: 'epic', weight: 2 },
  ],
  waleed: [
    { word: 'architecture', weight: 3 },
    { word: 'stack', weight: 3 },
    { word: 'database', weight: 2 },
    { word: 'security', weight: 3 },
    { word: 'scale', weight: 2 },
    { word: 'infrastructure', weight: 2 },
    { word: 'adr', weight: 3 },
    { word: 'tech debt', weight: 3 },
    { word: 'refactor', weight: 2 },
    { word: 'technical', weight: 2 },
    { word: 'rewrite', weight: 3 },
    { word: 'migration', weight: 2 },
  ],
  'ahmed-hassani': [
    { word: 'delivery', weight: 3 },
    { word: 'dora', weight: 3 },
    { word: 'lead time', weight: 3 },
    { word: 'ci/cd', weight: 2 },
    { word: 'release', weight: 2 },
    { word: 'velocity', weight: 3 },
    { word: 'deadline', weight: 2 },
    { word: 'timeline', weight: 2 },
  ],
  nasser: [
    { word: 'team', weight: 2 },
    { word: 'people', weight: 2 },
    { word: 'hiring', weight: 3 },
    { word: 'burnout', weight: 3 },
    { word: 'ops', weight: 1 },
    { word: 'squad', weight: 3 },
    { word: 'retrospective', weight: 3 },
    { word: 'morale', weight: 3 },
    { word: 'restart', weight: 2 },
    { word: 'discipline', weight: 2 },
    { word: 'habit', weight: 2 },
  ],
  layla: [
    { word: 'ux', weight: 3 },
    { word: 'flow', weight: 2 },
    { word: 'screen', weight: 2 },
    { word: 'journey', weight: 3 },
    { word: 'accessibility', weight: 3 },
    { word: 'a11y', weight: 3 },
    { word: 'interaction', weight: 3 },
    { word: 'user experience', weight: 3 },
    { word: 'wireframe', weight: 3 },
  ],
  zahra: [
    { word: 'brand', weight: 3 },
    { word: 'visual', weight: 2 },
    { word: 'voice', weight: 2 },
    { word: 'identity', weight: 2 },
    { word: 'color', weight: 2 },
    { word: 'typography', weight: 3 },
    { word: 'design system', weight: 3 },
    { word: 'logo', weight: 3 },
  ],
  haitham: [
    { word: 'frontend', weight: 3 },
    { word: 'react', weight: 3 },
    { word: 'next', weight: 2 },
    { word: 'component', weight: 3 },
    { word: 'rtl', weight: 3 },
    { word: 'pixel', weight: 2 },
    { word: 'browser', weight: 2 },
    { word: 'tailwind', weight: 3 },
    { word: 'landing', weight: 2 },
  ],
  yousef: [
    { word: 'backend', weight: 3 },
    { word: 'api', weight: 2 },
    { word: 'server', weight: 2 },
    { word: 'queue', weight: 3 },
    { word: 'endpoint', weight: 3 },
    { word: 'rest', weight: 2 },
    { word: 'graphql', weight: 3 },
    { word: 'integration', weight: 2 },
    { word: 'webhook', weight: 3 },
  ],
  zayd: [
    { word: 'machine learning', weight: 3 },
    { word: 'model', weight: 2 },
    { word: 'prompt', weight: 2 },
    { word: 'eval', weight: 3 },
    { word: 'dataset', weight: 3 },
    { word: 'embedding', weight: 3 },
    { word: 'llm', weight: 3 },
    { word: 'nlp', weight: 3 },
    { word: 'inference', weight: 3 },
  ],
  fatima: [
    { word: 'test', weight: 3 },
    { word: 'qa', weight: 3 },
    { word: 'bug', weight: 2 },
    { word: 'coverage', weight: 3 },
    { word: 'audit', weight: 2 },
    { word: 'gate', weight: 2 },
    { word: 'quality', weight: 3 },
    { word: 'regression', weight: 3 },
    { word: 'flaky', weight: 3 },
    { word: 'production ready', weight: 3 },
    { word: 'ready to ship', weight: 3 },
    { word: 'release ready', weight: 3 },
  ],
  khalid: [
    { word: 'deploy', weight: 3 },
    { word: 'infra', weight: 2 },
    { word: 'monitoring', weight: 3 },
    { word: 'sre', weight: 3 },
    { word: 'rollback', weight: 3 },
    { word: 'incident', weight: 3 },
    { word: 'docker', weight: 2 },
    { word: 'kubernetes', weight: 3 },
    { word: 'observability', weight: 3 },
  ],
  mariam: [
    { word: 'marketing', weight: 3 },
    { word: 'go-to-market', weight: 3 },
    { word: 'gtm', weight: 3 },
    { word: 'positioning', weight: 3 },
    { word: 'launch', weight: 3 },
    { word: 'audience', weight: 2 },
    { word: 'growth', weight: 3 },
    { word: 'acquisition', weight: 3 },
  ],
  noor: [
    { word: 'docs', weight: 3 },
    { word: 'documentation', weight: 3 },
    { word: 'readme', weight: 3 },
    { word: 'announcement', weight: 3 },
    { word: 'release notes', weight: 3 },
    { word: 'comms', weight: 2 },
    { word: 'writing', weight: 2 },
    { word: 'changelog', weight: 3 },
  ],
};

const SADIQ_TRIGGERS = [
  'should i', 'worth', 'kill', 'prioriti', 'new project',
  'pivot', 'start fresh', 'start new',
];

const PM_TRIGGERS = ['scope', 'feature', 'requirement', 'roadmap', 'prd'];

const STRATEGIC_PADDING_ORDER = [
  'sadiq', 'hussain-pm', 'waleed', 'fatima', 'nasser',
  'ahmed-hassani', 'khalid', 'yousef', 'haitham', 'layla',
  'zahra', 'zayd', 'mariam', 'noor',
];

const AGENT_NAMES = {
  sadiq: ['sadiq'],
  'hussain-pm': ['hussain', 'hussain-pm', 'hussain pm'],
  waleed: ['waleed'],
  'ahmed-hassani': ['ahmed', 'ahmed hassani', 'ahmed-hassani'],
  nasser: ['nasser'],
  layla: ['layla'],
  zahra: ['zahra'],
  haitham: ['haitham'],
  yousef: ['yousef'],
  zayd: ['zayd'],
  fatima: ['fatima'],
  khalid: ['khalid'],
  mariam: ['mariam'],
  noor: ['noor'],
};

function normalize(question) {
  return (question || '')
    .toLowerCase()
    .replace(/[.,;:!?"()\[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreAgent(agentId, normalizedQuestion) {
  const keywords = KEYWORDS[agentId] || [];
  let score = 0;
  for (const { word, weight } of keywords) {
    if (normalizedQuestion.includes(word)) score += weight;
  }
  const names = AGENT_NAMES[agentId] || [];
  for (const name of names) {
    if (normalizedQuestion.includes(name)) { score += 20; break; }
  }
  return score;
}

function applyPriorityBoosts(scores, normalizedQuestion) {
  if (SADIQ_TRIGGERS.some((t) => normalizedQuestion.includes(t))) {
    scores.sadiq = (scores.sadiq || 0) + 5;
  }
  if (PM_TRIGGERS.some((t) => normalizedQuestion.includes(t))) {
    scores['hussain-pm'] = (scores['hussain-pm'] || 0) + 3;
  }
  return scores;
}

function validateAgents(agents) {
  const bad = agents.filter((id) => !AGENT_IDS.includes(id));
  if (bad.length > 0) {
    throw new Error(`Unknown agent id(s): ${bad.join(', ')}. Valid: ${AGENT_IDS.join(', ')}`);
  }
  return agents;
}

function selectPanel(question, opts = {}) {
  if (opts.full) return [...AGENT_IDS];
  if (opts.agents && opts.agents.length > 0) return validateAgents(opts.agents);

  const maxPanel = opts.maxPanel || 5;
  const minPanel = opts.minPanel || 3;
  const normalized = normalize(question);
  if (!normalized) return STRATEGIC_PADDING_ORDER.slice(0, minPanel);

  const scores = {};
  for (const agentId of AGENT_IDS) scores[agentId] = scoreAgent(agentId, normalized);
  applyPriorityBoosts(scores, normalized);

  const isStrategic = SADIQ_TRIGGERS.some((t) => normalized.includes(t));
  const tiebreakOrder = isStrategic ? STRATEGIC_PADDING_ORDER : AGENT_IDS;
  const ranked = [...AGENT_IDS]
    .map((id) => ({ id, score: scores[id] }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return tiebreakOrder.indexOf(a.id) - tiebreakOrder.indexOf(b.id);
    });

  const scored = ranked.filter((a) => a.score > 0).slice(0, maxPanel);
  if (scored.length >= minPanel) return scored.map((a) => a.id);

  const alreadyPicked = new Set(scored.map((a) => a.id));
  const paddingPool = isStrategic ? STRATEGIC_PADDING_ORDER : AGENT_IDS;
  const padding = [];
  for (const id of paddingPool) {
    if (alreadyPicked.has(id)) continue;
    padding.push(id);
    if (scored.length + padding.length >= minPanel) break;
  }
  return [...scored.map((a) => a.id), ...padding];
}

function explainSelection(question, opts = {}) {
  const normalized = normalize(question);
  const scores = {};
  for (const agentId of AGENT_IDS) scores[agentId] = scoreAgent(agentId, normalized);
  applyPriorityBoosts(scores, normalized);
  const panel = selectPanel(question, opts);
  return {
    question, normalized, scores, panel,
    sadiq_triggered: SADIQ_TRIGGERS.some((t) => normalized.includes(t)),
    pm_triggered: PM_TRIGGERS.some((t) => normalized.includes(t)),
  };
}

module.exports = {
  AGENT_IDS, KEYWORDS, SADIQ_TRIGGERS, PM_TRIGGERS, AGENT_NAMES,
  normalize, scoreAgent, applyPriorityBoosts, selectPanel, explainSelection,
};
