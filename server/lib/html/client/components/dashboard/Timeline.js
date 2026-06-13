/**
 * Timeline — Overview redesign, Row 1 Card 3.
 *
 * Target-launch card. With a configured launch date: countdown + a velocity
 * sparkline drawn only from real recorded `velocity_history` + the real
 * open-blocker count. Without one, the dead space becomes a "Milestone
 * outlook": current milestone name, phases done/total, latest recorded
 * velocity, and a hint that launch_date in .rcode/config.yaml enables the
 * countdown — never a projected/invented date.
 *
 * Reads the `timeline { launchDate, onTrack, points[] }` slice plus
 * `blockers`, `milestone`, and `phases` from the store. See DATA-CONTRACT.md.
 * No fetch.
 */

import { html } from '../../preact.js';
import { useStore } from '../../store.js';

// SVG viewBox geometry for the sparkline.
const VW = 280;
const VH = 88;
const PAD_X = 8;
const PAD_Y = 12;

/** Days from today until the launch date (>= 0; null when unparseable). */
function daysUntil(launchDate) {
  const target = new Date(launchDate);
  if (isNaN(target.getTime())) return null;
  const now = new Date();
  const ms = target.setHours(0, 0, 0, 0) - now.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round(ms / 86400000));
}

/** Human display of an ISO date, falling back to the raw string. */
function displayDate(launchDate) {
  const d = new Date(launchDate);
  if (isNaN(d.getTime())) return launchDate;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Map a value series to evenly-spaced SVG coordinates (y inverted). */
function toCoords(points) {
  const values = points.map(p => Number(p.value) || 0);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const innerW = VW - PAD_X * 2;
  const innerH = VH - PAD_Y * 2;
  const step = points.length > 1 ? innerW / (points.length - 1) : 0;
  return values.map((v, i) => ({
    x: PAD_X + step * i,
    y: PAD_Y + innerH - ((v - min) / span) * innerH,
  }));
}

export function Timeline() {
  const S = useStore();
  const timeline = (S && S.timeline) || {};
  const points = Array.isArray(timeline.points) ? timeline.points : [];
  const blockers = Array.isArray(S.blockers) ? S.blockers : [];

  const hasDate = !!timeline.launchDate;
  const days = hasDate ? daysUntil(timeline.launchDate) : null;
  const daysLine = days == null ? 'Launch scheduled' : `In ${days} day${days === 1 ? '' : 's'}`;

  let chart = null;
  if (points.length >= 2) {
    const coords = toCoords(points);
    const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
    const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${VH - PAD_Y} L ${coords[0].x.toFixed(1)} ${VH - PAD_Y} Z`;
    chart = html`
      <svg class="tl-chart" viewBox=${`0 0 ${VW} ${VH}`} preserveAspectRatio="none" role="img"
        aria-label="Recorded sprint velocity trend">
        <defs>
          <linearGradient id="tlFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--dash-teal)" stop-opacity="0.22"/>
            <stop offset="100%" stop-color="var(--dash-teal)" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <path class="tl-area" d=${areaPath} fill="url(#tlFill)"/>
        <path class="tl-line" d=${linePath} fill="none" stroke="var(--dash-teal)"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        ${coords.map(c => html`
          <circle class="tl-dot" cx=${c.x.toFixed(1)} cy=${c.y.toFixed(1)} r="3"
            fill="var(--dash-bg)" stroke="var(--dash-teal)" stroke-width="2"/>
        `)}
      </svg>
    `;
  } else {
    chart = html`<div class="tl-nochart">${points.length === 1 ? 'Not enough velocity history to chart yet' : 'No velocity history recorded'}</div>`;
  }

  const blockerNote = blockers.length
    ? `${blockers.length} open blocker${blockers.length === 1 ? '' : 's'}`
    : 'No open blockers';

  const footer = html`
    <div class="tl-footer">
      <span class=${'tl-status' + (blockers.length ? ' tl-status-risk' : '')}>
        <span class="tl-dot-badge"></span>${blockerNote}
      </span>
    </div>
  `;

  if (!hasDate) {
    // No launch date configured — show a milestone outlook built from real
    // store data instead of a dead "—" date.
    const phases = Array.isArray(S.phases) ? S.phases : [];
    const phasesDone = phases.filter(p => String(p.state).toLowerCase() === 'done').length;
    const latest = points.length ? points[points.length - 1] : null;
    return html`
      <section class="dash-card tl-card">
        <p class="dash-card-sub tl-label">Milestone Outlook</p>
        <p class="tl-outlook-name">${S.milestone || 'No milestone set'}</p>
        <ul class="tl-outlook">
          <li class="tl-outlook-row">
            <span class="tl-outlook-key">Phases</span>
            <span class="tl-outlook-val">${phases.length ? `${phasesDone}/${phases.length} done` : 'None planned'}</span>
          </li>
          <li class="tl-outlook-row">
            <span class="tl-outlook-key">Latest velocity</span>
            <span class="tl-outlook-val">${latest ? `${latest.value} pts (${latest.label})` : 'Not recorded'}</span>
          </li>
        </ul>
        ${chart}
        <p class="tl-outlook-hint">Set <code>launch_date</code> in <code>.rcode/config.yaml</code> to track a launch countdown</p>
        ${footer}
      </section>
    `;
  }

  return html`
    <section class="dash-card tl-card">
      <p class="dash-card-sub tl-label">Target Launch</p>
      <p class="tl-date">${displayDate(timeline.launchDate)}</p>
      <p class="tl-days">${daysLine}</p>

      ${chart}

      ${footer}
    </section>
  `;
}
