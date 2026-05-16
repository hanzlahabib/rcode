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

import { html, useState } from '../preact.js';
import { useStore } from '../store.js';
import { stopSession, openTermPanel, runCommandFromUI, ALLOWED_COMMANDS, isSessionRunning } from '../orchestrator.js';
import { orchElapsed } from '../util.js';
import { Icon } from '../icons-client.js';

// ── Session card ──────────────────────────────────────────────────────────────

function OrchCard({ session: s }) {
  const running = s.status === 'running';
  const waiting = !!s.waiting;
  const cardCls = 'orch-card orch-' + s.status + (waiting ? ' orch-waiting' : '');
  const badge   = waiting ? html`<${Icon} name="hourglass" size=${12}/> waiting for input` : s.status;
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
        <${Icon} name="clock" size=${12}/> ${orchElapsed(s.startTime)}
        ${' · '}<${Icon} name="edit-3" size=${12}/> ${s.filesChanged || 0} file${s.filesChanged === 1 ? '' : 's'}
        ${' · '}<${Icon} name="eye" size=${12}/> ${s.clients || 0}
        ${s.pid ? html` · pid ${s.pid}` : null}
      </div>
      <div class="orch-card-actions">
        <button class="term-run-btn outline" onClick=${handleTerminal}>
          <${Icon} name="monitor" size=${14}/> Terminal
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

// ── Command runner ────────────────────────────────────────────────────────────

/**
 * CommandRunner — dropdown + Run button for launching allowlisted rihal commands.
 * State is local (useState) — no store changes needed; runCommandFromUI handles
 * all session and terminal state via runAndOpenTerm.
 */
function CommandRunner() {
  const { activeSessions } = useStore();
  const [selected, setSelected] = useState(ALLOWED_COMMANDS[0]?.cmd || '');
  const [busy, setBusy] = useState(false);

  const slug      = selected ? selected.replace(/^\//, '').replace(/\//g, '-') : '';
  const sessionId = slug ? 'cmd-' + slug : '';
  const isRunning = sessionId ? isSessionRunning(sessionId) : false;
  const disabled  = busy || isRunning;

  function handleRun() {
    if (!selected || disabled) return;
    setBusy(true);
    runCommandFromUI(selected);
    // Reset busy after 2 s — the terminal panel is now open and the session is
    // streaming. We do not block on session completion here.
    setTimeout(() => setBusy(false), 2000);
  }

  return html`
    <div class="cmd-runner">
      <div class="cmd-runner-title">
        <${Icon} name="terminal" size=${14}/> Command Runner
      </div>
      <div class="cmd-runner-row">
        <select class="cmd-runner-select"
          value=${selected}
          onChange=${e => setSelected(e.target.value)}>
          ${ALLOWED_COMMANDS.map(({ cmd, label }) => html`
            <option key=${cmd} value=${cmd}>${label}</option>
          `)}
        </select>
        <button class=${'cmd-runner-btn' + (disabled ? ' cmd-runner-btn--busy' : '')}
          onClick=${handleRun}
          disabled=${disabled}>
          ${isRunning
            ? html`<${Icon} name="hourglass" size=${14}/> Running…`
            : busy
              ? html`<${Icon} name="hourglass" size=${14}/> Starting…`
              : html`<${Icon} name="play" size=${14}/> Run`}
        </button>
      </div>
    </div>
  `;
}

// ── Root view ─────────────────────────────────────────────────────────────────

export function OrchestrationView() {
  const { activeSessions } = useStore();
  const sessions = sortSessions(activeSessions || []);

  return html`
    <div class="view active" id="view-orchestration">
      <div class="view-title section-icon"><${Icon} name="activity" size=${18}/> Orchestration</div>
      <div class="orch-subtitle">
        Live agent sessions — run, watch, communicate, stop.
      </div>

      <${CommandRunner}/>

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
