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

<!-- viewAgentSkill() removed — Sprint 31.3 moved agent roster to agents-data.js.
     AgentsView.js now handles skill navigation via the store requestedFile bridge. -->

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
