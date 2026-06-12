/**
 * entry.js — mounts the redesigned dashboard App into #rd-root.
 *
 * This is glue, not a component: it fetches GET /api/state once and renders
 * the App with that state. Components themselves never fetch — they receive
 * their slice as props (see DATA-CONTRACT.md). On fetch failure the App still
 * renders against EMPTY_STATE so the shell is always visible.
 *
 * Load with: <script type="module" src="/js/components/entry.js"></script>
 */

import { render, html } from '../vendor/preact.js';
import { App } from './App.js';

// The full contract shape, empty. Mirrors .planning/campaign/DATA-CONTRACT.md.
const EMPTY_STATE = {
  project: { name: '', user: { name: '', email: '' } },
  progress: { completed: 0, inProgress: 0, notStarted: 0, total: 0, pct: 0 },
  currentPhase: { name: '', status: '', milestones: [] },
  timeline: { launchDate: '', onTrack: true, points: [] },
  tasks: { completed: [], inProgress: [] },
  blockers: [],
  health: { pct: 0, label: '', points: [] },
  decisions: [],
  phases: [],
};

function mount(state) {
  const root = document.getElementById('rd-root');
  if (root) render(html`<${App} state=${state} />`, root);
}

(async () => {
  try {
    const res = await fetch('/api/state', { headers: { Accept: 'application/json' } });
    mount(res.ok ? await res.json() : EMPTY_STATE);
  } catch {
    mount(EMPTY_STATE);
  }
})();
