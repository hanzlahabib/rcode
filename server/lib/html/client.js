/**
 * Client-side JavaScript for the dashboard.
 * Handles routing, rendering, refresh, keyboard shortcuts, etc.
 */
function renderClientJs(state) {
  const clientData = JSON.stringify({
    phases:        state.raw?.phases        || [],
    milestone:     state.raw?.milestone     || '',
    currentPhase:  state.raw?.current_phase || null,
    currentSprint: state.raw?.current_sprint|| null,
    decisions:     state.raw?.decisions     || [],
    blockers:      state.raw?.blockers      || [],
    council_sessions: state.raw?.council_sessions || [],
    last_session:  state.raw?.last_session  || null,
    chains:        state.raw?.chains        || [],
    workstreams:   state.raw?.workstreams   || [],
    // #12 — passthrough scanner-computed fields (absent values stay undefined,
    // both UI blocks below guard with `if (S.pendingHandoff)` / `if (S.memoryBank…)`).
    pendingHandoff: state.pendingHandoff || null,
    memoryBank:     state.memoryBank     || null,
  });

  return `<script>
// ---- Embedded state ----
window.__S__ = ${clientData};
const S = window.__S__;
const _phases = S.phases || [];

// ---- Helpers ----
function chip(s) {
  const c = (s === 'complete' || s === 'completed' || s === 'done') ? 'complete'
    : (s === 'active' || s === 'in_progress') ? 'active'
    : s === 'blocked' ? 'blocked'
    : s === 'planned' ? 'planned'
    : s === 'todo' ? 'todo' : 'other';
  return '<span class="status-chip ' + c + '">● ' + esc(s) + '</span>';
}
function tag(t) { return '<span class="tag">' + esc(t) + '</span>'; }
function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function pct(d, t) { return t > 0 ? Math.round(d/t*100) + '%' : '—'; }
function pctNum(d, t) { return t > 0 ? Math.round(d/t*100) : 0; }
function dateStr(s) { return s ? String(s).slice(0,10) : null; }
function humanDate(s) {
  if (!s) return null;
  try { const d = new Date(s); return d.toLocaleDateString('en-US', {month:'short',day:'numeric',year:'numeric'}); }
  catch { return dateStr(s); }
}
function allSprints() {
  return _phases.flatMap(p => (p.sprints||[]).map(s => Object.assign({}, s, {phaseId:p.id, phaseName:p.name})));
}
function allTasks() {
  return _phases.flatMap(p => (p.sprints||[]).flatMap(s =>
    (s.stories||[]).map(t => Object.assign({}, t, {sprintId:s.id, phaseId:p.id, phaseName:p.name}))
  ));
}
function attr(label, val) {
  return '<div class="attr-item"><span class="attr-label">' + label + '</span><span class="attr-value">' + (val||'—') + '</span></div>';
}
function breadcrumb(label, hash) {
  return '<div class="breadcrumb"><button class="back-btn" onclick="navTo(\\'' + hash + '\\')">← ' + label + '</button></div>';
}
function filterInput(listId) {
  return '<div class="filter-bar"><input class="filter-input" type="text" placeholder="Filter…" oninput="filterItems(this,\\'' + listId + '\\')"></div>';
}
function progressBar(done, total) {
  const p = pctNum(done, total);
  return '<div class="progress-bar"><div class="progress-bar-fill" style="width:' + p + '%;' +
    (p >= 100 ? 'background:var(--accent-green)' : p > 50 ? 'background:var(--accent-blue)' : 'background:var(--accent-amber)') +
    '"></div></div>';
}
function completionRing(done, total) {
  const p = pctNum(done, total);
  const r = 28, c = 2 * Math.PI * r, offset = c - (p / 100) * c;
  return '<div class="completion-ring"><svg width="64" height="64" viewBox="0 0 64 64">' +
    '<circle cx="32" cy="32" r="' + r + '" fill="none" stroke="var(--border)" stroke-width="4"/>' +
    '<circle cx="32" cy="32" r="' + r + '" fill="none" stroke="var(--accent-green)" stroke-width="4" ' +
    'stroke-dasharray="' + c + '" stroke-dashoffset="' + offset + '" stroke-linecap="round"/>' +
    '</svg><span class="ring-text">' + p + '%</span></div>';
}
function showToast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg; el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2000);
}
function copyCmd(el) {
  const cmd = el.getAttribute('data-cmd');
  if (!cmd) return;
  navigator.clipboard.writeText(cmd).then(() => showToast('Copied: ' + cmd)).catch(() => {
    const ta = document.createElement('textarea'); ta.value = cmd;
    document.body.appendChild(ta); ta.select(); document.execCommand('copy');
    document.body.removeChild(ta); showToast('Copied: ' + cmd);
  });
}
function cmdHint(cmd, desc) {
  return '<div class="cmd-hint-item" data-cmd="' + esc(cmd) + '" onclick="copyCmd(this)">' +
    '<span class="cmd-text">' + esc(cmd) + '</span>' +
    '<span class="cmd-desc">' + esc(desc) + '</span>' +
    '<span class="cmd-copy">📋</span></div>';
}
function cmdAccordion(hints) {
  if (!hints.length) return '';
  return '<details class="cmd-hints"><summary>💡 Commands</summary>' +
    '<div class="cmd-hints-list">' + hints.join('') + '</div></details>';
}
function sprintHints(s) {
  const stories = Array.isArray(s.stories) ? s.stories : [];
  const st = s.status || 'planned';
  const sid = s.id || '';
  const pid = s.phaseId || '';
  const h = [];
  if (st === 'completed' || st === 'complete' || st === 'done') {
    h.push(cmdHint('/rihal-verify-work', 'Verify UAT for Sprint ' + sid));
    h.push(cmdHint('/rihal-audit', 'Audit completed Sprint ' + sid));
    h.push(cmdHint('/rihal-session-report', 'Generate session report'));
    h.push(cmdHint('/rihal-code-review', 'Review code from Sprint ' + sid));
  } else if (st === 'active' || st === 'in_progress') {
    h.push(cmdHint('/rihal-progress', 'Check Sprint ' + sid + ' progress'));
    h.push(cmdHint('/rihal-sprint-status', 'Status report for Sprint ' + sid));
    h.push(cmdHint('/rihal-pause-work', 'Pause and save context'));
  } else if (st === 'blocked') {
    h.push(cmdHint('/rihal-debug', 'Debug blocker in Sprint ' + sid));
    h.push(cmdHint('/rihal-correct-course', 'Course-correct Sprint ' + sid));
  } else {
    if (!stories.length) {
      h.push(cmdHint('/rihal-sprint-planning', 'Groom Sprint ' + sid + ' — add stories'));
      h.push(cmdHint('/rihal-create-story', 'Create a story for Sprint ' + sid));
      h.push(cmdHint('/rihal-discuss-phase', 'Discuss approach before planning'));
    } else {
      h.push(cmdHint('/rihal-execute', 'Execute Sprint ' + sid));
      h.push(cmdHint('/rihal-discuss-phase', 'Discuss before executing'));
      h.push(cmdHint('/rihal-sprint-planning', 'Refine Sprint ' + sid + ' plan'));
    }
  }
  return h;
}
function phaseHints(p) {
  const sps = Array.isArray(p.sprints) ? p.sprints : [];
  const st = p.status || 'planned';
  const pid = p.id || '';
  const h = [];
  if (st === 'completed' || st === 'complete' || st === 'done') {
    h.push(cmdHint('/rihal-validate-phase', 'Validate Phase ' + pid + ' deliverables'));
    h.push(cmdHint('/rihal-audit', 'Audit Phase ' + pid + ' completion'));
    h.push(cmdHint('/rihal-code-review', 'Review Phase ' + pid + ' code'));
  } else if (st === 'active' || st === 'in_progress') {
    h.push(cmdHint('/rihal-progress', 'Check Phase ' + pid + ' progress'));
    h.push(cmdHint('/rihal-sprint-status', 'Current sprint status'));
    h.push(cmdHint('/rihal-code-review', 'Review code in Phase ' + pid));
  } else {
    if (!sps.length) {
      h.push(cmdHint('/rihal-plan', 'Create sprint plan for Phase ' + pid));
      h.push(cmdHint('/rihal-discuss-phase', 'Discuss Phase ' + pid + ' approach'));
      h.push(cmdHint('/rihal-research-phase', 'Research Phase ' + pid + ' before planning'));
    } else {
      h.push(cmdHint('/rihal-execute', 'Start executing Phase ' + pid));
      h.push(cmdHint('/rihal-sprint-planning', 'Plan next sprint in Phase ' + pid));
    }
  }
  return h;
}

// ---- Entity cards ----
function phaseCard(p) {
  const sps = p.sprints || [];
  const stories = sps.flatMap(s => s.stories || []);
  const done = stories.filter(t => t.status === 'done' || t.status === 'completed').length;
  const isCur = String(p.id) === String(S.currentPhase);
  return '<div class="item item-clickable" onclick="navTo(\\'phases/' + p.id + '\\')"' +
    (isCur ? ' style="border-left-color:var(--accent-amber)"' : '') + '>' +
    '<div class="item-title">Phase ' + esc(p.id) + ' — ' + esc(p.name) +
    (isCur ? tag('current') : '') + chip(p.status) + '</div>' +
    '<div class="item-meta">' + tag(sps.length + ' sprint' + (sps.length!==1?'s':'')) +
    tag(done + '/' + stories.length + ' tasks') +
    (stories.length > 0 ? tag(pct(done,stories.length) + ' done') : '') +
    (p.completed_at ? ' <span style="color:var(--text-muted);font-size:var(--text-xs);">Done ' + humanDate(p.completed_at) + '</span>' : '') +
    '</div>' +
    (stories.length > 0 ? '<div style="margin-top:6px;">' + progressBar(done, stories.length) + '</div>' : '') +
    (sps[0]?.goal ? '<div style="color:var(--text-secondary);font-size:var(--text-sm);margin-top:4px;">' + esc(sps[0].goal) + '</div>' : '') +
    '</div>';
}

function sprintCard(s) {
  const stories = s.stories || [];
  const done = stories.filter(t => t.status === 'done' || t.status === 'completed').length;
  const isCur = s.id === S.currentSprint;
  const phaseId = s.phaseId || s.id || '';
  return '<div class="item item-clickable' + (isCur ? ' sprint-current' : '') + '" onclick="navTo(\\'sprints/' + s.id + '\\')"' +
    (isCur ? ' style="border-left-color:var(--accent-amber);background:rgba(245,158,11,0.04)"' : '') + '>' +
    '<div class="item-title">Sprint ' + esc(s.id) + ' — ' + esc(s.goal || 'No goal') +
    (isCur ? tag('current') : '') + chip(s.status) + '</div>' +
    '<div class="item-meta">' +
    (s.phaseId ? tag('Phase ' + s.phaseId) : '') +
    tag(done + '/' + stories.length + ' tasks') +
    (s.velocity_target != null ? tag('Target: ' + s.velocity_target + 'pts') : '') +
    (s.velocity_actual != null ? tag('Actual: ' + s.velocity_actual + 'pts') : '') + '</div>' +
    '<div style="margin-top:6px;">' + progressBar(done, stories.length) + '</div>' +
    (stories.length === 0 ? '<div class="empty-action" style="margin-top:var(--space-2);font-size:var(--text-xs);">No tasks — run <code>/rihal-plan ' + esc(phaseId) + '</code> to populate</div>' : '') +
    (s.started_at ? '<div style="color:var(--text-muted);font-size:var(--text-xs);margin-top:4px;">' +
      humanDate(s.started_at) + (s.completed_at ? ' → ' + humanDate(s.completed_at) : ' → ongoing') + '</div>' : '') +
    '</div>';
}

function taskCard(t) {
  const done = t.status === 'done' || t.status === 'completed';
  const tid = 'task-' + (t.id || t.title || '').replace(/[^a-zA-Z0-9]/g, '-').slice(0, 40) + '-' + Math.random().toString(36).slice(2, 6);
  // Build detail rows from all available context
  var rows = '';
  if (t.id) rows += '<div class="task-detail-row"><strong>ID:</strong> <code>' + esc(t.id) + '</code></div>';
  if (t.points) rows += '<div class="task-detail-row"><strong>Points:</strong> ' + t.points + '</div>';
  rows += '<div class="task-detail-row"><strong>Status:</strong> ' + chip(t.status || 'unknown') + '</div>';
  if (t.sprintId) rows += '<div class="task-detail-row"><strong>Sprint:</strong> ' + esc(t.sprintId) + '</div>';
  if (t.sprintGoal) rows += '<div class="task-detail-row"><strong>Sprint Goal:</strong> ' + esc(t.sprintGoal) + '</div>';
  if (t.phaseId) rows += '<div class="task-detail-row"><strong>Phase:</strong> P' + esc(t.phaseId) + (t.phaseName ? ' — ' + esc(t.phaseName) : '') + '</div>';
  if (t.acceptance) rows += '<div class="task-detail-row"><strong>Acceptance:</strong> ' + esc(t.acceptance) + '</div>';
  if (t.assignee) rows += '<div class="task-detail-row"><strong>Assignee:</strong> ' + esc(t.assignee) + '</div>';
  // Context-aware commands for this specific task
  var cmds = '';
  if (t.id) {
    var taskCmds = [];
    if (!done) {
      taskCmds.push(cmdHint('/rihal-dev-story ' + t.id, 'Implement this story'));
      taskCmds.push(cmdHint('/rihal-create-story ' + (t.sprintId || ''), 'Add related story'));
    } else {
      taskCmds.push(cmdHint('/rihal-verify-work ' + t.id, 'Verify this story'));
      taskCmds.push(cmdHint('/rihal-code-review ' + t.id, 'Review code for this story'));
    }
    if (t.sprintId) {
      taskCmds.push(cmdHint('/rihal-sprint-status ' + t.sprintId, 'Sprint ' + t.sprintId + ' status'));
    }
    cmds = '<div class="task-detail-cmds">' + taskCmds.join('') + '</div>';
  }
  return '<div class="item item-clickable" data-status="' + (t.status||'') + '" style="' + (done ? 'opacity:.65' : '') + '"' +
    ' onclick="toggleTaskDetail(\\'' + tid + '\\')">' +
    '<div class="item-title" style="' + (done ? 'text-decoration:line-through' : '') + '">' +
    (done ? '✓ ' : '') + esc(t.title) + chip(t.status) +
    '<span class="task-expand-icon" id="icon-' + tid + '">▶</span></div>' +
    '<div class="item-meta">' +
    (t.points ? tag(t.points + 'pts') : '') +
    (t.id ? tag(t.id) : '') +
    (t.sprintId ? tag('Sprint ' + t.sprintId) : '') +
    (t.phaseId ? tag('Phase ' + t.phaseId) : '') + '</div>' +
    '<div class="task-detail" id="' + tid + '" style="display:none;">' +
    rows + cmds + '</div>' +
    '</div>';
}
function toggleTaskDetail(id) {
  const el = document.getElementById(id);
  const icon = document.getElementById('icon-' + id);
  if (!el) return;
  const open = el.style.display !== 'none';
  el.style.display = open ? 'none' : 'block';
  if (icon) icon.textContent = open ? '▶' : '▼';
}

// ---- View renderers ----
function renderOverview() {
  // #268: current sprint progress bar on overview
  const sprints = allSprints();
  const curSprint = sprints.find(s => s.id === S.currentSprint);
  let sprintProgressHtml = '';
  if (curSprint) {
    const sts = curSprint.stories || [];
    const d = sts.filter(t => t.status === 'done' || t.status === 'completed').length;
    sprintProgressHtml = '<section><h2>⚡ Current Sprint — ' + esc(curSprint.id) + '</h2><div class="body">' +
      '<div style="margin-bottom:8px;font-size:var(--text-sm);color:var(--text-secondary);">' + esc(curSprint.goal || '') + '</div>' +
      '<div style="display:flex;align-items:center;gap:var(--space-3);">' +
      '<div style="flex:1;">' + progressBar(d, sts.length) + '</div>' +
      '<span style="font-size:var(--text-sm);font-weight:600;">' + d + '/' + sts.length + ' (' + pct(d,sts.length) + ')</span>' +
      '</div></div></section>';
  }

  // #267: velocity sparkline
  let velocityHtml = '';
  const completedSprints = sprints.filter(s => s.velocity_actual != null);
  if (completedSprints.length > 1) {
    const vals = completedSprints.map(s => s.velocity_actual);
    const max = Math.max(...vals, 1);
    const w = 200, h = 40, step = w / (vals.length - 1);
    const points = vals.map((v, i) => (i * step) + ',' + (h - (v / max) * h));
    velocityHtml = '<div class="stat"><div class="label">Sprint Velocity</div>' +
      '<svg width="' + w + '" height="' + (h+4) + '" style="margin-top:8px;">' +
      '<polyline points="' + points.join(' ') + '" fill="none" stroke="var(--accent-blue)" stroke-width="2"/>' +
      '</svg><div class="sub">Last ' + vals.length + ' sprints</div></div>';
  }

  // #269: council sessions
  let councilHtml = '';
  if (Array.isArray(S.council_sessions) && S.council_sessions.length) {
    councilHtml = '<section><h2>🏛 Council Sessions</h2><div class="body"><div class="phase-list">' +
      S.council_sessions.slice(-5).reverse().map(cs =>
        '<div class="item"><div class="item-title">' + esc(cs.topic || cs.title || 'Session') + '</div>' +
        '<div class="item-meta">' + (cs.date ? humanDate(cs.date) : '') +
        (cs.participants ? ' · ' + esc(cs.participants.join(', ')) : '') + '</div></div>'
      ).join('') + '</div></div></section>';
  }

  // #271: last session
  let lastSessionHtml = '';
  if (S.last_session) {
    const ls = S.last_session;
    lastSessionHtml = '<span style="color:var(--text-muted);font-size:var(--text-xs);margin-left:var(--space-3);">' +
      'Last session: ' + (humanDate(ls.date || ls.timestamp) || '—') + '</span>';
  }

  // #270: chains/workstreams
  let chainsHtml = '';
  const chains = S.chains || [];
  const workstreams = S.workstreams || [];
  if (chains.length || workstreams.length) {
    chainsHtml = '<section><h2>🔗 Chains & Workstreams</h2><div class="body">';
    if (chains.length) {
      chainsHtml += '<div style="margin-bottom:var(--space-4);"><strong>Chains</strong><div class="phase-list" style="margin-top:var(--space-2);">' +
        chains.map(c => '<div class="item"><div class="item-title">' + esc(c.name || c.id || 'Chain') + '</div></div>').join('') + '</div></div>';
    }
    if (workstreams.length) {
      chainsHtml += '<div><strong>Workstreams</strong><div class="phase-list" style="margin-top:var(--space-2);">' +
        workstreams.map(w => '<div class="item"><div class="item-title">' + esc(w.name || w.id || 'Workstream') + ' ' + chip(w.status || 'active') + '</div></div>').join('') + '</div></div>';
    }
    chainsHtml += '</div></section>';
  }

  // #12 — pending handoff banner (shown only when .rihal/HANDOFF.json present).
  // Read-only — the dashboard never resumes; user runs /rihal-resume-work.
  let handoffHtml = '';
  if (S.pendingHandoff) {
    const ho = S.pendingHandoff;
    const when = ho.ts ? humanDate(ho.ts) : '';
    const summary = ho.summary ? ' — ' + esc(ho.summary).slice(0, 120) : '';
    const where = ho.sprint ? ' [sprint ' + esc(ho.sprint) + ']' :
                  ho.phase  ? ' [phase '  + esc(ho.phase)  + ']' : '';
    handoffHtml = '<section style="border-left:4px solid var(--accent-orange,#f59e0b);padding-left:var(--space-3);">' +
      '<h2>⚠ Pending Handoff</h2><div class="body">' +
      '<div>' + (when ? esc(when) : '') + where + summary + '</div>' +
      (ho.resume_hint ? '<div style="margin-top:var(--space-2);color:var(--text-secondary);font-size:var(--text-sm);">' + esc(ho.resume_hint) + '</div>' : '') +
      '<div style="margin-top:var(--space-3);font-size:var(--text-sm);"><code>/rihal-resume-work</code></div>' +
      '</div></section>';
  }

  // #12 — memory bank summary (shown only when .rihal/context/active.md present).
  let memoryHtml = '';
  if (S.memoryBank && S.memoryBank.active) {
    const m = S.memoryBank.active;
    memoryHtml = '<section><h2>🧠 Memory Bank</h2><div class="body">' +
      '<div class="attr-grid">' +
      attr('active.md', m.lines + ' lines · ' + Math.round(m.bytes / 1024 * 10) / 10 + ' KB') +
      attr('Updated', humanDate(m.updated)) +
      '</div></div></section>';
  }

  const el = document.getElementById('view-overview-dynamic');
  // Overview hints
  var oHints = [cmdHint('/rihal-next', 'What should I do next?'), cmdHint('/rihal-status', 'Quick project status'), cmdHint('/rihal-council', 'Ask the team a question')];
  if (curSprint) { oHints = sprintHints(curSprint).concat(oHints); }
  if (S.pendingHandoff) { oHints.unshift(cmdHint('/rihal-resume-work', 'Resume from the pending handoff')); }
  if (el) el.innerHTML = handoffHtml + sprintProgressHtml + memoryHtml + velocityHtml + councilHtml + chainsHtml + lastSessionHtml + cmdAccordion(oHints);
}

function renderRoadmap() {
  const ms = S.milestone || 'M1';
  const totalStories = allTasks();
  const doneStories  = totalStories.filter(t => t.status === 'done' || t.status === 'completed');
  let h = '<div class="view-title">Roadmap</div>';
  // #273: filter
  h += '<div class="filter-bar"><input class="filter-input" type="text" placeholder="Filter roadmap…" id="roadmap-filter" oninput="filterRoadmap(this.value)"></div>';
  h += '<div class="tree-container" id="roadmap-tree">';
  h += '<div class="tree-node tree-ms"><div class="tree-row tree-header" onclick="toggleNode(this)">';
  h += '<span class="tree-chevron">▼</span><span class="tree-icon">🎯</span>';
  h += '<span class="tree-label">' + esc(ms) + '</span>';
  h += '<span class="tree-badge">' + _phases.length + ' phases · ' + doneStories.length + '/' + totalStories.length + ' tasks</span></div>';
  h += '<div class="tree-children">';
  for (const p of _phases) {
    const sps = p.sprints || [];
    const pStories = sps.flatMap(s => s.stories||[]);
    const pDone = pStories.filter(t => t.status==='done'||t.status==='completed').length;
    // #274: phase nodes navigate to phase detail
    h += '<div class="tree-node" data-filter-text="' + esc(p.name).toLowerCase() + '"><div class="tree-row" onclick="toggleNode(this)">';
    h += '<span class="tree-chevron">▶</span><span class="tree-icon">📋</span>';
    h += '<span class="tree-label" ondblclick="navTo(\\'phases/' + p.id + '\\');event.stopPropagation();">P' + esc(p.id) + ' — ' + esc(p.name) + '</span>' + chip(p.status);
    // #276: inline mini progress bar
    const pp = pctNum(pDone, pStories.length);
    h += '<span style="width:60px;display:inline-block;margin:0 8px;"><div class="progress-bar" style="height:4px;"><div class="progress-bar-fill" style="width:' + pp + '%;height:100%;"></div></div></span>';
    h += '<span class="tree-badge">' + sps.length + ' sprints · ' + pDone + '/' + pStories.length + '</span></div>';
    // #272: start collapsed
    h += '<div class="tree-children" style="display:none">';
    for (const s of sps) {
      const sts = s.stories || [];
      const sDone = sts.filter(t => t.status==='done'||t.status==='completed').length;
      // #275: sprint nodes link to file
      h += '<div class="tree-node"><div class="tree-row" onclick="toggleNode(this)">';
      h += '<span class="tree-chevron">▶</span><span class="tree-icon">⚡</span>';
      h += '<span class="tree-label">Sprint ' + esc(s.id) + ' — ' + esc(s.goal||'No goal') + '</span>' + chip(s.status);
      h += '<span class="tree-badge">' + sDone + '/' + sts.length + '</span></div>';
      h += '<div class="tree-children" style="display:none">';
      for (const t of sts) {
        const td = t.status==='done'||t.status==='completed';
        h += '<div class="tree-node task-leaf"><div class="tree-row">';
        h += '<span class="tree-icon">' + (td?'✓':'○') + '</span>';
        h += '<span class="tree-label" style="' + (td?'opacity:.6;text-decoration:line-through':'') + '">' + esc(t.title) + '</span>';
        h += chip(t.status) + (t.points ? '<span class="tree-badge">' + t.points + 'pts</span>' : '');
        h += '</div></div>';
      }
      if (!sts.length) h += '<div style="color:var(--text-muted);font-size:var(--text-xs);padding:var(--space-2) var(--space-6);">No tasks</div>';
      h += '</div></div>';
    }
    if (!sps.length) h += '<div style="color:var(--text-muted);font-size:var(--text-xs);padding:var(--space-2) var(--space-6);">No sprints</div>';
    h += '</div></div>';
  }
  h += '</div></div></div>';
  // Roadmap hints
  var rmHints = [cmdHint('/rihal-add-phase', 'Add a new phase'), cmdHint('/rihal-milestone-summary', 'View milestone summary'), cmdHint('/rihal-new-milestone', 'Start a new milestone')];
  var allPDone = _phases.length > 0 && _phases.every(ph => ph.status === 'complete' || ph.status === 'completed' || ph.status === 'done');
  if (allPDone) { rmHints.push(cmdHint('/rihal-audit-milestone', 'Audit milestone completion')); rmHints.push(cmdHint('/rihal-complete-milestone', 'Complete and archive milestone')); }
  document.getElementById('view-roadmap').innerHTML = h + cmdAccordion(rmHints);
}

function filterRoadmap(q) {
  q = q.toLowerCase().trim();
  document.querySelectorAll('#roadmap-tree .tree-node[data-filter-text]').forEach(n => {
    n.style.display = !q || n.dataset.filterText.includes(q) ? '' : 'none';
  });
}

function renderMilestones(subId) {
  const el = document.getElementById('view-milestones');
  const ms = S.milestone || 'M1';
  if (subId) {
    const doneP = _phases.filter(p => p.status==='complete'||p.status==='completed').length;
    const total = allTasks(), done = total.filter(t => t.status==='done'||t.status==='completed');
    // #278: velocity history
    const sprints = allSprints().filter(s => s.velocity_actual != null);
    let velocityHtml = '';
    if (sprints.length) {
      velocityHtml = '<div class="view-title" style="margin-top:var(--space-6)">Velocity History</div>';
      const maxV = Math.max(...sprints.map(s => Math.max(s.velocity_actual||0, s.velocity_target||0)), 1);
      velocityHtml += '<div style="max-width:600px;">' + sprints.map(s =>
        '<div class="velocity-bar">' +
        '<div class="velocity-bar-label">S' + esc(s.id) + '</div>' +
        '<div class="velocity-bar-track">' +
        '<div class="velocity-bar-fill" style="width:' + ((s.velocity_actual||0)/maxV*100) + '%;background:var(--accent-blue);"></div>' +
        '</div>' +
        '<div class="velocity-bar-val">' + (s.velocity_actual||0) + '/' + (s.velocity_target||'—') + '</div>' +
        '</div>'
      ).join('') + '</div>';
    }
    // #279: phase timeline
    let timelineHtml = '';
    const phasesWithDates = _phases.filter(p => (p.sprints||[]).some(s => s.started_at));
    if (phasesWithDates.length) {
      timelineHtml = '<div class="view-title" style="margin-top:var(--space-6)">Phase Timeline</div>' +
        '<div class="phase-list">' + phasesWithDates.map(p => {
          const sps = p.sprints || [];
          const startDates = sps.map(s => s.started_at).filter(Boolean).sort();
          const endDates = sps.map(s => s.completed_at).filter(Boolean).sort().reverse();
          return '<div class="item"><div class="item-title">P' + esc(p.id) + ' — ' + esc(p.name) + ' ' + chip(p.status) + '</div>' +
            '<div class="item-meta">' + (startDates[0] ? humanDate(startDates[0]) : '?') + ' → ' +
            (endDates[0] ? humanDate(endDates[0]) : 'ongoing') + '</div></div>';
        }).join('') + '</div>';
    }
    // #280: completion ring
    el.innerHTML = breadcrumb('Milestones','milestones') +
      '<div class="entity-header"><div style="display:flex;align-items:center;gap:var(--space-6);"><div>' +
      '<div class="entity-title">🎯 ' + esc(ms) + '</div></div>' +
      completionRing(done.length, total.length) + '</div>' +
      '<div class="attr-grid">' +
      attr('Total Phases', _phases.length) + attr('Completed Phases', doneP) +
      attr('Current Phase', S.currentPhase||'—') + attr('Current Sprint', S.currentSprint||'—') +
      attr('Tasks Done', done.length + '/' + total.length) +
      attr('Progress', pct(done.length, total.length)) + '</div></div>' +
      velocityHtml + timelineHtml +
      '<div class="view-title" style="margin-top:var(--space-6)">Phases under this milestone</div>' +
      '<div class="phase-list">' + _phases.map(phaseCard).join('') + '</div>';
  } else {
    const total = allTasks(), done = total.filter(t => t.status==='done'||t.status==='completed');
    el.innerHTML = '<div class="view-title">Milestones</div>' +
      '<div class="phase-list"><div class="item item-clickable" onclick="navTo(\\'milestones/M1\\')">' +
      '<div style="display:flex;align-items:center;gap:var(--space-4);">' +
      completionRing(done.length, total.length) +
      '<div><div class="item-title">🎯 ' + esc(ms) + '</div>' +
      '<div class="item-meta">' + tag(_phases.length + ' phases') + tag(allSprints().length + ' sprints') +
      tag(done.length + '/' + total.length + ' tasks done') + tag(pct(done.length,total.length) + ' complete') + '</div></div>' +
      '</div></div></div>';
  }
}

function renderPhases(subId) {
  const el = document.getElementById('view-phases');
  if (subId) {
    const p = _phases.find(ph => String(ph.id) === String(subId) || String(ph.number) === String(subId));
    // Fix #319: guard against missing sprints key
    if (!p) { el.innerHTML = breadcrumb('Phases','phases') + '<div class="empty">Phase not found.</div>'; return; }
    const sps = Array.isArray(p.sprints) ? p.sprints : [];
    const stories = sps.flatMap(s => Array.isArray(s.stories) ? s.stories : []);
    const done = stories.filter(t => t.status==='done'||t.status==='completed').length;
    // #284: velocity bars
    let velocityHtml = '';
    const sprintsWithVel = sps.filter(s => s.velocity_actual != null || s.velocity_target != null);
    if (sprintsWithVel.length) {
      const maxV = Math.max(...sprintsWithVel.map(s => Math.max(s.velocity_actual||0, s.velocity_target||0)), 1);
      velocityHtml = '<div class="view-title" style="margin-top:var(--space-6)">Sprint Velocity</div>' +
        '<div style="max-width:600px;">' + sprintsWithVel.map(s =>
          '<div class="velocity-bar">' +
          '<div class="velocity-bar-label">S' + esc(s.id) + '</div>' +
          '<div class="velocity-bar-track">' +
          '<div class="velocity-bar-fill" style="width:' + ((s.velocity_actual||0)/maxV*100) + '%;"></div>' +
          '</div>' +
          '<div class="velocity-bar-val">' + (s.velocity_actual||0) + '/' + (s.velocity_target||'—') + '</div></div>'
        ).join('') + '</div>';
    }
    el.innerHTML = breadcrumb('All Phases','phases') +
      '<div class="entity-header"><div class="entity-title">📋 Phase ' + esc(p.id) + ' — ' + esc(p.name) + '</div>' +
      '<div class="attr-grid">' +
      attr('Status', chip(p.status)) + attr('Sprints', sps.length) +
      attr('Tasks Done', done + '/' + stories.length) + attr('Progress', pct(done,stories.length)) +
      // #282: completed_at date
      (p.completed_at ? attr('Completed', humanDate(p.completed_at)) : '') + '</div></div>' +
      '<div style="margin-bottom:var(--space-4);">' + progressBar(done, stories.length) + '</div>' +
      '<div class="term-action-bar">' +
        '<button class="term-run-btn" onclick="runAndOpenTerm(\'phase-' + esc(p.id) + '\',\'/rihal-execute\',\'Phase ' + esc(p.id) + '\')">▶ Run Phase</button>' +
        '<button class="term-run-btn outline" onclick="openTermPanel(\'phase-' + esc(p.id) + '\',\'Phase ' + esc(p.id) + '\')">📟 Terminal</button>' +
        '<button class="back-btn" onclick="viewPlanFile(\\'' + esc(p.id) + '\\')">📄 View plan file →</button>' +
      '</div>' +
      velocityHtml +
      '<div class="view-title" style="margin-top:var(--space-6)">Sprints</div>' +
      '<div class="phase-list">' + (sps.length ? sps.map(s => sprintCard(Object.assign({},s,{phaseId:p.id,phaseName:p.name}))).join('') :
        '<div class="empty">No sprints in this phase yet.<div class="empty-action">Run /rihal-plan to create sprints</div></div>') + '</div>' +
      cmdAccordion(phaseHints(p));
  } else {
    var plHints = [cmdHint('/rihal-add-phase', 'Add a new phase'), cmdHint('/rihal-stats', 'Project statistics'), cmdHint('/rihal-progress', 'Overall progress')];
    var allComplete = _phases.length > 0 && _phases.every(ph => ph.status === 'complete' || ph.status === 'completed' || ph.status === 'done');
    if (allComplete) { plHints.push(cmdHint('/rihal-audit-milestone', 'Audit milestone completion')); plHints.push(cmdHint('/rihal-complete-milestone', 'Complete and archive milestone')); plHints.push(cmdHint('/rihal-ship', 'Create PR and ship')); }
    el.innerHTML = '<div class="view-title">Phases</div>' + filterInput('phases-inner') +
      '<div id="phases-inner" class="phase-list">' +
      (_phases.length ? _phases.map(phaseCard).join('') : '<div class="empty">No phases yet.<div class="empty-action">Run /rihal-new-project to start</div></div>') + '</div>' + cmdAccordion(plHints);
  }
}

function renderSprints(subId) {
  const el = document.getElementById('view-sprints');
  const sprints = allSprints();
  if (subId) {
    const s = sprints.find(sp => String(sp.id) === String(subId));
    if (!s) { el.innerHTML = breadcrumb('All Sprints','sprints') + '<div class="empty">Sprint not found.</div>'; return; }
    const rawStories = Array.isArray(s.stories) ? s.stories : [];
    const stories = rawStories.map(function(t) { return Object.assign({}, t, {sprintId: s.id, sprintGoal: s.goal || '', phaseId: s.phaseId, phaseName: s.phaseName}); });
    const done = stories.filter(t => t.status==='done'||t.status==='completed').length;
    // #290: acceptance criteria
    let acHtml = '';
    const storiesWithAc = stories.filter(t => t.acceptance);
    if (storiesWithAc.length) {
      acHtml = '<div class="view-title" style="margin-top:var(--space-6)">Acceptance Criteria</div>' +
        '<div class="phase-list">' + storiesWithAc.map(t =>
          '<div class="item"><div class="item-title">' + esc(t.title) + '</div>' +
          '<div style="color:var(--text-secondary);font-size:var(--text-sm);margin-top:4px;">✓ ' + esc(t.acceptance) + '</div></div>'
        ).join('') + '</div>';
    }
    // #292: full breadcrumb path
    el.innerHTML = '<div class="breadcrumb"><button class="back-btn" onclick="navTo(\\'sprints\\')">← All Sprints</button> ' +
      (s.phaseId ? '<button class="back-btn" onclick="navTo(\\'phases/' + s.phaseId + '\\')">← Phase ' + esc(s.phaseId) + '</button>' : '') + '</div>' +
      '<div class="entity-header"><div class="entity-title">⚡ Sprint ' + esc(s.id) + '</div>' +
      '<div class="attr-grid">' +
      attr('Goal', esc(s.goal||'—')) + attr('Status', chip(s.status)) +
      attr('Phase', 'P' + s.phaseId + ' — ' + esc(s.phaseName)) +
      attr('Velocity', (s.velocity_actual!=null?s.velocity_actual:'—') + ' / ' + (s.velocity_target!=null?s.velocity_target:'—') + ' pts') +
      attr('Tasks Done', done + '/' + stories.length) + attr('Progress', pct(done,stories.length)) +
      // #293: human-readable dates
      (s.started_at   ? attr('Started',   humanDate(s.started_at))   : '') +
      (s.completed_at ? attr('Completed', humanDate(s.completed_at)) : '') + '</div></div>' +
      // #289: progress bar
      '<div style="margin-bottom:var(--space-4);">' + progressBar(done, stories.length) + '</div>' +
      '<div class="term-action-bar">' +
        '<button class="term-run-btn" onclick="runAndOpenTerm(\'sprint-' + esc(s.id) + '\',\'/rihal-execute-sprint ' + esc(s.id) + '\',\'Sprint ' + esc(s.id) + '\')">▶ Run Sprint</button>' +
        '<button class="term-run-btn outline" onclick="openTermPanel(\'sprint-' + esc(s.id) + '\',\'Sprint ' + esc(s.id) + '\')">📟 Terminal</button>' +
      '</div>' +
      '<div class="view-title" style="margin-top:var(--space-4)">Tasks</div>' +
      '<div class="phase-list">' + (stories.length ? stories.map(taskCard).join('') :
        '<div class="empty">No tasks in this sprint yet.<div class="empty-action">Run /rihal-create-story to add tasks</div></div>') + '</div>' +
      acHtml + cmdAccordion(sprintHints(s));
  } else {
    var slHints = [cmdHint('/rihal-sprint-planning', 'Plan a new sprint'), cmdHint('/rihal-stats', 'Project statistics')];
    var curSp = sprints.find(sp => sp.id === S.currentSprint);
    if (curSp) { slHints.push(cmdHint('/rihal-execute', 'Execute current sprint ' + curSp.id)); slHints.push(cmdHint('/rihal-sprint-status', 'Status of Sprint ' + curSp.id)); }
    el.innerHTML = '<div class="view-title">Sprints</div>' + filterInput('sprints-inner') +
      '<div id="sprints-inner" class="phase-list">' +
      (sprints.length ? sprints.map(sprintCard).join('') :
        '<div class="empty">No sprints yet.<div class="empty-action">Run /rihal-plan to create sprints</div></div>') + '</div>' + cmdAccordion(slHints);
  }
}

function renderTasks() {
  const el = document.getElementById('view-tasks');
  const tasks = allTasks();
  // #295: aggregate points
  const totalPts = tasks.reduce((sum, t) => sum + (t.points || 0), 0);
  const donePts = tasks.filter(t => t.status === 'done' || t.status === 'completed').reduce((sum, t) => sum + (t.points || 0), 0);
  // #296: filter by status + #297: sort options
  el.innerHTML = '<div class="view-title">Tasks</div>' +
    '<div class="filter-bar">' +
    '<input class="filter-input" type="text" placeholder="Filter…" oninput="filterItems(this,\\'tasks-inner\\')">' +
    '<select class="filter-select" id="task-status-filter" onchange="filterTasksByStatus()">' +
    '<option value="">All statuses</option><option value="todo">Todo</option>' +
    '<option value="in_progress">In Progress</option><option value="done">Done</option>' +
    '<option value="blocked">Blocked</option></select>' +
    '<select class="filter-select" id="task-sort" onchange="sortTasks()">' +
    '<option value="default">Default order</option><option value="status">By status</option>' +
    '<option value="points-desc">Points ↓</option><option value="points-asc">Points ↑</option></select>' +
    '</div>' +
    (totalPts > 0 ? '<div style="color:var(--text-muted);font-size:var(--text-sm);margin-bottom:var(--space-4);">' +
      donePts + '/' + totalPts + ' points completed</div>' : '') +
    // #294: group by sprint
    '<div id="tasks-inner" class="phase-list">' +
    renderTasksGrouped(tasks) + '</div>';
  // Task hints accordion
  var tHints = [cmdHint('/rihal-create-story', 'Add a new story/task'), cmdHint('/rihal-sprint-planning', 'Plan the next sprint')];
  var allDone = tasks.length > 0 && tasks.every(t => t.status === 'done' || t.status === 'completed');
  var hasBlocked = tasks.some(t => t.status === 'blocked');
  if (allDone) { tHints.push(cmdHint('/rihal-verify-work', 'Verify all tasks pass UAT')); tHints.push(cmdHint('/rihal-audit-uat', 'Audit UAT coverage')); }
  if (hasBlocked) { tHints.push(cmdHint('/rihal-debug', 'Debug blocked tasks')); tHints.push(cmdHint('/rihal-correct-course', 'Course-correct blockers')); }
  el.innerHTML += cmdAccordion(tHints);
}

function renderTasksGrouped(tasks) {
  if (!tasks.length) {
    var phaseHint = S.currentPhase ? ' ' + S.currentPhase : '';
    return '<div class="empty">No tasks yet.' +
      '<div class="empty-action">Run <code>/rihal-plan' + phaseHint + '</code> to generate tasks for this project.</div></div>';
  }
  const groups = {};
  for (const t of tasks) {
    const key = t.sprintId || 'unassigned';
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  }
  let h = '';
  for (const [sprintId, items] of Object.entries(groups)) {
    h += '<div style="margin-bottom:var(--space-4);"><div style="font-size:var(--text-sm);font-weight:600;color:var(--text-muted);margin-bottom:var(--space-2);">Sprint ' + esc(sprintId) + '</div>';
    h += items.map(taskCard).join('');
    h += '</div>';
  }
  return h;
}

function filterTasksByStatus() {
  const status = document.getElementById('task-status-filter')?.value || '';
  const el = document.getElementById('tasks-inner');
  if (!el) return;
  el.querySelectorAll('.item').forEach(item => {
    if (!status) { item.style.display = ''; return; }
    const s = item.dataset.status || '';
    const match = status === 'done' ? (s === 'done' || s === 'completed') : s === status;
    item.style.display = match ? '' : 'none';
  });
}

function sortTasks() {
  const sort = document.getElementById('task-sort')?.value || 'default';
  const tasks = allTasks();
  if (sort === 'status') tasks.sort((a,b) => (a.status||'').localeCompare(b.status||''));
  else if (sort === 'points-desc') tasks.sort((a,b) => (b.points||0) - (a.points||0));
  else if (sort === 'points-asc') tasks.sort((a,b) => (a.points||0) - (b.points||0));
  const el = document.getElementById('tasks-inner');
  if (el) el.innerHTML = sort === 'default' ? renderTasksGrouped(tasks) : tasks.map(taskCard).join('');
}

// ── Kanban + Orchestrator ────────────────────────────────────────────────────
// Run/Stop talk to orchestrator on :7718.
// Terminals render in the side panel (#orch-panel), not inline in cards.
var ORCH = 'http://localhost:7718';
var _orchStreams = {};   // Map<storyId, EventSource>
var _panelActive = null; // currently active storyId in panel
var _sessions    = {};   // Map<storyId, { title, termEl, fileOpBuf[] }>

function kanbanCol(status) {
  if (status === 'done' || status === 'completed') return 'done';
  if (status === 'in_progress' || status === 'active' || status === 'running') return 'in_progress';
  if (status === 'blocked') return 'blocked';
  return 'todo';
}

// ── Kanban render ────────────────────────────────────────────────
function renderKanban() {
  const el = document.getElementById('view-kanban');
  if (!el) return;
  const tasks = allTasks();
  const cols = [
    { id: 'todo',        label: 'Todo',        cssClass: 'col-todo' },
    { id: 'in_progress', label: 'In Progress',  cssClass: 'col-prog' },
    { id: 'blocked',     label: 'Blocked',      cssClass: 'col-blocked' },
    { id: 'done',        label: 'Done',         cssClass: 'col-done' },
  ];
  const buckets = { todo: [], in_progress: [], blocked: [], done: [] };
  for (const t of tasks) buckets[kanbanCol(t.status)].push(t);

  // Topbar
  let h = '<div class="kanban-topbar">' +
    '<div class="kanban-topbar-title">' +
      '<span class="orch-status-dot" id="orch-dot"></span>' +
      'Kanban' +
    '</div>' +
    '<div class="kanban-topbar-actions">' +
      '<button class="kanban-refresh-btn" onclick="refreshOrchestratorStatus()">⟳ Sync</button>' +
      '<button class="kanban-refresh-btn" onclick="openOrchPanel(null)" style="margin-left:4px;">⊞ Sessions</button>' +
    '</div>' +
  '</div>';

  if (!tasks.length) {
    el.innerHTML = h + '<div class="empty" style="margin:24px;">' +
      'No stories yet.<div class="empty-action">/rihal-plan to generate tasks</div></div>';
    return;
  }

  h += '<div class="kanban-board">';
  for (const col of cols) {
    const items = buckets[col.id];
    h += '<div class="kanban-col ' + col.cssClass + '" data-col="' + col.id + '">' +
      '<div class="kanban-col-head">' +
        '<span class="col-label"><span class="col-status-dot"></span>' + esc(col.label) + '</span>' +
        '<span class="kanban-count">' + items.length + '</span>' +
      '</div>' +
      '<div class="kanban-col-body">';
    for (const t of items) {
      const c  = kanbanCol(t.status);
      const sid = esc(t.id || '');
      const canRun = c === 'todo' || c === 'blocked';
      const isRunning = c === 'in_progress';
      const pts = t.points ? t.points + 'p' : null;
      const phase = t.phaseId ? 'P' + t.phaseId : null;
      const sprintMeta = [pts, phase].filter(Boolean).join(' · ');
      const actionBtn = sid
        ? (canRun
            ? '<button class="kanban-run-btn" data-action="run">▶ Run</button>'
            : isRunning
              ? '<button class="kanban-stop-btn" data-action="stop">■ Stop</button>' +
                '<button class="kanban-view-btn" data-action="view">↗ View</button>'
              : '<button class="kanban-view-btn" data-action="view">↗ Logs</button>')
        : '';
      h += '<div class="kanban-card s-' + c + (isRunning ? ' running' : '') +
            '" data-story-id="' + sid + '" draggable="true">' +
        '<div class="kanban-card-header">' +
          '<div class="kanban-card-title">' + esc(t.title || t.id || 'Untitled') + '</div>' +
          (sid ? '<div class="kanban-card-id">' + sid.slice(0, 8) + '</div>' : '') +
        '</div>' +
        (sprintMeta ? '<div class="kanban-card-meta">' +
          '<span class="kanban-card-sprint">' + esc(sprintMeta) + '</span>' +
          '<span class="kanban-card-status">' + esc(col.label) + '</span>' +
        '</div>' : '') +
        (isRunning ? '<div class="card-run-indicator" id="run-ind-' + sid + '">' +
          '<span class="run-pulse"></span>running' +
        '</div>' : '') +
        (actionBtn ? '<div class="kanban-card-actions">' + actionBtn + '</div>' : '') +
      '</div>';
    }
    h += '</div></div>'; // .kanban-col-body + .kanban-col
  }
  h += '</div>'; // .kanban-board

  el.innerHTML = h;
  wireKanbanDnd();
  refreshOrchestratorStatus();
}

function getCard(sid) { return document.querySelector('[data-story-id="' + sid + '"]'); }

// ── Orchestrator panel ───────────────────────────────────────────

function _ensureSession(storyId, title) {
  if (_sessions[storyId]) return _sessions[storyId];
  var termEl = document.createElement('div');
  termEl.style.cssText = 'padding:16px 20px;font-family:var(--font-mono);font-size:12px;line-height:1.6;min-height:100%;';
  _sessions[storyId] = { title: title || storyId, termEl, fileOpBuf: [] };
  return _sessions[storyId];
}

function createPanelTab(storyId, title) {
  _ensureSession(storyId, title);
  var tabs = document.getElementById('orch-tabs');
  if (!tabs) return;
  // Remove placeholder
  var ph = tabs.querySelector('.orch-term-empty');
  if (ph) ph.remove();
  if (document.getElementById('orch-tab-' + storyId)) return;
  var tab = document.createElement('button');
  tab.className = 'orch-tab';
  tab.id = 'orch-tab-' + storyId;
  tab.dataset.storyId = storyId;
  var shortTitle = (title || storyId).slice(0, 20);
  tab.innerHTML =
    '<span class="tab-status-dot starting" id="tdot-' + storyId + '"></span>' +
    '<span>' + esc(shortTitle) + '</span>' +
    '<button class="orch-tab-close" data-sid="' + storyId + '" title="Close">✕</button>';
  tab.onclick = function(e) {
    if (e.target.dataset.sid) { closePanelTab(e.target.dataset.sid); return; }
    activatePanelTab(storyId);
  };
  tabs.appendChild(tab);
}

function activatePanelTab(storyId) {
  document.querySelectorAll('.orch-tab').forEach(function(t) { t.classList.remove('active'); });
  var tab = document.getElementById('orch-tab-' + storyId);
  if (tab) tab.classList.add('active');
  _panelActive = storyId;

  var body = document.getElementById('orch-term-body');
  var sess = _sessions[storyId];
  if (body) {
    body.innerHTML = '';
    if (sess) {
      body.appendChild(sess.termEl);
      body.scrollTop = body.scrollHeight;
    }
  }

  var filesEl = document.getElementById('orch-files');
  if (filesEl && sess) {
    filesEl.style.display = sess.fileOpBuf.length ? '' : 'none';
    while (filesEl.children.length > 1) filesEl.removeChild(filesEl.lastChild);
    sess.fileOpBuf.forEach(function(fo) { filesEl.appendChild(_renderFileOpEl(fo)); });
  }

  var stopBtn = document.getElementById('orch-stop-btn');
  if (stopBtn) stopBtn.style.display = _orchStreams[storyId] ? '' : 'none';

  var statusEl = document.getElementById('orch-session-status');
  if (statusEl) {
    var running = Object.keys(_orchStreams).length;
    statusEl.textContent = running > 0 ? running + ' running' : '';
  }
}

function setTabStatus(storyId, status) {
  var dot = document.getElementById('tdot-' + storyId);
  if (dot) dot.className = 'tab-status-dot ' + (status || 'starting');
}

function openOrchPanel(storyId) {
  var panel = document.getElementById('orch-panel');
  if (panel) panel.classList.add('open');
  if (storyId && _sessions[storyId]) activatePanelTab(storyId);
  else if (storyId) {
    // Show empty state if no session yet
    var body = document.getElementById('orch-term-body');
    if (body) body.innerHTML = '<div class="orch-term-empty"><div>No output yet for ' + esc(storyId) + '</div></div>';
  }
}

function closeOrchPanel() {
  var panel = document.getElementById('orch-panel');
  if (panel) panel.classList.remove('open');
  _panelActive = null;
}

function closePanelTab(storyId) {
  var tab = document.getElementById('orch-tab-' + storyId);
  if (tab) tab.remove();
  delete _sessions[storyId];
  if (_orchStreams[storyId]) { _orchStreams[storyId].close(); delete _orchStreams[storyId]; }
  if (_panelActive === storyId) {
    var remaining = document.querySelectorAll('.orch-tab');
    if (remaining.length > 0) {
      activatePanelTab(remaining[0].dataset.storyId);
    } else {
      var tabs = document.getElementById('orch-tabs');
      if (tabs) tabs.innerHTML = '<div class="orch-term-empty" style="padding:6px 8px;font-size:11px;">No active sessions</div>';
      var body = document.getElementById('orch-term-body');
      if (body) body.innerHTML = '<div class="orch-term-empty"><div>Select a session or run a story card</div></div>';
      closeOrchPanel();
    }
  }
}

function stopActiveSession() {
  if (_panelActive) stopStory(_panelActive);
}

function clearActiveTerminal() {
  if (!_panelActive || !_sessions[_panelActive]) return;
  _sessions[_panelActive].termEl.innerHTML = '';
  _sessions[_panelActive].fileOpBuf = [];
  var filesEl = document.getElementById('orch-files');
  if (filesEl) {
    filesEl.style.display = 'none';
    while (filesEl.children.length > 1) filesEl.removeChild(filesEl.lastChild);
  }
}

function openCleanSessions() {
  fetch(ORCH + '/api/clean-sessions', { method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ olderThanDays: 7 }) })
  .then(function(r) { return r.json(); })
  .then(function(d) { showToast('Cleaned ' + (d.removed || 0) + ' sessions'); })
  .catch(function() { showToast('Clean sessions: start orchestrator first'); });
}

function _renderFileOpEl(fileOp) {
  var div = document.createElement('div');
  div.className = 'kt-file';
  var opClass = fileOp.op === 'write' ? 'op-w' : fileOp.op === 'bash' ? 'op-b' : 'op-r';
  var opLabel = fileOp.op === 'write' ? '✎' : fileOp.op === 'bash' ? '$' : '👁';
  var label   = fileOp.path || fileOp.cmd || fileOp.tool;
  div.innerHTML = '<span class="op-icon ' + opClass + '">' + opLabel + '</span> ' + esc(String(label));
  return div;
}

// ── Terminal append (redirect to panel) ─────────────────────────

function appendCardChunk(storyId, chunk) {
  var sess = _sessions[storyId];
  if (!sess) return;
  var last = sess.termEl.lastElementChild;
  if (!last || !last.classList.contains('kt-stream')) {
    last = document.createElement('div');
    last.className = 'kt-stream';
    sess.termEl.appendChild(last);
  }
  last.textContent += chunk;
  if (_panelActive === storyId) {
    var body = document.getElementById('orch-term-body');
    if (body) body.scrollTop = body.scrollHeight;
  }
}

function appendCardLog(storyId, line) {
  var sess = _sessions[storyId];
  if (!sess) return;
  var div = document.createElement('div');
  var cls = 'kt-line';
  if (line.startsWith('⚙'))  cls += ' tool';
  else if (line.startsWith('⚠')) cls += ' warn';
  else if (line.startsWith('✗')) cls += ' err';
  else if (line.startsWith('✅')) cls += ' done-line';
  else if (line.startsWith('▶') || line.startsWith('◉') || line.startsWith('■')) cls += ' meta';
  div.className = cls;
  div.textContent = line;
  sess.termEl.appendChild(div);
  if (_panelActive === storyId) {
    var body = document.getElementById('orch-term-body');
    if (body) body.scrollTop = body.scrollHeight;
  }
}

function appendCardFileOp(storyId, fileOp) {
  var sess = _sessions[storyId];
  if (!sess) return;
  sess.fileOpBuf.push(fileOp);
  if (_panelActive === storyId) {
    var filesEl = document.getElementById('orch-files');
    if (filesEl) { filesEl.style.display = ''; filesEl.appendChild(_renderFileOpEl(fileOp)); }
  }
}

// ── Run / stop ───────────────────────────────────────────────────

function runStory(storyId) {
  if (!storyId) return;
  var card = getCard(storyId);
  var title = card ? (card.querySelector('.kanban-card-title') || {}).textContent : storyId;
  createPanelTab(storyId, title || storyId);
  openOrchPanel(storyId);
  appendCardLog(storyId, '▶ Starting: ' + storyId);

  fetch(ORCH + '/api/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (window.__ORCH_TOKEN__ || '') },
    body: JSON.stringify({ storyId }),
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    if (data.error) { appendCardLog(storyId, '✗ ' + data.error); setTabStatus(storyId, 'error'); return; }
    appendCardLog(storyId, '▶ pid ' + data.pid);
    setTabStatus(storyId, 'running');
    moveKanbanCard(storyId, 'in_progress');
    connectOrchestratorStream(storyId);
  })
  .catch(function(err) {
    appendCardLog(storyId, '✗ Orchestrator unreachable — ' + err.message);
    appendCardLog(storyId, '  Start with: node server/dashboard.js');
    setTabStatus(storyId, 'error');
  });
}

function stopStory(storyId) {
  appendCardLog(storyId, '■ Stopping…');
  fetch(ORCH + '/api/stop', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (window.__ORCH_TOKEN__ || '') },
    body: JSON.stringify({ storyId }),
  }).catch(function() {});
}

// ── SSE stream ───────────────────────────────────────────────────

function connectOrchestratorStream(storyId) {
  if (_orchStreams[storyId]) _orchStreams[storyId].close();
  var es = new EventSource(ORCH + '/api/stream/' + encodeURIComponent(storyId));
  _orchStreams[storyId] = es;

  es.onmessage = function(e) {
    try {
      var d = JSON.parse(e.data);
      if (d.chunk)  appendCardChunk(storyId, d.chunk);
      if (d.line)   appendCardLog(storyId, d.line);
      if (d.fileOp) appendCardFileOp(storyId, d.fileOp);
      if (d.status) {
        var st = d.status;
        setTabStatus(storyId, st);
        if (st === 'done')    { appendCardLog(storyId, '✅ Done'); moveKanbanCard(storyId, 'done'); }
        if (st === 'error')   moveKanbanCard(storyId, 'blocked');
        if (st === 'stopped') appendCardLog(storyId, '■ Stopped');
        if (st !== 'running') {
          es.close(); delete _orchStreams[storyId];
          var stopBtn = document.getElementById('orch-stop-btn');
          if (stopBtn && _panelActive === storyId) stopBtn.style.display = 'none';
          _updateOrchDot();
        }
      }
    } catch {}
  };
  es.onerror = function() {
    es.close(); delete _orchStreams[storyId];
    setTabStatus(storyId, 'error');
    _updateOrchDot();
  };
  _updateOrchDot();
}

function _updateOrchDot() {
  var running = Object.keys(_orchStreams).length;
  // Global orch status dot in kanban topbar
  var dot = document.getElementById('orch-dot');
  if (dot) {
    dot.className = 'orch-status-dot' + (running > 0 ? ' up' : '');
  }
  // Panel orch dot
  var pdot = document.getElementById('orch-panel-orch-dot');
  if (pdot) {
    pdot.className = 'orch-status-dot' + (running > 0 ? ' up' : '');
  }
}

function refreshOrchestratorStatus() {
  fetch(ORCH + '/api/status', { headers: { 'Authorization': 'Bearer ' + (window.__ORCH_TOKEN__ || '') } })
    .then(function(r) { return r.json(); })
    .then(function(status) {
      // Mark orch as reachable
      var dot = document.getElementById('orch-dot');
      if (dot && !Object.keys(_orchStreams).length) dot.className = 'orch-status-dot';
      for (var sid in status) {
        var info = status[sid];
        if (info.status === 'running') {
          moveKanbanCard(sid, 'in_progress');
          if (!_orchStreams[sid]) {
            var card = getCard(sid);
            var title = card ? (card.querySelector('.kanban-card-title') || {}).textContent : sid;
            createPanelTab(sid, title);
            connectOrchestratorStream(sid);
          }
        } else if (info.status === 'done') {
          moveKanbanCard(sid, 'done');
        }
        // Restore last session logs from /api/status if available
        if (info.logs && info.logs.length && !_sessions[sid]) {
          _ensureSession(sid, sid);
          createPanelTab(sid, sid);
          info.logs.forEach(function(line) { appendCardLog(sid, line); });
          setTabStatus(sid, info.status);
        }
      }
    })
    .catch(function() {
      var dot = document.getElementById('orch-dot');
      if (dot) dot.className = 'orch-status-dot down';
    });
}

// ── Move card between columns ────────────────────────────────────

function moveKanbanCard(storyId, colId) {
  var card = getCard(storyId);
  var colBody = document.querySelector('.kanban-col[data-col="' + colId + '"] .kanban-col-body');
  if (!card || !colBody) return;
  colBody.appendChild(card);

  // Update card class
  card.className = card.className.replace(/\bs-\w+\b/g, '').replace(/\brunning\b/g, '').trim();
  card.classList.add('s-' + colId);
  if (colId === 'in_progress') card.classList.add('running');

  // Swap action button
  var actions = card.querySelector('.kanban-card-actions');
  if (actions) {
    if (colId === 'in_progress') {
      actions.innerHTML =
        '<button class="kanban-stop-btn" data-action="stop">■ Stop</button>' +
        '<button class="kanban-view-btn" data-action="view">↗ View</button>';
    } else if (colId === 'done') {
      actions.innerHTML = '<button class="kanban-view-btn" data-action="view">↗ Logs</button>';
    } else {
      actions.innerHTML = '<button class="kanban-run-btn" data-action="run">▶ Run</button>';
    }
    wireKanbanCardButtons(card);
  }

  // Running indicator
  var ind = card.querySelector('.card-run-indicator');
  if (colId === 'in_progress' && !ind) {
    var indEl = document.createElement('div');
    indEl.className = 'card-run-indicator';
    indEl.id = 'run-ind-' + storyId;
    indEl.innerHTML = '<span class="run-pulse"></span>running';
    card.insertBefore(indEl, actions);
  } else if (colId !== 'in_progress' && ind) {
    ind.remove();
  }

  refreshKanbanCounts();
}

function wireKanbanLogButtons() {} // compat shim

function wireKanbanCardButtons(card) {
  var sid = card.dataset.storyId;
  if (!sid) return;
  card.querySelectorAll('[data-action="run"]').forEach(function(btn) {
    btn.onclick = function(e) { e.stopPropagation(); runStory(sid); };
  });
  card.querySelectorAll('[data-action="stop"]').forEach(function(btn) {
    btn.onclick = function(e) { e.stopPropagation(); stopStory(sid); };
  });
  card.querySelectorAll('[data-action="view"]').forEach(function(btn) {
    btn.onclick = function(e) { e.stopPropagation(); openOrchPanel(sid); };
  });
}

function wireKanbanDnd() {
  let dragged = null;
  document.querySelectorAll('.kanban-card').forEach(card => {
    wireKanbanCardButtons(card);
    card.addEventListener('dragstart', e => {
      if (e.target.tagName === 'BUTTON') { e.preventDefault(); return; }
      dragged = card; card.style.opacity = '0.5';
    });
    card.addEventListener('dragend', () => {
      dragged = null; if (card) card.style.opacity = '';
    });
  });
  document.querySelectorAll('.kanban-col-body').forEach(body => {
    body.addEventListener('dragover', e => { e.preventDefault(); body.classList.add('drag-target'); });
    body.addEventListener('dragleave', () => body.classList.remove('drag-target'));
    body.addEventListener('drop', e => {
      e.preventDefault();
      body.classList.remove('drag-target');
      if (!dragged) return;
      body.appendChild(dragged);
      dragged.style.opacity = '';
      refreshKanbanCounts();
      showToast('Moved (visual only — not persisted)');
    });
  });
}

function refreshKanbanCounts() {
  document.querySelectorAll('.kanban-col').forEach(col => {
    const n = col.querySelectorAll('.kanban-card').length;
    const badge = col.querySelector('.kanban-count');
    if (badge) badge.textContent = n;
  });
}

// #283: view plan file
async function viewPlanFile(phaseId) {
  // Try to find the plan file via the file tree
  const padded = String(phaseId).padStart(2, '0');
  const items = document.querySelectorAll('.file-tree-item');
  for (const item of items) {
    const p = item.dataset.path || '';
    if (p.includes('phases') && p.includes(padded) && (p.includes('PLAN') || p.includes('SPRINT'))) {
      item.click();
      return;
    }
  }
  // Fallback: navigate to files view
  navTo('files');
}

// ---- Tree toggle (with #311 animation) ----
function toggleNode(row) {
  const children = row.nextElementSibling;
  const chevron = row.querySelector('.tree-chevron');
  if (!children) return;
  const open = children.style.display !== 'none';
  children.style.display = open ? 'none' : 'block';
  if (chevron) chevron.textContent = open ? '▶' : '▼';
}

// #277: collapse/expand all roadmap nodes
function toggleAllRoadmap(expand) {
  document.querySelectorAll('#roadmap-tree .tree-children').forEach(c => {
    c.style.display = expand ? 'block' : 'none';
  });
  document.querySelectorAll('#roadmap-tree .tree-chevron').forEach(ch => {
    ch.textContent = expand ? '▼' : '▶';
  });
  // Keep root open
  const root = document.querySelector('#roadmap-tree .tree-ms > .tree-row + .tree-children');
  if (root) root.style.display = 'block';
  const rootChev = document.querySelector('#roadmap-tree .tree-ms > .tree-row .tree-chevron');
  if (rootChev) rootChev.textContent = '▼';
}

// ---- Hash router ----
function navTo(hash) { location.hash = hash; }

function route() {
  const raw = location.hash.slice(1) || 'overview';
  const slash = raw.indexOf('/');
  const view  = slash === -1 ? raw : raw.slice(0, slash);
  const subId = slash === -1 ? null : raw.slice(slash + 1);

  // Fix #264: highlight active nav on reload
  document.querySelectorAll('.nav-link[data-view]').forEach(l =>
    l.classList.toggle('active', l.dataset.view === view));
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const el = document.getElementById('view-' + view);
  if (el) {
    el.classList.add('active');
  } else {
    // Fix #263: unknown hash routes show overview instead of blank
    document.getElementById('view-overview')?.classList.add('active');
    document.querySelector('.nav-link[data-view="overview"]')?.classList.add('active');
  }

  // #310: scroll to top on view switch
  document.querySelector('.content-area')?.scrollTo(0, 0);

  // Close orchestrator panel when leaving kanban — it's fixed-position and overlaps other views
  if (view !== 'kanban') closeOrchPanel();

  if (view === 'overview')        renderOverview();
  else if (view === 'roadmap')    renderRoadmap();
  else if (view === 'milestones') renderMilestones(subId);
  else if (view === 'phases')     renderPhases(subId);
  else if (view === 'sprints')    renderSprints(subId);
  else if (view === 'tasks')      renderTasks();
  else if (view === 'kanban')     renderKanban();
  else if (view === 'decisions')  renderDecisions();
  else if (view === 'memory')     renderMemory();
}

function renderMemory() {
  const el = document.getElementById('view-memory-content');
  if (!el) return;
  el.innerHTML = '<div class="view-title">🧠 Memory Bank</div><div class="empty">Loading…</div>';
  fetch('/api/memory').then(r => r.json()).then(m => {
    if (!m.exists) {
      el.innerHTML = '<div class="view-title">🧠 Memory Bank</div>' +
        '<div class="empty"><h3 style="color:var(--rihal-gold);">Not initialised</h3>' +
        '<p>The Memory Bank is rcode\\'s structured project context.</p>' +
        '<div class="empty-action">Run <code>/rcode:memory-init</code> to bootstrap</div></div>';
      return;
    }
    let h = '<div class="view-title">🧠 Memory Bank</div>';
    if (!m.initialised) {
      h += '<div class="empty"><p>Directory exists but INDEX.md is missing — re-run <code>/rcode:memory-init</code></p></div>';
      el.innerHTML = h;
      return;
    }
    const sections = m.sections || {};
    h += '<div class="filter-bar"><span style="color:var(--text-muted);font-size:var(--text-sm);">Last scanned: ' + esc(m.lastScanned) + '</span></div>';
    h += '<div id="memory-sections">';
    for (const [section, files] of Object.entries(sections)) {
      h += '<div class="memory-group-header">' + esc(section) + '</div>';
      h += '<div class="decision-list">';
      for (const f of files) {
        const status = f.exists ? (f.populated ? '✓' : '○') : '✗';
        const meta = f.exists ? (f.populated ? 'populated' : 'template only') : 'missing';
        h += '<div class="item">' +
          '<div class="item-title">' + status + ' ' + esc(f.name) + '</div>' +
          '<div class="item-meta">' + esc(meta) + ' · ' + (f.bytes || 0) + ' bytes</div>' +
          '</div>';
      }
      h += '</div>';
    }
    function listGroup(label, items) {
      if (!items || !items.length) return '';
      let g = '<div class="memory-group-header">' + esc(label) + ' (' + items.length + ')</div>';
      g += '<div class="decision-list">';
      for (const f of items) {
        g += '<div class="item">' +
          '<div class="item-title">' + esc(f.name) + '</div></div>';
      }
      g += '</div>';
      return g;
    }
    h += listGroup('Distillates', m.distillates);
    h += listGroup('Change Records', m.changeRecords);
    h += listGroup('Milestone Archive', m.archive);
    h += listGroup('Post-mortems', m.postMortems);
    h += '</div>';
    h += cmdAccordion([
      cmdHint('/rcode:memory-init',    'Bootstrap the Memory Bank'),
      cmdHint('/rcode:memory-update',  'Append a decision, issue, or stakeholder entry'),
      cmdHint('/rcode:memory-distill', 'Regenerate fast-load distillates'),
      cmdHint('/rcode:memory-audit',   'Find stale entries and gaps')
    ]);
    el.innerHTML = h;
  }).catch(err => {
    el.innerHTML = '<div class="view-title">🧠 Memory Bank</div><div class="empty">Failed to load /api/memory: ' + esc(String(err)) + '</div>';
  });
}

function renderDecisions() {
  const el = document.getElementById('view-decisions');
  if (!el) return;
  const decisions = S.decisions || [];
  if (!decisions.length) {
    el.innerHTML = '<div class="view-title">Decisions (ADRs)</div>' +
      '<div class="empty">No decisions recorded yet.<div class="empty-action">Decisions made during /rihal-council appear here</div></div>';
    return;
  }
  // #307: group by phase
  const grouped = {};
  for (const d of decisions) {
    const phase = (typeof d === 'object' ? d.phase : null) || 'General';
    if (!grouped[phase]) grouped[phase] = [];
    grouped[phase].push(d);
  }
  let h = '<div class="view-title">Decisions (ADRs)</div>' +
    '<div class="filter-bar"><input class="filter-input" type="text" placeholder="Filter…" oninput="filterItems(this,\\'decisions-inner\\')"></div>' +
    '<div id="decisions-inner">';
  for (const [phase, decs] of Object.entries(grouped)) {
    h += '<div class="memory-group-header">' + esc(phase) + '</div>';
    h += '<div class="decision-list">';
    for (const d of decs) {
      const title = typeof d === 'string' ? d : (d.title || d.summary || d.decision || JSON.stringify(d).slice(0, 80));
      const filterText = String(title).toLowerCase();
      // #306: date and phase context
      const dateInfo = (typeof d === 'object' && d.date) ? '<span style="color:var(--text-muted);font-size:var(--text-xs);margin-left:8px;">' + humanDate(d.date) + '</span>' : '';
      const phaseInfo = (typeof d === 'object' && d.phase) ? tag('Phase ' + d.phase) : '';
      h += '<div class="item" data-filter-text="' + esc(filterText) + '">' +
        '<div class="item-title">' + esc(title) + dateInfo + '</div>' +
        '<div class="item-meta">' + phaseInfo + '</div>' +
        // #308: rationale
        (typeof d === 'object' && d.rationale ? '<div style="color:var(--text-secondary);font-size:var(--text-sm);margin-top:4px;">' + esc(d.rationale) + '</div>' : '') +
        '</div>';
    }
    h += '</div>';
  }
  h += '</div>';
  el.innerHTML = h + cmdAccordion([
    cmdHint('/rihal-council', 'Convene the council for a new decision'),
    cmdHint('/rihal-discuss [agent] \"topic\"', 'Discuss with a specific expert'),
    cmdHint('/rihal-decisions', 'View decision log')
  ]);
}

window.addEventListener('hashchange', route);
document.querySelectorAll('.nav-link[data-view]').forEach(l =>
  l.addEventListener('click', () => navTo(l.dataset.view)));

// ---- Inline filter ----
function filterItems(input, listId) {
  const q = input.value.toLowerCase().trim();
  const el = document.getElementById(listId);
  if (!el) return;
  // Target both list items and agent cards
  el.querySelectorAll('.item, .agent-card').forEach(item => {
    item.style.display = !q || item.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

// ---- Shared file-list fetch (single request for all consumers) ----
const _filesPromise = fetch('/api/files').then(function(r) { return r.json(); }).catch(function() { return []; });

// Inline file list inside Files view
(async function() {
  let groups = [];
  try { groups = await _filesPromise; } catch { return; }
  const el = document.getElementById('file-list-inline');
  if (!el) return;
  let h = '<div class="filter-bar"><input class="filter-input" type="text" placeholder="Search files…" oninput="filterInlineFiles(this.value)"></div>';
  h += '<div id="inline-file-items" class="phase-list">';

  function renderFileItem(f, extraFilterText) {
    var filterText = esc(f.label + ' ' + f.path + (extraFilterText ? ' ' + extraFilterText : '')).toLowerCase();
    return '<div class="item item-clickable inline-file-entry" data-path="' + esc(f.path) + '" data-filter-text="' + filterText + '" onclick="loadInlineFile(this)" style="padding:var(--space-2) var(--space-3);font-family:\\'SF Mono\\',Monaco,Consolas,monospace;font-size:var(--text-xs);">' + esc(f.label) + '</div>';
  }

  groups.forEach(function(g) {
    h += '<div class="inline-file-group" style="margin-bottom:var(--space-3);">';
    h += '<div style="font-size:var(--text-xs);font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.07em;padding:var(--space-1) var(--space-3);">' + esc(g.group) + '</div>';
    if (g.subGroups) {
      // Render expandable sub-groups (e.g. per-phase)
      g.subGroups.forEach(function(sg) {
        h += '<details class="inline-subgroup" open style="margin-left:var(--space-2);margin-bottom:var(--space-1);">';
        h += '<summary style="font-size:var(--text-xs);font-weight:500;color:var(--text-secondary);cursor:pointer;padding:var(--space-1) var(--space-3);user-select:none;">' + esc(sg.subGroup) + ' <span style="color:var(--text-muted);font-weight:400;">(' + sg.files.length + ')</span></summary>';
        sg.files.forEach(function(f) {
          h += renderFileItem(f, sg.subGroup);
        });
        h += '</details>';
      });
    } else if (g.files) {
      g.files.forEach(function(f) {
        h += renderFileItem(f, '');
      });
    }
    h += '</div>';
  });
  h += '</div>';
  el.innerHTML = h;
})();
function filterInlineFiles(q) {
  q = q.toLowerCase().trim();
  document.querySelectorAll('#inline-file-items .inline-file-entry').forEach(function(item) {
    item.style.display = !q || (item.dataset.filterText || '').includes(q) ? '' : 'none';
  });
}
async function loadInlineFile(el) {
  var fv = document.getElementById('file-view');
  if (!fv) return;
  fv.innerHTML = '<div class="skeleton"></div><div class="skeleton" style="height:200px;"></div>';
  // Scroll file content into view immediately
  fv.scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.querySelectorAll('.inline-file-entry').forEach(function(e) { e.style.borderLeftColor = ''; });
  el.style.borderLeftColor = 'var(--accent-blue)';
  // Also sync sidebar selection
  document.querySelectorAll('.file-tree-item').forEach(function(e) {
    e.classList.toggle('selected', e.dataset.path === el.dataset.path);
  });
  try {
    var resp = await fetch('/api/file?path=' + encodeURIComponent(el.dataset.path));
    if (!resp.ok) { fv.innerHTML = '<div style="color:var(--accent-red);padding:16px;">Failed to load file.</div>'; return; }
    var text = await resp.text();
    fv.innerHTML = '<div class="file-path-header"><span>' + esc(el.dataset.path) + '</span>' +
      '<button class="copy-btn" onclick="navigator.clipboard.writeText(\\'' + el.dataset.path.replace(/'/g, "\\\\'") + '\\');showToast(\\'Path copied!\\')">📋 Copy</button></div>' +
      '<div class="md-render">' + renderMd(text) + '</div>';
  } catch { fv.innerHTML = '<div style="color:var(--accent-red);padding:16px;">Network error.</div>'; }
}

// ---- Markdown + frontmatter ----
function stripFrontmatter(md) {
  if (!md.startsWith('---')) return md;
  var end = md.indexOf('\\n---', 3);
  return end === -1 ? md : md.slice(end + 4).trimStart();
}
function renderMd(md) {
  var clean = stripFrontmatter(md);
  return (typeof marked !== 'undefined') ? marked.parse(clean) : '<pre>' + clean.replace(/</g,'&lt;') + '</pre>';
}

// ---- Open file from phase card ----
async function openFile(filePath) {
  navTo('files');
  document.querySelectorAll('.file-tree-item').forEach(function(el) {
    el.classList.toggle('selected', el.dataset.path === filePath);
  });
  var fv = document.getElementById('file-view');
  if (!fv) return;
  fv.innerHTML = '<div class="skeleton"></div><div class="skeleton" style="height:200px;"></div>';
  try {
    var resp = await fetch('/api/file?path=' + encodeURIComponent(filePath));
    if (!resp.ok) { fv.innerHTML = '<div style="color:var(--accent-red);padding:var(--space-8);">Failed.</div>'; return; }
    var text = await resp.text();
    fv.innerHTML = '<div class="file-path-header"><span>' + esc(filePath) + '</span></div>' +
      '<div class="md-render">' + renderMd(text) + '</div>';
  } catch { fv.innerHTML = '<div style="color:var(--accent-red);padding:var(--space-8);">Network error.</div>'; }
}

// ---- Refresh ----
var _lastScanned = ${JSON.stringify(state.lastScanned)};
var _scanTime = Date.now();
function renderUpdatedAgo() {
  var s = Math.floor((Date.now() - _scanTime) / 1000);
  var el = document.getElementById('updated-ago');
  if (el) el.textContent = s < 5 ? 'just now' : s < 60 ? s + 's ago' : Math.floor(s/60) + 'm ago';
}
setInterval(renderUpdatedAgo, 1000);

// #262: hot-swap without full page reload
async function fetchAndRerender() {
  var btn = document.getElementById('refresh-btn');
  if (btn) btn.textContent = '↺ …';
  try {
    var r = await fetch('/api/state');
    var newState = await r.json();
    _lastScanned = newState.lastScanned;
    _scanTime = Date.now();
    renderUpdatedAgo();
    // Update embedded data
    if (newState.raw) {
      S.phases = newState.raw.phases || [];
      S.milestone = newState.raw.milestone || '';
      S.currentPhase = newState.raw.current_phase || null;
      S.currentSprint = newState.raw.current_sprint || null;
      S.decisions = newState.raw.decisions || [];
      S.blockers = newState.raw.blockers || [];
      S.council_sessions = newState.raw.council_sessions || [];
      S.last_session = newState.raw.last_session || null;
      _phases.length = 0;
      _phases.push(...S.phases);
    }
    // #261: re-render active view
    route();
  } catch {}
  if (btn) btn.textContent = '↺ Refresh';
}
setInterval(async function() {
  try {
    var r = await fetch('/api/state');
    var s = await r.json();
    if (s.lastScanned !== _lastScanned) fetchAndRerender();
  } catch {}
}, 30000);
function manualRefresh() { fetchAndRerender(); }

// ---- Blocker banner ----
(function() {
  // #317: allow re-show via custom event
  if (sessionStorage.getItem('blockers-dismissed') === '1') {
    var b = document.getElementById('blocker-banner');
    if (b) b.style.display = 'none';
  }
})();
function dismissBlockers() {
  sessionStorage.setItem('blockers-dismissed','1');
  var b = document.getElementById('blocker-banner');
  if (b) b.style.display = 'none';
}
function showBlockers() {
  sessionStorage.removeItem('blockers-dismissed');
  var b = document.getElementById('blocker-banner');
  if (b) b.style.display = '';
}

// #309: keyboard shortcuts
document.addEventListener('keydown', function(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
  var key = e.key.toLowerCase();
  if (key === 'r' && !e.ctrlKey && !e.metaKey) { e.preventDefault(); manualRefresh(); }
  else if (key === 'f') { e.preventDefault(); var fi = document.querySelector('.view.active .filter-input'); if (fi) fi.focus(); }
  else if (key === '1') navTo('overview');
  else if (key === '2') navTo('roadmap');
  else if (key === '3') navTo('milestones');
  else if (key === '4') navTo('phases');
  else if (key === '5') navTo('sprints');
  else if (key === '6') navTo('tasks');
  else if (key === '7') navTo('files');
  else if (key === '8') navTo('agents');
  else if (key === '9') navTo('decisions');
  // #277: E/C for expand/collapse all in roadmap
  else if (key === 'e' && location.hash.includes('roadmap')) toggleAllRoadmap(true);
  else if (key === 'c' && location.hash.includes('roadmap')) toggleAllRoadmap(false);
});

// #318: export snapshot
function exportSnapshot() {
  var data = JSON.stringify(S, null, 2);
  var blob = new Blob([data], {type: 'application/json'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = 'majlis-snapshot-' + new Date().toISOString().slice(0,10) + '.json';
  a.click(); URL.revokeObjectURL(url);
  showToast('Snapshot exported!');
}

// #312: copy URL
function copyUrl() {
  navigator.clipboard.writeText(location.href);
  showToast('URL copied!');
}

// #313: dark/light mode
function toggleTheme() {
  var current = document.documentElement.getAttribute('data-theme');
  var next = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next === 'dark' ? '' : next);
  localStorage.setItem('majlis-theme', next);
  var btn = document.getElementById('theme-btn');
  if (btn) btn.textContent = next === 'light' ? '🌙' : '☀️';
}
(function() {
  var saved = localStorage.getItem('majlis-theme');
  if (saved === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    var btn = document.getElementById('theme-btn');
    if (btn) btn.textContent = '🌙';
  }
})();

// #324: dynamic title
var _origTitle = document.title;
function updateTitle() {
  var view = (location.hash.slice(1) || 'overview').split('/')[0];
  var viewNames = {overview:'Overview',roadmap:'Roadmap',milestones:'Milestones',phases:'Phases',sprints:'Sprints',tasks:'Tasks',files:'Files',agents:'Agents',decisions:'Decisions'};
  document.title = (viewNames[view] || 'Overview') + ' — Majlis';
}
window.addEventListener('hashchange', updateTitle);

// Sidebar toggle (hamburger menu)
function toggleSidebar() {
  var sidebar = document.querySelector('.sidebar');
  var backdrop = document.getElementById('sidebar-backdrop');
  if (!sidebar) return;
  var open = sidebar.classList.toggle('sidebar-open');
  if (backdrop) backdrop.classList.toggle('active', open);
  document.body.classList.toggle('sidebar-visible', open);
}
function closeSidebar() {
  var sidebar = document.querySelector('.sidebar');
  var backdrop = document.getElementById('sidebar-backdrop');
  if (sidebar) sidebar.classList.remove('sidebar-open');
  if (backdrop) backdrop.classList.remove('active');
  document.body.classList.remove('sidebar-visible');
}

// ---- Boot ----
route();
updateTitle();

// ── xterm Terminal Panel ─────────────────────────────────────────────────────
var _term = null;
var _termFit = null;
var _termEvt = null;
var _termStoryId = null;

function _orchToken() { return window.__ORCH_TOKEN__ || ''; }

function openTermPanel(storyId, title) {
  _termStoryId = storyId;
  document.getElementById('term-title').textContent = title || storyId;
  document.getElementById('term-panel').classList.add('open');
  document.getElementById('term-backdrop').classList.add('open');
  setTermDot('connecting');

  if (!_term && typeof Terminal !== 'undefined') {
    _term = new Terminal({
      theme: {
        background: '#0c0c0e', foreground: '#c9d1d9',
        cursor: '#58a6ff', selectionBackground: 'rgba(94,106,210,0.25)',
        black: '#0c0c0e', red: '#ff4444', green: '#3fb950',
        yellow: '#d29922', blue: '#58a6ff', magenta: '#bc8cff',
        cyan: '#39c5cf', white: '#b1bac4', brightBlack: '#6e7681',
      },
      fontFamily: '"JetBrains Mono","SF Mono",Consolas,monospace',
      fontSize: 12, lineHeight: 1.4, convertEol: true,
      scrollback: 5000, cursorStyle: 'bar',
    });
    if (typeof FitAddon !== 'undefined') {
      _termFit = new FitAddon.FitAddon();
      _term.loadAddon(_termFit);
    }
    _term.open(document.getElementById('term-container'));
    if (_termFit) _termFit.fit();
    _term.onData(function(data) {
      var tok = _orchToken();
      if (!_termStoryId || !tok) return;
      fetch('http://localhost:7718/api/message', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId: _termStoryId, data: data })
      }).catch(function() {});
    });
    window.addEventListener('resize', function() { if (_termFit) _termFit.fit(); });
  } else if (_term) {
    _term.clear();
    if (_termFit) _termFit.fit();
  }

  if (_termEvt) { _termEvt.close(); _termEvt = null; }
  var tok = _orchToken();
  if (!tok) {
    if (_term) _term.writeln('\r\x1b[31m✗ No orchestrator token — restart the dashboard\x1b[0m');
    return;
  }

  if (_term) _term.writeln('\x1b[90m── connecting to stream: ' + storyId + ' ──\x1b[0m\r\n');

  var url = 'http://localhost:7718/api/stream/' + encodeURIComponent(storyId) + '?token=' + tok;
  _termEvt = new EventSource(url);
  _termEvt.onmessage = function(e) {
    try {
      var d = JSON.parse(e.data);
      if (d.line)   { if (_term) _term.writeln('\r' + d.line); }
      if (d.chunk)  { if (_term) _term.write(d.chunk); }
      if (d.fileOp) { if (_term) _term.writeln('\r\x1b[36m[' + d.fileOp.type + '] ' + d.fileOp.path + '\x1b[0m'); }
      if (d.status) {
        setTermDot(d.status);
        if (d.status === 'done' || d.status === 'error' || d.status === 'stopped') {
          if (_term) _term.writeln('\r\n\x1b[90m── session ' + d.status + ' ──\x1b[0m');
          if (_termEvt) { _termEvt.close(); _termEvt = null; }
        } else {
          setTermDot(d.status);
        }
      }
      if (d.error)  { if (_term) _term.writeln('\r\x1b[31m✗ ' + d.error + '\x1b[0m'); }
    } catch(ex) {}
  };
  _termEvt.onerror = function() {
    if (_term) _term.writeln('\r\x1b[31m✗ stream disconnected\x1b[0m');
    setTermDot('error');
  };
}

function setTermDot(status) {
  var dot = document.getElementById('term-status-dot');
  if (dot) dot.className = 'term-status-dot ' + (status || '');
}

function closeTermPanel() {
  document.getElementById('term-panel').classList.remove('open');
  document.getElementById('term-backdrop').classList.remove('open');
  if (_termEvt) { _termEvt.close(); _termEvt = null; }
}

function termStop() {
  var tok = _orchToken();
  if (!_termStoryId || !tok) return;
  fetch('http://localhost:7718/api/stop', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json' },
    body: JSON.stringify({ storyId: _termStoryId })
  }).catch(function() {});
}

function termSend() {
  var inp = document.getElementById('term-input');
  if (!inp) return;
  var msg = (inp.value || '').trim();
  if (!msg) return;
  inp.value = '';
  var tok = _orchToken();
  if (!_termStoryId || !tok) return;
  if (_term) _term.writeln('\r\x1b[90m[you] ' + msg + '\x1b[0m');
  fetch('http://localhost:7718/api/message', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json' },
    body: JSON.stringify({ storyId: _termStoryId, data: msg + '\n' })
  }).catch(function() {});
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    var panel = document.getElementById('term-panel');
    if (panel && panel.classList.contains('open')) closeTermPanel();
  }
});

var _termInputEl = document.getElementById('term-input');
if (_termInputEl) {
  _termInputEl.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') termSend();
  });
}

function runAndOpenTerm(storyId, cmd, title) {
  var tok = _orchToken();
  openTermPanel(storyId, title || storyId);
  if (!tok) return;
  fetch('http://localhost:7718/api/run', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json' },
    body: JSON.stringify({ storyId: storyId, cmd: cmd })
  }).then(function(r) { return r.json(); })
  .then(function(data) {
    if (data.error && data.error !== 'already running') {
      if (_term) _term.writeln('\r\x1b[31m✗ ' + data.error + '\x1b[0m');
    } else if (data.error === 'already running') {
      if (_term) _term.writeln('\r\x1b[33m⚠ Already running (pid ' + data.pid + ') — showing live output\x1b[0m');
      setTermDot('running');
    }
  })
  .catch(function(err) {
    if (_term) _term.writeln('\r\x1b[31m✗ Orchestrator unreachable: ' + err.message + '\x1b[0m');
  });
}

// Also fix existing kanban run/stop to use auth token
var _origRunStory = window.runStory;

</script>`;
}

module.exports = { renderClientJs };
