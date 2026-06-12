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

import { html, useState, useEffect } from '../preact.js';
import { useStore } from '../store.js';
import { stopSession, openTermPanel, ALLOWED_COMMANDS, isSessionRunning, mergeSessionsAndHistory } from '../orchestrator.js';
import { openRunnerPicker } from '../components/RunnerPicker.js';
import { RejectDialog } from '../components/RejectDialog.js';
import { orchElapsed, humanDate } from '../util.js';
import { Icon } from '../icons-client.js';

// ── Session card ──────────────────────────────────────────────────────────────

function OrchCard({ session: s }) {
  const running = s.status === 'running';
  const waiting = !!s.waiting;
  const [showReject, setShowReject] = useState(false);
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
        ${s.runner ? html`
          <span class="runner-badge" title=${'Launched with ' + s.runner + (s.model ? ' (' + s.model + ')' : '')}>
            ${s.runner}${s.model ? ' · ' + s.model : ''}
          </span>
        ` : null}
        <span class="orch-card-badge">${badge}</span>
      </div>
      <div class="orch-card-cmd">${s.cmd || ''}</div>
      <div class="orch-card-meta">
        <${Icon} name="clock" size=${12}/> ${orchElapsed(s.startTime)}
        ${' · '}<${Icon} name="edit-3" size=${12}/> ${s.filesChanged || 0} file${s.filesChanged === 1 ? '' : 's'}
        ${' · '}<${Icon} name="eye" size=${12}/> ${s.clients || 0}
        ${s.pid ? html` · pid ${s.pid}` : null}
      </div>
      ${s.rejection ? html`
        <div class="orch-card-rejection">
          Rejected: ${s.rejection.reason}
        </div>
      ` : null}
      <div class="orch-card-actions">
        <button class="term-run-btn outline" onClick=${handleTerminal}>
          <${Icon} name="monitor" size=${14}/> Terminal
        </button>
        ${running ? html`
          <button class="term-run-btn danger" onClick=${handleStop}>■ Stop</button>
        ` : null}
        ${waiting ? html`
          <button class="term-run-btn danger" onClick=${e => { e.stopPropagation(); setShowReject(true); }}>
            <${Icon} name="alert-triangle" size=${14}/> Reject
          </button>
        ` : null}
      </div>
      ${showReject ? html`<${RejectDialog} session=${s} onClose=${() => setShowReject(false)}/>` : null}
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
 * CommandRunner — dropdown + Run button for launching allowlisted rcode commands.
 * State is local (useState) — no store changes needed; runCommandFromUI handles
 * all session and terminal state via runCommandFromUI → runSession.
 */
function CommandRunner() {
  // Subscribe to store updates so isSessionRunning() + orchOnline re-evaluate on each poll.
  const { orchOnline } = useStore();
  const [selected, setSelected] = useState(ALLOWED_COMMANDS[0]?.cmd || '');
  const [busy, setBusy] = useState(false);

  const slug      = selected ? selected.replace(/^\//, '').replace(/\//g, '-') : '';
  const sessionId = slug ? 'cmd-' + slug : '';
  const isRunning = sessionId ? isSessionRunning(sessionId) : false;
  const orchDown  = orchOnline === false;
  const disabled  = busy || isRunning || orchDown;

  // Reset busy 2 s after a Run click — the terminal panel is now open and the
  // session is streaming. Managed via useEffect so the timer is cancelled if
  // CommandRunner unmounts before it fires.
  useEffect(() => {
    if (!busy) return;
    const t = setTimeout(() => setBusy(false), 2000);
    return () => clearTimeout(t);
  }, [busy]);

  function handleRun(e) {
    if (!selected || disabled) return;
    setBusy(true);
    openRunnerPicker(e.currentTarget, { kind: 'command', cmd: selected, title: selected });
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
      <div class="cmd-runner-hint">
        ${orchDown
          ? html`Orchestrator is unreachable — commands cannot run until it is back.`
          : isRunning
            ? html`Command is running — output is streaming to the terminal panel.`
            : busy
              ? html`Starting — the terminal panel will open shortly.`
              : html`Select a command and press Run. Output streams live to the terminal panel.`}
      </div>
    </div>
  `;
}

// ── Run history panel ─────────────────────────────────────────────────────────

function durationLabel(ms) {
  if (!ms || !isFinite(ms) || ms <= 0) return '—';
  if (ms < 60000) return Math.round(ms / 1000) + 's';
  if (ms < 3600000) return Math.floor(ms / 60000) + 'm ' + Math.round((ms % 60000) / 1000) + 's';
  return Math.floor(ms / 3600000) + 'h ' + Math.floor((ms % 3600000) / 60000) + 'm';
}

function HistoryRow({ run }) {
  return html`
    <div class="hist-row" key=${run.storyId}>
      <span class=${'term-status-dot ' + run.status}></span>
      <span class="hist-row-id">${run.storyId}</span>
      <span class="hist-row-cmd">${run.cmd}</span>
      <span class="hist-row-duration"><${Icon} name="clock" size=${12}/> ${durationLabel(run.durationMs)}</span>
      <span class="hist-row-status">${run.status}</span>
    </div>
  `;
}

const STATUS_ORDER = ['done', 'exited', 'stopped', 'error'];

function HistoryPanel() {
  const { activeSessions, history } = useStore();
  const merged = mergeSessionsAndHistory(activeSessions, history);
  const ended = merged.filter(r => r.status !== 'running');

  if (ended.length === 0) {
    return html`
      <div class="hist-panel">
        <div class="hist-panel-title">
          <${Icon} name="history" size=${16}/> Run History
        </div>
        <div class="empty">No past runs yet.</div>
      </div>
    `;
  }

  // Group by status (STATUS_ORDER), then within each group by date label
  const byStatus = new Map();
  for (const status of STATUS_ORDER) byStatus.set(status, new Map());

  for (const run of ended) {
    const bucket = byStatus.get(run.status) || byStatus.get('error');
    const dateKey = humanDate(run.endTime || run.startTime) || 'Unknown date';
    if (!bucket.has(dateKey)) bucket.set(dateKey, []);
    bucket.get(dateKey).push(run);
  }

  // Sort runs within each date group: newest first
  for (const dateMap of byStatus.values()) {
    for (const runs of dateMap.values()) {
      runs.sort((a, b) => String(b.endTime || b.startTime || '').localeCompare(String(a.endTime || a.startTime || '')));
    }
  }

  return html`
    <div class="hist-panel">
      <div class="hist-panel-title">
        <${Icon} name="history" size=${16}/> Run History
      </div>
      ${STATUS_ORDER.map(status => {
        const dateMap = byStatus.get(status);
        if (!dateMap || dateMap.size === 0) return null;
        return html`
          <div class="hist-group" key=${status}>
            <div class="hist-group-title">${status}</div>
            ${[...dateMap.entries()].map(([dateKey, runs]) => html`
              <div key=${dateKey}>
                <div class="hist-date">${dateKey}</div>
                ${runs.map(run => html`<${HistoryRow} key=${run.storyId} run=${run}/>`)}
              </div>
            `)}
          </div>
        `;
      })}
    </div>
  `;
}

// ── Root view ─────────────────────────────────────────────────────────────────

export function OrchestrationView() {
  const { activeSessions, orchOnline } = useStore();
  const sessions = sortSessions(activeSessions || []);
  const orchDown = orchOnline === false;

  return html`
    <div class="view active" id="view-orchestration">
      <div class="view-title section-icon"><${Icon} name="activity" size=${18}/> Orchestration</div>
      <div class="orch-subtitle">
        Live agent sessions — run, watch, communicate, stop.
      </div>

      ${orchDown ? html`
        <div class="orch-down-banner" role="alert">
          ⚠ Orchestrator unreachable (port 7718) — Run buttons are disabled.
          Restart the dashboard, or set ORCH_PORT if the port is in use.
        </div>
      ` : null}

      <${CommandRunner}/>

      ${sessions.length === 0 ? html`
        <div class="empty">
          ${orchDown ? 'Session status unavailable while the orchestrator is down.' : 'No active execution.'}
          <div class="empty-action">
            Use the Command Runner above, or run <code>/rcode-execute</code> to
            start a phase or sprint.
          </div>
        </div>
      ` : html`
        <div class="orch-grid">
          ${sessions.map(s => html`
            <${OrchCard} key=${s.storyId} session=${s} />
          `)}
        </div>
      `}

      <${HistoryPanel}/>
    </div>
  `;
}
