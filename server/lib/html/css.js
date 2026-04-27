/**
 * Dashboard CSS — all styles in one module.
 * Supports dark mode (default) and light mode via data-theme="light".
 */
function renderCss() {
  return `<style>
  :root {
    --rihal-blue: #1e3a8a;
    --rihal-gold: #f59e0b;
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
    --text-xs:   11px;
    --text-sm:   13px;
    --text-base: 15px;
    --text-lg:   18px;
    --text-xl:   24px;
    --space-1:  4px;
    --space-2:  8px;
    --space-3: 12px;
    --space-4: 16px;
    --space-5: 20px;
    --space-6: 24px;
    --space-7: 28px;
    --space-8: 32px;
    --radius-sm:  4px;
    --radius-md:  8px;
    --radius-lg: 12px;
    --shadow-card: 0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px var(--border);
  }
  /* #313 Light mode */
  [data-theme="light"] {
    --bg:              #f8f9fa;
    --bg-card:         #ffffff;
    --bg-hover:        #f0f1f3;
    --border:          #e2e4e8;
    --text-primary:    #1a1a1a;
    --text-secondary:  #555;
    --text-muted:      #888;
    --shadow-card: 0 1px 3px rgba(0,0,0,0.08), 0 0 0 1px var(--border);
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Inter', -apple-system, 'Segoe UI', sans-serif;
    background: var(--bg);
    color: var(--text-primary);
    line-height: 1.6;
  }
  .app-shell { display: flex; height: 100vh; overflow: hidden; }
  /* Sidebar */
  .sidebar {
    width: 240px; min-width: 240px;
    background: var(--bg-card);
    border-right: 1px solid var(--border);
    display: flex; flex-direction: column;
    overflow-y: auto; padding: var(--space-4) 0;
  }
  .sidebar-project {
    padding: var(--space-3) var(--space-4);
    font-size: var(--text-sm); font-weight: 600;
    color: var(--text-primary);
    border-bottom: 1px solid var(--border);
    margin-bottom: var(--space-3);
  }
  .sidebar-project .project-label {
    font-size: var(--text-xs); color: var(--text-muted);
    text-transform: uppercase; letter-spacing: 0.07em;
    margin-bottom: var(--space-1);
  }
  .nav-link {
    display: flex; align-items: center; gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    font-size: var(--text-sm); color: var(--text-secondary);
    cursor: pointer; border-radius: 0; border: none; background: none;
    width: 100%; text-align: left;
    transition: background 0.15s, color 0.15s; user-select: none;
  }
  .nav-link:hover  { background: var(--bg-hover); color: var(--text-primary); }
  .nav-link.active { background: var(--bg-hover); color: var(--text-primary); font-weight: 600; }
  .nav-section {
    padding: var(--space-3) var(--space-4) var(--space-1);
    font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em;
    color: var(--text-muted); font-weight: 600;
  }
  /* Content */
  .content-area { flex: 1; overflow-y: auto; background: var(--bg); display: flex; flex-direction: column; }
  .view { display: none; padding: var(--space-8); }
  .view.active { display: block; }
  /* Header */
  header {
    background: var(--bg-card); border-bottom: 1px solid var(--border);
    padding: var(--space-4) var(--space-8);
    display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;
  }
  .brand { display: flex; align-items: center; gap: var(--space-4); }
  .brand .icon { font-size: 40px; }
  .brand h1 { font-size: var(--text-xl); font-weight: 700; }
  .brand .arabic { color: var(--rihal-gold); font-size: var(--text-lg); margin-top: 2px; }
  .header-meta { display: flex; align-items: center; gap: var(--space-2); font-size: var(--text-sm); color: var(--text-secondary); }
  .header-actions { display: flex; align-items: center; gap: var(--space-2); }
  .live { display: inline-block; width: 8px; height: 8px; background: var(--accent-green); border-radius: 50%; animation: pulse 2s infinite; }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
  .header-btn {
    background: var(--bg-hover); border: 1px solid var(--border); color: var(--text-primary);
    padding: var(--space-1) var(--space-3); border-radius: var(--radius-sm);
    cursor: pointer; font-size: var(--text-sm); transition: background 0.15s; font-family: inherit;
  }
  .header-btn:hover { background: var(--border); }
  /* Blocker banner */
  #blocker-banner {
    background: rgba(239,68,68,0.12); border-bottom: 1px solid rgba(239,68,68,0.4);
    padding: var(--space-3) var(--space-8); display: flex;
    align-items: center; justify-content: space-between; gap: var(--space-4);
    color: var(--accent-red); font-size: var(--text-sm);
  }
  #blocker-banner .banner-title { font-weight: 600; }
  #blocker-banner .banner-list  { flex: 1; color: var(--text-secondary); font-size: var(--text-xs); margin-left: var(--space-3); }
  #blocker-banner .banner-dismiss {
    background: none; border: 1px solid rgba(239,68,68,0.4); color: var(--accent-red);
    padding: 2px 10px; border-radius: var(--radius-sm); cursor: pointer; font-size: var(--text-xs); font-family: inherit;
  }
  #blocker-banner .banner-dismiss:hover { background: rgba(239,68,68,0.2); }
  /* #322 Warning banner for parse errors */
  #parse-warning {
    background: rgba(245,158,11,0.12); border-bottom: 1px solid rgba(245,158,11,0.4);
    padding: var(--space-3) var(--space-8); display: flex;
    align-items: center; gap: var(--space-4);
    color: var(--accent-amber); font-size: var(--text-sm);
  }
  /* Stats grid */
  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-4); margin-bottom: var(--space-8); }
  .stat {
    background: var(--bg-card); border: 1px solid var(--border); border-left: 4px solid var(--rihal-gold);
    padding: var(--space-5) var(--space-6); border-radius: var(--radius-md);
  }
  .stat .label { color: var(--text-muted); font-size: var(--text-xs); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: var(--space-2); }
  .stat .value { font-size: 28px; font-weight: 700; }
  .stat .sub { color: var(--text-muted); font-size: var(--text-sm); margin-top: var(--space-1); }
  /* Sections */
  section { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); margin-bottom: var(--space-6); overflow: hidden; }
  section > h2 {
    background: rgba(245,158,11,0.08); padding: var(--space-4) var(--space-6);
    font-size: var(--text-sm); text-transform: uppercase; letter-spacing: 0.1em;
    color: var(--rihal-gold); border-bottom: 1px solid var(--border);
    display: flex; align-items: center; gap: 10px;
  }
  section .body { padding: var(--space-6); }
  /* Agent cards */
  .agents { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: var(--space-3); }
  .agent-card {
    background: rgba(59,130,246,0.05); border: 1px solid var(--border);
    border-radius: var(--radius-md); padding: var(--space-4); transition: transform 0.2s;
  }
  .agent-card:hover { transform: translateY(-2px); border-color: var(--rihal-gold); }
  .agent-card .name { font-weight: 600; font-size: var(--text-base); margin-bottom: var(--space-1); }
  .agent-card .arabic { color: var(--rihal-gold); font-size: 14px; }
  .agent-card .role { color: var(--text-muted); font-size: var(--text-xs); margin-top: var(--space-2); }
  .agent-card.active { background: rgba(16,185,129,0.1); border-color: var(--accent-green); }
  .real-badge {
    display: inline-block; background: rgba(16,185,129,0.2); color: var(--accent-green);
    padding: 1px 6px; border-radius: 8px; font-size: 9px;
    text-transform: uppercase; letter-spacing: 0.05em; vertical-align: middle; margin-left: 4px;
  }
  /* #304 Agent type badge */
  .type-badge {
    display: inline-block; background: rgba(59,130,246,0.15); color: var(--accent-blue);
    padding: 1px 6px; border-radius: 8px; font-size: 9px;
    text-transform: uppercase; letter-spacing: 0.05em; vertical-align: middle; margin-left: 4px;
  }
  /* Items */
  .phase-list, .decision-list, .progress-list { display: flex; flex-direction: column; gap: var(--space-3); }
  .item {
    background: rgba(255,255,255,0.02); border: 1px solid var(--border);
    border-left: 3px solid var(--accent-blue); padding: var(--space-4) var(--space-5);
    border-radius: var(--radius-sm);
  }
  .item .item-title { font-weight: 600; margin-bottom: var(--space-2); }
  .item .item-meta { color: var(--text-muted); font-size: var(--text-xs); margin-bottom: var(--space-2); }
  .item-clickable { cursor: pointer; }
  .item-clickable:hover { background: var(--bg-hover); border-color: var(--accent-blue); }

  /* Task expandable detail */
  .task-expand-icon {
    float: right; font-size: 10px; color: var(--text-muted);
    transition: transform 0.2s ease;
  }
  .task-detail {
    margin-top: var(--space-3); padding-top: var(--space-3);
    border-top: 1px solid var(--border); font-size: var(--text-sm);
  }
  .task-detail-row { margin-bottom: var(--space-2); color: var(--text-secondary); line-height: 1.5; }
  .task-detail-row strong { color: var(--text-primary); }

  /* Hamburger & sidebar toggle */
  .hamburger-btn {
    display: none; background: none; border: 1px solid var(--border);
    border-radius: var(--radius-sm); padding: 6px 8px; cursor: pointer;
    flex-direction: column; gap: 4px; align-items: center; justify-content: center;
  }
  .hamburger-btn span {
    display: block; width: 18px; height: 2px; background: var(--text-primary);
    border-radius: 1px; transition: 0.2s;
  }
  .hamburger-btn:hover { background: var(--bg-hover); }
  #sidebar-backdrop {
    display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5);
    z-index: 90;
  }
  #sidebar-backdrop.active { display: block; }

  .empty { color: var(--text-muted); text-align: center; padding: var(--space-8); font-style: italic; }
  /* #316 Actionable empty states */
  .empty-action {
    display: inline-block; margin-top: var(--space-3);
    background: var(--bg-hover); border: 1px solid var(--border);
    padding: var(--space-2) var(--space-4); border-radius: var(--radius-md);
    color: var(--accent-blue); font-size: var(--text-sm); font-style: normal;
  }
  .tag {
    display: inline-block; background: rgba(245,158,11,0.15); color: var(--rihal-gold);
    padding: 2px 10px; border-radius: 12px; font-size: 11px;
    text-transform: uppercase; letter-spacing: 0.05em; margin-right: 6px;
  }
  .status-chip {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 2px 8px; border-radius: 99px; font-size: var(--text-xs);
    font-weight: 500; letter-spacing: 0.04em; text-transform: lowercase;
  }
  .status-chip.complete     { background: rgba(16,185,129,0.15);  color: var(--accent-green); }
  .status-chip.active,
  .status-chip.in_progress  { background: rgba(59,130,246,0.15);  color: var(--accent-blue);  }
  .status-chip.blocked      { background: rgba(239,68,68,0.15);   color: var(--accent-red);   }
  /* Fix #314: 'planned' gets its own class */
  .status-chip.planned      { background: rgba(96,96,104,0.2);    color: var(--text-muted);   }
  .status-chip.todo         { background: rgba(96,96,104,0.2);    color: var(--text-muted);   }
  .status-chip.other        { background: rgba(96,96,104,0.2);    color: var(--text-muted);   }
  /* Progress bar */
  .progress-bar {
    height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; width: 100%;
  }
  .progress-bar-fill {
    height: 100%; border-radius: 3px; transition: width 0.3s ease;
    background: var(--accent-green);
  }
  /* File tree */
  .file-tree { font-size: var(--text-xs); }
  .file-tree-group { margin-bottom: var(--space-3); }
  .file-tree-group summary {
    color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.07em;
    font-size: 10px; padding: var(--space-1) var(--space-2); cursor: pointer; list-style: none;
  }
  .file-tree-item {
    display: block; padding: 3px var(--space-3); color: var(--text-secondary);
    cursor: pointer; border-radius: var(--radius-sm); overflow: hidden;
    text-overflow: ellipsis; white-space: nowrap; font-family: 'SF Mono', Monaco, Consolas, monospace;
  }
  .file-tree-item:hover { color: var(--text-primary); background: var(--bg-hover); }
  .file-tree-item.selected { color: var(--accent-blue); background: rgba(59,130,246,0.1); }
  /* #300 File modification date */
  .file-tree-date { color: var(--text-muted); font-size: 9px; margin-left: 4px; }
  /* Markdown render */
  .md-render {
    background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg);
    padding: var(--space-8); max-width: 860px; line-height: 1.7;
  }
  .md-render h1, .md-render h2, .md-render h3 { margin: var(--space-6) 0 var(--space-3); }
  .md-render code { background: var(--bg-hover); padding: 2px 6px; border-radius: var(--radius-sm); font-size: var(--text-sm); }
  .md-render pre  { background: var(--bg-hover); padding: var(--space-4); border-radius: var(--radius-md); overflow-x: auto; }
  .md-render a    { color: var(--accent-blue); }
  .md-render ul, .md-render ol { margin-left: var(--space-6); margin-bottom: var(--space-3); }
  /* #302 Syntax highlighting for fenced code blocks */
  .md-render pre code {
    background: none; padding: 0; display: block;
    color: var(--text-secondary); font-size: var(--text-sm);
    font-family: "SF Mono", Monaco, Consolas, monospace;
  }
  .md-render pre code .kw { color: #c678dd; }
  .md-render pre code .str { color: #98c379; }
  .md-render pre code .cm { color: #5c6370; font-style: italic; }
  /* Filter bar */
  .filter-bar { margin-bottom: var(--space-6); display: flex; gap: var(--space-3); align-items: center; flex-wrap: wrap; }
  .filter-input {
    width: 100%; max-width: 360px; background: var(--bg-card);
    border: 1px solid var(--border); border-radius: var(--radius-md);
    color: var(--text-primary); font-size: var(--text-sm);
    padding: var(--space-2) var(--space-3); outline: none; font-family: inherit;
  }
  .filter-input:focus { border-color: var(--accent-blue); }
  .filter-input::placeholder { color: var(--text-muted); }
  /* #296 Filter select */
  .filter-select {
    background: var(--bg-card); border: 1px solid var(--border);
    border-radius: var(--radius-md); color: var(--text-primary);
    font-size: var(--text-sm); padding: var(--space-2) var(--space-3);
    font-family: inherit; outline: none;
  }
  .view-title { font-size: var(--text-lg); font-weight: 600; margin-bottom: var(--space-6); }
  /* Breadcrumb */
  .breadcrumb { margin-bottom: var(--space-5); }
  .back-btn {
    background: var(--bg-card); border: 1px solid var(--border); color: var(--text-secondary);
    padding: var(--space-2) var(--space-4); border-radius: var(--radius-md);
    cursor: pointer; font-size: var(--text-sm); font-family: inherit; transition: all 0.15s;
  }
  .back-btn:hover { color: var(--text-primary); border-color: var(--accent-blue); }
  /* Entity detail */
  .entity-header { margin-bottom: var(--space-6); }
  .entity-title { font-size: var(--text-xl); font-weight: 700; margin-bottom: var(--space-4); }
  .attr-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: var(--space-3); }
  .attr-item {
    background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-md);
    padding: var(--space-3) var(--space-4); display: flex; flex-direction: column; gap: 4px;
  }
  .attr-label { font-size: var(--text-xs); color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
  .attr-value { font-size: var(--text-sm); font-weight: 500; }
  /* Tree */
  .tree-container { padding: 0; }
  .tree-ms { border-left: none !important; margin-left: 0 !important; }
  .tree-node { border-left: 1px solid var(--border); margin-left: var(--space-4); }
  .tree-row {
    display: flex; align-items: center; gap: var(--space-2);
    padding: var(--space-2) var(--space-3); cursor: pointer;
    border-radius: var(--radius-sm); transition: background 0.1s; user-select: none;
  }
  .tree-row:hover { background: var(--bg-hover); }
  .task-leaf > .tree-row { cursor: default; }
  .tree-chevron { color: var(--text-muted); font-size: 10px; width: 14px; flex-shrink: 0; }
  .tree-icon { flex-shrink: 0; }
  .tree-label { flex: 1; font-size: var(--text-sm); }
  .tree-badge { color: var(--text-muted); font-size: var(--text-xs); flex-shrink: 0; }
  .tree-ms > .tree-row .tree-label { font-weight: 700; font-size: var(--text-base); color: var(--rihal-gold); }
  .tree-children { padding-left: var(--space-3); }
  /* #311 Tree animation */
  .tree-children { overflow: hidden; transition: max-height 0.25s ease; }
  /* #315 Loading skeleton */
  .skeleton {
    background: linear-gradient(90deg, var(--bg-hover) 25%, var(--border) 50%, var(--bg-hover) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: var(--radius-md); height: 80px; margin-bottom: var(--space-3);
  }
  @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
  /* #298 File path header */
  .file-path-header {
    font-family: 'SF Mono', Monaco, Consolas, monospace;
    font-size: var(--text-sm); color: var(--text-muted);
    padding: var(--space-3) 0; margin-bottom: var(--space-4);
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center; gap: var(--space-3);
  }
  .file-path-header .copy-btn {
    background: var(--bg-hover); border: 1px solid var(--border);
    color: var(--text-secondary); padding: 2px 8px; border-radius: var(--radius-sm);
    cursor: pointer; font-size: var(--text-xs); font-family: inherit;
  }
  .file-path-header .copy-btn:hover { color: var(--text-primary); }
  /* File view layout */
  #view-files { display: flex; flex-direction: column; }
  #file-list-inline { margin-bottom: var(--space-4); }
  #file-view { min-height: 200px; }
  .inline-subgroup summary { list-style: none; cursor: pointer; }
  .inline-subgroup summary::-webkit-details-marker { display: none; }
  .inline-subgroup summary:hover { color: var(--text-primary); }
  .file-tree-subgroup summary { list-style: none; cursor: pointer; }
  .file-tree-subgroup summary::-webkit-details-marker { display: none; }
  .file-tree-subgroup > summary::before { content: '▶ '; font-size: 9px; display: inline-block; }
  .file-tree-subgroup[open] > summary::before { content: '▼ '; }
  /* Footer */
  footer {
    text-align: center; padding: var(--space-8); color: var(--text-muted); font-size: var(--text-sm);
    border-top: 1px solid var(--border); margin-top: 48px;
  }
  footer .arabic { color: var(--rihal-gold); font-size: 16px; margin-bottom: var(--space-2); }
  code {
    background: rgba(255,255,255,0.05); padding: 2px 6px;
    border-radius: var(--radius-sm); font-size: var(--text-sm);
    font-family: "SF Mono", Monaco, Consolas, monospace;
  }
  h1, h2, h3 { line-height: 1.3; }
  p { margin-bottom: 10px; }
  ul { margin-left: 20px; margin-bottom: 10px; }
  /* Velocity bar */
  .velocity-bar { display: flex; align-items: center; gap: var(--space-2); margin-bottom: var(--space-2); }
  .velocity-bar-label { font-size: var(--text-xs); color: var(--text-muted); width: 60px; text-align: right; }
  .velocity-bar-track { flex: 1; height: 14px; background: var(--border); border-radius: 7px; overflow: hidden; position: relative; }
  .velocity-bar-fill { height: 100%; border-radius: 7px; background: var(--accent-blue); }
  .velocity-bar-val { font-size: var(--text-xs); color: var(--text-secondary); width: 50px; }
  /* #280 Completion ring */
  .completion-ring { position: relative; width: 64px; height: 64px; }
  .completion-ring svg { transform: rotate(-90deg); }
  .completion-ring .ring-text {
    position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%);
    font-size: var(--text-sm); font-weight: 700;
  }
  /* #323 Responsive */
  @media (max-width: 768px) {
    .hamburger-btn { display: flex; }
    .sidebar {
      display: flex; position: fixed; left: -260px; top: 0; bottom: 0;
      z-index: 100; transition: left 0.25s ease;
      background: var(--bg-sidebar); box-shadow: 2px 0 12px rgba(0,0,0,0.3);
    }
    .sidebar.sidebar-open { left: 0; }
    .content-area { width: 100%; }
    .view { padding: var(--space-4); }
    header { padding: var(--space-3) var(--space-4); flex-wrap: wrap; gap: var(--space-2); }
    .brand .icon { font-size: 28px; }
    .brand h1 { font-size: var(--text-lg); }
    .stats { grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); }
    .agents { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); }
    .attr-grid { grid-template-columns: 1fr 1fr; }
  }
  /* Desktop sidebar toggle */
  @media (min-width: 769px) {
    .hamburger-btn { display: flex; }
    .sidebar { transition: margin-left 0.25s ease, opacity 0.25s ease; }
    body.sidebar-visible .sidebar { margin-left: 0; opacity: 1; }
  }
  /* Command hints accordion */
  .cmd-hints {
    margin-top: var(--space-4); border: 1px solid var(--border); border-radius: var(--radius-md);
    background: var(--bg-card); overflow: hidden;
  }
  .cmd-hints summary {
    padding: var(--space-2) var(--space-3); cursor: pointer; font-size: var(--text-sm);
    color: var(--text-muted); font-weight: 500; list-style: none;
    display: flex; align-items: center; gap: 6px; user-select: none;
  }
  .cmd-hints summary::-webkit-details-marker { display: none; }
  .cmd-hints summary::before { content: '▶'; font-size: 10px; transition: transform 0.2s; }
  .cmd-hints[open] summary::before { transform: rotate(90deg); }
  .cmd-hints summary:hover { color: var(--text-primary); background: var(--bg-hover); }
  .cmd-hints-list { padding: var(--space-2) 0; }
  .cmd-hint-item {
    display: flex; align-items: baseline; gap: var(--space-3); padding: var(--space-2) var(--space-3);
    cursor: pointer; transition: background 0.15s;
  }
  .cmd-hint-item:hover { background: var(--bg-hover); }
  .cmd-hint-item .cmd-text {
    font-family: 'SF Mono', Monaco, Consolas, monospace; font-size: var(--text-xs);
    color: var(--accent-blue); white-space: nowrap; font-weight: 500;
  }
  .cmd-hint-item .cmd-desc {
    font-size: var(--text-xs); color: var(--text-muted); flex: 1;
  }
  .cmd-hint-item .cmd-copy {
    font-size: 10px; color: var(--text-muted); opacity: 0; transition: opacity 0.15s; margin-left: auto;
  }
  .cmd-hint-item:hover .cmd-copy { opacity: 1; }
  /* Task detail inline commands */
  .task-detail-cmds {
    margin-top: var(--space-3); padding-top: var(--space-3);
    border-top: 1px solid var(--border);
  }
  .task-detail-cmds::before {
    content: '💡 Quick Commands'; display: block; font-size: var(--text-xs);
    color: var(--text-muted); font-weight: 600; margin-bottom: var(--space-2);
    text-transform: uppercase; letter-spacing: 0.5px;
  }
  /* Toast notification (for copy feedback) */
  .toast {
    position: fixed; bottom: 20px; right: 20px; background: var(--accent-green);
    color: #fff; padding: var(--space-2) var(--space-4); border-radius: var(--radius-md);
    font-size: var(--text-sm); z-index: 1000; opacity: 0; transition: opacity 0.3s;
    pointer-events: none;
  }
  .toast.show { opacity: 1; }
</style>`;
}

module.exports = { renderCss };
