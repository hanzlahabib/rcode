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
  var es = new EventSource(ORCH + '/api/stream/' + encodeURIComponent(storyId) + '?token=' + encodeURIComponent(window.__ORCH_TOKEN__ || ''));
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
  card.className = card.className.replace(/s-w+/g, '').replace(/running/g, '').trim();
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

