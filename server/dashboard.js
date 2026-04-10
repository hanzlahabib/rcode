#!/usr/bin/env node
/**
 * Majlis — Rihal Method Dashboard Server
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
const PORT = 7717;
const RIHAL_DIR = process.env.RIHAL_DIR || path.join(process.cwd(), '.rihal');

// ---------- State scanner ----------
function safeReadJson(filepath) {
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
  } catch {
    return null;
  }
}

function safeReadText(filepath) {
  try {
    return fs.readFileSync(filepath, 'utf8');
  } catch {
    return null;
  }
}

function listDir(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

function scanState() {
  const state = {
    exists: fs.existsSync(RIHAL_DIR),
    project: null,
    phases: [],
    decisions: [],
    progress: [],
    artifacts: [],
    context: null,
    lastScanned: new Date().toISOString(),
  };

  if (!state.exists) return state;

  // Project state
  state.project = safeReadJson(path.join(RIHAL_DIR, 'state.json'));

  // Active context
  state.context = safeReadText(path.join(RIHAL_DIR, 'context', 'active.md'));

  // Phases
  const phasesDir = path.join(RIHAL_DIR, 'phases');
  for (const entry of listDir(phasesDir)) {
    if (!entry.isDirectory()) continue;
    const phaseDir = path.join(phasesDir, entry.name);
    const phase = {
      id: entry.name,
      brief: safeReadText(path.join(phaseDir, 'brief.md')),
      sprints: safeReadText(path.join(phaseDir, 'sprints.md')),
      stories: listDir(path.join(phaseDir, 'stories')).filter(e => e.isFile()).map(e => e.name),
      tasks: listDir(path.join(phaseDir, 'tasks')).filter(e => e.isFile()).map(e => e.name),
    };
    state.phases.push(phase);
  }

  // Decisions (ADRs)
  for (const entry of listDir(path.join(RIHAL_DIR, 'decisions'))) {
    if (entry.isFile() && entry.name.endsWith('.md')) {
      state.decisions.push({
        name: entry.name,
        content: safeReadText(path.join(RIHAL_DIR, 'decisions', entry.name)),
      });
    }
  }

  // Progress (latest 10)
  const progressFiles = listDir(path.join(RIHAL_DIR, 'progress'))
    .filter(e => e.isFile() && e.name.endsWith('.md'))
    .sort((a, b) => b.name.localeCompare(a.name))
    .slice(0, 10);
  for (const entry of progressFiles) {
    state.progress.push({
      name: entry.name,
      content: safeReadText(path.join(RIHAL_DIR, 'progress', entry.name)),
    });
  }

  // Artifacts
  function walkArtifacts(dir, prefix = '') {
    for (const entry of listDir(dir)) {
      const full = path.join(dir, entry.name);
      const rel = path.join(prefix, entry.name);
      if (entry.isDirectory()) {
        walkArtifacts(full, rel);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        state.artifacts.push({
          path: rel,
          content: safeReadText(full),
        });
      }
    }
  }
  walkArtifacts(path.join(RIHAL_DIR, 'artifacts'));

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
  const projectName = state.project?.project_name || 'No project initialized';
  const currentPhase = state.project?.current_phase || '—';
  const activeAgents = state.project?.active_agents || [];
  const phaseCount = state.phases.length;
  const decisionCount = state.decisions.length;
  const artifactCount = state.artifacts.length;

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
      <div class="sub">${phaseCount} total phases</div>
    </div>
    <div class="stat">
      <div class="label">Active Agents</div>
      <div class="value">${activeAgents.length}</div>
      <div class="sub">${activeAgents.join(', ') || '—'}</div>
    </div>
    <div class="stat">
      <div class="label">Decisions (ADRs)</div>
      <div class="value">${decisionCount}</div>
      <div class="sub">Architecture records</div>
    </div>
    <div class="stat">
      <div class="label">Artifacts</div>
      <div class="value">${artifactCount}</div>
      <div class="sub">Plans, reviews, research</div>
    </div>
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
      ${state.phases.length === 0 ? '<div class="empty">No phases yet. Run *kickoff.</div>' : `
        <div class="phase-list">
          ${state.phases.map(p => `
            <div class="item">
              <div class="item-title">${p.id}</div>
              <div class="item-meta">
                <span class="tag">${p.stories.length} stories</span>
                <span class="tag">${p.tasks.length} tasks</span>
              </div>
              ${p.brief ? `<div class="item-preview">${mdToHtml(p.brief.slice(0, 500))}</div>` : ''}
            </div>
          `).join('')}
        </div>
      `}
    </div>
  </section>

  <section>
    <h2>⚖️ Decisions (ADRs)</h2>
    <div class="body">
      ${state.decisions.length === 0 ? '<div class="empty">No decisions recorded yet.</div>' : `
        <div class="decision-list">
          ${state.decisions.map(d => `
            <div class="item">
              <div class="item-title">${d.name}</div>
              <div class="item-preview">${mdToHtml((d.content || '').slice(0, 400))}</div>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  </section>

  <section>
    <h2>📈 Progress Log</h2>
    <div class="body">
      ${state.progress.length === 0 ? '<div class="empty">No progress entries yet.</div>' : `
        <div class="progress-list">
          ${state.progress.map(p => `
            <div class="item">
              <div class="item-title">${p.name}</div>
              <div class="item-preview">${mdToHtml((p.content || '').slice(0, 400))}</div>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  </section>

  <section>
    <h2>📎 Artifacts</h2>
    <div class="body">
      ${state.artifacts.length === 0 ? '<div class="empty">No artifacts yet.</div>' : `
        <div class="phase-list">
          ${state.artifacts.map(a => `
            <div class="item">
              <div class="item-title">${a.path}</div>
              <div class="item-preview">${mdToHtml((a.content || '').slice(0, 300))}</div>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  </section>
`}

</main>

<footer>
  <div class="arabic">رحلة البناء · The Journey of Building</div>
  <div>Rihal Method · View-Only Dashboard · Read from files, no database.</div>
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
  console.log(`\n🕌 Majlis (مجلس) — Rihal Method Dashboard`);
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
