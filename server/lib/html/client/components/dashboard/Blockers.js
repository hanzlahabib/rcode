/**
 * Blockers — Overview redesign, Row 2 Card 3 (Blockers list by severity).
 *
 * Reads `blockers[{ title, desc, severity }]` from the store (severity one of
 * high | medium | low). Each row: warning icon + bold title, a right-aligned
 * severity pill (High = red, Medium = amber, Low = gray), and a muted one-line
 * description below. "View all" sits top-right in the card header.
 * An empty array is the real, good state — rendered as "No blockers 🎉",
 * never substituted with sample data.
 * See .planning/campaign/DATA-CONTRACT.md. Reads store only — no fetch.
 */

import { html } from '../../preact.js';
import { useStore } from '../../store.js';

// Severity → pill label (lowercase enum to human-facing label).
const SEV_LABEL = { high: 'High', medium: 'Medium', low: 'Low' };

export function Blockers() {
  const S = useStore();
  const blockers = Array.isArray(S.blockers) ? S.blockers : [];

  return html`
    <section class="dash-card">
      <div class="bk-head">
        <p class="dash-card-title">Blockers</p>
        <button class="bk-viewall" type="button"
          onClick=${() => { location.hash = 'tasks'; }}>View all</button>
      </div>
      ${blockers.length === 0
        ? html`
          <div class="dash-empty">
            <span class="dash-empty-emoji" aria-hidden="true">🎉</span>
            <span>No blockers</span>
          </div>
        `
        : html`
          <ul class="bk-list">
            ${blockers.map((b) => {
              const sev = SEV_LABEL[b.severity] ? b.severity : 'low';
              return html`
                <li class="bk-row" key=${b.title}>
                  <span class=${'bk-icon bk-sev-' + sev} aria-hidden="true">⚠</span>
                  <div class="bk-body">
                    <p class="bk-title">${b.title}</p>
                    <p class="bk-desc">${b.desc}</p>
                  </div>
                  <span class=${'bk-pill bk-sev-' + sev}>${SEV_LABEL[sev]}</span>
                </li>
              `;
            })}
          </ul>
        `}
    </section>
  `;
}
