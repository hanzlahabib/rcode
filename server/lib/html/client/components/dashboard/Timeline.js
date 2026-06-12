/**
 * Timeline — Overview redesign, Row 1 Card 3.
 *
 * Projected-launch card: label, big teal launch date, "In N days" line, an
 * ascending line-chart sparkline (inline SVG, token colors, dots on points),
 * and an on-track / delays footer.
 *
 * Reads the `timeline { launchDate, onTrack, points[] }` slice from the store.
 * Falls back to a representative sample so the card renders standalone before
 * the data agent populates the real store. See DATA-CONTRACT.md. No fetch.
 */

import { html } from '../../preact.js';
import { useStore } from '../../store.js';

// Representative sample used when the store slice is absent (standalone render).
const SAMPLE = {
  launchDate: '2026-08-01',
  onTrack: true,
  points: [
    { label: 'W1', value: 10 },
    { label: 'W2', value: 22 },
    { label: 'W3', value: 31 },
    { label: 'W4', value: 48 },
    { label: 'W5', value: 64 },
    { label: 'W6', value: 82 },
  ],
};

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
  const timeline = (S && S.timeline) || SAMPLE;
  const points = (timeline.points && timeline.points.length) ? timeline.points : SAMPLE.points;
  const onTrack = timeline.onTrack !== false;

  const coords = toCoords(points);
  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${VH - PAD_Y} L ${coords[0].x.toFixed(1)} ${VH - PAD_Y} Z`;

  const days = daysUntil(timeline.launchDate);
  const daysLine = days == null ? 'Launch scheduled' : `In ${days} day${days === 1 ? '' : 's'}`;

  return html`
    <section class="dash-card tl-card">
      <p class="dash-card-sub tl-label">Projected Launch</p>
      <p class="tl-date">${displayDate(timeline.launchDate)}</p>
      <p class="tl-days">${daysLine}</p>

      <svg class="tl-chart" viewBox=${`0 0 ${VW} ${VH}`} preserveAspectRatio="none" role="img"
        aria-label="Projected progress trend">
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

      <div class="tl-footer">
        <span class=${'tl-status' + (onTrack ? '' : ' tl-status-risk')}>
          <span class="tl-dot-badge"></span>${onTrack ? 'On track' : 'At risk'}
        </span>
        <span class="tl-note">No major delays</span>
      </div>
    </section>
  `;
}
