/**
 * Client JS loader.
 *
 * The dashboard's client-side code lives as plain static files under
 * server/lib/html/client/ and is served verbatim at /js/<name>.js by
 * dashboard.js. This module only emits:
 *   1. an inline <script> that injects server-scanned state (window.__S__)
 *   2. <script src> tags for the static client modules, in load order
 *
 * Keeping the code in real .js files (instead of a template literal) means
 * no escape-doubling — \r, \n, \' and ANSI sequences are written normally.
 */

// Fields the client needs from the scanned state. Kept in sync with the
// reads inside client-render.js / client-kanban.js / client-main.js.
function clientState(state) {
  return JSON.stringify({
    phases:           state.raw?.phases         || [],
    milestone:        state.raw?.milestone      || '',
    currentPhase:     state.raw?.current_phase  || null,
    currentSprint:    state.raw?.current_sprint || null,
    decisions:        state.raw?.decisions      || [],
    blockers:         state.raw?.blockers       || [],
    council_sessions: state.raw?.council_sessions || [],
    last_session:     state.raw?.last_session   || null,
    chains:           state.raw?.chains         || [],
    workstreams:      state.raw?.workstreams    || [],
    pendingHandoff:   state.pendingHandoff      || null,
    memoryBank:       state.memoryBank          || null,
  })
    // Prevent a stray "</script>" inside any string from closing the inline
    // <script> early. Escaping "<" keeps the JSON valid and inert.
    .replace(/</g, '\\u003c');
}

// Load order matters: render → kanban → main. The first two only declare
// functions and simple vars; client-main.js runs the boot code last.
const MODULES = ['client-render.js', 'client-kanban.js', 'client-main.js'];

function renderClientJs(state) {
  return `<script>window.__S__ = ${clientState(state)};</script>\n` +
    MODULES.map(m => `<script src="/js/${m}"></script>`).join('\n');
}

module.exports = { renderClientJs };
