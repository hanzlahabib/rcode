/**
 * view_only gate (#967) — shared between dashboard.js (hides Run/Stop/Clean
 * affordances in the UI) and orchestrator.js (the actual server-side
 * enforcement on POST /api/run). Hiding the button alone is not a fix: any
 * automation that can drive the browser or read the orchestrator token can
 * still POST /api/run directly and spawn a --dangerously-skip-permissions
 * agent against the repo, so the refusal has to live on the server.
 *
 * `dashboard.view_only: true` in .rcode/config.yaml (or VIEW_ONLY=1/true in
 * the environment) turns it on. Off by default — solo devs are unaffected.
 */
'use strict';

const path = require('path');

/**
 * Re-read on every call (not cached) so toggling config.yaml takes effect
 * without restarting the dashboard/orchestrator processes. config.yaml is a
 * few hundred bytes, so the extra fs read per call is negligible.
 */
function isViewOnly(projectRoot) {
  const envFlag = String(process.env.VIEW_ONLY || '').toLowerCase();
  if (envFlag === '1' || envFlag === 'true') return true;
  try {
    const cfg = require(path.join(__dirname, '..', '..', 'rcode', 'bin', 'lib', 'config.cjs'));
    return cfg.cmdGet(projectRoot, 'dashboard.view_only') === 'true';
  } catch {
    return false;
  }
}

module.exports = { isViewOnly };
