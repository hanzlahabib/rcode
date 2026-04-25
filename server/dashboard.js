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
 * Run: node server/dashboard.js
 * Stop: kill $(lsof -t -i:7717)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// ---------- Configuration ----------
const PORT = parseInt(process.env.PORT || '7717', 10);
const RIHAL_DIR = process.env.RIHAL_DIR || path.join(process.cwd(), '.rihal');

// ---------- State scanner ----------
function safeReadJson(filepath) {
  let raw;
  try { raw = fs.readFileSync(filepath, 'utf8'); } catch { return null; }
  try { return JSON.parse(raw); } catch (err) {
    console.warn(`[dashboard] malformed JSON at ${filepath}: ${err.message}`);
    return null;
  }
}

function safeReadText(filepath) {
  try { return fs.readFileSync(filepath, 'utf8'); } catch { return null; }
}

function listDir(dir) {
  try { return fs.readdirSync(dir, { withFileTypes: true }); } catch { return []; }
}

// Parse simple YAML key: value (handles nested with tabs)
function parseSimpleYaml(text) {
  if (!text) return {};
  const out = {};
  for (const line of text.split('\n')) {
    const m = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.+)/);
    if (m) out[m[1].trim()] = m[2].trim();
  }
  return out;
}

function scanState() {
  const projectDir = path.dirname(RIHAL_DIR);
  const state = {
    exists: fs.existsSync(RIHAL_DIR),
    projectName: null,
    raw: null,         // full state.json
    phases: [],        // from state.json.phases
    decisions: [],     // from state.json.decisions
    blockers: [],      // from state.json.blockers
    councilSessions: 0,
    milestone: null,
    currentPhase: null,
    currentSprint: null,
    planningFiles: [], // .planning/ MD artifacts
    context: null,
    lastScanned: new Date().toISOString(),
  };

  if (!state.exists) return state;

  // Read state.json (primary data source)
  state.raw = safeReadJson(path.join(RIHAL_DIR, 'state.json'));

  // Read config.yaml for project_name fallback
  const cfg = parseSimpleYaml(safeReadText(path.join(RIHAL_DIR, 'config.yaml')));

  // Resolve project name: state.json uses "project" field; config.yaml uses "project_name"
  state.projectName = state.raw?.project_name
    || cfg.project_name
    || state.raw?.project
    || 'Unknown project';

  state.currentPhase   = state.raw?.current_phase  || null;
  state.currentSprint  = state.raw?.current_sprint || null;
  state.milestone      = state.raw?.milestone       || null;
  state.councilSessions = (state.raw?.council_sessions || []).length;

  // Phases — from state.json.phases array
  if (Array.isArray(state.raw?.phases)) {
    state.phases = state.raw.phases.map(p => {
      const sprints   = Array.isArray(p.sprints) ? p.sprints : [];
      const allStories = sprints.flatMap(s => Array.isArray(s.stories) ? s.stories : []);
      const done   = allStories.filter(s => s.status === 'done' || s.status === 'completed').length;
      const total  = allStories.length;
      return {
        id:     p.id,
        name:   p.name || p.slug || p.id,
        status: p.status || (sprints[0]?.status) || 'planned',
        sprints: sprints.length,
        stories: total,
        storiesDone: done,
        goal: sprints[0]?.goal || null,
      };
    });
  }

  // Decisions — from state.json.decisions array
  if (Array.isArray(state.raw?.decisions)) {
    state.decisions = state.raw.decisions;
  }

  // Blockers — from state.json.blockers array
  if (Array.isArray(state.raw?.blockers)) {
    state.blockers = state.raw.blockers.filter(b => b && (typeof b === 'string' || b.title));
  }

  // Active context — check a few common locations
  state.context = safeReadText(path.join(RIHAL_DIR, 'context', 'active.md'))
    || safeReadText(path.join(projectDir, '.planning', 'CONTEXT.md'));

  // .planning/ artifacts (SPRINT.md, VERIFICATION.md, SUMMARY.md, RESEARCH.md)
  const planningDir = path.join(projectDir, '.planning');
  function walkPlanning(dir, prefix = '') {
    for (const entry of listDir(dir)) {
      const full = path.join(dir, entry.name);
      const rel  = path.join(prefix, entry.name);
      if (entry.isDirectory()) {
        walkPlanning(full, rel);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        state.planningFiles.push({ path: rel, name: entry.name });
      }
    }
  }
  if (fs.existsSync(planningDir)) walkPlanning(planningDir);

  return state;
}

// ---------- Simple markdown → HTML ----------
function mdToHtml(md) {
  if (!md) return '';
  return md
    .replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<)/gm, '<p>')
    .replace(/<p><\/p>/g, '');
}

// ---------- HTML Renderer ----------
function renderHtml(state) {
  const projectName   = state.projectName || 'No project initialized';
  const currentPhase  = state.currentPhase || '—';
  const currentSprint = state.currentSprint || null;
  const phaseCount    = state.phases.length;
  const decisionCount = state.decisions.length;
  const artifactCount = state.planningFiles.length;
  const activeAgents  = [];

  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Majlis — ${projectName}</title>
<style>
  :root {
    --rihal-blue: #1e3a8a;
    --rihal-gold: #f59e0b;
    --bg: #0a0e1a;
    --card: #131828;
    --border: #1f2937;
    --text: #e5e7eb;
    --muted: #9ca3af;
    --accent: #3b82f6;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, "Segoe UI", "Inter", sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.6;
  }
  header {
    background: linear-gradient(135deg, var(--rihal-blue), #312e81);
    border-bottom: 3px solid var(--rihal-gold);
    padding: 24px 32px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 16px;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .brand .icon {
    font-size: 40px;
  }
  .brand h1 {
    font-size: 24px;
    font-weight: 700;
  }
  .brand .arabic {
    color: var(--rihal-gold);
    font-size: 18px;
    margin-top: 2px;
  }
  .header-meta {
    text-align: right;
    color: #cbd5e1;
    font-size: 13px;
  }
  .header-meta .live {
    display: inline-block;
    width: 8px;
    height: 8px;
    background: #10b981;
    border-radius: 50%;
    margin-right: 6px;
    animation: pulse 2s infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
  main {
    max-width: 1400px;
    margin: 0 auto;
    padding: 32px;
  }
  .stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-bottom: 32px;
  }
  .stat {
    background: var(--card);
    border: 1px solid var(--border);
    border-left: 4px solid var(--rihal-gold);
    padding: 20px 24px;
    border-radius: 8px;
  }
  .stat .label {
    color: var(--muted);
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 8px;
  }
  .stat .value {
    font-size: 28px;
    font-weight: 700;
    color: var(--text);
  }
  .stat .sub {
    color: var(--muted);
    font-size: 13px;
    margin-top: 4px;
  }
  section {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 12px;
    margin-bottom: 24px;
    overflow: hidden;
  }
  section > h2 {
    background: rgba(245, 158, 11, 0.08);
    padding: 16px 24px;
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--rihal-gold);
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    gap: 10px;
  }
  section .body {
    padding: 24px;
  }
  .agents {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 12px;
  }
  .agent-card {
    background: rgba(59, 130, 246, 0.05);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 16px;
    transition: transform 0.2s;
  }
  .agent-card:hover {
    transform: translateY(-2px);
    border-color: var(--rihal-gold);
  }
  .agent-card .name {
    font-weight: 600;
    font-size: 15px;
    margin-bottom: 4px;
  }
  .agent-card .arabic {
    color: var(--rihal-gold);
    font-size: 14px;
  }
  .agent-card .role {
    color: var(--muted);
    font-size: 12px;
    margin-top: 6px;
  }
  .agent-card.active {
    background: rgba(16, 185, 129, 0.1);
    border-color: #10b981;
  }
  .real-badge {
    display: inline-block;
    background: rgba(16, 185, 129, 0.2);
    color: #10b981;
    padding: 1px 6px;
    border-radius: 8px;
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    vertical-align: middle;
    margin-left: 4px;
  }
  .phase-list, .decision-list, .progress-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .item {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid var(--border);
    border-left: 3px solid var(--accent);
    padding: 16px 20px;
    border-radius: 6px;
  }
  .item .item-title {
    font-weight: 600;
    margin-bottom: 6px;
    color: var(--text);
  }
  .item .item-meta {
    color: var(--muted);
    font-size: 12px;
    margin-bottom: 8px;
  }
  .item .item-preview {
    color: #cbd5e1;
    font-size: 13px;
    max-height: 120px;
    overflow: hidden;
    position: relative;
  }
  .item .item-preview::after {
    content: '';
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 40px;
    background: linear-gradient(transparent, var(--card));
  }
  .empty {
    color: var(--muted);
    text-align: center;
    padding: 32px;
    font-style: italic;
  }
  .tag {
    display: inline-block;
    background: rgba(245, 158, 11, 0.15);
    color: var(--rihal-gold);
    padding: 2px 10px;
    border-radius: 12px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-right: 6px;
  }
  footer {
    text-align: center;
    padding: 32px;
    color: var(--muted);
    font-size: 13px;
    border-top: 1px solid var(--border);
    margin-top: 48px;
  }
  footer .arabic {
    color: var(--rihal-gold);
    font-size: 16px;
    margin-bottom: 8px;
  }
  code {
    background: rgba(255, 255, 255, 0.05);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 13px;
    font-family: "SF Mono", Monaco, Consolas, monospace;
  }
  h1, h2, h3 { line-height: 1.3; }
  p { margin-bottom: 10px; }
  ul { margin-left: 20px; margin-bottom: 10px; }
</style>
</head>
<body>

<header>
  <div class="brand">
    <div class="icon">🕌</div>
    <div>
      <h1>Majlis — The Council</h1>
      <div class="arabic">مجلس · ${projectName}</div>
    </div>
  </div>
  <div class="header-meta">
    <div><span class="live"></span>Live · Auto-refresh 5s</div>
    <div>Last scanned: ${new Date(state.lastScanned).toLocaleTimeString()}</div>
    <div>Source: <code>${RIHAL_DIR.replace(process.env.HOME || '', '~')}</code></div>
  </div>
</header>

<main>

${!state.exists ? `
  <div class="empty" style="padding:80px;background:var(--card);border-radius:12px;">
    <h2 style="color:var(--rihal-gold);margin-bottom:16px;">No .rihal/ directory found</h2>
    <p>Run the <code>*kickoff</code> workflow to initialize a project.</p>
  </div>
` : `

  <div class="stats">
    <div class="stat">
      <div class="label">Current Phase</div>
      <div class="value">${currentPhase}</div>
      <div class="sub">${phaseCount} total phases${currentSprint ? ` · Sprint ${currentSprint}` : ''}</div>
    </div>
    <div class="stat">
      <div class="label">Milestone</div>
      <div class="value" style="font-size:16px;padding-top:6px;">${state.milestone || '—'}</div>
      <div class="sub">&nbsp;</div>
    </div>
    <div class="stat">
      <div class="label">Decisions (ADRs)</div>
      <div class="value">${decisionCount}</div>
      <div class="sub">Architecture records</div>
    </div>
    <div class="stat">
      <div class="label">Planning Files</div>
      <div class="value">${artifactCount}</div>
      <div class="sub">SPRINT, CONTEXT, VERIFY, RESEARCH</div>
    </div>
    ${state.blockers.length > 0 ? `
    <div class="stat" style="border-left-color:#ef4444;">
      <div class="label" style="color:#ef4444;">Blockers</div>
      <div class="value" style="color:#ef4444;">${state.blockers.length}</div>
      <div class="sub">Active blockers</div>
    </div>` : ''}
    ${state.councilSessions > 0 ? `
    <div class="stat">
      <div class="label">Council Sessions</div>
      <div class="value">${state.councilSessions}</div>
      <div class="sub">Recorded sessions</div>
    </div>` : ''}
  </div>

  <section>
    <h2>🎯 Active Context</h2>
    <div class="body">
      ${state.context ? `<div class="item-preview" style="max-height:none;">${mdToHtml(state.context)}</div>` : `<div class="empty">No active context. Run context-build workflow.</div>`}
    </div>
  </section>

  <section>
    <h2>👥 Team Roster</h2>
    <div class="body">
      <div class="agents">
        ${[
          { name: 'Sadiq Damani', arabic: 'صادق', role: 'Director of Strategy', real: true },
          { name: 'Waleed Al Harthi', arabic: 'وليد', role: 'CTO', real: true },
          { name: 'Ahmed Al Hassani', arabic: 'أحمد الحسني', role: 'Technology & Development Director', real: true },
          { name: 'Nasser', arabic: 'ناصر', role: 'Engineering Manager', real: true },
          { name: 'Hussain', arabic: 'حسين', role: 'PM + Scrum Master' },
          { name: 'Layla', arabic: 'ليلى', role: 'Lead UX Designer' },
          { name: 'Zahra', arabic: 'زهرة', role: 'Branding & Creative Director' },
          { name: 'Omar', arabic: 'عمر', role: 'Full-Stack Engineer' },
          { name: 'Haitham Al Khamiyasi', arabic: 'هيثم', role: 'Senior Frontend', real: true },
          { name: 'Yousef', arabic: 'يوسف', role: 'Senior Backend' },
          { name: 'Zayd', arabic: 'زيد', role: 'ML Engineer' },
          { name: 'Fatima', arabic: 'فاطمة', role: 'QA Lead' },
          { name: 'Khalid', arabic: 'خالد', role: 'DevOps' },
          { name: 'Noor', arabic: 'نور', role: 'Scribe' },
          { name: 'Mariam', arabic: 'مريم', role: 'Marketing Lead' },
          { name: 'Raees', arabic: 'رئيس', role: 'Orchestration Director' },
          { name: 'Majlis', arabic: 'مجلس', role: 'Consulting Council' },
          { name: 'Diwan', arabic: 'ديوان', role: 'Dashboard Registry' },
        ].map(a => `
          <div class="agent-card ${activeAgents.includes(a.name.split(' ')[0].toLowerCase()) ? 'active' : ''}">
            <div class="name">${a.name}${a.real ? ' <span class="real-badge">real</span>' : ''}</div>
            <div class="arabic">${a.arabic}</div>
            <div class="role">${a.role}</div>
          </div>
        `).join('')}
      </div>
    </div>
  </section>

  <section>
    <h2>📂 Phases</h2>
    <div class="body">
      ${state.phases.length === 0 ? '<div class="empty">No phases in state.json yet.</div>' : `
        <div class="phase-list">
          ${state.phases.map(p => {
            const statusColor = p.status === 'completed' ? '#10b981' : p.status === 'in_progress' ? '#f59e0b' : '#6b7280';
            const pct = p.stories > 0 ? Math.round((p.storiesDone / p.stories) * 100) : 0;
            const isCurrent = p.id === state.currentPhase;
            return `
            <div class="item" style="${isCurrent ? 'border-left-color:#f59e0b;' : ''}">
              <div class="item-title">
                Phase ${p.id} — ${p.name}
                ${isCurrent ? '<span class="tag" style="background:rgba(245,158,11,0.2);">current</span>' : ''}
                <span style="color:${statusColor};font-size:12px;margin-left:8px;">● ${p.status}</span>
              </div>
              <div class="item-meta">
                <span class="tag">${p.sprints} sprint${p.sprints !== 1 ? 's' : ''}</span>
                <span class="tag">${p.stories} stories</span>
                ${p.stories > 0 ? `<span class="tag">${pct}% done</span>` : ''}
              </div>
              ${p.goal ? `<div style="color:#94a3b8;font-size:13px;margin-top:4px;">${p.goal}</div>` : ''}
            </div>`;
          }).join('')}
        </div>
      `}
    </div>
  </section>

  ${state.blockers.length > 0 ? `
  <section>
    <h2 style="color:#ef4444;">🚧 Blockers</h2>
    <div class="body">
      <div class="phase-list">
        ${state.blockers.map(b => `
          <div class="item" style="border-left-color:#ef4444;">
            <div class="item-title">${typeof b === 'string' ? b : (b.title || JSON.stringify(b))}</div>
            ${b.description ? `<div style="color:#94a3b8;font-size:13px;">${b.description}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  </section>` : ''}

  <section>
    <h2>⚖️ Decisions (ADRs)</h2>
    <div class="body">
      ${state.decisions.length === 0 ? '<div class="empty">No decisions recorded yet. Decisions made during /rihal:council and /rihal:discuss appear here.</div>' : `
        <div class="decision-list">
          ${state.decisions.map(d => `
            <div class="item">
              <div class="item-title">${typeof d === 'string' ? d : (d.title || d.decision || JSON.stringify(d).slice(0, 80))}</div>
              ${d.rationale ? `<div style="color:#94a3b8;font-size:13px;margin-top:4px;">${d.rationale}</div>` : ''}
            </div>
          `).join('')}
        </div>
      `}
    </div>
  </section>

  <section>
    <h2>📎 Planning Files</h2>
    <div class="body">
      ${state.planningFiles.length === 0 ? '<div class="empty">No .planning/ files yet.</div>' : `
        <div style="display:flex;flex-wrap:wrap;gap:8px;">
          ${state.planningFiles.map(a => `
            <span style="background:rgba(59,130,246,0.1);border:1px solid #1f2937;padding:4px 10px;border-radius:6px;font-size:12px;font-family:monospace;color:#93c5fd;">${a.path}</span>
          `).join('')}
        </div>
      `}
    </div>
  </section>
`}

</main>

<footer>
  <div class="arabic">رحلة البناء · The Journey of Building</div>
  <div>Rihal Code · View-Only Dashboard · Read from files, no database.</div>
</footer>

<script>
  // Auto-refresh every 5 seconds
  setTimeout(() => location.reload(), 5000);
</script>

</body>
</html>`;
}

// ---------- HTTP Server ----------
const server = http.createServer((req, res) => {
  const url = req.url || '/';

  if (url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', mode: 'view-only', rihal_dir: RIHAL_DIR }));
    return;
  }

  if (url === '/api/state') {
    const state = scanState();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(state, null, 2));
    return;
  }

  if (url === '/' || url === '/index.html') {
    const state = scanState();
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
  console.log(`   Refresh:    5s (client-side)`);
  console.log(`   Stop:       kill $(lsof -t -i:${PORT})`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));
