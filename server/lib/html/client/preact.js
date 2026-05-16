/**
 * Preact + htm ESM runtime — single dependency surface.
 *
 * All esm.sh version pins live here. Every other client module imports
 * from this file so version bumps happen in one place.
 *
 * Pinned versions (current stable as of 2026-05):
 *   preact  10.24.3
 *   htm      3.1.1
 */

import { h, render, Fragment, memo, createContext } from 'https://esm.sh/preact@10.24.3';
import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  useReducer,
  useContext,
} from 'https://esm.sh/preact@10.24.3/hooks';
import htmLib from 'https://esm.sh/htm@3.1.1';

// htm bound to Preact's h — use as a tagged template literal: html`<div>...</div>`
export const html = htmLib.bind(h);

export { h, render, Fragment, memo };
export {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  useReducer,
  useContext,
  createContext,
};
