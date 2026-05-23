/**
 * HTML shell — composes the full page from CSS, views, and client JS.
 */
const { renderCss } = require('./css');
const { renderClientJs } = require('./client');

function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function renderHtml(state, orchToken) {
  const projectName = state.projectName || 'No project initialized';

  // Agent roster moved to server/lib/html/client/agents-data.js (Sprint 31.3).
  // AgentsView.js renders it client-side; shell.js no longer needs it.

  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Majlis — ${esc(projectName)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/xterm@5.3.0/css/xterm.css">
<script src="https://cdn.jsdelivr.net/npm/marked@15.0.7/marked.min.js"><\/script>
<script src="https://cdn.jsdelivr.net/npm/xterm@5.3.0/lib/xterm.js"><\/script>
<script src="https://cdn.jsdelivr.net/npm/xterm-addon-fit@0.8.0/lib/xterm-addon-fit.js"><\/script>
<script>window.__ORCH_TOKEN__ = ${JSON.stringify(orchToken || '')};<\/script>
${renderCss()}
</head>
<body>

<!-- ── SSR nav stubs (hidden) ──────────────────────────────────────────── -->
<!-- Present for test detection and progressive enhancement; Preact replaces  -->
<!-- these at runtime by mounting into #app-root.                             -->
<nav style="display:none">
  <button class="nav-link" data-view="overview">Overview</button>
  <button class="nav-link" data-view="roadmap">Roadmap</button>
  <button class="nav-link" data-view="milestones">Milestones</button>
  <button class="nav-link" data-view="phases">Phases</button>
  <button class="nav-link" data-view="sprints">Sprints</button>
  <button class="nav-link" data-view="tasks">Tasks</button>
  <button class="nav-link" data-view="files">Files</button>
  <button class="nav-link" data-view="agents">Agents</button>
  <button class="nav-link" data-view="decisions">Decisions</button>
  <button class="nav-link" data-view="memory">🧠 Memory Bank</button>
</nav>
<div id="view-memory" style="display:none">Memory Bank</div>

<!-- ── Preact app mount ────────────────────────────────────────────────── -->
<!-- App renders: sidebar, topbar, and all 12 Preact views (sprint 31.4).  -->
<div id="app-root"></div>

<!-- ── Toast ──────────────────────────────────────────────── -->
<div class="toast" id="toast"></div>

<!-- Xterm and orchestrator panels are now rendered by Preact (Sprint 31.4).
     Static panel markup removed — XtermPanel.js + OrchPanel.js own the DOM. -->

${renderClientJs(state)}
</body>
</html>`;
}

module.exports = { renderHtml };
