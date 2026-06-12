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

/**
 * Per-scan directory-listing cache. buildPhaseTree and the state.phases
 * loop walk the same .planning/phases/ directories; one scan previously
 * issued up to 4 readdirs per phase dir. The returned function memoizes
 * dirent listings for the lifetime of a single scan.
 * Returns null (not []) for unreadable dirs so callers can distinguish
 * "missing dir" from "empty dir" like the raw readdirSync try/catch did.
 */
function makeDirLister() {
  const cache = new Map();
  return function listCached(dir) {
    let entries = cache.get(dir);
    if (entries === undefined) {
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { entries = null; }
      cache.set(dir, entries);
    }
    return entries;
  };
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
 * @param {string}   projectDir  repo root
 * @param {Array}    rawPhases   state.raw.phases
 * @param {function} [listCached] per-scan dir lister from makeDirLister()
 * @returns {Array|null}         phases with a populated `sprints` array each
 */
function buildPhaseTree(projectDir, rawPhases, listCached) {
  if (!Array.isArray(rawPhases)) return null;
  const list = listCached || makeDirLister();
  const phasesDir = path.join(projectDir, '.planning', 'phases');
  const allEntries = list(phasesDir);
  if (allEntries === null) return rawPhases;
  const dirs = allEntries.filter(d => d.isDirectory());

  return rawPhases.map(p => {
    const intId = String(p.id || p.number || '').split('.')[0];
    if (!intId) return p;
    const dir = dirs.find(d => d.name.startsWith(intId + '-') ||
                               d.name.startsWith(intId.padStart(2, '0') + '-'));
    if (!dir) return p;

    const fileEntries = list(path.join(phasesDir, dir.name));
    if (fileEntries === null) return p;
    const files = fileEntries.map(e => e.name);
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

/** Format an ISO timestamp as a short "Mon D" display string; '' when absent. */
function fmtShort(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Format an ISO timestamp (or Date) as YYYY-MM-DD; '' when unparseable. */
function fmtISODate(iso) {
  const d = iso ? new Date(iso) : new Date();
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

/** Map an rcode phase/sprint status string to the contract enum done|active|todo. */
function toState(status) {
  if (/complete|done/i.test(status || '')) return 'done';
  if (/active|in_progress|progress/i.test(status || '')) return 'active';
  return 'todo';
}

/**
 * Derive the redesign dashboard contract (see .planning/campaign/DATA-CONTRACT.md)
 * from a scanned state object. Pure — reads only what scanState already gathered
 * (raw, phaseTree, projectName). Where the real .rcode/ scan has no data, falls
 * back to sensible computed values so every contract key is always present and
 * correctly typed. Never throws.
 *
 * Returns: { project, progress, currentPhase, timeline, tasks, blockers,
 *            health, decisions, phases } matching the contract exactly.
 * The `phases` field is the existing rich phaseTree enriched with `range`/`state`
 * (a superset) so legacy views and the redesign ProgressTimeline both read it.
 */
function buildDashboard(state) {
  const raw  = state.raw || {};
  const tree = Array.isArray(state.phaseTree) ? state.phaseTree
             : (Array.isArray(raw.phases) ? raw.phases : []);

  // ---- phases (superset: rich phaseTree + contract range/state) ----
  const phases = tree.map(p => {
    const started   = p.started || p.created || null;
    const completed = p.completed || p.completed_at || null;
    const range = started || completed
      ? [fmtShort(started), fmtShort(completed)].filter(Boolean).join(' – ')
      : '';
    return { ...p, name: p.name || p.slug || String(p.id || ''), range, state: toState(p.status) };
  });

  // ---- progress (prefer story counts; fall back to phase-level counts) ----
  let completed = 0, total = 0, inProg = 0;
  for (const p of phases) {
    const sprints = Array.isArray(p.sprints) ? p.sprints : [];
    const stories = sprints.flatMap(s => Array.isArray(s.stories) ? s.stories : []);
    for (const st of stories) {
      total += 1;
      if (/done|complete/i.test(st.status || '')) completed += 1;
      else if (p.state === 'active') inProg += 1;
    }
  }
  if (total === 0 && phases.length) {
    completed = phases.filter(p => p.state === 'done').length;
    inProg    = phases.filter(p => p.state === 'active').length;
    total     = phases.length;
  }
  const notStarted = Math.max(0, total - completed - inProg);
  const pct = total ? Math.round((completed / total) * 100) : 0;
  const progress = { completed, inProgress: inProg, notStarted, total, pct };

  // ---- currentPhase (object: name, status, milestones[]) ----
  const activePhase = phases.find(p => p.state === 'active')
    || phases.find(p => p.state === 'todo')
    || phases[phases.length - 1] || null;
  const cpSprints = activePhase && Array.isArray(activePhase.sprints) ? activePhase.sprints : [];
  let milestones = cpSprints.map(s => ({
    name: (s.goal || ('Sprint ' + (s.number || s.id || ''))).slice(0, 60),
    state: toState(s.status),
  }));
  // Fallback: when the active phase has no sprints, show neighbouring phases as steps.
  if (!milestones.length && phases.length) {
    milestones = phases.slice(0, 5).map(p => ({ name: p.name, state: p.state }));
  }
  const currentPhase = {
    name:   (activePhase && activePhase.name) || raw.current_phase || 'No active phase',
    status: (activePhase && activePhase.status) || 'planned',
    milestones,
  };

  // ---- timeline (launch date + on-track + ordered series) ----
  const velocity = Array.isArray(raw.velocity_history) ? raw.velocity_history : [];
  let points = velocity.map((v, i) => ({
    label: 'S' + (v.sprint || (i + 1)),
    value: Number(v.points) || 0,
  }));
  if (!points.length) {
    // Synthesize a cumulative-completion series across the phase sequence.
    let acc = 0;
    points = phases.slice(0, 8).map((p, i) => {
      if (p.state === 'done') acc += 1;
      return { label: 'P' + (p.id || (i + 1)), value: total ? Math.round((acc / phases.length) * 100) : acc };
    });
  }
  const launchDate = (() => {
    const created = raw.created ? new Date(raw.created) : new Date();
    if (isNaN(created.getTime())) return '';
    created.setDate(created.getDate() + 120); // ~4-month horizon when no explicit target exists
    return fmtISODate(created.toISOString());
  })();

  // ---- blockers ([] when none; shaped to title/desc/severity) ----
  const rawBlockers = Array.isArray(raw.blockers) ? raw.blockers : [];
  const blockers = rawBlockers.map(b => {
    if (typeof b === 'string') return { title: b, desc: '', severity: 'medium' };
    return {
      title:    b.title || b.summary || b.name || 'Blocker',
      desc:     b.desc || b.description || b.detail || '',
      severity: /high|medium|low/i.test(b.severity || '') ? b.severity.toLowerCase() : 'medium',
    };
  });

  // ---- tasks (completed + inProgress) ----
  const completedTasks = [];
  const inProgressTasks = [];
  for (const p of phases) {
    const sprints = Array.isArray(p.sprints) ? p.sprints : [];
    for (const s of sprints) {
      const stories = Array.isArray(s.stories) ? s.stories : [];
      for (const st of stories) {
        if (/done|complete/i.test(st.status || '')) {
          completedTasks.push({ title: st.title || st.id, date: fmtISODate(p.completed || s.completed_at || p.created) });
        } else if (p.state === 'active') {
          inProgressTasks.push({ title: st.title || st.id, pct: 50 });
        }
      }
    }
  }
  // Fallbacks so the cards are never empty when stories are unregistered in state.json.
  if (!completedTasks.length) {
    phases.filter(p => p.state === 'done').slice(-6).forEach(p =>
      completedTasks.push({ title: p.name, date: fmtISODate(p.completed || p.created) }));
  }
  if (!inProgressTasks.length && activePhase) {
    inProgressTasks.push({ title: activePhase.name, pct: pct || 25 });
  }
  const tasks = {
    completed:  completedTasks.slice(-8).reverse(),
    inProgress: inProgressTasks.slice(0, 8),
  };

  // ---- health (score + label + sparkline series) ----
  const healthPct = Math.max(0, Math.min(100, pct - blockers.length * 10));
  const healthLabel = healthPct >= 80 ? 'Healthy' : healthPct >= 50 ? 'Steady' : 'At risk';
  const healthPoints = points.length
    ? points.map(p => ({ label: p.label, value: p.value }))
    : [{ label: 'now', value: healthPct }];
  const health = { pct: healthPct, label: healthLabel, points: healthPoints };

  // ---- decisions (superset: keep raw fields + contract title/status/date) ----
  const rawDecisions = Array.isArray(raw.decisions) ? raw.decisions : [];
  const decisions = rawDecisions
    .map(d => ({
      ...d,
      title:  d.title || d.summary || d.decision || 'Decision',
      status: d.status || 'Approved',
      date:   d.date || d.created || '',
    }))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 8);

  // ---- project (identity + current user) ----
  const cfg = state.config || {};
  const envUser = (typeof process !== 'undefined' && process.env && process.env.USER) || '';
  const userName = cfg.user_name
    || (envUser ? envUser.charAt(0).toUpperCase() + envUser.slice(1) : 'Developer');
  const project = {
    name: state.projectName || raw.project_name || raw.project || 'Project',
    user: { name: userName, email: cfg.user_email || '' },
  };

  return { project, progress, currentPhase, timeline: { launchDate, onTrack: blockers.length === 0, points }, tasks, blockers, health, decisions, phases };
}

function scanStateUncached(rcodeDir) {
  const projectDir = path.dirname(rcodeDir);
  const listCached = makeDirLister();
  const state = {
    exists: fs.existsSync(rcodeDir),
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
    lastScanned: new Date().toISOString(),
  };

  if (!state.exists) return state;

  const rawResult = safeReadJson(path.join(rcodeDir, 'state.json'));
  if (rawResult && rawResult.__parseError) {
    state.rawParseError = rawResult.__parseError;
    state.raw = null;
  } else {
    state.raw = rawResult;
  }

  const cfg = parseSimpleYaml(safeReadText(path.join(rcodeDir, 'config.yaml')));
  state.config = cfg;

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
          const dirsFb   = listCached(phasesDir2) || [];
          const matchFb  = dirsFb.find(d => d.isDirectory() && d.name.startsWith(paddedFb + '-'));
          if (matchFb) {
            const allMdFb    = (listCached(path.join(phasesDir2, matchFb.name)) || [])
              .map(e => e.name).filter(f => f.endsWith('.md'));
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
        const dirs = listCached(phasesDir) || [];
        const match = dirs.find(d => d.isDirectory() && d.name.startsWith(padded + '-'));
        if (match) {
          phaseDir = match.name;
          const allMd = (listCached(path.join(phasesDir, match.name)) || [])
            .map(e => e.name).filter(f => f.endsWith('.md'));
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

  // `context` (full active.md text) and `planningFiles` (the .planning/ walk)
  // were shipped on every /api/state poll with zero client consumers — the
  // Files view uses /api/files and the memory summary uses memoryBank.active.
  // Dropped from the payload; restore behind an explicit ?full param if a
  // view ever needs them.

  // #12 — surface pending handoff (.rcode/HANDOFF.json) and active context
  // (.rcode/context/active.md) for the dashboard banner + memory-bank summary.
  // Both are no-op when the files don't exist. View-only — no writes.
  const handoffPath = path.join(rcodeDir, 'HANDOFF.json');
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

  const activeCtx = path.join(rcodeDir, 'context', 'active.md');
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

  state.phaseTree = buildPhaseTree(projectDir, state.raw && state.raw.phases, listCached);

  // Derive the redesign dashboard contract (DATA-CONTRACT.md). Attached to the
  // scan so GET /api/state returns the exact shape and client.js seeds it into
  // window.__S__. The enriched phaseTree (with range/state) is folded back so
  // legacy phase consumers also get the superset.
  state.dashboard = buildDashboard(state);
  state.phaseTree = state.dashboard.phases;

  return state;
}

// ── Scan cache ────────────────────────────────────────────────────────────────
// Every /api/state poll (per tab, every 30s) and every / load used to pay a
// full synchronous read+parse of state.json and all SPRINT.md files. Two-layer
// cache:
//   1. TTL fast-path — requests within SCAN_TTL_MS share one scan (dedupes the
//      page-load burst of / + /api/state and concurrent tabs).
//   2. mtime signature — stat'ing the watched files is ~100× cheaper than
//      reading + regex-parsing them; when no mtime/size changed, the cached
//      state (with its ORIGINAL lastScanned stamp) is returned, which also
//      lets the client skip its store patch on identical data.
let _scanCache = null; // { rcodeDir, sig, state, ts }
const SCAN_TTL_MS = 2000;

/** Max directory depth for the signature walk — guards against pathological
 *  nesting; readdirSync withFileTypes does not follow symlinks, so cycles
 *  via symlinked dirs are not walked. */
const SIG_WALK_MAX_DEPTH = 12;

/** Cheap change signature: mtime+size of every file scanState reads. */
function scanSignature(rcodeDir, projectDir) {
  const parts = [];
  const statOne = (f) => {
    try { const s = fs.statSync(f); parts.push(f + ':' + s.mtimeMs + ':' + s.size); }
    catch { parts.push(f + ':absent'); }
  };
  statOne(path.join(rcodeDir, 'state.json'));
  statOne(path.join(rcodeDir, 'config.yaml'));
  statOne(path.join(rcodeDir, 'HANDOFF.json'));
  statOne(path.join(rcodeDir, 'context', 'active.md'));
  (function walk(dir, depth) {
    if (depth > SIG_WALK_MAX_DEPTH) return;
    for (const e of listDir(dir)) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full, depth + 1);
      else if (e.isFile() && e.name.endsWith('.md')) statOne(full);
    }
  })(path.join(projectDir, '.planning'), 0);
  return parts.join('|');
}

function scanState(rcodeDir) {
  const now = Date.now();
  if (_scanCache && _scanCache.rcodeDir === rcodeDir && now - _scanCache.ts < SCAN_TTL_MS) {
    return _scanCache.state;
  }
  const projectDir = path.dirname(rcodeDir);
  const sig = scanSignature(rcodeDir, projectDir);
  if (_scanCache && _scanCache.rcodeDir === rcodeDir && _scanCache.sig === sig) {
    _scanCache.ts = now;
    return _scanCache.state;
  }
  const state = scanStateUncached(rcodeDir);
  _scanCache = { rcodeDir, sig, state, ts: now };
  return state;
}

/**
 * Scan the Memory Bank at .rcode/memory/. Returns structure suitable
 * for the /api/memory endpoint and the dashboard /memory view.
 * Returns { exists: false } when the Memory Bank has not been initialised.
 */
function scanMemoryBank(rcodeDir) {
  const memoryDir = path.join(rcodeDir, 'memory');
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

module.exports = { scanState, scanMemoryBank, buildDashboard, safeReadText, safeReadJson, listDir, parseSimpleYaml };
