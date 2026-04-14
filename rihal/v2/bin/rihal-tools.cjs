#!/usr/bin/env node
/**
 * rihal-tools.cjs — the helper binary every Rihal v2 workflow shells out to.
 *
 * Design goal: one Bash call per workflow step returns a single JSON blob
 * with every path, flag, and config value the orchestrator needs. This
 * replaces what would otherwise be 5-10 Read calls in the parent context
 * and keeps the orchestrator's context window small.
 *
 * Installed at: {project-root}/.rihal/bin/rihal-tools.cjs
 *
 * Subcommands:
 *   init <workflow-name> "<raw-args>"    → JSON context blob for a workflow
 *   select-panel "<question>" [flags]    → JSON { panel, scores, question, flags }
 *   classify-question "<question>"       → JSON { type, signals } (codebase|discovery|market|greenfield)
 *   agent-info <agent-id>                → JSON row from agent-manifest.csv
 *   list-agents                          → JSON array of installed agent ids
 *   version                              → package version
 *
 * Zero external dependencies. Pure Node stdlib. Runs offline.
 */

const fs = require('fs');
const path = require('path');

// Resolve project root. This file is installed at {project-root}/.rihal/bin/,
// so two levels up is the project.
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const RIHAL_DIR = path.join(PROJECT_ROOT, '.rihal');
const CONFIG_DIR = path.join(RIHAL_DIR, '_config');
const REFS_DIR = path.join(RIHAL_DIR, 'references');
const WORKFLOWS_DIR = path.join(RIHAL_DIR, 'workflows');
const PLANNING_DIR = path.join(PROJECT_ROOT, '.planning');
const SESSIONS_DIR = path.join(PLANNING_DIR, 'council-sessions');

/**
 * Parse a minimal YAML subset for our flat config.yaml shape.
 * Only supports `key: value` lines — no nesting, no lists, no flow syntax.
 */
function parseSimpleYaml(text) {
  const out = {};
  for (const raw of text.split('\n')) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    const colonAt = line.indexOf(':');
    if (colonAt === -1) continue;
    const key = line.slice(0, colonAt).trim();
    let val = line.slice(colonAt + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
    out[key] = val;
  }
  return out;
}

function readConfig() {
  const configPath = path.join(RIHAL_DIR, 'config.yaml');
  if (!fs.existsSync(configPath)) {
    return {
      user_name: 'User',
      project_name: path.basename(PROJECT_ROOT),
      language: 'English',
      mode: 'guided',
    };
  }
  const parsed = parseSimpleYaml(fs.readFileSync(configPath, 'utf8'));
  return {
    user_name: parsed.user_name || 'User',
    project_name: parsed.project_name || path.basename(PROJECT_ROOT),
    language: parsed.communication_language || parsed.language || 'English',
    mode: parsed.mode || 'guided',
  };
}

/**
 * Parse CSV with quoted-field support. Expects the first row to be headers.
 * Returns array of objects keyed by header.
 */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else field += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { row.push(field); field = ''; }
      else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (ch === '\r') { /* skip */ }
      else field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  if (rows.length === 0) return [];
  const headers = rows[0];
  return rows.slice(1).filter((r) => r.length >= headers.length && r.some((c) => c !== '')).map((r) => {
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = r[idx] || ''; });
    return obj;
  });
}

/**
 * Recursively walk a directory and return absolute file paths.
 */
function walkFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
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

function readAgentManifest() {
  const manifestPath = path.join(CONFIG_DIR, 'agent-manifest.csv');
  if (!fs.existsSync(manifestPath)) return [];
  return parseCsv(fs.readFileSync(manifestPath, 'utf8'));
}

function listInstalledAgents() {
  return readAgentManifest().map((row) => row.id).filter(Boolean);
}

/**
 * Load the council-panel scoring function. Installed at
 * .rihal/bin/lib/council-panel.cjs alongside this helper.
 */
function loadPanelScorer() {
  const scorerPath = path.join(__dirname, 'lib', 'council-panel.cjs');
  if (!fs.existsSync(scorerPath)) {
    throw new Error(`Panel scorer missing at ${scorerPath}. Reinstall with 'rihal-code install-v2'.`);
  }
  return require(scorerPath);
}

/**
 * Parse raw workflow args. Returns { question, flags }.
 *
 * Flag grammar:
 *   --full                        → flags.full = true
 *   --agents=a,b,c                → flags.agents = ['a','b','c']
 *   --explain                     → flags.explain = true
 *   --top N  or  --top=N          → flags.top = N (integer)
 *
 * Everything else becomes part of the question.
 */
function parseArgs(raw) {
  const flags = { full: false, agents: [], explain: false, top: null };
  const words = [];
  const tokens = (raw || '').trim().split(/\s+/).filter(Boolean);
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (tok === '--full') flags.full = true;
    else if (tok === '--explain') flags.explain = true;
    else if (tok.startsWith('--agents=')) {
      flags.agents = tok.slice('--agents='.length).split(',').map((s) => s.trim()).filter(Boolean);
    } else if (tok.startsWith('--top=')) {
      flags.top = parseInt(tok.slice('--top='.length), 10) || null;
    } else if (tok === '--top' && i + 1 < tokens.length && /^\d+$/.test(tokens[i + 1])) {
      flags.top = parseInt(tokens[++i], 10);
    } else {
      words.push(tok);
    }
  }
  return { question: words.join(' '), flags };
}

/**
 * Take the scorer's ideal panel and reduce it to agents actually installed
 * on disk. If the ideal panel references uninstalled ids (e.g. hussain-pm
 * in the v2 prototype), they are dropped and the panel is padded from the
 * remaining installed agents in their canonical order — so the user still
 * sees a reasonable panel size instead of a 1- or 2-agent stub.
 *
 * Minimum panel size is min(3, installedAgents.length) — if the project
 * only has 2 installed agents we return both, not a broken padded panel.
 *
 * Padding is SKIPPED when the user explicitly passed --agents=, because
 * that flag is a direct user intent and we must not add agents they
 * didn't ask for.
 */
function filterPanelToInstalled(idealPanel, installedAgents, { pad = true } = {}) {
  const kept = idealPanel.filter((id) => installedAgents.includes(id));
  if (!pad) return kept;

  const minTarget = Math.min(3, installedAgents.length);
  if (kept.length >= minTarget) return kept;

  const already = new Set(kept);
  const padded = [...kept];
  for (const id of installedAgents) {
    if (padded.length >= minTarget) break;
    if (!already.has(id)) padded.push(id);
  }
  return padded;
}

function cmdInit(workflowName, rawArgs) {
  const config = readConfig();
  const installedAgents = listInstalledAgents();
  const { question, flags } = parseArgs(rawArgs);

  let panel = [];
  let scores = {};

  let agent_id = null;

  if (workflowName === 'council') {
    const COUNCIL_EXCLUDED = ['executor', 'planner'];
    const councilAgents = installedAgents.filter((id) => !COUNCIL_EXCLUDED.includes(id));
    const scorer = loadPanelScorer();
    const opts = {};
    if (flags.full) opts.full = true;
    if (flags.agents.length > 0) opts.agents = flags.agents;
    const ideal = scorer.selectPanel(question, opts);
    // Don't pad when user explicitly specified the agent list — their
    // choice is the final word.
    panel = filterPanelToInstalled(ideal, councilAgents, { pad: flags.agents.length === 0 });
    if (flags.explain) {
      const explained = scorer.explainSelection(question, opts);
      scores = explained.scores || {};
    }
  }

  if (workflowName === 'discuss') {
    // Check if the first token of the question is a known agent id.
    // If so, extract it and shorten the question.
    const qWords = question.split(/\s+/).filter(Boolean);
    if (qWords.length > 0 && installedAgents.includes(qWords[0])) {
      agent_id = qWords[0];
    }
  }

  const questionClassification = cmdClassifyQuestion(
    agent_id ? question.slice(agent_id.length).trim() : question
  );

  // For discuss, strip agent_id from the question in the output
  const outputQuestion = (workflowName === 'discuss' && agent_id)
    ? question.slice(agent_id.length).trim()
    : question;

  const out = {
    workflow: workflowName,
    question: outputQuestion,
    agent_id,
    flags,
    panel,
    scores,
    question_type: questionClassification.type,
    question_signals: questionClassification.signals,
    config,
    installed_agents: installedAgents,
    paths: {
      project_root: PROJECT_ROOT,
      rihal: RIHAL_DIR,
      config_dir: CONFIG_DIR,
      refs: REFS_DIR,
      workflows: WORKFLOWS_DIR,
      planning_root: PLANNING_DIR,
      sessions_dir: SESSIONS_DIR,
      state: path.join(RIHAL_DIR, 'state.json'),
    },
    state_exists: fs.existsSync(path.join(RIHAL_DIR, 'state.json')),
  };

  return out;
}

function cmdSelectPanel(rawArgs) {
  const { question, flags } = parseArgs(rawArgs);
  const scorer = loadPanelScorer();
  const opts = {};
  if (flags.full) opts.full = true;
  if (flags.agents.length > 0) opts.agents = flags.agents;
  const ideal = scorer.selectPanel(question, opts);
  const explained = scorer.explainSelection(question, opts);
  const installed = listInstalledAgents();
  let panel = filterPanelToInstalled(ideal, installed, { pad: flags.agents.length === 0 });

  // --top N: return only the top N agents by score
  if (flags.top && flags.top > 0) {
    // Sort panel by score descending, then slice
    const scoreMap = explained.scores || {};
    panel = [...panel].sort((a, b) => (scoreMap[b] || 0) - (scoreMap[a] || 0)).slice(0, flags.top);
  }

  return {
    question,
    flags,
    panel,
    scores: explained.scores,
    installed,
  };
}

function cmdAgentInfo(agentId) {
  const row = readAgentManifest().find((r) => r.id === agentId);
  if (!row) {
    console.error(`Unknown agent: ${agentId}`);
    process.exit(1);
  }
  return row;
}

function cmdListAgents() {
  return { agents: listInstalledAgents() };
}

/**
 * Classify a question into one of four types so the workflow can decide
 * whether to run a codebase scan or a research/discovery pre-step.
 *
 * Types:
 *   codebase    — question is about existing code, architecture, tests, commits, bugs
 *   discovery   — question is about choosing what to build (new project, sector, market)
 *   market      — question is about external context (plans, regulations, competitors, geography)
 *   greenfield  — question is about starting from scratch with no existing artifacts
 *   team        — question is about people, hiring, org structure, process, culture
 *   release     — question is about shipping, deploy, rollback, incident, production
 *   design      — question is about UX, brand, visual, user journey, interface
 *
 * Returns { type, signals: string[] } where signals are the matched phrases.
 */
function cmdClassifyQuestion(raw) {
  const normalized = (raw || '').toLowerCase().replace(/[.,;:!?"()\[\]{}]/g, ' ').replace(/\s+/g, ' ').trim();

  const SIGNAL_GROUPS = {
    discovery: [
      'what project', 'which project', 'what should we build', 'what to build',
      'which market', 'what market', 'where should we start', 'what business',
      'which idea', 'what idea', 'start a company', 'start a business',
      'new venture', 'new startup', 'what opportunity',
      // Roman Urdu discovery signals
      'research kar', 'pata karo', 'batao', 'kaisa', 'kya karo', 'suggest karo',
      // Roman Urdu strategic signals (what-should-I-do questions)
      'kya karna', 'worth hai', 'sahi hai', 'kya sochte', 'kya lagta',
      // Urdu unicode discovery signals
      'ریسرچ', 'بتاؤ', 'ماذا', 'أفضل', 'کیف',
    ],
    market: [
      '2040', '2030', '2050', 'vision plan', 'national plan', 'government plan',
      'strategy plan', 'economic plan', 'development plan', 'five year plan',
      'oman', 'saudi', 'uae', 'gulf', 'gcc', 'mena', 'bahrain', 'qatar', 'kuwait',
      'market opportunity', 'market size', 'competitor', 'industry trend',
      'regulation', 'compliance', 'sector', 'economy',
      // Roman Urdu market signals
      'dubai', 'affiliate', 'karobar', 'business karna', 'market research kar',
      // Urdu unicode market signals
      'دبئی', 'مارکیٹ', 'کاروبار', 'خلیج', 'ہل', 'سوق', 'مشروع',
    ],
    greenfield: [
      'start fresh', 'from scratch', 'new project', 'blank slate', 'greenfield',
      'build something new', 'start building', 'no existing', 'haven\'t started',
      'bootstrap', 'kickoff',
      // Business-launch patterns (overloaded "launch" word — these disambiguate to business intent, not release)
      'launch a website', 'launch a site', 'launch a business', 'launch a startup',
      'launch an app', 'launch a product', 'launch a service', 'launch the website',
      'launch the site', 'launch the business', 'website launch', 'site launch',
      'business launch', 'product launch', 'startup launch',
      'launch karna', 'launch karo', 'website launch karna', 'site launch karna',
      'rent website', 'rental site', 'rental marketplace', 'rental platform',
      'quick bucks', 'side hustle', 'make money',
      // Roman Urdu greenfield signals
      'bnanai', 'banana', 'app banana', 'shuru', 'start karna', 'naya project', 'project banana', 'build karna',
      // Urdu unicode greenfield signals
      'سائٹ بنانا', 'ایپ بنانا',
    ],
    team: [
      'hiring', 'hire', 'fire', 'team size', 'squad', 'org structure', 'burnout',
      'morale', 'retrospective', 'culture', 'process', 'onboarding', 'offboarding',
      'performance review', 'raise', 'promotion', 'conflict', 'burning out', 'burn out',
      'overwork', 'overworked', 'retention', 'turnover',
    ],
    release: [
      'deploy', 'deployment', 'ship to prod', 'shipping', 'rollback', 'incident', 'production issue',
      'hotfix', 'feature flag', 'canary', 'blue green', 'downtime', 'outage',
      'monitoring', 'alert', 'on call', 'oncall',
      'production launch', 'release launch',
    ],
    design: [
      'ux', 'user experience', 'user journey', 'wireframe', 'prototype', 'figma',
      'brand', 'visual identity', 'color palette', 'typography', 'logo',
      'design system', 'component library', 'accessibility', 'a11y', 'ui design',
      'redesign', 'onboarding flow', 'landing page', 'interface', 'layout',
    ],
    codebase: [
      'rewrite', 'refactor', 'migrate', 'this code', 'this function', 'this file',
      'this component', 'this api', 'this service', 'this database', 'this schema',
      'the auth', 'the tests', 'the build', 'the deploy', 'the pipeline',
      'production ready', 'ready to ship', 'test coverage', 'bug', 'error',
      'performance', 'should i rewrite', 'auth layer', 'db migration',
      'pull request', 'code review', 'technical debt', 'tech debt',
      'feature', 'ci/cd', 'cicd', 'pipeline', 'documentation', 'docs',
      'إعادة', 'کود',
    ],
  };

  const matchedSignals = (signals) => signals.filter((s) => normalized.includes(s));
  const matched = {};
  for (const [type, signals] of Object.entries(SIGNAL_GROUPS)) {
    matched[type] = matchedSignals(signals);
  }

  // Weights per type
  const WEIGHTS = { discovery: 3, market: 2, greenfield: 2, team: 3, release: 3, design: 3, codebase: 3 };
  const scores = {};
  for (const [type, hits] of Object.entries(matched)) {
    scores[type] = hits.length * WEIGHTS[type];
  }

  // discovery + market together = market-research question
  if (matched.discovery.length > 0 && matched.market.length > 0) {
    return { type: 'market', signals: [...matched.discovery, ...matched.market], scores };
  }

  const winner = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  const type = winner[1] > 0 ? winner[0] : 'codebase'; // default to codebase
  const allSignals = Object.values(matched).flat();

  return { type, signals: allSignals, scores };
}

/**
 * init execute — returns context blob for the /rihal:execute workflow.
 * Resolves plan_path (single file or phase directory), reads the plan
 * frontmatter, and returns dependency wave groupings.
 */
function cmdInitExecute(rawArgs) {
  const config = readConfig();
  const tokens = (rawArgs || '').trim().split(/\s+/).filter(Boolean);
  const flags = { wave: null, interactive: false, continue: false, option: null };
  const positional = [];

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === '--interactive') flags.interactive = true;
    else if (t === '--continue') flags.continue = true;
    else if (t.startsWith('--wave=')) flags.wave = t.slice('--wave='.length);
    else if (t.startsWith('--option=')) flags.option = t.slice('--option='.length);
    else positional.push(t);
  }

  const target = positional[0] || '';
  let planPath = null;
  let phaseDir = null;
  let plans = [];

  // Resolve target: could be a .md file or a phase dir/name
  const asAbsolute = path.isAbsolute(target) ? target : path.join(PROJECT_ROOT, target);
  if (!asAbsolute.startsWith(PROJECT_ROOT)) {
    throw new Error(`Path outside project root: ${target}`);
  }
  if (target.endsWith('.md') && fs.existsSync(asAbsolute)) {
    planPath = asAbsolute;
    plans = [{ path: planPath, depends_on: [], wave: 0 }];
  } else {
    // Look for a phase directory
    const candidates = [
      asAbsolute,
      path.join(PLANNING_DIR, target),
      path.join(PLANNING_DIR, 'phases', target),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c) && fs.statSync(c).isDirectory()) {
        phaseDir = c;
        break;
      }
    }
    if (phaseDir) {
      const planFiles = walkFiles(phaseDir).filter((f) => path.basename(f) === 'PLAN.md');
      plans = planFiles.map((f) => {
        const text = fs.readFileSync(f, 'utf8');
        const { frontmatter } = parseFrontmatter(text);
        const depends = frontmatter.depends_on
          ? frontmatter.depends_on.split(',').map((s) => s.trim()).filter(Boolean)
          : [];
        return { path: f, depends_on: depends, wave: 0, plan: frontmatter.plan || path.basename(path.dirname(f)) };
      });
      // Simple wave assignment: wave 0 = no deps, wave 1 = depends on wave 0, etc.
      const assigned = new Set();
      let wave = 0;
      while (assigned.size < plans.length) {
        const prev = assigned.size;
        for (const p of plans) {
          if (assigned.has(p.path)) continue;
          const depsResolved = p.depends_on.every((dep) =>
            plans.some((q) => q.plan === dep && assigned.has(q.path))
          );
          if (depsResolved) { p.wave = wave; assigned.add(p.path); }
        }
        if (assigned.size === prev) break; // circular or missing dep — break
        wave++;
      }
    }
  }

  return {
    workflow: 'execute',
    target,
    flags,
    plan_path: planPath,
    phase_dir: phaseDir,
    plans,
    config,
    paths: {
      project_root: PROJECT_ROOT,
      rihal: RIHAL_DIR,
      planning_root: PLANNING_DIR,
      state: path.join(RIHAL_DIR, 'state.json'),
    },
    state_exists: fs.existsSync(path.join(RIHAL_DIR, 'state.json')),
  };
}

/**
 * state <subcommand> — read/write .rihal/state.json for execution tracking.
 *
 * Subcommands:
 *   read                           → print full state.json as formatted JSON
 *   get                            → alias for read
 *   init --project <name>          → create state.json if missing
 *   set-phase <name>               → set current_phase, reset current_plan, append to phases[]
 *   advance-plan                   → increment current_plan
 *   record-execution --plan <name> --tasks <n> --duration <ms> --hash <git-hash>
 *   add-decision "<summary>"       → append to decisions[]
 *   add-blocker "<description>"    → append to blockers[]
 *   resolve-blocker <index>        → set blockers[index].resolved = true
 *   record-session                 → update last_session timestamp
 *   record-council --slug <s> --panel <csv> --artifact <path>
 */
function cmdState(subArgs) {
  const statePath = path.join(RIHAL_DIR, 'state.json');
  const sub = subArgs[0];

  /** Parse --key value flags from subArgs starting at index. */
  function parseFlags(startIdx) {
    const flags = {};
    for (let i = startIdx; i < subArgs.length; i++) {
      if (subArgs[i].startsWith('--')) {
        const key = subArgs[i].slice(2);
        flags[key] = subArgs[i + 1] || '';
        i++;
      }
    }
    return flags;
  }

  /** Read state or return default skeleton. */
  function readState() {
    if (!fs.existsSync(statePath)) return null;
    const stats = fs.statSync(statePath);
    if (stats.size > 10 * 1024 * 1024) {
      throw new Error('state.json exceeds 10 MB limit — possible corruption');
    }
    return JSON.parse(fs.readFileSync(statePath, 'utf8'));
  }

  /** Atomic write: write to temp file then rename. */
  function writeState(state) {
    state.updated = new Date().toISOString();
    fs.mkdirSync(RIHAL_DIR, { recursive: true });
    const tmp = statePath + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2) + '\n');
    fs.renameSync(tmp, statePath);
    return { ok: true, state };
  }

  function defaultState(projectName) {
    const now = new Date().toISOString();
    return {
      version: '1',
      project: projectName || path.basename(PROJECT_ROOT),
      created: now,
      updated: now,
      current_phase: null,
      current_plan: 0,
      phases: [],
      executions: [],
      decisions: [],
      blockers: [],
      council_sessions: [],
      last_session: null,
      workstreams: [],
      active_workstream: null,
    };
  }

  // --- read / get ---
  if (sub === 'read' || sub === 'get') {
    const state = readState();
    if (!state) return { state: null };
    return state;
  }

  // --- init ---
  if (sub === 'init') {
    if (fs.existsSync(statePath)) {
      return { ok: true, state: readState(), message: 'state.json already exists' };
    }
    const flags = parseFlags(1);
    const state = defaultState(flags.project);
    return writeState(state);
  }

  // --- set-phase ---
  if (sub === 'set-phase') {
    const name = subArgs[1];
    if (!name) throw new Error('set-phase requires a phase name argument');
    const state = readState() || defaultState();
    state.current_phase = name;
    state.current_plan = 0;
    if (!state.phases) state.phases = [];
    state.phases.push({ name, started: new Date().toISOString(), completed: null, plan_count: 0 });
    return writeState(state);
  }

  // --- advance-plan ---
  if (sub === 'advance-plan') {
    const state = readState() || defaultState();
    if (typeof state.current_plan !== 'number') state.current_plan = 0;
    state.current_plan += 1;
    // Update plan_count on current phase if tracked
    if (state.phases && state.phases.length > 0) {
      const current = state.phases[state.phases.length - 1];
      current.plan_count = state.current_plan;
    }
    return writeState(state);
  }

  // --- record-execution ---
  if (sub === 'record-execution') {
    const flags = parseFlags(1);
    const state = readState() || defaultState();
    if (!state.executions) state.executions = [];
    state.executions.push({
      plan: flags.plan || '',
      tasks: parseInt(flags.tasks || '0', 10),
      duration_ms: flags.duration ? parseInt(flags.duration, 10) : null,
      commit_hash: flags.hash || null,
      committed_at: new Date().toISOString(),
    });
    return writeState(state);
  }

  // --- add-decision ---
  if (sub === 'add-decision') {
    const summary = subArgs.slice(1).join(' ');
    if (!summary) throw new Error('add-decision requires a summary argument');
    const state = readState() || defaultState();
    if (!state.decisions) state.decisions = [];
    state.decisions.push({
      summary,
      phase: state.current_phase,
      plan: state.current_plan,
      date: new Date().toISOString(),
    });
    return writeState(state);
  }

  // --- add-blocker ---
  if (sub === 'add-blocker') {
    const description = subArgs.slice(1).join(' ');
    if (!description) throw new Error('add-blocker requires a description argument');
    const state = readState() || defaultState();
    if (!state.blockers) state.blockers = [];
    state.blockers.push({
      description,
      phase: state.current_phase,
      plan: state.current_plan,
      date: new Date().toISOString(),
      resolved: false,
    });
    return writeState(state);
  }

  // --- resolve-blocker ---
  if (sub === 'resolve-blocker') {
    const index = parseInt(subArgs[1], 10);
    const state = readState();
    if (!state) throw new Error('No state.json found');
    if (!state.blockers || index < 0 || index >= state.blockers.length) {
      throw new Error(`Invalid blocker index: ${subArgs[1]}. Valid range: 0-${(state.blockers || []).length - 1}`);
    }
    state.blockers[index].resolved = true;
    return writeState(state);
  }

  // --- record-session ---
  if (sub === 'record-session') {
    const state = readState() || defaultState();
    state.last_session = new Date().toISOString();
    return writeState(state);
  }

  // --- record-council ---
  if (sub === 'record-council') {
    const flags = parseFlags(1);
    if (!flags.slug) throw new Error('record-council requires --slug <value>');
    const state = readState() || defaultState();
    if (!state.council_sessions) state.council_sessions = [];
    state.council_sessions.push({
      date: new Date().toISOString(),
      question_slug: flags.slug || '',
      panel: (flags.panel || '').split(',').map((s) => s.trim()).filter(Boolean),
      artifact_path: flags.artifact || '',
    });
    return writeState(state);
  }

  // --- record-chain ---
  if (sub === 'record-chain') {
    const flags = parseFlags(1);
    if (!flags.slug) throw new Error('record-chain requires --slug <value>');
    const state = readState() || defaultState();
    if (!state.chains) state.chains = [];
    state.chains.push({
      date: new Date().toISOString(),
      slug: flags.slug || '',
      agents: (flags.agents || '').split(',').map((s) => s.trim()).filter(Boolean),
      artifacts_dir: flags.artifacts || '',
    });
    return writeState(state);
  }

  // --- insert-phase ---
  if (sub === 'insert-phase') {
    const flags = parseFlags(1);
    const phaseNumber = flags.number || '';
    const phaseName = flags.name || '';

    // Validate N.M format
    const phaseRegex = /^\d+\.\d+$/;
    if (!phaseRegex.test(phaseNumber)) {
      throw new Error(`Invalid phase number format: ${phaseNumber}. Expected N.M (e.g., 2.1, 3.2)`);
    }

    if (!phaseName) {
      throw new Error('insert-phase requires --name <phase-name>');
    }

    // Generate slug from name: lowercase, hyphenate spaces/underscores
    const slug = phaseName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (!slug) {
      throw new Error('Phase name must contain at least one alphanumeric character');
    }

    const state = readState() || defaultState();
    if (!state.phases) state.phases = [];

    // Check if phase already exists
    if (state.phases.some(p => p.number === phaseNumber)) {
      throw new Error(`Phase ${phaseNumber} already exists`);
    }

    // Parse phase number to numeric for sorting
    const [intPart, decPart] = phaseNumber.split('.');
    const numericValue = parseFloat(`${intPart}.${decPart}`);

    // Insert phase in sorted order
    const newPhase = {
      number: phaseNumber,
      name: phaseName,
      slug: slug,
      created: new Date().toISOString(),
      started: null,
      completed: null,
    };

    const insertIdx = state.phases.findIndex(p => {
      const [pi, pd] = p.number.split('.');
      const pNum = parseFloat(`${pi}.${pd}`);
      return pNum > numericValue;
    });

    if (insertIdx === -1) {
      state.phases.push(newPhase);
    } else {
      state.phases.splice(insertIdx, 0, newPhase);
    }

    writeState(state);
    return {
      ok: true,
      phase_number: phaseNumber,
      name: phaseName,
      slug: slug,
      directory: path.join(PLANNING_DIR, 'phases', `${phaseNumber}-${slug}`),
    };
  }

  // --- workstream-validate ---
  if (sub === 'workstream-validate') {
    const subcommand = subArgs[1];
    const flags = parseFlags(2);
    const name = flags.name || '';

    if (!subcommand || !['create', 'switch', 'list', 'status', 'complete'].includes(subcommand)) {
      throw new Error(`Invalid workstream subcommand: ${subcommand}. Valid: create, switch, list, status, complete`);
    }

    if (['create', 'switch', 'complete'].includes(subcommand) && !name) {
      throw new Error(`workstream ${subcommand} requires --name <name>`);
    }

    const state = readState() || defaultState();
    if (!state.workstreams) state.workstreams = [];

    if (subcommand === 'create') {
      if (state.workstreams.some((w) => w.name === name)) {
        throw new Error(`Workstream already exists: ${name}`);
      }
    } else if (['switch', 'complete'].includes(subcommand)) {
      if (!state.workstreams.some((w) => w.name === name)) {
        throw new Error(`Workstream not found: ${name}`);
      }
    }

    return { ok: true, valid: true };
  }

  // --- workstream-create ---
  if (sub === 'workstream-create') {
    const flags = parseFlags(1);
    const name = flags.name || '';
    if (!name) throw new Error('workstream-create requires --name <name>');

    const state = readState() || defaultState();
    if (!state.workstreams) state.workstreams = [];
    if (state.workstreams.some((w) => w.name === name)) {
      throw new Error(`Workstream already exists: ${name}`);
    }

    // Create new workstream
    const now = new Date().toISOString();
    const id = `ws-${Date.now().toString(36).slice(-8)}`;
    const newWorkstream = {
      name,
      id,
      created: now,
      active: true,
      completed: false,
      phases: [],
    };

    // Deactivate other workstreams
    state.workstreams.forEach((w) => { w.active = false; });
    state.workstreams.push(newWorkstream);
    state.active_workstream = name;

    return writeState(state);
  }

  // --- workstream-switch ---
  if (sub === 'workstream-switch') {
    const flags = parseFlags(1);
    const name = flags.name || '';
    if (!name) throw new Error('workstream-switch requires --name <name>');

    const state = readState() || defaultState();
    if (!state.workstreams) state.workstreams = [];

    const ws = state.workstreams.find((w) => w.name === name);
    if (!ws) throw new Error(`Workstream not found: ${name}`);

    // Deactivate others, activate target
    state.workstreams.forEach((w) => { w.active = w.name === name; });
    state.active_workstream = name;

    return writeState(state);
  }

  // --- workstream-list ---
  if (sub === 'workstream-list') {
    const state = readState() || defaultState();
    if (!state.workstreams) state.workstreams = [];

    return {
      ok: true,
      workstreams: state.workstreams.map((w) => ({
        name: w.name,
        id: w.id || '',
        active: w.active || false,
        completed: w.completed || false,
        phases: (w.phases || []).length,
        created: w.created || '',
      })),
    };
  }

  // --- workstream-status ---
  if (sub === 'workstream-status') {
    const state = readState() || defaultState();
    if (!state.workstreams) state.workstreams = [];

    const active = state.workstreams.find((w) => w.active) || state.workstreams[0];
    if (!active) {
      return { ok: true, workstream: null, message: 'No workstreams exist' };
    }

    return {
      ok: true,
      workstream: {
        name: active.name,
        id: active.id || '',
        active: active.active || false,
        completed: active.completed || false,
        phases: (active.phases || []).length,
        created: active.created || '',
      },
    };
  }

  // --- workstream-complete ---
  if (sub === 'workstream-complete') {
    const flags = parseFlags(1);
    const name = flags.name || '';
    if (!name) throw new Error('workstream-complete requires --name <name>');

    const state = readState() || defaultState();
    if (!state.workstreams) state.workstreams = [];

    const ws = state.workstreams.find((w) => w.name === name);
    if (!ws) throw new Error(`Workstream not found: ${name}`);
    if (ws.completed) throw new Error(`Workstream already completed: ${name}`);

    ws.completed = true;
    ws.active = false;

    // If this was the active workstream, switch to first incomplete
    if (state.active_workstream === name) {
      const next = state.workstreams.find((w) => !w.completed);
      if (next) {
        next.active = true;
        state.active_workstream = next.name;
      } else {
        state.active_workstream = null;
      }
    }

    return writeState(state);
  }

  throw new Error(`Unknown state subcommand: ${sub}. Valid: read, get, init, set-phase, advance-plan, record-execution, add-decision, add-blocker, resolve-blocker, record-session, record-council, record-chain, insert-phase, workstream-validate, workstream-create, workstream-switch, workstream-list, workstream-status, workstream-complete`);
}

/** init plan — context blob for /rihal:plan workflow. */
function cmdInitPlan(rawArgs) {
  const config = readConfig();
  const tokens = (rawArgs || '').trim().split(/\s+/).filter(Boolean);
  const flags = { phase: null, output: null };
  const positional = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === '--phase' && tokens[i + 1]) { flags.phase = tokens[++i]; }
    else if (t.startsWith('--phase=')) { flags.phase = t.slice('--phase='.length); }
    else if (t === '--output' && tokens[i + 1]) { flags.output = tokens[++i]; }
    else if (t.startsWith('--output=')) { flags.output = t.slice('--output='.length); }
    else positional.push(t);
  }
  const arg = positional.join(' ').trim();
  let inputType = 'description';
  let resolvedPath = null;
  let description = arg;
  if (arg) {
    const asAbs = path.isAbsolute(arg) ? arg : path.join(PROJECT_ROOT, arg);
    if (!asAbs.startsWith(PROJECT_ROOT)) {
      throw new Error(`Path outside project root: ${arg}`);
    }
    if (arg.endsWith('.md') && fs.existsSync(asAbs)) {
      resolvedPath = asAbs;
      inputType = path.basename(asAbs).startsWith('council-') ? 'session' : 'file';
      description = null;
    } else if (fs.existsSync(asAbs) && fs.statSync(asAbs).isDirectory()) {
      const sessions = walkFiles(asAbs).filter((f) => f.endsWith('.md')).sort().reverse();
      if (sessions.length > 0) { resolvedPath = sessions[0]; inputType = 'session'; description = null; }
    }
  }
  const phaseSlug = flags.phase || (resolvedPath
    ? path.basename(resolvedPath, '.md').replace(/^council-\d{4}-\d{2}-\d{2}-/, '').slice(0, 40)
    : (arg || 'unnamed').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40));
  const outputDir = flags.output || path.join(PLANNING_DIR, 'plans', phaseSlug);
  if (flags.output) {
    const absOutput = path.isAbsolute(flags.output) ? flags.output : path.join(PROJECT_ROOT, flags.output);
    if (!absOutput.startsWith(PROJECT_ROOT)) {
      throw new Error(`Output path outside project root: ${flags.output}`);
    }
  }
  return {
    workflow: 'plan', input_type: inputType, resolved_path: resolvedPath, description,
    phase_slug: phaseSlug, output_dir: outputDir, config,
    paths: { project_root: PROJECT_ROOT, rihal: RIHAL_DIR, planning_root: PLANNING_DIR, state: path.join(RIHAL_DIR, 'state.json') },
  };
}

/** plan list — glob .planning/plans/ for plan files. */
function cmdPlanList() {
  const plansDir = path.join(PLANNING_DIR, 'plans');
  if (!fs.existsSync(plansDir)) return { plans: [] };
  const files = walkFiles(plansDir).filter((f) => f.endsWith('.md'));
  return {
    plans: files.map((f) => {
      const text = fs.readFileSync(f, 'utf8');
      const { frontmatter, body } = parseFrontmatter(text);
      const objMatch = body.match(/^## Objective\s*\n(.+)/m);
      return {
        path: path.relative(PROJECT_ROOT, f), phase: frontmatter.phase || '',
        plan: frontmatter.plan || '', type: frontmatter.type || 'auto',
        depends_on: frontmatter.depends_on ? frontmatter.depends_on.split(',').map((s) => s.trim()) : [],
        objective: objMatch ? objMatch[1].trim() : '',
      };
    }),
  };
}

/** init chain — context blob for /rihal:chain workflow. */
function cmdInitChain(rawArgs) {
  const config = readConfig();
  const installedAgents = listInstalledAgents();
  const tokens = (rawArgs || '').trim().split(/\s+/).filter(Boolean);

  const PRESETS = {
    'research-plan': ['mariam', 'hussain-pm', 'planner'],
    'feasibility': ['waleed', 'fatima'],
    'gtm-to-build': ['mariam', 'hussain-pm', 'waleed'],
    'full-discovery': ['mariam', 'sadiq', 'hussain-pm', 'waleed', 'planner'],
  };

  let chain = [];
  let preset = null;
  let topicTokens = [];

  if (tokens.length > 0) {
    const first = tokens[0];
    if (PRESETS[first]) {
      preset = first;
      chain = PRESETS[first];
      topicTokens = tokens.slice(1);
    } else if (first.includes(',')) {
      // Custom comma-separated agent list
      chain = first.split(',').map((s) => s.trim()).filter(Boolean);
      topicTokens = tokens.slice(1);
    } else {
      // Treat as topic with default research-plan preset
      preset = 'research-plan';
      chain = PRESETS['research-plan'];
      topicTokens = tokens;
    }
  }

  const topic = topicTokens.join(' ').trim();
  const slug = (topic || preset || 'unnamed').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  const date = new Date().toISOString().slice(0, 10);
  const chainDir = path.join(PLANNING_DIR, 'chains', `${date}-${slug}`);

  // Validate agents are installed
  const unknownAgents = chain.filter((id) => !installedAgents.includes(id));

  return {
    workflow: 'chain',
    preset,
    chain,
    topic,
    slug,
    chain_dir: chainDir,
    config,
    installed_agents: installedAgents,
    unknown_agents: unknownAgents,
    presets: PRESETS,
    paths: { project_root: PROJECT_ROOT, rihal: RIHAL_DIR, planning_root: PLANNING_DIR, sessions_dir: SESSIONS_DIR, state: path.join(RIHAL_DIR, 'state.json') },
  };
}

/** init discuss — context blob for /rihal:discuss workflow. */
function cmdInitDiscuss(rawArgs) {
  const config = readConfig();
  const installedAgents = listInstalledAgents();
  const tokens = (rawArgs || '').trim().split(/\s+/).filter(Boolean);
  let agentId = null;
  let question = rawArgs || '';
  if (tokens.length > 0 && installedAgents.includes(tokens[0])) {
    agentId = tokens[0];
    question = tokens.slice(1).join(' ');
  }
  const questionClassification = cmdClassifyQuestion(question);
  return {
    workflow: 'discuss', agent_id: agentId, question,
    question_type: questionClassification.type, question_signals: questionClassification.signals,
    config, installed_agents: installedAgents,
    paths: { project_root: PROJECT_ROOT, rihal: RIHAL_DIR, planning_root: PLANNING_DIR, sessions_dir: SESSIONS_DIR, state: path.join(RIHAL_DIR, 'state.json') },
  };
}

/**
 * module <subcommand> — module system helpers.
 *   list           → available modules from package
 *   installed      → modules listed in .rihal/_config/manifest.yaml
 *   check-requires → verify a module's dependencies are installed
 */
function cmdModule(subArgs) {
  const sub = subArgs[0];

  if (sub === 'list') {
    // Hardcoded available modules (known at build time)
    return {
      modules: [
        { name: 'core', description: 'Council agents, /rihal:council, /rihal:discuss, /rihal:status, /rihal:do router, /rihal:help, and state management' },
        { name: 'execution', description: 'Plan execution — /rihal:execute, /rihal:plan, /rihal:quick, /rihal:debug, /rihal:audit-fix, /rihal:undo' },
        { name: 'discovery', description: 'Project discovery — /rihal:new-project, /rihal:map-codebase, /rihal:scan, /rihal:explore, /rihal:code-review, /rihal:docs-update' },
      ]
    };
  }

  if (sub === 'installed') {
    const manifestPath = path.join(CONFIG_DIR, 'manifest.yaml');
    if (!fs.existsSync(manifestPath)) return { installed: [] };
    const text = fs.readFileSync(manifestPath, 'utf8');
    const modules = [];
    let inModules = false;
    for (const line of text.split('\n')) {
      if (line.startsWith('modules:')) { inModules = true; continue; }
      if (inModules && line.trim().startsWith('-')) {
        modules.push(line.trim().slice(1).trim());
      } else if (inModules && !line.startsWith(' ')) {
        inModules = false;
      }
    }
    return { installed: modules };
  }

  if (sub === 'check-requires') {
    const REQUIRES = { core: [], execution: ['core'], discovery: ['core'] };
    const modName = subArgs[1];
    if (!modName || !REQUIRES[modName]) return { ok: false, error: `Unknown module: ${modName}` };
    const requires = REQUIRES[modName];
    if (requires.length === 0) return { ok: true, requires: [], missing: [] };
    const { installed } = cmdModule(['installed']);
    const missing = requires.filter((r) => !installed.includes(r));
    return { ok: missing.length === 0, requires, missing };
  }

  throw new Error(`Unknown module subcommand: ${sub}. Valid: list, installed, check-requires`);
}

function readPackageVersion() {
  try {
    const manifestPath = path.join(CONFIG_DIR, 'manifest.yaml');
    if (fs.existsSync(manifestPath)) {
      const parsed = parseSimpleYaml(fs.readFileSync(manifestPath, 'utf8'));
      if (parsed.version) return parsed.version;
    }
  } catch { /* fall through */ }
  return 'unknown';
}

function main() {
  const [, , subcommand, ...args] = process.argv;
  try {
    let result;
    switch (subcommand) {
      case 'init':
        if (args[0] === 'execute') {
          result = cmdInitExecute(args.slice(1).join(' '));
        } else if (args[0] === 'plan') {
          result = cmdInitPlan(args.slice(1).join(' '));
        } else if (args[0] === 'discuss') {
          result = cmdInitDiscuss(args.slice(1).join(' '));
        } else if (args[0] === 'chain') {
          result = cmdInitChain(args.slice(1).join(' '));
        } else {
          result = cmdInit(args[0] || '', args.slice(1).join(' '));
        }
        break;
      case 'plan':
        if (args[0] === 'list') { result = cmdPlanList(); }
        else { console.error('Unknown plan subcommand. Valid: list'); process.exit(1); }
        break;
      case 'select-panel':
        result = cmdSelectPanel(args.join(' '));
        break;
      case 'agent-info':
        result = cmdAgentInfo(args[0]);
        break;
      case 'list-agents':
        result = cmdListAgents();
        break;
      case 'classify-question':
        result = cmdClassifyQuestion(args.join(' '));
        break;
      case 'state':
        result = cmdState(args);
        break;
      case 'module':
        result = cmdModule(args);
        break;
      case 'version':
        console.log(readPackageVersion());
        return;
      case 'help':
      case '--help':
      case '-h':
      case undefined:
        console.log('Usage: rihal-tools.cjs <init|select-panel|classify-question|agent-info|list-agents|state|module|plan|version> [args]');
        console.log('  state read                                   → print full state.json');
        console.log('  state init --project <name>                  → create state.json if missing');
        console.log('  state set-phase <name>                       → set current phase, reset plan counter');
        console.log('  state advance-plan                           → increment current_plan counter');
        console.log('  state record-execution --plan <p> --tasks <n> --duration <ms> --hash <h>  → append execution');
        console.log('  state add-decision "<summary>"               → append to decisions[]');
        console.log('  state add-blocker "<description>"            → append to blockers[]');
        console.log('  state resolve-blocker <index>                → mark blocker as resolved');
        console.log('  state record-session                         → update last_session timestamp');
        console.log('  state record-council --slug <s> --panel <csv> --artifact <path>  → append council session');
        return;
      default:
        console.error(`Unknown subcommand: ${subcommand}`);
        process.exit(1);
    }
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(`rihal-tools error: ${err.message}`);
    if (process.env.DEBUG) console.error(err.stack);
    process.exit(1);
  }
}

main();
