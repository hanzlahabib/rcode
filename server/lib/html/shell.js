/**
 * HTML shell — composes the full page from CSS, views, and client JS.
 */
const { renderCss } = require('./css');
const { renderClientJs } = require('./client');

function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function renderHtml(state, orchToken) {
  const projectName = state.projectName || 'No project initialized';

  const agents = [
    { name: 'Sadiq Damani',         arabic: 'صادق',         role: 'Director of Strategy',              real: true, type: 'leadership' },
    { name: 'Waleed Al Harthi',     arabic: 'وليد',         role: 'CTO',                               real: true, type: 'leadership' },
    { name: 'Ahmed Al Hassani',     arabic: 'أحمد الحسني',  role: 'Technology & Development Director', real: true, type: 'leadership' },
    { name: 'Nasser',               arabic: 'ناصر',         role: 'Engineering Manager',               real: true, type: 'leadership' },
    { name: 'Hussain',              arabic: 'حسين',         role: 'PM + Scrum Master',                 type: 'product' },
    { name: 'Layla',                arabic: 'ليلى',         role: 'Lead UX Designer',                  type: 'design' },
    { name: 'Zahra',                arabic: 'زهرة',         role: 'Branding & Creative Director',      type: 'design' },
    { name: 'Omar',                 arabic: 'عمر',          role: 'Full-Stack Engineer',               type: 'engineering' },
    { name: 'Haitham Al Khamiyasi', arabic: 'هيثم',        role: 'Senior Frontend',                   real: true, type: 'engineering' },
    { name: 'Yousef',               arabic: 'يوسف',         role: 'Senior Backend',                    type: 'engineering' },
    { name: 'Zayd',                 arabic: 'زيد',          role: 'ML Engineer',                       type: 'engineering' },
    { name: 'Fatima',               arabic: 'فاطمة',        role: 'QA Lead',                           type: 'quality' },
    { name: 'Khalid',               arabic: 'خالد',         role: 'DevOps',                            type: 'engineering' },
    { name: 'Noor',                 arabic: 'نور',          role: 'Scribe',                            type: 'support' },
    { name: 'Mariam',               arabic: 'مريم',         role: 'Marketing Lead',                    type: 'product' },
    { name: 'Raees',                arabic: 'رئيس',         role: 'Orchestration Director',            type: 'system' },
    { name: 'Majlis',               arabic: 'مجلس',         role: 'Consulting Council',                type: 'system' },
    { name: 'Diwan',                arabic: 'ديوان',        role: 'Dashboard Registry',                type: 'system' },
  ];

  const realAgents = agents.filter(a => a.real);
  const aiAgents   = agents.filter(a => !a.real);

  function agentCard(a) {
    const filterText = (a.name + ' ' + a.role + ' ' + a.arabic + ' ' + a.type).toLowerCase();
    const skillName  = a.name.split(' ')[0].toLowerCase();
    return `<div class="agent-card" data-filter-text="${filterText}" onclick="viewAgentSkill('${skillName}')" style="cursor:pointer;">
      <div class="name">${esc(a.name)}${a.real ? ' <span class="real-badge">real</span>' : ''} <span class="type-badge">${esc(a.type)}</span></div>
      <div class="arabic">${a.arabic}</div>
      <div class="role">${esc(a.role)}</div>
    </div>`;
  }

  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Majlis — ${esc(projectName)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/xterm@5.3.0/css/xterm.css">
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"><\/script>
<script src="https://cdn.jsdelivr.net/npm/xterm@5.3.0/lib/xterm.js"><\/script>
<script src="https://cdn.jsdelivr.net/npm/xterm-addon-fit@0.8.0/lib/xterm-addon-fit.js"><\/script>
<script>window.__ORCH_TOKEN__ = ${JSON.stringify(orchToken || '')};<\/script>
${renderCss()}
</head>
<body>

<!-- ── Preact app mount ────────────────────────────────────────────────── -->
<!-- App renders: sidebar, topbar, migrated views, and frozen placeholder   -->
<!-- hosts for the 10 un-migrated legacy views — all inside this div.       -->
<div id="app-root"></div>

<!-- ── Toast ──────────────────────────────────────────────── -->
<div class="toast" id="toast"></div>

<!-- ── Orchestrator side panel ─────────────────────────────── -->
<div id="orch-panel">
  <div class="orch-panel-header">
    <div class="orch-panel-title">
      <span id="orch-panel-orch-dot" class="orch-status-dot"></span>
      Agent Sessions
    </div>
    <button class="orch-panel-close" onclick="closeOrchPanel()" title="Close">✕</button>
  </div>

  <!-- Tab strip -->
  <div class="orch-tabs" id="orch-tabs">
    <div class="orch-term-empty" style="padding:6px 8px;font-size:11px;color:var(--text-muted);">No active sessions</div>
  </div>

  <!-- Terminal body -->
  <div class="orch-terminal">
    <div class="orch-term-body" id="orch-term-body">
      <div class="orch-term-empty">
        <div>Select a session or run a story card</div>
      </div>
    </div>
    <div class="orch-files" id="orch-files" style="display:none;">
      <div class="orch-files-head">File changes</div>
    </div>
  </div>

  <!-- Footer controls -->
  <div class="orch-panel-footer">
    <button class="orch-footer-btn stop" id="orch-stop-btn" onclick="stopActiveSession()" style="display:none;">■ Stop</button>
    <button class="orch-footer-btn" onclick="clearActiveTerminal()">Clear</button>
    <button class="orch-footer-btn" onclick="openCleanSessions()">Clean sessions…</button>
    <div style="flex:1;"></div>
    <span id="orch-session-status" style="font-size:11px;color:var(--text-muted);"></span>
  </div>
</div>

<script>
function viewAgentSkill(name) {
  navTo('files');
  // Wait for inline file tree to render (fetched async), then find the agent's skill file
  setTimeout(function() {
    var items = document.querySelectorAll('.inline-file-entry');
    for (var i = 0; i < items.length; i++) {
      if ((items[i].dataset.path || '').toLowerCase().includes(name)) {
        items[i].click();
        return;
      }
    }
    // No exact match — pre-fill the search so the user can see related files
    var search = document.querySelector('#file-list-inline .filter-input');
    if (search) {
      search.value = name;
      search.dispatchEvent(new Event('input'));
    }
  }, 400);
}
<\/script>

<!-- ── xterm Terminal Panel ───────────────────────────────────── -->
<div id="term-backdrop" class="term-backdrop"></div>
<div id="term-panel" class="term-panel">
  <div class="term-header">
    <div class="term-header-left">
      <div class="term-status-dot" id="term-status-dot"></div>
      <span class="term-title" id="term-title">Terminal</span>
    </div>
    <div class="term-header-right">
      <button class="term-btn" onclick="termToggleFull()" id="term-full-btn" title="Toggle full screen">⛶ Full</button>
      <button class="term-btn" onclick="minimizeTermPanel()" title="Minimize — session keeps running">— Min</button>
      <button class="term-btn term-stop-btn" id="term-stop-btn" onclick="termStop()" title="End the agent session">■ Stop</button>
      <button class="term-btn" onclick="closeTermPanel()" title="Close viewer — session keeps running in the background">✕ Close</button>
    </div>
  </div>
  <div id="term-container"></div>
  <div class="term-input-row">
    <span class="term-prompt">❯</span>
    <input type="text" id="term-input" class="term-input-field" placeholder="Send message to agent… (Enter)">
    <button class="term-send-btn" onclick="termSend()">Send ↑</button>
  </div>
</div>

<!-- Minimized terminal pill — click to restore. Session keeps running. -->
<div id="term-pill" class="term-pill" onclick="restoreTermPanel()" title="Restore terminal">
  <span class="term-status-dot" id="term-pill-dot"></span>
  <span id="term-pill-title">Terminal</span>
  <span class="term-pill-icon">▢</span>
</div>

${renderClientJs(state)}
</body>
</html>`;
}

module.exports = { renderHtml };
