/**
 * OrchestrationView — Preact port of renderOrchestration() + _orchCard().
 *
 * Reads activeSessions from the store (kept fresh by startSessionsPoll in
 * orchestrator.js at 4 s intervals). Terminal button sets store.terminal so
 * XtermPanel opens. Stop calls orchestrator.stopSession.
 *
 * No separate poll timer — if a tighter cadence is needed while this view is
 * open, a local useEffect interval can be added. For now the 4 s global poll
 * is sufficient.
 */

import { html } from '../preact.js';
import { useStore } from '../store.js';
import { stopSession, openTermPanel } from '../orchestrator.js';
import { orchElapsed } from '../util.js';

// ── Session card ──────────────────────────────────────────────────────────────

function OrchCard({ session: s }) {
  const running = s.status === 'running';
  const waiting = !!s.waiting;
  const cardCls = 'orch-card orch-' + s.status + (waiting ? ' orch-waiting' : '');
  const badge   = waiting ? '⏳ waiting for input' : s.status;
  const dotCls  = 'term-status-dot ' + (waiting ? 'waiting' : s.status);

  function handleTerminal(e) {
    e.stopPropagation();
    openTermPanel(s.storyId, s.storyId);
  }

  function handleStop(e) {
    e.stopPropagation();
    stopSession(s.storyId);
  }

  return html`
    <div class=${cardCls}>
      <div class="orch-card-head">
        <span class=${dotCls}></span>
        <span class="orch-card-id">${s.storyId}</span>
        <span class="orch-card-badge">${badge}</span>
      </div>
      <div class="orch-card-cmd">${s.cmd || ''}</div>
      <div class="orch-card-meta">
        ⏱ ${orchElapsed(s.startTime)}
        ${' · '}📝 ${s.filesChanged || 0} file${s.filesChanged === 1 ? '' : 's'}
        ${' · '}👁 ${s.clients || 0}
        ${s.pid ? html` · pid ${s.pid}` : null}
      </div>
      <div class="orch-card-actions">
        <button class="term-run-btn outline" onClick=${handleTerminal}>
          📟 Terminal
        </button>
        ${running ? html`
          <button class="term-run-btn danger" onClick=${handleStop}>■ Stop</button>
        ` : null}
      </div>
    </div>
  `;
}

// ── Sorted session list ───────────────────────────────────────────────────────

function sortSessions(sessions) {
  return [...sessions].sort((a, b) => {
    // Waiting-for-input first (needs attention)
    if (!!a.waiting !== !!b.waiting) return a.waiting ? -1 : 1;
    // Then running
    if ((a.status === 'running') !== (b.status === 'running')) {
      return a.status === 'running' ? -1 : 1;
    }
    // Then most-recent first
    return String(b.startTime || '').localeCompare(String(a.startTime || ''));
  });
}

// ── Root view ─────────────────────────────────────────────────────────────────

export function OrchestrationView() {
  const { activeSessions } = useStore();
  const sessions = sortSessions(activeSessions || []);

  return html`
    <div class="view active" id="view-orchestration">
      <div class="view-title">⚡ Orchestration</div>
      <div class="orch-subtitle">
        Live agent sessions — run, watch, communicate, stop.
      </div>

      ${sessions.length === 0 ? html`
        <div class="empty">
          No agent sessions yet.
          <div class="empty-action">Run a phase or sprint to start one</div>
        </div>
      ` : html`
        <div class="orch-grid">
          ${sessions.map(s => html`
            <${OrchCard} key=${s.storyId} session=${s} />
          `)}
        </div>
      `}
    </div>
  `;
}
