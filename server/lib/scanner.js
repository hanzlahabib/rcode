/**
 * State scanner — reads .rcode/ and .planning/ directories to build dashboard state.
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

/**
 * Derive the phase → sprint → story tree from the .planning/phases/ filesystem,
 * which is the committed source of truth. state.json sprint/story records are
 * often incomplete (planner agents write SPRINT.md files without registering
 * sprint entries), so the dashboard derives counts from disk instead of trusting
 * state.json. When a phase has a directory with *-SPRINT.md files, those win;
 * otherwise the raw state.json sprints array is kept as-is.
 *
 * @param {string} projectDir   repo root
 * @param {Array}  rawPhases    state.raw.phases
 * @returns {Array|null}        phases with a populated `sprints` array each
 */
function buildPhaseTree(projectDir, rawPhases) {
  if (!Array.isArray(rawPhases)) return null;
  const phasesDir = path.join(projectDir, '.planning', 'phases');
  let dirs;
  try {
    dirs = fs.readdirSync(phasesDir, { withFileTypes: true }).filter(d => d.isDirectory());
  } catch { return rawPhases; }

  return rawPhases.map(p => {
    const intId = String(p.id || p.number || '').split('.')[0];
    if (!intId) return p;
    const dir = dirs.find(d => d.name.startsWith(intId + '-') ||
                               d.name.startsWith(intId.padStart(2, '0') + '-'));
    if (!dir) return p;

    let files;
    try { files = fs.readdirSync(path.join(phasesDir, dir.name)); } catch { return p; }
    const sprintFiles = files.filter(f => /-SPRINT\.md$/i.test(f)).sort();
    if (!sprintFiles.length) return p;

    const phaseComplete = /complete|done/i.test(p.status || '');
    const sprints = sprintFiles.map(f => {
      const m   = f.match(/^(\d+)-(\d+)-SPRINT\.md$/i);
      const num = m ? parseInt(m[2], 10) : 0;
      const sid = m ? `${parseInt(m[1], 10)}.${num}` : f.replace(/-SPRINT\.md$/i, '');
      const text = safeReadText(path.join(phasesDir, dir.name, f)) || '';

      // Sprint goal: frontmatter `goal:`, else first line of <objective>.
      const fm = parseSimpleYaml((text.match(/^---\n([\s\S]*?)\n---/) || [])[1] || '');
      let goal = fm.goal || '';
      if (!goal) {
        const obj = (text.match(/<objective>\s*([\s\S]*?)<\/objective>/) || [])[1] || '';
        goal = (obj.trim().split('\n').map(s => s.trim()).filter(Boolean)[0] || '').slice(0, 160);
      }

      // Stories: one per <task> block; title from <title>.
      const stories = [];
      const taskRe = /<task\b([^>]*)>([\s\S]*?)<\/task>/g;
      let tm;
      while ((tm = taskRe.exec(text))) {
        const idM    = tm[1].match(/id="([^"]+)"/);
        const titleM = tm[2].match(/<title>([\s\S]*?)<\/title>/);
        const acM    = tm[2].match(/<acceptance_criteria>\s*([\s\S]*?)\s*<\/acceptance_criteria>/);
        const story = {
          id:     idM ? idM[1] : `${sid}-task-${stories.length + 1}`,
          title:  titleM ? titleM[1].trim() : `Task ${stories.length + 1}`,
          status: phaseComplete ? 'done' : 'todo',
        };
        if (acM && acM[1].trim()) story.acceptance = acM[1].trim();
        stories.push(story);
      }
      // Fallback for pre-<task> SPRINT.md format (phases 20-30 era):
      // "### Story 20.01.01 — title" / "### Task X — title" headings.
      if (!stories.length) {
        const headRe = /^#{2,4}\s+(?:Story|Task)\s+([^\s—–-]+)\s*[—–-]\s*(.+?)\s*$/gm;
        let hm;
        while ((hm = headRe.exec(text))) {
          stories.push({
            id:     hm[1].trim(),
            title:  hm[2].trim(),
            status: phaseComplete ? 'done' : 'todo',
          });
        }
      }

      // Status: a *-SUMMARY.md sibling means the sprint shipped.
      const hasSummary = files.includes(f.replace(/-SPRINT\.md$/i, '-SUMMARY.md'));
      const status = hasSummary ? 'complete'
        : (p.status === 'active' || p.status === 'in_progress') ? 'in_progress'
        : 'planned';

      return { id: sid, number: num, goal: goal || `Sprint ${num}`, status, stories };
    });

    return { ...p, sprints };
  });
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

  state.projectRoot = projectDir;

  state.currentPhase   = state.raw?.current_phase  || null;
  state.currentSprint  = state.raw?.current_sprint || null;
  state.milestone      = state.raw?.milestone       || null;
  state.councilSessions = (state.raw?.council_sessions || []).length;

  if (Array.isArray(state.raw?.phases)) {
    const phasesDir = path.join(projectDir, '.planning', 'phases');
    state.phases = state.raw.phases.map(p => {
      const sprints    = Array.isArray(p.sprints) ? p.sprints : [];
      let   allStories = sprints.flatMap(s => Array.isArray(s.stories) ? s.stories : []);

      // #590 fallback: when state.json has no stories but a SPRINT.md exists, parse task lines
      // so the Tasks view is not empty. Synthetic entries carry _source:'sprint-md-fallback'.
      if (allStories.length === 0) {
        const phasesDir2 = path.join(projectDir, '.planning', 'phases');
        try {
          const intIdFb  = String(p.id || p.number || '').split('.')[0];
          const paddedFb = intIdFb.padStart(2, '0');
          const dirsFb   = fs.readdirSync(phasesDir2, { withFileTypes: true });
          const matchFb  = dirsFb.find(d => d.isDirectory() && d.name.startsWith(paddedFb + '-'));
          if (matchFb) {
            const allMdFb    = fs.readdirSync(path.join(phasesDir2, matchFb.name)).filter(f => f.endsWith('.md'));
            const numberedFb = allMdFb.filter(f => /^\d{2}-\d{2}-/.test(f)).sort().reverse();
            const chosenFb   = numberedFb.length ? numberedFb[0] : allMdFb.sort().reverse()[0];
            if (chosenFb) {
              const mdText = safeReadText(path.join(phasesDir2, matchFb.name, chosenFb));
              if (mdText) {
                const taskLines = mdText.split('\n').filter(l => /^[-*]\s+\[[ xX]\]/.test(l.trim()));
                allStories = taskLines.map((l, i) => ({
                  id:      (p.id || p.number || 'p') + '-task-' + (i + 1),
                  title:   l.replace(/^[-*]\s+\[[ xX]\]\s*/, '').trim() || ('Task ' + (i + 1)),
                  status:  /\[[xX]\]/.test(l) ? 'done' : 'todo',
                  _source: 'sprint-md-fallback',
                }));
              }
            }
          }
        } catch { /* phasesDir missing or unreadable */ }
      }

      const done  = allStories.filter(s => s.status === 'done' || s.status === 'completed').length;
      const total = allStories.length;

      const intId  = String(p.id || p.number || '').split('.')[0];
      const padded = intId.padStart(2, '0');
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

  // #12 — surface pending handoff (.rcode/HANDOFF.json) and active context
  // (.rcode/context/active.md) for the dashboard banner + memory-bank summary.
  // Both are no-op when the files don't exist. View-only — no writes.
  const handoffPath = path.join(rihalDir, 'HANDOFF.json');
  if (fs.existsSync(handoffPath)) {
    const ho = safeReadJson(handoffPath);
    if (ho && !ho.__parseError) {
      state.pendingHandoff = {
        path: '.rcode/HANDOFF.json',
        ts: ho.ts || ho.timestamp || null,
        summary: ho.summary || ho.note || ho.what_was_happening || null,
        phase: ho.phase || ho.current_phase || null,
        sprint: ho.sprint || ho.current_sprint || null,
        resume_hint: ho.resume_hint || ho.next || null,
      };
    }
  }

  const activeCtx = path.join(rihalDir, 'context', 'active.md');
  if (fs.existsSync(activeCtx)) {
    try {
      const stat = fs.statSync(activeCtx);
      const text = fs.readFileSync(activeCtx, 'utf8');
      state.memoryBank = state.memoryBank || {};
      state.memoryBank.active = {
        path: '.rcode/context/active.md',
        bytes: stat.size,
        lines: text.split('\n').length,
        updated: stat.mtime.toISOString(),
      };
    } catch { /* ignore */ }
  }

  state.phaseTree = buildPhaseTree(projectDir, state.raw && state.raw.phases);

  return state;
}

/**
 * Scan the Memory Bank at .rcode/memory/. Returns structure suitable
 * for the /api/memory endpoint and the dashboard /memory view.
 * Returns { exists: false } when the Memory Bank has not been initialised.
 */
function scanMemoryBank(rihalDir) {
  const memoryDir = path.join(rihalDir, 'memory');
  const result = {
    exists: false,
    initialised: false,
    indexPath: null,
    sections: {},
    distillates: [],
    changeRecords: [],
    archive: [],
    postMortems: [],
    lastScanned: new Date().toISOString(),
  };

  if (!fs.existsSync(memoryDir)) return result;
  result.exists = true;

  const indexPath = path.join(memoryDir, 'INDEX.md');
  if (fs.existsSync(indexPath)) {
    result.initialised = true;
    result.indexPath = '.rcode/memory/INDEX.md';
  }

  const sectionMap = {
    project: ['stack.md', 'decisions.md', 'glossary.md'],
    people: ['stakeholders.md', 'team.md'],
    milestones: ['current.md'],
    incidents: ['known-issues.md'],
  };
  for (const [section, files] of Object.entries(sectionMap)) {
    const sectionDir = path.join(memoryDir, section);
    if (!fs.existsSync(sectionDir)) continue;
    result.sections[section] = files.map(name => {
      const full = path.join(sectionDir, name);
      const exists = fs.existsSync(full);
      let bytes = 0, populated = false;
      if (exists) {
        try {
          const stat = fs.statSync(full);
          bytes = stat.size;
          const text = fs.readFileSync(full, 'utf8');
          populated = !/\{\{[A-Z_]+\}\}/.test(text) && !/_\(e\.g\.\s/.test(text);
        } catch { /* ignore */ }
      }
      return {
        name,
        path: `.rcode/memory/${section}/${name}`,
        exists,
        bytes,
        populated,
      };
    });
  }

  function listMd(subdir) {
    const full = path.join(memoryDir, subdir);
    if (!fs.existsSync(full)) return [];
    return listDir(full)
      .filter(e => e.isFile() && e.name.endsWith('.md'))
      .map(e => ({ name: e.name, path: `.rcode/memory/${subdir}/${e.name}` }));
  }

  result.distillates = listMd('distillates');
  result.changeRecords = listMd('change-records');
  result.archive = listMd('milestones/archive');
  result.postMortems = listMd('incidents/post-mortems');

  return result;
}

module.exports = { scanState, scanMemoryBank, safeReadText, safeReadJson, listDir, parseSimpleYaml };
