/**
 * RunnerPicker — anchored popover for choosing which agent CLI + model a
 * Run button launches.
 *
 * One instance is mounted in App.js; every Run button opens it via
 * openRunnerPicker(anchorEl, run). State lives in store.runnerPicker:
 *   { open, x, y, run: { kind: 'session'|'command', storyId?, cmd, title? } }
 *
 * kind 'session' → runAndOpenTerm(storyId, cmd, title, { runner, model })
 * kind 'command' → runCommandFromUI(cmd, { runner, model })
 *
 * Runner list comes from GET /api/runners (fetchRunners, cached). Runners are
 * rendered as an option list (not a <select>) so each row can carry a "Beta"
 * pill (every CLI except claude) and unavailable ones can show their server-
 * reported reason ('not installed' / 'untested flags') as a disabled tooltip.
 * A runner with an empty models[] gets no model dropdown at all. The last
 * confirmed runner + model are remembered in localStorage and preselected.
 * Esc and click-outside close the popover. The server re-validates runner
 * and model on POST /api/run — this UI is convenience, not the boundary.
 *
 * Positioning uses CSS custom properties (--rp-x/--rp-y) set via the element
 * ref, never an inline style attribute; the popover clamps to the viewport.
 */

import { html, useState, useEffect, useRef } from '../preact.js';
import { useStore, setState } from '../store.js';
import { fetchRunners, runAndOpenTerm, runCommandFromUI } from '../orchestrator.js';

const PREF_KEY = 'majlis-runner-pref';

function loadPref() {
  try { return JSON.parse(localStorage.getItem(PREF_KEY)) || {}; } catch { return {}; }
}

function savePref(runner, model) {
  try { localStorage.setItem(PREF_KEY, JSON.stringify({ runner, model })); } catch { /* private mode */ }
}

/**
 * Open the picker anchored under anchorEl.
 * @param {Element} anchorEl — the clicked Run button
 * @param {{ kind: 'session'|'command', storyId?: string, cmd: string, title?: string }} run
 */
export function openRunnerPicker(anchorEl, run) {
  const r = anchorEl && anchorEl.getBoundingClientRect
    ? anchorEl.getBoundingClientRect()
    : { left: 24, bottom: 24 };
  setState({
    runnerPicker: { open: true, x: Math.round(r.left), y: Math.round(r.bottom + 6), run },
  });
}

export function closeRunnerPicker() {
  setState({ runnerPicker: null });
}

/** Preselect the remembered runner/model when valid, else claude, else the first installed CLI. */
function initialSelection(runners) {
  const pref  = loadPref();
  const valid = id => runners.some(r => r.id === id && r.available);
  const runnerId = valid(pref.runner) ? pref.runner
    : valid('claude') ? 'claude'
    : (runners.find(r => r.available) || {}).id || '';
  const entry = runners.find(r => r.id === runnerId);
  const model = (entry && pref.runner === runnerId && entry.models.includes(pref.model))
    ? pref.model : '';
  return { runnerId, model };
}

export function RunnerPicker() {
  const picker = useStore(s => s.runnerPicker);
  const open   = !!(picker && picker.open);

  const [runners,  setRunners ] = useState(null); // null = loading, [] = unreachable
  const [runnerId, setRunnerId] = useState('');
  const [model,    setModel   ] = useState('');
  const ref = useRef(null);

  // Load the runner list and (re)apply the remembered selection on each open.
  useEffect(() => {
    if (!open) return;
    let alive = true;
    fetchRunners().then(list => {
      if (!alive) return;
      setRunners(list);
      const sel = initialSelection(list);
      setRunnerId(sel.runnerId);
      setModel(sel.model);
    });
    return () => { alive = false; };
  }, [open]);

  // Esc / click-outside close. mousedown fires after the opening click's
  // event cycle, so the click that opened the picker never closes it.
  useEffect(() => {
    if (!open) return;
    function onKey(e)  { if (e.key === 'Escape') closeRunnerPicker(); }
    function onDown(e) {
      if (ref.current && !ref.current.contains(e.target)) closeRunnerPicker();
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open]);

  // Anchor below the Run button, clamped to the viewport. CSS vars (not an
  // inline style attribute) carry the coordinates into the stylesheet.
  useEffect(() => {
    if (!open || !ref.current) return;
    const el = ref.current;
    const x = Math.max(8, Math.min(picker.x, window.innerWidth  - el.offsetWidth  - 8));
    const y = Math.max(8, Math.min(picker.y, window.innerHeight - el.offsetHeight - 8));
    el.style.setProperty('--rp-x', x + 'px');
    el.style.setProperty('--rp-y', y + 'px');
  }, [open, picker, runners]);

  if (!open) return null;

  const entry  = (runners || []).find(r => r.id === runnerId) || null;
  const models = (entry && entry.models) || [];

  function handleRunnerSelect(id) {
    setRunnerId(id);
    setModel(''); // model lists differ per runner — reset to CLI default
  }

  function handleRun() {
    const run = picker.run || {};
    savePref(runnerId, model);
    closeRunnerPicker();
    const opts = { runner: runnerId, model };
    if (run.kind === 'command') {
      runCommandFromUI(run.cmd, opts);
    } else {
      runAndOpenTerm(run.storyId, run.cmd, run.title || run.storyId, opts);
    }
  }

  return html`
    <div class="runner-picker" ref=${ref} role="dialog" aria-label="Choose runner and model"
      onClick=${e => e.stopPropagation()}>
      <div class="runner-picker-title">
        Run ${(picker.run && picker.run.title) || ''}
      </div>
      ${runners === null ? html`
        <div class="runner-picker-hint">Detecting installed CLIs…</div>
      ` : runners.length === 0 ? html`
        <div class="runner-picker-hint">Orchestrator unreachable — cannot list runners.</div>
      ` : html`
        <div class="runner-picker-field">
          <span class="runner-picker-label" id="runner-picker-cli-label">Agent CLI</span>
          <div class="runner-picker-list" role="listbox" aria-labelledby="runner-picker-cli-label">
            ${runners.map(r => html`
              <button key=${r.id} type="button" role="option"
                aria-selected=${r.id === runnerId}
                class=${'runner-picker-option' + (r.id === runnerId ? ' selected' : '')}
                disabled=${!r.available}
                title=${r.available ? r.label : (r.reason || 'not installed')}
                onClick=${() => handleRunnerSelect(r.id)}>
                <span class="runner-picker-option-label">${r.label}</span>
                ${r.beta ? html`<span class="runner-beta-pill">Beta</span>` : null}
                ${!r.available ? html`
                  <span class="runner-picker-option-hint">${r.reason || 'not installed'}</span>
                ` : null}
              </button>
            `)}
          </div>
        </div>
        ${models.length ? html`
          <label class="runner-picker-field">
            <span class="runner-picker-label">Model</span>
            <select class="runner-picker-select" value=${model}
              onChange=${e => setModel(e.target.value)}>
              <option value="">default</option>
              ${models.map(m => html`<option key=${m} value=${m}>${m}</option>`)}
            </select>
          </label>
        ` : null}
      `}
      <div class="runner-picker-actions">
        <button class="runner-picker-btn" onClick=${closeRunnerPicker}>Cancel</button>
        <button class="runner-picker-btn runner-picker-btn--run"
          disabled=${!runnerId} onClick=${handleRun}>▶ Run</button>
      </div>
    </div>
  `;
}
