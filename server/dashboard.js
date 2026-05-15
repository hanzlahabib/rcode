#!/usr/bin/env node
/**
 * Majlis — Rihal Code Dashboard Server
 *
 * View-only Node server that scans .rihal/ directory and renders
 * a live HTML dashboard showing project state, phases, progress,
 * decisions, and artifacts.
 *
 * VIEW-ONLY by design. No CRUD. No database. Source of truth is files.
 *
 * Architecture:
 *   server/dashboard.js          - HTTP server + routing (this file)
 *   server/lib/scanner.js        - State scanning from .rihal/
 *   server/lib/api.js            - API route handlers
 *   server/lib/html/shell.js     - HTML page composition
 *   server/lib/html/css.js       - All CSS styles
 *   server/lib/html/client.js    - Client-side JS (routing, rendering, etc.)
 *
 * Run: node server/dashboard.js
 * Stop: kill $(lsof -t -i:7717)
 */

const http    = require('http');
const path    = require('path');
const fs      = require('fs');
const crypto  = require('crypto');
const { spawn } = require('child_process');

// Client JS modules live here and are served verbatim at /js/<name>.js
const CLIENT_DIR = path.join(__dirname, 'lib', 'html', 'client');

const { scanState } = require('./lib/scanner');
const { handleApiState, handleApiFiles, handleApiFile, handleApiHierarchy, handleApiMemory } = require('./lib/api');
const { renderHtml } = require('./lib/html/shell');

// ---------- Configuration ----------
const PORT = parseInt(process.env.PORT || '7717', 10);
const RIHAL_DIR = process.env.RIHAL_DIR || path.join(process.cwd(), '.rihal');
const PROJECT_ROOT = path.dirname(RIHAL_DIR);

// Shared orchestrator token — generated once, passed to orchestrator via env and embedded in HTML
const ORCH_TOKEN = process.env.ORCH_TOKEN || crypto.randomBytes(24).toString('hex');

// ---------- HTTP Server ----------
const server = http.createServer((req, res) => {
  const url = req.url || '/';

  if (url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', mode: 'view-only', rihal_dir: RIHAL_DIR }));
    return;
  }

  if (url === '/api/state') {
    handleApiState(req, res, RIHAL_DIR);
    return;
  }

  if (url === '/api/files') {
    handleApiFiles(req, res, PROJECT_ROOT);
    return;
  }

  if (url.startsWith('/api/file')) {
    handleApiFile(req, res, PROJECT_ROOT);
    return;
  }

  if (url === '/api/hierarchy') {
    handleApiHierarchy(req, res, RIHAL_DIR);
    return;
  }

  if (url === '/api/memory') {
    handleApiMemory(req, res, RIHAL_DIR);
    return;
  }

  if (url.startsWith('/js/')) {
    const name = url.slice(4).split('?')[0];
    // Charset blocks path separators and traversal — only flat *.js names.
    if (!/^[\w.-]+\.js$/.test(name)) { res.writeHead(404); res.end('Not found'); return; }
    fs.readFile(path.join(CLIENT_DIR, name), (err, data) => {
      if (err) { res.writeHead(404); res.end('Not found'); return; }
      res.writeHead(200, {
        'Content-Type':  'application/javascript; charset=utf-8',
        'Cache-Control': 'no-cache',
      });
      res.end(data);
    });
    return;
  }

  if (url === '/' || url === '/index.html') {
    const state = scanState(RIHAL_DIR);
    const html = renderHtml(state, ORCH_TOKEN);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n🕌 Majlis (مجلس) — Rihal Code Dashboard`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`   Mode:       view-only`);
  console.log(`   URL:        http://localhost:${PORT}`);
  console.log(`   Scanning:   ${RIHAL_DIR}`);
  console.log(`   Refresh:    30s soft poll`);
  console.log(`   Keys:       R=refresh  1-9=views  F=filter`);
  console.log(`   Stop:       kill $(lsof -t -i:${PORT})`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
});

// ── Auto-spawn orchestrator (port 7718) ──────────────────────────
const ORCH_BIN = path.join(__dirname, 'orchestrator.js');
let _orchProc = null;

function spawnOrchestrator() {
  try {
    _orchProc = spawn(process.execPath, [ORCH_BIN], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, ORCH_TOKEN },
      stdio: 'pipe',
    });
    _orchProc.stdout.on('data', chunk => {
      const msg = chunk.toString().trim();
      if (msg) console.log('[orch]', msg);
    });
    _orchProc.stderr.on('data', chunk => {
      const msg = chunk.toString().trim();
      if (msg && !msg.includes('no stdin')) console.error('[orch]', msg);
    });
    _orchProc.on('exit', (code, signal) => {
      _orchProc = null;
      if (signal !== 'SIGTERM' && signal !== 'SIGINT') {
        console.log(`[orch] exited (${code}) — restarting in 3s…`);
        setTimeout(spawnOrchestrator, 3000);
      }
    });
    _orchProc.on('error', err => {
      console.error('[orch] spawn error:', err.message);
      _orchProc = null;
    });
    console.log('[orch] orchestrator started (port 7718)');
  } catch (err) {
    console.error('[orch] failed to start:', err.message);
  }
}

spawnOrchestrator();

// Graceful shutdown
function shutdown() {
  if (_orchProc) { try { _orchProc.kill('SIGTERM'); } catch {} }
  server.close(() => process.exit(0));
}
process.on('SIGTERM', shutdown);
process.on('SIGINT',  shutdown);
