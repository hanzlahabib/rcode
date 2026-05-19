/**
 * Client JS loader.
 *
 * The dashboard's client-side code lives as plain static files under
 * server/lib/html/client/ and is served verbatim at /js/<name>.js by
 * dashboard.js. This module emits:
 *   1. an inline <script> that injects server-scanned state (window.__S__)
 *      and the icon map (window.__ICONS__) for the Preact client
 *   2. a module script tag loading /js/app.js (ESM, deferred until DOM ready)
 *
 * Sprint 31.4: legacy modules (client-render.js, client-kanban.js,
 * client-main.js) deleted — the dashboard is 100% Preact.
 */

const { ICONS } = require('./icons');

// rcode version — read once at module load; surfaced in the dashboard status bar.
let RCODE_VERSION = '';
try { RCODE_VERSION = require('../../../package.json').version || ''; } catch { /* version unknown */ }

// Fields the client needs from the scanned state. Kept in sync with
// store.js initial state and the view components that read it.
function clientState(state) {
  return JSON.stringify({
    phases:           state.phaseTree           || state.raw?.phases || [],
    projectName:      state.projectName         || '',
    projectRoot:      state.projectRoot         || '',
    version:          RCODE_VERSION,
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

function renderClientJs(state) {
  // Emit __ICONS__ so the Preact client can use the same icon set as the
  // server without duplicating the map in a way that would require a build step.
  const iconsJson = JSON.stringify(ICONS).replace(/</g, '\\u003c');
  return [
    `<script>window.__S__ = ${clientState(state)}; window.__ICONS__ = ${iconsJson};</script>`,
    // Preact entry — type=module defers until HTML is parsed.
    `<script type="module" src="/js/app.js"></script>`,
  ].join('\n');
}

module.exports = { renderClientJs };
