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
        '<p>The Memory Bank is rcode\'s structured project context.</p>' +
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
    '<div class="filter-bar"><input class="filter-input" type="text" placeholder="Filter…" oninput="filterItems(this,\'decisions-inner\')"></div>' +
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
    cmdHint('/rihal-discuss [agent] "topic"', 'Discuss with a specific expert'),
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
    return '<div class="item item-clickable inline-file-entry" data-path="' + esc(f.path) + '" data-filter-text="' + filterText + '" onclick="loadInlineFile(this)" style="padding:var(--space-2) var(--space-3);font-family:\'SF Mono\',Monaco,Consolas,monospace;font-size:var(--text-xs);">' + esc(f.label) + '</div>';
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
      '<button class="copy-btn" onclick="navigator.clipboard.writeText(\'' + el.dataset.path.replace(/'/g, "\\'") + '\');showToast(\'Path copied!\')">📋 Copy</button></div>' +
      '<div class="md-render">' + renderMd(text) + '</div>';
  } catch { fv.innerHTML = '<div style="color:var(--accent-red);padding:16px;">Network error.</div>'; }
}

// ---- Markdown + frontmatter ----
function stripFrontmatter(md) {
  if (!md.startsWith('---')) return md;
  var end = md.indexOf('\n---', 3);
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
var _lastScanned = "2026-05-15T17:02:21.818Z";
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

