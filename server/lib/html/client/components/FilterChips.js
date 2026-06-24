/**
 * FilterChips — interactive filter chip component.
 *
 * Renders three groups of toggle chips (status / milestone / date).
 * Clicking a chip writes the updated filter set into location.hash via
 * applyFilters() from filter-state.js. The App.js hashchange listener then
 * re-renders the active view with the new filters prop.
 *
 * Props:
 *   filters        — route filter object { status, milestone, date }
 *   statusOptions  — Array<{ value, label }>
 *   milestoneOptions — Array<{ value, label }>
 *   dateOptions    — Array<{ value, label }>
 *   viewPath       — current view path segment (e.g. 'phases'). Passed by the
 *                    owning view, which already has the routing context. Falls
 *                    back to reading location.hash when omitted.
 */

import { html } from '../preact.js';
import { applyFilters } from '../filter-state.js';

/** @returns {string} — current view path segment from location.hash */
function viewPathFromHash() {
  return location.hash.slice(1).split('?')[0] || 'overview';
}

/**
 * A single group of chips for one filter dimension.
 *
 * @param {{ dimension: string, options: Array<{value,label}>, active: string, filters: object, path: string }} props
 */
function ChipGroup({ dimension, options, active, filters, path }) {
  if (!options || options.length === 0) return null;

  function handleClick(value) {
    const next = Object.assign({}, filters, {
      [dimension]: active === value ? '' : value,
    });
    location.hash = applyFilters(path, next);
  }

  return html`
    <div class="filter-chip-group">
      ${options.map(opt => {
        const isActive = opt.value === active;
        return html`
          <button
            key=${opt.value}
            class=${'filter-chip' + (isActive ? ' active' : '')}
            aria-pressed=${isActive}
            onClick=${() => handleClick(opt.value)}
          >${opt.label}</button>
        `;
      })}
    </div>
  `;
}

/**
 * FilterChips — interactive filter chip row with a clear button.
 */
export function FilterChips({ filters, statusOptions, milestoneOptions, dateOptions, viewPath }) {
  const f = filters || { status: '', milestone: '', date: '' };
  const path = viewPath || viewPathFromHash();

  const hasActive = f.status !== '' || f.milestone !== '' || f.date !== '';

  function handleClear() {
    location.hash = applyFilters(path, { status: '', milestone: '', date: '' });
  }

  return html`
    <div class="filter-chips">
      <${ChipGroup}
        dimension="status"
        options=${statusOptions}
        active=${f.status}
        filters=${f}
        path=${path}
      />
      <${ChipGroup}
        dimension="milestone"
        options=${milestoneOptions}
        active=${f.milestone}
        filters=${f}
        path=${path}
      />
      <${ChipGroup}
        dimension="date"
        options=${dateOptions}
        active=${f.date}
        filters=${f}
        path=${path}
      />
      <button
        class="filter-chip-clear"
        disabled=${!hasActive}
        onClick=${hasActive ? handleClear : undefined}
      >Clear</button>
    </div>
  `;
}
