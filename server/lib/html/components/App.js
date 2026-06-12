/**
 * App — Preact root shell for the redesigned Majlis dashboard.
 *
 * Composes the layout only: left Sidebar + header + the 3-row, 12-col card
 * grid. Each grid cell mounts one placeholder component (its own file under
 * this directory). Those components are empty slots today — other agents drop
 * real content into them.
 *
 * App is pure: it receives the full GET /api/state object as `state` and
 * hands each component its slice as props. Nothing here fetches. The exact
 * shape of `state` is defined in .planning/campaign/DATA-CONTRACT.md.
 */

import { html } from '../vendor/preact.js';
import { Sidebar } from './Sidebar.js';
import { ProgressDonut } from './ProgressDonut.js';
import { CurrentPhase } from './CurrentPhase.js';
import { Timeline } from './Timeline.js';
import { CompletedTasks } from './CompletedTasks.js';
import { InProgress } from './InProgress.js';
import { Blockers } from './Blockers.js';
import { ProjectHealth } from './ProjectHealth.js';
import { RecentDecisions } from './RecentDecisions.js';
import { ProgressTimeline } from './ProgressTimeline.js';

export function App({ state }) {
  const s = state || {};
  const project = s.project || {};
  const user = project.user || {};
  const name = user.name || 'there';

  return html`
    <div class="rd-root">
      <div class="rd-shell">
        <${Sidebar} project=${project} health=${s.health} />

        <main class="rd-main">
          <header class="rd-header">
            <div>
              <h1 class="rd-header-title">Welcome back, ${name}!</h1>
              <p class="rd-header-sub">Here's where your project stands today.</p>
            </div>
            <div class="rd-header-actions">
              <button class="rd-btn rd-btn-primary" type="button">Ask rcode</button>
              <button class="rd-btn" type="button">Share</button>
              <button class="rd-btn rd-btn-icon" type="button" aria-label="More">⋯</button>
              <span class="rd-status"><span class="rd-dot"></span>Auto-synced 2m ago</span>
            </div>
          </header>

          <div class="rd-grid">
            <div class="rd-col-4"><${ProgressDonut} progress=${s.progress} /></div>
            <div class="rd-col-4"><${CurrentPhase} currentPhase=${s.currentPhase} /></div>
            <div class="rd-col-4"><${Timeline} timeline=${s.timeline} /></div>

            <div class="rd-col-4"><${CompletedTasks} tasks=${s.tasks} /></div>
            <div class="rd-col-4"><${InProgress} tasks=${s.tasks} /></div>
            <div class="rd-col-4"><${Blockers} blockers=${s.blockers} /></div>

            <div class="rd-col-6"><${RecentDecisions} decisions=${s.decisions} /></div>
            <div class="rd-col-6"><${ProgressTimeline} phases=${s.phases} /></div>
          </div>
        </main>
      </div>
    </div>
  `;
}
