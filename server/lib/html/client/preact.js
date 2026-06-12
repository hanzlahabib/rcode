/**
 * Preact + htm ESM runtime — single dependency surface.
 *
 * Vendored locally under vendor/ so the dashboard works offline /
 * air-gapped / on CI screens with no internet (no esm.sh dependency).
 * Every other client module imports from this file so version bumps
 * happen in one place: replace the vendor/ files and update the pins.
 *
 * Pinned vendored versions:
 *   preact  10.24.3  (vendor/preact.js, vendor/preact-hooks.js)
 *   htm      3.1.1   (vendor/htm.js)
 *
 * vendor/preact-hooks.js has its bare `from "preact"` import rewritten
 * to `from "./preact.js"` so it resolves without an import map.
 */

import { h, render, Fragment } from './vendor/preact.js';
import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  useReducer,
} from './vendor/preact-hooks.js';
import htmLib from './vendor/htm.js';

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
