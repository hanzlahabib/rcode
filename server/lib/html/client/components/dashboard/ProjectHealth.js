/**
 * ProjectHealth — health mini-card used by the Sidebar (and the Overview grid).
 *
 * Reads `health { pct, label, points[] }` from the store. When the slice is
 * absent (shell renders before /api/state lands, or component used standalone)
 * it falls back to a representative sample so it never renders blank.
 * See .planning/campaign/DATA-CONTRACT.md. Reads store only — no fetch.
 *
 * No inline style= attributes — all styling via .phealth-* classes in css.js.
 */

import { html } from '../../preact.js';
import { useStore } from '../../store.js';

// Representative fallback so the card renders standalone before data arrives.
const SAMPLE_HEALTH = {
  pct: 82,
  label: 'Healthy',
  points: [
    { label: 'Mon', value: 74 },
    { label: 'Tue', value: 78 },
    { label: 'Wed', value: 76 },
    { label: 'Thu', value: 80 },
    { label: 'Fri', value: 79 },
    { label: 'Sat', value: 83 },
    { label: 'Sun', value: 82 },
  ],
};

/**
 * Severity class for the health score — drives the accent colour.
 * @param {number} pct
 */
function healthTone(pct) {
  if (pct >= 75) return 'phealth--good';
  if (pct >= 50) return 'phealth--warn';
  return 'phealth--risk';
}

/**
 * Build an SVG polyline `points` string for the sparkline from a value series.
 * Maps values into a 0..W × 0..H box, flipping Y so higher values sit higher.
 */
function sparkPoints(points, w, h) {
  if (!points.length) return '';
  const values = points.map(p => Number(p.value) || 0);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = points.length > 1 ? w / (points.length - 1) : 0;
  return values
    .map((v, i) => {
      const x = i * step;
      const y = h - ((v - min) / span) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

export function ProjectHealth() {
  const S = useStore();
  const health = (S && S.health && typeof S.health.pct === 'number') ? S.health : SAMPLE_HEALTH;
  const pct = Math.max(0, Math.min(100, Math.round(Number(health.pct) || 0)));
  const label = health.label || 'Unknown';
  const points = Array.isArray(health.points) ? health.points : [];
  const tone = healthTone(pct);

  const W = 180;
  const H = 36;
  const line = sparkPoints(points, W, H);
  // Close the polygon down to the baseline for a soft area fill.
  const area = line ? `0,${H} ${line} ${W},${H}` : '';

  return html`
    <section class=${'phealth ' + tone}>
      <p class="phealth-title">Project Health</p>
      <div class="phealth-head">
        <span class="phealth-pct">${pct}<span class="phealth-pct-sign">%</span></span>
        <span class="phealth-label">${label}</span>
      </div>
      <svg class="phealth-spark" viewBox=${'0 0 ' + W + ' ' + H} preserveAspectRatio="none" aria-hidden="true">
        ${area ? html`<polygon class="phealth-spark-area" points=${area} />` : null}
        ${line ? html`<polyline class="phealth-spark-line" points=${line} />` : null}
      </svg>
    </section>
  `;
}
