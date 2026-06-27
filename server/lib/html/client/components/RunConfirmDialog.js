/**
 * RunConfirmDialog — #916 permission gate before the dashboard spawns an
 * orchestrator session.
 *
 * Spawning a session launches a real agent CLI with permissions skipped
 * (--dangerously-skip-permissions); it can run any local command in the
 * project directory. So the dashboard never spawns on the first click — this
 * dialog asks for explicit confirmation first.
 *
 * Props:
 *   pending — store.runConfirm: { kind: 'story'|'command', storyId?, cmd, title, opts }
 *             or null (dialog hidden).
 *
 * Rules:
 *   - Uses CSS classes only (no style attribute); reuses the reject-* dialog styles.
 *   - Browser confirm()/alert() are forbidden — this is a proper in-app dialog.
 *   - Escape or backdrop click cancels (no spawn).
 */

import { html, useEffect } from '../preact.js';
import { confirmPendingRun, cancelPendingRun } from '../orchestrator.js';

export function RunConfirmDialog({ pending }) {
  // Escape-to-cancel — registered only while the dialog is open.
  useEffect(() => {
    if (!pending) return undefined;
    function handleKey(e) {
      if (e.key === 'Escape') cancelPendingRun();
      if (e.key === 'Enter') confirmPendingRun();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [pending]);

  if (!pending) return null;

  const target = pending.kind === 'command'
    ? pending.cmd
    : (pending.cmd || ('/rcode-dev-story ' + pending.storyId));
  const runner = (pending.opts && pending.opts.runner) || 'claude';

  return html`
    <div class="reject-overlay" onClick=${cancelPendingRun}>
      <div class="reject-dialog" onClick=${e => e.stopPropagation()}>
        <div class="reject-dialog-title">
          Run agent session?
        </div>
        <div class="run-confirm-body">
          <p>This launches <strong>${runner}</strong> with permissions skipped —
             it can run any command in your project directory.</p>
          <p class="run-confirm-cmd"><code>${target}</code></p>
        </div>
        <div class="reject-dialog-actions">
          <button class="reject-cancel" onClick=${cancelPendingRun}>Cancel</button>
          <button class="reject-submit" onClick=${confirmPendingRun}>Run session</button>
        </div>
      </div>
    </div>
  `;
}
