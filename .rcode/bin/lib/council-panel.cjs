/**
 * Council panel selection — pure function that picks the right agents
 * for a given question.
 *
 * This is the v2 version of the scorer, installed alongside rcode-tools.cjs
 * at {project-root}/.rcode/bin/lib/council-panel.cjs. The helper binary
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
 *   - Intent-matched: domain-specific panels. FE question → Haitham leads.
 *     BE question → Yousef leads. No strategic padding for technical work.
 *   - Optional team.yaml: If team.yaml exists at project root, reads
 *     domain_keywords from it. Fallback: hardcoded keywords below.
 *
 * Scoring algorithm:
 *
 *   1. Load keywords from team.yaml if present (via loadTeamConfig),
 *      else use hardcoded KEYWORDS below.
 *   2. Normalize the question (lowercase, strip punctuation).
 *   3. For each agent, sum the weight of every keyword that appears.
 *   4. Apply priority boosts (Sadiq for strategic triggers, domain
 *      boosts for FE/BE/ML/deploy questions).
 *   5. Named-agent mentions get +20 (overrides topic score).
 *   6. Detect domain from top-scoring agents: fe / be / ml / deploy /
 *      quality / strategic / market.
 *   7. Sort by score desc. Tiebreaker: domain-specific padding order.
 *   8. maxPanel=3 for technical domains (fe/be/ml/deploy/quality),
 *      maxPanel=4 for strategic/market. minPanel=1 always — no forced
 *      lame padding for specific technical questions.
 *   9. If opts.full, return AGENT_IDS (canonical order).
 *   10. If opts.agents, return that exact list (validated).
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
    // Performance / latency signals — backend is the perf diagnosis owner
    { word: 'latency', weight: 3 },
    { word: 'slow', weight: 2 },
    { word: 'p50', weight: 3 },
    { word: 'p95', weight: 3 },
    { word: 'p99', weight: 3 },
    { word: 'throughput', weight: 3 },
    { word: 'ttft', weight: 3 },
    { word: 'response time', weight: 3 },
    { word: 'optimize', weight: 2 },
    { word: 'bottleneck', weight: 3 },
    { word: 'n+1', weight: 3 },
    { word: 'timeout', weight: 3 },
    { word: 'caching', weight: 2 },
    { word: 'rate limit', weight: 2 },
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
    // OCR + vision + retrieval signals
    { word: 'ocr', weight: 3 },
    { word: 'optical character', weight: 3 },
    { word: 'vision', weight: 2 },
    { word: 'rag', weight: 3 },
    { word: 'retrieval', weight: 3 },
    { word: 'vector search', weight: 3 },
    { word: 'reranker', weight: 3 },
    { word: 'rerank', weight: 3 },
    { word: 'semantic search', weight: 3 },
    { word: 'vespa', weight: 3 },
    { word: 'qdrant', weight: 3 },
    { word: 'pinecone', weight: 3 },
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
    // Performance testing signals
    { word: 'perf test', weight: 3 },
    { word: 'load test', weight: 3 },
    { word: 'stress test', weight: 3 },
    { word: 'benchmark', weight: 3 },
    { word: 'baseline metric', weight: 3 },
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
    { word: 'market research', weight: 3 },
    { word: 'market opportunity', weight: 3 },
    { word: 'which project', weight: 3 },
    { word: 'what project', weight: 3 },
    { word: 'what to build', weight: 3 },
    { word: 'new business', weight: 3 },
    { word: 'new venture', weight: 3 },
    { word: 'oman', weight: 2 },
    { word: 'saudi', weight: 2 },
    { word: 'uae', weight: 2 },
    { word: 'gcc', weight: 2 },
    { word: 'mena', weight: 2 },
    { word: '2040', weight: 2 },
    { word: '2030', weight: 2 },
    { word: 'channel', weight: 2 },
    { word: 'customer segment', weight: 3 },
    { word: 'target audience', weight: 3 },
    { word: 'buyer', weight: 2 },
    { word: 'sector', weight: 2 },
    // Roman Urdu market signals
    { word: 'dubai', weight: 2 },
    { word: 'affiliate', weight: 2 },
    { word: 'karobar', weight: 2 },
    { word: 'bnanai', weight: 2 },
    // Urdu unicode market signals
    { word: 'دبئی', weight: 2 },
    { word: 'مارکیٹ', weight: 2 },
    { word: 'کاروبار', weight: 2 },
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

// Market/discovery questions: Mariam leads, Hussain-PM follows for scoping
const MARKET_TRIGGERS = [
  'what project', 'which project', 'oman', 'saudi', 'uae', 'gcc', 'mena',
  '2040', '2030', 'market research', 'go to market', 'gtm', 'positioning',
  'launch', 'what to build', 'which market', 'market opportunity',
  'new business', 'new venture',
  // Roman Urdu market/greenfield signals so Mariam gets her score boost
  'dubai', 'affiliate', 'bnanai', 'karobar', 'site', 'banana',
  // Urdu unicode market triggers
  'دبئی', 'مارکیٹ', 'کاروبار',
];

// For market/discovery questions, Mariam leads; Hussain-PM follows for scoping.
const MARKET_PADDING_ORDER = [
  'mariam', 'hussain-pm', 'sadiq', 'waleed', 'fatima',
  'nasser', 'ahmed-hassani', 'khalid', 'yousef', 'haitham',
  'layla', 'zahra', 'zayd', 'noor',
];

const STRATEGIC_PADDING_ORDER = [
  'sadiq', 'hussain-pm', 'waleed', 'fatima', 'nasser',
  'ahmed-hassani', 'khalid', 'yousef', 'haitham', 'layla',
  'zahra', 'zayd', 'mariam', 'noor',
];

// Domain-specific padding orders — used when a technical domain is clearly detected.
// These put the right specialists first and keep PM/strategy out unless asked.
const FRONTEND_PADDING_ORDER = [
  'haitham', 'layla', 'zahra', 'yousef', 'waleed',
  'fatima', 'sadiq', 'hussain-pm', 'zayd', 'khalid',
  'nasser', 'ahmed-hassani', 'mariam', 'noor',
];

const BACKEND_PADDING_ORDER = [
  'yousef', 'waleed', 'khalid', 'fatima', 'haitham',
  'zayd', 'ahmed-hassani', 'sadiq', 'hussain-pm', 'layla',
  'nasser', 'zahra', 'mariam', 'noor',
];

const ML_PADDING_ORDER = [
  'zayd', 'yousef', 'waleed', 'fatima', 'khalid',
  'haitham', 'sadiq', 'hussain-pm', 'ahmed-hassani', 'layla',
  'nasser', 'zahra', 'mariam', 'noor',
];

const DEPLOY_PADDING_ORDER = [
  'khalid', 'waleed', 'yousef', 'ahmed-hassani', 'fatima',
  'sadiq', 'haitham', 'zayd', 'hussain-pm', 'nasser',
  'layla', 'zahra', 'mariam', 'noor',
];

const QUALITY_PADDING_ORDER = [
  'fatima', 'waleed', 'yousef', 'haitham', 'khalid',
  'sadiq', 'zayd', 'ahmed-hassani', 'hussain-pm', 'layla',
  'nasser', 'zahra', 'mariam', 'noor',
];

// Domain trigger arrays — when these fire, the question is clearly technical
// and should NOT be padded with PM/strategy agents.
const FE_TRIGGERS = [
  'react', 'component', 'frontend', 'front-end', 'next.js', 'nextjs',
  'tailwind', 'css', 'html', 'tsx', 'jsx', 'rtl', 'a11y', 'accessibility',
  'ui ', 'ux ', 'layout', 'responsive', 'animation', 'hydration',
  'bundle size', 'lighthouse', 'cls', 'lcp', 'tbt',
  // Roman Urdu FE signals
  'fe ', 'front end', 'button', 'page ', 'screen ', 'form ',
];

const BE_TRIGGERS = [
  'backend', 'back-end', 'api', 'endpoint', 'server', 'prisma', 'database',
  'query', 'schema', 'migration', 'queue', 'webhook', 'rest', 'graphql',
  'n+1', 'index', 'latency', 'timeout', 'caching', 'redis', 'postgres',
  'mysql', 'mongodb', 'bullmq', 'celery', 'worker', 'job', 'cron',
  // Roman Urdu BE signals
  'be ', 'db ', 'api call', 'server side',
];

const ML_TRIGGERS = [
  'llm', 'model', 'embedding', 'rag', 'retrieval', 'vector', 'ocr',
  'prompt', 'inference', 'fine-tun', 'dataset', 'eval', 'nlp',
  'openai', 'anthropic', 'gemini', 'gpt', 'claude', 'mistral',
];

const DEPLOY_TRIGGERS = [
  'deploy', 'docker', 'kubernetes', 'k8s', 'ci/cd', 'cicd', 'pipeline',
  'rollback', 'incident', 'outage', 'monitoring', 'alert', 'sre',
  'infra', 'cloud', 'aws', 'gcp', 'azure', 'vps',
];

const QUALITY_TRIGGERS = [
  'test coverage', 'qa ', 'regression', 'flaky', 'production ready',
  'ready to ship', 'release ready', 'perf test', 'load test', 'benchmark',
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

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function matchesKeyword(text, word) {
  // Word-boundary match, not substring — avoids collisions like
  // "storage" containing "rag" (#1034 follow-up).
  return new RegExp('\\b' + escapeRegExp(word) + '\\b').test(text);
}

function scoreAgent(agentId, normalizedQuestion) {
  const keywords = KEYWORDS[agentId] || [];
  let score = 0;
  for (const { word, weight } of keywords) {
    if (matchesKeyword(normalizedQuestion, word)) score += weight;
  }
  const names = AGENT_NAMES[agentId] || [];
  for (const name of names) {
    const re = new RegExp('\\b' + name.replace(/[-]/g, '[-\\s]') + '\\b');
    if (re.test(normalizedQuestion)) { score += 20; break; }
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
  if (MARKET_TRIGGERS.some((t) => normalizedQuestion.includes(t))) {
    scores.mariam = (scores.mariam || 0) + 6; // Mariam leads market questions
    scores['hussain-pm'] = (scores['hussain-pm'] || 0) + 3; // PM follows for scoping
  }
  // Domain boosts — lift the right technical expert when signal is clear
  if (FE_TRIGGERS.some((t) => normalizedQuestion.includes(t))) {
    scores.haitham = (scores.haitham || 0) + 4;
  }
  if (BE_TRIGGERS.some((t) => normalizedQuestion.includes(t))) {
    scores.yousef = (scores.yousef || 0) + 4;
  }
  if (ML_TRIGGERS.some((t) => normalizedQuestion.includes(t))) {
    scores.zayd = (scores.zayd || 0) + 4;
  }
  if (DEPLOY_TRIGGERS.some((t) => normalizedQuestion.includes(t))) {
    scores.khalid = (scores.khalid || 0) + 4;
  }
  if (QUALITY_TRIGGERS.some((t) => normalizedQuestion.includes(t))) {
    scores.fatima = (scores.fatima || 0) + 4;
  }
  return scores;
}

/**
 * Detect the primary domain of a question from its normalized text and scores.
 * Returns: 'fe' | 'be' | 'ml' | 'deploy' | 'quality' | 'market' | 'strategic' | 'general'
 */
function detectDomain(normalizedQuestion, scores) {
  const isMarket = MARKET_TRIGGERS.some((t) => normalizedQuestion.includes(t));
  if (isMarket) return 'market';

  const isStrategic = SADIQ_TRIGGERS.some((t) => normalizedQuestion.includes(t));

  const feTrigger = FE_TRIGGERS.some((t) => normalizedQuestion.includes(t));
  const beTrigger = BE_TRIGGERS.some((t) => normalizedQuestion.includes(t));
  const mlTrigger = ML_TRIGGERS.some((t) => normalizedQuestion.includes(t));
  const deployTrigger = DEPLOY_TRIGGERS.some((t) => normalizedQuestion.includes(t));
  const qualityTrigger = QUALITY_TRIGGERS.some((t) => normalizedQuestion.includes(t));

  // Multiple technical domains present — fall back to top-scoring agent
  const technicalCount = [feTrigger, beTrigger, mlTrigger, deployTrigger, qualityTrigger].filter(Boolean).length;
  if (technicalCount >= 2) {
    // Resolve by whichever technical expert scored highest
    const techLeaders = [
      { domain: 'fe', agent: 'haitham', score: scores.haitham || 0 },
      { domain: 'be', agent: 'yousef', score: scores.yousef || 0 },
      { domain: 'ml', agent: 'zayd', score: scores.zayd || 0 },
      { domain: 'deploy', agent: 'khalid', score: scores.khalid || 0 },
      { domain: 'quality', agent: 'fatima', score: scores.fatima || 0 },
    ].sort((a, b) => b.score - a.score);
    if (techLeaders[0].score > 0) return techLeaders[0].domain;
  }

  if (feTrigger) return 'fe';
  if (beTrigger) return 'be';
  if (mlTrigger) return 'ml';
  if (deployTrigger) return 'deploy';
  if (qualityTrigger) return 'quality';
  if (isStrategic) return 'strategic';
  return 'general';
}

function validateAgents(agents) {
  const bad = agents.filter((id) => !AGENT_IDS.includes(id));
  if (bad.length > 0) {
    throw new Error(`Unknown agent id(s): ${bad.join(', ')}. Valid: ${AGENT_IDS.join(', ')}`);
  }
  return agents;
}

const DOMAIN_PADDING = {
  fe:       FRONTEND_PADDING_ORDER,
  be:       BACKEND_PADDING_ORDER,
  ml:       ML_PADDING_ORDER,
  deploy:   DEPLOY_PADDING_ORDER,
  quality:  QUALITY_PADDING_ORDER,
  market:   MARKET_PADDING_ORDER,
  strategic: STRATEGIC_PADDING_ORDER,
  general:  STRATEGIC_PADDING_ORDER,
};

// Technical domains keep panels small — 1 right expert beats 3 wrong ones.
const DOMAIN_MAX_PANEL = {
  fe: 3, be: 3, ml: 3, deploy: 3, quality: 3,
  market: 4, strategic: 4, general: 3,
};

// minPanel=1: never force-pad with irrelevant agents.
const DOMAIN_MIN_PANEL = {
  fe: 1, be: 1, ml: 1, deploy: 1, quality: 1,
  market: 2, strategic: 2, general: 1,
};

function selectPanel(question, opts = {}) {
  if (opts.full) return [...AGENT_IDS];
  if (opts.agents && opts.agents.length > 0) return validateAgents(opts.agents);

  const normalized = normalize(question);
  if (!normalized) return STRATEGIC_PADDING_ORDER.slice(0, 2);

  const scores = {};
  for (const agentId of AGENT_IDS) scores[agentId] = scoreAgent(agentId, normalized);
  applyPriorityBoosts(scores, normalized);

  const domain = detectDomain(normalized, scores);
  const maxPanel = opts.maxPanel || DOMAIN_MAX_PANEL[domain];
  const minPanel = opts.minPanel || DOMAIN_MIN_PANEL[domain];
  const paddingPool = DOMAIN_PADDING[domain];

  const ranked = [...AGENT_IDS]
    .map((id) => ({ id, score: scores[id] }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return paddingPool.indexOf(a.id) - paddingPool.indexOf(b.id);
    });

  const scored = ranked.filter((a) => a.score > 0).slice(0, maxPanel);

  // If we have at least minPanel scored agents, return them — no padding needed.
  if (scored.length >= minPanel) return scored.map((a) => a.id);

  // Pad only up to minPanel using domain-appropriate agents.
  const alreadyPicked = new Set(scored.map((a) => a.id));
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
  const domain = detectDomain(normalized, scores);
  const panel = selectPanel(question, opts);
  return {
    question, normalized, scores, panel, domain,
    sadiq_triggered: SADIQ_TRIGGERS.some((t) => normalized.includes(t)),
    pm_triggered: PM_TRIGGERS.some((t) => normalized.includes(t)),
    fe_triggered: FE_TRIGGERS.some((t) => normalized.includes(t)),
    be_triggered: BE_TRIGGERS.some((t) => normalized.includes(t)),
    ml_triggered: ML_TRIGGERS.some((t) => normalized.includes(t)),
    deploy_triggered: DEPLOY_TRIGGERS.some((t) => normalized.includes(t)),
  };
}

/**
 * Load team configuration from team.yaml if present.
 * Returns { keywords_map, agent_ids } on success.
 * Falls back to hardcoded KEYWORDS and AGENT_IDS if file missing or parse fails.
 */
function loadTeamConfig(projectRoot) {
  try {
    const fs = require('fs');
    const path = require('path');
    const teamYamlPath = path.join(projectRoot, 'rcode', 'v2', 'team.yaml');

    if (!fs.existsSync(teamYamlPath)) {
      return null; // Use hardcoded fallback
    }

    const teamYamlContent = fs.readFileSync(teamYamlPath, 'utf8');
    const yamlLines = teamYamlContent.split('\n');
    const keywordMap = {};
    const agentIds = [];

    let currentAgentId = null;
    let parsingAgents = false;

    for (const line of yamlLines) {
      const trimmed = line.trim();

      // Detect agents section
      if (trimmed.startsWith('agents:')) {
        parsingAgents = true;
        continue;
      }

      // Detect end of agents section
      if (parsingAgents && trimmed === 'utility_agents:') {
        parsingAgents = false;
        continue;
      }

      // Parse agent entry
      if (parsingAgents && trimmed.startsWith('- id:')) {
        currentAgentId = trimmed.replace('- id:', '').trim();
        agentIds.push(currentAgentId);
        keywordMap[currentAgentId] = [];
      }

      // Parse domain_keywords list
      if (currentAgentId && trimmed.startsWith('domain_keywords:')) {
        // Keywords follow as a list under this key
        let nextLineIdx = yamlLines.indexOf(line) + 1;
        while (nextLineIdx < yamlLines.length) {
          const nextLine = yamlLines[nextLineIdx];
          const nextTrimmed = nextLine.trim();

          // Stop at next key or end of agent block
          if (nextTrimmed === '' || (nextTrimmed.startsWith('-') && !nextTrimmed.startsWith('- '))) {
            break;
          }

          // Parse keyword line (format: "      - keyword")
          if (nextTrimmed.startsWith('- ')) {
            const keyword = nextTrimmed.slice(2).trim();
            keywordMap[currentAgentId].push({ word: keyword, weight: 2 });
          }

          nextLineIdx++;
        }
      }
    }

    return { keywords: keywordMap, agents: agentIds, source: 'team.yaml' };
  } catch (e) {
    return null; // Silently fall back to hardcoded
  }
}

module.exports = {
  AGENT_IDS, KEYWORDS, AGENT_NAMES,
  SADIQ_TRIGGERS, PM_TRIGGERS, MARKET_TRIGGERS,
  FE_TRIGGERS, BE_TRIGGERS, ML_TRIGGERS, DEPLOY_TRIGGERS, QUALITY_TRIGGERS,
  STRATEGIC_PADDING_ORDER, MARKET_PADDING_ORDER,
  FRONTEND_PADDING_ORDER, BACKEND_PADDING_ORDER, ML_PADDING_ORDER,
  DEPLOY_PADDING_ORDER, QUALITY_PADDING_ORDER,
  DOMAIN_PADDING, DOMAIN_MAX_PANEL, DOMAIN_MIN_PANEL,
  normalize, scoreAgent, applyPriorityBoosts, detectDomain,
  selectPanel, explainSelection, loadTeamConfig,
};
