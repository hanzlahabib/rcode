/**
 * OrchestrationView — 2-column Diwan layout.
 *
 * Left rail (300px): view header, Runner picker card (repurposes the
 * allowlisted rcode command list as "runners" per the design), Pipeline
 * card (live sessions, or a history-status summary when nothing is live).
 * Right column: the docked xterm.js terminal (XtermPanel docked=true) with
 * Run History beneath it.
 *
 * Reads activeSessions from the store (kept fresh by startSessionsPoll in
 * orchestrator.js at 4 s intervals). Terminal focus sets store.terminal so
 * the docked XtermPanel opens/reattaches. Stop calls orchestrator.stopSession.
 *
 * No separate poll timer — if a tighter cadence is needed while this view is
 * open, a local useEffect interval can be added. For now the 4 s global poll
 * is sufficient.
 */

import { html, useState } from '../preact.js';
import { useStore } from '../store.js';
import { stopSession, openTermPanel, ALLOWED_COMMANDS, isSessionRunning, mergeSessionsAndHistory } from '../orchestrator.js';
import { openRunnerPicker } from '../components/RunnerPicker.js';
import { RejectDialog } from '../components/RejectDialog.js';
import { XtermPanel } from '../components/XtermPanel.js';
import { orchElapsed, humanDate } from '../util.js';
import { Icon } from '../icons-client.js';

// ── Sorted session list ───────────────────────────────────────────────────────

function sortSessions(sessions) {
  return [...sessions].sort((a, b) => {
    // Blocked-on-input first (needs immediate attention)
    if ((a.status === 'blocked') !== (b.status === 'blocked')) {
      return a.status === 'blocked' ? -1 : 1;
    }
    // Then idle-waiting
    if (!!a.waiting !== !!b.waiting) return a.waiting ? -1 : 1;
    // Then running
    if ((a.status === 'running') !== (b.status === 'running')) {
      return a.status === 'running' ? -1 : 1;
    }
    // Then most-recent first
    return String(b.startTime || '').localeCompare(String(a.startTime || ''));
  });
}

// ── Runner picker card (left rail) ───────────────────────────────────────────

/**
 * Two-letter mono abbreviation for a command's readable name, derived from
 * the label's leading word(s) before " — " (e.g. "sprint-status — sprint
 * execution status" → "SS", "init — initialise project workspace" → "IN").
 */
function commandAbbr(label) {
  const name = (label || '').split('—')[0].trim();
  const parts = name.split('-').filter(Boolean);
  if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

/**
 * RunnerCard — repurposes the "Runner picker" card from the design as rcode's
 * allowlisted command list (per the restructure spec — this is NOT a CLI/
 * model picker, that is RunnerPicker.js's job once Run is pressed). Selecting
 * an idle row highlights it for the next Run; clicking a row that is already
 * Running instead attaches the docked terminal to that live session (same as
 * a Pipeline-card row) — picking a command to run next and looking at a
 * session that's already streaming are different actions.
 */
function RunnerCard() {
  const { orchOnline, terminal } = useStore();
  const [selected, setSelected] = useState(ALLOWED_COMMANDS[0]?.cmd || '');
  const orchDown = orchOnline === false;
  const attachedStoryId = terminal && terminal.open ? terminal.storyId : '';

  function handleRun(e) {
    if (!selected || orchDown) return;
    openRunnerPicker(e.currentTarget, { kind: 'command', cmd: selected, title: selected });
  }

  return html`
    <div class="orch-runner-card">
      <div class="orch-card-label">Runner picker</div>
      <div class="orch-runner-list">
        ${ALLOWED_COMMANDS.map(({ cmd, label }) => {
          const slug      = cmd.replace(/^\//, '').replace(/\//g, '-');
          const sessionId = 'cmd-' + slug;
          const isRunning = isSessionRunning(sessionId);
          const isAttached = isRunning && sessionId === attachedStoryId;
          const name = (label || '').split('—')[0].trim();
          return html`
            <div key=${cmd}
              class=${'orch-runner-row'
                + (cmd === selected ? ' selected' : '')
                + (isAttached ? ' attached' : '')}
              onClick=${() => isRunning ? openTermPanel(sessionId, sessionId) : setSelected(cmd)}>
              <span class="orch-runner-abbr">${commandAbbr(label)}</span>
              <div class="orch-runner-info">
                <div class="orch-runner-name">${name}</div>
                <div class="orch-runner-role">${cmd}</div>
              </div>
              <span class=${'orch-runner-status' + (isRunning ? ' running' : '')}>
                ${isRunning ? 'Running' : 'Idle'}
              </span>
            </div>
          `;
        })}
      </div>
      <div class="orch-runner-card-footer">
        <button class="term-run-btn" disabled=${orchDown} onClick=${handleRun}>
          <${Icon} name="play" size=${14}/> Run
        </button>
        ${orchDown ? html`
          <div class="orch-runner-hint">Orchestrator unreachable — Run is disabled.</div>
        ` : null}
      </div>
    </div>
  `;
}

// ── Pipeline card (left rail) ─────────────────────────────────────────────────

const PIPELINE_GLYPH = {
  running: '◐', blocked: '!', waiting: '…',
  done: '✓', exited: '✕', stopped: '■', error: '✕',
};

function PipelineRow({ glyphCls, glyph, label, count, onClick, actions, active }) {
  return html`
    <div class=${'orch-pipeline-row' + (active ? ' active' : '')} onClick=${onClick}>
      <span class=${'orch-pipeline-glyph ' + glyphCls}>${glyph}</span>
      <span class="orch-pipeline-label-text">${label}</span>
      <span class="orch-pipeline-count">${count}</span>
      ${actions ? html`<span class="orch-pipeline-actions">${actions}</span>` : null}
    </div>
  `;
}

/**
 * PipelineCard — live sessions (clickable to focus in the docked terminal,
 * with inline Stop / Reject affordances) when any exist; otherwise falls
 * back to a STATUS_ORDER history-count summary so the card stays useful.
 */
function PipelineCard() {
  const { activeSessions, history, terminal } = useStore();
  const [rejectFor, setRejectFor] = useState(null);
  const attachedStoryId = terminal && terminal.open ? terminal.storyId : '';
  const live = sortSessions((activeSessions || []).filter(
    s => s.status === 'running' || s.status === 'blocked'
  ));

  let body;
  if (live.length > 0) {
    body = live.map(s => {
      const blocked = s.status === 'blocked';
      const waiting = blocked || !!s.waiting;
      const glyphCls = waiting ? 'blocked' : 'running';
      const actions = html`
        ${waiting ? html`
          <button class="orch-pipeline-action-btn danger"
            title="Reject"
            onClick=${e => { e.stopPropagation(); setRejectFor(s); }}>
            <${Icon} name="alert-triangle" size=${11}/>
          </button>
        ` : null}
        <button class="orch-pipeline-action-btn danger"
          title="Stop"
          onClick=${e => { e.stopPropagation(); stopSession(s.storyId); }}>■</button>
      `;
      return html`
        <${PipelineRow} key=${s.storyId}
          glyphCls=${glyphCls}
          glyph=${PIPELINE_GLYPH[blocked ? 'blocked' : 'running']}
          label=${s.storyId}
          count=${orchElapsed(s.startTime)}
          active=${s.storyId === attachedStoryId}
          onClick=${() => openTermPanel(s.storyId, s.storyId)}
          actions=${actions}
        />
      `;
    });
  } else {
    const merged = mergeSessionsAndHistory(activeSessions, history);
    const ended  = merged.filter(r => r.status !== 'running' && r.status !== 'blocked');
    body = STATUS_ORDER.map(status => {
      const count = ended.filter(r => r.status === status).length;
      if (count === 0) return null;
      return html`
        <${PipelineRow} key=${status}
          glyphCls=${status}
          glyph=${PIPELINE_GLYPH[status] || '·'}
          label=${status}
          count=${count}
        />
      `;
    });
    if (ended.length === 0) {
      body = html`<div class="empty">No runs yet.</div>`;
    }
  }

  return html`
    <div class="orch-pipeline-card">
      <div class="orch-pipeline-label">Pipeline</div>
      ${body}
      ${rejectFor ? html`<${RejectDialog} session=${rejectFor} onClose=${() => setRejectFor(null)}/>` : null}
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

/**
 * HistoryRow — ended runs are read-only UNLESS the server still holds the
 * session in memory (run.source === 'live', from mergeSessionsAndHistory —
 * true until "Clean sessions" removes it). While that's the case the PTY's
 * scrollback is still attachable over WS, so the row is clickable and
 * reattaches the docked terminal to replay it; otherwise there is nothing to
 * attach to and the row stays static (no persisted log replay exists).
 */
function HistoryRow({ run, active }) {
  const attachable = run.source === 'live';
  return html`
    <div class=${'hist-row' + (attachable ? ' clickable' : '') + (active ? ' active' : '')}
      key=${run.storyId}
      onClick=${attachable ? () => openTermPanel(run.storyId, run.storyId) : undefined}>
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
  const { activeSessions, history, terminal } = useStore();
  const attachedStoryId = terminal && terminal.open ? terminal.storyId : '';
  const merged = mergeSessionsAndHistory(activeSessions, history);
  // 'blocked' is a live session (waiting for input), not an ended run.
  const ended = merged.filter(r => r.status !== 'running' && r.status !== 'blocked');

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
                ${runs.map(run => html`<${HistoryRow} key=${run.storyId} run=${run} active=${run.storyId === attachedStoryId}/>`)}
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
  const liveCount = (activeSessions || []).filter(
    s => s.status === 'running' || s.status === 'blocked'
  ).length;
  const orchDown = orchOnline === false;

  return html`
    <div class="view active orch-layout" id="view-orchestration">
      <div class="orch-left-rail">
        <div>
          <h1 class="orch-h1">Orchestration</h1>
          <div class="orch-header-sub">
            ${liveCount} agent${liveCount === 1 ? '' : 's'} live ·
            ${orchDown ? ' runner unreachable' : ' runner connected'}
          </div>
        </div>

        ${orchDown ? html`
          <div class="orch-down-banner" role="alert">
            ⚠ Orchestrator unreachable (port 7718) — Run buttons are disabled.
            Restart the dashboard, or set ORCH_PORT if the port is in use.
          </div>
        ` : null}

        <${RunnerCard}/>
        <${PipelineCard}/>
      </div>

      <div class="orch-right-col">
        <${XtermPanel} docked=${true} />
        <div class="orch-hist-dock">
          <${HistoryPanel}/>
        </div>
      </div>
    </div>
  `;
}
