/**
 * RejectDialog — structured rejection dialog for waiting checkpoint sessions.
 *
 * Props:
 *   session  — OrchCard session object ({ storyId, phase?, ... })
 *   onClose  — callback invoked on cancel, backdrop click, Escape, or after
 *              a successful submission.
 *
 * Rules:
 *   - Submit button is disabled until a non-empty reason is typed (GATE-1).
 *   - Uses showToast() for post-submit feedback; browser dialogs are forbidden.
 *   - All visuals are driven by CSS classes (no style attribute).
 */

import { html, useState, useEffect } from '../preact.js';
import { submitRejection } from '../orchestrator.js';
import { showToast } from './shared.js';

export function RejectDialog({ session, onClose }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy]     = useState(false);

  const trimmed = reason.trim();
  const disabled = !trimmed || busy;

  // Escape-to-close
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  function handleSubmit() {
    if (disabled) return;
    setBusy(true);
    submitRejection(session.storyId, trimmed, session.phase || null)
      .then(d => {
        if (d && d.ok) {
          showToast('Rejection recorded');
          onClose();
        } else {
          showToast('Reject failed: ' + ((d && d.error) || 'unknown'));
          setBusy(false);
        }
      })
      .catch(() => {
        showToast('Could not reach orchestrator');
        setBusy(false);
      });
  }

  return html`
    <div class="reject-overlay" onClick=${onClose}>
      <div class="reject-dialog" onClick=${e => e.stopPropagation()}>
        <div class="reject-dialog-title">
          Reject checkpoint — ${session.storyId}
        </div>
        <textarea
          class="reject-dialog-input"
          placeholder="Why is this checkpoint being rejected? (required)"
          value=${reason}
          onInput=${e => setReason(e.target.value)}
          autofocus
        ></textarea>
        <div class="reject-dialog-actions">
          <button class="reject-cancel" onClick=${onClose}>Cancel</button>
          <button
            class="reject-submit"
            disabled=${disabled}
            onClick=${handleSubmit}
          >${busy ? 'Recording…' : 'Submit rejection'}</button>
        </div>
      </div>
    </div>
  `;
}
