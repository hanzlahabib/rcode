/**
 * FileReader — shared markdown reader used by FilesView and MemoryView.
 *
 * Renders as a right-side slide-over (backdrop + panel) so it works on top
 * of any list layout. Fetches /api/file?path=... itself whenever `path`
 * changes, so callers only manage which file is open. Markdown renders via
 * the global `marked` CDN lib with the same sanitizer the legacy Files view
 * used; falls back to escaped <pre> when marked is unavailable.
 *
 * Props:
 *   path    — project-relative file path to fetch (required; null hides)
 *   title   — display name shown in the header (falls back to basename)
 *   onClose — called when the user dismisses the reader (backdrop, ×, Esc)
 */

import { html, useState, useEffect, useCallback } from '../preact.js';
import { showToast } from './shared.js';

// ---- Markdown helpers (moved from FilesView so both views share one copy) ----
function stripFrontmatter(md) {
  if (!md.startsWith('---')) return md;
  const end = md.indexOf('\n---', 3);
  return end === -1 ? md : md.slice(end + 4).trimStart();
}

// Minimal HTML sanitizer for rendered markdown. No DOMPurify dependency on the
// client, so we strip the dangerous primitives via regex after marked emits
// HTML: script/iframe/object/embed tags, inline event handlers, and
// javascript:/data: URLs in href/src. Markdown content comes from the project
// dir (semi-trusted) but may include attacker-controlled text checked into a
// repo, so we cannot trust raw HTML passthrough.
function sanitizeHtml(raw) {
  return String(raw)
    .replace(/<\s*(script|iframe|object|embed|link|meta|style)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|iframe|object|embed|link|meta|style)\b[^>]*\/?>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src|xlink:href)\s*=\s*(["'])\s*(?:javascript|data|vbscript):[^"']*\2/gi, '$1=$2#blocked$2');
}

export function renderMd(md) {
  const clean = stripFrontmatter(md);
  if (typeof marked === 'undefined') {
    return '<pre>' + clean.replace(/</g, '&lt;') + '</pre>';
  }
  return sanitizeHtml(marked.parse(clean));
}

export function FileReader({ path, title, onClose }) {
  const [content, setContent] = useState({ html: null, loading: true, error: null });

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    setContent({ html: null, loading: true, error: null });
    fetch('/api/file?path=' + encodeURIComponent(path))
      .then(async resp => {
        if (cancelled) return;
        if (!resp.ok) {
          const msg = resp.status === 404
            ? 'File not found: ' + path
            : 'Failed to load file (HTTP ' + resp.status + ').';
          setContent({ html: null, loading: false, error: msg });
          return;
        }
        const text = await resp.text();
        if (!cancelled) setContent({ html: renderMd(text), loading: false, error: null });
      })
      .catch(() => {
        if (!cancelled) setContent({ html: null, loading: false, error: 'Network error.' });
      });
    return () => { cancelled = true; };
  }, [path]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape' && onClose) onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const copyPath = useCallback(() => {
    navigator.clipboard.writeText(path).then(() => {
      showToast('Path copied!');
    }).catch(() => {});
  }, [path]);

  if (!path) return null;
  const name = title || path.split('/').pop();

  return html`
    <div class="reader-backdrop" onClick=${onClose}></div>
    <div class="reader-panel" role="dialog" aria-label=${name}>
      <div class="reader-header">
        <div class="reader-heading">
          <div class="reader-title">${name}</div>
          <div class="reader-path">${path}</div>
        </div>
        <div class="reader-actions">
          <button class="reader-copy" onClick=${copyPath}>Copy path</button>
          <button class="reader-close" aria-label="Close reader" onClick=${onClose}>×</button>
        </div>
      </div>
      <div class="reader-body">
        ${content.loading && html`
          <div class="skeleton reader-skel-line"></div>
          <div class="skeleton reader-skel-block"></div>
        `}
        ${content.error && html`<div class="reader-error">${content.error}</div>`}
        ${!content.loading && !content.error && content.html != null && html`
          <div class="md-render" dangerouslySetInnerHTML=${{ __html: content.html }} />
        `}
      </div>
    </div>
  `;
}
