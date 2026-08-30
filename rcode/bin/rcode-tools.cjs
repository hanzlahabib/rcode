#!/usr/bin/env node
/**
 * rcode-tools.cjs — the helper binary every rcode v2 workflow shells out to.
 *
 * Design goal: one Bash call per workflow step returns a single JSON blob
 * with every path, flag, and config value the orchestrator needs. This
 * replaces what would otherwise be 5-10 Read calls in the parent context
 * and keeps the orchestrator's context window small.
 *
 * Installed at: {project-root}/.rcode/bin/rcode-tools.cjs
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

// Resolve project root. This file is installed at {project-root}/.rcode/bin/,
// so two levels up is the project.
// PROJECT_ROOT detection: when installed, this binary lives at <project>/.rcode/bin/rcode-tools.cjs
// When running from source (rcode/bin/), warn but allow — tests need this path.
const _maybeRoot = path.resolve(__dirname, '..', '..');
const _isInstalled = path.basename(path.dirname(__dirname)) === '.rcode';
if (!_isInstalled && !process.env.RCODE_DEV_MODE && !process.env.NODE_TEST_CONTEXT && !process.env.RCODE_PROJECT_ROOT) {
  // Source dir, not installed location — warn but proceed (tests run from here)
  if (process.stderr.isTTY) {
    console.error('Note: rcode-tools.cjs running from source. For full features install with: node cli/install-v2.js <target> --yes');
  }
}
// Issue #718: RCODE_PROJECT_ROOT env override lets tests (and future tooling)
// retarget the binary at a different project root without symlinking. When
// unset, behaves identically to before.
const PROJECT_ROOT = process.env.RCODE_PROJECT_ROOT
  ? path.resolve(process.env.RCODE_PROJECT_ROOT)
  : _maybeRoot;
const RCODE_DIR = path.join(PROJECT_ROOT, '.rcode');
const CONFIG_DIR = path.join(RCODE_DIR, '_config');
const REFS_DIR = path.join(RCODE_DIR, 'references');
const WORKFLOWS_DIR = path.join(RCODE_DIR, 'workflows');
const PLANNING_DIR = path.join(PROJECT_ROOT, '.planning');
const SESSIONS_DIR = path.join(PLANNING_DIR, 'council-sessions');

// #473 guard: if CWD has its own .rcode/ but doesn't match the resolved
// PROJECT_ROOT, the user is invoking this binary from a different project.
// Without this guard, every state-writing subcommand silently targets the
// installer's repo instead of the user's CWD — surfaced during Phase 12
// smoke tests when `phase add` polluted the rcode repo's ROADMAP
// while running from /tmp. Refuse to operate with a clear error.
function assertCwdMatchesProjectRoot() {
  try {
    const cwd = process.cwd();
    const cwdrcode = path.join(cwd, '.rcode');
    if (!fs.existsSync(cwdrcode)) return; // no local install — fine
    if (path.resolve(cwd) === path.resolve(PROJECT_ROOT)) return; // same project — fine
    // CWD has its own .rcode/ but is NOT this binary's project. Refuse.
    process.stderr.write(
      `Refusing to operate: this binary lives at ${path.dirname(__dirname)}/bin/ ` +
      `but CWD ${cwd} has its own .rcode/ — running from here would silently ` +
      `target the wrong project (#473). Use the CWD's installed CLI: ` +
      `node "${cwdRcode}/bin/rcode-tools.cjs" <args>\n`
    );
    process.exit(2);
  } catch { /* never crash startup on diagnostic logic */ }
}

/**
 * Return the first file in `dir` matching `pattern`, or null.
 * Used by cmdInit's phase-aware fields branch (Phase 10 / #466) to resolve
 * specific artifact paths (CONTEXT.md, RESEARCH.md, VERIFICATION.md) from
 * a phase directory that may use either zero-padded (06-name) or plain
 * (6-name) prefix conventions.
 */
function files0(dir, pattern) {
  if (!fs.existsSync(dir)) return null;
  const matches = fs.readdirSync(dir).filter(f => pattern.test(f));
  return matches.length > 0 ? matches[0] : null;
}

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
  // #733 — try config.yaml first, fall back to config.json, return defaults when neither exists.
  const yamlPath = path.join(RCODE_DIR, 'config.yaml');
  const jsonPath = path.join(RCODE_DIR, 'config.json');

  if (fs.existsSync(yamlPath)) {
    try {
      const parsed = parseSimpleYaml(fs.readFileSync(yamlPath, 'utf8'));
      return {
        ...parsed,  // spread all parsed keys (model_profile, branching_strategy, etc.)
        user_name: parsed.user_name || 'User',
        project_name: parsed.project_name || path.basename(PROJECT_ROOT),
        language: parsed.communication_language || parsed.language || 'English',
        mode: parsed.mode || 'guided',
      };
    } catch (e) {
      throw new Error(`Failed to read config.yaml: ${e.message}`);
    }
  }

  if (fs.existsSync(jsonPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      return {
        ...parsed,
        user_name: parsed.user_name || 'User',
        project_name: parsed.project_name || path.basename(PROJECT_ROOT),
        language: parsed.communication_language || parsed.language || 'English',
        mode: parsed.mode || 'guided',
      };
    } catch (e) {
      throw new Error(`Failed to read config.json: ${e.message}`);
    }
  }

  return {
    user_name: 'User',
    project_name: path.basename(PROJECT_ROOT),
    language: 'English',
    mode: 'guided',
  };
}

/**
 * Read .rcode/config.yaml as a nested object (workflow.*, features.*, etc.).
 * Phase 12 / #468 — used by cmdInit to surface workflow feature flags into
 * the init JSON so workflow agents don't re-shell config-get per field.
 * Returns {} when config absent or unreadable.
 */
function readNestedConfig() {
  try {
    const configPath = path.join(RCODE_DIR, 'config.yaml');
    if (!fs.existsSync(configPath)) return {};
    const cfg = require(path.join(__dirname, 'lib', 'config.cjs'));
    return cfg.parseNestedYaml(fs.readFileSync(configPath, 'utf8')) || {};
  } catch { return {}; }
}

/**
 * Resolve the model string for an agent under the current profile.
 * Phase 12 / #468 — returns just the model id (or null when the agent isn't
 * installed or the profile inherits). Wraps cmdResolveModel so cmdInit can
 * surface researcher_model / planner_model / checker_model without throwing
 * when an agent isn't shipped.
 */
function resolveModelString(agentId) {
  try {
    const installed = listInstalledAgents();
    // Manifest ids are stored bare (e.g. "planner") while workflows reference
    // them with the rcode- prefix. Try both forms before giving up.
    const bare = agentId.replace(/^rcode-/, '');
    const candidate = installed.includes(agentId) ? agentId
                    : installed.includes(bare) ? bare
                    : null;
    if (!candidate) return null;
    const r = cmdResolveModel(candidate);
    return (r && r.model) ? r.model : null;
  } catch { return null; }
}

/**
 * Extract REQ-IDs (REQ-FOO, REQ-FOO-BAR) from a ROADMAP requirements list.
 * Phase 12 / #468 — feeds plan.md's `phase_req_ids` field. Returns deduped
 * array in source order. Empty array when no IDs match.
 */
function extractReqIds(requirements) {
  if (!Array.isArray(requirements) || requirements.length === 0) return [];
  const seen = new Set();
  const out = [];
  // Two shapes, because real projects rarely use the REQ- prefix:
  //   REQ-AUTH, REQ-FOO-BAR   — the documented convention
  //   FOUND-01, RENT-04, AUTHZ-04, OBJ-06, CITY-02 — what projects actually write
  // Matching only the first shape returned an empty phase_req_ids on every
  // domain-prefixed project, and plan.md's Requirements Coverage Gate skips
  // itself when that array is empty. The gate was silently off, not passing.
  const re = /\bREQ-[A-Z0-9][A-Z0-9-]*\b|\b[A-Z][A-Z0-9]{1,15}-\d+[a-z]?\b/g;
  for (const line of requirements) {
    const matches = String(line).match(re) || [];
    for (const m of matches) {
      if (!seen.has(m)) { seen.add(m); out.push(m); }
    }
  }
  return out;
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
  // Local agents from project manifest
  const local = readAgentManifest().map((row) => row.id).filter(Boolean);

  // Global agents from ~/.claude/agents/ (Claude Code install location)
  let global = [];
  const globalDir = path.join(process.env.HOME || '', '.claude', 'agents');
  if (fs.existsSync(globalDir)) {
    global = fs.readdirSync(globalDir)
      .filter(f => f.startsWith('rcode-') && f.endsWith('.md'))
      .map(f => f.replace('rcode-', '').replace('.md', ''));
  }

  // Merge and deduplicate: local takes precedence if defined in both
  return [...new Set([...local, ...global])];
}

/**
 * Load the council-panel scoring function. Installed at
 * .rcode/bin/lib/council-panel.cjs alongside this helper.
 */
function loadPanelScorer() {
  const scorerPath = path.join(__dirname, 'lib', 'council-panel.cjs');
  if (!fs.existsSync(scorerPath)) {
    throw new Error(`Panel scorer missing at ${scorerPath}. Reinstall: see README install command, or re-run install-v2.js with --force.`);
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
  let domain = null;

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
    // #1010 — domain must populate on every council session, not just
    // --explain, because council.md's <output_format> banner prints
    // Domain: unconditionally.
    const explained = scorer.explainSelection(question, opts);
    domain = explained.domain || null;
    if (flags.explain) {
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
    domain,
    question_type: questionClassification.type,
    question_signals: questionClassification.signals,
    mode: config.mode || null,
    // #1010 — response_language was only ever populated for phase-op/
    // sprint-plan below; council.md documents it as a top-level init field
    // and gates language pass-through to subagents on it being set.
    response_language: config.response_language || config.language || null,
    config,
    installed_agents: installedAgents,
    paths: {
      project_root: PROJECT_ROOT,
      rcode: RCODE_DIR,
      config_dir: CONFIG_DIR,
      refs: REFS_DIR,
      workflows: WORKFLOWS_DIR,
      planning_root: PLANNING_DIR,
      sessions_dir: SESSIONS_DIR,
      state: path.join(RCODE_DIR, 'state.json'),
    },
    state_exists: fs.existsSync(path.join(RCODE_DIR, 'state.json')),
  };

  // Phase 10 / #466 — phase-aware fields for phase-op + sprint-plan workflows.
  // Closes the third part of #464 (workflows expect these fields per their
  // documented init contract; before this they were silently absent).
  if ((workflowName === 'phase-op' || workflowName === 'sprint-plan') && question) {
    const phaseInput = question.trim().split(/\s+/)[0];
    const phaseNum = parseInt(phaseInput, 10);
    if (!Number.isNaN(phaseNum) && phaseNum > 0) {
      const roadmapPath = path.join(PLANNING_DIR, 'ROADMAP.md');
      const phasesDir = path.join(PLANNING_DIR, 'phases');
      out.roadmap_exists = fs.existsSync(roadmapPath);
      out.planning_exists = fs.existsSync(PLANNING_DIR);

      // Find phase entry in ROADMAP via the now-fixed parser.
      let roadmapPhase = null;
      if (out.roadmap_exists) {
        try {
          const roadmap = require(path.join(__dirname, 'lib', 'roadmap.cjs'));
          const r = roadmap.dispatch(PROJECT_ROOT, ['get-phase', String(phaseNum)]);
          if (r && r.found) roadmapPhase = r;
        } catch { /* parser failure shouldn't break init */ }
      }

      // Find phase directory on disk (matches '1-name', '01-name', and '001-name' prefixes).
      let phaseDirEntry = null;
      if (fs.existsSync(phasesDir)) {
        const n = String(phaseNum);
        const pad2 = n.padStart(2, '0');
        const pad3 = n.padStart(3, '0');
        for (const entry of fs.readdirSync(phasesDir)) {
          if (
            entry === n ||
            entry.startsWith(`${n}-`) ||
            entry.startsWith(`${pad2}-`) ||
            entry.startsWith(`${pad3}-`)
          ) {
            phaseDirEntry = entry;
            break;
          }
        }
      }

      out.phase_found = roadmapPhase !== null;
      out.phase_number = String(phaseNum);
      // Issue #652 — no leading zeros in planning artifacts. The field name
      // 'padded_phase' is kept for workflow backward compat but the value is
      // now the canonical (unpadded) phase number (e.g. "6", not "06").
      // Workflows MUST NOT rely on this being zero-padded; use phase_number instead.
      // The resolver above still accepts legacy '06-name' / '006-name' dirs for older projects.
      out.padded_phase = String(phaseNum);
      out.phase_name = roadmapPhase ? roadmapPhase.name : null;
      // Strip all leading-zero prefix digits so '001-name', '01-name', '1-name' → 'name'.
      out.phase_slug = phaseDirEntry ? phaseDirEntry.replace(/^\d+-/, '') : null;
      out.phase_dir = phaseDirEntry ? path.join(PLANNING_DIR, 'phases', phaseDirEntry) : null;

      // Phase status from state.json (complete/executed/in_progress/planned/null).
      // Used by plan.md to show context-aware messaging when plans already exist.
      //
      // #948 — state_digest is derived from this SAME parse (single read, not a
      // second pass over state.json). It replaces the raw `{state_path}` full-file
      // read that plan-spawn-planner.md / research-phase.md / plan-research-
      // validation.md instruct the researcher/planner subagents to do — those
      // prompts embed state_digest directly instead.
      try {
        const stateFilePath = path.join(RCODE_DIR, 'state.json');
        const rawState = fs.existsSync(stateFilePath)
          ? JSON.parse(fs.readFileSync(stateFilePath, 'utf8'))
          : null;
        const stPhase = (rawState?.phases || []).find(p => {
          const k = String(p.id || p.number || '').replace(/^0+/, '') || String(p.id || p.number || '');
          return k === String(phaseNum);
        });
        out.phase_status = stPhase ? (stPhase.status || null) : null;
        const stateDigest = require(path.join(__dirname, 'lib', 'state-digest.cjs'));
        out.state_digest = stateDigest.buildStateDigest(rawState, phaseNum);
      } catch { out.phase_status = null; out.state_digest = null; }

      // Disk artifacts — same shape as walkPhaseDirs() but inlined.
      if (phaseDirEntry) {
        const dirFull = path.join(phasesDir, phaseDirEntry);
        const files = fs.readdirSync(dirFull);
        out.has_research = files.some(f => /(?:^|-)RESEARCH\.md$/i.test(f));
        out.has_context = files.some(f => /(?:^|-)CONTEXT\.md$/i.test(f));
        out.has_verification = files.some(f => /(?:^|-)VERIFICATION\.md$/i.test(f));
        out.has_plans = files.some(f => /(?:^|-)(PLAN|SPRINT)\.md$/i.test(f));
        out.plan_count = files.filter(f => /(?:^|-)(PLAN|SPRINT)\.md$/i.test(f)).length;
        // Phase 12 / #468 — REVIEWS.md + UAT.md presence (referenced by plan.md).
        out.has_reviews = files.some(f => /(?:^|-)REVIEWS\.md$/i.test(f));
        out.has_uat = files.some(f => /(?:^|-)UAT\.md$/i.test(f));
      } else {
        out.has_research = false;
        out.has_context = false;
        out.has_verification = false;
        out.has_plans = false;
        out.plan_count = 0;
        out.has_reviews = false;
        out.has_uat = false;
      }

      // Source-of-truth path getters for the fields workflows reference.
      out.context_path = (out.phase_dir && out.has_context)
        ? path.join(out.phase_dir, files0(out.phase_dir, /CONTEXT\.md$/i))
        : null;
      out.research_path = (out.phase_dir && out.has_research)
        ? path.join(out.phase_dir, files0(out.phase_dir, /RESEARCH\.md$/i))
        : null;
      out.verification_path = (out.phase_dir && out.has_verification)
        ? path.join(out.phase_dir, files0(out.phase_dir, /VERIFICATION\.md$/i))
        : null;
      // Phase 12 / #468 — REVIEWS.md / UAT.md paths (null when absent).
      out.reviews_path = (out.phase_dir && out.has_reviews)
        ? path.join(out.phase_dir, files0(out.phase_dir, /REVIEWS\.md$/i))
        : null;
      out.uat_path = (out.phase_dir && out.has_uat)
        ? path.join(out.phase_dir, files0(out.phase_dir, /UAT\.md$/i))
        : null;
      out.state_path = path.join(RCODE_DIR, 'state.json');
      out.roadmap_path = roadmapPath;
      out.requirements_path = fs.existsSync(path.join(PLANNING_DIR, 'REQUIREMENTS.md'))
        ? path.join(PLANNING_DIR, 'REQUIREMENTS.md')
        : null;

      // Defaults consumed by /rcode-plan and /rcode-discuss-phase.
      // Accept both bare commit_docs and nested git.commit_docs (settings.md uses git.commit_docs).
      const _rawCommitDocs = config.git?.commit_docs ?? config.commit_docs;
      out.commit_docs = _rawCommitDocs === undefined ? true : String(_rawCommitDocs) !== 'false';
      out.response_language = config.response_language || config.language || null;

      // Phase 12 / #468 — close the agent-context contract.
      // Reads nested config (workflow.*, features.*) via lib/config.cjs and
      // surfaces every field that plan.md/discuss-phase.md reference today.
      const nestedCfg = readNestedConfig();
      const wf = nestedCfg.workflow || {};
      const features = nestedCfg.features || {};

      // #949 — context_window folded into init so plan.md doesn't need a
      // separate `config-get context_window` cold start (top-level scalar,
      // not namespaced under workflow.*/features.*).
      out.context_window = nestedCfg.context_window ?? null;

      // Workflow feature flags (top-level for direct workflow consumption).
      // Defaults match the inline `config-get … || echo "X"` calls in the workflows.
      out.research_enabled = String(wf.research_by_default ?? 'false') === 'true';
      out.plan_checker_enabled = String(wf.plan_checker ?? 'true') !== 'false';
      out.nyquist_validation_enabled = String(wf.nyquist_validation ?? 'true') !== 'false';
      // Plan-time specialist review panel (#plan step 9.5). Default ON: the
      // generalist planner+checker pair cannot see design or guard-shape
      // defects, only goal coverage.
      out.specialist_review_enabled = String(wf.specialist_review ?? 'true') !== 'false';
      out.text_mode = String(wf.text_mode ?? 'false') === 'true';

      // Model resolution per active profile. The researcher agent ships as
      // `phase-researcher` in this codebase; resolveModelString falls back to
      // that when the prefixed/bare `researcher` ids aren't present.
      out.researcher_model = resolveModelString('rcode-researcher')
        || resolveModelString('rcode-phase-researcher');
      out.planner_model = resolveModelString('rcode-planner');
      out.checker_model = resolveModelString('rcode-sprint-checker');

      // #949 — agent-skills rows folded into init output. plan.md previously
      // shelled out to `agent-skills rcode-phase-researcher` / `rcode-planner` /
      // `rcode-sprint-checker` as 3 separate cold Node starts; research-phase.md
      // and plan-research-validation.md each did their own `agent-skills
      // rcode-phase-researcher` call. Same manifest lookup this init call
      // already has installedAgents/readAgentManifest() loaded for.
      {
        const agentManifest = readAgentManifest();
        out.agent_skills = {
          researcher: resolveAgentId('rcode-phase-researcher', agentManifest) || null,
          planner: resolveAgentId('rcode-planner', agentManifest) || null,
          checker: resolveAgentId('rcode-sprint-checker', agentManifest) || null,
        };
      }

      // Phase requirement IDs — extracted from ROADMAP requirements block.
      out.phase_req_ids = extractReqIds(roadmapPhase ? roadmapPhase.requirements : []);

      // Deeper config flags (grouped to keep top-level lean).
      // Defaults documented in the workflows' inline config-get fallbacks.
      out.features = {
        thinking_partner: String(features.thinking_partner ?? 'false') === 'true',
      };
      out.workflow_flags = {
        discuss_mode: wf.discuss_mode ?? 'adaptive',
        research_before_questions: String(wf.research_before_questions ?? 'true') !== 'false',
        max_discuss_passes: parseInt(wf.max_discuss_passes ?? '3', 10) || 3,
        security_enforcement: String(wf.security_enforcement ?? 'true') !== 'false',
        security_asvs_level: parseInt(wf.security_asvs_level ?? '1', 10) || 1,
        ui_phase: String(wf.ui_phase ?? 'true') !== 'false',
        ui_safety_gate: String(wf.ui_safety_gate ?? 'true') !== 'false',
      };
    }
  }


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

  // Filter scores to installed-only agents
  const installedSet = new Set(installed);
  const filteredScores = Object.fromEntries(
    Object.entries(explained.scores || {}).filter(([id]) => installedSet.has(id))
  );

  return {
    question,
    flags,
    panel,
    scores: filteredScores,
    installed,
  };
}

// Canonical aliases for short workflow-side ids that don't match manifest ids.
// Workflows historically use shorter names (researcher, checker, advisor) that
// map to longer manifest ids. Keep the alias table small and explicit — if a
// new agent needs an alias, add it here, don't add fuzzy matching. (#472)
const AGENT_ID_ALIASES = {
  researcher: 'phase-researcher',
  checker: 'sprint-checker',
  advisor: 'advisor-researcher',
};

function resolveAgentId(rawId, manifest) {
  if (!rawId) return null;
  // 1. Exact match on raw id
  let row = manifest.find((r) => r.id === rawId);
  if (row) return row;
  // 2. Strip leading rcode- prefix (workflows use prefixed form, manifest is bare)
  const stripped = rawId.replace(/^rcode-/, '');
  if (stripped !== rawId) {
    row = manifest.find((r) => r.id === stripped);
    if (row) return row;
  }
  // 3. Apply canonical aliases (e.g. researcher → phase-researcher)
  const aliased = AGENT_ID_ALIASES[stripped];
  if (aliased) {
    row = manifest.find((r) => r.id === aliased);
    if (row) return row;
  }
  return null;
}

function cmdAgentInfo(agentId) {
  const row = resolveAgentId(agentId, readAgentManifest());
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
      'plan karo', 'soche', 'plan karna',
      // Roman Urdu strategic signals (what-should-I-do questions)
      'kya karna', 'worth hai', 'sahi hai', 'kya sochte', 'kya lagta',
      // Urdu unicode discovery signals
      'ریسرچ', 'بتاؤ', 'ماذا', 'أفضل', 'کیف',
      // Arabic discovery signals
      'كيف أبدأ', 'ابدأ مشروع', 'مشروع جديد',
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
      // Arabic market signals
      'سوق', 'بحث', 'دبئي',
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
      'chahiye', 'banana hai', 'website chahiye', 'app chahiye', 'rank and rent', 'banaiye', 'bana do',
      'banai', 'banaye', 'tayyar karna',
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
    frontend: [
      'react', 'component', 'frontend', 'front-end', 'next.js', 'nextjs',
      'tailwind', 'tsx', 'jsx', 'rtl', 'a11y',
      'css', 'html', 'layout', 'responsive', 'animation', 'hydration',
      'bundle size', 'lighthouse', 'cls', 'lcp', 'tbt', 'ui component',
      'page render', 'client side', 'browser render',
      // Roman Urdu FE signals
      'front end', 'fe issue', 'ui fix',
    ],
    backend: [
      'backend', 'back-end', 'api endpoint', 'server side', 'prisma',
      'database query', 'db query', 'sql query', 'orm', 'db migration',
      'queue', 'webhook', 'graphql', 'rest api', 'n+1',
      'redis', 'postgres', 'mysql', 'mongodb', 'bullmq',
      'cron job', 'rate limit', 'auth middleware',
      // Roman Urdu BE signals
      'be issue', 'api slow', 'db slow',
    ],
    codebase: [
      'rewrite', 'refactor', 'migrate', 'this code', 'this function', 'this file',
      'this component', 'this api', 'this service', 'this database', 'this schema',
      'the auth', 'the tests', 'the build', 'the deploy', 'the pipeline',
      'production ready', 'ready to ship', 'test coverage', 'bug', 'error',
      'performance', 'should i rewrite', 'auth layer',
      'pull request', 'code review', 'technical debt', 'tech debt',
      'feature', 'ci/cd', 'cicd', 'pipeline', 'documentation', 'docs',
      // Tech choice signals
      'astro', 'remix', 'nuxt', 'svelte', 'vue', 'angular',
      'should i use', 'which framework', 'compare framework',
      // Roman Urdu codebase/fix signals
      'fix karo', 'theek karo', 'sahi karo',
      'إعادة', 'کود',
      // Arabic execution signals
      'إصلاح', 'كود', 'برنامج', 'نفذ', 'شغل',
    ],
    // Phase 6 — drift / audit / re-audit / extend-existing-artifact signals.
    // Routes /rcode-do toward /rcode-feature-drift instead of falling
    // through to inline execution. Reinforces classifyScope's drift branch.
    drift: [
      'drift', 'redrift', 're-audit', 'reaudit', 'audit feature', 'audit docs',
      'audit the docs', 'audit the prd', 'audit feature docs',
      'fill out existing', 'fill out the existing', 'fill out this',
      'extend audit', 'extend the audit', 'extend plan', 'extend the plan',
      'expand audit', 'expand the audit',
      'verify docs vs code', 'verify claims vs code', 'docs vs reality', 'docs vs code',
      'stale docs', 'out of date docs', 'out-of-date docs',
      // Roman Urdu drift signals
      'docs purane hai', 'docs purani hain', 'docs stale hain', 'audit dobara',
    ],
  };

  const matchedSignals = (signals) => signals.filter((s) => normalized.includes(s));
  const matched = {};
  for (const [type, signals] of Object.entries(SIGNAL_GROUPS)) {
    matched[type] = matchedSignals(signals);
  }

  // Weights per type — frontend/backend get weight 4 (most specific signals).
  const WEIGHTS = { discovery: 3, market: 2, greenfield: 2, team: 3, release: 3, design: 3, codebase: 3, drift: 3, frontend: 4, backend: 4 };
  const scores = {};
  for (const [type, hits] of Object.entries(matched)) {
    scores[type] = hits.length * WEIGHTS[type];
  }

  // discovery + market together = market-research question
  if (matched.discovery.length > 0 && matched.market.length > 0) {
    return { type: 'market', signals: [...matched.discovery, ...matched.market], scores };
  }

  const winner = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  const type = winner[1] > 0 ? winner[0] : 'discovery'; // default to discovery
  const allSignals = Object.values(matched).flat();

  return { type, signals: allSignals, scores };
}

/**
 * init execute — returns context blob for the /rcode-execute workflow.
 * Resolves plan_path (single file or phase directory), reads the plan
 * frontmatter, and returns dependency wave groupings.
 */
function cmdInitExecute(rawArgs) {
  const config = readConfig();
  const tokens = (rawArgs || '').trim().split(/\s+/).filter(Boolean);
  const flags = { wave: null, interactive: false, continue: false, option: null, 'skip-gates': false };
  const positional = [];

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === '--interactive') flags.interactive = true;
    else if (t === '--continue') flags.continue = true;
    else if (t === '--skip-gates') flags['skip-gates'] = true;
    else if (t.startsWith('--wave=')) flags.wave = t.slice('--wave='.length);
    else if (t.startsWith('--option=')) flags.option = t.slice('--option='.length);
    else positional.push(t);
  }

  const target = positional[0] || '';
  let planPath = null;
  let phaseDir = null;
  let plans = [];

  // Resolve target: could be a .md file or a phase dir/name
  if (target && target.length > 5000) {
    throw new Error('Target path exceeds maximum length (5000 chars)');
  }
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
    // #819/#829 — if no exact match, try glob for <N>-* and <padded>-* phase dirs
    if (!phaseDir) {
      const phaseNumInt = parseInt(target, 10);
      if (!Number.isNaN(phaseNumInt)) {
        const phasesRoot = path.join(PLANNING_DIR, 'phases');
        const padded = String(phaseNumInt).padStart(2, '0');
        if (fs.existsSync(phasesRoot)) {
          for (const entry of fs.readdirSync(phasesRoot)) {
            if (entry === String(phaseNumInt) || entry.startsWith(`${phaseNumInt}-`) || entry.startsWith(`${padded}-`)) {
              const candidate = path.join(phasesRoot, entry);
              if (fs.statSync(candidate).isDirectory()) { phaseDir = candidate; break; }
            }
          }
        }
      }
    }
    if (phaseDir) {
      // #819/#829 — match *-SPRINT.md and *-PLAN.md patterns, not just SPRINT.md/PLAN.md
      const planFiles = walkFiles(phaseDir).filter((f) => /(?:^|-)(SPRINT|PLAN)\.md$/i.test(path.basename(f)));
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
    // Surface response_language at top level so workflows don't have to drill
    // into config — matches cmdInit's contract (#721). null means English.
    response_language: config.response_language || config.language || null,
    executor_model: config.executor_model || config.model_profile || null,
    verifier_model: config.verifier_model || config.model_profile || null,
    config,
    paths: {
      project_root: PROJECT_ROOT,
      rcode: RCODE_DIR,
      planning_root: PLANNING_DIR,
      state: path.join(RCODE_DIR, 'state.json'),
    },
    state_exists: fs.existsSync(path.join(RCODE_DIR, 'state.json')),
  };
}

/**
 * state <subcommand> — read/write .rcode/state.json for execution tracking.
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
 *   sync-from-git                  → recover phase/sprint state from git commit history (#915)
 */
function cmdState(subArgs) {
  const statePath = path.join(RCODE_DIR, 'state.json');
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

  /** Cross-project decision log at ~/.rcode/decisions.jsonl. One JSON record per line. */
  function globalDecisionsPath() {
    const os = require('os');
    return path.join(os.homedir(), '.rcode', 'decisions.jsonl');
  }

  function appendGlobalDecision(record) {
    const file = globalDecisionsPath();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(file, JSON.stringify(record) + '\n', 'utf8');
  }

  function readGlobalDecisions() {
    const file = globalDecisionsPath();
    if (!fs.existsSync(file)) return [];
    const raw = fs.readFileSync(file, 'utf8');
    const out = [];
    for (const line of raw.split('\n')) {
      const t = line.trim();
      if (!t) continue;
      try { out.push(JSON.parse(t)); } catch (_) { /* skip malformed */ }
    }
    return out;
  }

  /** Read state or return default skeleton. */
  function readState() {
    if (!fs.existsSync(statePath)) return null;
    const stats = fs.statSync(statePath);
    if (stats.size > 10 * 1024 * 1024) {
      throw new Error('state.json exceeds 10 MB limit — possible corruption');
    }
    try {
      const raw = JSON.parse(fs.readFileSync(statePath, 'utf8'));
      const migrated = migrateState(raw);
      // One-time idempotent status migration (#955): persist the normalized
      // phase statuses back to disk the first time legacy aliases are found,
      // so state.json itself becomes canonical and every other reader (e.g.
      // resolveActivePhase() in state-reader.cjs, which reads the file
      // directly rather than through this helper) sees clean values too.
      // Idempotent: once written, raw already matches migrated and this is a
      // no-op on every subsequent load.
      const rawPhases = Array.isArray(raw?.phases) ? raw.phases : [];
      const migratedPhases = Array.isArray(migrated?.phases) ? migrated.phases : [];
      const hasLegacyStatus = rawPhases.some((p, i) => p?.status !== migratedPhases[i]?.status);
      if (hasLegacyStatus) {
        writeState(migrated);
      }
      return migrated;
    } catch (e) {
      throw new Error(`Invalid JSON in state.json: ${e.message}`);
    }
  }

  // Canonical phase status enum (#955). Legacy state files accumulated four
  // spellings for the same three states — normalize on every read so callers
  // never have to special-case 'completed'/'executed' against 'complete'.
  const PHASE_STATUS_ALIASES = {
    completed: 'complete',
    executed: 'complete',
    verified: 'complete',
  };
  const PHASE_STATUS_ENUM = new Set(['planned', 'executing', 'complete']);

  /** Map a legacy status spelling to the canonical enum value (idempotent). */
  function normalizePhaseStatus(status) {
    if (typeof status !== 'string') return status;
    return PHASE_STATUS_ALIASES[status] ?? status;
  }

  /**
   * migrateState — pure normalizer that upgrades any legacy state shape to v2.
   *
   * v0: { milestone: string, no phases[], no schema_version }
   * v1: { phases[] with mixed shapes, schema_version: 1 }
   * v2 (target): { schema_version: 2, phases[] uniform, milestones[] array }
   *
   * This function is PURE — it never writes to disk. readState() calls it on
   * every read so all callers transparently receive v2-shaped data. (#735)
   */
  function migrateState(raw) {
    if (!raw || typeof raw !== 'object') return raw;
    const state = Object.assign({}, raw);

    // --- milestones[] array (v0 → v2) ---
    // v0 state has milestone as a plain string and no milestones array.
    if (typeof state.milestone === 'string' && !Array.isArray(state.milestones)) {
      state.milestones = [{
        id: state.milestone,
        name: state.milestone,
        status: 'active',
      }];
    }
    if (!Array.isArray(state.milestones)) {
      state.milestones = [];
    }

    // --- phases[] uniform shape (v1 → v2) ---
    // v1 phases have mixed shapes: some {number, name}, others {id, name, status}.
    if (Array.isArray(state.phases)) {
      state.phases = state.phases.map(p => {
        if (!p || typeof p !== 'object') return p;
        // Resolve number: prefer p.number, fall back to numeric part of p.id
        let number = p.number ?? null;
        if (number === null && typeof p.id === 'string') {
          const m = p.id.match(/^(\d+(?:\.\d+)?)/);
          if (m) number = m[1];
        }
        // Resolve id: prefer p.id, synthesize from number
        const id = p.id ?? (number !== null ? String(number) : undefined);
        return {
          number: number ?? p.id ?? null,
          id: id ?? null,
          name: p.name ?? null,
          status: normalizePhaseStatus(p.status ?? 'planned'),
          started: p.started ?? null,
          completed: p.completed ?? null,
          sprints: Array.isArray(p.sprints) ? p.sprints : [],
          // Preserve any extra fields that callers may rely on
          ...Object.fromEntries(
            Object.entries(p).filter(([k]) =>
              !['number', 'id', 'name', 'status', 'started', 'completed', 'sprints'].includes(k)
            )
          ),
        };
      });
    }

    state.schema_version = 2;
    return state;
  }

  /** Atomic write: write to temp file then rename. */
  function writeState(state) {
    function isProcessAlive(pid) {
      try { process.kill(pid, 0); return true; } catch { return false; }
    }
    // #8 — stamp schema_version on every write so legacy state files
    // (no field) auto-gain the explicit tag. Never demotes an existing
    // higher version — only fills the missing case. Bumping the version
    // is the migrator's job, not this helper.
    if (typeof state.schema_version !== 'number') state.schema_version = 1;

    // Issue #681: auto-clear the install-time _seeded_stub marker once the
    // state has graduated to a real project (project field set + at least one
    // real phase OR REQUIREMENTS.md present). project-status (#675) reads
    // _seeded_stub; if no writer ever clears it, every project stays "stub"
    // forever and downstream workflows misroute.
    if (state._seeded_stub === true) {
      const phases = Array.isArray(state.phases) ? state.phases : [];
      const firstPhaseName = phases[0]?.name || '';
      const hasRealPhase = phases.length > 1 ||
        (firstPhaseName && firstPhaseName !== 'Setup & Scaffolding');
      const hasRequirements = (() => {
        try {
          return fs.existsSync(path.join(PROJECT_ROOT, '.planning', 'REQUIREMENTS.md'));
        } catch { return false; }
      })();
      if ((state.project && hasRealPhase) || hasRequirements) {
        delete state._seeded_stub;
      }
    }

    // Issue #681: auto-clear the install-time _seeded_stub marker once the
    // state has graduated to a real project (project field set + at least one
    // real phase OR REQUIREMENTS.md present). project-status (#675) reads
    // _seeded_stub; if no writer ever clears it, every project stays "stub"
    // forever and downstream workflows misroute.
    if (state._seeded_stub === true) {
      const phases = Array.isArray(state.phases) ? state.phases : [];
      const firstPhaseName = phases[0]?.name || '';
      const hasRealPhase = phases.length > 1 ||
        (firstPhaseName && firstPhaseName !== 'Setup & Scaffolding');
      const hasRequirements = (() => {
        try {
          return fs.existsSync(path.join(PROJECT_ROOT, '.planning', 'REQUIREMENTS.md'));
        } catch { return false; }
      })();
      if ((state.project && hasRealPhase) || hasRequirements) {
        delete state._seeded_stub;
      }
    }

    state.updated = new Date().toISOString();
    fs.mkdirSync(RCODE_DIR, { recursive: true });
    const lockPath = statePath + '.lock';
    let attempts = 0;
    while (fs.existsSync(lockPath) && attempts < 50) {
      // Check if lock holder is alive
      const lockPid = parseInt(fs.readFileSync(lockPath, 'utf8'), 10);
      if (lockPid && !isProcessAlive(lockPid)) {
        console.error(`Stale lock from PID ${lockPid} — removing`);
        try { fs.unlinkSync(lockPath); } catch {}
        break;
      }
      require('child_process').execSync('sleep 0.05'); // 50ms backoff
      attempts++;
    }
    if (attempts >= 50) throw new Error('state.json locked too long');

    try {
      fs.writeFileSync(lockPath, String(process.pid));
      const tmp = statePath + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(state, null, 2) + '\n');
      fs.renameSync(tmp, statePath);
    } finally {
      try { fs.unlinkSync(lockPath); } catch {}
    }
    return { ok: true, state };
  }

  /** Write state and return compact result (hides full state from output) */
  function writeStateCompact(state, meta) {
    writeState(state);
    return { ok: true, ...meta };
  }

  function defaultState(projectName) {
    const now = new Date().toISOString();
    return {
      version: '1',
      // #8 / #735 — explicit schema_version field for migration framework.
      // v2: phases[] uniform shape + milestones[] array. migrateState() upgrades
      // older state files transparently on read. New state starts at v2.
      schema_version: 2,
      project: projectName || path.basename(PROJECT_ROOT),
      created: now,
      updated: now,
      current_phase: null,
      current_plan: 0,
      current_sprint: null,
      phases: [],
      milestones: [],
      velocity_history: [],
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
    if (!fs.existsSync(statePath)) {
      // Auto-init with defaults if config.yaml exists (install happened).
      // Removes the "run /rcode-init first" friction — any workflow can
      // call `state read` and get a usable state back.
      const configPath = path.join(RCODE_DIR, 'config.yaml');
      if (fs.existsSync(configPath)) {
        let projectName = path.basename(PROJECT_ROOT);
        try {
          const cfg = fs.readFileSync(configPath, 'utf8');
          const match = cfg.match(/^project_name:\s*"?([^"\n]+)"?/m);
          if (match) projectName = match[1].trim();
        } catch { /* use basename fallback */ }
        const state = defaultState(projectName);
        writeState(state);
        return state;
      }
      return {
        ok: false,
        error: 'No state.json yet. Run /rcode-install to set up this project, or `state init --project <name>` directly.'
      };
    }
    const state = readState();
    if (!state) return { state: null };
    return state;
  }

  // --- clear-stub --- (issue #681)
  // Explicit way to flip _seeded_stub off. Useful for /rcode-new-project once
  // PROJECT.md / REQUIREMENTS.md / ROADMAP.md are committed. The auto-clear in
  // writeState() also handles this, but having an explicit subcommand lets
  // workflows be self-documenting and idempotent.
  if (sub === 'clear-stub') {
    if (!fs.existsSync(statePath)) {
      return { ok: false, error: 'No state.json — nothing to clear.' };
    }
    const state = readState();
    if (!state) return { ok: false, error: 'state.json unreadable' };
    const wasStub = state._seeded_stub === true;
    if (wasStub) delete state._seeded_stub;
    writeState(state);
    return { ok: true, was_stub: wasStub, project: state.project || null };
  }

  // --- init ---
  if (sub === 'init') {
    let existing;
    try {
      existing = fs.existsSync(statePath) ? readState() : null;
    } catch (e) {
      console.error(`Warning: existing state.json corrupted (${e.message}). Initializing fresh state.`);
      existing = null;
    }
    // #849: install seeds state.json with _seeded_stub:true and an empty
    // skeleton. When /rcode-new-project later calls `state init` (without
    // --force) to bootstrap a real project, the early-return below kept the
    // stub flag and any install-time phase entries instead of overwriting
    // them. Treat stub state as reinitializable so real project data wins.
    const existingIsStub = !!(existing && (
      existing._seeded_stub === true ||
      (Array.isArray(existing.phases) && existing.phases.some(p => p && p.name === 'Setup & Scaffolding'))
    ));
    if (existing && !existingIsStub && !parseFlags(1).force) {
      return { ok: true, state: existing, message: 'state.json already exists; pass --force to reinitialize' };
    }
    const flags = parseFlags(1);
    // Resolve project name: flag > config.yaml > directory basename (#816)
    let resolvedProject = flags.project || null;
    if (!resolvedProject) {
      const configPath = path.join(RCODE_DIR, 'config.yaml');
      if (fs.existsSync(configPath)) {
        try {
          const cfg = fs.readFileSync(configPath, 'utf8');
          const m = cfg.match(/^project_name:\s*"?([^"\n]+)"?/m);
          if (m) resolvedProject = m[1].trim();
        } catch { /* fallback to basename */ }
      }
    }
    const state = defaultState(resolvedProject);
    // Resolve milestone from ROADMAP.md if not already set (#816)
    if (!state.milestone) {
      const roadmapPath = path.join(PLANNING_DIR, 'ROADMAP.md');
      if (fs.existsSync(roadmapPath)) {
        try {
          const rm = fs.readFileSync(roadmapPath, 'utf8');
          const mMatch = rm.match(/\*\*M\d+[^*\n]+\*\*/);
          if (mMatch) {
            state.milestone = mMatch[0].replace(/\*\*/g, '').trim();
          } else {
            const mLine = rm.match(/[-*]\s+\*?\*?(M\d+[^\n*]+)/);
            if (mLine) state.milestone = mLine[1].trim();
          }
        } catch { /* leave null */ }
      }
    }
    return writeState(state);
  }

  // Compat shim: agents sometimes generate 'state set current_phase N' or
  // 'state set project X' instead of the real subcommands. Route them.
  if (sub === 'set') {
    const key = subArgs[1];
    const val = subArgs[2];
    if (key === 'current_phase' && val) {
      subArgs = [sub, val];
      sub = 'set-phase';
    } else if (key === 'project' && val) {
      const state = readState() || defaultState();
      state.project = val;
      return writeState(state);
    } else if (key === 'milestone' && val) {
      const state = readState() || defaultState();
      state.milestone = val;
      return writeState(state);
    } else if (key === '--ui-spec-path' && val) {
      const state = readState() || defaultState();
      state.ui_spec_path = val;
      return writeState(state);
    } else if (key === '--wireframes-path' && val) {
      const state = readState() || defaultState();
      state.wireframes_path = val;
      return writeState(state);
    } else {
      throw new Error(`Unknown state set key: ${key}. Use: set-phase <N>, or state set project|milestone|--ui-spec-path|--wireframes-path <value>`);
    }
  }

  // --- set-phase ---
  if (sub === 'set-phase') {
    const name = subArgs[1];
    // A flag-looking argument is never a phase name. Without this,
    // `state set-phase --phase 99 --status complete` created a phase literally
    // NAMED "--phase", set current_phase to "--phase", and returned ok:true.
    // Silent state corruption reported from a live project.
    if (typeof name === 'string' && name.startsWith('--')) {
      throw new Error(
        `set-phase takes a phase NAME as a positional argument, not flags. ` +
        `Got "${name}". Did you mean:\n` +
        `  state set-phase "Phase name"        (set the current phase pointer)\n` +
        `  phase complete <N>                  (mark a phase complete)\n` +
        `  state planned-phase --phase <N>     (record a phase as planned)`
      );
    }
    const strayFlags = subArgs.slice(2).filter(a => typeof a === 'string' && a.startsWith('--'));
    if (strayFlags.length > 0) {
      throw new Error(
        `set-phase does not accept flags (${strayFlags.join(', ')}). It sets the ` +
        `current-phase pointer only. Use 'phase complete <N>' to change a phase's status.`
      );
    }
    if (!name) throw new Error('set-phase requires a phase name argument');
    const state = readState() || defaultState();
    // Fix #854 — mark the previously active phase as completed before switching.
    if (state.current_phase && state.current_phase !== name && state.phases && state.phases.length > 0) {
      const prevIdx = state.phases.findIndex(p =>
        p.name === state.current_phase ||
        String(p.number) === String(state.current_phase) ||
        String(p.id) === String(state.current_phase)
      );
      if (prevIdx !== -1 && state.phases[prevIdx].status !== 'completed') {
        state.phases[prevIdx].status = 'completed';
        state.phases[prevIdx].completed = new Date().toISOString();
      }
    }
    state.current_phase = name;
    state.current_plan = 0;
    if (!state.phases) state.phases = [];
    const leadingNum = String(name).match(/^(\d+)/);
    const number = leadingNum
      ? parseInt(leadingNum[1], 10)
      : (state.phases.length + 1);
    // Match by number OR name to avoid duplicate phantom entries (#853)
    const existingIdx = state.phases.findIndex(p =>
      p.name === name ||
      String(p.number) === String(number) ||
      String(p.id) === String(number)
    );
    if (existingIdx === -1) {
      state.phases.push({
        number,
        id: String(number),
        name,
        started: new Date().toISOString(),
        completed: null,
        plan_count: 0,
      });
    } else {
      // Update name to canonical form when re-entering a phase
      state.phases[existingIdx].name = name;
    }
    // #894 — Proactively sync state.milestone from ROADMAP when set-phase is called.
    // If ROADMAP.md is readable, find its last active milestone heading and update
    // state.milestone if it differs (state can go stale after milestone transitions).
    try {
      const roadmapPathSP = path.join(PLANNING_DIR, 'ROADMAP.md');
      if (fs.existsSync(roadmapPathSP)) {
        const rmText = fs.readFileSync(roadmapPathSP, 'utf8');
        const mhRe = /^#{1,2}\s+(M\d+[^\n]*)/gm;
        let lastLabel = null, mhM;
        while ((mhM = mhRe.exec(rmText)) !== null) {
          if (/^milestones?\s*$/i.test(mhM[1].trim())) continue;
          lastLabel = mhM[1].trim();
        }
        if (lastLabel && lastLabel !== (state.milestone || '')) {
          state.milestone = lastLabel;
        }
      }
    } catch (_) { /* ROADMAP unreadable; leave milestone as-is */ }

    const spResult = writeState(state);
    // Fix #855 — keep config.yaml in sync when set-phase writes state.json.
    // One-way guard: only sync if config.yaml is already present (i.e. project is initialised).
    try {
      const cfgLib = require(path.join(__dirname, 'lib', 'config.cjs'));
      const existingCfgPhase = cfgLib.cmdGet(PROJECT_ROOT, 'current_phase');
      if (String(existingCfgPhase || '') !== String(name)) {
        cfgLib.cmdSet(PROJECT_ROOT, 'current_phase', name);
      }
    } catch (_) { /* config.yaml may not exist yet; silently skip */ }
    return spResult;
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

  // --- snapshot --- (#807)
  // Write current state.json contents to .planning/STATE.md and return state as JSON.
  if (sub === 'snapshot') {
    if (!fs.existsSync(statePath)) {
      return { ok: false, error: 'No state.json — nothing to snapshot.' };
    }
    const state = readState();
    if (!state) return { ok: false, error: 'state.json unreadable' };
    const statemd = path.join(PLANNING_DIR, 'STATE.md');
    const now = new Date().toISOString();
    const lines = [
      `# State Snapshot`,
      ``,
      `**Generated:** ${now}`,
      `**Project:** ${state.project || '(unset)'}`,
      `**Milestone:** ${state.milestone || '(unset)'}`,
      `**Current phase:** ${state.current_phase || '(unset)'}`,
      `**Current plan:** ${state.current_plan ?? 0}`,
      `**Current sprint:** ${state.current_sprint || '(none)'}`,
      ``,
      `## Raw state.json`,
      ``,
      '```json',
      JSON.stringify(state, null, 2),
      '```',
    ];
    fs.mkdirSync(path.dirname(statemd), { recursive: true });
    fs.writeFileSync(statemd, lines.join('\n') + '\n');
    return { ok: true, snapshot_path: path.relative(PROJECT_ROOT, statemd), state };
  }

  // --- update-progress --- (#820)
  // Increment current_sprint counter or mark the current sprint complete.
  // Usage:
  //   state update-progress                  → increment current_plan by 1
  //   state update-progress --sprint NN.S    → mark that sprint complete
  if (sub === 'update-progress') {
    const flags = parseFlags(1);
    const state = readState() || defaultState();
    if (flags.sprint) {
      // Mark the named sprint complete
      const targetId = String(flags.sprint);
      let found = false;
      for (const phase of (state.phases || [])) {
        for (const sprint of (phase.sprints || [])) {
          if (sprint.id === targetId || String(sprint.number) === targetId) {
            sprint.status = 'completed';
            sprint.completed_at = sprint.completed_at || new Date().toISOString();
            found = true;
          }
        }
      }
      if (!found) {
        return { ok: false, error: `Sprint ${targetId} not found in state` };
      }
      const result = writeState(state);
      return { ...result, sprint_completed: targetId };
    }
    // Default: increment current_plan (progress counter)
    if (typeof state.current_plan !== 'number') state.current_plan = 0;
    state.current_plan += 1;
    const result = writeState(state);
    return { ...result, current_plan: state.current_plan };
  }

  // =====================================================================
  // Sprint & Story Management
  // =====================================================================

  // --- sprint add --phase NN --goal "Sprint goal" ---
  // NOTE: this populates entry.sprints[] (an array). A separate code path,
  // 'planned-phase' below (~line 3152), populates entry.plans (a plain count).
  // These two fields are never reconciled with each other — see AUDIT-redundant-work.md
  // finding 1 cross-check. Do not assume one implies the other is populated.
  if (sub === 'sprint' && subArgs[1] === 'add') {
    const flags = parseFlags(2);
    const state = readState() || defaultState();
    if (!flags.phase) throw new Error('sprint add requires --phase <NN>');
    if (!flags.goal) throw new Error('sprint add requires --goal "Sprint goal"');

    const phaseIdx = state.phases.findIndex(p =>
      String(p.number) === String(flags.phase) ||
      String(p.id) === String(flags.phase) ||
      p.name === flags.phase
    );
    if (phaseIdx === -1) throw new Error(`Phase "${flags.phase}" not found in state. If the phase exists in ROADMAP.md, run "rcode state sync" or "/rcode-update" to synchronize state first.`);
    const phase = state.phases[phaseIdx];

    // Derive phase number: prefer explicit .number, fallback to array position
    // Prefer explicit .number, then .id (zero-padded string like "01"),
    // then array position
    const phaseNum = phase.number != null
      ? phase.number
      : phase.id != null
        ? parseInt(phase.id, 10) || (phaseIdx + 1)
        : phaseIdx + 1;
    if (!phase.sprints) phase.sprints = [];
    const sprintNum = phase.sprints.length + 1;
    const padPhase = String(phaseNum); // no leading zeros
    const sprintId = `${padPhase}.${sprintNum}`;

    const sprint = {
      id: sprintId,
      number: sprintNum,
      goal: flags.goal,
      status: 'planned',
      velocity_target: flags.velocity ? parseInt(flags.velocity, 10) : null,
      velocity_actual: null,
      started_at: null,
      completed_at: null,
      stories: [],
    };
    phase.sprints.push(sprint);
    state.current_sprint = sprintId;
    return writeStateCompact(state, { sprint_id: sprintId, phase: padPhase });
  }

  // --- logs prune [--dir <path>] [--older-than <days>] [--dry-run] ---
  // Prune dated session-* artifacts (#13). Defaults:
  //   dir         = .rcode/progress/
  //   pattern     = session-*.md
  //   older-than  = 90 days
  //   dry-run     = true (so accidental invocation never deletes)
  // No-op if the directory doesn't exist — prints a friendly message.
  // File age is determined by mtime, not filename.
  if (sub === 'logs' && subArgs[1] === 'prune') {
    const flags = parseFlags(2);
    const dryRun = ('dry-run' in flags) || !subArgs.includes('--no-dry-run');
    const dir = flags.dir
      ? path.resolve(PROJECT_ROOT, flags.dir)
      : path.join(RCODE_DIR, 'progress');
    const olderDays = parseInt(flags['older-than'] || '90', 10);
    const pattern = flags.pattern || 'session-*.md';
    const cutoff = Date.now() - olderDays * 24 * 60 * 60 * 1000;

    if (!fs.existsSync(dir)) {
      return {
        ok: true,
        dry_run: dryRun,
        pruned: 0,
        message: `No logs directory at ${path.relative(PROJECT_ROOT, dir)} — nothing to prune.`,
      };
    }

    // Translate the glob pattern to a RegExp (only the * wildcard for safety).
    const reSrc = '^' + pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$';
    const fileRe = new RegExp(reSrc);

    const toPrune = [];
    for (const entry of fs.readdirSync(dir)) {
      if (!fileRe.test(entry)) continue;
      const full = path.join(dir, entry);
      let stat;
      try { stat = fs.statSync(full); } catch (_) { continue; }
      if (!stat.isFile()) continue;
      if (stat.mtimeMs < cutoff) {
        toPrune.push({
          file: path.relative(PROJECT_ROOT, full),
          age_days: Math.floor((Date.now() - stat.mtimeMs) / (24 * 60 * 60 * 1000)),
          bytes: stat.size,
        });
      }
    }

    if (!dryRun) {
      for (const item of toPrune) {
        try { fs.unlinkSync(path.join(PROJECT_ROOT, item.file)); }
        catch (e) { item.error = e.message; }
      }
    }

    return {
      ok: true,
      dry_run: dryRun,
      dir: path.relative(PROJECT_ROOT, dir),
      pattern,
      older_than_days: olderDays,
      pruned: dryRun ? 0 : toPrune.filter(t => !t.error).length,
      would_prune: dryRun ? toPrune.length : 0,
      details: toPrune,
    };
  }

  // --- sprint init-all [--file <path>] [--dry-run] ---
  // Bulk-initialize sprints by parsing .planning/sprints.md (#11).
  // Supported formats: markdown table with `| Sprint | Phase | Goal |` columns,
  // OR a simple "## Sprint N — Phase X — Goal" heading list. Skips rows whose
  // sprint id already exists for that phase (idempotent). No-op when the
  // file is absent — prints a helpful message rather than failing.
  if (sub === 'sprint' && subArgs[1] === 'init-all') {
    const flags = parseFlags(2);
    const dryRun = ('dry-run' in flags) || subArgs.includes('--dry-run');
    const filePath = flags.file || path.join(PLANNING_DIR, 'sprints.md');
    if (!fs.existsSync(filePath)) {
      return {
        ok: true,
        created: 0,
        message: `No sprints.md found at ${path.relative(PROJECT_ROOT, filePath)}. Write one with rows like '| 1 | 3 | Migrate auth module |' to bulk-initialize sprints.`,
      };
    }
    const text = fs.readFileSync(filePath, 'utf8');
    const rows = [];

    // Parse markdown-table form: skip header + separator rows, accept any
    // row with at least 3 pipe-delimited cells (sprint, phase, goal).
    const lines = text.split(/\r?\n/);
    let inTable = false;
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('|')) { inTable = false; continue; }
      // Separator row like |---|---|---|
      if (/^\|\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?$/.test(trimmed)) { inTable = true; continue; }
      const cells = trimmed.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
      if (cells.length < 3) continue;
      // Header detection: skip if first cell is non-numeric AND we haven't seen separator yet
      if (!inTable && !/^\d/.test(cells[0])) continue;
      // Tolerate extra columns; first three are sprint, phase, goal.
      const sprintNum = parseInt(cells[0], 10);
      const phaseRef = cells[1];
      const goal = cells[2];
      if (!Number.isFinite(sprintNum) || !phaseRef || !goal) continue;
      rows.push({ sprint: sprintNum, phase: phaseRef, goal });
    }

    // Fallback: parse "## Sprint N — Phase X — Goal" heading form.
    if (rows.length === 0) {
      const hRe = /^#{2,3}\s*Sprint\s+(\d+)\s*[—\-:]\s*Phase\s+([\d.]+)\s*[—\-:]\s*(.+)$/gim;
      let m;
      while ((m = hRe.exec(text)) !== null) {
        rows.push({ sprint: parseInt(m[1], 10), phase: m[2], goal: m[3].trim() });
      }
    }

    if (rows.length === 0) {
      return {
        ok: true,
        created: 0,
        message: `sprints.md parsed but no rows recognized. Expected '| sprint | phase | goal |' table or '## Sprint N — Phase X — Goal' headings.`,
      };
    }

    const state = readState() || defaultState();
    const created = [];
    const skipped = [];
    for (const row of rows) {
      const phaseIdx = state.phases.findIndex(p =>
        String(p.number) === String(row.phase) ||
        String(p.id) === String(row.phase) ||
        p.name === row.phase
      );
      if (phaseIdx === -1) {
        skipped.push({ ...row, reason: `phase ${row.phase} not found` });
        continue;
      }
      const phase = state.phases[phaseIdx];
      if (!phase.sprints) phase.sprints = [];
      const phaseNum = phase.number != null ? phase.number
        : phase.id != null ? (parseInt(phase.id, 10) || (phaseIdx + 1))
        : phaseIdx + 1;
      const sprintId = `${phaseNum}.${row.sprint}`;
      if (phase.sprints.some(s => s.id === sprintId || s.number === row.sprint)) {
        skipped.push({ ...row, reason: `sprint ${sprintId} already exists` });
        continue;
      }
      const sprint = {
        id: sprintId,
        number: row.sprint,
        goal: row.goal,
        status: 'planned',
        velocity_target: null,
        velocity_actual: null,
        started_at: null,
        completed_at: null,
        stories: [],
      };
      if (!dryRun) phase.sprints.push(sprint);
      created.push({ sprint_id: sprintId, phase: String(phaseNum), goal: row.goal });
    }
    if (!dryRun && created.length > 0) writeState(state);
    return {
      ok: true,
      dry_run: dryRun,
      created: created.length,
      skipped: skipped.length,
      file: path.relative(PROJECT_ROOT, filePath),
      details: { created, skipped },
    };
  }

  // --- sprint list [--phase NN] ---
  if (sub === 'sprint' && subArgs[1] === 'list') {
    const flags = parseFlags(2);
    const state = readState() || defaultState();
    const results = [];
    for (const phase of (state.phases || [])) {
      if (flags.phase && String(phase.number) !== String(flags.phase)) continue;
      for (const s of (phase.sprints || [])) {
        const done = (s.stories || []).filter(t => t.status === 'done').length;
        const total = (s.stories || []).length;
        const points_done = (s.stories || []).filter(t => t.status === 'done').reduce((a, t) => a + (t.points || 0), 0);
        const points_total = (s.stories || []).reduce((a, t) => a + (t.points || 0), 0);
        results.push({
          id: s.id, goal: s.goal, status: s.status,
          stories: `${done}/${total}`, points: `${points_done}/${points_total}`,
          velocity_target: s.velocity_target,
        });
      }
    }
    return results;
  }

  // --- sprint status [--sprint NN.S] ---
  if (sub === 'sprint' && subArgs[1] === 'status') {
    const flags = parseFlags(2);
    const state = readState() || defaultState();
    const targetId = flags.sprint || state.current_sprint;
    if (!targetId) throw new Error('No current sprint. Use --sprint NN.S or run sprint add first.');

    let found = null;
    for (const phase of (state.phases || [])) {
      for (const s of (phase.sprints || [])) {
        if (s.id === targetId) { found = s; break; }
      }
      if (found) break;
    }
    if (!found) throw new Error(`Sprint "${targetId}" not found`);

    const stories = found.stories || [];
    const byStatus = { todo: [], in_progress: [], review: [], done: [] };
    for (const st of stories) (byStatus[st.status] || byStatus.todo).push(st);
    const points_done = byStatus.done.reduce((a, t) => a + (t.points || 0), 0);
    const points_total = stories.reduce((a, t) => a + (t.points || 0), 0);

    return {
      sprint: found.id, goal: found.goal, status: found.status,
      velocity_target: found.velocity_target, velocity_actual: found.velocity_actual,
      stories: { todo: byStatus.todo.length, in_progress: byStatus.in_progress.length,
                 review: byStatus.review.length, done: byStatus.done.length, total: stories.length },
      points: { done: points_done, total: points_total,
                remaining: points_total - points_done },
    };
  }

  // --- sprint start [--sprint NN.S] ---
  if (sub === 'sprint' && subArgs[1] === 'start') {
    const flags = parseFlags(2);
    const state = readState() || defaultState();
    const targetId = flags.sprint || state.current_sprint;
    if (!targetId) throw new Error('No sprint to start. Use --sprint NN.S.');

    for (const phase of (state.phases || [])) {
      for (const s of (phase.sprints || [])) {
        if (s.id === targetId) {
          s.status = 'active';
          s.started_at = new Date().toISOString();
          state.current_sprint = targetId;
          return writeStateCompact(state, { started: targetId });
        }
      }
    }
    throw new Error(`Sprint "${targetId}" not found`);
  }

  // --- sprint complete [--sprint NN.S] ---
  if (sub === 'sprint' && subArgs[1] === 'complete') {
    const flags = parseFlags(2);
    const state = readState() || defaultState();
    const targetId = flags.sprint || state.current_sprint;
    if (!targetId) throw new Error('No sprint to complete. Use --sprint NN.S.');

    for (const phase of (state.phases || [])) {
      for (const s of (phase.sprints || [])) {
        if (s.id === targetId) {
          const points_done = (s.stories || []).filter(t => t.status === 'done').reduce((a, t) => a + (t.points || 0), 0);
          s.status = 'completed';
          s.completed_at = new Date().toISOString();
          s.velocity_actual = points_done;
          if (!state.velocity_history) state.velocity_history = [];
          state.velocity_history.push({ sprint: targetId, points: points_done, completed_at: s.completed_at });
          state.current_sprint = null;
          return writeStateCompact(state, { completed: targetId, velocity: points_done });
        }
      }
    }
    throw new Error(`Sprint "${targetId}" not found`);
  }

  // --- sprint velocity ---
  if (sub === 'sprint' && subArgs[1] === 'velocity') {
    const state = readState() || defaultState();
    const history = state.velocity_history || [];
    const avg = history.length > 0
      ? Math.round(history.reduce((a, v) => a + v.points, 0) / history.length)
      : 0;
    return { history, average_velocity: avg, sprint_count: history.length };
  }

  // --- story add --sprint NN.S --title "Story title" --points N ---
  if (sub === 'story' && subArgs[1] === 'add') {
    const flags = parseFlags(2);
    const state = readState() || defaultState();
    const sprintId = flags.sprint || state.current_sprint;
    if (!sprintId) throw new Error('story add requires --sprint NN.S or an active sprint');
    if (!flags.title) throw new Error('story add requires --title "Story title"');

    for (const phase of (state.phases || [])) {
      for (const s of (phase.sprints || [])) {
        if (s.id === sprintId) {
          if (!s.stories) s.stories = [];
          const storyNum = s.stories.length + 1;
          const storyId = `${sprintId}.${String(storyNum)}`;
          const story = {
            id: storyId,
            title: flags.title,
            points: flags.points ? parseInt(flags.points, 10) : 0,
            status: 'todo',
            acceptance: flags.acceptance || null,
          };
          s.stories.push(story);
          return writeStateCompact(state, { story_id: storyId, sprint: sprintId });
        }
      }
    }
    throw new Error(`Sprint "${sprintId}" not found`);
  }

  // --- story move --id NN.S.TT --status done ---
  if (sub === 'story' && subArgs[1] === 'move') {
    const flags = parseFlags(2);
    const state = readState() || defaultState();
    if (!flags.id) throw new Error('story move requires --id NN.S.TT');
    if (!flags.status) throw new Error('story move requires --status <todo|in_progress|review|done>');
    const validStatuses = ['todo', 'in_progress', 'review', 'done'];
    if (!validStatuses.includes(flags.status)) throw new Error(`Invalid status "${flags.status}". Valid: ${validStatuses.join(', ')}`);

    for (const phase of (state.phases || [])) {
      for (const s of (phase.sprints || [])) {
        for (const story of (s.stories || [])) {
          if (story.id === flags.id) {
            const prev = story.status;
            story.status = flags.status;
            return writeStateCompact(state, { story: flags.id, from: prev, to: flags.status });
          }
        }
      }
    }
    throw new Error(`Story "${flags.id}" not found`);
  }

  // --- story list [--sprint NN.S] [--status todo|in_progress|done] ---
  if (sub === 'story' && subArgs[1] === 'list') {
    const flags = parseFlags(2);
    const state = readState() || defaultState();
    const sprintId = flags.sprint || state.current_sprint;
    const results = [];
    for (const phase of (state.phases || [])) {
      for (const s of (phase.sprints || [])) {
        if (sprintId && s.id !== sprintId) continue;
        for (const story of (s.stories || [])) {
          if (flags.status && story.status !== flags.status) continue;
          results.push({ ...story, sprint: s.id });
        }
      }
    }
    return results;
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
    // Issue #658 — caller can scope explicitly with --phase <N>; otherwise we
    // infer from state.current_phase (which can mis-fire mid-orchestration).
    const flagStart = (() => {
      for (let i = 1; i < subArgs.length; i++) if (subArgs[i].startsWith('--')) return i;
      return subArgs.length;
    })();
    const summary = subArgs.slice(1, flagStart).join(' ');
    const flags = parseFlags(flagStart);
    if (!summary) throw new Error('add-decision requires a summary argument');
    const state = readState() || defaultState();
    if (!state.decisions) state.decisions = [];
    const record = {
      summary,
      phase: flags.phase ? String(flags.phase) : state.current_phase,
      plan: flags.plan ? String(flags.plan) : state.current_plan,
      date: new Date().toISOString(),
    };
    state.decisions.push(record);
    writeState(state);
    // Mirror to cross-project store (best-effort, never fails the local write).
    try {
      appendGlobalDecision({
        ts: record.date,
        project: state.project || path.basename(PROJECT_ROOT),
        project_root: PROJECT_ROOT,
        phase: record.phase,
        plan: record.plan,
        summary: record.summary,
      });
    } catch (_) { /* silent — local commit must not break on home-dir issues */ }
    // Issue #658 — return the appended record so callers can confirm the
    // phase scope and ID without re-reading state.json.
    return {
      ok: true,
      decision: record,
      decision_index: state.decisions.length - 1,
      total_decisions: state.decisions.length,
    };
  }

  // --- decisions-global: query ~/.rcode/decisions.jsonl across all projects ---
  if (sub === 'decisions-global') {
    const flags = parseFlags(1);
    const limit = Math.max(1, parseInt(flags.limit || '20', 10));
    const sinceMs = flags.since ? Date.parse(flags.since) : null;
    const lines = readGlobalDecisions();
    const filtered = lines.filter((d) => {
      if (flags.project && d.project !== flags.project) return false;
      if (sinceMs && Date.parse(d.ts) < sinceMs) return false;
      return true;
    });
    // newest first
    filtered.sort((a, b) => (a.ts < b.ts ? 1 : -1));
    return { decisions: filtered.slice(0, limit), total: filtered.length };
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
      resolved: null,
    });
    return writeState(state);
  }

  // --- resolve-blocker ---
  if (sub === 'resolve-blocker') {
    const state = readState();
    if (!state) throw new Error('No state.json found');
    if (!state.blockers || state.blockers.length === 0) {
      throw new Error('No blockers to resolve');
    }
    // Issue #656 — support --all and --phase <N> for batch resolution.
    const flagStart = subArgs[1] && /^--/.test(subArgs[1]) ? 1 : 2;
    const flags = parseFlags(flagStart);
    const indices = [];
    if (flags.all === true || flags.all === 'true') {
      for (let i = 0; i < state.blockers.length; i++) {
        if (!state.blockers[i].resolved) indices.push(i);
      }
    } else if (flags.phase) {
      const ph = String(flags.phase).replace(/^[Pp]hase\s*/, '');
      for (let i = 0; i < state.blockers.length; i++) {
        const b = state.blockers[i];
        if (b.resolved) continue;
        const matchesPhase = String(b.phase || '') === ph ||
          (b.description || '').includes(`Phase ${ph}`) ||
          (b.description || '').includes(`[Phase ${ph}]`);
        if (matchesPhase) indices.push(i);
      }
    } else {
      const index = parseInt(subArgs[1], 10);
      if (Number.isNaN(index) || index < 0 || index >= state.blockers.length) {
        throw new Error(`Invalid blocker index: ${subArgs[1]}. Valid range: 0-${state.blockers.length - 1}, or use --all / --phase <N>`);
      }
      indices.push(index);
    }
    if (indices.length === 0) {
      throw new Error('No matching unresolved blockers found');
    }
    // Issue #654 — tickets-first. Resolution must reference an issue, a
    // commit SHA, or be explicitly marked as internal with --noref. Silent
    // resolution drops the audit trail.
    const hasIssue = flags.issue && /^#?\d+$/.test(String(flags.issue));
    const hasCommit = flags.commit && /^[0-9a-f]{7,40}$/i.test(String(flags.commit));
    const noref = flags.noref === true || flags.noref === 'true';
    if (!hasIssue && !hasCommit && !noref) {
      throw new Error(
        `resolve-blocker [${index}] requires an audit reference. Pass one of:\n` +
        `  --issue <gh-issue-number>     e.g. --issue 654\n` +
        `  --commit <sha>                7-40 hex chars\n` +
        `  --noref                       acknowledge no external reference (audit trail will say "internal")`
      );
    }
    const now = new Date().toISOString();
    for (const idx of indices) {
      state.blockers[idx].resolved = now;
      if (hasIssue) state.blockers[idx].resolved_issue = String(flags.issue).replace(/^#/, '');
      if (hasCommit) state.blockers[idx].resolved_commit = String(flags.commit).slice(0, 40);
      if (noref && !hasIssue && !hasCommit) state.blockers[idx].resolved_ref = 'internal';
    }
    const result = writeState(state);
    return { ...result, resolved_count: indices.length, resolved_indices: indices };
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

  // --- sync-from-git ---
  // Recover execution state by inspecting git log for implementation commits.
  // For each phase that has sprints, checks whether feat:/fix:/refactor: commits
  // referencing that phase number exist. If so, marks sprints completed and phase
  // as executed (not complete — verifier should still run). Issue #915.
  if (sub === 'sync-from-git') {
    const state = readState();
    if (!state) return { ok: false, error: 'No state.json — run `state init` first.' };

    const { execSync } = require('child_process');
    let gitLog = '';
    try {
      gitLog = execSync('git log --oneline', { cwd: PROJECT_ROOT, encoding: 'utf8' });
    } catch (e) {
      return { ok: false, error: `git log failed: ${e.message}` };
    }

    const implPrefixRe = /^[a-f0-9]+ (feat|fix|refactor|perf|style|test|chore)\(/i;
    const implLines = gitLog.split('\n').filter(l => implPrefixRe.test(l));

    // Read ROADMAP.md once so we can look up each phase's declared status.
    // Fix #897 — sync-from-git was ignoring ROADMAP status entirely, causing
    // all phases to stay as 'planned' even when ROADMAP said 'complete'.
    let roadmapText = '';
    try {
      const roadmapPath = path.join(PLANNING_DIR, 'ROADMAP.md');
      if (fs.existsSync(roadmapPath)) roadmapText = fs.readFileSync(roadmapPath, 'utf8');
    } catch { /* ignore — ROADMAP is optional */ }

    // Normalise raw status strings from ROADMAP into canonical state.json vocabulary.
    // Mirrors the normalizeStatus() defined in the `state sync` handler.
    function normalizeStatusSFG(raw) {
      if (!raw) return 'planned';
      const s = String(raw).toLowerCase().replace(/[✅\s]/g, '');
      if (['complete','completed','shipped','verified','done'].includes(s)) return 'complete';
      if (['executing','in_progress','inprogress','active','started'].includes(s)) return 'in_progress';
      return 'planned';
    }

    // Returns the status declared in ROADMAP for a given phase number, or null
    // if the phase isn't found. Handles both pipe-table and heading-block formats.
    function readPhaseStatusFromRoadmap(phaseNum) {
      if (!roadmapText) return null;
      // Pipe-table row: | <num> | <name> | <goal> | <status> |
      const tableRe = new RegExp(
        `^\\|\\s*${phaseNum.replace('.', '\\.')}\\s*\\|[^|]+\\|[^|]*\\|(?:\\s*([^|\\n]*?)\\s*\\|)?`,
        'm'
      );
      const tableMatch = roadmapText.match(tableRe);
      if (tableMatch && tableMatch[1] !== undefined) return normalizeStatusSFG(tableMatch[1]);

      // Heading-block format: ## Phase <num> — <name>\n...**Status:** <value>
      const headRe = new RegExp(
        `^#{2,4}\\s*Phase\\s+${phaseNum.replace('.', '\\.')}\\s*[—\\-:]`,
        'm'
      );
      const headMatch = headRe.exec(roadmapText);
      if (headMatch) {
        const after = roadmapText.slice(headMatch.index + headMatch[0].length).split('\n').slice(0, 8).join('\n');
        const statusMatch = after.match(/\*\*Status:\*\*\s*(.+)/i);
        if (statusMatch) return normalizeStatusSFG(statusMatch[1].trim());
      }
      return null;
    }

    let syncedPhases = 0;
    let syncedSprints = 0;

    const statusRankSFG = { complete: 3, verified: 3, executed: 2, in_progress: 1, planned: 0 };

    const phases = Array.isArray(state.phases) ? state.phases : [];
    for (const phase of phases) {
      if (!phase) continue;
      const num = String(phase.number || phase.id || '').trim();
      if (!num) continue;

      // Read the phase's declared status from ROADMAP and apply it when it
      // advances the current status — never downgrade. (#897)
      const roadmapStatus = readPhaseStatusFromRoadmap(num);
      if (roadmapStatus) {
        const currentRank = statusRankSFG[phase.status] ?? 0;
        const roadmapRank = statusRankSFG[roadmapStatus] ?? 0;
        if (roadmapRank > currentRank) {
          phase.status = roadmapStatus;
          syncedPhases++;
        }
      }

      // Check if any implementation commit references this phase number.
      // Matches patterns: "phase 1", "phase 1.", "1.1", "(1)", "#1 "
      const phaseNumEscaped = num.replace('.', '\\.');
      const phaseRe = new RegExp(
        `(phase\\s*${phaseNumEscaped}[^\\d]|\\b${phaseNumEscaped}\\.\\d|\\(${phaseNumEscaped}\\)|\\s${phaseNumEscaped}\\s)`,
        'i'
      );
      const hasImplCommit = implLines.some(l => phaseRe.test(l));

      // Also check if SUMMARY.md exists for this phase
      let hasSummary = false;
      try {
        const phaseDirs = fs.existsSync(PLANNING_DIR)
          ? fs.readdirSync(PLANNING_DIR).filter(d => {
              const m = d.match(/^(\d+)/);
              return m && m[1] === num;
            })
          : [];
        if (phaseDirs.length > 0) {
          const summaryPath = path.join(PLANNING_DIR, phaseDirs[0], 'SUMMARY.md');
          hasSummary = fs.existsSync(summaryPath);
        }
      } catch { /* ignore fs errors */ }

      const sprints = Array.isArray(phase.sprints) ? phase.sprints : [];
      if ((hasImplCommit || hasSummary) && sprints.length > 0) {
        for (const sprint of sprints) {
          if (sprint && sprint.status !== 'completed') {
            sprint.status = 'completed';
            syncedSprints++;
          }
        }
        if (phase.status !== 'complete' && phase.status !== 'verified') {
          // Git evidence upgrades to 'executed' only when ROADMAP doesn't already
          // report a higher status (complete/verified already applied above).
          if ((statusRankSFG['executed'] ?? 0) > (statusRankSFG[phase.status] ?? 0)) {
            phase.status = 'executed';
            syncedPhases++;
          }
        }
      }
    }

    writeState(state);
    return {
      ok: true,
      message: `Synced ${syncedPhases} phases, ${syncedSprints} sprints from git history`,
      synced_phases: syncedPhases,
      synced_sprints: syncedSprints,
    };
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

    // Helper to convert phase number to comparable tuple
    function phaseTuple(s) {
      const [maj, min] = s.split('.').map(x => parseInt(x, 10));
      return [maj, min || 0];
    }

    // Helper to compare phase tuples
    function cmpPhase(a, b) {
      const [a1, a2] = phaseTuple(a);
      const [b1, b2] = phaseTuple(b);
      return a1 - b1 || a2 - b2;
    }

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
      return cmpPhase(p.number, phaseNumber) > 0;
    });

    if (insertIdx === -1) {
      state.phases.push(newPhase);
    } else {
      state.phases.splice(insertIdx, 0, newPhase);
    }

    writeState(state);
    // #942 — surface the milestone close nudge for inserted phases too.
    const insHealth = milestoneCloseNudge();
    return {
      ok: true,
      phase_number: phaseNumber,
      name: phaseName,
      slug: slug,
      directory: path.join(PLANNING_DIR, 'phases', `${phaseNumber}-${slug}`),
      milestone_health: insHealth.milestone_health,
      ...(insHealth.nudge ? { nudge: insHealth.nudge } : {}),
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

  // --- set-user-profile / write-profile ---
  if (sub === 'set-user-profile' || sub === 'write-profile') {
    const flags = parseFlags(1);
    if (!flags.json) throw new Error('write-profile requires --json <json-blob>');
    const state = readState() || defaultState();
    if (!state.user_profile) state.user_profile = {};
    try {
      state.user_profile = JSON.parse(flags.json);
    } catch (e) {
      throw new Error(`Invalid JSON in --json flag: ${e.message}`);
    }
    return writeState(state);
  }

  // --- next-phase-id ---
  if (sub === 'next-phase-id') {
    const phasesDir = path.join(PLANNING_DIR, 'phases');
    let maxNum = 0;
    if (fs.existsSync(phasesDir)) {
      const entries = fs.readdirSync(phasesDir);
      for (const entry of entries) {
        const match = entry.match(/^(\d+)-/);
        if (match) {
          const num = parseInt(match[1], 10);
          maxNum = Math.max(maxNum, num);
        }
      }
    }
    const nextId = String(maxNum + 1);
    return { ok: true, next_phase_id: nextId };
  }

  // --- next-plan-id <phase-id> ---
  if (sub === 'next-plan-id') {
    const phaseId = subArgs[1];
    if (!phaseId) throw new Error('next-plan-id requires a phase ID argument (NN format)');
    const phaseMatch = phaseId.match(/^(\d+)(?:\.(\d+))?$/);
    if (!phaseMatch) throw new Error(`Invalid phase ID format: ${phaseId}. Expected N or N.M`);

    const phasePart = phaseMatch[1];
    const phasesDir = path.join(PLANNING_DIR, 'phases');

    // Find the phase directory matching NN-* (directories may be zero-padded for sorting)
    let phaseDir = null;
    if (fs.existsSync(phasesDir)) {
      const entries = fs.readdirSync(phasesDir);
      for (const entry of entries) {
        const match = entry.match(/^(\d+)(?:\.\d+)?-/);
        if (match && parseInt(match[1], 10) === parseInt(phasePart, 10)) {
          phaseDir = path.join(phasesDir, entry);
          break;
        }
      }
    }

    // If no phase dir found, default to 1st plan
    if (!phaseDir) {
      return { ok: true, next_plan_id: `${phasePart}.1` };
    }

    // Scan phase dir for numbered subdirs (MM-*) to find max plan number
    let maxPlanNum = 0;
    const entries = fs.readdirSync(phaseDir);
    for (const entry of entries) {
      const match = entry.match(/^(\d+)-/);
      if (match && fs.statSync(path.join(phaseDir, entry)).isDirectory()) {
        const num = parseInt(match[1], 10);
        maxPlanNum = Math.max(maxPlanNum, num);
      }
    }

    const nextPlanNum = String(maxPlanNum + 1);
    // First plan in empty phase gets .1 not .2
    return { ok: true, next_plan_id: maxPlanNum === 0 ? `${phasePart}.1` : `${phasePart}.${nextPlanNum}` };
  }

  // --- next-task-id <plan-id> ---
  if (sub === 'next-task-id') {
    const planId = subArgs[1];
    if (!planId) throw new Error('next-task-id requires a plan ID argument (NN.MM format)');
    const match = planId.match(/^(\d+)\.(\d+)$/);
    if (!match) throw new Error(`Invalid plan ID format: ${planId}. Expected N.M`);

    const phasePart = match[1];
    const planPart = match[2];

    // Construct plan file path
    const phasesDir = path.join(PLANNING_DIR, 'phases');
    let planFile = null;

    if (fs.existsSync(phasesDir)) {
      const entries = fs.readdirSync(phasesDir);
      for (const entry of entries) {
        const phaseMatch = entry.match(/^(\d+)(?:\.\d+)?-/);
        if (phaseMatch && parseInt(phaseMatch[1], 10) === parseInt(phasePart, 10)) {
          const phaseDir = path.join(phasesDir, entry);

          // Check for subdirectory named planPart-*
          const subentries = fs.readdirSync(phaseDir);
          for (const subentry of subentries) {
            const subMatch = subentry.match(/^(\d+)-/);
            if (subMatch && parseInt(subMatch[1], 10) === parseInt(planPart, 10)) {
              const planDir = path.join(phaseDir, subentry);
              const candidate = path.join(planDir, 'SPRINT.md');
              if (fs.existsSync(candidate)) {
                planFile = candidate;
                break;
              }
            }
          }

          // If no subdir found, check phase-level PLAN.md
          if (!planFile && parseInt(planPart, 10) === 1) {
            const candidate = path.join(phaseDir, 'SPRINT.md');
            if (fs.existsSync(candidate)) {
              planFile = candidate;
            }
          }
          break;
        }
      }
    }

    if (!planFile) {
      throw new Error(`Plan ${planId} not found. Ensure phase and plan directories exist.`);
    }

    // Read PLAN.md and count existing tasks
    const planContent = fs.readFileSync(planFile, 'utf8');
    const taskMatches = planContent.match(/^### Task \d+\.\d+\.\d+ —/gm) || [];
    const nextTaskNum = String(taskMatches.length + 1);

    return { ok: true, next_task_id: `${planId}.${nextTaskNum}` };
  }

  // --- resolve-id <id> ---
  if (sub === 'resolve-id') {
    const id = subArgs[1];
    if (!id) throw new Error('resolve-id requires an ID argument (NN, NN.MM, NN.MM.TT, or M{N})');

    // Parse ID pattern
    let idType = null;
    let phaseId = null, planId = null, taskId = null, milestoneId = null;

    if (/^M\d+$/.test(id)) {
      idType = 'milestone';
      milestoneId = id;
    } else if (/^\d+$/.test(id)) {
      idType = 'phase';
      phaseId = id;
    } else if (/^\d+\.\d+$/.test(id)) {
      const parts = id.split('.');
      phaseId = parts[0];

      // Determine if this is a decimal phase or a plan
      // Check if directory ends in .M pattern
      const phasesDir = path.join(PLANNING_DIR, 'phases');
      let isDecimalPhase = false;
      if (fs.existsSync(phasesDir)) {
        const entries = fs.readdirSync(phasesDir);
        for (const entry of entries) {
          if (entry.match(/^\d+\.\d+-/)) {
            isDecimalPhase = true;
            break;
          }
        }
      }

      if (isDecimalPhase) {
        idType = 'decimal-phase';
      } else {
        idType = 'plan';
        planId = id;
      }
    } else if (/^\d+\.\d+\.\d+$/.test(id)) {
      idType = 'task';
      const parts = id.split('.');
      phaseId = parts[0];
      planId = `${parts[0]}.${parts[1]}`;
      taskId = id;
    } else {
      throw new Error(`Invalid ID format: ${id}. Valid formats: NN (phase), NN.MM (plan), NN.MM.TT (task), MN (milestone)`);
    }

    // Build response
    const result = {
      id,
      type: idType,
      phase_id: phaseId,
      plan_id: planId,
      task_id: taskId,
      milestone_id: milestoneId,
      path: null,
      phase_dir: null,
      plan_dir: null,
      status: 'pending',
    };

    // Resolve paths
    if (phaseId) {
      const phasesDir = path.join(PLANNING_DIR, 'phases');
      if (fs.existsSync(phasesDir)) {
        const entries = fs.readdirSync(phasesDir);
        for (const entry of entries) {
          const match = entry.match(/^(\d+)-/);
          if (match && parseInt(match[1], 10) === parseInt(phaseId, 10)) {
            const phaseDir = path.join(phasesDir, entry);
            result.phase_dir = phaseDir;

            // Resolve plan path if plan_id is set
            if (planId) {
              const planNum = planId.split('.')[1];

              // Check for subdirectory
              const subentries = fs.readdirSync(phaseDir);
              for (const subentry of subentries) {
                const subMatch = subentry.match(/^(\d+)-/);
                if (subMatch && parseInt(subMatch[1], 10) === parseInt(planNum, 10)) {
                  const planDir = path.join(phaseDir, subentry);
                  const planPath = path.join(planDir, 'SPRINT.md');
                  if (fs.existsSync(planPath)) {
                    result.plan_dir = planDir;
                    result.path = planPath;
                  }
                  break;
                }
              }

              // If no subdir and planNum is 1, check phase-level PLAN.md
              if (!result.path && parseInt(planNum, 10) === 1) {
                const candidate = path.join(phaseDir, 'SPRINT.md');
                if (fs.existsSync(candidate)) {
                  result.plan_dir = phaseDir;
                  result.path = candidate;
                }
              }
            }
            break;
          }
        }
      }
    }

    // Resolve milestone path if milestone_id is set
    if (milestoneId) {
      const milestonesDir = path.join(PLANNING_DIR, 'milestones');
      if (fs.existsSync(milestonesDir)) {
        const entries = fs.readdirSync(milestonesDir);
        for (const entry of entries) {
          if (entry.match(new RegExp(`^${milestoneId}-`))) {
            result.path = path.join(milestonesDir, entry, 'ROADMAP.md');
            break;
          }
        }
      }
    }

    // Determine status
    let status = 'not_found';
    if (result.phase_dir && fs.existsSync(result.phase_dir)) {
      status = 'found';
      // Check if SUMMARY exists for "complete"
      if (result.plan_dir) {
        const summaryFiles = fs.existsSync(result.plan_dir) ?
          fs.readdirSync(result.plan_dir).filter(f => f.endsWith('-SUMMARY.md')) : [];
        if (summaryFiles.length > 0) status = 'complete';
        else if (fs.existsSync(path.join(result.plan_dir, 'SPRINT.md'))) status = 'planned';
      }
    }
    result.status = status;

    return result;
  }

  // --- set-ids-in-state ---
  if (sub === 'set-ids-in-state') {
    const state = readState() || defaultState();
    if (!state.phases) state.phases = [];
    if (!state.plans) state.plans = [];
    if (!state.milestones) state.milestones = [];

    // Scan phases directory
    const phasesDir = path.join(PLANNING_DIR, 'phases');
    if (fs.existsSync(phasesDir)) {
      const entries = fs.readdirSync(phasesDir);
      for (const entry of entries) {
        const match = entry.match(/^(\d+)(?:\.\d+)?-(.+)$/);
        if (match) {
          const phaseId = String(parseInt(match[1], 10)); // strip leading zeros
          const slug = match[2];
          const phaseDir = path.join(phasesDir, entry);

          // Add phase if not already present (check both id and number per #482-A
          // schema-drift fix — different writers use different field names).
          if (!state.phases.some(p => String(parseInt(p.id, 10)) === phaseId || String(parseInt(p.number, 10)) === phaseId)) {
            state.phases.push({
              id: phaseId,
              number: phaseId,
              slug,
              path: phaseDir,
              created: new Date().toISOString(),
            });
          }

          // Scan for plans within phase
          const subentries = fs.readdirSync(phaseDir);
          for (const subentry of subentries) {
            const subMatch = subentry.match(/^(\d+)-(.+)$/);
            if (subMatch && fs.statSync(path.join(phaseDir, subentry)).isDirectory()) {
              const planNum = String(parseInt(subMatch[1], 10)); // strip leading zeros
              const planId = `${phaseId}.${planNum}`;
              const planSlug = subMatch[2];
              const planDir = path.join(phaseDir, subentry);
              const planPath = path.join(planDir, 'SPRINT.md');

              if (fs.existsSync(planPath)) {
                if (!state.plans.some(p => p.id === planId)) {
                  state.plans.push({
                    id: planId,
                    phase_id: phaseId,
                    slug: planSlug,
                    path: planPath,
                    created: new Date().toISOString(),
                  });
                }
              }
            }
          }

          // Check for phase-level PLAN.md (01 plan)
          const phasePlanPath = path.join(phaseDir, 'SPRINT.md');
          if (fs.existsSync(phasePlanPath)) {
            const planId = `${phaseId}.01`;
            if (!state.plans.some(p => p.id === planId)) {
              state.plans.push({
                id: planId,
                phase_id: phaseId,
                slug: 'default',
                path: phasePlanPath,
                created: new Date().toISOString(),
              });
            }
          }
        }
      }
    }

    // Scan milestones directory
    const milestonesDir = path.join(PLANNING_DIR, 'milestones');
    if (fs.existsSync(milestonesDir)) {
      const entries = fs.readdirSync(milestonesDir);
      for (const entry of entries) {
        const match = entry.match(/^(M\d+)-(.+)$/);
        if (match) {
          const milestoneId = match[1];
          const slug = match[2];
          const milestonePath = path.join(milestonesDir, entry, 'ROADMAP.md');

          if (!state.milestones.some(m => m.id === milestoneId)) {
            state.milestones.push({
              id: milestoneId,
              slug,
              path: milestonePath,
              created: new Date().toISOString(),
            });
          }
        }
      }
    }

    return writeState(state);
  }

  // --- migrate-ids ---
  if (sub === 'migrate-ids') {
    const state = readState() || defaultState();
    let migratedCount = 0;

    const phasesDir = path.join(PLANNING_DIR, 'phases');
    if (fs.existsSync(phasesDir)) {
      const entries = fs.readdirSync(phasesDir).sort();
      let phaseNum = 1;

      for (const entry of entries) {
        const match = entry.match(/^(\d+)-/);
        if (match) {
          phaseNum = parseInt(match[1], 10);
        }

        const phaseDir = path.join(phasesDir, entry);

        // Check for PLAN.md at phase level
        const phasePlanPath = path.join(phaseDir, 'SPRINT.md');
        if (fs.existsSync(phasePlanPath)) {
          try {
            let content = fs.readFileSync(phasePlanPath, 'utf8');
            const phaseIdStr = String(phaseNum); // no leading zeros

            // Check if it has frontmatter with phase/plan fields
            const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
            if (frontmatterMatch) {
              const fm = frontmatterMatch[1];
              if (!fm.match(/^id:/m)) {
                // Only add id if missing; preserve existing phase/plan if present
                let newFrontmatter = fm.trimEnd() + `\nid: "${phaseIdStr}.1"`;
                if (!fm.match(/^phase:/m)) newFrontmatter += `\nphase: "${phaseIdStr}"`;
                if (!fm.match(/^plan:/m)) newFrontmatter += `\nplan: "1"`;
                newFrontmatter += '\n';
                content = content.replace(/^---\n([\s\S]*?)\n---\n/, `---\n${newFrontmatter}---\n`);
                const tmp = phasePlanPath + '.tmp';
                fs.writeFileSync(tmp, content, 'utf8');
                fs.renameSync(tmp, phasePlanPath);
                migratedCount++;
              }
            } else {
              // No frontmatter found — prepend minimal frontmatter
              const assignedId = `${phaseIdStr}.1`;
              const minimal = `---\nid: "${assignedId}"\nphase: "${phaseIdStr}"\nplan: "1"\ntype: auto\n---\n`;
              fs.writeFileSync(phasePlanPath, minimal + content);
              migratedCount++;
            }
          } catch (e) {
            // Log but continue on file read/write errors
            if (process.env.DEBUG) console.error(`Warning: Could not migrate ${phasePlanPath}: ${e.message}`);
          }
        }

        // Check for plan subdirs
        const subentries = fs.readdirSync(phaseDir);
        let planNum = 1;
        for (const subentry of subentries) {
          const subMatch = subentry.match(/^(\d+)-/);
          if (subMatch && fs.statSync(path.join(phaseDir, subentry)).isDirectory()) {
            planNum = parseInt(subMatch[1], 10);
            const planDir = path.join(phaseDir, subentry);
            const planPath = path.join(planDir, 'SPRINT.md');

            if (fs.existsSync(planPath)) {
              try {
                let content = fs.readFileSync(planPath, 'utf8');
                const phaseIdStr = String(phaseNum); // no leading zeros
                const planIdStr = String(planNum);   // no leading zeros

                const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
                if (frontmatterMatch) {
                  const fm = frontmatterMatch[1];
                  if (!fm.match(/^id:/m)) {
                    // Only add id if missing; preserve existing phase/plan if present
                    let newFrontmatter = fm.trimEnd() + `\nid: "${phaseIdStr}.${planIdStr}"`;
                    if (!fm.match(/^phase:/m)) newFrontmatter += `\nphase: "${phaseIdStr}"`;
                    if (!fm.match(/^plan:/m)) newFrontmatter += `\nplan: "${planIdStr}"`;
                    newFrontmatter += '\n';
                    content = content.replace(/^---\n([\s\S]*?)\n---\n/, `---\n${newFrontmatter}---\n`);
                    const tmp = planPath + '.tmp';
                    fs.writeFileSync(tmp, content, 'utf8');
                    fs.renameSync(tmp, planPath);
                    migratedCount++;
                  }
                } else {
                  // No frontmatter found — prepend minimal frontmatter
                  const assignedId = `${phaseIdStr}.${planIdStr}`;
                  const minimal = `---\nid: "${assignedId}"\nphase: "${phaseIdStr}"\nplan: "${planIdStr}"\ntype: auto\n---\n`;
                  fs.writeFileSync(planPath, minimal + content);
                  migratedCount++;
                }
              } catch (e) {
                // Log but continue on file read/write errors
                if (process.env.DEBUG) console.error(`Warning: Could not migrate ${planPath}: ${e.message}`);
              }
            }
          }
        }
      }
    }

    return { ok: true, migrated: migratedCount, message: `Migrated ${migratedCount} PLAN.md files with IDs` };
  }

  // =====================================================================
  // state migrate-plan-names: normalise plan filenames to no-leading-zeros (#657)
  //
  // Renames <N>-0K-SPRINT.md → <N>-K-SPRINT.md so the K (plan index) honours
  // the project's no-leading-zeros rule. The N (phase prefix) is preserved
  // because phase directories use leading zeros for ls sort order.
  //
  // Reports planned actions and exits without touching disk when --dry-run.
  // Updates state.json plan IDs if the renamed file is referenced there.
  // Does NOT rewrite ROADMAP / SUMMARY backrefs — workflows glob *-SPRINT.md
  // which still matches. Backref cleanup is a follow-up if needed.
  // =====================================================================
  if (sub === 'migrate-plan-names') {
    const flags = parseFlags(1);
    // parseFlags sets valueless flags to '' (empty string). Detect presence
    // by key existence, not truthiness, so --dry-run works as a bare flag.
    const dryRun = ('dry-run' in flags) || subArgs.includes('--dry-run');
    const renames = [];
    const phasesDir = path.join(PLANNING_DIR, 'phases');
    if (!fs.existsSync(phasesDir)) {
      return { ok: true, renamed: 0, dry_run: dryRun, message: '.planning/phases not found' };
    }
    for (const entry of fs.readdirSync(phasesDir)) {
      const phaseDir = path.join(phasesDir, entry);
      if (!fs.statSync(phaseDir).isDirectory()) continue;
      for (const file of fs.readdirSync(phaseDir)) {
        // Match: <N>-0K-SPRINT.md where K starts with '0' AND has at least one
        // more digit (so single-digit "0" wouldn't match — there is no plan 0).
        const m = file.match(/^(\d+)-0(\d+)-SPRINT\.md$/);
        if (!m) continue;
        const phasePrefix = m[1];
        const planNum = m[2]; // already stripped leading zero
        const oldName = file;
        const newName = `${phasePrefix}-${planNum}-SPRINT.md`;
        const oldPath = path.join(phaseDir, oldName);
        const newPath = path.join(phaseDir, newName);
        if (fs.existsSync(newPath)) {
          renames.push({ phase_dir: entry, from: oldName, to: newName, status: 'skip-target-exists' });
          continue;
        }
        renames.push({ phase_dir: entry, from: oldName, to: newName, status: dryRun ? 'would-rename' : 'renamed' });
        if (!dryRun) fs.renameSync(oldPath, newPath);
      }
    }
    // Update state.json plan IDs (e.g., "20.01" → "20.1") if the entries exist.
    let stateUpdates = 0;
    if (!dryRun) {
      const state = readState();
      if (state && Array.isArray(state.phases)) {
        for (const phase of state.phases) {
          if (!Array.isArray(phase.plans)) continue;
          for (const plan of phase.plans) {
            if (typeof plan.id !== 'string') continue;
            const newId = plan.id.replace(/^(\d+)\.0(\d+)$/, '$1.$2');
            if (newId !== plan.id) {
              plan.id = newId;
              if (plan.plan) plan.plan = String(plan.plan).replace(/^0(\d+)$/, '$1');
              stateUpdates++;
            }
          }
        }
        if (stateUpdates > 0) writeState(state);
      }
    }
    return {
      ok: true,
      dry_run: dryRun,
      renamed: renames.filter(r => r.status === 'renamed').length,
      would_rename: renames.filter(r => r.status === 'would-rename').length,
      skipped: renames.filter(r => r.status === 'skip-target-exists').length,
      state_plan_ids_updated: stateUpdates,
      details: renames,
    };
  }

  // =====================================================================
  // state schema-status: report current vs expected schema_version (#8).
  // Read-only. Surfaces stale state files so users know when to run
  // `state migrate-schema`.
  // =====================================================================
  if (sub === 'schema-status') {
    const CURRENT_SCHEMA_VERSION = 1;
    if (!fs.existsSync(statePath)) {
      return { ok: false, error: 'state.json not found' };
    }
    let state;
    try { state = JSON.parse(fs.readFileSync(statePath, 'utf8')); }
    catch (e) { return { ok: false, error: `Invalid JSON: ${e.message}` }; }
    const recorded = state.schema_version;
    // Treat missing schema_version as v1 (legacy state files). Never crash.
    const effective = typeof recorded === 'number' ? recorded : 1;
    return {
      ok: true,
      file: path.relative(PROJECT_ROOT, statePath),
      schema_version: effective,
      current_version: CURRENT_SCHEMA_VERSION,
      drift: effective !== CURRENT_SCHEMA_VERSION,
      explicit: typeof recorded === 'number',
      message: typeof recorded === 'number'
        ? (effective === CURRENT_SCHEMA_VERSION
            ? 'Up to date.'
            : `state.json is at v${effective}, current is v${CURRENT_SCHEMA_VERSION}. Run: rcode-tools state migrate-schema`)
        : 'state.json has no schema_version field — treated as v1. Next write will stamp the explicit field.',
    };
  }

  // =====================================================================
  // state migrate-schema: normalise phases array to current schema
  // Handles 3 known schema variants in the wild:
  //   Schema A (v1 old) — phases[N] has {id, goal, ...} but no status
  //   Schema B (v1 mid) — phases[N] has {number, name, status?, ...}
  //   Schema C (v2)     — phases[N] has {number, name, status, planned_at?, ...}
  // After migration every entry has: number, name, status (defaulting to 'complete'
  // for entries that have a SUMMARY.md path or missing status).
  // =====================================================================
  if (sub === 'migrate-schema') {
    // Closes #735. Full normalizer: phases array + all top-level array fields.
    const state = readState();
    if (!state) return { ok: false, error: 'state.json not found or empty' };
    if (!Array.isArray(state.phases)) {
      state.phases = [];
    }

    let changed = 0;

    // 1. Normalize phases entries
    state.phases = state.phases.map((p) => {
      const updated = Object.assign({}, p);

      // Normalise identifier: prefer number, fall back to id or name
      if (!updated.number && (updated.id || updated.name)) {
        updated.number = String(updated.id || updated.name);
        changed++;
      }

      // Normalise name
      if (!updated.name && updated.goal) {
        updated.name = String(updated.goal).slice(0, 60);
        changed++;
      }

      // Normalise status: missing → infer from completion markers
      if (!updated.status) {
        if (updated.completed || updated.summary_path) {
          updated.status = 'complete';
        } else if (updated.started) {
          updated.status = 'executing';
        } else {
          updated.status = 'planned';
        }
        changed++;
      }

      return updated;
    });

    // 2. Ensure all required top-level arrays are present (never crash on legacy state).
    const requiredArrays = [
      'velocity_history', 'executions', 'decisions',
      'blockers', 'council_sessions', 'workstreams',
    ];
    for (const key of requiredArrays) {
      if (!Array.isArray(state[key])) {
        state[key] = [];
        changed++;
      }
    }

    // 3. Ensure required scalar fields
    if (!state.project) { state.project = path.basename(PROJECT_ROOT); changed++; }
    if (!state.created) { state.created = state.updated || new Date().toISOString(); changed++; }
    if (state.current_phase === undefined) { state.current_phase = null; changed++; }
    if (state.current_plan  === undefined) { state.current_plan  = 0;    changed++; }
    if (state.current_sprint === undefined) { state.current_sprint = null; changed++; }
    if (state.last_session   === undefined) { state.last_session  = null; changed++; }
    if (state.active_workstream === undefined) { state.active_workstream = null; changed++; }

    // 4. Bump schema_version if still at implicit v1 and we made structural changes
    if (typeof state.schema_version !== 'number') {
      state.schema_version = 1;
      changed++;
    }

    if (changed > 0) {
      writeState(state);
    }
    return {
      ok: true, changed,
      schema_version: state.schema_version,
      phase_count: state.phases.length,
      message: `Schema migration complete — ${changed} field(s) normalised (${state.phases.length} phases)`,
    };
  }

  // =====================================================================
  // Execution-lifecycle phase state
  // =====================================================================

  // NOTE: entry.plans (a count) is disjoint from entry.sprints[] (an array,
  // set by 'sprint add' above) — see the comment there. Known schema divergence,
  // not yet unified; do not read one as evidence the other is in sync.
  if (sub === 'planned-phase') {
    const flags = parseFlags(1);
    if (!flags.phase) throw new Error('planned-phase requires --phase <N>');
    const state = readState() || defaultState();
    if (!state.phases) state.phases = [];
    const phaseKey = String(flags.phase);
    let entry = state.phases.find((p) => String(p.number || p.id || p.name) === phaseKey);
    const previousStatus = entry ? (entry.status || null) : null;
    if (!entry) {
      entry = { number: phaseKey, name: flags.name || phaseKey, plans: Number(flags.plans || 0) };
      state.phases.push(entry);
    }
    entry.status = 'planned';
    entry.name = flags.name || entry.name;
    if (flags.plans !== undefined) entry.plans = Number(flags.plans);
    entry.planned_at = new Date().toISOString();
    writeState(state);
    return { updated: true, phase: phaseKey, status: 'planned', previous_status: previousStatus, name: entry.name, plans: entry.plans };
  }

  if (sub === 'begin-phase') {
    const flags = parseFlags(1);
    if (!flags.phase) throw new Error('begin-phase requires --phase <N>');
    const state = readState() || defaultState();
    if (!state.phases) state.phases = [];
    const phaseKey = String(flags.phase);
    let entry = state.phases.find((p) => String(p.number || p.id || p.name) === phaseKey);
    const previousStatus = entry ? (entry.status || null) : null;
    if (!entry) {
      entry = { number: phaseKey, name: flags.name || phaseKey, plans: Number(flags.plans || 0) };
      state.phases.push(entry);
    }
    // Transition guard: reject complete → executing unless --force
    if (previousStatus === 'complete' && !flags.force) {
      throw new Error(`Phase ${phaseKey} is already complete. Use --force to re-execute.`);
    }
    entry.status = 'executing';
    if (flags.name) entry.name = flags.name;
    if (flags.plans !== undefined) entry.plans = Number(flags.plans);
    entry.started = entry.started || new Date().toISOString();
    state.current_phase = entry.name;
    writeState(state);
    return { updated: true, phase: phaseKey, status: 'executing', previous_status: previousStatus };
  }

  // DEPRECATED (#gap: state-sync audit): no workflow calls this — every
  // completion path uses the top-level `phase complete <N>` subcommand
  // instead. Its stale-executing-phase hygiene warning was ported there.
  // Kept only for backward compatibility with anyone scripting against it
  // directly; do not wire new callers to this — use `phase complete`.
  // Records what the user actually authorized this session — 'plan', 'build',
  // 'research', 'audit'. `resume-work` reads it so "resume" restores POSITION
  // AND SCOPE, not position alone. Without it, a resume after a planning
  // session reads as "keep going" and starts building work nobody asked for.
  if (sub === 'set-intent') {
    const flags = parseFlags(1);
    const intent = flags.intent || subArgs[1];
    const ALLOWED = ['plan', 'build', 'research', 'audit', 'review'];
    if (!intent) throw new Error(`set-intent requires an intent (${ALLOWED.join('|')})`);
    if (!ALLOWED.includes(intent)) {
      throw new Error(`unknown intent "${intent}" — expected one of: ${ALLOWED.join(', ')}`);
    }
    const state = readState() || defaultState();
    const previous = state.last_intent ? state.last_intent.intent : null;
    state.last_intent = {
      intent,
      recorded_at: new Date().toISOString(),
      source: flags.source || 'workflow',
    };
    writeState(state);
    return { ok: true, intent, previous };
  }

  if (sub === 'complete-phase') {
    const flags = parseFlags(1);
    if (!flags.phase) throw new Error('complete-phase requires --phase <N>');
    const state = readState() || defaultState();
    if (!state.phases) state.phases = [];
    const phaseKey = String(flags.phase);
    const entry = state.phases.find((p) => String(p.number || p.id || p.name) === phaseKey);
    if (!entry) throw new Error(`Phase ${phaseKey} not found in state`);
    const previousStatus = entry.status || null;
    // Transition guard: warn if completing from planned (skipped executing)
    if (previousStatus === 'planned') {
      process.stderr.write(`Warning: completing phase ${phaseKey} from 'planned' without executing.\n`);
    }

    // State-hygiene gate (#955): if an earlier-numbered phase is still stuck
    // 'executing' while this later phase gets marked complete, that's exactly
    // the drift that misorients resolveActivePhase() / the SessionStart greeter.
    // Warn rather than block — completing out of order is sometimes correct
    // (parallel workstreams), but it must never happen silently.
    const thisNum = parseFloat(phaseKey);
    const stalePhases = Number.isNaN(thisNum) ? [] : state.phases.filter((p) => {
      if (!p || p.status !== 'executing') return false;
      const n = parseFloat(p.number ?? p.id);
      return !Number.isNaN(n) && n < thisNum;
    });
    if (stalePhases.length > 0 && !flags.force) {
      const staleList = stalePhases.map((p) => p.number ?? p.id).join(', ');
      process.stderr.write(
        `Warning: phase ${phaseKey} marked complete while earlier phase(s) ${staleList} are still 'executing'. ` +
        `Use --force to suppress this warning, or close out the stale phase(s) first.\n`
      );
    }

    entry.status = 'complete';
    entry.completed = new Date().toISOString();
    writeState(state);
    return {
      updated: true,
      phase: phaseKey,
      status: 'complete',
      previous_status: previousStatus,
      stale_executing_phases: stalePhases.map((p) => p.number ?? p.id),
    };
  }

  // Truncates execution state but preserves decisions, council_sessions, and workstreams.
  if (sub === 'reset') {
    const state = readState() || defaultState();
    const preserved = {
      version: state.version || '1',
      project: state.project || path.basename(PROJECT_ROOT),
      created: state.created || new Date().toISOString(),
      current_phase: null,
      current_plan: 0,
      current_sprint: null,
      phases: [],
      velocity_history: [],
      executions: [],
      decisions: state.decisions || [],
      blockers: [],
      council_sessions: state.council_sessions || [],
      last_session: state.last_session || null,
      workstreams: state.workstreams || [],
      active_workstream: state.active_workstream || null,
    };
    writeState(preserved);
    return { updated: true, status: 'reset', preserved_decisions: preserved.decisions.length };
  }

  // --- promote-backlog <from> --to <target> ---
  // Promote a 999.x parking-lot phase to a real phase number.
  // Mutates state.phases[]; renames the on-disk directory if present.
  // Tracks issue #159 (M2.5 — 999.x parking-lot convention).
  if (sub === 'promote-backlog') {
    const from = subArgs[1];
    const flags = parseFlags(2);
    const to = flags.to;
    if (!from || !to) {
      throw new Error('Usage: state promote-backlog <999.x> --to <NN>');
    }
    if (!/^999\.\d+$/.test(from)) {
      throw new Error(`Source must be 999.x parking-lot number, got: ${from}`);
    }
    if (!/^\d+(\.\d+)?$/.test(to)) {
      throw new Error(`Target must be N or N.M (any non-negative integer; high numbers like 1001 are valid for hot-track phases), got: ${to}`);
    }
    const state = readState() || defaultState();
    if (!state.phases) state.phases = [];
    const idx = state.phases.findIndex(p => String(p.number) === from);
    if (idx < 0) {
      throw new Error(`Parking-lot phase ${from} not found in state.phases`);
    }
    if (state.phases.some(p => String(p.number) === to)) {
      throw new Error(`Target phase ${to} already exists`);
    }
    const phase = state.phases[idx];
    const oldNumber = phase.number;
    phase.number = to;
    phase.promoted_from = oldNumber;
    phase.promoted_at = new Date().toISOString();

    // Rename on-disk directory if present
    const phasesDir = path.join(PLANNING_DIR, 'phases');
    let renamed = false;
    if (fs.existsSync(phasesDir)) {
      for (const entry of fs.readdirSync(phasesDir)) {
        if (entry.startsWith(`${oldNumber}-`) || entry === oldNumber) {
          const oldPath = path.join(phasesDir, entry);
          const newPath = path.join(phasesDir, entry.replace(oldNumber, to));
          fs.renameSync(oldPath, newPath);
          renamed = true;
          break;
        }
      }
    }

    writeState(state);
    return { ok: true, promoted: { from: oldNumber, to }, renamed_disk: renamed };
  }

  // --- sync --from-disk ---
  // Parse ROADMAP.md + epics.md and upsert milestones/phases/epics into state.json.
  // Preserves existing statuses on matching phase names/numbers.
  // Tracks: issue #126 (state desync between planning artifacts and state.json).
  if (sub === 'sync') {
    const flags = parseFlags(1);
    if (!flags['from-disk'] && flags['from-disk'] !== '') {
      // Support both "--from-disk" (flag) and "--from-disk true"
      // parseFlags consumes the next token as value; accept empty-string value.
    }
    const roadmapPath = path.join(PLANNING_DIR, 'ROADMAP.md');
    const epicsPath = path.join(PLANNING_DIR, 'epics.md');
    const state = readState() || defaultState();

    const parsed = {
      milestones_found: 0,
      phases_found: 0,
      phases_upserted: 0,
      epics_found: 0,
      roadmap_exists: fs.existsSync(roadmapPath),
      epics_exists: fs.existsSync(epicsPath),
    };

    // Parse ROADMAP.md for phases. Supports two formats (issue #455):
    //   Format A — pipe tables:    | 01 | Phase Name | Goal text | ... |
    //   Format B — heading style:   ## Phase 01 — Name  /  ### Phase 01: Name
    // Milestone heading is also matched in any of: "## Milestone M1", "## Milestone v1.0 — Name",
    // "**Milestone: v1.0 — Name**".

    // Issue #651 — must be declared in outer scope. The prune step at end of
    // sync references seenNums even when roadmap_exists is false (no-op prune
    // path), causing 'seenNums is not defined' crash.
    const seenNums = new Set();
    if (parsed.roadmap_exists) {
      const roadmap = fs.readFileSync(roadmapPath, 'utf8');
      const milestoneMatches = [
        ...(roadmap.match(/^##\s+Milestone\s+M\d+/gim) || []),
        ...(roadmap.match(/^#{1,4}\s+Milestone\s*:?\s*[^\n]+$/gim) || []),
        ...(roadmap.match(/\*\*\s*Milestone\s*:?\s*[^\n*]+\*\*/gi) || []),
      ];
      parsed.milestones_found = new Set(milestoneMatches.map(s => s.trim().toLowerCase())).size;

      if (!state.phases) state.phases = [];

      // One-time normalization: drop null/garbage entries and merge duplicates
      // by id/number across the schema-drift boundary (#482-A). Sync is the
      // safe place to do this because we re-derive truth from disk anyway.
      const beforeClean = state.phases.length;
      const seenKeys = new Map();
      const cleaned = [];
      for (const ph of state.phases) {
        if (!ph) continue;
        const key = String(ph.id || ph.number || '').trim();
        if (!key || !/^\d+(\.\d+)?$/.test(key)) continue;
        if (seenKeys.has(key)) {
          // Merge into the kept entry: prefer non-null values from this duplicate.
          const keptIdx = seenKeys.get(key);
          for (const k of Object.keys(ph)) {
            if (cleaned[keptIdx][k] == null && ph[k] != null) cleaned[keptIdx][k] = ph[k];
          }
          continue;
        }
        seenKeys.set(key, cleaned.length);
        cleaned.push({ id: key, number: key, ...ph, id: key, number: key });
      }
      parsed.phases_normalized = beforeClean - cleaned.length;
      state.phases = cleaned;

      // Normalise any raw status string from ROADMAP into the canonical
      // vocabulary used by state.json: 'complete' | 'in_progress' | 'planned'.
      // Fix #897 — status was never read from ROADMAP, so every phase always
      // landed as 'planned' regardless of what the doc said.
      function normalizeStatus(raw) {
        if (!raw) return 'planned';
        // Match on the LEADING word, not exact string equality — ROADMAP.md
        // status lines legitimately carry trailing detail beyond the bare
        // status word (e.g. "Complete (verification: human_needed — live
        // deploy deferred)"), which an exact-match check silently drops to
        // 'planned' since the full string never equals 'complete'. A real
        // "Complete (...)" phase would then look un-synced forever.
        // Strip trailing detail (anything from the first paren/colon/em-dash
        // onward — "(verification: ...)", ": some note") before matching, then
        // collapse whitespace/underscores so "Complete (...)", "In Progress",
        // and "in_progress" all normalize the same way.
        const leading = String(raw).toLowerCase().replace(/[✅]/g, '')
          .split(/[(:—]/)[0].trim().replace(/[\s_]+/g, '');
        if (['complete','completed','shipped','verified','done'].includes(leading)) return 'complete';
        if (['executing','inprogress','active','started'].includes(leading)) return 'in_progress';
        return 'planned';
      }

      // Phase dirs are historically zero-padded ("03-evidence-ledger") while
      // ROADMAP tables and state.json use bare integers ("3"). Match on the
      // normalized number or every disk cross-check silently no-ops.
      const normPhaseNum = (k) => String(k ?? '').trim().replace(/^0+(\d)/, '$1');
      const findPhaseDirFiles = (phaseNum) => {
        const phasesRootDir = path.join(PLANNING_DIR, 'phases');
        if (!fs.existsSync(phasesRootDir)) return null;
        const want = normPhaseNum(phaseNum);
        const dirName = fs.readdirSync(phasesRootDir).find(d => {
          const m = d.match(/^(\d+(?:\.\d+)?)(?:-|$)/);
          return m && normPhaseNum(m[1]) === want;
        });
        if (!dirName) return null;
        const full = path.join(phasesRootDir, dirName);
        return { dirName, path: full, files: fs.readdirSync(full) };
      };

      const upsertPhase = (phaseNum, phaseName, phaseGoal, phaseStatus) => {
        if (!/^\d/.test(phaseNum)) return;
        if (phaseName.toLowerCase() === 'phase') return;
        if (seenNums.has(phaseNum)) return;
        seenNums.add(phaseNum);
        parsed.phases_found += 1;
        // Dedup against id, number, AND name — schema drift between writers means
        // older entries carry .id while newer carry .number. Checking only one
        // field caused duplicate entries (e.g. issue #482-A: phases 10-13 each
        // appeared twice after a re-sync because the .id-only entries were not
        // matched against the .number-only writer).
        const existingIdx = state.phases.findIndex(p =>
          String(p.number) === phaseNum ||
          String(p.id) === phaseNum ||
          p.name === phaseName
        );
        // Status precedence for advancement: complete > in_progress > planned.
        // A phase should never be downgraded by ROADMAP re-sync.
        const statusRank = { complete: 2, in_progress: 1, planned: 0 };
        let incomingStatus = normalizeStatus(phaseStatus);

        // --from-disk means FROM DISK. The ROADMAP status column is only one
        // signal, and in several roadmap shapes column 4 isn't a status column
        // at all (e.g. a "Blocking?" column), so ROADMAP-only sync leaves every
        // shipped phase sitting at `planned` forever and no amount of re-running
        // sync fixes it. Advance from the artifacts that actually exist on disk.
        // Status never downgrades (statusRank guard below), so this can only
        // correct an under-reported phase, never overwrite a truer one.
        try {
          const dirInfo = findPhaseDirFiles(phaseNum);
          if (dirInfo) {
            const verFile = dirInfo.files.find(f => /-?VERIFICATION\.md$/i.test(f));
            const verText = verFile ? fs.readFileSync(path.join(dirInfo.path, verFile), 'utf8') : '';
            // `passed` alone is not enough: a report with no `falsification:`
            // key was self-certified — the pass that tries to refute it never
            // ran. Treat that as in_progress, not complete.
            const verPassed = /^status:\s*passed/mi.test(verText);
            // A `passed` report with no `falsification:` key was self-certified
            // — the pass that tries to refute it never ran. Do NOT downgrade it
            // here: every VERIFICATION.md written before the falsification pass
            // existed lacks the key, and silently reverting those phases to
            // in_progress would undo real completion history. Surface it
            // instead, so the gap is visible without rewriting the past.
            if (verPassed && !/^falsification:\s*upheld/mi.test(verText)) {
              parsed.self_certified_phases = parsed.self_certified_phases || [];
              parsed.self_certified_phases.push(phaseNum);
            }
            const hasSummary = dirInfo.files.some(f => /SUMMARY\.md$/i.test(f));
            const hasSprint = dirInfo.files.some(f => /-SPRINT\.md$/i.test(f));
            let diskStatus = null;
            // A passed VERIFICATION.md is the strongest completion artifact
            // there is — do NOT also require a SUMMARY.md. Summaries stop
            // being written partway through many real projects, and gating on
            // them leaves verified phases stuck at in_progress forever.
            if (verPassed) diskStatus = 'complete';
            else if (hasSummary || hasSprint) diskStatus = 'in_progress';
            if (diskStatus && (statusRank[diskStatus] ?? 0) > (statusRank[incomingStatus] ?? 0)) {
              incomingStatus = diskStatus;
              parsed.disk_derived_status = parsed.disk_derived_status || [];
              parsed.disk_derived_status.push({ phase: phaseNum, status: diskStatus });
            }
          }
        } catch { /* best-effort — never fail sync over disk inspection */ }

        // Cross-check against VERIFICATION.md before trusting a 'complete' claim
        // from ROADMAP prose. A phase can be hand-edited to say "Complete" (or
        // "gaps_found → closed") without ever re-running the verifier — confirmed
        // live: an agent wrote that exact phrase into ROADMAP.md while the phase's
        // own VERIFICATION.md frontmatter still said `status: gaps_found`,
        // bypassing execute.md's uat_gate entirely via a direct file edit. Don't
        // let a prose claim override what the actual verification artifact says.
        if (incomingStatus === 'complete') {
          try {
            const phasesRootDir = path.join(PLANNING_DIR, 'phases');
            const phaseDirName = (findPhaseDirFiles(phaseNum) || {}).dirName || null;
            if (phaseDirName) {
              const verFile = fs.readdirSync(path.join(phasesRootDir, phaseDirName))
                .find(f => /-VERIFICATION\.md$/i.test(f));
              if (verFile) {
                const verText = fs.readFileSync(path.join(phasesRootDir, phaseDirName, verFile), 'utf8');
                const verStatusMatch = verText.match(/^status:\s*(\S+)/m);
                const verStatus = verStatusMatch ? verStatusMatch[1].trim() : null;
                if (verStatus && verStatus !== 'passed') {
                  incomingStatus = 'in_progress';
                  parsed.unverified_complete_claims = parsed.unverified_complete_claims || [];
                  parsed.unverified_complete_claims.push({
                    phase: phaseNum,
                    roadmap_claim: phaseStatus,
                    verification_file: verFile,
                    verification_status: verStatus,
                  });
                }
              }
            }
          } catch { /* best-effort cross-check — never fail sync over it */ }
        }

        if (existingIdx >= 0) {
          // Identity check BEFORE anything is carried over. Sync matched this
          // entry by NUMBER, but a number is a slot, not an identity. When a
          // roadmap is replaced, slot 3 can go from "Location Template" to
          // "Competitor Gap Analysis" — two unrelated pieces of work. Carrying
          // the old status across told a live project that competitor analysis
          // was "complete" when it had never been started, and only a manual
          // disk audit caught it.
          const priorName = String(state.phases[existingIdx].name || '').trim();
          const incomingName = String(phaseName || '').trim();
          const normName = (n) => n.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
          const identityChanged = priorName && incomingName
            && normName(priorName) !== normName(incomingName);
          if (identityChanged) {
            // Different work in the same slot. Drop the inherited status and
            // completion, and let the disk-derived pass below decide afresh.
            state.phases[existingIdx].status = 'planned';
            delete state.phases[existingIdx].completed;
            delete state.phases[existingIdx].started;
            parsed.identity_changed = parsed.identity_changed || [];
            parsed.identity_changed.push({
              phase: phaseNum,
              was: priorName,
              now: incomingName,
              carried_status_dropped: true,
            });
          }
          // Backfill both id and number so future readers using either schema find it.
          state.phases[existingIdx].number = state.phases[existingIdx].number || phaseNum;
          state.phases[existingIdx].id = state.phases[existingIdx].id || phaseNum;
          state.phases[existingIdx].name = phaseName;
          if (phaseGoal) state.phases[existingIdx].goal = phaseGoal;
          // Only advance status — never downgrade an existing phase's status via sync.
          const currentRank = statusRank[normalizeStatus(state.phases[existingIdx].status)] ?? 0;
          if ((statusRank[incomingStatus] ?? 0) > currentRank) {
            state.phases[existingIdx].status = incomingStatus;
          }
        } else {
          // Write both id and number on every new entry so dedup works regardless
          // of which schema future readers expect.
          state.phases.push({
            id: phaseNum,
            number: phaseNum,
            name: phaseName,
            goal: phaseGoal,
            status: incomingStatus,
            started: null,
            completed: null,
            plan_count: 0,
          });
          parsed.phases_upserted += 1;
        }
      };

      // Format A — pipe tables
      // Phase number: \d+ (not \d{1,3}) — high numbers like 1001 are valid for
      // hot-track parking-lot phases per parking-lot-convention.md.
      // The optional 4th capture group reads the status column when present
      // (fix #897 — status was silently dropped before).
      const rowRe = /^\|\s*(\d+(?:\.\d+)?)\s*\|\s*([^|]+?)\s*\|\s*([^|]*?)\s*\|(?:\s*([^|\n]*?)\s*\|)?/gm;
      let m;
      while ((m = rowRe.exec(roadmap)) !== null) {
        upsertPhase(m[1].trim(), m[2].trim(), m[3].trim(), m[4] || '');
      }

      // Format B — heading style
      const headRe = /^#{2,4}\s*Phase\s+(\d+(?:\.\d+)?)\s*[—\-:]\s*([^\n]+)$/gm;
      while ((m = headRe.exec(roadmap)) !== null) {
        const num = m[1].trim();
        const name = m[2].trim();
        const after = roadmap.slice(headRe.lastIndex).split(/\n/).slice(0, 8).join('\n');
        const goalMatch = after.match(/\*\*Goal:\*\*\s*([^\n]+)/i);
        // Fix #897 — read **Status:** from the post-heading block so heading-format
        // ROADMAPs propagate phase status into state just like pipe-table format.
        const statusMatch = after.match(/\*\*Status:\*\*\s*(.+)/i);
        const phaseStatus = statusMatch ? statusMatch[1].trim() : '';
        upsertPhase(num, name, goalMatch ? goalMatch[1].trim() : '', phaseStatus);
      }
    }

    // Parse epics.md for epics AND stories (issue #135 — story-level sync).
    // Supports both whole-document "## EPIC-NN" and sharded "epics/epic-N.md" layouts.
    parsed.stories_found = 0;
    parsed.stories_upserted = 0;
    parsed.stories_preserved_status = 0;
    parsed.sprints_found = 0;
    parsed.sprints_upserted = 0;

    if (parsed.epics_exists) {
      const epics = fs.readFileSync(epicsPath, 'utf8');
      parsed.epics_found = (epics.match(/^##\s+EPIC-\d+/gim) || epics.match(/^##\s+Epic\s+\d+/gim) || []).length;
      state.epics_count = parsed.epics_found;

      // Parse epic blocks and their stories.
      // Epic heading examples:  "## EPIC-01 — Setup"  or  "## Epic 1: User Auth"
      // Story heading examples: "### Story 01.03 — Schema"  or  "### Story 1.3: Foo"
      if (!state.epics) state.epics = [];
      const epicBlocks = epics.split(/^##\s+(?:EPIC-\d+|Epic\s+\d+)/im);
      const epicHeaders = epics.match(/^##\s+(?:EPIC-\d+|Epic\s+\d+)[^\n]*$/gim) || [];
      for (let i = 0; i < epicHeaders.length; i++) {
        const header = epicHeaders[i];
        const body = epicBlocks[i + 1] || '';
        const numMatch = header.match(/(\d+)/);
        if (!numMatch) continue;
        const epicNum = String(parseInt(numMatch[1], 10)); // strip leading zeros
        const nameMatch = header.match(/[—\-:]\s*(.+?)\s*$/);
        const epicName = nameMatch ? nameMatch[1].trim() : `Epic ${epicNum}`;

        // Upsert epic with story-level preservation.
        let epicEntry = state.epics.find(e => String(parseInt(e.number, 10)) === epicNum);
        if (!epicEntry) {
          epicEntry = { number: epicNum, name: epicName, status: 'planned', stories: [] };
          state.epics.push(epicEntry);
        } else {
          epicEntry.name = epicName;
          if (!epicEntry.stories) epicEntry.stories = [];
        }

        // Parse stories inside this epic's body.
        const storyRe = /^###\s+Story\s+(\d+[\.-]\d+)[^\n]*?(?:[—\-:]\s*(.+?))?$/gim;
        let sm;
        while ((sm = storyRe.exec(body)) !== null) {
          const storyId = sm[1].replace('-', '.');
          const storyName = (sm[2] || '').trim() || `Story ${storyId}`;
          parsed.stories_found += 1;
          const existing = epicEntry.stories.find(s => String(s.id) === storyId);
          if (existing) {
            // Preserve status — state is authoritative for "completed" / "in_progress"
            existing.name = storyName;
            parsed.stories_preserved_status += 1;
          } else {
            epicEntry.stories.push({
              id: storyId,
              name: storyName,
              status: 'pending',
            });
            parsed.stories_upserted += 1;
          }
        }
      }
    }

    // Walk phase sprint artifacts into state.sprints[] (issue #135).
    // Support both legacy `sprint-1.md` and workflow-generated
    // `01-01-SPRINT.md` / `1-1-SPRINT.md` names.
    const phasesDir = path.join(PLANNING_DIR, 'phases');
    const rcodePhasesDir = path.join(RCODE_DIR, 'phases');
    const sprintRoot = fs.existsSync(phasesDir) ? phasesDir : (fs.existsSync(rcodePhasesDir) ? rcodePhasesDir : null);
    if (sprintRoot) {
      if (!state.sprints) state.sprints = [];
      for (const phaseEntry of fs.readdirSync(sprintRoot)) {
        const phaseDir = path.join(sprintRoot, phaseEntry);
        if (!fs.statSync(phaseDir).isDirectory()) continue;
        const phaseNumMatch = phaseEntry.match(/^(\d+(?:\.\d+)?)/);
        const phaseNum = phaseNumMatch ? phaseNumMatch[1] : phaseEntry;
        for (const file of fs.readdirSync(phaseDir)) {
          const sprintMatch =
            file.match(/^sprint-(\d+)\.md$/i) ||
            file.match(/^(?:\d+(?:\.\d+)?[-_.])?(\d+)[-_.].*SPRINT\.md$/i);
          if (!sprintMatch) continue;
          const sprintNum = String(parseInt(sprintMatch[1], 10));
          const sprintKey = `${phaseNum}/${sprintNum}`;
          parsed.sprints_found += 1;
          const sprintPath = path.join(phaseDir, file);
          const sprintText = fs.readFileSync(sprintPath, 'utf8');
          const goalMatch = sprintText.match(/(?:^goal:\s*(.+)$|\*\*Sprint Goal:\*\*\s*(.+))/im);
          const goal = goalMatch ? (goalMatch[1] || goalMatch[2] || '').trim() : '';
          const existing = state.sprints.find(s => s.key === sprintKey);
          if (existing) {
            existing.phase = phaseNum;
            existing.number = sprintNum;
            if (goal) existing.goal = goal;
            existing.file = path.relative(PROJECT_ROOT, sprintPath);
          } else {
            state.sprints.push({
              key: sprintKey,
              phase: phaseNum,
              number: sprintNum,
              goal,
              status: 'planned',
              file: path.relative(PROJECT_ROOT, sprintPath),
            });
            parsed.sprints_upserted += 1;
          }
        }
      }
    }

    if (!parsed.roadmap_exists && !parsed.epics_exists && parsed.sprints_found === 0) {
      throw new Error(`state sync --from-disk: no ROADMAP.md, epics.md, or sprint files found`);
    }

    // Issue #478 — prune state phases not present in ROADMAP.
    // After upserting ROADMAP → state, seenNums holds every number the ROADMAP
    // parser found. Any state entry whose id/number is NOT in seenNums is stale
    // (e.g. from renumbering, manual edits, or partial removals). Prune them,
    // but only when we successfully parsed at least 1 phase from ROADMAP.
    parsed.phases_pruned = 0;
    if (parsed.roadmap_exists && seenNums.size > 0) {
      const before = state.phases.length;
      state.phases = state.phases.filter(p => {
        const key = String(p.id || p.number || '').trim();
        return !key || seenNums.has(key);
      });
      parsed.phases_pruned = before - state.phases.length;
    }

    // Issue #455 — surface silent no-op when ROADMAP exists but parser found nothing.
    const warnings = [];
    if (parsed.roadmap_exists && parsed.phases_found === 0) {
      warnings.push('ROADMAP.md exists but no phases parsed — check format (expected pipe-table rows or "## Phase NN — Name" headings).');
    }
    if (parsed.epics_exists && parsed.epics_found === 0) {
      warnings.push('epics.md exists but no epics parsed — check "## EPIC-NN" or "## Epic N" heading format.');
    }

    // #894 — Proactively sync state.milestone from ROADMAP on state sync.
    // After upserting phases from ROADMAP, also derive the active milestone from
    // the last top-level milestone heading and correct state.milestone if stale.
    if (parsed.roadmap_exists) {
      try {
        const rmSync = fs.readFileSync(roadmapPath, 'utf8');
        const syncMhRe = /^#{1,2}\s+(M\d+[^\n]*)/gm;
        let syncLastLabel = null, syncMhM;
        while ((syncMhM = syncMhRe.exec(rmSync)) !== null) {
          if (/^milestones?\s*$/i.test(syncMhM[1].trim())) continue;
          syncLastLabel = syncMhM[1].trim();
        }
        if (syncLastLabel && syncLastLabel !== (state.milestone || '')) {
          state.milestone = syncLastLabel;
          parsed.milestone_synced = syncLastLabel;
        }
      } catch (_) { /* ROADMAP unreadable at write time; leave milestone as-is */ }
    }

    writeState(state);
    return { ok: true, synced: true, ...parsed, ...(warnings.length ? { warnings } : {}) };
  }

  throw new Error(`Unknown state subcommand: ${sub}.\nCommon: read, set-phase, advance-plan, add-decision, decisions-global, add-blocker, sync, promote-backlog\nRun 'rcode-tools.cjs help' for the full list of state subcommands.`);
}

/**
 * cmdPhase — top-level phase operations.
 *
 * Subcommands:
 *   add <name>   Add an integer phase to end of current milestone.
 *                Computes next phase number from disk + ROADMAP + state.json,
 *                creates .planning/phases/{NN}-{slug}/, inserts a Goal/Status/
 *                Plans/Acceptance entry into ROADMAP.md before "## Backlog"
 *                (or at end if absent), and upserts state.phases[].
 *
 * Closes #460. Replaces the broken `phase add` invocation referenced by
 * .rcode/workflows/add-phase.md, which previously hit the dispatcher's
 * "Unknown subcommand: phase" path.
 */
function cmdPhase(subArgs) {
  const sub = subArgs[0];

  if (sub === 'add') {
    // Extract --decimal <parent> if present (closes #477 item C). The flag may
    // appear before or after the phase name; we splice it out before joining.
    const remaining = subArgs.slice(1);
    let decimalParent = null;
    const decimalIdx = remaining.findIndex(a => a === '--decimal');
    if (decimalIdx !== -1) {
      decimalParent = remaining[decimalIdx + 1];
      if (!decimalParent || decimalParent.startsWith('--')) {
        throw new Error('--decimal requires a parent phase number (e.g., --decimal 13)');
      }
      if (!/^\d+$/.test(decimalParent)) {
        throw new Error(`--decimal parent must be a positive integer, got: ${decimalParent}`);
      }
      remaining.splice(decimalIdx, 2);
    }

    // #583 --number N flag: explicit phase number override, bypasses auto-computation.
    let forcedNumber = null;
    const numberIdx = remaining.findIndex(a => a === '--number');
    if (numberIdx !== -1) {
      const nVal = remaining[numberIdx + 1];
      if (!nVal || nVal.startsWith('--') || !/^\d+$/.test(nVal)) {
        throw new Error('--number requires a positive integer (e.g., --number 22)');
      }
      forcedNumber = parseInt(nVal, 10);
      remaining.splice(numberIdx, 2);
    }

    const phaseName = remaining.join(' ').trim();
    if (!phaseName) throw new Error('phase add requires <name>');

    const slug = phaseName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
    if (!slug) {
      throw new Error('Phase name must contain at least one alphanumeric character');
    }

    const phasesDir = path.join(PLANNING_DIR, 'phases');
    const roadmapPath = path.join(PLANNING_DIR, 'ROADMAP.md');

    // State lives in .rcode/state.json — same path used by cmdState (line ~634)
    // and every other state-writing subcommand. Phase 6 dogfood surfaced this:
    // earlier drafts wrote to .planning/state.json, creating an orphan file
    // invisible to `state sync` / `state set-phase` / etc. Closes #462.
    const statePath = path.join(RCODE_DIR, 'state.json');
    let state;
    if (fs.existsSync(statePath)) {
      try {
        state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
      } catch (e) {
        throw new Error(`Invalid JSON in state.json: ${e.message}`);
      }
    } else {
      state = { phases: [], decisions: [], blockers: [] };
    }
    if (!state.phases) state.phases = [];

    let number;
    if (forcedNumber !== null) {
      // --number N: explicit override. Validate it doesn't already exist.
      number = String(forcedNumber);
      if (state.phases.some(p => String(p.number) === number)) {
        throw new Error(`Phase ${number} already exists in state.json (--number override)`);
      }
    } else if (decimalParent !== null) {
      // Verify parent exists somewhere (state, dir, or ROADMAP) before slotting under it.
      const parentNum = parseInt(decimalParent, 10);
      let parentExists = state.phases.some(p => parseInt(String(p.number), 10) === parentNum);
      if (!parentExists && fs.existsSync(phasesDir)) {
        parentExists = fs.readdirSync(phasesDir).some(e => {
          const m = e.match(/^(\d+)(?:[.-]|$)/);
          return m && parseInt(m[1], 10) === parentNum;
        });
      }
      if (!parentExists && fs.existsSync(roadmapPath)) {
        const text = fs.readFileSync(roadmapPath, 'utf8');
        const re = new RegExp(`(^|\\n)(?:##+\\s*Phase\\s+|\\|\\s*)${parentNum}\\b`);
        parentExists = re.test(text);
      }
      if (!parentExists) {
        throw new Error(`--decimal parent ${parentNum} not found (no state entry, directory, or ROADMAP row matches)`);
      }

      // Find max minor across phases dir, ROADMAP, and state for `<parent>.M`.
      let maxMinor = 0;
      if (fs.existsSync(phasesDir)) {
        for (const entry of fs.readdirSync(phasesDir)) {
          const m = entry.match(new RegExp(`^${parentNum}\\.(\\d+)`));
          if (m) maxMinor = Math.max(maxMinor, parseInt(m[1], 10));
        }
      }
      if (fs.existsSync(roadmapPath)) {
        const text = fs.readFileSync(roadmapPath, 'utf8');
        const pipeRe = new RegExp(`^\\|\\s*${parentNum}\\.(\\d+)\\s*\\|`, 'gm');
        let m;
        while ((m = pipeRe.exec(text)) !== null) {
          maxMinor = Math.max(maxMinor, parseInt(m[1], 10));
        }
        const headRe = new RegExp(`^#{2,4}\\s*Phase\\s+${parentNum}\\.(\\d+)\\b`, 'gm');
        while ((m = headRe.exec(text)) !== null) {
          maxMinor = Math.max(maxMinor, parseInt(m[1], 10));
        }
      }
      for (const p of state.phases) {
        const m = String(p.number || '').match(new RegExp(`^${parentNum}\\.(\\d+)$`));
        if (m) maxMinor = Math.max(maxMinor, parseInt(m[1], 10));
      }
      number = `${parentNum}.${maxMinor + 1}`;
    } else {
      let maxNum = 0;
      if (fs.existsSync(phasesDir)) {
        for (const entry of fs.readdirSync(phasesDir)) {
          const m = entry.match(/^(\d+)/);
          if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
        }
      }
      if (fs.existsSync(roadmapPath)) {
        const text = fs.readFileSync(roadmapPath, 'utf8');
        // Phase 14 / #476 — \d+ (not \d{1,3}). High numbers like 1001 are valid
        // for hot-track phases. The cap was silently dropping them from maxNum
        // computation, causing the next phase to collide with an existing one.
        const pipeRe = /^\|\s*(\d+)\s*\|/gm;
        let m;
        while ((m = pipeRe.exec(text)) !== null) {
          maxNum = Math.max(maxNum, parseInt(m[1], 10));
        }
        const headRe = /^#{2,4}\s*Phase\s+(\d+)\b/gm;
        while ((m = headRe.exec(text)) !== null) {
          maxNum = Math.max(maxNum, parseInt(m[1], 10));
        }
      }
      for (const p of state.phases) {
        const n = parseInt(String(p.number || ''), 10);
        if (!Number.isNaN(n)) maxNum = Math.max(maxNum, n);
      }

      const next = maxNum + 1;
      // No leading zeros — phases use plain integer identifiers (6, not 06).
      // Per Hanzla feedback: leading zeros add visual clutter without disambiguation
      // value at the scales we operate. Applies to phases, sprints, epics, stories,
      // tasks, decisions across all artifacts (dirs, ROADMAP, state.json, banners).

      // #583 / #944 sanity guard: prevent phantom phase numbers caused by stale
      // high-number entries in ROADMAP.md or phases/ (e.g. a prior phantom
      // "## Phase 1009" left in ROADMAP triggers the next add to produce 1010).
      //
      // The guard must NOT misfire on an INTENTIONAL high-base numbering scheme
      // (e.g. a milestone that deliberately numbers phases 1031, 1032, …). The
      // discriminant: is the high number an actual TRACKED phase in state.json,
      // or only a ROADMAP/dir entry that state has never seen?
      //   - next === maxTracked + 1  → contiguous with real tracked phases →
      //     intentional, allow regardless of absolute magnitude.
      //   - maxNum (overall) sits far ABOVE maxTracked → a non-tracked phantom
      //     is driving the number → suspect, abort.
      const trackedNums = state.phases
        .map(p => parseInt(String(p.number || ''), 10))
        .filter(n => !Number.isNaN(n) && n > 0);
      const trackedCount = trackedNums.length;
      const maxTracked = trackedNums.length ? Math.max(...trackedNums) : 0;
      if (maxNum > maxTracked && (maxNum - maxTracked) > 50) {
        throw new Error(
          `Computed phase number ${next} is driven by a non-tracked entry ` +
          `(highest in ROADMAP/phases = ${maxNum}, highest in state.json = ${maxTracked}). ` +
          `ROADMAP.md or the phases/ directory likely contains a stale high-number entry. ` +
          `Inspect with: node rcode-tools.cjs phases list\n` +
          `Then retry with an explicit number: rcode-tools.cjs phase add "${phaseName}" --number ${maxTracked + 1}`
        );
      }

      number = String(next);
    }

    if (state.phases.some(p => String(p.number) === number)) {
      throw new Error(`Phase ${number} already exists in state.json`);
    }

    const dirName = `${number}-${slug}`;
    const directory = path.join(phasesDir, dirName);
    if (fs.existsSync(directory)) {
      throw new Error(`Phase directory already exists: ${path.relative(PROJECT_ROOT, directory)}`);
    }
    fs.mkdirSync(directory, { recursive: true });

    const entry = `## Phase ${number} — ${phaseName}\n\n` +
      `**Goal:** _TBD — fill in via /rcode-discuss-phase ${number} or edit directly._\n\n` +
      `**Status:** Planned\n\n` +
      `**Plans:**\n- _TBD_\n\n` +
      `**Acceptance:** _TBD_\n\n---\n`;

    if (fs.existsSync(roadmapPath)) {
      let text = fs.readFileSync(roadmapPath, 'utf8');

      // #895 — Validate state.milestone against ROADMAP before inserting.
      // Find the last top-level milestone heading ("# M\d+" or "## M\d+") in
      // ROADMAP.md. That is the active milestone — use it as the insertion
      // target and correct state.milestone if it is stale.
      const milestoneHeadingRe = /^#{1,2}\s+(M\d+[^\n]*)/gm;
      let lastMilestoneLabel = null;
      let mh;
      while ((mh = milestoneHeadingRe.exec(text)) !== null) {
        // Skip the generic "## Milestones" index heading.
        if (/^milestones?\s*$/i.test(mh[1].trim())) continue;
        lastMilestoneLabel = mh[1].trim();
      }
      if (lastMilestoneLabel && lastMilestoneLabel !== (state.milestone || '')) {
        state.milestone = lastMilestoneLabel;
      }

      const backlogMatch = text.match(/^##\s+Backlog\b/m);
      if (backlogMatch) {
        const backlogIdx = backlogMatch.index;
        text = text.slice(0, backlogIdx) + entry + '\n' + text.slice(backlogIdx);
      } else {
        if (!text.endsWith('\n')) text += '\n';
        text += '\n' + entry;
      }
      fs.writeFileSync(roadmapPath, text);
    }

    state.phases.push({
      number,
      name: phaseName,
      slug,
      goal: '',
      status: 'planned',
      created: new Date().toISOString(),
      started: null,
      completed: null,
      plan_count: 0,
    });
    state.updated = new Date().toISOString();
    // Ensure the directory holding statePath (RCODE_DIR) exists.
    const stateDir = path.dirname(statePath);
    if (!fs.existsSync(stateDir)) {
      fs.mkdirSync(stateDir, { recursive: true });
    }
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2) + '\n');

    // #942 — surface the milestone close nudge from the CLI itself so it can't
    // be bypassed by adding phases outside the add-phase workflow.
    const { milestone_health, nudge } = milestoneCloseNudge();
    return {
      ok: true,
      phase_number: number,
      name: phaseName,
      slug,
      directory: path.relative(PROJECT_ROOT, directory),
      milestone_health,
      ...(nudge ? { nudge } : {}),
    };
  }

  // =====================================================================
  // phase complete <phase_number> — mark a phase complete and report the
  // next phase. Closes the workflow/CLI drift (#766): execute.md calls
  // `phase complete` but only set-status existed.
  // =====================================================================
  if (sub === 'complete') {
    const phaseRef = subArgs[1];
    if (!phaseRef) throw new Error('phase complete requires <phase_number>');
    const statePath = path.join(RCODE_DIR, 'state.json');
    if (!fs.existsSync(statePath)) {
      throw new Error(`state.json not found at ${statePath} — run 'rcode-tools state init' first`);
    }
    let state;
    try { state = JSON.parse(fs.readFileSync(statePath, 'utf8')); }
    catch (e) { throw new Error(`Invalid JSON in state.json: ${e.message}`); }
    if (!state.phases) state.phases = [];
    const idx = state.phases.findIndex(p =>
      String(p.number) === String(phaseRef) ||
      String(p.id) === String(phaseRef) ||
      p.name === phaseRef
    );
    if (idx === -1) {
      throw new Error(`Phase "${phaseRef}" not found in state.phases (looked up by number, id, and name)`);
    }
    const previous = state.phases[idx].status || null;

    // State-hygiene gate (#955): if an earlier-numbered phase is still stuck
    // 'executing' while this later phase gets marked complete, that's exactly
    // the drift that misorients resolveActivePhase() / the SessionStart greeter.
    // Warn rather than block — completing out of order is sometimes correct
    // (parallel workstreams), but it must never happen silently. (Ported from
    // the unused `state complete-phase` twin — this is the code path every
    // workflow actually calls.)
    const thisNum = parseInt(String(state.phases[idx].number || phaseRef), 10);
    const stalePhases = Number.isNaN(thisNum) ? [] : state.phases.filter((p) => {
      if (!p || p.status !== 'executing') return false;
      const n = parseInt(String(p.number ?? p.id), 10);
      return !Number.isNaN(n) && n < thisNum;
    });
    const warnings = [];
    if (stalePhases.length > 0) {
      const staleList = stalePhases.map((p) => p.number ?? p.id).join(', ');
      warnings.push(
        `Phase ${phaseRef} marked complete while earlier phase(s) ${staleList} are still 'executing'. ` +
        `Close out the stale phase(s) or confirm this is an intentional parallel workstream.`
      );
    }

    state.phases[idx].status = 'complete';
    state.phases[idx].status_updated = new Date().toISOString();
    state.phases[idx].completed_at = state.phases[idx].completed_at || new Date().toISOString().slice(0, 10);

    const num = parseInt(String(state.phases[idx].number || phaseRef), 10);
    const next = state.phases
      .filter(p => parseInt(String(p.number), 10) > num)
      .sort((a, b) => parseInt(String(a.number), 10) - parseInt(String(b.number), 10))[0] || null;

    fs.writeFileSync(statePath, JSON.stringify(state, null, 2) + '\n');

    // #943 — when no open phases remain, the milestone is effectively finished.
    // Surface the close/next guidance from this chokepoint so finishing the
    // last phase via execute/verify/dev-story doesn't strand the user (the
    // guidance previously only appeared in /rcode-status or progress insights).
    const doneStatuses = new Set(['complete', 'completed', 'verified', 'shipped']);
    const openRemaining = state.phases.filter(p => !doneStatuses.has(p.status)).length;
    let nudge = null;
    if (openRemaining === 0 && state.phases.length > 0) {
      nudge = 'All phases are complete — this milestone is finished. ' +
        'Run /rcode-complete-milestone to archive it, then /rcode-new-milestone to start the next.';
    }

    return {
      ok: true,
      phase: phaseRef,
      previous_status: previous,
      new_status: 'complete',
      next_phase: next ? next.number : null,
      next_phase_name: next ? (next.name || null) : null,
      is_last_phase: !next,
      open_phases_remaining: openRemaining,
      ...(nudge ? { nudge } : {}),
      warnings,
      has_warnings: warnings.length > 0,
    };
  }

  // =====================================================================
  // phase sync-sprints <phase_number> — register sprint records into
  // state.json by deriving them from the .planning/phases/<dir>/*-SPRINT.md
  // files (the source of truth). Closes #765: planner agents write SPRINT.md
  // files but do not always register sprint entries, leaving state.json an
  // incomplete mirror. This makes registration a deterministic CLI step.
  // =====================================================================
  if (sub === 'sync-sprints') {
    const phaseRef = subArgs[1];
    if (!phaseRef) throw new Error('phase sync-sprints requires <phase_number>');
    const statePath = path.join(RCODE_DIR, 'state.json');
    if (!fs.existsSync(statePath)) {
      throw new Error(`state.json not found at ${statePath} — run 'rcode-tools state init' first`);
    }
    let state;
    try { state = JSON.parse(fs.readFileSync(statePath, 'utf8')); }
    catch (e) { throw new Error(`Invalid JSON in state.json: ${e.message}`); }
    if (!state.phases) state.phases = [];
    const idx = state.phases.findIndex(p =>
      String(p.number) === String(phaseRef) ||
      String(p.id) === String(phaseRef) ||
      p.name === phaseRef
    );
    if (idx === -1) {
      throw new Error(`Phase "${phaseRef}" not found in state.phases`);
    }

    const phasesDir = path.join(PLANNING_DIR, 'phases');
    const intId = String(phaseRef).split('.')[0];
    let dirs;
    try { dirs = fs.readdirSync(phasesDir, { withFileTypes: true }).filter(d => d.isDirectory()); }
    catch { throw new Error(`No .planning/phases directory found`); }
    const dir = dirs.find(d => d.name.startsWith(intId + '-') ||
                               d.name.startsWith(intId.padStart(2, '0') + '-'));
    if (!dir) throw new Error(`No phase directory on disk for phase ${phaseRef}`);

    const files = fs.readdirSync(path.join(phasesDir, dir.name));
    const sprintFiles = files.filter(f => /-SPRINT\.md$/i.test(f)).sort();
    const sprints = sprintFiles.map(f => {
      const m   = f.match(/^(\d+)-(\d+)-SPRINT\.md$/i);
      const num = m ? parseInt(m[2], 10) : 0;
      const sid = m ? `${parseInt(m[1], 10)}.${num}` : f.replace(/-SPRINT\.md$/i, '');
      const text = fs.readFileSync(path.join(phasesDir, dir.name, f), 'utf8');
      const fmGoal = (text.match(/^goal:\s*(.+)$/m) || [])[1];
      let goal = fmGoal ? fmGoal.trim() : '';
      if (!goal) {
        const obj = (text.match(/<objective>\s*([\s\S]*?)<\/objective>/) || [])[1] || '';
        goal = (obj.trim().split('\n').map(s => s.trim()).filter(Boolean)[0] || '').slice(0, 160);
      }
      const stories = [];
      const taskRe = /<task\b([^>]*)>([\s\S]*?)<\/task>/g;
      let tm;
      while ((tm = taskRe.exec(text))) {
        const idM = tm[1].match(/id="([^"]+)"/);
        const tM  = tm[2].match(/<title>([\s\S]*?)<\/title>/);
        stories.push({ id: idM ? idM[1] : `${sid}.${stories.length + 1}`,
                       title: tM ? tM[1].trim() : `Task ${stories.length + 1}`,
                       status: 'planned' });
      }
      if (!stories.length) {
        // Legacy SPRINT.md: "### Story|Task <id> — <title>" headings.
        const headRe = /^#{2,4}\s+(?:Story|Task)\s+([^\s—–-]+)\s*[—–-]\s*(.+?)\s*$/gm;
        let hm;
        while ((hm = headRe.exec(text))) {
          stories.push({ id: hm[1].trim(), title: hm[2].trim(), status: 'planned' });
        }
      }
      const hasSummary = files.includes(f.replace(/-SPRINT\.md$/i, '-SUMMARY.md'));
      return { id: sid, number: num, goal: goal || `Sprint ${num}`,
               status: hasSummary ? 'complete' : 'planned', stories };
    });

    state.phases[idx].sprints = sprints;
    state.phases[idx].plan_count = sprints.length;
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2) + '\n');
    return {
      ok: true,
      phase: phaseRef,
      sprints_registered: sprints.length,
      stories_registered: sprints.reduce((a, s) => a + s.stories.length, 0),
    };
  }

  if (sub === 'set-status') {
    const phaseRef = subArgs[1];
    const newStatus = subArgs[2];
    if (!phaseRef) throw new Error('phase set-status requires <phase_number> <status>');
    if (!newStatus) throw new Error('phase set-status requires <status> (e.g., executed, complete, blocked)');
    const validStatuses = ['planned', 'in_progress', 'executed', 'complete', 'blocked'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Invalid status "${newStatus}". Valid: ${validStatuses.join(', ')}`);
    }

    const statePath = path.join(RCODE_DIR, 'state.json');
    if (!fs.existsSync(statePath)) {
      throw new Error(`state.json not found at ${statePath} — run 'rcode-tools state init' first`);
    }
    let state;
    try { state = JSON.parse(fs.readFileSync(statePath, 'utf8')); }
    catch (e) { throw new Error(`Invalid JSON in state.json: ${e.message}`); }
    if (!state.phases) state.phases = [];

    const phaseIdx = state.phases.findIndex(p =>
      String(p.number) === String(phaseRef) ||
      String(p.id) === String(phaseRef) ||
      p.name === phaseRef
    );
    if (phaseIdx === -1) {
      throw new Error(`Phase "${phaseRef}" not found in state.phases (looked up by number, id, and name)`);
    }
    const previous = state.phases[phaseIdx].status || null;
    state.phases[phaseIdx].status = newStatus;
    state.phases[phaseIdx].status_updated = new Date().toISOString();

    fs.writeFileSync(statePath, JSON.stringify(state, null, 2) + '\n');
    return { ok: true, phase: phaseRef, previous_status: previous, new_status: newStatus };
  }

  // =====================================================================
  // phase next-range [count] — return next N contiguous free phase numbers.
  // Closes #730. Enables bulk-scaffold and parallel planning workflows
  // to reserve a block of numbers atomically before creating directories.
  // =====================================================================
  if (sub === 'next-range') {
    const count = Math.max(1, parseInt(subArgs[1] || '1', 10));
    if (Number.isNaN(count) || count < 1 || count > 200) {
      throw new Error('phase next-range count must be a positive integer ≤ 200');
    }

    const phasesDir = path.join(PLANNING_DIR, 'phases');
    const roadmapPath = path.join(PLANNING_DIR, 'ROADMAP.md');
    const statePath = path.join(RCODE_DIR, 'state.json');

    let maxNum = 0;
    if (fs.existsSync(phasesDir)) {
      for (const entry of fs.readdirSync(phasesDir)) {
        const m = entry.match(/^(\d+)/);
        if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
      }
    }
    if (fs.existsSync(roadmapPath)) {
      const text = fs.readFileSync(roadmapPath, 'utf8');
      const pipeRe = /^\|\s*(\d+)\s*\|/gm;
      let m;
      while ((m = pipeRe.exec(text)) !== null) maxNum = Math.max(maxNum, parseInt(m[1], 10));
      const headRe = /^#{2,4}\s*Phase\s+(\d+)\b/gm;
      while ((m = headRe.exec(text)) !== null) maxNum = Math.max(maxNum, parseInt(m[1], 10));
    }
    if (fs.existsSync(statePath)) {
      try {
        const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
        for (const p of (state.phases || [])) {
          const n = parseInt(String(p.number || ''), 10);
          if (!Number.isNaN(n)) maxNum = Math.max(maxNum, n);
        }
      } catch {}
    }

    const first = maxNum + 1;
    const last  = maxNum + count;
    const range = [];
    for (let i = first; i <= last; i++) range.push(i);
    return { ok: true, first, last, count, range };
  }

  // =====================================================================
  // phase scaffold-milestone --names "n1|n2|n3" [--start N]
  // Closes #731. Bulk-creates phase folders for a milestone in one call.
  // Names are pipe-separated (| avoids shell quoting issues with commas).
  // --start N overrides the computed first number (defaults to next-range).
  // =====================================================================
  if (sub === 'scaffold-milestone') {
    const remaining = subArgs.slice(1);
    let rawNames = null;
    let startOverride = null;

    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i] === '--names' && remaining[i + 1]) {
        rawNames = remaining[++i];
      } else if (remaining[i] === '--start' && remaining[i + 1]) {
        startOverride = parseInt(remaining[++i], 10);
        if (Number.isNaN(startOverride)) throw new Error('--start requires an integer');
      }
    }
    if (!rawNames) throw new Error('phase scaffold-milestone requires --names "name1|name2|..."');

    const names = rawNames.split('|').map(n => n.trim()).filter(Boolean);
    if (!names.length) throw new Error('--names must contain at least one non-empty name');

    // Compute starting number via same logic as next-range / phase add
    const phasesDir = path.join(PLANNING_DIR, 'phases');
    const roadmapPath = path.join(PLANNING_DIR, 'ROADMAP.md');
    const statePath = path.join(RCODE_DIR, 'state.json');

    // #769 — the next free number is derived from phase DIRECTORIES only.
    // A directory is the physical "slot taken" signal. ROADMAP.md headings and
    // directory-less state.json entries represent phases that are *planned but
    // not yet scaffolded* — which is exactly what this command materialises —
    // so they must NOT push the start number forward. (The old code also read
    // the roadmap + state into maxNum, which made scaffold-milestone skip past
    // an already-written roadmap range, e.g. scaffolding 38-41 for a 34-37
    // milestone.)
    const dirNumbers = new Set();
    let maxNum = 0;
    if (fs.existsSync(phasesDir)) {
      for (const entry of fs.readdirSync(phasesDir)) {
        const m = entry.match(/^(\d+)/);
        if (m) {
          const n = parseInt(m[1], 10);
          dirNumbers.add(n);
          maxNum = Math.max(maxNum, n);
        }
      }
    }
    let state = { phases: [] };
    if (fs.existsSync(statePath)) {
      try { state = JSON.parse(fs.readFileSync(statePath, 'utf8')); } catch {}
    }
    if (!Array.isArray(state.phases)) state.phases = [];

    const firstNum = startOverride !== null ? startOverride : maxNum + 1;
    const created  = [];
    const roadmapSkipped = [];

    for (let i = 0; i < names.length; i++) {
      const phaseName = names[i];
      const number = String(firstNum + i);
      const slug = phaseName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
      if (!slug) {
        throw new Error(`Name at index ${i} ("${phaseName}") produces an empty slug`);
      }
      // #769 — a real collision is a state entry that ALSO has a directory on
      // disk (the phase is genuinely already scaffolded). A directory-less
      // state entry is a phantom — e.g. rcode-roadmapper synced the phase into
      // state.json but never created the folder — so reconcile it in place
      // instead of aborting.
      const existingIdx = state.phases.findIndex(p => String(p.number) === number);
      if (existingIdx !== -1) {
        if (dirNumbers.has(firstNum + i)) {
          throw new Error(`Phase ${number} already scaffolded (directory + state entry exist) — collision at index ${i}`);
        }
        state.phases.splice(existingIdx, 1);
      }

      const dirName  = `${number}-${slug}`;
      const directory = path.join(phasesDir, dirName);
      if (fs.existsSync(directory)) {
        throw new Error(`Directory already exists: ${path.relative(PROJECT_ROOT, directory)}`);
      }
      fs.mkdirSync(directory, { recursive: true });

      // Append ROADMAP entry — but skip if the roadmap already declares this
      // phase (#769: rcode-roadmapper writes `## Phase N` sections directly, so
      // appending a stub here produced a duplicate heading).
      if (fs.existsSync(roadmapPath)) {
        let text = fs.readFileSync(roadmapPath, 'utf8');
        const headingRe = new RegExp(`^#{2,4}\\s*Phase\\s+${number}\\b`, 'm');
        if (headingRe.test(text)) {
          roadmapSkipped.push(number);
        } else {
          const entry = `## Phase ${number} — ${phaseName}\n\n` +
            `**Goal:** _TBD — fill in via /rcode-discuss-phase ${number} or edit directly._\n\n` +
            `**Status:** Planned\n\n` +
            `**Plans:**\n- _TBD_\n\n` +
            `**Acceptance:** _TBD_\n\n---\n`;
          const backlogMatch = text.match(/^##\s+Backlog\b/m);
          if (backlogMatch) {
            text = text.slice(0, backlogMatch.index) + entry + '\n' + text.slice(backlogMatch.index);
          } else {
            if (!text.endsWith('\n')) text += '\n';
            text += '\n' + entry;
          }
          fs.writeFileSync(roadmapPath, text);
        }
      }

      state.phases.push({
        number, name: phaseName, slug,
        goal: '', status: 'planned',
        created: new Date().toISOString(),
        started: null, completed: null, plan_count: 0,
      });
      created.push({ number, name: phaseName, directory: path.relative(PROJECT_ROOT, directory) });
    }

    state.updated = new Date().toISOString();
    if (typeof state.schema_version !== 'number') state.schema_version = 1;
    const stateDir = path.dirname(statePath);
    if (!fs.existsSync(stateDir)) fs.mkdirSync(stateDir, { recursive: true });
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2) + '\n');

    // #942 — same milestone close nudge for the bulk-draft path.
    const bulkHealth = milestoneCloseNudge();
    return {
      ok: true, count: created.length, phases: created, roadmap_skipped: roadmapSkipped,
      milestone_health: bulkHealth.milestone_health,
      ...(bulkHealth.nudge ? { nudge: bulkHealth.nudge } : {}),
    };
  }

  // =====================================================================
  // phase scaffold-all — materialise folders for every phase in ROADMAP.md
  // that lacks a directory under .planning/phases/.
  // Closes #731. No --names arg required — reads the ROADMAP table directly.
  // Only creates directories; does NOT create .md files inside them.
  // =====================================================================
  // phase rename-dir <N> — align a phase directory's slug with its ROADMAP name.
  // Dry-run by default: renaming a directory moves artifacts and, without git mv,
  // detaches their history. There was no mechanism for this at all, so a roadmap
  // rewrite left every directory carrying the name of whatever it used to be.
  if (sub === 'rename-dir') {
    // cmdPhase has no shared flag parser (parseFlags is local to cmdState), so
    // read the two flags this needs directly.
    const argvIdx = subArgs.findIndex((a, i) => i > 0 && !String(a).startsWith('--'));
    const phaseFlagIdx = subArgs.indexOf('--phase');
    const target = argvIdx > 0 ? subArgs[argvIdx]
      : (phaseFlagIdx !== -1 ? subArgs[phaseFlagIdx + 1] : null);
    if (!target) throw new Error('phase rename-dir requires a phase number');
    const apply = subArgs.includes('--apply');

    const found = cmdFindPhase([String(target)]);
    if (!found.exists) throw new Error(`No phase directory on disk for phase ${target}`);

    const roadmapLib = require(path.join(__dirname, 'lib', 'roadmap.cjs'));
    const rp = roadmapLib.dispatch(PROJECT_ROOT, ['get-phase', String(target)]);
    if (!rp || !rp.found || !rp.name) {
      throw new Error(`Phase ${target} not found in ROADMAP.md — nothing to rename toward`);
    }

    const slugify = (t) => String(t).toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').replace(/-+/g, '-');
    const newSlug = slugify(rp.name);
    const phasesDir = path.join(PLANNING_DIR, 'phases');
    const oldDirName = path.basename(found.dir);
    const newDirName = `${target}-${newSlug}`;

    if (oldDirName === newDirName) {
      return { ok: true, renamed: false, reason: 'directory already matches the roadmap name', dir: found.dir };
    }
    const newPath = path.join(phasesDir, newDirName);
    if (fs.existsSync(newPath)) {
      throw new Error(`Target directory already exists: ${newDirName}. Resolve by hand — two phase dirs for one number is worse than a stale name.`);
    }

    if (!apply) {
      return {
        ok: true,
        renamed: false,
        dry_run: true,
        from: oldDirName,
        to: newDirName,
        note: 'Dry run. Re-run with --apply to rename. Check first that the artifacts in this directory belong to the phase the roadmap now describes — if the phase was REPLACED rather than renamed, renaming hides that instead of fixing it.',
      };
    }

    // Prefer `git mv` so the artifacts keep their history.
    const oldPath = path.join(phasesDir, oldDirName);
    let method = 'fs';
    const { spawnSync } = require('child_process');
    const gitMv = spawnSync('git', ['mv', oldPath, newPath], { cwd: PROJECT_ROOT, encoding: 'utf8' });
    if (gitMv.status === 0) { method = 'git mv'; }
    else { fs.renameSync(oldPath, newPath); }

    return {
      ok: true, renamed: true, method,
      from: oldDirName, to: newDirName,
      warning: 'Any file referencing the old path (SPRINT frontmatter, SUMMARY links, notes) still points at it. Grep for the old slug.',
    };
  }

  if (sub === 'scaffold-all') {
    const roadmapPath = path.join(PLANNING_DIR, 'ROADMAP.md');
    const phasesDir   = path.join(PLANNING_DIR, 'phases');

    if (!fs.existsSync(roadmapPath)) {
      throw new Error(`No ROADMAP.md found at ${roadmapPath} — run /rcode-init first`);
    }

    const roadmap = fs.readFileSync(roadmapPath, 'utf8');

    // Collect (number, name) pairs from pipe-table rows: | N | Phase Name | ...
    // Also pick up ## Phase N — Name headings as a fallback.
    const phases = [];
    const seen = new Set();

    // Table rows: | 8 | Feature X | ...
    const tableRe = /^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|/gm;
    let m;
    while ((m = tableRe.exec(roadmap)) !== null) {
      const num = m[1];
      const name = m[2].trim();
      // Skip header rows (e.g. "Phase" as the number column)
      if (!seen.has(num) && /^\d+$/.test(num)) {
        seen.add(num);
        phases.push({ num: num.padStart(2, '0'), rawNum: num, name });
      }
    }

    // Heading rows: ## Phase 8 — Feature X
    const headRe = /^#{2,4}\s*Phase\s+(\d+)\s*[—–-]\s*(.+?)\s*$/gm;
    while ((m = headRe.exec(roadmap)) !== null) {
      const num = m[1];
      const name = m[2].trim();
      if (!seen.has(num)) {
        seen.add(num);
        phases.push({ num: num.padStart(2, '0'), rawNum: num, name });
      }
    }

    if (phases.length === 0) {
      return { ok: true, message: 'No phases found in ROADMAP.md — nothing to scaffold', created: [], existed: [] };
    }

    const created = [];
    const existed = [];

    for (const p of phases) {
      const slug = p.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
      if (!slug) continue; // skip rows with no usable name (e.g. header rows)

      const dirName = `${p.num}-${slug}`;
      const dirPath = path.join(phasesDir, dirName);

      if (fs.existsSync(dirPath)) {
        existed.push(dirPath);
        console.log(`Exists:  ${dirPath}`);
      } else {
        fs.mkdirSync(dirPath, { recursive: true });
        created.push(dirPath);
        console.log(`Created: ${dirPath}`);
      }
    }

    return { ok: true, created: created.length, existed: existed.length, dirs: { created, existed } };
  }

  throw new Error(`Unknown phase subcommand: ${sub || '(none)'}. Valid: add, complete, sync-sprints, set-status, next-range, scaffold-milestone, scaffold-all`);
}

/**
 * cmdCommit — atomic git commit with conventional-commits validation.
 *
 * Closes #465 (the highest-impact missing subcommand from the Phase 9
 * dogfood audit). Used by execute-sprint, map-codebase, and
 * new-project-roadmap workflows.
 *
 * Signature:
 *   rcode-tools.cjs commit "<message>" [--files <path1> <path2> ...]
 *
 * Validates:
 * - conventional-commits format (type(scope): subject)
 * - non-empty subject
 * - rejects AI-attribution lines (Co-Authored-By: Claude, etc.)
 * - rejects --no-verify flag explicitly
 *
 * Does NOT push (per project rule: never push without explicit human approval).
 */
function cmdCommit(argv) {
  // argv is the raw args array from process.argv after 'commit'.
  // First argument = the entire commit message (preserved with quotes by the shell).
  // Remaining args parsed as flags: --files <paths...>, --no-verify (rejected).
  const args = Array.isArray(argv) ? argv : [];

  // --no-verify is only a flag when it's a standalone arg, not when it appears
  // inside the message body (e.g., a commit message that documents that
  // --no-verify is rejected). Scan only args AFTER the first (= message).
  const message = args[0] ? String(args[0]) : '';
  const flagArgs = args.slice(1);
  const files = [];

  for (let i = 0; i < flagArgs.length; i++) {
    const t = flagArgs[i];
    if (t === '--no-verify') {
      throw new Error('rcode-tools commit does not bypass hooks. Fix the underlying issue, then re-commit.');
    }
    if (t === '--files') {
      // Everything remaining is a file path
      while (++i < flagArgs.length) files.push(flagArgs[i]);
      break;
    }
  }

  if (!message || !message.trim()) {
    throw new Error('commit requires a message: rcode-tools.cjs commit "type(scope): subject"');
  }

  // AI attribution rejection (project rule)
  const aiPatterns = [
    /co-authored-by:\s*claude/i,
    /generated with \[?claude/i,
    /🤖\s*generated/i,
    /co-authored-by:\s*ai/i,
  ];
  for (const re of aiPatterns) {
    if (re.test(message)) {
      throw new Error('AI attribution forbidden in commit messages (project rule). Remove "Co-Authored-By: Claude" / "Generated with Claude Code" / etc.');
    }
  }

  // Conventional-commits validation: type(scope): subject
  // Types per .github/workflows/semantic.yaml: feat, fix, docs, style, refactor, test, chore, perf, revert
  // Plus our extensions: plan, audit (used during this session)
  const subjectLine = message.split('\n')[0];
  const ccRe = /^(feat|fix|docs|style|refactor|test|chore|perf|revert|plan|audit)(\([^)]+\))?:\s+\S/;
  if (!ccRe.test(subjectLine)) {
    throw new Error(
      `Subject must follow conventional commits: type(scope): subject. Got: "${subjectLine.slice(0, 80)}".\n` +
      `Valid types: feat, fix, docs, style, refactor, test, chore, perf, revert, plan, audit.`
    );
  }
  if (subjectLine.length > 100) {
    throw new Error(`Subject too long (${subjectLine.length} chars > 100). Move detail to body.`);
  }

  // Stage files if --files provided; otherwise commit whatever is staged.
  const { execSync, execFileSync } = require('child_process');
  if (files.length > 0) {
    // Validate each path exists before staging
    for (const f of files) {
      if (!fs.existsSync(path.join(PROJECT_ROOT, f)) && !fs.existsSync(f)) {
        throw new Error(`File not found: ${f}`);
      }
    }
    // git add may exit 0 with a warning (not error) for gitignored files on some
    // git versions — file never gets staged but execSync doesn't throw. Capture
    // stderr to detect the gitignore warning explicitly (#566).
    let gitAddStderr = '';
    try {
      // execFileSync argument array: filenames pass as literal argv entries — no
      // shell, so a filename with ; $() backticks or spaces cannot inject (#754).
      execFileSync('git', ['add', ...files], { cwd: PROJECT_ROOT, stdio: 'pipe' });
    } catch (e) {
      gitAddStderr = (e.stderr ? e.stderr.toString() : '') + (e.stdout ? e.stdout.toString() : '');
      if (gitAddStderr.includes('ignored by one of your .gitignore') || gitAddStderr.includes('use -f if')) {
        throw new Error(
          `Cannot stage files — one or more paths are gitignored:\n${gitAddStderr.trim()}\n\n` +
          `Fix: remove the .gitignore entry for the planning directory, or run:\n` +
          `  node rcode-tools.cjs gitignore status`
        );
      }
      throw e; // re-throw any other git error
    }

    // #566 extra guard: verify all --files paths actually appear in the staged index.
    // git add on a gitignored file may silently succeed (exit 0) but not stage the
    // file, causing a later commit to include unrelated already-staged changes.
    // Exception: a tracked file that is unchanged won't appear in the staged diff —
    // that is OK (e.g. STATE.md listed in worktree mode but not modified). Only
    // error for files that are both not-staged AND not tracked (gitignored case).
    const stagedAfterAdd = execSync('git diff --cached --name-only', { cwd: PROJECT_ROOT, encoding: 'utf8' })
      .trim().split('\n').filter(Boolean);
    const notStaged = files.filter(f => {
      const norm = f.replace(/^\.\//, '');
      if (stagedAfterAdd.some(s => s === norm || s.endsWith('/' + norm) || norm.endsWith(s))) return false;
      // Not in staged diff — check if it's tracked (unchanged) vs untracked/gitignored
      try {
        execFileSync('git', ['ls-files', '--error-unmatch', f], { cwd: PROJECT_ROOT, stdio: 'pipe' });
        return false; // tracked and unchanged — that's fine
      } catch {
        return true; // not tracked — likely gitignored
      }
    });
    if (notStaged.length > 0) {
      throw new Error(
        `The following files were not staged after git add — likely gitignored:\n` +
        notStaged.map(f => `  ${f}`).join('\n') + '\n\n' +
        `Refusing to commit unrelated staged changes. Fix .gitignore or use git add -f.`
      );
    }
  }

  // Verify there's something to commit
  const status = execSync('git diff --cached --name-only', { cwd: PROJECT_ROOT, encoding: 'utf8' }).trim();
  if (!status) {
    throw new Error('Nothing staged to commit. Use --files <path> or stage with git add first.');
  }

  // Use HEREDOC-style approach: write message to temp file, commit -F
  const tmpMsgPath = path.join(require('os').tmpdir(), `rcode-commit-msg-${Date.now()}.txt`);
  fs.writeFileSync(tmpMsgPath, message);
  try {
    // execFileSync — no shell, so tmpMsgPath with special chars cannot inject (#754).
    execFileSync('git', ['commit', '-F', tmpMsgPath], { cwd: PROJECT_ROOT, stdio: 'pipe' });
  } finally {
    try { fs.unlinkSync(tmpMsgPath); } catch {}
  }

  // Capture the new HEAD SHA for return value
  const sha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: PROJECT_ROOT, encoding: 'utf8' }).trim();
  const filesChanged = execFileSync('git', ['show', '--stat', '--format=', sha], { cwd: PROJECT_ROOT, encoding: 'utf8' })
    .trim().split('\n').filter(Boolean);

  return {
    ok: true,
    sha: sha.slice(0, 7),
    full_sha: sha,
    subject: subjectLine,
    files_changed: filesChanged.length > 0 ? filesChanged.length - 1 : 0,
  };
}

/**
 * cmdGenerateClaudeMd — Phase 11 / #467 / closes part of #465. Phase 42 / #946.
 *
 * Bootstrap project agent-rules scaffolds. Writes the same rule set to both
 * CLAUDE.md (Claude Code, Grok) and AGENTS.md (the cross-tool open standard read
 * by Codex, Cursor, Windsurf, Antigravity, Gemini) so the rcode Command Routing
 * rule reaches every supported agent — not just Claude. Used by
 * new-project-roadmap.md. Refuses to overwrite an existing CLAUDE.md unless
 * --force is set; AGENTS.md is written when absent (or with --force) so an
 * install-managed roster section is never clobbered.
 */
function cmdGenerateClaudeMd(rawArgs) {
  const args = (rawArgs || '').split(/\s+/).filter(Boolean);
  const force = args.includes('--force');
  const claudeMdPath = path.join(PROJECT_ROOT, 'CLAUDE.md');
  const agentsMdPath = path.join(PROJECT_ROOT, 'AGENTS.md');
  const claudeExisted = fs.existsSync(claudeMdPath);
  const agentsExisted = fs.existsSync(agentsMdPath);

  if (claudeExisted && agentsExisted && !force) {
    throw new Error(`CLAUDE.md and AGENTS.md already exist at ${PROJECT_ROOT}. Use --force to overwrite.`);
  }

  // Resolve project name from package.json or directory.
  let projectName = path.basename(PROJECT_ROOT);
  const pkgPath = path.join(PROJECT_ROOT, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg.name) projectName = pkg.name;
    } catch { /* keep dir name */ }
  }

  const today = new Date().toISOString().slice(0, 10);
  const content = `# ${projectName} — Project Rules for AI Agents

This file is loaded by Claude Code, Codex, and compatible AI coding tools at the start of every session. Rules below are NON-NEGOTIABLE.

> Generated by \`rcode-tools generate-claude-md\` on ${today}. Edit freely after generation.

---

## Commit Rules

- Follow [Conventional Commits](https://www.conventionalcommits.org/): \`type(scope): subject\`
- Types allowed: \`feat\`, \`fix\`, \`docs\`, \`style\`, \`refactor\`, \`test\`, \`chore\`, \`perf\`, \`revert\`, \`plan\`, \`audit\`
- Subject: lowercase first letter, imperative mood, no trailing period, ≤ 72 chars
- **NEVER add AI attribution** to commit messages — no "Generated with Claude Code", no "Co-Authored-By: Claude"
- **NEVER use \`--no-verify\`** to bypass hooks. If hooks fail, fix the underlying issue.
- **ALWAYS stage specific files** with \`git add <files>\` — never blanket \`git add -A\` without reading the diff first

---

## Push Rules

- **NEVER \`git push\`** without explicit human approval on that specific push
- **NEVER \`git push --force\`** under any circumstances without operator typing the command themselves
- Every push requires fresh approval — earlier session approvals do not carry forward

---

## File Modification Rules

- **Maximum file size: ~1000 lines** — refactor before exceeding
- **Refactor incrementally** — never rewrite from scratch
- **Preserve existing patterns** — don't introduce new conventions without documented justification
- **Verify imports exist** before referencing them
- **Never theoretical suggestions** — grep/read first, plan second

---

## Scope Discipline

- Do EXACTLY what was asked — nothing more
- No "while I'm here" improvements
- No speculative abstractions
- No new files unless necessary
- **No freehand status/handoff docs** (\`HANDOFF.md\`, \`AGENT_X_DONE.md\`, anything at the project root summarizing "what I did"). That record is \`<N>-SUMMARY.md\` under \`.planning/phases/\` — even mid-task or in a parallel multi-agent run, write there, not a new root-level file.

---

## Phase Workflow Rules (#475 — non-negotiable)

When creating, planning, or modifying a phase, you MUST go through the rcode toolchain. Direct file writes to \`.planning/phases/\` produce planning artifacts that are invisible to \`/rcode-status\`, \`/rcode-execute\`, \`/rcode-progress\`, and \`roadmap list-phases\`.

- **Creating a new phase** → run \`/rcode-add-phase\` (or \`node .rcode/bin/rcode-tools.cjs phase add "<name>"\`). Do NOT \`mkdir .planning/phases/NN-...\` directly.
- **Writing SPRINT.md / PLAN.md** → run \`/rcode-plan <N>\`. Spawns \`rcode-planner\` + \`rcode-sprint-checker\`. Do NOT \`Write\` SPRINT.md files directly.
- **Discussing phase scope** → run \`/rcode-discuss-phase <N>\` for medium-risk phases. Writes \`<N>-CONTEXT.md\` with locked decisions.
- **Use canonical artifact names**: \`<N>-CONTEXT.md\`, \`<N>-RESEARCH.md\`, \`<N>-PLAN.md\` or \`<N>-NN-SPRINT.md\`, \`<N>-VERIFICATION.md\`, \`<N>-SUMMARY.md\`. Do NOT invent \`SCOPE.md\` / \`REVIEW.md\` / \`EDGE-CASES.md\` as phase artifacts — those belong elsewhere or as agent outputs.
- **Phase numbering** — sequential integers (\`/rcode-add-phase\`) for new phases; decimal sub-phases (\`100.1\`, \`100.2\` via \`/rcode-insert-phase\`) for hot-fixes branched from a parent. **Do NOT use 1000+ as a hot-track convention** — see [\`docs/phase-numbering.md\`](docs/phase-numbering.md) for the four supported options and when to use each.

**Why this is enforced**: every direct \`Write\` to \`.planning/phases/**/SPRINT.md\` without registration is a silent state divergence. Future \`/rcode-status\` reports under-count work. \`/rcode-execute\` can't find the plan. \`/rcode-progress\` shows wrong percentages.

If you have a real reason to bypass (e.g. retroactively documenting a phase that already shipped), put \`<!-- rcode-bypass: <one-line reason> -->\` at the top of the file so it's auditable later. **This rule is currently convention, not mechanically enforced** — no hook blocks an unregistered direct write today, so following it is on you (and any agent reading this), not a safety net catching you if you don't.

---

## Communication

- Report progress honestly — do not claim work is done if it isn't
- Flag blockers immediately
- When unsure, ask — do not guess on destructive operations

---

## rcode Command Routing

Before handling planning, exploration, auditing, refactoring, or multi-step build work ad-hoc, check whether a matching rcode command exists first.

**How to check:** read \`.rcode/workflows/do.md\` (installed by rcode) for the intent → command routing table — it is the single source of truth. Common cases: planning a phase → \`/rcode-plan\`, adding a phase → \`/rcode-add-phase\`, exploring/brainstorming → \`/rcode-brainstorm\`, auditing → \`/rcode-audit\`, executing a sprint → \`/rcode-execute\`, mapping the codebase → \`/rcode-map-codebase\`. Always consult \`do.md\` — never infer from memory alone, as the table changes with the release.

**Why:** rcode commands record outcomes in \`.rcode/state.json\` and \`.planning/\`. Work done ad-hoc creates silent state divergence. If you must proceed ad-hoc, run \`/rcode-memory-update\` afterward to keep long-term memory consistent.

---

**This file is part of the project. Treat it as load-bearing.**
`;

  // Each file's own existence gates only its own write — a project with an
  // existing CLAUDE.md must still get a missing AGENTS.md backfilled, and
  // vice versa (#1025).
  const wroteClaude = !claudeExisted || force;
  if (wroteClaude) {
    fs.writeFileSync(claudeMdPath, content);
  }

  // Mirror the same rules to AGENTS.md (the cross-tool standard Codex, Cursor,
  // Windsurf, Antigravity, and Gemini read). Skip when it already exists without
  // --force so an install-appended "## rcode Agents (installed)" roster survives.
  const wroteAgents = !agentsExisted || force;
  if (wroteAgents) {
    fs.writeFileSync(agentsMdPath, content);
  }

  const writtenPaths = [];
  if (wroteClaude) writtenPaths.push(path.relative(PROJECT_ROOT, claudeMdPath));
  if (wroteAgents) writtenPaths.push(path.relative(PROJECT_ROOT, agentsMdPath));

  return {
    ok: true,
    path: path.relative(PROJECT_ROOT, claudeMdPath),
    paths: writtenPaths,
    project_name: projectName,
    overwritten: force && (claudeExisted || agentsExisted),
    claude_md_skipped: !wroteClaude,
    agents_md_skipped: !wroteAgents,
  };
}

/**
 * cmdCheckImplementationReadiness — Phase 11 / #467.
 *
 * Returns { ready, blockers } indicating whether a phase is ready to execute.
 * Used by check-implementation-readiness.md workflow.
 */
function cmdCheckImplementationReadiness(rawArgs) {
  const args = (rawArgs || '').split(/\s+/).filter(Boolean);
  let phaseNum = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--phase') {
      phaseNum = args[i + 1];
      break;
    }
  }

  const blockers = [];

  // Check 1 — .planning/ exists
  if (!fs.existsSync(PLANNING_DIR)) {
    blockers.push({ severity: 'major', issue: '.planning/ directory missing — run /rcode-new-project first' });
  }

  // Check 2 — ROADMAP exists
  const roadmapPath = path.join(PLANNING_DIR, 'ROADMAP.md');
  if (!fs.existsSync(roadmapPath)) {
    blockers.push({ severity: 'major', issue: '.planning/ROADMAP.md missing — phase planning requires a roadmap' });
  }

  // Check 3 — phase exists in ROADMAP if phaseNum given
  if (phaseNum && fs.existsSync(roadmapPath)) {
    try {
      const roadmap = require(path.join(__dirname, 'lib', 'roadmap.cjs'));
      const r = roadmap.dispatch(PROJECT_ROOT, ['get-phase', String(phaseNum)]);
      if (!r || !r.found) {
        blockers.push({ severity: 'major', issue: `phase ${phaseNum} not found in ROADMAP.md` });
      }
    } catch (e) {
      blockers.push({ severity: 'minor', issue: `roadmap parser threw: ${e.message}` });
    }
  }

  // Check 4 — no blocking anti-patterns flagged
  if (phaseNum) {
    const phasesDir = path.join(PLANNING_DIR, 'phases');
    if (fs.existsSync(phasesDir)) {
      for (const entry of fs.readdirSync(phasesDir)) {
        if (entry === String(phaseNum) || entry.startsWith(`${phaseNum}-`)) {
          const continueHere = path.join(phasesDir, entry, '.continue-here.md');
          if (fs.existsSync(continueHere)) {
            const content = fs.readFileSync(continueHere, 'utf8');
            if (/severity:\s*blocking/i.test(content)) {
              blockers.push({ severity: 'major', issue: `phase ${phaseNum} has unresolved blocking anti-pattern in .continue-here.md` });
            }
          }
          break;
        }
      }
    }
  }

  return {
    ok: true,
    ready: blockers.filter(b => b.severity === 'major').length === 0,
    phase: phaseNum,
    blockers,
  };
}

/**
 * cmdCommitToSubrepo — Phase 11 / #467.
 *
 * Atomic commit within a git subrepo. Reuses cmdCommit's validation but
 * runs git within the subrepo's directory.
 */
function cmdCommitToSubrepo(argv) {
  const args = Array.isArray(argv) ? argv : [];
  let subrepo = null;
  const passthrough = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--subrepo') {
      subrepo = args[i + 1];
      i++;
      continue;
    }
    passthrough.push(args[i]);
  }

  if (!subrepo) {
    throw new Error('commit-to-subrepo requires --subrepo <path>');
  }

  const subrepoPath = path.isAbsolute(subrepo) ? subrepo : path.join(PROJECT_ROOT, subrepo);
  if (!fs.existsSync(subrepoPath)) {
    throw new Error(`Subrepo not found: ${subrepo}`);
  }
  if (!fs.existsSync(path.join(subrepoPath, '.git'))) {
    throw new Error(`Not a git repository: ${subrepo} (no .git directory)`);
  }

  // Reuse cmdCommit validation by overriding PROJECT_ROOT temporarily via env.
  // Cleaner approach: run git commands directly with cwd: subrepoPath.
  const message = passthrough[0];
  if (!message || !message.trim()) {
    throw new Error('commit-to-subrepo requires a message: rcode-tools.cjs commit-to-subrepo --subrepo <path> "<message>"');
  }

  // AI attribution + conventional-commits validation (same rules as cmdCommit).
  const aiPatterns = [/co-authored-by:\s*claude/i, /generated with \[?claude/i, /🤖\s*generated/i, /co-authored-by:\s*ai/i];
  for (const re of aiPatterns) {
    if (re.test(message)) {
      throw new Error('AI attribution forbidden in commit messages (project rule).');
    }
  }
  const subjectLine = message.split('\n')[0];
  const ccRe = /^(feat|fix|docs|style|refactor|test|chore|perf|revert|plan|audit)(\([^)]+\))?:\s+\S/;
  if (!ccRe.test(subjectLine)) {
    throw new Error(`Subject must follow conventional commits: type(scope): subject. Got: "${subjectLine.slice(0, 80)}".`);
  }
  if (subjectLine.length > 100) {
    throw new Error(`Subject too long (${subjectLine.length} chars > 100).`);
  }

  // Check for --no-verify in remaining args (after message at index 0).
  for (let i = 1; i < passthrough.length; i++) {
    if (passthrough[i] === '--no-verify') {
      throw new Error('rcode-tools commit-to-subrepo does not bypass hooks.');
    }
  }

  const { execSync, execFileSync: execFileSyncLocal } = require('child_process');
  const status = execSync('git diff --cached --name-only', { cwd: subrepoPath, encoding: 'utf8' }).trim();
  if (!status) {
    throw new Error(`Nothing staged in subrepo ${subrepo}. Stage files inside the subrepo with git add first.`);
  }

  const tmpMsgPath = path.join(require('os').tmpdir(), `rcode-subrepo-msg-${Date.now()}.txt`);
  fs.writeFileSync(tmpMsgPath, message);
  try {
    // execFileSync — no shell, so tmpMsgPath with special chars cannot inject (#754).
    execFileSyncLocal('git', ['commit', '-F', tmpMsgPath], { cwd: subrepoPath, stdio: 'pipe' });
  } finally {
    try { fs.unlinkSync(tmpMsgPath); } catch {}
  }

  const sha = execFileSyncLocal('git', ['rev-parse', 'HEAD'], { cwd: subrepoPath, encoding: 'utf8' }).trim();
  return {
    ok: true,
    subrepo,
    sha: sha.slice(0, 7),
    full_sha: sha,
    subject: subjectLine,
  };
}

/**
 * cmdContextRefresh — Phase 11 / #467.
 *
 * Refresh the in-project context cache from .rcode/sources.yaml.
 * Used by init.md. No-op gracefully when no sources configured.
 */
function cmdContextRefresh() {
  const sourcesPath = path.join(RCODE_DIR, 'sources.yaml');
  const contextDir = path.join(RCODE_DIR, 'context');

  if (!fs.existsSync(sourcesPath)) {
    return {
      ok: true,
      refreshed: false,
      message: '.rcode/sources.yaml not found — no context to refresh. Configure sources in .rcode/sources.yaml first.',
    };
  }

  // Ensure context dir exists
  if (!fs.existsSync(contextDir)) {
    fs.mkdirSync(contextDir, { recursive: true });
  }

  // Touch a refresh marker so consumers can detect last refresh time.
  const markerPath = path.join(contextDir, '.last-refresh');
  fs.writeFileSync(markerPath, new Date().toISOString() + '\n');

  return {
    ok: true,
    refreshed: true,
    sources_path: path.relative(PROJECT_ROOT, sourcesPath),
    context_dir: path.relative(PROJECT_ROOT, contextDir),
    last_refresh_iso: new Date().toISOString(),
  };
}

/**
 * cmdClassifyTech — Phase 11 / #467.
 *
 * Classify tech stack from keywords. Used by ui-phase.md to pick the
 * design contract template.
 */
function cmdClassifyTech(rawArgs) {
  const args = (rawArgs || '').match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
  let keywords = '';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--keywords') {
      keywords = (args[i + 1] || '').replace(/^["']|["']$/g, '');
      break;
    }
  }
  if (!keywords) {
    throw new Error('classify-tech requires --keywords "<keywords>"');
  }

  const text = keywords.toLowerCase();
  const stacks = [
    { stack: 'next.js', category: 'frontend', patterns: [/\bnext\.?js\b/, /\bapp router\b/, /\bnextjs\b/] },
    { stack: 'react', category: 'frontend', patterns: [/\breact\b/, /\bjsx\b/, /\btsx\b/] },
    { stack: 'vue', category: 'frontend', patterns: [/\bvue\.?js\b/, /\bnuxt\b/, /\bcomposition api\b/] },
    { stack: 'svelte', category: 'frontend', patterns: [/\bsvelte\b/, /\bsvelte ?kit\b/] },
    { stack: 'angular', category: 'frontend', patterns: [/\bangular\b/] },
    { stack: 'astro', category: 'frontend', patterns: [/\bastro\b/] },
    { stack: 'remix', category: 'frontend', patterns: [/\bremix\b/] },
    { stack: 'fastapi', category: 'backend', patterns: [/\bfastapi\b/, /\bpydantic\b/] },
    { stack: 'express', category: 'backend', patterns: [/\bexpress\b/] },
    { stack: 'nestjs', category: 'backend', patterns: [/\bnestjs\b/, /\bnest\.?js\b/] },
    { stack: 'django', category: 'backend', patterns: [/\bdjango\b/] },
    { stack: 'rails', category: 'backend', patterns: [/\brails\b/, /\bruby on rails\b/] },
    { stack: 'spring', category: 'backend', patterns: [/\bspring\b/, /\bspring boot\b/] },
    { stack: 'flutter', category: 'mobile', patterns: [/\bflutter\b/, /\bdart\b/] },
    { stack: 'react-native', category: 'mobile', patterns: [/\breact native\b/, /\brn\b/] },
    { stack: 'tailwind', category: 'styling', patterns: [/\btailwind\b/] },
    { stack: 'shadcn', category: 'styling', patterns: [/\bshadcn\b/, /\bradix\b/] },
  ];

  let best = { stack: 'unknown', category: 'unknown', confidence: 0, matches: [] };
  for (const s of stacks) {
    const hits = s.patterns.filter(p => p.test(text));
    if (hits.length === 0) continue;
    const conf = Math.min(1, hits.length / s.patterns.length + 0.3);
    if (conf > best.confidence) {
      best = { stack: s.stack, category: s.category, confidence: Number(conf.toFixed(2)), matches: hits.map(h => h.toString()) };
    }
  }

  return { ok: true, ...best };
}

/**
 * Classify the scope of input based on keywords and length.
 * Returns one of: 'ticket', 'feature', 'phase', 'initiative', 'drift'
 *
 * Priority order:
 * 1. Drift / audit / re-audit / extend-existing-artifact intent (Phase 6)
 * 2. Initiative keywords
 * 3. Phase keywords
 * 4. Feature keywords (add, implement, build)
 * 5. Ticket keywords
 * 6. Length-based fallback
 */
function classifyScope(input) {
  const text = (input || '').toLowerCase();
  const len = text.length;

  // Drift / audit / re-audit / extend-existing-artifact intent.
  // Routes /rcode-do to /rcode-feature-drift instead of falling through to
  // inline execution (closes the residual edge case from #458).
  if (/\b(drift|re-?audit|stale|out[- ]of[- ]date|fill out (the|this|existing)|extend (audit|plan|phase)|verify (docs|claims) vs (code|reality))\b/i.test(text)) {
    return 'drift';
  }

  // Initiative signals — highest priority among scope tiers
  if (/\b(milestone|initiative|roadmap|multi-team|multi-sprint|q[1-4]\s*\d{4})\b/.test(text)) {
    return 'initiative';
  }
  if (len > 800) {
    return 'initiative';
  }

  // Phase signals
  if (/\b(phase|epic|sprint)\b/.test(text)) {
    return 'phase';
  }
  if (len > 300 && len <= 800) {
    return 'phase';
  }

  // Feature signals (add, implement, build)
  if (/\b(add|implement|build|create|develop|design)\b/.test(text)) {
    return 'feature';
  }

  // Ticket signals
  if (/\b(fix|bug|typo|quick|small)\b/.test(text)) {
    return 'ticket';
  }
  if (/github\.com\/[^/]+\/[^/]+\/issues\/\d+/.test(text)) {
    return 'ticket';
  }

  // Length-based fallback
  if (len < 100) {
    return 'ticket';
  }

  // Default to feature
  return 'feature';
}

/** init plan — context blob for /rcode-plan workflow. */
function cmdInitPlan(rawArgs) {
  const config = readConfig();
  const tokens = (rawArgs || '').trim().split(/\s+/).filter(Boolean);
  const flags = { phase: null, output: null, research: false };
  const positional = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === '--phase' && tokens[i + 1]) { flags.phase = tokens[++i]; }
    else if (t.startsWith('--phase=')) { flags.phase = t.slice('--phase='.length); }
    else if (t === '--output' && tokens[i + 1]) { flags.output = tokens[++i]; }
    else if (t.startsWith('--output=')) { flags.output = t.slice('--output='.length); }
    else if (t === '--research') { flags.research = true; }
    else positional.push(t);
  }
  const arg = positional.join(' ').trim();
  let inputType = 'description';
  let resolvedPath = null;
  let description = arg;
  if (arg) {
    if (!arg || arg.length === 0) {
      throw new Error('Plan argument cannot be empty');
    }
    if (arg.length > 5000) {
      throw new Error('Plan argument exceeds maximum length (5000 chars)');
    }
    const asAbs = path.isAbsolute(arg) ? arg : path.join(PROJECT_ROOT, arg);
    const normalized = path.resolve(asAbs);
    if (!normalized.startsWith(PROJECT_ROOT + path.sep) && normalized !== PROJECT_ROOT) {
      throw new Error(`Path outside project root: ${arg}`);
    }
    try {
      if (arg.endsWith('.md') && fs.existsSync(asAbs)) {
        resolvedPath = asAbs;
        // Check if this is already an executable plan (ends in -PLAN.md)
        if (/-PLAN\.md$/.test(resolvedPath)) {
          inputType = 'executable_plan';
          description = null;
        } else if (path.basename(asAbs).startsWith('council-')) {
          inputType = 'session';
          description = null;
        } else {
          inputType = 'file';
          description = null;
        }
      } else if (fs.existsSync(asAbs) && fs.statSync(asAbs).isDirectory()) {
        const sessions = walkFiles(asAbs).filter((f) => f.endsWith('.md')).sort().reverse();
        if (sessions.length > 0) { resolvedPath = sessions[0]; inputType = 'session'; description = null; }
      }
    } catch (e) {
      throw new Error(`Failed to resolve plan path: ${e.message}`);
    }
  }

  if (!description && !resolvedPath) {
    console.error('rcode-tools warning: no description provided; plan will be named "unnamed". Re-run with a description.');
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

  // Classify scope based on description or resolved path content
  let scopeInput = description || '';
  if (!scopeInput && resolvedPath) {
    try {
      const content = fs.readFileSync(resolvedPath, 'utf8');
      // Extract Follow-ups section if it's a council session
      const followUpsMatch = content.match(/## Follow-ups\s*\n([\s\S]*?)(?:##|$)/);
      if (followUpsMatch) {
        scopeInput = followUpsMatch[1].slice(0, 500); // Use first 500 chars of follow-ups
      } else {
        scopeInput = content.slice(0, 500); // Use first 500 chars of content
      }
    } catch (e) {
      // Ignore read errors, default to 'feature'
    }
  }
  const scope = classifyScope(scopeInput);

  // If input is already an executable plan, redirect to execute workflow
  if (inputType === 'executable_plan') {
    return {
      workflow: 'plan',
      input_type: 'executable_plan',
      resolved_path: resolvedPath,
      suggestion: `This file is already an executable plan. Run: /rcode-execute ${path.relative(PROJECT_ROOT, resolvedPath)}`,
      config,
      paths: { project_root: PROJECT_ROOT, rcode: RCODE_DIR, planning_root: PLANNING_DIR, state: path.join(RCODE_DIR, 'state.json') },
    };
  }

  return {
    workflow: 'plan', input_type: inputType, resolved_path: resolvedPath, description,
    phase_slug: phaseSlug, output_dir: outputDir, scope, flags, config,
    paths: { project_root: PROJECT_ROOT, rcode: RCODE_DIR, planning_root: PLANNING_DIR, state: path.join(RCODE_DIR, 'state.json') },
  };
}

/**
 * plan validate-evidence — issue #649 enforcement.
 *
 * Scans SPRINT.md files under a phase (or a specific file) and checks that
 * every <task>...</task> block contains an <evidence> sub-block with a real
 * codebase grounding (grep:, lines:, or creates: marker). Optionally
 * spot-checks the cited grep patterns by re-running them and comparing hit
 * counts against the planner's claim.
 *
 * Sprint-checker calls this; CI can call it; users can run it manually.
 *
 * Usage:
 *   plan validate-evidence <phase-number>
 *   plan validate-evidence --file <path>
 *   plan validate-evidence <phase-number> --spot-check
 *
 * Exit code 0 = pass, 1 = at least one task failed evidence check.
 */
function cmdPlanValidateEvidence(rawArgs) {
  const args = (rawArgs || []).slice();
  const flags = {};
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const next = args[i + 1];
      if (next === undefined || next.startsWith('--')) flags[key] = true;
      else { flags[key] = next; i++; }
    } else positional.push(args[i]);
  }

  const targets = [];
  if (flags.file) {
    if (!fs.existsSync(flags.file)) throw new Error(`File not found: ${flags.file}`);
    targets.push(flags.file);
  } else {
    const phaseArg = positional[0];
    if (!phaseArg) throw new Error('Usage: plan validate-evidence <phase-number> [--spot-check] | --file <path>');
    const phasesDir = path.join(PLANNING_DIR, 'phases');
    if (!fs.existsSync(phasesDir)) throw new Error(`No phases directory at ${phasesDir}`);
    const norm = String(phaseArg).replace(/^0+/, '') || '0';
    const padded = norm.padStart(2, '0');
    let phaseDir = null;
    for (const entry of fs.readdirSync(phasesDir)) {
      if (entry.startsWith(`${norm}-`) || entry.startsWith(`${padded}-`) || entry === norm || entry === padded) {
        phaseDir = path.join(phasesDir, entry);
        break;
      }
    }
    if (!phaseDir) throw new Error(`Phase ${phaseArg} directory not found`);
    for (const f of fs.readdirSync(phaseDir)) {
      if (/-SPRINT\.md$/.test(f) || /-PLAN\.md$/.test(f)) targets.push(path.join(phaseDir, f));
    }
  }

  if (targets.length === 0) {
    return { ok: true, files_scanned: 0, tasks_total: 0, violations: [], message: 'No SPRINT.md / PLAN.md files found' };
  }

  const violations = [];
  let tasksTotal = 0;
  let tasksPassed = 0;
  let spotChecks = 0;
  let spotCheckMismatches = 0;

  for (const file of targets) {
    const text = fs.readFileSync(file, 'utf8');
    // Match <task ...>...</task> blocks (planner format) AND ### Story headings (sprint format).
    const taskBlocks = [];
    const taskRe = /<task[^>]*?id\s*=\s*["']([^"']+)["'][^>]*?>([\s\S]*?)<\/task>/gi;
    let m;
    while ((m = taskRe.exec(text)) !== null) {
      taskBlocks.push({ id: m[1], body: m[2] });
    }
    // Story-format fallback: ### Story 8.1.3 — name { body until next ### or end }
    if (taskBlocks.length === 0) {
      const storyRe = /^###\s+Story\s+(\S+)[^\n]*\n([\s\S]*?)(?=^###\s+Story\s+|\Z)/gm;
      while ((m = storyRe.exec(text)) !== null) {
        taskBlocks.push({ id: m[1], body: m[2] });
      }
    }

    for (const t of taskBlocks) {
      tasksTotal++;
      const evMatch = t.body.match(/<evidence>([\s\S]*?)<\/evidence>/i)
        || t.body.match(/(?:^|\n)\s*\*\*Evidence:?\*\*\s*([\s\S]*?)(?=\n\s*\*\*|\n\n|$)/i);
      if (!evMatch || !evMatch[1].trim()) {
        violations.push({
          file: path.relative(PROJECT_ROOT, file),
          task_id: t.id,
          severity: 'BLOCKER',
          kind: 'missing-evidence',
          message: 'Task has no <evidence> block. Per issue #649, every task must cite grep hits, line ranges, or a creates: justification.',
        });
        continue;
      }
      const evidence = evMatch[1].trim();
      // Must contain at least one of: grep:, lines:, creates:
      const hasGrep = /(^|\n)\s*grep:/i.test(evidence) || /\brg\b/.test(evidence);
      const hasLines = /(^|\n)\s*lines:/i.test(evidence) || /\b\S+\.\w+:\d+(-\d+)?/.test(evidence);
      const hasCreates = /(^|\n)\s*creates:/i.test(evidence);
      if (!hasGrep && !hasLines && !hasCreates) {
        violations.push({
          file: path.relative(PROJECT_ROOT, file),
          task_id: t.id,
          severity: 'BLOCKER',
          kind: 'evidence-shape',
          message: 'Evidence block exists but contains no grep:, lines:, or creates: marker. Cannot be traced to real code.',
        });
        continue;
      }
      tasksPassed++;

      // Optional spot-check: re-run the first grep pattern cited and compare hit counts.
      if (flags['spot-check'] && hasGrep) {
        const claim = evidence.match(/grep:\s*(?:`|')?([^\n`']+?)(?:`|')?\s*(?:→|->|=>|—|-)\s*(\d+)/i)
          || evidence.match(/`(rg[^`]+)`[^→]*→\s*(\d+)/i);
        if (claim) {
          const pattern = claim[1].trim();
          const claimedCount = parseInt(claim[2], 10);
          try {
            // Use rg if available, else fallback to grep -r.
            const cmd = `rg --count-matches ${JSON.stringify(pattern.replace(/^rg\s+/, ''))} 2>/dev/null | awk -F: '{s+=$2} END {print s+0}'`;
            const out = require('child_process').execSync(cmd, { cwd: PROJECT_ROOT, encoding: 'utf8', timeout: 10000 }).trim();
            const actualCount = parseInt(out, 10) || 0;
            spotChecks++;
            const drift = Math.abs(actualCount - claimedCount) / Math.max(claimedCount, 1);
            if (drift > 0.1) {
              spotCheckMismatches++;
              violations.push({
                file: path.relative(PROJECT_ROOT, file),
                task_id: t.id,
                severity: 'BLOCKER',
                kind: 'spot-check-mismatch',
                message: `Evidence claims grep hits=${claimedCount} for pattern '${pattern}', actual=${actualCount} (drift ${(drift*100).toFixed(0)}%)`,
              });
            }
          } catch (_) { /* spot-check is best-effort; rg/grep not available shouldn't fail validation */ }
        }
      }
    }
  }

  return {
    ok: violations.length === 0,
    files_scanned: targets.length,
    tasks_total: tasksTotal,
    tasks_passed: tasksPassed,
    spot_checks_run: spotChecks,
    spot_check_mismatches: spotCheckMismatches,
    violations,
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

/** phase-plan-index — JSON inventory of plans (SPRINT.md) under a phase, with wave grouping and summary detection. */
function cmdPhasePlanIndex(rawArgs) {
  const phaseArg = String(rawArgs || '').trim();
  if (!phaseArg) {
    console.error('Usage: phase-plan-index <phase-number>');
    process.exit(1);
  }
  const phasesDir = path.join(PLANNING_DIR, 'phases');
  if (!fs.existsSync(phasesDir)) return { phase: phaseArg, plans: [], waves: {}, incomplete: 0, has_checkpoints: false };
  const norm = phaseArg.replace(/^0+/, '') || '0';
  const dirs = fs.readdirSync(phasesDir).filter((d) => {
    const m = d.match(/^(\d+)(?:[-.])/);
    if (!m) return false;
    const n = m[1].replace(/^0+/, '') || '0';
    return n === norm;
  });
  if (dirs.length === 0) return { phase: phaseArg, plans: [], waves: {}, incomplete: 0, has_checkpoints: false, phase_dir: null };
  const phaseDir = path.join(phasesDir, dirs[0]);
  const all = fs.readdirSync(phaseDir);
  const sprintFiles = all.filter((f) => /-SPRINT\.md$/i.test(f)).sort();
  const summarySet = new Set(all.filter((f) => /-SUMMARY\.md$/i.test(f)).map((f) => f.replace(/-SUMMARY\.md$/i, '')));
  let hasCheckpoints = false;
  const plans = sprintFiles.map((file) => {
    const stem = file.replace(/-SPRINT\.md$/i, '');
    const text = fs.readFileSync(path.join(phaseDir, file), 'utf8');
    const { frontmatter, body } = parseFrontmatter(text);
    let block = '';
    if (text.startsWith('---\n')) {
      const end = text.indexOf('\n---\n', 4);
      if (end !== -1) block = text.slice(4, end);
    }
    const id = frontmatter.sprint || frontmatter.plan || stem;
    // `wave:` may be an explicit scalar key, or absent — in which case it's
    // derived from `depends_on` below (block-list or inline form, issue #951).
    const hasExplicitWave = /^wave\s*:\s*\d+/m.test(block);
    const wave = hasExplicitWave ? (parseInt(frontmatter.wave, 10) || 1) : null;
    const dependsOn = fmListField(block, 'depends_on');
    const hasAutonomousKey = /^autonomous\s*:/m.test(block);
    const autonomous = hasAutonomousKey
      ? String(frontmatter.autonomous || '').toLowerCase() === 'true'
      : /<automated>/i.test(body);
    const gapClosure = String(frontmatter.gap_closure || frontmatter.type || '').toLowerCase() === 'gap_closure';
    const objMatch = body.match(/^##\s+(?:Objective|Goal)\s*\n+([^\n]+)/mi);
    const objective = objMatch ? objMatch[1].trim() : (frontmatter.goal || '').replace(/^["']|["']$/g, '');
    const checkboxCount = (body.match(/^[-*]\s+\[[ xX]\]/gm) || []).length;
    const storyHeaderCount = (body.match(/^###\s+Story\s+\S+/gm) || []).length;
    const taskCount = checkboxCount > 0 ? checkboxCount : storyHeaderCount;
    const filesModifiedList = fmListField(block, 'files_modified');
    const filesModified = filesModifiedList.length > 0
      ? filesModifiedList.length
      : (body.match(/^\s*-\s*path:\s*["']?([^"'\n]+)/gm) || []).length;
    const hasSummary = summarySet.has(stem);
    if (/checkpoint/i.test(body)) hasCheckpoints = true;
    return { id, wave, dependsOn, autonomous, gap_closure: gapClosure, objective, task_count: taskCount, files_modified: filesModified, has_summary: hasSummary, file: path.relative(PROJECT_ROOT, path.join(phaseDir, file)) };
  });

  // Resolve waves left undetermined (no explicit `wave:` key) from depends_on:
  // wave(p) = 1 + max(wave of each same-phase dependency), or 1 if none.
  const idToPlan = new Map(plans.map((p) => [p.id, p]));
  function resolveWave(p, seen) {
    if (p.wave !== null) return p.wave;
    if (seen.has(p.id)) { p.wave = 1; return 1; }
    seen.add(p.id);
    let maxDepWave = 0;
    for (const depId of p.dependsOn) {
      const dep = idToPlan.get(depId);
      if (!dep) continue;
      maxDepWave = Math.max(maxDepWave, resolveWave(dep, seen));
    }
    p.wave = maxDepWave > 0 ? maxDepWave + 1 : 1;
    return p.wave;
  }
  for (const p of plans) resolveWave(p, new Set());
  for (const p of plans) delete p.dependsOn;

  const waves = {};
  for (const p of plans) {
    const k = String(p.wave);
    if (!waves[k]) waves[k] = [];
    waves[k].push(p.id);
  }
  const incomplete = plans.filter((p) => !p.has_summary).length;
  return {
    phase: phaseArg,
    phase_dir: path.relative(PROJECT_ROOT, phaseDir),
    plans,
    waves,
    incomplete,
    has_checkpoints: hasCheckpoints,
  };
}

/**
 * Extract a frontmatter list field that may be written inline (`key: [a, b]`),
 * as a single scalar (`key: a`), or as a block list (`key:` then `  - a`).
 * Returns a string array (empty if the key is absent).
 */
function fmListField(block, key) {
  const lines = block.split('\n');
  const strip = (s) => s.trim().replace(/^["']|["']$/g, '');
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(new RegExp(`^${key}\\s*:\\s*(.*)$`));
    if (!m) continue;
    const inline = m[1].trim();
    if (inline.startsWith('[')) {
      return inline.replace(/^\[|\]$/g, '').split(',').map(strip).filter(Boolean);
    }
    if (inline) return [strip(inline)];
    const out = [];
    for (let j = i + 1; j < lines.length; j++) {
      const lm = lines[j].match(/^\s+-\s+(.*)$/);
      if (!lm) break;
      out.push(strip(lm[1]));
    }
    return out;
  }
  return [];
}

/**
 * plan check-wave-overlaps <phase> — enforce the wave-parallelism rule
 * (plan.md Step 12.5, issue #768): two plans in the SAME wave that both list
 * the same path in `files_modified` cannot run in parallel — the later plan
 * (by plan number) must declare `sequential: true`. Returns a JSON report of
 * unresolved conflicts so /rcode-plan can auto-correct the frontmatter.
 */
function cmdPlanCheckWaveOverlaps(rawArgs) {
  const phaseArg = String(rawArgs || '').trim().split(/\s+/)[0] || '';
  if (!phaseArg) {
    console.error('Usage: plan check-wave-overlaps <phase-number>');
    process.exit(1);
  }
  const phasesDir = path.join(PLANNING_DIR, 'phases');
  const norm = phaseArg.replace(/^0+/, '') || '0';
  let phaseDir = null;
  if (fs.existsSync(phasesDir)) {
    for (const d of fs.readdirSync(phasesDir)) {
      const m = d.match(/^(\d+)(?:[-.])/);
      if (m && (m[1].replace(/^0+/, '') || '0') === norm) { phaseDir = path.join(phasesDir, d); break; }
    }
  }
  if (!phaseDir) return { phase: phaseArg, conflicts: [], plans_checked: 0, phase_dir: null };

  const plans = [];
  for (const file of fs.readdirSync(phaseDir).filter((f) => /-SPRINT\.md$/i.test(f)).sort()) {
    const text = fs.readFileSync(path.join(phaseDir, file), 'utf8');
    let block = '';
    if (text.startsWith('---\n')) {
      const end = text.indexOf('\n---\n', 4);
      if (end !== -1) block = text.slice(4, end);
    }
    const stem = file.replace(/-SPRINT\.md$/i, '');
    const numMatch = (block.match(/^plan_number\s*:\s*(\d+)/m) || stem.match(/-(\d+)$/));
    plans.push({
      id: stem,
      order: numMatch ? parseInt(numMatch[1], 10) : 0,
      wave: parseInt((block.match(/^wave\s*:\s*(\d+)/m) || [])[1] || '1', 10) || 1,
      sequential: /^sequential\s*:\s*true\s*$/m.test(block),
      files: fmListField(block, 'files_modified'),
    });
  }

  const conflicts = [];
  for (let a = 0; a < plans.length; a++) {
    for (let b = a + 1; b < plans.length; b++) {
      const [earlier, later] = plans[a].order <= plans[b].order ? [plans[a], plans[b]] : [plans[b], plans[a]];
      if (earlier.wave !== later.wave) continue;
      const shared = earlier.files.filter((f) => later.files.includes(f));
      if (shared.length === 0) continue;
      if (later.sequential) continue;
      conflicts.push({
        wave: earlier.wave,
        plan_a: earlier.id,
        plan_b: later.id,
        shared_files: shared,
        plan_b_sequential: false,
      });
    }
  }
  return { phase: phaseArg, phase_dir: path.relative(PROJECT_ROOT, phaseDir), plans_checked: plans.length, conflicts };
}

/**
 * Deterministic frontend/backend glob check for classify-plan (issue #1021).
 * Mirrors the FRONTEND_GLOBS / BACKEND_GLOBS rules formerly hand-applied by
 * the orchestrating LLM in execute-waves.md — kept here as the single source
 * of truth so both the CLI and the workflow doc describe the same behavior.
 */
function matchesFrontendGlob(file) {
  const f = String(file || '').toLowerCase();
  if (/\.(tsx|jsx|css)$/.test(f)) return true;
  return f.includes('client') || f.includes('ui');
}
function matchesBackendGlob(file) {
  const f = String(file || '').toLowerCase();
  return f.includes('api') || f.includes('server') || f.includes('db') || f.includes('service');
}

const CLASSIFY_PLAN_ROUTE = { frontend: 'rcode-haitham', backend: 'rcode-yousef', 'full-stack': 'rcode-hanzla', other: 'rcode-executor' };

function classifyPlanFiles(files, objective) {
  const touchesFrontend = files.some(matchesFrontendGlob);
  const touchesBackend = files.some(matchesBackendGlob);
  let classification;
  if (touchesFrontend && touchesBackend) classification = 'full-stack';
  else if (touchesFrontend) classification = 'frontend';
  else if (touchesBackend) classification = 'backend';
  else classification = 'other';

  if (classification === 'other') {
    const obj = String(objective || '').toLowerCase();
    const frontendKeywords = ['react', 'component', 'ui', 'css', 'tailwind', 'frontend', 'client-side', 'accessibility', 'a11y'];
    const backendKeywords = ['api', 'endpoint', 'database', 'schema', 'service', 'queue', 'backend', 'server-side'];
    if (frontendKeywords.some((k) => obj.includes(k))) classification = 'frontend';
    else if (backendKeywords.some((k) => obj.includes(k))) classification = 'backend';
  }
  return classification;
}

/**
 * classify-plan — deterministic replacement for execute-waves.md's
 * hand-computed FRONTEND_GLOBS/BACKEND_GLOBS classification (issue #1021).
 * A live execution run showed the orchestrating LLM never actually carried
 * out the prose pseudocode, so a plan with a "db"-containing path still fell
 * back to rcode-executor instead of rcode-yousef.
 *
 * Two call shapes:
 *   classify-plan <phase> <plan-id>              — reads files_modified/objective from the plan's SPRINT.md
 *   classify-plan --files=a,b,c --objective="..."  — classify an already-parsed list directly
 */
function cmdClassifyPlan(args) {
  const flags = {};
  const positional = [];
  for (const t of args) {
    if (t.startsWith('--files=')) flags.files = t.slice('--files='.length);
    else if (t.startsWith('--objective=')) flags.objective = t.slice('--objective='.length);
    else positional.push(t);
  }

  let files = [];
  let objective = '';

  if (flags.files !== undefined || flags.objective !== undefined) {
    files = flags.files ? flags.files.split(',').map((s) => s.trim()).filter(Boolean) : [];
    objective = flags.objective || '';
  } else {
    const [phaseArg, planArg] = positional;
    if (!phaseArg || !planArg) {
      throw new Error('Usage: classify-plan <phase> <plan-id>  OR  classify-plan --files=a,b,c --objective="text"');
    }
    const phasesDir = path.join(PLANNING_DIR, 'phases');
    const norm = phaseArg.replace(/^0+/, '') || '0';
    let phaseDir = null;
    if (fs.existsSync(phasesDir)) {
      for (const d of fs.readdirSync(phasesDir)) {
        const m = d.match(/^(\d+)(?:[-.])/);
        if (m && (m[1].replace(/^0+/, '') || '0') === norm) { phaseDir = path.join(phasesDir, d); break; }
      }
    }
    if (!phaseDir) throw new Error(`Phase not found: ${phaseArg}`);
    let planFile = null;
    for (const file of fs.readdirSync(phaseDir).filter((f) => /-SPRINT\.md$/i.test(f)).sort()) {
      const stem = file.replace(/-SPRINT\.md$/i, '');
      if (stem === planArg || stem.endsWith(`-${planArg}`)) { planFile = file; break; }
      const text = fs.readFileSync(path.join(phaseDir, file), 'utf8');
      const { frontmatter } = parseFrontmatter(text);
      if ((frontmatter.sprint || frontmatter.plan) === planArg) { planFile = file; break; }
    }
    if (!planFile) throw new Error(`Plan not found: ${planArg} in phase ${phaseArg}`);
    const text = fs.readFileSync(path.join(phaseDir, planFile), 'utf8');
    const { frontmatter, body } = parseFrontmatter(text);
    let block = '';
    if (text.startsWith('---\n')) {
      const end = text.indexOf('\n---\n', 4);
      if (end !== -1) block = text.slice(4, end);
    }
    files = fmListField(block, 'files_modified');
    const objMatch = body.match(/^##\s+(?:Objective|Goal)\s*\n+([^\n]+)/mi);
    objective = objMatch ? objMatch[1].trim() : (frontmatter.goal || '').replace(/^["']|["']$/g, '');
  }

  const classification = classifyPlanFiles(files, objective);
  return { classification, subagent_type: CLASSIFY_PLAN_ROUTE[classification], files_checked: files.length };
}

/** phases list — directory inventory under .planning/phases with optional --type filter and --pick path. */
function cmdPhasesList(args) {
  const argv = Array.isArray(args) ? args : String(args || '').trim().split(/\s+/).filter(Boolean);
  let type = 'all';
  let pick = null;
  let raw = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--type') type = argv[++i];
    else if (argv[i] === '--pick') pick = argv[++i];
    else if (argv[i] === '--raw') raw = true;
  }
  const phasesDir = path.join(PLANNING_DIR, 'phases');
  const directories = fs.existsSync(phasesDir)
    ? fs.readdirSync(phasesDir)
        .filter((d) => fs.statSync(path.join(phasesDir, d)).isDirectory() && /^\d/.test(d))
        .sort((a, b) => {
          const na = parseFloat(a.match(/^(\d+(?:\.\d+)?)/)?.[1] || '0');
          const nb = parseFloat(b.match(/^(\d+(?:\.\d+)?)/)?.[1] || '0');
          return na - nb;
        })
    : [];
  const summaries = [];
  const sprints = [];
  for (const d of directories) {
    const dirPath = path.join(phasesDir, d);
    for (const f of fs.readdirSync(dirPath)) {
      const rel = path.relative(PROJECT_ROOT, path.join(dirPath, f));
      if (/-SUMMARY\.md$/i.test(f) || /^SUMMARY\.md$/i.test(f)) summaries.push(rel);
      if (/-SPRINT\.md$/i.test(f)) sprints.push(rel);
    }
  }
  const result = { directories, summaries, sprints };
  if (pick) {
    const m = pick.match(/^([a-z_]+)\[(-?\d+)\]$/i);
    if (m) {
      const arr = result[m[1]] || [];
      const idx = parseInt(m[2], 10);
      const val = arr[idx < 0 ? arr.length + idx : idx];
      console.log(val == null ? '' : val);
      return;
    }
    const v = result[pick];
    if (Array.isArray(v)) console.log(v.join('\n'));
    else if (v != null) console.log(v);
    return;
  }
  if (type === 'summaries') return { summaries };
  if (type === 'sprints') return { sprints };
  if (type === 'directories') return { directories };
  return result;
}

/** find-phase — resolve a phase number (with or without leading zero) to its directory and metadata. */
function cmdFindPhase(args) {
  const argv = Array.isArray(args) ? args : String(args || '').trim().split(/\s+/).filter(Boolean);
  const target = argv.find((a) => !a.startsWith('--'));
  if (!target) {
    console.error('Usage: find-phase <N> [--raw]');
    process.exit(1);
  }
  const phasesDir = path.join(PLANNING_DIR, 'phases');
  if (!fs.existsSync(phasesDir)) return { number: target, exists: false, dir: null, slug: null, decimal_children: [] };
  const norm = target.replace(/^0+/, '') || '0';
  const all = fs.readdirSync(phasesDir).filter((d) => fs.statSync(path.join(phasesDir, d)).isDirectory());
  const exact = all.find((d) => {
    const m = d.match(/^(\d+(?:\.\d+)?)(?:[-.])/) || d.match(/^(\d+(?:\.\d+)?)$/);
    if (!m) return false;
    return (m[1].replace(/^0+/, '') || '0') === norm;
  });
  const decimal_children = all
    .filter((d) => {
      const m = d.match(/^(\d+)\.(\d+)[-.]/);
      return m && (m[1].replace(/^0+/, '') || '0') === norm;
    })
    .map((d) => path.relative(PROJECT_ROOT, path.join(phasesDir, d)));
  if (!exact) return { number: target, exists: false, dir: null, slug: null, decimal_children };
  const slugMatch = exact.match(/^\d+(?:\.\d+)?[-](.+)$/);
  const slug = slugMatch ? slugMatch[1] : '';

  // Name drift: the directory keeps the slug it was created with, but ROADMAP.md
  // can be rewritten under it. Resolving to the existing directory is correct —
  // that is where the artifacts and the git history live, and auto-renaming would
  // orphan both. Staying SILENT about the divergence is not: an agent reading
  // `slug: foundation-contact-loop` while the roadmap says "Rentable Contact
  // Layer" has no way to tell whether it is looking at the same work.
  // Same class as the phase-identity drift in `state sync --from-disk`.
  let name_drift = null;
  try {
    const roadmapPath = path.join(PLANNING_DIR, 'ROADMAP.md');
    if (slug && fs.existsSync(roadmapPath)) {
      const roadmapLib = require(path.join(__dirname, 'lib', 'roadmap.cjs'));
      const rp = roadmapLib.dispatch(PROJECT_ROOT, ['get-phase', String(target)]);
      const roadmapName = rp && rp.found ? String(rp.name || '') : '';
      if (roadmapName) {
        const slugify = (t) => String(t).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const fromRoadmap = slugify(roadmapName);
        // Compare on word sets, not exact slugs — a truncated or reordered slug
        // is normal, a different subject is the signal.
        const words = (t) => new Set(String(t).split('-').filter(w => w.length > 3));
        const dirWords = words(slug);
        const roadWords = words(fromRoadmap);
        const shared = [...dirWords].filter(w => roadWords.has(w)).length;
        if (dirWords.size > 0 && roadWords.size > 0 && shared === 0) {
          name_drift = {
            dir_slug: slug,
            roadmap_name: roadmapName,
            note: 'Directory name and ROADMAP name share no significant words. '
                + 'The phase may have been replaced under the same number. '
                + 'The directory is NOT auto-renamed: its artifacts and git history '
                + 'belong to whatever was built there. Confirm they are the same work '
                + 'before planning or executing against it.',
          };
        }
      }
    }
  } catch { /* drift detection is advisory — never fail a lookup over it */ }

  return {
    number: target,
    exists: true,
    dir: path.relative(PROJECT_ROOT, path.join(phasesDir, exact)),
    slug,
    name_drift,
    decimal_children,
  };
}

/** audit-uat — walk all UAT files under .planning/phases/ and return inventory + status counts. */
function cmdAuditUat(args) {
  const phasesDir = path.join(PLANNING_DIR, 'phases');
  const counts = { pending: 0, passed: 0, failed: 0, skipped: 0, blocked: 0, human_uat: 0, resolved: 0 };
  const files = [];
  if (fs.existsSync(phasesDir)) {
    for (const d of fs.readdirSync(phasesDir)) {
      const dp = path.join(phasesDir, d);
      if (!fs.statSync(dp).isDirectory()) continue;
      for (const f of fs.readdirSync(dp)) {
        if (!/UAT.*\.md$|VERIFICATION\.md$/i.test(f)) continue;
        const fp = path.join(dp, f);
        const text = fs.readFileSync(fp, 'utf8');
        const fileCounts = { pending: 0, passed: 0, failed: 0, skipped: 0, blocked: 0, human_uat: 0, resolved: 0 };
        const items = [];
        const statusRe = /^[\s-]*status:\s*([a-z_]+)/gim;
        let m;
        while ((m = statusRe.exec(text)) !== null) {
          const s = m[1].toLowerCase();
          if (s in fileCounts) fileCounts[s]++;
          if (s in counts) counts[s]++;
          items.push({ status: s });
        }
        const checkRe = /^[-*]\s+\[([ xX!?])\]\s+(.+)$/gm;
        while ((m = checkRe.exec(text)) !== null) {
          const mark = m[1];
          if (mark === ' ') { fileCounts.pending++; counts.pending++; items.push({ status: 'pending', text: m[2].trim() }); }
          else if (mark === 'x' || mark === 'X') { fileCounts.passed++; counts.passed++; items.push({ status: 'passed', text: m[2].trim() }); }
          else if (mark === '!') { fileCounts.blocked++; counts.blocked++; items.push({ status: 'blocked', text: m[2].trim() }); }
          else if (mark === '?') { fileCounts.human_uat++; counts.human_uat++; items.push({ status: 'human_uat', text: m[2].trim() }); }
        }
        files.push({ path: path.relative(PROJECT_ROOT, fp), status_counts: fileCounts, items });
      }
    }
  }
  const total_items = Object.values(counts).reduce((a, b) => a + b, 0);
  return {
    summary: {
      total_files: files.length,
      total_items,
      phase_count: new Set(files.map((f) => f.path.match(/phases\/([^/]+)/)?.[1])).size,
      ...counts,
    },
    results: files,
  };
}

/** uat render-checkpoint — render a markdown checkpoint block from a UAT file. */
function cmdUatRenderCheckpoint(args) {
  const argv = Array.isArray(args) ? args : String(args || '').trim().split(/\s+/).filter(Boolean);
  let file = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--file') file = argv[++i];
  }
  if (!file || !fs.existsSync(file)) {
    console.error('Usage: uat render-checkpoint --file <path>');
    process.exit(1);
  }
  const text = fs.readFileSync(file, 'utf8');
  const { frontmatter } = parseFrontmatter(text);
  const phase = frontmatter.phase || '';
  const lines = [];
  lines.push(`## UAT Checkpoint — Phase ${phase}`);
  lines.push('');
  const pendingRe = /^[-*]\s+\[ \]\s+(.+)$/gm;
  const pending = [];
  let m;
  while ((m = pendingRe.exec(text)) !== null) pending.push(m[1].trim());
  if (pending.length === 0) {
    lines.push('No pending UAT items. ✅');
  } else {
    lines.push(`**${pending.length} pending item(s):**`);
    lines.push('');
    pending.slice(0, 20).forEach((p, i) => lines.push(`${i + 1}. ${p}`));
    if (pending.length > 20) lines.push(`...and ${pending.length - 20} more`);
  }
  lines.push('');
  lines.push('Reply: `pass`, `fail <reason>`, `skip`, or `block <reason>`.');
  return { __raw: lines.join('\n') };
}

/** requirements mark-complete — flip status to complete for given requirement IDs in REQUIREMENTS.md. */
function cmdRequirementsMarkComplete(args) {
  const argv = Array.isArray(args) ? args : String(args || '').trim().split(/\s+/).filter(Boolean);
  const ids = argv.filter((a) => !a.startsWith('--'));
  if (ids.length === 0) return { updated: [], not_found: [] };
  const reqPath = path.join(PLANNING_DIR, 'REQUIREMENTS.md');
  if (!fs.existsSync(reqPath)) return { updated: [], not_found: ids, reason: 'REQUIREMENTS.md not found' };
  let text = fs.readFileSync(reqPath, 'utf8');
  const updated = [];
  const notFound = [];
  for (const id of ids) {
    const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(\\| *${escaped} *\\|[^\\n]*?\\| *)([^|\\n]+)( *\\|)`, 'g');
    let matched = false;
    text = text.replace(re, (full, pre, status, post) => {
      matched = true;
      return `${pre}complete${post}`;
    });
    if (matched) updated.push(id); else notFound.push(id);
  }
  if (updated.length > 0) fs.writeFileSync(reqPath, text);
  return { updated, not_found: notFound };
}

/** todo match-phase — return todos whose phase tag matches N. */
function cmdTodoMatchPhase(args) {
  const argv = Array.isArray(args) ? args : String(args || '').trim().split(/\s+/).filter(Boolean);
  const phase = argv.find((a) => !a.startsWith('--'));
  if (!phase) {
    console.error('Usage: todo match-phase <N>');
    process.exit(1);
  }
  const todoDirs = [
    path.join(PLANNING_DIR, 'notes', 'todos'),
    path.join(PLANNING_DIR, 'todos'),
    path.join(PLANNING_DIR, 'notes'),
  ];
  const matches = [];
  for (const dir of todoDirs) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.md')) continue;
      const fp = path.join(dir, f);
      const text = fs.readFileSync(fp, 'utf8');
      const { frontmatter, body } = parseFrontmatter(text);
      const tagMatch = frontmatter.phase === phase
        || (frontmatter.tags || '').split(',').map((t) => t.trim()).includes(`phase-${phase}`)
        || new RegExp(`\\bphase[\\s-]?${phase}\\b`, 'i').test(body);
      if (!tagMatch) continue;
      const titleMatch = body.match(/^#\s+(.+)$/m);
      matches.push({
        file: path.relative(PROJECT_ROOT, fp),
        title: titleMatch ? titleMatch[1].trim() : f.replace(/\.md$/, ''),
        area: frontmatter.area || frontmatter.tags || '',
        score: 1.0,
        reasons: [`phase tag matched ${phase}`],
      });
    }
  }
  return { phase, todo_count: matches.length, matches };
}

/** learnings copy — soft-fail copy of a phase's LEARNINGS.md to the global store. */
function cmdLearningsCopy(args) {
  const phasesDir = path.join(PLANNING_DIR, 'phases');
  if (!fs.existsSync(phasesDir)) return { copied: 0, reason: 'no phases dir' };
  const dirs = fs.readdirSync(phasesDir).filter((d) => fs.statSync(path.join(phasesDir, d)).isDirectory());
  const learnings = dirs
    .map((d) => path.join(phasesDir, d, 'LEARNINGS.md'))
    .filter((p) => fs.existsSync(p));
  if (learnings.length === 0) return { copied: 0, reason: 'no LEARNINGS.md found in any phase' };
  const globalDir = path.join(process.env.HOME || '', '.rcode', 'learnings');
  if (!fs.existsSync(globalDir)) fs.mkdirSync(globalDir, { recursive: true });
  const project = path.basename(PROJECT_ROOT);
  let copied = 0;
  for (const src of learnings) {
    const phase = src.match(/phases\/([^/]+)\//)?.[1] || 'unknown';
    const dest = path.join(globalDir, `${project}__${phase}.md`);
    fs.copyFileSync(src, dest);
    copied++;
  }
  return { copied, project, store: globalDir };
}

/** frontmatter get — extract a single field from a markdown file's YAML frontmatter. */
function cmdFrontmatterGet(args) {
  const argv = Array.isArray(args) ? args : String(args || '').trim().split(/\s+/).filter(Boolean);
  let file = null;
  let field = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--field') field = argv[++i];
    else if (!argv[i].startsWith('--') && !file) file = argv[i];
  }
  if (!file || !field) {
    console.error('Usage: frontmatter get <file> --field <name>');
    process.exit(1);
  }
  if (!fs.existsSync(file)) {
    console.error(`File not found: ${file}`);
    process.exit(1);
  }
  const text = fs.readFileSync(file, 'utf8');
  const { frontmatter } = parseFrontmatter(text);
  const val = frontmatter[field];
  if (val === undefined) { console.log(''); return; }
  console.log(val);
  return;
}

/** docs-audit — placeholder inventory of documentation gaps; non-fatal. */
function cmdDocsAudit(args) {
  const reqPath = path.join(PLANNING_DIR, 'documentation-requirements.csv');
  if (!fs.existsSync(reqPath)) {
    return { has_requirements: false, gaps: [], reason: 'no documentation-requirements.csv — nothing to audit' };
  }
  const text = fs.readFileSync(reqPath, 'utf8');
  const rows = text.split('\n').slice(1).filter((l) => l.trim()).map((l) => l.split(','));
  const gaps = rows
    .filter((cols) => cols[1] && !fs.existsSync(path.join(PROJECT_ROOT, cols[1].trim())))
    .map((cols) => ({ doc: cols[0]?.trim(), expected_path: cols[1]?.trim() }));
  return { has_requirements: true, total: rows.length, gaps };
}

/**
 * cmdWorkflowConfigAudit — scan workflow files for stale config.json refs.
 * Closes #733. Reports every workflow that references .planning/config.json
 * (legacy location) instead of .rcode/config.yaml (current location).
 * Read-only. Fix guidance is printed per-file.
 */
function cmdWorkflowConfigAudit() {
  // Check both installed (.rcode/workflows) and source (rcode/workflows) locations
  const candidates = [
    path.join(RCODE_DIR, 'workflows'),
    path.join(PROJECT_ROOT, 'rcode', 'workflows'),
  ];
  const workflowsDir = candidates.find(d => fs.existsSync(d));
  if (!workflowsDir) {
    return { ok: true, audited: 0, hits: [], message: 'No workflows directory found (checked .rcode/workflows and rcode/workflows)' };
  }
  const files = fs.readdirSync(workflowsDir).filter(f => f.endsWith('.md'));
  const JSON_RE = /\.planning\/config\.json|planning\/config\.json/g;
  const hits = [];

  for (const fname of files) {
    const fpath = path.join(workflowsDir, fname);
    const text  = fs.readFileSync(fpath, 'utf8');
    const lines = text.split('\n');
    const matches = [];
    lines.forEach((line, idx) => {
      if (JSON_RE.test(line)) {
        matches.push({ line: idx + 1, content: line.trim().slice(0, 120) });
      }
      JSON_RE.lastIndex = 0; // reset stateful regex
    });
    if (matches.length) {
      hits.push({ file: fname, count: matches.length, refs: matches });
    }
  }

  return {
    ok: true,
    audited: files.length,
    stale_count: hits.length,
    hits,
    fix_guidance: hits.length > 0
      ? 'Replace .planning/config.json with .rcode/config.yaml. Use `node rcode-tools.cjs config-get <key>` or readConfig() to read values.'
      : 'No stale config.json references found.',
  };
}

/** init chain — context blob for /rcode-chain workflow. */
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
  const slug = (topic || preset || 'unnamed').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    .split('-')
    .reduce((acc, word) => {
      const next = acc ? acc + '-' + word : word;
      return next.length <= 40 ? next : acc;
    }, '');
  const date = new Date().toISOString().slice(0, 10);
  const chainDir = path.join(PLANNING_DIR, 'chains', `${date}-${slug}`);

  // Normalize: if user passed "mariam", check both "mariam" and "rcode-mariam"
  chain = chain.map(id => {
    if (installedAgents.includes(id)) return id;
    if (installedAgents.includes('rcode-' + id)) return 'rcode-' + id;
    // Try without prefix if user passed full
    if (id.startsWith('rcode-') && installedAgents.includes(id.slice(6))) return id.slice(6);
    return id; // will fail validation downstream with proper error
  });

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
    paths: { project_root: PROJECT_ROOT, rcode: RCODE_DIR, planning_root: PLANNING_DIR, sessions_dir: SESSIONS_DIR, state: path.join(RCODE_DIR, 'state.json') },
  };
}

/** init discuss — context blob for /rcode-discuss workflow. */
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
    paths: { project_root: PROJECT_ROOT, rcode: RCODE_DIR, planning_root: PLANNING_DIR, sessions_dir: SESSIONS_DIR, state: path.join(RCODE_DIR, 'state.json') },
  };
}

/**
 * module <subcommand> — module system helpers.
 *   list           → available modules from package
 *   installed      → modules listed in .rcode/_config/manifest.yaml
 *   check-requires → verify a module's dependencies are installed
 */
function cmdModule(subArgs) {
  const sub = subArgs[0];

  if (sub === 'list') {
    // Hardcoded available modules (known at build time)
    return {
      modules: [
        { name: 'core', description: 'Council agents, /rcode-council, /rcode-discuss, /rcode-status, /rcode-do router, /rcode-help, and state management' },
        { name: 'execution', description: 'Plan execution — /rcode-execute, /rcode-plan, /rcode-quick, /rcode-debug, /rcode-audit-fix, /rcode-undo' },
        { name: 'discovery', description: 'Project discovery — /rcode-new-project, /rcode-map-codebase, /rcode-scan, /rcode-explore, /rcode-review, /rcode-docs-update' },
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
    if (!modName) return { ok: false, error: 'check-requires requires a module name argument (core|execution|discovery)' };
    if (!REQUIRES[modName]) return { ok: false, error: `Unknown module: ${modName}. Valid: core, execution, discovery` };
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

/**
 * resolve-model <agent-id> — return the model string for the given agent
 * under the current model profile in config.yaml.
 *
 * Model profiles (defined in references/model-profiles.md):
 *   - quality: opus for reasoning agents, sonnet for executor, haiku for utilities
 *   - balanced: sonnet for all agents
 *   - budget: haiku for all agents
 *   - inherit: no override, return null
 *
 * If the agent id is unknown, exit with error.
 */
function cmdResolveModel(agentId) {
  if (!agentId || agentId.trim() === '') {
    throw new Error('resolve-model requires an agent-id argument');
  }

  const config = readConfig();

  // model_override bypasses profile entirely — user pinned a specific model id
  if (config.model_override) {
    return { model: config.model_override, profile: 'override', agent: agentId };
  }

  const profile = config.model_profile || 'balanced';
  const installedAgents = listInstalledAgents();

  if (!installedAgents.includes(agentId)) {
    throw new Error(`Unknown agent: ${agentId}. Valid agents: ${installedAgents.join(', ')}`);
  }

  // Model assignments per profile (Claude 4 family: opus-4-7, sonnet-4-6, haiku-4-5)
  const QUALITY_AGENTS = {
    'rcode-sadiq': 'claude-opus-4-7',
    'rcode-waleed': 'claude-opus-4-7',
    'rcode-planner': 'claude-opus-4-7',
    'rcode-sprint-checker': 'claude-opus-4-7',
    'rcode-fatima': 'claude-sonnet-4-6',
    'rcode-executor': 'claude-sonnet-4-6',
    'rcode-verifier': 'claude-sonnet-4-6',
  };

  if (profile === 'inherit') {
    return { model: null, profile: 'inherit', note: 'No override; use parent session model' };
  }

  if (profile === 'budget') {
    return { model: 'claude-haiku-4-5-20251001', profile: 'budget', agent: agentId };
  }

  if (profile === 'balanced') {
    return { model: 'claude-sonnet-4-6', profile: 'balanced', agent: agentId };
  }

  if (profile === 'quality') {
    const model = QUALITY_AGENTS[agentId] || 'claude-sonnet-4-6';
    return { model, profile: 'quality', agent: agentId };
  }

  // Unknown profile, default to balanced
  return { model: 'claude-sonnet-4-6', profile: 'balanced', agent: agentId, warning: `Unknown profile '${profile}'; using balanced` };
}

/**
 * config set --key <k> --value <v> — DEPRECATED legacy form.
 *
 * Closes #233. The original implementation used a flat YAML parser that
 * destroyed the nested `workflow:` and `git:` sections on every save.
 * This shim now delegates to the nested-safe writer in lib/config.cjs and
 * emits a one-line deprecation warning to stderr so callers migrate.
 */
function cmdConfigSet(subArgs) {
  const flags = {};
  for (let i = 0; i < subArgs.length; i++) {
    if (subArgs[i].startsWith('--')) {
      const key = subArgs[i].slice(2);
      flags[key] = subArgs[i + 1] || '';
      i++;
    }
  }

  const key = flags.key || '';
  const value = flags.value || '';

  if (!key) throw new Error('config set requires --key <key> --value <value>\n  e.g. config set --key language --value Arabic');
  if (!value) throw new Error('config set requires --key <key> --value <value>\n  e.g. config set --key language --value Arabic');

  process.stderr.write(`[deprecated] 'config set --key X --value Y' — use 'config-set X Y' instead (preserves nested YAML).\n`);

  const cfg = require(path.join(__dirname, 'lib', 'config.cjs'));
  return cfg.cmdSet(PROJECT_ROOT, key, value);
}

/**
 * notify send — post a message to configured webhook URLs.
 *
 * Config keys read from .rcode/config.yaml (top-level, flat):
 *   slack_webhook_url   — Slack incoming webhook
 *   discord_webhook_url — Discord webhook
 *   teams_webhook_url   — Microsoft Teams incoming webhook (MessageCard format)
 *
 * Flags:
 *   --title <t>   required headline
 *   --body <b>    optional detail text
 *   --event <e>   optional short event tag (e.g. "execute-done", "council-done")
 *   --only slack|discord|teams   restrict to one platform (for /rcode-notify-test)
 *
 * Returns: { sent: [...], skipped: [...], failed: [...] }
 * Never throws on webhook failure — this runs at the tail of workflows and
 * must not break the primary pipeline.
 */
async function cmdNotify(subArgs) {
  const sub = subArgs[0];
  if (sub !== 'send') {
    throw new Error("Unknown notify subcommand. Valid: send");
  }
  const flags = {};
  for (let i = 1; i < subArgs.length; i++) {
    if (subArgs[i].startsWith('--')) {
      flags[subArgs[i].slice(2)] = subArgs[i + 1] || '';
      i++;
    }
  }
  const title = flags.title || '';
  const body = flags.body || '';
  const event = flags.event || 'rcode';
  const only = flags.only || '';
  if (!title) throw new Error('notify send requires --title <text>');

  // Read config
  const configPath = path.join(RCODE_DIR, 'config.yaml');
  const config = fs.existsSync(configPath)
    ? parseSimpleYaml(fs.readFileSync(configPath, 'utf8'))
    : {};

  const targets = [
    { name: 'slack',   url: config.slack_webhook_url,   shape: buildSlackPayload },
    { name: 'discord', url: config.discord_webhook_url, shape: buildDiscordPayload },
    { name: 'teams',   url: config.teams_webhook_url,   shape: buildTeamsPayload },
  ];

  const sent = [], skipped = [], failed = [];
  for (const t of targets) {
    if (only && t.name !== only) continue;
    if (!t.url) { skipped.push({ platform: t.name, reason: 'no webhook configured' }); continue; }
    try {
      const payload = t.shape({ title, body, event, project: path.basename(PROJECT_ROOT) });
      const res = await fetch(t.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        failed.push({ platform: t.name, status: res.status, text: (await res.text()).slice(0, 200) });
      } else {
        sent.push({ platform: t.name });
      }
    } catch (e) {
      failed.push({ platform: t.name, error: String(e.message || e) });
    }
  }
  return { sent, skipped, failed };
}

function buildSlackPayload({ title, body, event, project }) {
  const lines = [`*${title}*`];
  if (body) lines.push(body);
  lines.push(`_project: ${project} · event: ${event}_`);
  return { text: lines.join('\n') };
}

function buildDiscordPayload({ title, body, event, project }) {
  return {
    embeds: [{
      title: title.slice(0, 256),
      description: (body || '').slice(0, 4000),
      footer: { text: `project: ${project} · event: ${event}` },
    }],
  };
}

// Teams legacy MessageCard — still accepted by Incoming Webhook connectors.
function buildTeamsPayload({ title, body, event, project }) {
  return {
    '@type': 'MessageCard',
    '@context': 'https://schema.org/extensions',
    themeColor: '0076D7',
    summary: title.slice(0, 256),
    title,
    text: body || '',
    sections: [{
      facts: [
        { name: 'Project', value: project },
        { name: 'Event', value: event },
      ],
    }],
  };
}

/**
 * notes list — glob .rcode/notes/*.md and ~/.rcode-notes/*.md,
 * parse frontmatter, return sorted array of {path, date, slug, summary}
 * (10 most recent).
 */
function cmdNotesList() {
  const noteDirs = [
    path.join(RCODE_DIR, 'notes'),
    path.join(process.env.HOME || '', '.rcode-notes'),
  ];

  const notes = [];
  for (const dir of noteDirs) {
    if (!fs.existsSync(dir)) continue;
    try {
      const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
      for (const file of files) {
        const filePath = path.join(dir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const { frontmatter, body } = parseFrontmatter(content);
        const summary = body.trim().split('\n')[0].slice(0, 50);
        notes.push({
          path: filePath,
          date: frontmatter.date || file.slice(0, 10),
          slug: frontmatter.slug || file.replace(/^[\d-]+/, '').replace(/\.md$/, ''),
          summary,
        });
      }
    } catch (err) {
      // Silently skip if directory cannot be read
    }
  }

  // Sort by date descending, take 10 most recent
  notes.sort((a, b) => b.date.localeCompare(a.date));
  return notes.slice(0, 10);
}

/**
 * notes count — return count of unpromoted notes in both .rcode/notes
 * and ~/.rcode-notes.
 */
function cmdNotesCount() {
  const noteDirs = [
    path.join(RCODE_DIR, 'notes'),
    path.join(process.env.HOME || '', '.rcode-notes'),
  ];

  let count = 0;
  for (const dir of noteDirs) {
    if (!fs.existsSync(dir)) continue;
    try {
      const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
      for (const file of files) {
        const filePath = path.join(dir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const { frontmatter } = parseFrontmatter(content);
        if (frontmatter.promoted !== 'true') count++;
      }
    } catch (err) {
      // Silently skip if directory cannot be read
    }
  }

  return { count };
}

/**
 * cmdHandoff — cross-skill continuation token system. Closes #741.
 *
 * Enables one workflow to write a structured "where I left off" token
 * that the next skill/workflow reads at startup — bridging the context
 * gap between chained agents.
 *
 * Subcommands:
 *   handoff write --from <skill> --to <skill> --phase <N> [--plan <M>] [--context "..."]
 *       Write a handoff token to ~/.rcode/handoffs/{from}-{to}-{date}.json
 *       and also to .rcode/handoff-latest.json for easy pickup by the next agent.
 *
 *   handoff read [--from <skill>]
 *       Read the most recent handoff targeting the current (or specified) skill.
 *       Returns JSON with: from, to, phase, plan, context, written_at.
 *       Exits 0 even when no handoff exists (returns {found: false}).
 *
 *   handoff clear
 *       Remove .rcode/handoff-latest.json (signal that the handoff was consumed).
 */
function cmdHandoff(args) {
  const os_mod      = require('os');
  const sub         = (args[0] || 'help').trim();
  const handoffsDir = path.join(os_mod.homedir(), '.rcode', 'handoffs');
  const latestPath  = path.join(RCODE_DIR, 'handoff-latest.json');

  if (sub === 'write') {
    const fromVal    = args[args.indexOf('--from') + 1]    || null;
    const toVal      = args[args.indexOf('--to') + 1]      || null;
    const phaseVal   = args[args.indexOf('--phase') + 1]   || null;
    const planVal    = args[args.indexOf('--plan') + 1]     || null;
    const ctxIdx     = args.indexOf('--context');
    const contextVal = ctxIdx !== -1 ? args.slice(ctxIdx + 1).join(' ') : null;
    if (!fromVal || !toVal) throw new Error('handoff write requires --from <skill> and --to <skill>');

    const token = {
      from: fromVal, to: toVal,
      phase: phaseVal || null, plan: planVal || null,
      context: contextVal || null,
      written_at: new Date().toISOString(),
    };

    try { fs.mkdirSync(handoffsDir, { recursive: true }); } catch {}
    const date   = new Date().toISOString().slice(0, 10);
    const fname  = `${fromVal}-${toVal}-${date}.json`;
    const fpath  = path.join(handoffsDir, fname);
    fs.writeFileSync(fpath, JSON.stringify(token, null, 2) + '\n');
    // Also write the "latest" shortcut into the project .rcode dir
    try {
      fs.mkdirSync(RCODE_DIR, { recursive: true });
      fs.writeFileSync(latestPath, JSON.stringify(token, null, 2) + '\n');
    } catch {}

    return { ok: true, token, written_to: [path.relative(PROJECT_ROOT, fpath), path.relative(PROJECT_ROOT, latestPath)] };
  }

  if (sub === 'read') {
    const fromFilter = args[args.indexOf('--from') + 1] || null;
    // Prefer .rcode/handoff-latest.json (written by the most recent handoff write)
    if (fs.existsSync(latestPath)) {
      try {
        const token = JSON.parse(fs.readFileSync(latestPath, 'utf8'));
        if (!fromFilter || token.from === fromFilter) {
          return { found: true, token, source: path.relative(PROJECT_ROOT, latestPath) };
        }
      } catch {}
    }
    // Fallback: scan ~/.rcode/handoffs/ for most recent matching file
    try {
      const files = fs.readdirSync(handoffsDir)
        .filter(f => f.endsWith('.json') && (!fromFilter || f.startsWith(fromFilter + '-')))
        .sort().reverse();
      if (files.length) {
        const token = JSON.parse(fs.readFileSync(path.join(handoffsDir, files[0]), 'utf8'));
        return { found: true, token, source: files[0] };
      }
    } catch {}
    return { found: false, token: null };
  }

  if (sub === 'clear') {
    try { fs.unlinkSync(latestPath); } catch {}
    return { ok: true, cleared: path.relative(PROJECT_ROOT, latestPath) };
  }

  return { ok: false, error: `Unknown handoff subcommand: ${sub}. Valid: write, read, clear` };
}


/**
 * cmdProjectStatus — classify project lifecycle state into one of:
 *   uninstalled    — no .rcode/config.yaml
 *   uninitialized  — config present, no state.json
 *   stub           — install-seeded scaffolding only (issue #670)
 *   real           — /rcode-new-project has run
 *
 * Real-project signals (any → real):
 *   - .planning/REQUIREMENTS.md exists
 *   - .planning/research/ directory exists
 *   - state.phases.length > 1
 *   - first phase name ≠ "Setup & Scaffolding"
 *
 * Closes #675 — single source of truth for "is this project initialized."
 */
function cmdProjectStatus() {
  const configPath = path.join(RCODE_DIR, 'config.yaml');
  const statePath = path.join(RCODE_DIR, 'state.json');
  const planningDir = path.join(PROJECT_ROOT, '.planning');

  if (!fs.existsSync(configPath)) return { ok: true, status: 'uninstalled' };
  if (!fs.existsSync(statePath)) return { ok: true, status: 'uninitialized' };

  let state;
  try { state = JSON.parse(fs.readFileSync(statePath, 'utf8')); }
  catch (e) { return { ok: false, error: `invalid state.json: ${e.message}` }; }

  const hasRequirements = fs.existsSync(path.join(planningDir, 'REQUIREMENTS.md'));
  const hasResearch = fs.existsSync(path.join(planningDir, 'research'));
  const phases = state.phases || [];
  const phaseCountReal = phases.length > 1;
  const firstPhaseName = phases[0]?.name || '';
  const phaseNameReal = firstPhaseName && firstPhaseName !== 'Setup & Scaffolding';

  const isReal = hasRequirements || hasResearch || phaseCountReal || phaseNameReal;
  const isStub = state._seeded_stub === true || !state.project || !isReal;

  let status;
  if (isReal) status = 'real';
  else if (isStub) status = 'stub';
  else status = 'uninitialized';

  return {
    ok: true,
    status,
    signals: {
      project: state.project || null,
      seeded_stub: state._seeded_stub === true,
      has_requirements: hasRequirements,
      has_research: hasResearch,
      phase_count: phases.length,
      first_phase_name: firstPhaseName || null,
    },
  };
}

/**
 * cmdValidatePhaseId — pure check that a phase ID conforms to rcode convention.
 *
 * Issue #718: workflows like `/rcode-plan` and `/rcode-audit` were producing
 * freestyled IDs like "A1", "B5", "phase-x". Phase IDs must be integer
 * (e.g. "19", "22") or decimal (e.g. "19.1", "22.3" — sub-phases under a
 * parent integer). Anything else gets rejected loudly so the caller can fix
 * the output before it pollutes ROADMAP.md.
 */
function cmdValidatePhaseId(id) {
  if (id === undefined || id === null || id === '') {
    return { ok: false, valid: false, error: 'no phase id provided' };
  }
  const str = String(id).trim();
  // Strip leading zeros for the integer pattern check (per feedback memory:
  // no leading zeros — phase 6 not 06). The integer pattern below already
  // forbids them but we want a clear error when the caller passes "06".
  if (/^0\d/.test(str)) {
    return { ok: false, valid: false, id: str, error: `leading zeros not allowed — use ${str.replace(/^0+/, '')}` };
  }
  // Accepted shape: <int>(.<int>)? — e.g. "19", "19.1", "22.3"
  const ok = /^([1-9]\d*)(\.[1-9]\d*)?$/.test(str);
  if (!ok) {
    return {
      ok: false,
      valid: false,
      id: str,
      error: `phase id "${str}" does not match integer or decimal pattern (e.g. 19, 19.1, 22)`,
    };
  }
  return { ok: true, valid: true, id: str, kind: str.includes('.') ? 'decimal' : 'integer' };
}

/**
 * cmdValidateRoadmap — scan .planning/ROADMAP.md for phase headings whose
 * IDs don't conform. Returns the list of offenders with line numbers so
 * the caller can flag them. Read-only — never modifies ROADMAP.
 */
function cmdValidateRoadmap() {
  const roadmapPath = path.join(PROJECT_ROOT, '.planning', 'ROADMAP.md');
  if (!fs.existsSync(roadmapPath)) {
    return { ok: true, valid: true, offenders: [], note: 'no ROADMAP.md' };
  }
  let text;
  try { text = fs.readFileSync(roadmapPath, 'utf8'); }
  catch (e) { return { ok: false, error: `read failed: ${e.message}` }; }

  const offenders = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match phase headings: "## Phase <id>" anywhere, also "### Phase <id>"
    const m = line.match(/^#{2,3}\s+Phase\s+([^\s—:–]+)/i);
    if (!m) continue;
    const id = m[1].trim();
    const r = cmdValidatePhaseId(id);
    if (!r.valid) {
      offenders.push({ line: i + 1, id, reason: r.error });
    }
  }
  return {
    ok: true,
    valid: offenders.length === 0,
    offenders,
    scanned: lines.length,
    roadmap: '.planning/ROADMAP.md',
  };
}

/**
 * cmdRoadmapDetectStructure — detect monolithic vs per-milestone ROADMAP layout.
 * Closes #734. Reports which convention is in use so workflows can branch correctly
 * instead of assuming a single ROADMAP.md.
 *
 * Conventions detected:
 *   monolithic   — .planning/ROADMAP.md (single file, all milestones)
 *   per-milestone — .planning/ROADMAP-M{N}.md or .planning/milestones/{N}-*.md
 *   hybrid        — both patterns present
 *   absent        — no ROADMAP files found at all
 */
function cmdRoadmapDetectStructure() {
  const planningDir = path.join(PROJECT_ROOT, '.planning');
  const monoPath    = path.join(planningDir, 'ROADMAP.md');
  const hasMono     = fs.existsSync(monoPath);

  let perMilestoneFiles = [];
  try {
    const files = fs.readdirSync(planningDir);
    // ROADMAP-M1.md, ROADMAP-M2.md, ROADMAP-milestone-name.md
    perMilestoneFiles = files.filter(f => /^ROADMAP-[A-Za-z0-9].*\.md$/.test(f) && f !== 'ROADMAP.md');
  } catch {}

  let milestoneDirFiles = [];
  const msDir = path.join(planningDir, 'milestones');
  if (fs.existsSync(msDir)) {
    try { milestoneDirFiles = fs.readdirSync(msDir).filter(f => f.endsWith('.md')); } catch {}
  }

  const hasPerMilestone = perMilestoneFiles.length > 0 || milestoneDirFiles.length > 0;

  let structure;
  if (hasMono && hasPerMilestone) structure = 'hybrid';
  else if (hasMono)               structure = 'monolithic';
  else if (hasPerMilestone)       structure = 'per-milestone';
  else                            structure = 'absent';

  return {
    ok: true,
    structure,
    monolithic_file: hasMono ? '.planning/ROADMAP.md' : null,
    per_milestone_files: [
      ...perMilestoneFiles.map(f => `.planning/${f}`),
      ...milestoneDirFiles.map(f => `.planning/milestones/${f}`),
    ],
    recommendation: structure === 'monolithic'
      ? 'Standard layout. Use /rcode-plan and /rcode-execute normally.'
      : structure === 'per-milestone'
      ? 'Per-milestone layout detected. Pass the specific ROADMAP file to rcode-roadmapper with --roadmap <path>.'
      : structure === 'hybrid'
      ? 'Mixed layout. Consolidate to one convention to avoid workflow confusion.'
      : 'No ROADMAP found. Run /rcode-new-project or /rcode-new-milestone first.',
  };
}

/**
 * cmdMilestoneHealth — gauge for the current milestone (issue #718).
 *
 * Counts open vs done phases under the current milestone and recommends
 * action when the milestone is getting unwieldy. Workflows like
 * /rcode-add-phase and /rcode-status read this to nudge users toward
 * /rcode-complete-milestone before the phase list balloons.
 *
 * Thresholds (kept conservative — bump in config later if needed):
 *   - "consider closing" when >= 8 open phases under one milestone
 *   - "should close" when >= 12 open phases (hard nudge)
 *
 * Fix #893 — open-phase count is now scoped to the CURRENT milestone only.
 * Phases that belong to a prior milestone (different ## MN heading in
 * ROADMAP.md) are excluded so M2 phases never inflate M3's count.
 */
function cmdMilestoneHealth() {
  const statePath = path.join(RCODE_DIR, 'state.json');
  if (!fs.existsSync(statePath)) return { ok: true, milestone: null, note: 'no state.json' };
  let state;
  try { state = JSON.parse(fs.readFileSync(statePath, 'utf8')); }
  catch (e) { return { ok: false, error: `invalid state.json: ${e.message}` }; }

  // Prefer state.milestone; fall back to state.current_milestone for compat.
  const milestone = state.milestone || state.current_milestone || null;
  const allPhases = Array.isArray(state.phases) ? state.phases : [];

  // --- milestone-scoped phase filtering (#893) ---
  // Parse ROADMAP.md to find which phase numbers belong to the current
  // milestone heading (## M1, ## Milestone 2, etc.). When ROADMAP is absent
  // or the milestone can't be matched, fall back to ALL phases so the health
  // check still works on unstructured projects.
  let milestonePhasesNumbers = null; // null = no filtering
  const roadmapPath = path.join(PROJECT_ROOT, '.planning', 'ROADMAP.md');
  if (milestone && fs.existsSync(roadmapPath)) {
    try {
      const text = fs.readFileSync(roadmapPath, 'utf8');
      const lines = text.split('\n');
      // Find the heading that matches the current milestone label.
      // Accepted forms: "## M3", "## Milestone 3", "## M3 — Some Title", etc.
      const milestoneId = String(milestone).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const milestoneHeadRe = new RegExp(`^#{1,3}\\s+${milestoneId}[\\s—:\\-]`, 'i');
      const milestoneHeadBareRe = new RegExp(`^#{1,3}\\s+${milestoneId}\\s*$`, 'i');
      // Any milestone-level heading that is NOT a Phase heading
      const anyMilestoneHeadRe = /^#{1,3}\s+(?!Phase\s)/i;

      let inCurrentMilestone = false;
      const phaseNums = new Set();
      const phaseRowRe = /^\|\s*(\d+(?:\.\d+)?)\s*\|/;
      const phaseHeadRe = /^#{2,4}\s*Phase\s+(\d+(?:\.\d+)?)/i;

      for (const line of lines) {
        if (milestoneHeadRe.test(line) || milestoneHeadBareRe.test(line)) {
          inCurrentMilestone = true;
          continue;
        }
        // A different milestone-level heading ends this section
        if (inCurrentMilestone && anyMilestoneHeadRe.test(line) &&
            !milestoneHeadRe.test(line) && !milestoneHeadBareRe.test(line)) {
          break;
        }
        if (inCurrentMilestone) {
          const rm = phaseRowRe.exec(line);
          if (rm) { phaseNums.add(rm[1]); continue; }
          const rh = phaseHeadRe.exec(line);
          if (rh) { phaseNums.add(rh[1]); }
        }
      }
      if (phaseNums.size > 0) milestonePhasesNumbers = phaseNums;
    } catch { /* ROADMAP unreadable — skip filtering */ }
  }

  // Select only phases that belong to the current milestone, or all if
  // ROADMAP filtering wasn't possible.
  const phases = milestonePhasesNumbers
    ? allPhases.filter(p => {
        const num = String(p.number ?? p.id ?? '').trim();
        return milestonePhasesNumbers.has(num);
      })
    : allPhases;

  // "Open" = not done. State schema uses status: 'planned' | 'in_progress' |
  // 'complete' | 'completed' | 'verified' | 'shipped'. Treat anything not in
  // that set as open. Fix #897 — 'complete' was excluded, causing
  // milestone-health to report done phases as open.
  const doneStatuses = new Set(['complete', 'completed', 'verified', 'shipped']);
  const open = phases.filter(p => !doneStatuses.has(p.status));
  const done = phases.filter(p => doneStatuses.has(p.status));

  let recommendation = 'healthy';
  if (open.length >= 12) recommendation = 'should-close';
  else if (open.length >= 8) recommendation = 'consider-closing';

  return {
    ok: true,
    milestone,
    phase_count: phases.length,
    open_phases: open.length,
    completed_phases: done.length,
    recommendation,
    threshold_consider: 8,
    threshold_should: 12,
    milestone_scoped: milestonePhasesNumbers !== null,
  };
}

// #942 — build a milestone-health summary + human-readable nudge for any
// phase-adding code path (single add, bulk draft, plan, insert) so the
// "milestone has too many open phases" guidance can't be bypassed by adding
// phases outside the add-phase workflow. Returns { milestone_health, nudge }.
function milestoneCloseNudge() {
  let h;
  try { h = cmdMilestoneHealth(); } catch { return { milestone_health: null, nudge: null }; }
  if (!h || !h.ok) return { milestone_health: null, nudge: null };
  const summary = {
    open_phases: h.open_phases,
    recommendation: h.recommendation,
    threshold_should: h.threshold_should,
    threshold_consider: h.threshold_consider,
  };
  let nudge = null;
  if (h.recommendation === 'should-close') {
    nudge = `Milestone "${h.milestone || 'current'}" has ${h.open_phases} open phases ` +
      `(≥${h.threshold_should}). Consider /rcode-complete-milestone to archive done ` +
      `phases, then /rcode-new-milestone for ongoing work — before adding more.`;
  } else if (h.recommendation === 'consider-closing') {
    nudge = `Milestone "${h.milestone || 'current'}" has ${h.open_phases} open phases ` +
      `(≥${h.threshold_consider}). Getting large — /rcode-complete-milestone + ` +
      `/rcode-new-milestone will keep the roadmap navigable.`;
  }
  return { milestone_health: summary, nudge };
}

function cmdFindFiles(rawArgs) {
  const flags = {};
  const parts = rawArgs.split(/\s+/).filter(p => p);
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].startsWith('--')) {
      const key = parts[i].slice(2);
      flags[key] = parts[i + 1] || true;
      if (parts[i + 1] && !parts[i + 1].startsWith('--')) i++;
    }
  }
  const type = flags.type || 'all';
  const patterns = {
    'design-tokens': ['tailwind.config.*','tokens.*','design-tokens*','**/theme.*','**/colors.*'],
    'colors': ['**/colors.*','**/palette.*','**/theme.*'],
    'fonts': ['**/fonts.*','**/typography.*','**/font.css'],
    'all': ['**/*'],
  }[type] || ['**/*'];
  const matches = [];
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    try {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.name.startsWith('.') || e.name === 'node_modules') continue;
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.isFile()) {
          for (const pat of patterns) {
            const re = new RegExp(pat.replace(/\*\*/g,'.*').replace(/\*/g,'[^/]*').replace(/\./g,'\\.'));
            if (re.test(e.name) || re.test(p)) { matches.push(p); break; }
          }
        }
      }
    } catch (err) {
      // Silently skip directories we can't read
    }
  }
  walk(PROJECT_ROOT);
  return { ok: true, type, matches };
}

// Closes #739 — parse human duration strings into milliseconds.
// Supports: '30m' → 1800000, '2h' → 7200000, '1d' → 86400000.
function parseDuration(str) {
  if (!str || typeof str !== 'string') return 3600000; // default 1h
  const m = str.trim().match(/^(\d+(?:\.\d+)?)([smhd]?)$/i);
  if (!m) return 3600000;
  const n = parseFloat(m[1]);
  switch ((m[2] || 'h').toLowerCase()) {
    case 'd': return Math.round(n * 86400000);
    case 'h': return Math.round(n * 3600000);
    case 'm': return Math.round(n * 60000);
    case 's': return Math.round(n * 1000);
    default:  return Math.round(n * 3600000);
  }
}

async function main() {
  const [, , subcommand, ...args] = process.argv;
  // #473 guard runs before any subcommand. Skipped for read-only inspection
  // so 'rcode-tools version' / 'help' / 'list-agents' work outside the project.
  const READ_ONLY_SUBCOMMANDS = new Set(['version', 'help', '--help', '-h', undefined, 'list-agents', 'agent-info', 'agent-skills', 'validate']);
  if (!READ_ONLY_SUBCOMMANDS.has(subcommand)) {
    assertCwdMatchesProjectRoot();
  }
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
        else if (args[0] === 'validate-evidence') {
          result = cmdPlanValidateEvidence(args.slice(1));
          // Issue #649 — non-zero exit on violations so CI / sprint-checker can gate.
          console.log(JSON.stringify(result, null, 2));
          process.exit(result.ok ? 0 : 1);
        }
        else if (args[0] === 'check-wave-overlaps') {
          result = cmdPlanCheckWaveOverlaps(args.slice(1).join(' '));
        }
        else { console.error('Unknown plan subcommand. Valid: list, validate-evidence, check-wave-overlaps'); process.exit(1); }
        break;
      case 'phase-plan-index':
        result = cmdPhasePlanIndex(args.join(' '));
        break;
      case 'classify-plan':
        result = cmdClassifyPlan(args);
        break;
      case 'phases':
        if (args[0] === 'list') { result = cmdPhasesList(args.slice(1)); if (result === undefined) return; }
        else { console.error('Unknown phases subcommand. Valid: list'); process.exit(1); }
        break;
      case 'customize': {
        const customize = require(path.join(__dirname, 'lib', 'customize.cjs'));
        result = customize.dispatch(RCODE_DIR, args);
        break;
      }
      case 'memlog': {
        const memlog = require(path.join(__dirname, 'lib', 'memlog.cjs'));
        result = memlog.dispatch(PLANNING_DIR, args);
        break;
      }
      case 'find-phase':
        result = cmdFindPhase(args);
        break;
      case 'audit-uat':
        result = cmdAuditUat(args);
        break;
      case 'uat':
        if (args[0] === 'render-checkpoint') {
          const r = cmdUatRenderCheckpoint(args.slice(1));
          if (r && r.__raw) { console.log(r.__raw); return; }
          result = r;
        } else { console.error('Unknown uat subcommand. Valid: render-checkpoint'); process.exit(1); }
        break;
      case 'requirements':
        if (args[0] === 'mark-complete') { result = cmdRequirementsMarkComplete(args.slice(1)); }
        else { console.error('Unknown requirements subcommand. Valid: mark-complete'); process.exit(1); }
        break;
      case 'todo':
        if (args[0] === 'match-phase') { result = cmdTodoMatchPhase(args.slice(1)); }
        else { console.error('Unknown todo subcommand. Valid: match-phase'); process.exit(1); }
        break;
      case 'learnings':
        if (args[0] === 'copy') { result = cmdLearningsCopy(args.slice(1)); }
        else { console.error('Unknown learnings subcommand. Valid: copy'); process.exit(1); }
        break;
      case 'docs-audit':
        result = cmdDocsAudit(args);
        break;
      case 'workflow-config-audit':
        result = cmdWorkflowConfigAudit();
        break;
      case 'frontmatter':
        if (args[0] === 'get') { cmdFrontmatterGet(args.slice(1)); return; }
        else { console.error('Unknown frontmatter subcommand. Valid: get'); process.exit(1); }
      case 'notes':
        if (args[0] === 'list') { result = cmdNotesList(); }
        else if (args[0] === 'count') { result = cmdNotesCount(); }
        else { console.error('Unknown notes subcommand. Valid: list, count'); process.exit(1); }
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
      case 'phase':
        result = cmdPhase(args);
        break;
      case 'commit':
        result = cmdCommit(args);
        break;
      case 'commit-to-subrepo':
        result = cmdCommitToSubrepo(args);
        break;
      case 'generate-claude-md':
        result = cmdGenerateClaudeMd(args.join(' '));
        break;
      case 'check-implementation-readiness':
        result = cmdCheckImplementationReadiness(args.join(' '));
        break;
      case 'classify-tech':
        result = cmdClassifyTech(args.join(' '));
        break;
      case 'context':
        if (args[0] === 'refresh') {
          result = cmdContextRefresh();
        } else {
          console.error('Unknown context subcommand. Valid: refresh');
          process.exit(1);
        }
        break;
      case 'module':
        result = cmdModule(args);
        break;
      case 'resolve-model':
        result = cmdResolveModel(args[0]);
        break;
      case 'set-model': {
        // Accepts profile names (balanced/budget/quality/inherit) or model IDs (claude-sonnet-4-6).
        // Profile names write model_profile and clear model_override.
        // Model IDs write model_override directly (bypasses profile logic).
        const cfg = require(path.join(__dirname, 'lib', 'config.cjs'));
        const input = (args[0] || '').trim();
        if (!input) {
          console.error('Usage: set-model <balanced|budget|quality|inherit|claude-MODEL-ID>');
          process.exit(1);
        }
        const PROFILES = new Set(['balanced', 'budget', 'quality', 'inherit']);
        const MODEL_ALIASES = {
          'sonnet': 'balanced', 'haiku': 'budget', 'opus': 'quality',
          'claude-sonnet-4-6': 'balanced', 'claude-haiku-4-5-20251001': 'budget',
          'claude-opus-4-7': 'quality',
        };
        if (PROFILES.has(input)) {
          cfg.cmdSet(PROJECT_ROOT, 'model_profile', input);
          cfg.cmdSet(PROJECT_ROOT, 'model_override', '');
          result = { set: 'model_profile', value: input };
        } else if (MODEL_ALIASES[input]) {
          cfg.cmdSet(PROJECT_ROOT, 'model_profile', MODEL_ALIASES[input]);
          cfg.cmdSet(PROJECT_ROOT, 'model_override', '');
          result = { set: 'model_profile', value: MODEL_ALIASES[input], alias: input };
        } else if (input.startsWith('claude-')) {
          cfg.cmdSet(PROJECT_ROOT, 'model_override', input);
          result = { set: 'model_override', value: input };
        } else {
          console.error(`Unknown model or profile: '${input}'. Valid profiles: balanced, budget, quality, inherit. Or pass a full model ID like claude-sonnet-4-6`);
          process.exit(1);
        }
        break;
      }
      case 'get-model': {
        const config = readConfig();
        if (config.model_override) {
          result = { source: 'override', model: config.model_override };
        } else {
          const profile = config.model_profile || 'balanced';
          const MODEL_FOR_PROFILE = { balanced: 'claude-sonnet-4-6', budget: 'claude-haiku-4-5-20251001', quality: 'claude-opus-4-7 (reasoning agents) / claude-sonnet-4-6 (others)', inherit: null };
          result = { source: 'profile', profile, model: MODEL_FOR_PROFILE[profile] || profile };
        }
        break;
      }
      case 'config':
        if (args[0] === 'set') {
          result = cmdConfigSet(args.slice(1));
        } else {
          console.error('Unknown config subcommand. Valid: set');
          process.exit(1);
        }
        break;
      case 'notify':
        result = await cmdNotify(args);
        break;
      case 'find-files':
        result = cmdFindFiles(args.join(' '));
        break;
      case 'verify-references': {
        const planPath = args[0];
        if (!planPath) { console.error('Usage: verify-references <plan-path>'); process.exit(1); }
        const cr = require(path.join(__dirname, 'lib', 'code-references.cjs'));
        const text = fs.readFileSync(planPath, 'utf8');
        const refs = cr.extractReferences(text);
        const result = cr.verifyReferences(refs, PROJECT_ROOT);
        console.log(JSON.stringify(result, null, 2));
        return;
      }
      case 'validate': {
        // #747 — schema checks for state.json and config.yaml.
        // Usage: rcode-tools validate state|config|all
        const target = args[0] || 'all';
        if (!['state', 'config', 'all'].includes(target)) {
          console.error(`Unknown validate target: '${target}'. Valid: state, config, all`);
          process.exit(1);
        }
        const validateErrors = [];

        if (target === 'state' || target === 'all') {
          // Read state.json directly — readState() is scoped inside cmdState()
          // and isn't reachable here (#940). Validate against the REAL schema:
          // phases[] + milestones[], current_phase nullable on fresh installs.
          const statePathV = path.join(RCODE_DIR, 'state.json');
          if (!fs.existsSync(statePathV)) {
            validateErrors.push('state: state.json not found — run rcode install');
          } else {
            let state = null;
            try {
              state = JSON.parse(fs.readFileSync(statePathV, 'utf8'));
            } catch (e) {
              validateErrors.push(`state: invalid JSON — ${e.message}`);
            }
            if (state) {
              // current_phase is legitimately null on a fresh / stub project,
              // so do NOT require it. milestones is an array (no current_milestone field).
              // schema_version 1 is valid on disk — migrateState() upgrades it to 2
              // transparently on read, so accept either and only flag the unknown.
              if (state.schema_version != null && ![1, 2].includes(state.schema_version)) {
                validateErrors.push(`state: unknown schema_version ${state.schema_version} (expected 1 or 2)`);
              }
              if (state.phases != null && !Array.isArray(state.phases) && typeof state.phases !== 'object') {
                validateErrors.push('state: phases must be an array or object');
              }
              if (state.milestones != null && !Array.isArray(state.milestones)) {
                validateErrors.push('state: milestones must be an array');
              }
            }
          }
        }

        if (target === 'config' || target === 'all') {
          // config.yaml holds project identity + workflow prefs only — it does
          // NOT track current_phase (that lives in state.json). Only require
          // the fields config actually owns (#940).
          const config = readConfig();
          if (!config.project_name) validateErrors.push('config: missing project_name');
        }

        if (validateErrors.length) {
          validateErrors.forEach(e => console.error('❌ ' + e));
          process.exit(1);
        } else {
          console.log('✅ All artifacts valid');
        }
        return;
      }
      case 'roadmap': {
        const roadmap = require(path.join(__dirname, 'lib', 'roadmap.cjs'));
        const r = roadmap.dispatch(PROJECT_ROOT, args);
        if (r && typeof r === 'object' && '__raw' in r) {
          console.log(r.__raw);
          return;
        }
        result = r;
        break;
      }
      case 'config-get': {
        const cfg = require(path.join(__dirname, 'lib', 'config.cjs'));
        const val = cfg.cmdGet(PROJECT_ROOT, args[0]);
        if (val !== null && val !== undefined) console.log(val);
        return;
      }
      case 'config-set': {
        const cfg = require(path.join(__dirname, 'lib', 'config.cjs'));
        const csKey = args[0];
        const csVal = args.slice(1).join(' ');
        result = cfg.cmdSet(PROJECT_ROOT, csKey, csVal);
        // Fix #855 — keep state.json in sync when current_phase is updated via config-set.
        // One-way: config-set → state.json. The set-phase path writes config.yaml separately (below).
        if (csKey === 'current_phase' && csVal) {
          const stJson = readState() || defaultState();
          if (stJson.current_phase !== csVal) {
            stJson.current_phase = csVal;
            stJson.current_plan = 0;
            writeState(stJson);
          }
        }
        break;
      }
      case 'config-check-yolo': {
        // Closes #739. Evaluate whether yolo mode is active for a given scope.
        // Usage: config-check-yolo [--phase <N>] [--workflow <name>]
        // Returns JSON: { active: bool, mode, scope, expires_at, reason }
        const cfg = require(path.join(__dirname, 'lib', 'config.cjs'));
        const phaseArg    = args[args.indexOf('--phase') + 1]    || null;
        const workflowArg = args[args.indexOf('--workflow') + 1] || null;
        const mode        = cfg.cmdGet(PROJECT_ROOT, 'mode') || 'guided';
        if (mode !== 'yolo') {
          result = { active: false, mode, scope: null, expires_at: null, reason: 'mode is not yolo' };
          break;
        }
        // Check optional yolo_scope restriction
        const scopeRaw = cfg.cmdGet(PROJECT_ROOT, 'yolo_scope') || null;
        if (scopeRaw) {
          const scope = String(scopeRaw).trim();
          // scope format: "phase:N" | "workflow:name" | "global"
          if (scope.startsWith('phase:') && phaseArg) {
            const allowedPhase = scope.slice('phase:'.length).trim();
            if (String(phaseArg) !== allowedPhase) {
              result = { active: false, mode, scope, expires_at: null, reason: `yolo_scope restricts to phase ${allowedPhase}, current is ${phaseArg}` };
              break;
            }
          } else if (scope.startsWith('workflow:') && workflowArg) {
            const allowedWf = scope.slice('workflow:'.length).trim();
            if (workflowArg !== allowedWf) {
              result = { active: false, mode, scope, expires_at: null, reason: `yolo_scope restricts to workflow ${allowedWf}, current is ${workflowArg}` };
              break;
            }
          }
        }
        // Check optional TTL
        const ttlRaw = cfg.cmdGet(PROJECT_ROOT, 'yolo_ttl') || null;
        let expiresAt = null;
        if (ttlRaw) {
          expiresAt = ttlRaw;
          const expiry = new Date(ttlRaw);
          if (!Number.isNaN(expiry.getTime()) && Date.now() > expiry.getTime()) {
            result = { active: false, mode, scope: scopeRaw, expires_at: ttlRaw, reason: `yolo_ttl expired at ${ttlRaw}` };
            break;
          }
        }
        result = { active: true, mode, scope: scopeRaw || 'global', expires_at: expiresAt, reason: 'yolo active' };
        break;
      }
      case 'yolo': {
        // Closes #739 — scoped yolo mode with TTL and milestone/phase scope.
        // Usage:
        //   yolo scoped --ttl 2h --scope milestone   → enable for current milestone
        //   yolo scoped --ttl 30m --scope phase       → enable for current phase
        //   yolo off                                  → disable immediately
        //   yolo status                               → show current yolo state
        const sub = args[0];
        const cfg = require(path.join(__dirname, 'lib', 'config.cjs'));
        switch (sub) {
          case 'scoped': {
            const ttlArg = (args.find(a => a.startsWith('--ttl='))?.slice(6))
              || (args.indexOf('--ttl') !== -1 ? args[args.indexOf('--ttl') + 1] : null)
              || '1h';
            const scope = (args.find(a => a.startsWith('--scope='))?.slice(8))
              || (args.indexOf('--scope') !== -1 ? args[args.indexOf('--scope') + 1] : null)
              || 'phase';
            const ms = parseDuration(ttlArg);
            const expires = Date.now() + ms;
            const st = readState() || {};
            st.yolo = {
              enabled: true,
              expires,
              scope,
              milestone: st.current_milestone || null,
              phase: st.current_phase || null,
            };
            writeState(st);
            // Also persist to config.yaml so config-check-yolo can read it.
            cfg.cmdSet(PROJECT_ROOT, 'mode', 'yolo');
            cfg.cmdSet(PROJECT_ROOT, 'yolo_scope', scope === 'milestone'
              ? `milestone:${st.current_milestone || 'unknown'}`
              : `phase:${st.current_phase || 'unknown'}`);
            cfg.cmdSet(PROJECT_ROOT, 'yolo_ttl', new Date(expires).toISOString());
            result = { ok: true, enabled: true, scope, ttl: ttlArg, expires: new Date(expires).toISOString() };
            console.log(`Yolo mode: enabled (${scope} scope, expires in ${ttlArg})`);
            break;
          }
          case 'off': {
            const st = readState() || {};
            st.yolo = { enabled: false };
            writeState(st);
            cfg.cmdSet(PROJECT_ROOT, 'mode', 'guided');
            cfg.cmdSet(PROJECT_ROOT, 'yolo_scope', '');
            cfg.cmdSet(PROJECT_ROOT, 'yolo_ttl', '');
            result = { ok: true, enabled: false };
            console.log('Yolo mode: off');
            break;
          }
          case 'status': {
            const st = readState() || {};
            const y = st.yolo;
            if (!y?.enabled || Date.now() > (y.expires || 0)) {
              result = { active: false };
              console.log('Yolo mode: off');
            } else {
              const remainingMs = y.expires - Date.now();
              const remainingMin = Math.round(remainingMs / 60000);
              result = { active: true, scope: y.scope, expires: new Date(y.expires).toISOString(), remaining_min: remainingMin };
              console.log(`Yolo mode: on (${y.scope} scope, ${remainingMin}m remaining)`);
            }
            break;
          }
          default: {
            console.error('Usage: yolo <scoped|off|status>');
            console.error('  yolo scoped --ttl <2h|30m|1d> --scope <milestone|phase>');
            console.error('  yolo off');
            console.error('  yolo status');
            process.exit(1);
          }
        }
        break;
      }
      case 'verify': {
        const verify = require(path.join(__dirname, 'lib', 'verify.cjs'));
        result = verify.dispatch(PROJECT_ROOT, args);
        break;
      }
      case 'brain': {
        const brain = require(path.join(__dirname, 'lib', 'brain.cjs'));
        result = brain.cmdBrain(args, { PROJECT_ROOT, RCODE_DIR });
        break;
      }
      case 'handoff': {
        result = cmdHandoff(args);
        break;
      }
      case 'progress': {
        const progress = require(path.join(__dirname, 'lib', 'progress.cjs'));
        result = progress.cmdProgress(args, { PROJECT_ROOT, RCODE_DIR, PLANNING_DIR });
        break;
      }
      case 'summary-extract': {
        const summary = require(path.join(__dirname, 'lib', 'summary.cjs'));
        result = summary.cmdSummaryExtract(args);
        break;
      }
      case 'state-snapshot': {
        const summary = require(path.join(__dirname, 'lib', 'summary.cjs'));
        result = summary.cmdStateSnapshot({ RCODE_DIR });
        break;
      }
      case 'gitignore': {
        const gitignore = require(path.join(__dirname, 'lib', 'gitignore.cjs'));
        result = gitignore.cmdGitignore(args, { PROJECT_ROOT, RCODE_DIR });
        break;
      }
      case 'agent-skills':
        result = cmdAgentInfo(args[0]);
        break;
      case 'project-status':
        result = cmdProjectStatus();
        break;
      case 'validate-phase-id':
        result = cmdValidatePhaseId(args[0]);
        break;
      case 'validate-roadmap':
        result = cmdValidateRoadmap();
        break;
      case 'roadmap-detect-structure':
        result = cmdRoadmapDetectStructure();
        break;
      case 'milestone-health':
        result = cmdMilestoneHealth();
        break;
      case 'health': {
        // Closes #836 — top-level health check so agents can call
        // `rcode-tools.cjs health` directly without the CLI wrapper.
        // Returns a combined snapshot: milestone health + state snapshot + project status.
        const summary = require(path.join(__dirname, 'lib', 'summary.cjs'));
        const mh = cmdMilestoneHealth();
        const ss = summary.cmdStateSnapshot({ RCODE_DIR });
        const ps = cmdProjectStatus();
        result = { ok: mh.ok && ss.ok, milestone_health: mh, state: ss, project: ps };
        break;
      }
      case 'version':
        console.log(readPackageVersion());
        return;
      case 'help':
      case '--help':
      case '-h':
      case undefined:
        console.log('Usage: rcode-tools.cjs <init|select-panel|classify-question|agent-info|agent-skills|list-agents|state|module|plan|notes|config|config-get|config-set|roadmap|verify|notify|resolve-model|version|help> [args]');
        console.log('');
        console.log('Top-level subcommands:');
        console.log('  init                                         → initialize .rcode directory structure');
        console.log('  select-panel                                 → choose council panel members');
        console.log('  classify-question                            → categorize user questions');
        console.log('  agent-info <name>                            → show agent metadata and skills');
        console.log('  agent-skills <name>                          → alias for agent-info');
        console.log('  list-agents                                  → list all available rcode agents');
        console.log('  state <subcommand> [args]                    → manage .rcode/state.json');
        console.log('  phase add <name> [--decimal <parent>]        → add phase (integer to current milestone, or --decimal slots under parent as parent.M)');
        console.log('  phase next-range [count]                     → return next N contiguous free phase numbers (#730)');
        console.log('  phase scaffold-milestone --names "n1|n2|..." → bulk-create phase folders for a milestone (#731)');
        console.log('  phase scaffold-all                           → create missing phase folders for all phases in ROADMAP.md (#731)');
        console.log('  phase rename-dir <N> [--apply]               → align a phase dir slug with its ROADMAP name (dry-run by default)');
        console.log('  customize <resolve <name>|list|init <name>>  → per-workflow overrides in .rcode/custom/ that survive an update');
        console.log('  memlog <init|append|read|open>               → append-only run memory (.planning/MEMLOG.md)');
        console.log('    memlog append --type <decision|change|override|assumption|event|blocker> --text "..." [--phase N]');
        console.log('  workflow-config-audit                        → find workflows still referencing .planning/config.json (#733)');
        console.log('  commit "<msg>" [--files p1 p2 ...]          → atomic git commit with conventional-commits validation (no AI attribution, no --no-verify, no auto-push)');
        console.log('  commit-to-subrepo --subrepo <p> "<msg>"     → atomic commit inside a git subrepo (same validation as commit)');
        console.log('  generate-claude-md [--force]                 → bootstrap a project CLAUDE.md scaffold (refuses to overwrite without --force)');
        console.log('  check-implementation-readiness --phase <N>  → verify preconditions before phase planning; returns {ready, blockers}');
        console.log('  classify-tech --keywords "<keywords>"        → classify tech stack from keywords (frontend/backend/mobile/styling)');
        console.log('  context refresh                              → refresh .rcode/context/ cache from .rcode/sources.yaml');
        console.log('  module <subcommand> [args]                   → module system helpers');
        console.log('  plan <list|validate-evidence|check-wave-overlaps>  → phase/plan operations');
        console.log('  plan validate-evidence <N> [--spot-check]    → enforce <evidence> blocks in SPRINT.md (#649); exit 1 on violation');
        console.log('  plan check-wave-overlaps <N>                 → detect same-wave plans sharing files_modified (#768)');
        console.log('  phase-plan-index <N>                         → JSON inventory of plans under phase N (waves, summary status, task counts)');
        console.log('  phases list [--type X] [--pick path]         → directory inventory of .planning/phases (--type: summaries|sprints|directories|all; --pick: e.g. directories[-1])');
        console.log('  find-phase <N> [--raw]                       → resolve phase number to dir/slug + decimal children');
        console.log('  audit-uat [--raw]                            → walk all UAT files, return inventory + status counts');
        console.log('  uat render-checkpoint --file <p>             → render markdown UAT checkpoint block from file');
        console.log('  requirements mark-complete <ID> [<ID>...]    → flip status to complete in REQUIREMENTS.md');
        console.log('  todo match-phase <N>                         → return todos with matching phase tag');
        console.log('  learnings copy                               → soft-fail copy of phase LEARNINGS.md to ~/.rcode/learnings/');
        console.log('  docs-audit                                   → list docs missing per documentation-requirements.csv');
        console.log('  frontmatter get <file> --field <name>        → print one frontmatter field value (empty if absent)');
        console.log('  notes <subcommand> [args]                    → manage project notes');
        console.log('  config <subcommand> [args]                   → read/write project config');
        console.log('  notify send --title "<t>" [--body "<b>"] [--event <e>] [--only slack|discord|teams]  → post to configured webhooks');
        console.log('  roadmap <get-phase|list-phases|update-plan-progress|clear|detect>  → .planning/ROADMAP.md operations');
        console.log('  roadmap detect                               → report ROADMAP convention in use (single vs per-milestone) (#734)');
        console.log('  validate <state|config|all>                  → schema checks for state.json and config.yaml (#747)');
        console.log('  config-get <dotted.key>                      → read scalar from .rcode/config.yaml');
        console.log('  config-set <dotted.key> <value>              → atomically set a value in .rcode/config.yaml');
        console.log('  config-check-yolo [--phase N] [--workflow W] → check if yolo mode is active for scope (#739)');
        console.log('  yolo scoped --ttl <2h|30m|1d> --scope <milestone|phase>  → enable scoped yolo with TTL (#739)');
        console.log('  yolo off                                     → disable yolo mode immediately');
        console.log('  yolo status                                  → show current yolo state and remaining TTL');
        console.log('  handoff write --from <skill> --to <skill> --phase N [--context "..."] → write cross-skill handoff token (#741)');
        console.log('  handoff read [--from <skill>]               → read most recent handoff for this skill (#741)');
        console.log('  handoff clear                               → consume (clear) the latest handoff token (#741)');
        console.log('    yolo_scope config keys: "global" | "phase:N" | "workflow:name"');
        console.log('    yolo_ttl config key: ISO timestamp — yolo auto-expires after this time');
        console.log('  verify schema-drift <phase> [--block]        → detect schema vs migration drift across phase commits');
        console.log('  resolve-model <agent-id>                     → resolve model string for agent under current profile');
  console.log('  set-model <profile|model-id>                 → set model_profile or model_override in config.yaml');
  console.log('  get-model                                    → print current effective model (override or profile)');
        console.log('  version                                      → print rcode-tools version');
        console.log('  help                                         → print this help text');
        console.log('');
        console.log('State subcommands:');
        console.log('  state read                                   → print full state.json');
        console.log('  state get                                    → alias for state read');
        console.log('  state init --project <name>                  → create state.json if missing');
        console.log('  state set-phase <name>                       → set current_phase, reset current_plan, append to phases[]');
        console.log('  state advance-plan                           → increment current_plan counter');
        console.log('  state snapshot                               → write state.json to .planning/STATE.md');
        console.log('  state update-progress [--sprint NN.S]        → increment current_plan, or mark sprint complete');
        console.log('  state record-execution --plan <p> --tasks <n> --duration <ms> --hash <h>');
        console.log('  state add-decision "<summary>"               → append to decisions[] + ~/.rcode/decisions.jsonl');
        console.log('  state decisions-global [--limit N] [--project <name>] [--since <ISO>]  → query ~/.rcode/decisions.jsonl across all projects');
        console.log('  state add-blocker "<description>"            → append to blockers[]');
        console.log('  state resolve-blocker <index>|--all|--phase <N>  --issue <N>|--commit <sha>|--noref  → mark blocker(s) resolved (#654, #656)');
        console.log('  state record-session                         → update last_session timestamp');
        console.log('  state sync-from-git                          → recover phase/sprint state from git commit history (#915)');
        console.log('  state record-council --slug <s> --panel <csv> --artifact <path>');
        console.log('  state record-chain --slug <s> --agents <csv> --artifacts <path>');
        console.log('  state insert-phase --number <N.M> --name <slug>');
        console.log('  state next-phase-id                          → return next available 2-digit phase ID');
        console.log('  state next-plan-id <phase-id>                → return next plan ID within phase');
        console.log('  state next-task-id <plan-id>                 → return next task ID within plan');
        console.log('  state resolve-id <id>                        → resolve ID to paths and metadata');
        console.log('  state set-ids-in-state                       → scan .planning/ and populate state arrays');
        console.log('  state migrate-ids                            → migrate existing PLAN.md files with IDs');
        console.log('  state workstream-create --name <name>        → create a new workstream');
        console.log('  state workstream-switch --name <name>        → switch active workstream');
        console.log('  state workstream-list                        → list all workstreams');
        console.log('  state workstream-status                      → show active workstream');
        console.log('  state workstream-complete --name <name>      → mark workstream done');
        console.log('  state workstream-validate                    → validate workstream schema');
        console.log('');
        console.log('Sprint subcommands:');
        console.log('  state sprint add --phase <NN> --goal "..."   → create sprint under phase');
        console.log('  state sprint list [--phase <NN>]             → list all sprints');
        console.log('  state sprint status [--sprint <NN.S>]        → sprint progress + points');
        console.log('  state sprint start [--sprint <NN.S>]         → mark sprint active');
        console.log('  state sprint complete [--sprint <NN.S>]      → complete sprint, record velocity');
        console.log('  state sprint velocity                        → velocity history + average');
        console.log('');
        console.log('Story subcommands:');
        console.log('  state story add --sprint <NN.S> --title "..." [--points N]');
        console.log('  state story move --id <NN.S.TT> --status <todo|in_progress|review|done>');
        console.log('  state story list [--sprint <NN.S>] [--status <status>]');
        return;
      default: {
        const stateSubs = ['read','get','init','set-phase','advance-plan','snapshot','update-progress','record-execution','record-council','record-chain','add-decision','decisions-global','add-blocker','resolve-blocker','record-session','set-ids-in-state','migrate-ids','migrate-schema','next-phase-id','next-plan-id','next-task-id','resolve-id','workstream-create','workstream-switch','workstream-list','workstream-status','workstream-complete','workstream-validate','insert-phase','planned-phase','begin-phase','complete-phase','set-intent','reset'];
        // Issue #656 — top-level aliases for intuitive guesses.
        const intuitionAliases = {
          blocker: 'state resolve-blocker',
          blockers: 'state resolve-blocker',
          decision: 'state add-decision',
          decisions: 'state decisions-global',
          sync: 'state sync',
        };
        if (stateSubs.includes(subcommand)) {
          console.error(`Did you mean: state ${subcommand}? Run 'rcode-tools.cjs help' for full usage.`);
        } else if (intuitionAliases[subcommand]) {
          console.error(`'${subcommand}' is not a top-level command. Did you mean: ${intuitionAliases[subcommand]}?`);
        } else {
          // Fuzzy hint — suggest top 2 closest state subcommands by simple substring/edit-distance.
          const lev = (a, b) => {
            const m = Array.from({length: a.length+1}, (_,i) => Array(b.length+1).fill(0));
            for (let i=0; i<=a.length; i++) m[i][0]=i;
            for (let j=0; j<=b.length; j++) m[0][j]=j;
            for (let i=1; i<=a.length; i++) for (let j=1; j<=b.length; j++) {
              m[i][j] = a[i-1]===b[j-1] ? m[i-1][j-1] : 1 + Math.min(m[i-1][j], m[i][j-1], m[i-1][j-1]);
            }
            return m[a.length][b.length];
          };
          const candidates = stateSubs.concat(Object.keys(intuitionAliases));
          const scored = candidates
            .map(c => ({ c, d: c.includes(subcommand) || subcommand.includes(c) ? 0.5 : lev(c, subcommand) }))
            .sort((a, b) => a.d - b.d)
            .slice(0, 2)
            .filter(x => x.d <= Math.max(2, subcommand.length / 2));
          if (scored.length > 0) {
            console.error(`Unknown subcommand: ${subcommand}. Closest matches: ${scored.map(s => s.c).join(', ')}. Run 'rcode-tools.cjs help' for full usage.`);
          } else {
            console.error(`Unknown subcommand: ${subcommand}. Run 'rcode-tools.cjs help' for full usage.`);
          }
        }
        process.exit(1);
      }
    }
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(`rcode-tools error: ${err.message}`);
    if (process.env.DEBUG) console.error(err.stack);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`rcode-tools error: ${err.message}`);
  if (process.env.DEBUG) console.error(err.stack);
  process.exit(1);
});
