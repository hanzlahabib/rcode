/**
 * FilterChips — toggleable status / milestone / date filter chips.
 *
 * Receives the current `filters` object and three option arrays from the
 * parent view. On chip click it writes the new filter set into
 * `location.hash` via `applyFilters()` from filter-state.js; the
 * `hashchange` listener in App.js re-renders the tree.
 *
 * Props:
 *   filters        — { status, milestone, date }  (the active filter set)
 *   statusOptions  — [{ value, label }, …]
 *   milestoneOptions — [{ value, label }, …]
 *   dateOptions    — [{ value, label }, …]
 */

import { html } from '../preact.js';
import { applyFilters } from '../filter-state.js';

/**
 * Return the current view path from the hash (everything before `?`).
 * Falls back to 'overview' when the hash is empty.
 */
function currentPath() {
  return location.hash.slice(1).split('?')[0] || 'overview';
}

/**
 * Build the next filters object for a click on a chip in `dimension`.
 * Clicking an already-active chip clears that dimension (toggle off).
 */
function toggle(filters, dimension, value) {
  return Object.assign({}, filters, {
    [dimension]: filters[dimension] === value ? '' : value,
  });
}

export function FilterChips({ filters, statusOptions, milestoneOptions, dateOptions }) {
  const f = filters || { status: '', milestone: '', date: '' };
  const hasActive = f.status !== '' || f.milestone !== '' || f.date !== '';

  function handleChip(dimension, value) {
    const next = toggle(f, dimension, value);
    location.hash = applyFilters(currentPath(), next);
  }

  function handleClear() {
    location.hash = applyFilters(currentPath(), { status: '', milestone: '', date: '' });
  }

  const groups = [
    { dimension: 'status',    options: statusOptions    || [] },
    { dimension: 'milestone', options: milestoneOptions || [] },
    { dimension: 'date',      options: dateOptions      || [] },
  ];

  return html`
    <div class="filter-chips">
      ${groups.map(({ dimension, options }) =>
        options.length === 0 ? null : html`
          <div class="filter-chip-group">
            ${options.map(({ value, label }) => html`
              <button
                class=${f[dimension] === value ? 'filter-chip active' : 'filter-chip'}
                onClick=${() => handleChip(dimension, value)}
              >${label}</button>
            `)}
          </div>
        `
      )}
      <button
        class="filter-chip-clear"
        disabled=${!hasActive}
        onClick=${handleClear}
      >Clear</button>
    </div>
  `;
}
