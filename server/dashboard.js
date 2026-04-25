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

const http = require('http');
const path = require('path');

const { scanState } = require('./lib/scanner');
const { handleApiState, handleApiFiles, handleApiFile, handleApiHierarchy } = require('./lib/api');
const { renderHtml } = require('./lib/html/shell');

// ---------- Configuration ----------
const PORT = parseInt(process.env.PORT || '7717', 10);
const RIHAL_DIR = process.env.RIHAL_DIR || path.join(process.cwd(), '.rihal');
const PROJECT_ROOT = path.dirname(RIHAL_DIR);

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

  if (url === '/' || url === '/index.html') {
    const state = scanState(RIHAL_DIR);
    const html = renderHtml(state);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
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

// Graceful shutdown
process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT',  () => server.close(() => process.exit(0)));
