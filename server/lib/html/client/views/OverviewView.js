/**
 * OverviewView — Preact component (dashboard redesign).
 *
 * Retargeted onto the mockup: a 12-col, 3-row card grid that composes the nine
 * dashboard slot components. The components are empty placeholders for now —
 * other agents fill each one with real content. Layout follows
 * .planning/campaign/MOCKUP-SPEC.md:
 *   Row 1: ProgressDonut · CurrentPhase · Timeline
 *   Row 2: CompletedTasks · InProgress · Blockers
 *   Row 3: RecentDecisions · ProgressTimeline
 *
 * State is read via useStore() and flows down to the slot components as they
 * are filled in; none of them fetch (see DATA-CONTRACT.md).
 *
 * First run: when the server scanned and found no .rcode directory
 * (store.initialized === false) the card grid is replaced by an honest
 * get-started state pointing at /rcode-init — no fabricated dashboard.
 */

import { html } from '../preact.js';
import { useStore } from '../store.js';
import { ProgressDonut } from '../components/dashboard/ProgressDonut.js';
import { CurrentPhase } from '../components/dashboard/CurrentPhase.js';
import { Timeline } from '../components/dashboard/Timeline.js';
import { CompletedTasks } from '../components/dashboard/CompletedTasks.js';
import { InProgress } from '../components/dashboard/InProgress.js';
import { Blockers } from '../components/dashboard/Blockers.js';
import { RecentDecisions } from '../components/dashboard/RecentDecisions.js';
import { ProgressTimeline } from '../components/dashboard/ProgressTimeline.js';

export function OverviewView() {
  // Subscribe to the store so this view re-renders on state changes; the slot
  // components will read their slices from it as they are built out.
  const S = useStore();

  if (S.initialized === false) {
    return html`
      <div id="view-overview" class="view active">
        <div class="firstrun">
          <div class="firstrun-badge" aria-hidden="true">r</div>
          <h2 class="firstrun-title">No project initialized</h2>
          <p class="firstrun-sub">
            This directory has no <code>.rcode</code> project yet, so there is
            no data to show. Initialize one to start tracking phases, sprints,
            and decisions.
          </p>
          <code class="firstrun-cmd">/rcode-init</code>
        </div>
      </div>
    `;
  }

  return html`
    <div id="view-overview" class="view active">
      <div class="dash-grid">
        <div class="col-4"><${ProgressDonut}/></div>
        <div class="col-4"><${CurrentPhase}/></div>
        <div class="col-4"><${Timeline}/></div>

        <div class="col-4"><${CompletedTasks}/></div>
        <div class="col-4"><${InProgress}/></div>
        <div class="col-4"><${Blockers}/></div>

        <div class="col-6"><${RecentDecisions}/></div>
        <div class="col-6"><${ProgressTimeline}/></div>
      </div>
    </div>
  `;
}
