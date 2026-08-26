/**
 * HTML shell — composes the full page from CSS, views, and client JS.
 */
const { renderCss } = require('./css');
const { renderClientJs } = require('./client');

function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function renderHtml(state, orchToken, orchPort, projectRoot, viewOnly) {
  const projectName = state.projectName || 'No project initialized';
  // #969 — the client used to hardcode port 7718 for the orchestrator API.
  // A dashboard started with ORCH_PORT set (e.g. to test in isolation from a
  // production instance) would silently talk to the wrong orchestrator. The
  // actual port is injected here — both into the CSP connect-src allowlist
  // and into window.__ORCH_PORT__ for orchestrator.js to read at runtime.
  //
  // #1037 — orchPort is null when this dashboard's orchestrator never bound
  // (spawn failed, or its own free-port scan was exhausted). NEVER fall back
  // to a constant like 7718 here — that port may belong to another project's
  // orchestrator, and this dashboard did not spawn it. null stays null.
  const port = orchPort == null ? null : (parseInt(orchPort, 10) || null);
  const connectSrc = port ? ` http://localhost:${port} http://127.0.0.1:${port}` : '';

  // Agent roster moved to server/lib/html/client/agents-data.js (Sprint 31.3).
  // AgentsView.js renders it client-side; shell.js no longer needs it.

  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data:; connect-src 'self'${connectSrc} ws: wss:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'">
<meta http-equiv="X-Content-Type-Options" content="nosniff">
<meta name="referrer" content="strict-origin-when-cross-origin">
<title>Majlis — ${esc(projectName)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/xterm@5.3.0/css/xterm.css" integrity="sha384-LJcOxlx9IMbNXDqJ2axpfEQKkAYbFjJfhXexLfiRJhjDU81mzgkiQq8rkV0j6dVh" crossorigin="anonymous">
<script src="https://cdn.jsdelivr.net/npm/marked@18.0.4/lib/marked.umd.js" integrity="sha384-8RA8Ah4c9upJmKfg5nH01OgjZoQ3mRX+ngrKYWXQYj2dHYxFqYz8POSlii33f0wB" crossorigin="anonymous"><\/script>
<script src="https://cdn.jsdelivr.net/npm/xterm@5.3.0/lib/xterm.js" integrity="sha384-/nfmYPUzWMS6v2atn8hbljz7NE0EI1iGx34lJaNzyVjWGDzMv+ciUZUeJpKA3Glc" crossorigin="anonymous"><\/script>
<script src="https://cdn.jsdelivr.net/npm/xterm-addon-fit@0.8.0/lib/xterm-addon-fit.js" integrity="sha384-AQLWHRKAgdTxkolJcLOELg4E9rE89CPE2xMy3tIRFn08NcGKPTsELdvKomqji+DL" crossorigin="anonymous"><\/script>
<script>window.__ORCH_TOKEN__ = ${JSON.stringify(orchToken || '')}; window.__ORCH_PORT__ = ${port === null ? 'null' : port}; window.__PROJECT_ROOT__ = ${JSON.stringify(projectRoot || '')}; window.__VIEW_ONLY__ = ${JSON.stringify(!!viewOnly)};<\/script>
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
<!-- The loading shell below is visible until app.js boots, then cleared.  -->
<div id="app-root">
  <div class="app-loading" role="status">
    <div class="app-loading-spinner"></div>
    <p class="app-loading-text">Loading Majlis…</p>
    <noscript><p class="app-loading-text">This dashboard requires JavaScript.</p></noscript>
  </div>
</div>

<!-- ── Toast ──────────────────────────────────────────────── -->
<div class="toast" id="toast" role="status" aria-live="polite"></div>

<!-- Xterm and orchestrator panels are now rendered by Preact (Sprint 31.4).
     Static panel markup removed — XtermPanel.js + OrchPanel.js own the DOM. -->

${renderClientJs(state)}
<footer style="position:fixed;bottom:8px;right:12px;font-size:11px;color:rgba(255,255,255,0.3);z-index:1;pointer-events:none">
  <a href="https://github.com/hanzlahabib" target="_blank" rel="noopener noreferrer" style="color:inherit;text-decoration:none;pointer-events:auto">by Hanzla Habib</a>
</footer>
</body>
</html>`;
}

module.exports = { renderHtml };
