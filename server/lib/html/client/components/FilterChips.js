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
 */

import { html } from '../preact.js';
import { applyFilters } from '../filter-state.js';

/** @returns {string} — current view path segment from location.hash */
function viewPath() {
  return location.hash.slice(1).split('?')[0] || 'overview';
}

/**
 * A single group of chips for one filter dimension.
 *
 * @param {{ label: string, dimension: string, options: Array<{value,label}>, active: string, filters: object }} props
 */
function ChipGroup({ dimension, options, active, filters }) {
  if (!options || options.length === 0) return null;

  function handleClick(value) {
    const next = Object.assign({}, filters, {
      [dimension]: active === value ? '' : value,
    });
    location.hash = applyFilters(viewPath(), next);
  }

  return html`
    <div class="filter-chip-group">
      ${options.map(opt => {
        const isActive = opt.value === active;
        return html`
          <button
            key=${opt.value}
            class=${'filter-chip' + (isActive ? ' active' : '')}
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
export function FilterChips({ filters, statusOptions, milestoneOptions, dateOptions }) {
  const f = filters || { status: '', milestone: '', date: '' };

  const hasActive = f.status !== '' || f.milestone !== '' || f.date !== '';

  function handleClear() {
    location.hash = applyFilters(viewPath(), { status: '', milestone: '', date: '' });
  }

  return html`
    <div class="filter-chips">
      <${ChipGroup}
        dimension="status"
        options=${statusOptions}
        active=${f.status}
        filters=${f}
      />
      <${ChipGroup}
        dimension="milestone"
        options=${milestoneOptions}
        active=${f.milestone}
        filters=${f}
      />
      <${ChipGroup}
        dimension="date"
        options=${dateOptions}
        active=${f.date}
        filters=${f}
      />
      <button
        class="filter-chip-clear"
        disabled=${!hasActive}
        onClick=${hasActive ? handleClear : undefined}
      >Clear</button>
    </div>
  `;
}
