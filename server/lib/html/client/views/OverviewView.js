/**
 * OverviewView — Preact component.
 *
 * Ports renderOverview() from client-render.js to a component tree.
 * Reads state via useStore(). Keeps every existing CSS class.
 *
 * Sub-components ProgressBar and CmdHints are inline here.
 * TODO(31.2): promote ProgressBar and CmdHints to components/
 */

import { html, useState } from '../preact.js';
import { useStore } from '../store.js';
import { pct, pctNum, humanDate, allSprints, chip } from '../util.js';

// ---- Inline sub-components (TODO(31.2): promote to components/) ----

function ProgressBar({ done, total }) {
  const p = pctNum(done, total);
  const color = p >= 100 ? 'var(--accent-green)' : p > 50 ? 'var(--accent-blue)' : 'var(--accent-amber)';
  return html`
    <div class="progress-bar">
      <div class="progress-bar-fill" style=${'width:' + p + '%;background:' + color}></div>
    </div>
  `;
}

function CmdHintItem({ cmd, desc }) {
  function copyCmd() {
    navigator.clipboard.writeText(cmd).then(() => showToast('Copied: ' + cmd)).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = cmd;
      document.body.appendChild(ta); ta.select(); document.execCommand('copy');
      document.body.removeChild(ta); showToast('Copied: ' + cmd);
    });
  }
  return html`
    <div class="cmd-hint-item" onClick=${copyCmd}>
      <span class="cmd-text">${cmd}</span>
      <span class="cmd-desc">${desc}</span>
      <span class="cmd-copy">📋</span>
    </div>
  `;
}

function CmdAccordion({ hints }) {
  if (!hints || !hints.length) return null;
  return html`
    <details class="cmd-hints">
      <summary>💡 Commands</summary>
      <div class="cmd-hints-list">
        ${hints.map(([cmd, desc]) => html`<${CmdHintItem} key=${cmd} cmd=${cmd} desc=${desc}/>`)}
      </div>
    </details>
  `;
}

// Sprint hints — same logic as client-render.js:sprintHints
function getSprintHints(sprint) {
  if (!sprint) return [];
  const st = sprint.status || 'planned';
  const sid = sprint.id || '';
  const stories = Array.isArray(sprint.stories) ? sprint.stories : [];
  if (st === 'completed' || st === 'complete' || st === 'done') {
    return [
      ['/rihal-verify-work',   'Verify UAT for Sprint ' + sid],
      ['/rihal-audit',         'Audit completed Sprint ' + sid],
      ['/rihal-session-report','Generate session report'],
      ['/rihal-code-review',   'Review code from Sprint ' + sid],
    ];
  } else if (st === 'active' || st === 'in_progress') {
    return [
      ['/rihal-progress',     'Check Sprint ' + sid + ' progress'],
      ['/rihal-sprint-status','Status report for Sprint ' + sid],
      ['/rihal-pause-work',   'Pause and save context'],
    ];
  } else if (st === 'blocked') {
    return [
      ['/rihal-debug',         'Debug blocker in Sprint ' + sid],
      ['/rihal-correct-course','Course-correct Sprint ' + sid],
    ];
  } else {
    if (!stories.length) {
      return [
        ['/rihal-sprint-planning','Groom Sprint ' + sid + ' — add stories'],
        ['/rihal-create-story',   'Create a story for Sprint ' + sid],
        ['/rihal-discuss-phase',  'Discuss approach before planning'],
      ];
    }
    return [
      ['/rihal-execute',        'Execute Sprint ' + sid],
      ['/rihal-discuss-phase',  'Discuss before executing'],
      ['/rihal-sprint-planning','Refine Sprint ' + sid + ' plan'],
    ];
  }
}

function showToast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg; el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2000);
}

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
    ['/rihal-next',   'What should I do next?'],
    ['/rihal-status', 'Quick project status'],
    ['/rihal-council','Ask the team a question'],
  ];
  const sprintHints = getSprintHints(curSprint);
  let hints = [...sprintHints, ...baseHints];
  if (S.pendingHandoff) {
    hints = [['/rihal-resume-work','Resume from the pending handoff'], ...hints];
  }

  // Current sprint progress
  function SprintProgress() {
    if (!curSprint) return null;
    const sts = curSprint.stories || [];
    const d = sts.filter(t => t.status === 'done' || t.status === 'completed').length;
    return html`
      <section>
        <h2>⚡ Current Sprint — ${curSprint.id}</h2>
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
        <h2>🏛 Council Sessions</h2>
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
        <h2>🔗 Chains & Workstreams</h2>
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
        <h2>⚠ Pending Handoff</h2>
        <div class="body">
          <div>${when}${where}${summary}</div>
          ${ho.resume_hint ? html`
            <div style="margin-top:var(--space-2);color:var(--text-secondary);font-size:var(--text-sm);">
              ${ho.resume_hint}
            </div>
          ` : null}
          <div style="margin-top:var(--space-3);font-size:var(--text-sm);">
            <code>/rihal-resume-work</code>
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
      <section>
        <h2>🧠 Memory Bank</h2>
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
        <${VelocitySpark}/>
      </div>
      <${HandoffBanner}/>
      <${SprintProgress}/>
      <${MemorySection}/>
      <${CouncilSessions}/>
      <${ChainsSection}/>
      <${LastSession}/>
      <${CmdAccordion} hints=${hints}/>
    </div>
  `;
}
