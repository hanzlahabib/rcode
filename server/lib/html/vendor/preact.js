/**
 * Vendored Preact + hooks + htm — LOCAL ESM, no runtime network fetch.
 *
 * This is the single dependency surface for the redesigned dashboard. Every
 * component imports from this file so the vendored bundles below are the only
 * place real versions live. The raw bundles were fetched once at build time
 * from the npm dist builds and committed under server/lib/html/vendor/:
 *
 *   preact.module.js   preact 10.24.3   (dist/preact.module.js)
 *   hooks.module.js    preact 10.24.3   (hooks/dist/hooks.module.js)
 *                      — its bare `from "preact"` was rewritten to the relative
 *                        ./preact.module.js so it resolves with no import map.
 *   htm.module.js      htm 3.1.1        (dist/htm.module.js)
 *
 * To bump versions: re-fetch the dist builds, repeat the hooks import rewrite,
 * and update the pins above. Nothing else imports a CDN URL.
 */

import { h, render, Fragment } from './preact.module.js';
import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  useReducer,
} from './hooks.module.js';
import htmLib from './htm.module.js';

// htm bound to Preact's h — use as a tagged template literal: html`<div>...</div>`
export const html = htmLib.bind(h);

export { h, render, Fragment };
export {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  useReducer,
};
