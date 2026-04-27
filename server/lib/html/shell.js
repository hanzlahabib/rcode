/**
 * HTML shell — composes the full page from CSS, views, and client JS.
 */
const { renderCss } = require('./css');
const { renderClientJs } = require('./client');

function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function renderHtml(state) {
  const projectName   = state.projectName || 'No project initialized';
  const currentPhase  = state.currentPhase || '—';
  const currentSprint = state.currentSprint || null;
  const phaseCount    = (state.raw?.phases || []).length;
  const decisionCount = (state.raw?.decisions || []).length;
  const artifactCount = state.planningFiles.length;

  const agents = [
    { name: 'Sadiq Damani', arabic: 'صادق', role: 'Director of Strategy', real: true, type: 'leadership' },
    { name: 'Waleed Al Harthi', arabic: 'وليد', role: 'CTO', real: true, type: 'leadership' },
    { name: 'Ahmed Al Hassani', arabic: 'أحمد الحسني', role: 'Technology & Development Director', real: true, type: 'leadership' },
    { name: 'Nasser', arabic: 'ناصر', role: 'Engineering Manager', real: true, type: 'leadership' },
    { name: 'Hussain', arabic: 'حسين', role: 'PM + Scrum Master', type: 'product' },
    { name: 'Layla', arabic: 'ليلى', role: 'Lead UX Designer', type: 'design' },
    { name: 'Zahra', arabic: 'زهرة', role: 'Branding & Creative Director', type: 'design' },
    { name: 'Omar', arabic: 'عمر', role: 'Full-Stack Engineer', type: 'engineering' },
    { name: 'Haitham Al Khamiyasi', arabic: 'هيثم', role: 'Senior Frontend', real: true, type: 'engineering' },
    { name: 'Yousef', arabic: 'يوسف', role: 'Senior Backend', type: 'engineering' },
    { name: 'Zayd', arabic: 'زيد', role: 'ML Engineer', type: 'engineering' },
    { name: 'Fatima', arabic: 'فاطمة', role: 'QA Lead', type: 'quality' },
    { name: 'Khalid', arabic: 'خالد', role: 'DevOps', type: 'engineering' },
    { name: 'Noor', arabic: 'نور', role: 'Scribe', type: 'support' },
    { name: 'Mariam', arabic: 'مريم', role: 'Marketing Lead', type: 'product' },
    { name: 'Raees', arabic: 'رئيس', role: 'Orchestration Director', type: 'system' },
    { name: 'Majlis', arabic: 'مجلس', role: 'Consulting Council', type: 'system' },
    { name: 'Diwan', arabic: 'ديوان', role: 'Dashboard Registry', type: 'system' },
  ];

  // #305: separate real vs AI agents
  const realAgents = agents.filter(a => a.real);
  const aiAgents = agents.filter(a => !a.real);

  function agentCard(a) {
    const filterText = (a.name + ' ' + a.role + ' ' + a.arabic + ' ' + a.type).toLowerCase();
    // #303: link to SKILL.md
    const skillName = a.name.split(' ')[0].toLowerCase();
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
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"><\/script>
${renderCss()}
</head>
<body>
<div class="app-shell">
  <aside class="sidebar">
    <div class="sidebar-project">
      <div class="project-label">Project</div>
      ${esc(projectName)}
    </div>
    <nav>
      <div class="nav-section">Overview</div>
      <button class="nav-link" data-view="overview">🏠 Overview</button>
      <button class="nav-link" data-view="roadmap">🗺 Roadmap</button>
      <div class="nav-section">Planning</div>
      <button class="nav-link" data-view="milestones">🎯 Milestones</button>
      <button class="nav-link" data-view="phases">📋 Phases</button>
      <button class="nav-link" data-view="sprints">⚡ Sprints</button>
      <button class="nav-link" data-view="tasks">✓ Tasks</button>
      <div class="nav-section">Workspace</div>
      <button class="nav-link" data-view="files">📄 Files</button>
      <button class="nav-link" data-view="agents">🤝 Agents</button>
      <button class="nav-link" data-view="decisions">⚖ Decisions</button>
      <button class="nav-link" data-view="memory">🧠 Memory Bank</button>
    </nav>
    <div id="sidebar-file-tree" style="margin-top:var(--space-4);padding:0 var(--space-2);"></div>
  </aside>
  <div id="sidebar-backdrop" onclick="closeSidebar()"></div>
  <div class="content-area" id="main-content">
    <header>
      <div style="display:flex;align-items:center;gap:var(--space-3);">
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
        <span class="live" id="live-dot"></span>
        <span id="updated-ago" style="font-size:var(--text-sm);color:var(--text-secondary);">just now</span>
        &nbsp;·&nbsp;
        <button class="header-btn" id="refresh-btn" onclick="manualRefresh()">↺ Refresh</button>
        <button class="header-btn" id="theme-btn" onclick="toggleTheme()" title="Toggle dark/light">☀️</button>
        <button class="header-btn" onclick="copyUrl()" title="Copy URL">🔗</button>
        <button class="header-btn" onclick="exportSnapshot()" title="Export snapshot">📥</button>
      </div>
    </header>

    ${state.rawParseError ? `<div id="parse-warning">⚠️ <strong>state.json parse error:</strong> ${esc(state.rawParseError)} — Dashboard showing partial data.</div>` : ''}

    ${state.blockers.length > 0 ? `
    <div id="blocker-banner">
      <span class="banner-title">🚧 ${state.blockers.length} Blocker${state.blockers.length > 1 ? 's' : ''}</span>
      <span class="banner-list">${state.blockers.map(b => esc(typeof b === 'string' ? b : (b.title || ''))).join(' · ')}</span>
      <button class="banner-dismiss" onclick="dismissBlockers()">Dismiss</button>
    </div>` : ''}

    <div id="view-overview" class="view active">
      ${!state.exists ? `
        <div class="empty" style="padding:80px;background:var(--bg-card);border-radius:var(--radius-lg);">
          <h2 style="color:var(--rihal-gold);margin-bottom:16px;">No .rihal/ directory found</h2>
          <p>Run the <code>*kickoff</code> workflow to initialize a project.</p>
          <div class="empty-action">npx rcode install</div>
        </div>
      ` : `
        <div class="stats">
          <div class="stat">
            <div class="label">Current Phase</div>
            <div class="value">${esc(currentPhase)}</div>
            <div class="sub">${phaseCount} total phases${currentSprint ? ` · Sprint ${esc(currentSprint)}` : ''}</div>
          </div>
          <div class="stat">
            <div class="label">Milestone</div>
            <div class="value" style="font-size:16px;padding-top:6px;" id="stat-milestone">${esc(state.milestone || '—')}</div>
            <div class="sub">&nbsp;</div>
          </div>
          <div class="stat">
            <div class="label">Decisions (ADRs)</div>
            <div class="value">${decisionCount}</div>
            <div class="sub">Architecture records</div>
          </div>
          <div class="stat">
            <div class="label">Planning Files</div>
            <div class="value">${artifactCount}</div>
            <div class="sub">SPRINT, CONTEXT, VERIFY, RESEARCH</div>
          </div>
          ${state.blockers.length > 0 ? `
          <div class="stat" style="border-left-color:var(--accent-red);">
            <div class="label" style="color:var(--accent-red);">Blockers</div>
            <div class="value" style="color:var(--accent-red);">${state.blockers.length}</div>
            <div class="sub">Active blockers</div>
          </div>` : ''}
          ${state.councilSessions > 0 ? `
          <div class="stat">
            <div class="label">Council Sessions</div>
            <div class="value">${state.councilSessions}</div>
            <div class="sub">Recorded sessions</div>
          </div>` : ''}
        </div>

        <div id="view-overview-dynamic"></div>

        <section>
          <h2>🎯 Active Context</h2>
          <div class="body">
            ${state.context
              ? `<div class="item-preview" style="max-height:none;">${esc(state.context)}</div>`
              : `<div class="empty">No active context.<div class="empty-action">Run context-build workflow</div></div>`}
          </div>
        </section>
      `}
    </div>

    <div id="view-roadmap"    class="view"></div>
    <div id="view-milestones" class="view"></div>
    <div id="view-phases"     class="view"></div>
    <div id="view-sprints"    class="view"></div>
    <div id="view-tasks"      class="view"></div>

    <div id="view-files" class="view">
      <div class="view-title">Files</div>
      <div id="file-list-inline"></div>
      <div id="file-view"></div>
    </div>

    <div id="view-agents" class="view">
      <div class="view-title">Agents</div>
      <div class="filter-bar">
        <input class="filter-input" type="text" placeholder="Filter…" oninput="filterItems(this,'agents-list')">
      </div>
      <div id="agents-list">
        <div style="font-size:var(--text-sm);font-weight:600;color:var(--rihal-gold);margin-bottom:var(--space-3);">Team Members</div>
        <div class="agents" style="margin-bottom:var(--space-6);">
          ${realAgents.map(agentCard).join('')}
        </div>
        <div style="font-size:var(--text-sm);font-weight:600;color:var(--accent-blue);margin-bottom:var(--space-3);">AI Agents</div>
        <div class="agents">
          ${aiAgents.map(agentCard).join('')}
        </div>
      </div>
    </div>

    <div id="view-decisions" class="view"></div>

    <div id="view-memory" class="view">
      <div id="view-memory-content"><div class="empty" style="padding:80px;background:var(--bg-card);border-radius:var(--radius-lg);"><h2 style="color:var(--rihal-gold);margin-bottom:16px;">Memory Bank</h2><p>Loading…</p></div></div>
    </div>

    <footer>
      <div class="arabic">رحلة البناء · The Journey of Building</div>
      <div>Rihal Code · View-Only Dashboard · <kbd>R</kbd> refresh · <kbd>1-9</kbd> switch views · <kbd>F</kbd> filter</div>
    </footer>
  </div>
</div>
<div class="toast" id="toast"></div>
<script>
// #303: view agent skill file
function viewAgentSkill(name) {
  // Try to find matching file in file tree
  var items = document.querySelectorAll('.file-tree-item');
  for (var i = 0; i < items.length; i++) {
    if ((items[i].dataset.path || '').toLowerCase().includes(name)) {
      items[i].click();
      return;
    }
  }
  // Fallback
  navTo('files');
}
<\/script>
${renderClientJs(state)}
</body>
</html>`;
}

module.exports = { renderHtml };
