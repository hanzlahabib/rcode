/**
 * ESM entry point — mounts the Preact App into #app-root.
 *
 * Loaded via <script type="module" src="/js/app.js"> from client.js,
 * AFTER the legacy <script src> modules (which fill the 10 un-migrated
 * view host divs). Legacy modules remain active during coexistence phase.
 */

import { render, html } from './preact.js';
import { App } from './components/App.js';

const root = document.getElementById('app-root');
if (root) {
  render(html`<${App}/>`, root);
}
