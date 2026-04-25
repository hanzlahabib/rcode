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
const PROJECT_ROOT = path.dirname(RIHAL_DIR);

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
    raw: null,
    phases: [],
    decisions: [],
    blockers: [],
    councilSessions: 0,
    milestone: null,
    currentPhase: null,
    currentSprint: null,
    planningFiles: [],
    context: null,
    lastScanned: new Date().toISOString(),
  };

  if (!state.exists) return state;

  state.raw = safeReadJson(path.join(RIHAL_DIR, 'state.json'));

  const cfg = parseSimpleYaml(safeReadText(path.join(RIHAL_DIR, 'config.yaml')));

  state.projectName = state.raw?.project_name
    || cfg.project_name
    || state.raw?.project
    || 'Unknown project';

  state.currentPhase   = state.raw?.current_phase  || null;
  state.currentSprint  = state.raw?.current_sprint || null;
  state.milestone      = state.raw?.milestone       || null;
  state.councilSessions = (state.raw?.council_sessions || []).length;

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

  if (Array.isArray(state.raw?.decisions)) {
    state.decisions = state.raw.decisions;
  }

  if (Array.isArray(state.raw?.blockers)) {
    state.blockers = state.raw.blockers.filter(b => b && (typeof b === 'string' || b.title));
  }

  state.context = safeReadText(path.join(RIHAL_DIR, 'context', 'active.md'))
    || safeReadText(path.join(projectDir, '.planning', 'CONTEXT.md'));

  const planningDir = path.join(projectDir, '.planning');
  function walkPlanning(dir, prefix) {
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
  if (fs.existsSync(planningDir)) walkPlanning(planningDir, '');

  return state;
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

  const agents = [
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
  ];

  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Majlis — ${projectName}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<style>
  :root {
    --rihal-blue: #1e3a8a;
    --rihal-gold: #f59e0b;
    /* Colors */
    --bg:              #0a0a0b;
    --bg-card:         #111113;
    --bg-hover:        #1a1a1e;
    --border:          #1e1e24;
    --text-primary:    #f0f0f2;
    --text-secondary:  #a0a0aa;
    --text-muted:      #606068;
    --accent-blue:     #3b82f6;
    --accent-green:    #10b981;
    --accent-amber:    #f59e0b;
    --accent-red:      #ef4444;
    /* Typography */
    --text-xs:   11px;
    --text-sm:   13px;
    --text-base: 15px;
    --text-lg:   18px;
    --text-xl:   24px;
    /* Spacing (4px base grid) */
    --space-1:  4px;
    --space-2:  8px;
    --space-3: 12px;
    --space-4: 16px;
    --space-5: 20px;
    --space-6: 24px;
    --space-7: 28px;
    --space-8: 32px;
    /* Radius */
    --radius-sm:  4px;
    --radius-md:  8px;
    --radius-lg: 12px;
    /* Shadow */
    --shadow-card: 0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px var(--border);
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Inter', -apple-system, 'Segoe UI', sans-serif;
    background: var(--bg);
    color: var(--text-primary);
    line-height: 1.6;
  }
  .app-shell { display: flex; height: 100vh; overflow: hidden; }
  .sidebar {
    width: 240px;
    min-width: 240px;
    background: var(--bg-card);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    padding: var(--space-4) 0;
  }
  .sidebar-project {
    padding: var(--space-3) var(--space-4);
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--text-primary);
    border-bottom: 1px solid var(--border);
    margin-bottom: var(--space-3);
  }
  .sidebar-project .project-label {
    font-size: var(--text-xs);
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.07em;
    margin-bottom: var(--space-1);
  }
  .nav-link {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    font-size: var(--text-sm);
    color: var(--text-secondary);
    cursor: pointer;
    border-radius: 0;
    border: none;
    background: none;
    width: 100%;
    text-align: left;
    transition: background 0.15s, color 0.15s;
    user-select: none;
  }
  .nav-link:hover  { background: var(--bg-hover); color: var(--text-primary); }
  .nav-link.active { background: var(--bg-hover); color: var(--text-primary); font-weight: 600; }
  .content-area { flex: 1; overflow-y: auto; background: var(--bg); display: flex; flex-direction: column; }
  .view { display: none; padding: var(--space-8); }
  .view.active { display: block; }
  header {
    background: var(--bg-card);
    border-bottom: 1px solid var(--border);
    padding: var(--space-4) var(--space-8);
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
  }
  .brand { display: flex; align-items: center; gap: var(--space-4); }
  .brand .icon { font-size: 40px; }
  .brand h1 { font-size: var(--text-xl); font-weight: 700; color: var(--text-primary); }
  .brand .arabic { color: var(--rihal-gold); font-size: var(--text-lg); margin-top: 2px; }
  .header-meta {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-sm);
    color: var(--text-secondary);
  }
  .live {
    display: inline-block;
    width: 8px;
    height: 8px;
    background: var(--accent-green);
    border-radius: 50%;
    animation: pulse 2s infinite;
  }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
  #refresh-btn {
    background: var(--bg-hover);
    border: 1px solid var(--border);
    color: var(--text-primary);
    padding: var(--space-1) var(--space-3);
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: var(--text-sm);
    transition: background 0.15s;
    font-family: inherit;
  }
  #refresh-btn:hover { background: var(--border); }
  #blocker-banner {
    background: rgba(239,68,68,0.12);
    border-bottom: 1px solid rgba(239,68,68,0.4);
    padding: var(--space-3) var(--space-8);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    color: var(--accent-red);
    font-size: var(--text-sm);
  }
  #blocker-banner .banner-title { font-weight: 600; }
  #blocker-banner .banner-list  { flex: 1; color: var(--text-secondary); font-size: var(--text-xs); margin-left: var(--space-3); }
  #blocker-banner .banner-dismiss {
    background: none; border: 1px solid rgba(239,68,68,0.4); color: var(--accent-red);
    padding: 2px 10px; border-radius: var(--radius-sm); cursor: pointer; font-size: var(--text-xs);
    font-family: inherit;
  }
  #blocker-banner .banner-dismiss:hover { background: rgba(239,68,68,0.2); }
  .stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--space-4);
    margin-bottom: var(--space-8);
  }
  .stat {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-left: 4px solid var(--rihal-gold);
    padding: var(--space-5) var(--space-6);
    border-radius: var(--radius-md);
  }
  .stat .label {
    color: var(--text-muted);
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: var(--space-2);
  }
  .stat .value { font-size: 28px; font-weight: 700; color: var(--text-primary); }
  .stat .sub { color: var(--text-muted); font-size: var(--text-sm); margin-top: var(--space-1); }
  section {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    margin-bottom: var(--space-6);
    overflow: hidden;
  }
  section > h2 {
    background: rgba(245,158,11,0.08);
    padding: var(--space-4) var(--space-6);
    font-size: var(--text-sm);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--rihal-gold);
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    gap: 10px;
  }
  section .body { padding: var(--space-6); }
  .agents {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: var(--space-3);
  }
  .agent-card {
    background: rgba(59,130,246,0.05);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: var(--space-4);
    transition: transform 0.2s;
  }
  .agent-card:hover { transform: translateY(-2px); border-color: var(--rihal-gold); }
  .agent-card .name { font-weight: 600; font-size: var(--text-base); margin-bottom: var(--space-1); }
  .agent-card .arabic { color: var(--rihal-gold); font-size: 14px; }
  .agent-card .role { color: var(--text-muted); font-size: var(--text-xs); margin-top: var(--space-2); }
  .agent-card.active { background: rgba(16,185,129,0.1); border-color: var(--accent-green); }
  .real-badge {
    display: inline-block;
    background: rgba(16,185,129,0.2);
    color: var(--accent-green);
    padding: 1px 6px;
    border-radius: 8px;
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    vertical-align: middle;
    margin-left: 4px;
  }
  .phase-list, .decision-list, .progress-list { display: flex; flex-direction: column; gap: var(--space-3); }
  .item {
    background: rgba(255,255,255,0.02);
    border: 1px solid var(--border);
    border-left: 3px solid var(--accent-blue);
    padding: var(--space-4) var(--space-5);
    border-radius: var(--radius-sm);
  }
  .item .item-title { font-weight: 600; margin-bottom: var(--space-2); color: var(--text-primary); }
  .item .item-meta { color: var(--text-muted); font-size: var(--text-xs); margin-bottom: var(--space-2); }
  .item .item-preview {
    color: #cbd5e1;
    font-size: var(--text-sm);
    max-height: 120px;
    overflow: hidden;
    position: relative;
  }
  .item .item-preview::after {
    content: '';
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 40px;
    background: linear-gradient(transparent, var(--bg-card));
  }
  .empty { color: var(--text-muted); text-align: center; padding: var(--space-8); font-style: italic; }
  .tag {
    display: inline-block;
    background: rgba(245,158,11,0.15);
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
    padding: var(--space-8);
    color: var(--text-muted);
    font-size: var(--text-sm);
    border-top: 1px solid var(--border);
    margin-top: 48px;
  }
  footer .arabic { color: var(--rihal-gold); font-size: 16px; margin-bottom: var(--space-2); }
  code {
    background: rgba(255,255,255,0.05);
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    font-size: var(--text-sm);
    font-family: "SF Mono", Monaco, Consolas, monospace;
  }
  h1, h2, h3 { line-height: 1.3; }
  p { margin-bottom: 10px; }
  ul { margin-left: 20px; margin-bottom: 10px; }
  .status-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: 99px;
    font-size: var(--text-xs);
    font-weight: 500;
    letter-spacing: 0.04em;
    text-transform: lowercase;
  }
  .status-chip.complete     { background: rgba(16,185,129,0.15);  color: var(--accent-green); }
  .status-chip.active,
  .status-chip.in_progress  { background: rgba(59,130,246,0.15);  color: var(--accent-blue);  }
  .status-chip.blocked      { background: rgba(239,68,68,0.15);   color: var(--accent-red);   }
  .status-chip.planned,
  .status-chip.todo,
  .status-chip.other        { background: rgba(96,96,104,0.2);    color: var(--text-muted);   }
  .file-tree { font-size: var(--text-xs); }
  .file-tree-group { margin-bottom: var(--space-3); }
  .file-tree-group summary {
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.07em;
    font-size: 10px;
    padding: var(--space-1) var(--space-2);
    cursor: pointer;
    list-style: none;
  }
  .file-tree-item {
    display: block;
    padding: 3px var(--space-3);
    color: var(--text-secondary);
    cursor: pointer;
    border-radius: var(--radius-sm);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: 'SF Mono', Monaco, Consolas, monospace;
  }
  .file-tree-item:hover { color: var(--text-primary); background: var(--bg-hover); }
  .file-tree-item.selected { color: var(--accent-blue); background: rgba(59,130,246,0.1); }
  .md-render {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: var(--space-8);
    max-width: 860px;
    line-height: 1.7;
    color: var(--text-primary);
  }
  .md-render h1, .md-render h2, .md-render h3 { margin: var(--space-6) 0 var(--space-3); }
  .md-render code { background: var(--bg-hover); padding: 2px 6px; border-radius: var(--radius-sm); font-size: var(--text-sm); }
  .md-render pre  { background: var(--bg-hover); padding: var(--space-4); border-radius: var(--radius-md); overflow-x: auto; }
  .md-render a    { color: var(--accent-blue); }
  .md-render ul, .md-render ol { margin-left: var(--space-6); margin-bottom: var(--space-3); }
  .filter-bar { margin-bottom: var(--space-6); }
  .filter-input {
    width: 100%;
    max-width: 360px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-size: var(--text-sm);
    padding: var(--space-2) var(--space-3);
    outline: none;
    font-family: inherit;
  }
  .filter-input:focus { border-color: var(--accent-blue); }
  .filter-input::placeholder { color: var(--text-muted); }
  .view-title {
    font-size: var(--text-lg);
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: var(--space-6);
  }
</style>
</head>
<body>
<div class="app-shell">
  <aside class="sidebar">
    <div class="sidebar-project">
      <div class="project-label">Project</div>
      ${projectName}
    </div>
    <nav>
      <button class="nav-link active" data-view="overview">Overview</button>
      <button class="nav-link" data-view="files">Files</button>
      <button class="nav-link" data-view="phases">Phases</button>
      <button class="nav-link" data-view="agents">Agents</button>
      <button class="nav-link" data-view="decisions">Decisions</button>
    </nav>
    <div id="sidebar-file-tree" style="margin-top:var(--space-4);padding:0 var(--space-2);"></div>
  </aside>
  <div class="content-area" id="main-content">
    <header>
      <div class="brand">
        <div class="icon">🕌</div>
        <div>
          <h1>Majlis — The Council</h1>
          <div class="arabic">مجلس · ${projectName}</div>
        </div>
      </div>
      <div class="header-meta">
        <span class="live" id="live-dot"></span>
        <span id="updated-ago">just now</span>
        &nbsp;·&nbsp;
        <button id="refresh-btn" onclick="manualRefresh()">↺ Refresh</button>
      </div>
    </header>

    ${state.blockers.length > 0 ? `
    <div id="blocker-banner">
      <span class="banner-title">🚧 ${state.blockers.length} Blocker${state.blockers.length > 1 ? 's' : ''}</span>
      <span class="banner-list">${state.blockers.map(b => typeof b === 'string' ? b : (b.title || '')).join(' · ')}</span>
      <button class="banner-dismiss" onclick="sessionStorage.setItem('blockers-dismissed','1');document.getElementById('blocker-banner').style.display='none'">Dismiss</button>
    </div>` : ''}

    <div id="view-overview" class="view active">
      ${!state.exists ? `
        <div class="empty" style="padding:80px;background:var(--bg-card);border-radius:var(--radius-lg);">
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
            <div class="value" style="font-size:16px;padding-top:6px;" id="stat-milestone">${state.milestone || '—'}</div>
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
          <div class="stat" style="border-left-color:var(--accent-red);">
            <div class="label" style="color:var(--accent-red);">Blockers</div>
            <div class="value" style="color:var(--accent-red);">${state.blockers.length}</div>
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
            ${state.context
              ? `<div class="item-preview" style="max-height:none;">${state.context.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>`
              : `<div class="empty">No active context. Run context-build workflow.</div>`}
          </div>
        </section>
      `}
    </div>

    <div id="view-files" class="view">
      <div class="view-title">Files</div>
      <div id="file-view">
        <div style="color:var(--text-muted);padding:var(--space-8);">Select a file from the sidebar to preview it.</div>
      </div>
    </div>

    <div id="view-phases" class="view">
      <div class="view-title">Phases</div>
      <div class="filter-bar">
        <input class="filter-input" type="text" placeholder="Filter…" data-filter-target="phases-list">
      </div>
      <div id="phases-list">
        ${state.phases.length === 0 ? '<div class="empty">No phases in state.json yet.</div>' : `
          <div class="phase-list">
            ${state.phases.map(p => {
              const chipClass = ['complete'].includes(p.status) ? 'complete'
                : ['active','in_progress'].includes(p.status)   ? 'active'
                : p.status === 'blocked'                         ? 'blocked'
                : 'other';
              const pct = p.stories > 0 ? Math.round((p.storiesDone / p.stories) * 100) : 0;
              const isCurrent = p.id === state.currentPhase;
              const filterText = (p.name + ' ' + p.status + ' ' + (p.goal || '')).toLowerCase();
              return `
              <div class="item" style="${isCurrent ? 'border-left-color:var(--accent-amber);' : ''}" data-filter-text="${filterText}">
                <div class="item-title">
                  Phase ${p.id} — ${p.name}
                  ${isCurrent ? '<span class="tag" style="background:rgba(245,158,11,0.2);">current</span>' : ''}
                  <span class="status-chip ${chipClass}">● ${p.status}</span>
                </div>
                <div class="item-meta">
                  <span class="tag">${p.sprints} sprint${p.sprints !== 1 ? 's' : ''}</span>
                  <span class="tag">${p.stories} stories</span>
                  ${p.stories > 0 ? `<span class="tag">${pct}% done</span>` : ''}
                </div>
                ${p.goal ? `<div style="color:var(--text-secondary);font-size:var(--text-sm);margin-top:4px;">${p.goal}</div>` : ''}
              </div>`;
            }).join('')}
          </div>
        `}
      </div>
    </div>

    <div id="view-agents" class="view">
      <div class="view-title">Agents</div>
      <div class="filter-bar">
        <input class="filter-input" type="text" placeholder="Filter…" data-filter-target="agents-list">
      </div>
      <div id="agents-list">
        <div class="agents">
          ${agents.map(a => {
            const filterText = (a.name + ' ' + a.role + ' ' + a.arabic).toLowerCase();
            return `
            <div class="agent-card ${activeAgents.includes(a.name.split(' ')[0].toLowerCase()) ? 'active' : ''}" data-filter-text="${filterText}">
              <div class="name">${a.name}${a.real ? ' <span class="real-badge">real</span>' : ''}</div>
              <div class="arabic">${a.arabic}</div>
              <div class="role">${a.role}</div>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>

    <div id="view-decisions" class="view">
      <div class="view-title">Decisions (ADRs)</div>
      <div class="filter-bar">
        <input class="filter-input" type="text" placeholder="Filter…" data-filter-target="decisions-list">
      </div>
      <div id="decisions-list">
        ${state.decisions.length === 0
          ? '<div class="empty">No decisions recorded yet. Decisions made during /rihal:council and /rihal:discuss appear here.</div>'
          : `<div class="decision-list">
            ${state.decisions.map(d => {
              const filterText = (typeof d === 'string' ? d : (d.title || d.summary || d.decision || '')).toLowerCase();
              return `
              <div class="item" data-filter-text="${filterText}">
                <div class="item-title">${typeof d === 'string' ? d : (d.title || d.decision || JSON.stringify(d).slice(0, 80))}</div>
                ${d.rationale ? `<div style="color:var(--text-secondary);font-size:var(--text-sm);margin-top:4px;">${d.rationale}</div>` : ''}
              </div>`;
            }).join('')}
          </div>`}
      </div>
    </div>

    <footer>
      <div class="arabic">رحلة البناء · The Journey of Building</div>
      <div>Rihal Code · View-Only Dashboard · Read from files, no database.</div>
    </footer>
  </div>
</div>

<script>
// View switching
(function() {
  const links = document.querySelectorAll('.nav-link[data-view]');
  const views = document.querySelectorAll('.view');
  links.forEach(link => {
    link.addEventListener('click', () => {
      links.forEach(l => l.classList.remove('active'));
      views.forEach(v => v.classList.remove('active'));
      link.classList.add('active');
      const target = document.getElementById('view-' + link.dataset.view);
      if (target) target.classList.add('active');
    });
  });
})();

// File tree population
(async function() {
  let files = [];
  try {
    const r = await fetch('/api/files');
    files = await r.json();
  } catch { return; }

  const tree = document.getElementById('sidebar-file-tree');
  if (!tree) return;

  const groups = {};
  files.forEach(f => {
    const top = f.split('/')[0];
    if (!groups[top]) groups[top] = [];
    groups[top].push(f);
  });

  tree.innerHTML = '<div class="file-tree">' +
    Object.entries(groups).map(([grp, paths]) =>
      '<details class="file-tree-group" open>' +
        '<summary>' + grp + '</summary>' +
        paths.map(p => '<span class="file-tree-item" data-path="' + p + '">' + p.split('/').pop() + '</span>').join('') +
      '</details>'
    ).join('') +
  '</div>';

  tree.addEventListener('click', async (e) => {
    const item = e.target.closest('.file-tree-item');
    if (!item) return;
    tree.querySelectorAll('.file-tree-item').forEach(el => el.classList.remove('selected'));
    item.classList.add('selected');

    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const filesNav = document.querySelector('.nav-link[data-view="files"]');
    if (filesNav) filesNav.classList.add('active');
    const filesView = document.getElementById('view-files');
    if (filesView) filesView.classList.add('active');

    const fv = document.getElementById('file-view');
    fv.innerHTML = '<div style="color:var(--text-muted);padding:16px;">Loading…</div>';
    try {
      const resp = await fetch('/api/file?path=' + encodeURIComponent(item.dataset.path));
      if (!resp.ok) { fv.innerHTML = '<div style="color:var(--accent-red);padding:16px;">Failed to load file.</div>'; return; }
      const md = await resp.text();
      const html = (typeof marked !== 'undefined')
        ? marked.parse(md)
        : '<pre>' + md.replace(/</g,'&lt;') + '</pre>';
      fv.innerHTML = '<div class="md-render">' + html + '</div>';
    } catch {
      fv.innerHTML = '<div style="color:var(--accent-red);padding:16px;">Network error.</div>';
    }
  });
})();

// Refresh logic
let _lastScanned = ${JSON.stringify(state.lastScanned)};
let _scanTime = Date.now();

function renderUpdatedAgo() {
  const seconds = Math.floor((Date.now() - _scanTime) / 1000);
  const el = document.getElementById('updated-ago');
  if (!el) return;
  el.textContent = seconds < 5 ? 'just now'
    : seconds < 60 ? seconds + 's ago'
    : Math.floor(seconds / 60) + 'm ago';
}
setInterval(renderUpdatedAgo, 1000);

async function fetchAndRenderOverview() {
  const btn = document.getElementById('refresh-btn');
  if (btn) btn.textContent = '↺ …';
  try {
    const r = await fetch('/api/state');
    const s = await r.json();
    _lastScanned = s.lastScanned;
    _scanTime = Date.now();
    renderUpdatedAgo();
    const ms = document.getElementById('stat-milestone');
    if (ms && s.raw && s.raw.milestone) ms.textContent = s.raw.milestone;
  } catch { /* silent */ }
  if (btn) btn.textContent = '↺ Refresh';
}

setInterval(async () => {
  try {
    const r = await fetch('/api/state');
    const s = await r.json();
    if (s.lastScanned !== _lastScanned) fetchAndRenderOverview();
  } catch { /* silent */ }
}, 30000);

function manualRefresh() { fetchAndRenderOverview(); }

// Live filter
document.querySelectorAll('.filter-input').forEach(input => {
  input.addEventListener('input', () => {
    const q = input.value.toLowerCase().trim();
    const target = document.getElementById(input.dataset.filterTarget);
    if (!target) return;
    target.querySelectorAll('[data-filter-text]').forEach(card => {
      const match = !q || card.dataset.filterText.includes(q);
      card.style.display = match ? '' : 'none';
    });
  });
});

// Restore blocker banner dismiss state from sessionStorage
(function() {
  if (sessionStorage.getItem('blockers-dismissed') === '1') {
    const b = document.getElementById('blocker-banner');
    if (b) b.style.display = 'none';
  }
})();
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

  if (url === '/api/files') {
    const results = [];
    const roots = [
      { base: RIHAL_DIR,                            prefix: '.rihal' },
      { base: path.join(PROJECT_ROOT, '.planning'), prefix: '.planning' },
    ];
    function walkMd(dir, prefix, depth) {
      if (depth > 3) return;
      let entries;
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
      for (const e of entries) {
        if (e.name === 'node_modules') continue;
        const full = path.join(dir, e.name);
        const rel  = prefix + '/' + e.name;
        if (e.isDirectory()) walkMd(full, rel, depth + 1);
        else if (e.isFile() && e.name.endsWith('.md')) results.push(rel);
      }
    }
    for (const r of roots) walkMd(r.base, r.prefix, 0);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(results));
    return;
  }

  if (url.startsWith('/api/file')) {
    const params = new URLSearchParams(url.split('?')[1] || '');
    const relPath = params.get('path') || '';
    if (!relPath) {
      res.writeHead(400); res.end('Missing path parameter'); return;
    }
    // MANDATORY path traversal protection
    const resolved = path.resolve(PROJECT_ROOT, relPath.replace(/^\//, ''));
    if (!resolved.startsWith(PROJECT_ROOT + path.sep) && resolved !== PROJECT_ROOT) {
      res.writeHead(403); res.end('Forbidden'); return;
    }
    // Only serve .md files
    if (!resolved.endsWith('.md')) {
      res.writeHead(403); res.end('Forbidden: only .md files'); return;
    }
    let content;
    try { content = fs.readFileSync(resolved, 'utf8'); }
    catch { res.writeHead(404); res.end('File not found'); return; }
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(content);
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
  console.log(`   Refresh:    30s soft poll`);
  console.log(`   Stop:       kill $(lsof -t -i:${PORT})`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT',  () => server.close(() => process.exit(0)));
