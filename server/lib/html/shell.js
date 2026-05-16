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

<!-- Xterm and orchestrator panels are now rendered by Preact (Sprint 31.4).
     Static panel markup removed — XtermPanel.js + OrchPanel.js own the DOM. -->

${renderClientJs(state)}
</body>
</html>`;
}

module.exports = { renderHtml };
