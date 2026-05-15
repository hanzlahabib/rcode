/**
 * HTML shell — composes the full page from CSS, views, and client JS.
 */
const { renderCss } = require('./css');
const { renderClientJs } = require('./client');

function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function renderHtml(state, orchToken) {
  const projectName   = state.projectName || 'No project initialized';
  const currentPhase  = state.currentPhase || '—';
  const currentSprint = state.currentSprint || null;
  const phaseCount    = (state.raw?.phases || []).length;
  const decisionCount = (state.raw?.decisions || []).length;
  const artifactCount = state.planningFiles.length;

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

<div class="app-shell">

  <!-- ── Sidebar ─────────────────────────────────────────────── -->
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-project">
      <div class="project-label">Rihal</div>
      <span>${esc(projectName)}</span>
    </div>
    <nav>
      <div class="nav-section">Overview</div>
      <button class="nav-link" data-view="overview">🏠 Overview</button>
      <button class="nav-link" data-view="orchestration">⚡ Orchestration</button>
      <button class="nav-link" data-view="roadmap">🗺 Roadmap</button>

      <div class="nav-section">Planning</div>
      <button class="nav-link" data-view="milestones">🎯 Milestones</button>
      <button class="nav-link" data-view="phases">📋 Phases</button>
      <button class="nav-link" data-view="sprints">⚡ Sprints</button>
      <button class="nav-link" data-view="tasks">✓ Tasks</button>
      <button class="nav-link" data-view="kanban">🗂 Kanban</button>

      <div class="nav-section">Workspace</div>
      <button class="nav-link" data-view="files">📄 Files</button>
      <button class="nav-link" data-view="agents">🤝 Agents</button>
      <button class="nav-link" data-view="decisions">⚖ Decisions</button>
      <button class="nav-link" data-view="memory">🧠 Memory</button>
    </nav>
  </aside>

  <div id="sidebar-backdrop" onclick="closeSidebar()"></div>

  <!-- ── Content area ────────────────────────────────────────── -->
  <div class="content-area" id="main-content">

    <!-- Topbar -->
    <header>
      <div style="display:flex;align-items:center;gap:12px;">
        <button class="hamburger-btn" id="hamburger-btn" onclick="toggleSidebar()" aria-label="Toggle menu">
          <span></span><span></span><span></span>
        </button>
        <div class="brand">
          <div class="icon">🕌</div>
          <div>
            <h1>Majlis — The Council</h1>
            <div class="arabic">مجلس · ${esc(projectName)}</div>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <span class="live" id="live-dot" title="Live"></span>
        <span id="updated-ago" style="font-size:11px;color:var(--text-muted);">just now</span>
        <button class="header-btn" id="refresh-btn" onclick="manualRefresh()">↺ Refresh</button>
        <button class="header-btn" id="theme-btn" onclick="toggleTheme()" title="Toggle theme">◑</button>
        <button class="header-btn" onclick="copyUrl()" title="Copy URL">⎘ Link</button>
      </div>
    </header>

    <!-- Main scroll container -->
    <div class="main-scroll" id="main-scroll">

      ${state.rawParseError ? `<div id="parse-warning">⚠ <strong>state.json parse error:</strong> ${esc(state.rawParseError)}</div>` : ''}

      ${state.blockers.length > 0 ? `
      <div id="blocker-banner">
        <span class="banner-title">🚧 ${state.blockers.length} blocker${state.blockers.length > 1 ? 's' : ''}</span>
        <span class="banner-list">${state.blockers.map(b => esc(typeof b === 'string' ? b : (b.title || ''))).join(' · ')}</span>
        <button class="banner-dismiss" onclick="dismissBlockers()">Dismiss</button>
      </div>` : ''}

      <!-- ── Overview ─────────────────────────────────────── -->
      <div id="view-overview" class="view active">
        ${!state.exists ? `
          <div class="empty" style="padding:80px;background:var(--bg-elev-2);border:1px solid var(--border-subtle);border-radius:var(--radius-4);">
            <h2 style="color:var(--accent-primary);margin-bottom:12px;font-size:20px;letter-spacing:-0.017em;">No .rihal/ directory found</h2>
            <p style="color:var(--text-tertiary);">Run the kickoff workflow to initialize a project.</p>
            <div class="empty-action">npx rcode install</div>
          </div>
        ` : `
          <div class="stats">
            <div class="stat">
              <div class="label">Current Phase</div>
              <div class="value" style="font-size:22px;">${esc(currentPhase)}</div>
              <div class="sub">${phaseCount} total${currentSprint ? ` · Sprint ${esc(currentSprint)}` : ''}</div>
            </div>
            <div class="stat">
              <div class="label">Milestone</div>
              <div class="value" style="font-size:16px;padding-top:6px;" id="stat-milestone">${esc(state.milestone || '—')}</div>
              <div class="sub">&nbsp;</div>
            </div>
            <div class="stat">
              <div class="label">Decisions</div>
              <div class="value">${decisionCount}</div>
              <div class="sub">Architecture records</div>
            </div>
            <div class="stat">
              <div class="label">Planning Files</div>
              <div class="value">${artifactCount}</div>
              <div class="sub">SPRINT · CONTEXT · VERIFY</div>
            </div>
            ${state.blockers.length > 0 ? `
            <div class="stat" style="border-left-color:var(--red);">
              <div class="label" style="color:var(--red);">Blockers</div>
              <div class="value" style="color:var(--red);">${state.blockers.length}</div>
              <div class="sub">Active</div>
            </div>` : ''}
            ${state.councilSessions > 0 ? `
            <div class="stat">
              <div class="label">Council Sessions</div>
              <div class="value">${state.councilSessions}</div>
              <div class="sub">Recorded</div>
            </div>` : ''}
          </div>

          <div id="view-overview-dynamic"></div>

          <section>
            <h2>🎯 Active Context</h2>
            <div class="body">
              ${state.context
                ? `<pre class="ctx-pre">${esc(state.context.replace(/^#[^\n]*\n?/, '').trim())}</pre>`
                : `<div class="empty">No active context.<div class="empty-action">Run /rihal-init to populate</div></div>`}
            </div>
          </section>
        `}
      </div>

      <!-- ── Dynamic views (rendered by JS) ─────────────────── -->
      <div id="view-orchestration" class="view"></div>
      <div id="view-roadmap"    class="view"></div>
      <div id="view-milestones" class="view"></div>
      <div id="view-phases"     class="view"></div>
      <div id="view-sprints"    class="view"></div>
      <div id="view-tasks"      class="view"></div>

      <!-- Kanban -->
      <div id="view-kanban" class="view"></div>

      <!-- Files -->
      <div id="view-files" class="view">
        <div class="view-title">Files</div>
        <div id="file-list-inline"></div>
        <div id="file-view"></div>
      </div>

      <!-- Agents -->
      <div id="view-agents" class="view">
        <div class="view-title">Agents</div>
        <div class="body">
          <div class="filter-bar">
            <input class="filter-input" type="text" placeholder="Filter agents…" oninput="filterItems(this,'agents-list')">
          </div>
          <div id="agents-list" style="padding:12px;">
            <div style="font-size:11px;font-weight:600;color:var(--amber);margin-bottom:10px;text-transform:uppercase;letter-spacing:0.06em;">Team</div>
            <div class="agents" style="padding:0;margin-bottom:20px;">
              ${realAgents.map(agentCard).join('')}
            </div>
            <div style="font-size:11px;font-weight:600;color:var(--accent-primary);margin-bottom:10px;text-transform:uppercase;letter-spacing:0.06em;">AI Agents</div>
            <div class="agents" style="padding:0;">
              ${aiAgents.map(agentCard).join('')}
            </div>
          </div>
        </div>
      </div>

      <div id="view-decisions" class="view"></div>

      <!-- Memory -->
      <div id="view-memory" class="view">
        <div id="view-memory-content">
          <div class="empty" style="background:var(--bg-elev-2);border:1px solid var(--border-subtle);border-radius:var(--radius-4);">
            <h2 style="color:var(--accent-primary);margin-bottom:12px;">Memory Bank</h2>
            <p>Loading…</p>
          </div>
        </div>
      </div>

    </div><!-- /main-scroll -->
  </div><!-- /content-area -->
</div><!-- /app-shell -->

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
      <button class="term-btn term-stop-btn" id="term-stop-btn" onclick="termStop()">■ Stop</button>
      <button class="term-btn" onclick="closeTermPanel()">✕ Close</button>
    </div>
  </div>
  <div id="term-container"></div>
  <div class="term-input-row">
    <span class="term-prompt">❯</span>
    <input type="text" id="term-input" class="term-input-field" placeholder="Send message to agent… (Enter)">
    <button class="term-send-btn" onclick="termSend()">Send ↑</button>
  </div>
</div>

${renderClientJs(state)}
</body>
</html>`;
}

module.exports = { renderHtml };
