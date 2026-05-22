/**
 * OverviewView — Preact component.
 *
 * Ports renderOverview() from client-render.js to a component tree.
 * Reads state via useStore(). Keeps every existing CSS class.
 */

import { html } from '../preact.js';
import { useStore } from '../store.js';
import { pct, humanDate, allSprints, allTasks, chip, sprintHints as getSprintHints } from '../util.js';
import { ProgressBar, CmdHints, Chip } from '../components/shared.js';
import { Icon } from '../icons-client.js';

// ---- OverviewView ----

export function OverviewView() {
  const S = useStore();
  const sprints = allSprints(S.phases);
  const curSprint = sprints.find(s => s.id === S.currentSprint) || null;

  // Velocity sparkline data
  const completedSprints = sprints.filter(s => s.velocity_actual != null);
  const showVelocity = completedSprints.length > 1;

  // Chains & workstreams
  const chains = S.chains || [];
  const workstreams = S.workstreams || [];

  // Cmd hints
  const baseHints = [
    ['/rcode-next',   'What should I do next?'],
    ['/rcode-status', 'Quick project status'],
    ['/rcode-council','Ask the team a question'],
  ];
  const sprintHints = getSprintHints(curSprint);
  let hints = [...sprintHints, ...baseHints];
  if (S.pendingHandoff) {
    hints = [['/rcode-resume-work','Resume from the pending handoff'], ...hints];
  }

  // At-a-glance status tiles — phase, sprint, blocked, last execution.
  function StatusSummary() {
    const curPhase = (S.phases || []).find(
      p => String(p.id) === String(S.currentPhase),
    ) || null;
    const blockedCount = allTasks(S.phases).filter(t => t.status === 'blocked').length;
    const lastExec = S.last_session
      ? humanDate(S.last_session.date || S.last_session.timestamp)
      : null;
    return html`
      <div class="stat">
        <div class="label">Current Phase</div>
        <div class="value">${curPhase ? 'P' + curPhase.id : '—'}</div>
        <div class="sub">
          ${curPhase ? html`${curPhase.name} · <${Chip} status=${curPhase.status}/>` : 'No phase set'}
        </div>
      </div>
      <div class="stat">
        <div class="label">Active Sprint</div>
        <div class="value">${curSprint ? curSprint.id : '—'}</div>
        <div class="sub">${curSprint ? (curSprint.goal || curSprint.status || 'in progress') : 'No active sprint'}</div>
      </div>
      <div class="stat" style=${blockedCount ? 'border-left-color:var(--red,#eb5757)' : ''}>
        <div class="label">Blocked Tasks</div>
        <div class="value" style=${blockedCount ? 'color:var(--red,#eb5757)' : ''}>${blockedCount}</div>
        <div class="sub">${blockedCount ? 'needs attention' : 'all clear'}</div>
      </div>
      <div class="stat">
        <div class="label">Last Execution</div>
        <div class="value" style="font-size:var(--text-lg,1rem);">${lastExec || '—'}</div>
        <div class="sub">${lastExec ? 'most recent session' : 'no sessions yet'}</div>
      </div>
    `;
  }

  // Current sprint progress
  function SprintProgress() {
    if (!curSprint) return null;
    const sts = curSprint.stories || [];
    const d = sts.filter(t => t.status === 'done' || t.status === 'completed').length;
    return html`
      <section>
        <h2 class="section-icon"><${Icon} name="zap" size=${16}/> Current Sprint — ${curSprint.id}</h2>
        <div class="body">
          <div style="margin-bottom:8px;font-size:var(--text-sm);color:var(--text-secondary);">
            ${curSprint.goal || ''}
          </div>
          <div style="display:flex;align-items:center;gap:var(--space-3);">
            <div style="flex:1;"><${ProgressBar} done=${d} total=${sts.length}/></div>
            <span style="font-size:var(--text-sm);font-weight:600;">
              ${d}/${sts.length} (${pct(d, sts.length)})
            </span>
          </div>
        </div>
      </section>
    `;
  }

  // Velocity sparkline (inline SVG, same as client-render.js:267-272)
  function VelocitySpark() {
    if (!showVelocity) return null;
    const vals = completedSprints.map(s => s.velocity_actual);
    const max = Math.max(...vals, 1);
    const w = 200, h = 40, step = w / (vals.length - 1);
    const points = vals.map((v, i) => (i * step) + ',' + (h - (v / max) * h)).join(' ');
    return html`
      <div class="stat">
        <div class="label">Sprint Velocity</div>
        <svg width=${w} height=${h + 4} style="margin-top:8px;">
          <polyline points=${points} fill="none" stroke="var(--accent-blue)" stroke-width="2"/>
        </svg>
        <div class="sub">Last ${vals.length} sprints</div>
      </div>
    `;
  }

  // Council sessions
  function CouncilSessions() {
    if (!Array.isArray(S.council_sessions) || !S.council_sessions.length) return null;
    return html`
      <section>
        <h2 class="section-icon"><${Icon} name="building" size=${16}/> Council Sessions</h2>
        <div class="body">
          <div class="phase-list">
            ${S.council_sessions.slice(-5).reverse().map((cs, i) => html`
              <div key=${i} class="item">
                <div class="item-title">${cs.topic || cs.title || 'Session'}</div>
                <div class="item-meta">
                  ${cs.date ? humanDate(cs.date) : ''}
                  ${cs.participants ? ' · ' + cs.participants.join(', ') : ''}
                </div>
              </div>
            `)}
          </div>
        </div>
      </section>
    `;
  }

  // Chains & workstreams
  function ChainsSection() {
    if (!chains.length && !workstreams.length) return null;
    const { cls, label } = chip('active');
    return html`
      <section>
        <h2 class="section-icon"><${Icon} name="link" size=${16}/> Chains &amp; Workstreams</h2>
        <div class="body">
          ${chains.length ? html`
            <div style="margin-bottom:var(--space-4);">
              <strong>Chains</strong>
              <div class="phase-list" style="margin-top:var(--space-2);">
                ${chains.map((c, i) => html`
                  <div key=${i} class="item">
                    <div class="item-title">${c.name || c.id || 'Chain'}</div>
                  </div>
                `)}
              </div>
            </div>
          ` : null}
          ${workstreams.length ? html`
            <div>
              <strong>Workstreams</strong>
              <div class="phase-list" style="margin-top:var(--space-2);">
                ${workstreams.map((w, i) => {
                  const wChip = chip(w.status || 'active');
                  return html`
                    <div key=${i} class="item">
                      <div class="item-title">
                        ${w.name || w.id || 'Workstream'}
                        ${' '}<span class=${'status-chip ' + wChip.cls}>● ${wChip.label}</span>
                      </div>
                    </div>
                  `;
                })}
              </div>
            </div>
          ` : null}
        </div>
      </section>
    `;
  }

  // Pending handoff banner
  function HandoffBanner() {
    if (!S.pendingHandoff) return null;
    const ho = S.pendingHandoff;
    const when = ho.ts ? humanDate(ho.ts) : '';
    const summary = ho.summary ? ' — ' + String(ho.summary).slice(0, 120) : '';
    const where = ho.sprint ? ' [sprint ' + ho.sprint + ']' : ho.phase ? ' [phase ' + ho.phase + ']' : '';
    return html`
      <section style="border-left:4px solid var(--accent-orange,#f59e0b);padding-left:var(--space-3);">
        <h2 class="section-icon"><${Icon} name="alert-triangle" size=${16}/> Pending Handoff</h2>
        <div class="body">
          <div>${when}${where}${summary}</div>
          ${ho.resume_hint ? html`
            <div style="margin-top:var(--space-2);color:var(--text-secondary);font-size:var(--text-sm);">
              ${ho.resume_hint}
            </div>
          ` : null}
          <div style="margin-top:var(--space-3);font-size:var(--text-sm);">
            <code>/rcode-resume-work</code>
          </div>
        </div>
      </section>
    `;
  }

  // Memory bank summary
  function MemorySection() {
    if (!S.memoryBank || !S.memoryBank.active) return null;
    const m = S.memoryBank.active;
    return html`
      <section
        class="item-clickable"
        style="cursor:pointer;"
        onClick=${() => { location.hash = 'memory'; }}
      >
        <h2 class="section-icon"><${Icon} name="brain" size=${16}/> Memory Bank →</h2>
        <div class="body">
          <div class="attr-grid">
            <div class="attr-item">
              <span class="attr-label">active.md</span>
              <span class="attr-value">${m.lines} lines · ${Math.round(m.bytes / 1024 * 10) / 10} KB</span>
            </div>
            <div class="attr-item">
              <span class="attr-label">Updated</span>
              <span class="attr-value">${humanDate(m.updated)}</span>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  // Last session line
  function LastSession() {
    if (!S.last_session) return null;
    const ls = S.last_session;
    return html`
      <span style="color:var(--text-muted);font-size:var(--text-xs);margin-left:var(--space-3);">
        Last session: ${humanDate(ls.date || ls.timestamp) || '—'}
      </span>
    `;
  }

  return html`
    <div id="view-overview" class="view active">
      <div class="stats">
        <${StatusSummary}/>
        <${VelocitySpark}/>
      </div>
      <${HandoffBanner}/>
      <${SprintProgress}/>
      <${MemorySection}/>
      <${CouncilSessions}/>
      <${ChainsSection}/>
      <${LastSession}/>
      <${CmdHints} hints=${hints}/>
    </div>
  `;
}
