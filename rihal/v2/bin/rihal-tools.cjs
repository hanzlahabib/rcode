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
 *
 * Everything else becomes part of the question.
 */
function parseArgs(raw) {
  const flags = { full: false, agents: [], explain: false };
  const words = [];
  const tokens = (raw || '').trim().split(/\s+/).filter(Boolean);
  for (const tok of tokens) {
    if (tok === '--full') flags.full = true;
    else if (tok === '--explain') flags.explain = true;
    else if (tok.startsWith('--agents=')) {
      flags.agents = tok.slice('--agents='.length).split(',').map((s) => s.trim()).filter(Boolean);
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

  if (workflowName === 'council') {
    const scorer = loadPanelScorer();
    const opts = {};
    if (flags.full) opts.full = true;
    if (flags.agents.length > 0) opts.agents = flags.agents;
    const ideal = scorer.selectPanel(question, opts);
    // Don't pad when user explicitly specified the agent list — their
    // choice is the final word.
    panel = filterPanelToInstalled(ideal, installedAgents, { pad: flags.agents.length === 0 });
    if (flags.explain) {
      const explained = scorer.explainSelection(question, opts);
      scores = explained.scores || {};
    }
  }

  const questionClassification = cmdClassifyQuestion(question);

  const out = {
    workflow: workflowName,
    question,
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
  return {
    question,
    flags,
    panel: filterPanelToInstalled(ideal, installed, { pad: flags.agents.length === 0 }),
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
      'ریسرچ', 'بتاؤ',
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
      'دبئی', 'مارکیٹ', 'کاروبار', 'خلیج',
    ],
    greenfield: [
      'start fresh', 'from scratch', 'new project', 'blank slate', 'greenfield',
      'build something new', 'start building', 'no existing', 'haven\'t started',
      'bootstrap', 'kickoff',
      // Roman Urdu greenfield signals
      'bnanai', 'banana', 'app banana', 'shuru', 'start karna', 'naya project', 'project banana', 'build karna',
      // Urdu unicode greenfield signals
      'سائٹ بنانا', 'ایپ بنانا',
    ],
    team: [
      'hiring', 'hire', 'fire', 'team size', 'squad', 'org structure', 'burnout',
      'morale', 'retrospective', 'culture', 'process', 'onboarding', 'offboarding',
      'performance review', 'raise', 'promotion', 'conflict',
    ],
    release: [
      'deploy', 'deployment', 'ship', 'rollback', 'incident', 'production issue',
      'hotfix', 'feature flag', 'canary', 'blue green', 'downtime', 'outage',
      'monitoring', 'alert', 'on call', 'oncall',
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
 *   get                      → print current state
 *   record-execution         → append execution metrics
 *     --plan <path>
 *     --tasks-completed <n>
 *     --commits <sha1,sha2,...>
 */
function cmdState(subArgs) {
  const statePath = path.join(RIHAL_DIR, 'state.json');
  const sub = subArgs[0];

  if (sub === 'get') {
    if (!fs.existsSync(statePath)) return { state: null };
    return JSON.parse(fs.readFileSync(statePath, 'utf8'));
  }

  if (sub === 'advance-plan') {
    const state = fs.existsSync(statePath)
      ? JSON.parse(fs.readFileSync(statePath, 'utf8'))
      : { current_plan: 0, executions: [] };
    if (typeof state.current_plan !== 'number') state.current_plan = 0;
    state.current_plan += 1;
    fs.mkdirSync(RIHAL_DIR, { recursive: true });
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
    return { ok: true, current_plan: state.current_plan, state_path: statePath };
  }

  if (sub === 'record-execution') {
    const flags = {};
    for (let i = 1; i < subArgs.length; i++) {
      if (subArgs[i].startsWith('--')) {
        const key = subArgs[i].slice(2);
        flags[key] = subArgs[i + 1];
        i++;
      }
    }
    const state = fs.existsSync(statePath)
      ? JSON.parse(fs.readFileSync(statePath, 'utf8'))
      : {};
    if (!state.executions) state.executions = [];
    state.executions.push({
      plan: flags.plan || '',
      tasks_completed: parseInt(flags['tasks-completed'] || flags.tasks || '0', 10),
      commits: (flags.commits || '').split(',').filter(Boolean),
      duration_ms: flags.duration ? parseInt(flags.duration, 10) : null,
      timestamp: new Date().toISOString(),
    });
    state.last_execution = state.executions[state.executions.length - 1];
    fs.mkdirSync(RIHAL_DIR, { recursive: true });
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
    return { ok: true, state_path: statePath };
  }

  throw new Error(`Unknown state subcommand: ${sub}. Valid: get, advance-plan, record-execution`);
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
        } else {
          result = cmdInit(args[0] || '', args.slice(1).join(' '));
        }
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
      case 'version':
        console.log(readPackageVersion());
        return;
      case 'help':
      case '--help':
      case '-h':
      case undefined:
        console.log('Usage: rihal-tools.cjs <init|select-panel|classify-question|agent-info|list-agents|state|version> [args]');
        console.log('  state get                                    → print state.json');
        console.log('  state advance-plan                           → increment current_plan counter');
        console.log('  state record-execution --plan <p> --tasks <n> --duration <ms>  → append execution');
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
