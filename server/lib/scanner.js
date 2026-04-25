/**
 * State scanner — reads .rihal/ and .planning/ directories to build dashboard state.
 */
const fs = require('fs');
const path = require('path');

function safeReadJson(filepath) {
  let raw;
  try { raw = fs.readFileSync(filepath, 'utf8'); } catch { return null; }
  try { return JSON.parse(raw); } catch (err) {
    console.warn(`[dashboard] malformed JSON at ${filepath}: ${err.message}`);
    return { __parseError: err.message };
  }
}

function safeReadText(filepath) {
  try { return fs.readFileSync(filepath, 'utf8'); } catch { return null; }
}

function listDir(dir) {
  try { return fs.readdirSync(dir, { withFileTypes: true }); } catch { return []; }
}

function parseSimpleYaml(text) {
  if (!text) return {};
  const out = {};
  for (const line of text.split('\n')) {
    const m = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.+)/);
    if (m) out[m[1].trim()] = m[2].trim();
  }
  return out;
}

function scanState(rihalDir) {
  const projectDir = path.dirname(rihalDir);
  const state = {
    exists: fs.existsSync(rihalDir),
    projectName: null,
    raw: null,
    rawParseError: null,
    phases: [],
    decisions: [],
    blockers: [],
    councilSessions: 0,
    milestone: null,
    currentPhase: null,
    currentSprint: null,
    planningFiles: [],
    context: null,
    lastScanned: new Date().toISOString(),
  };

  if (!state.exists) return state;

  const rawResult = safeReadJson(path.join(rihalDir, 'state.json'));
  if (rawResult && rawResult.__parseError) {
    state.rawParseError = rawResult.__parseError;
    state.raw = null;
  } else {
    state.raw = rawResult;
  }

  const cfg = parseSimpleYaml(safeReadText(path.join(rihalDir, 'config.yaml')));

  // Fix #260: project name shows '.' — derive from directory name as fallback
  const dirName = path.basename(projectDir);
  state.projectName = state.raw?.project_name
    || cfg.project_name
    || state.raw?.project
    || (dirName !== '.' ? dirName : 'Unknown project');

  state.currentPhase   = state.raw?.current_phase  || null;
  state.currentSprint  = state.raw?.current_sprint || null;
  state.milestone      = state.raw?.milestone       || null;
  state.councilSessions = (state.raw?.council_sessions || []).length;

  if (Array.isArray(state.raw?.phases)) {
    const phasesDir = path.join(projectDir, '.planning', 'phases');
    state.phases = state.raw.phases.map(p => {
      const sprints    = Array.isArray(p.sprints) ? p.sprints : [];
      const allStories = sprints.flatMap(s => Array.isArray(s.stories) ? s.stories : []);
      const done  = allStories.filter(s => s.status === 'done' || s.status === 'completed').length;
      const total = allStories.length;

      const padded = String(p.id || p.number || '').padStart(2, '0');
      let phaseDir = null, sprintFile = null;
      try {
        const dirs = fs.readdirSync(phasesDir, { withFileTypes: true });
        const match = dirs.find(d => d.isDirectory() && d.name.startsWith(padded + '-'));
        if (match) {
          phaseDir = match.name;
          const allMd = fs.readdirSync(path.join(phasesDir, match.name)).filter(f => f.endsWith('.md'));
          const numbered = allMd.filter(f => /^\d{2}-\d{2}-/.test(f)).sort().reverse();
          const chosen = numbered.length ? numbered[0] : allMd.sort().reverse()[0];
          if (chosen) sprintFile = `.planning/phases/${match.name}/${chosen}`;
        }
      } catch { /* phasesDir missing */ }

      return {
        id: p.id,
        name: p.name || p.slug || p.id,
        status: p.status || (sprints[0]?.status) || 'planned',
        sprints: sprints.length,
        stories: total,
        storiesDone: done,
        goal: sprints[0]?.goal || null,
        completed_at: p.completed_at || null,
        sprintFile,
      };
    });
  }

  if (Array.isArray(state.raw?.decisions)) {
    state.decisions = state.raw.decisions;
  }

  if (Array.isArray(state.raw?.blockers)) {
    state.blockers = state.raw.blockers.filter(b => b && (typeof b === 'string' || b.title));
  }

  state.context = safeReadText(path.join(rihalDir, 'context', 'active.md'))
    || safeReadText(path.join(projectDir, '.planning', 'CONTEXT.md'));

  // Walk .planning/ for file tree
  const planningDir = path.join(projectDir, '.planning');
  function walkPlanning(dir, prefix) {
    for (const entry of listDir(dir)) {
      const full = path.join(dir, entry.name);
      const rel  = path.join(prefix, entry.name);
      if (entry.isDirectory()) {
        walkPlanning(full, rel);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        state.planningFiles.push({ path: rel, name: entry.name });
      }
    }
  }
  if (fs.existsSync(planningDir)) walkPlanning(planningDir, '');

  return state;
}

module.exports = { scanState, safeReadText, safeReadJson, listDir, parseSimpleYaml };
