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
    ],
    market: [
      '2040', '2030', '2050', 'vision plan', 'national plan', 'government plan',
      'strategy plan', 'economic plan', 'development plan', 'five year plan',
      'oman', 'saudi', 'uae', 'gulf', 'gcc', 'mena', 'bahrain', 'qatar', 'kuwait',
      'market opportunity', 'market size', 'competitor', 'industry trend',
      'regulation', 'compliance', 'sector', 'economy',
    ],
    greenfield: [
      'start fresh', 'from scratch', 'new project', 'blank slate', 'greenfield',
      'build something new', 'start building', 'no existing', 'haven\'t started',
      'bootstrap', 'kickoff',
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
        result = cmdInit(args[0] || '', args.slice(1).join(' '));
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
      case 'version':
        console.log(readPackageVersion());
        return;
      case 'help':
      case '--help':
      case '-h':
      case undefined:
        console.log('Usage: rihal-tools.cjs <init|select-panel|classify-question|agent-info|list-agents|version> [args]');
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
