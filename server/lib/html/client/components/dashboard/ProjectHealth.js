/**
 * ProjectHealth — progress mini-card used by the Sidebar.
 *
 * Reads `health { pct, label, points[] }` from the store. The scanner now
 * emits real values only: pct is the story-completion percentage (null when
 * nothing is tracked yet — shown as "—"), label is the real blocker count or
 * "Not started", and points exist only when the project has recorded
 * velocity_history. No sample fallback, no invented composite score.
 * See .planning/campaign/DATA-CONTRACT.md. Reads store only — no fetch.
 *
 * No inline style= attributes — all styling via .phealth-* classes in css.js.
 */

import { html } from '../../preact.js';
import { useStore } from '../../store.js';

/**
 * Tone class — driven by the real blocker count, not an invented score.
 * Neutral when nothing is tracked yet.
 */
function healthTone(pct, blockerCount) {
  if (pct == null) return 'phealth--none';
  if (blockerCount >= 2) return 'phealth--risk';
  if (blockerCount === 1) return 'phealth--warn';
  return 'phealth--good';
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
  const health = (S && S.health) || {};
  const blockerCount = Array.isArray(S.blockers) ? S.blockers.length : 0;
  const hasPct = typeof health.pct === 'number';
  const pct = hasPct ? Math.max(0, Math.min(100, Math.round(health.pct))) : null;
  const label = health.label || (hasPct ? '' : 'Not tracked');
  const points = Array.isArray(health.points) ? health.points : [];
  const tone = healthTone(pct, blockerCount);

  const W = 180;
  const H = 36;
  // Sparkline only from real recorded velocity — 2+ points or nothing.
  const line = points.length >= 2 ? sparkPoints(points, W, H) : '';
  // Close the polygon down to the baseline for a soft area fill.
  const area = line ? `0,${H} ${line} ${W},${H}` : '';

  return html`
    <section class=${'phealth ' + tone}>
      <p class="phealth-title">Progress</p>
      <div class="phealth-head">
        <span class="phealth-pct">${pct != null ? pct : '—'}${pct != null ? html`<span class="phealth-pct-sign">%</span>` : null}</span>
        <span class="phealth-label">${label}</span>
      </div>
      ${line ? html`
        <svg class="phealth-spark" viewBox=${'0 0 ' + W + ' ' + H} preserveAspectRatio="none" aria-hidden="true">
          <polygon class="phealth-spark-area" points=${area} />
          <polyline class="phealth-spark-line" points=${line} />
        </svg>
      ` : null}
    </section>
  `;
}
