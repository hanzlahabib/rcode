/* CLAUDE.md exemption: pure CSS data file, no logic — 1000-line limit does not apply */
/**
 * Dashboard CSS — Linear design system.
 * Dark-first (Linear-style). rcode accent: #5e6ad2 (Aether Blue).
 */
function renderCss() {
  return `<style>
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap");

/* ── Design tokens ─────────────────────────────────────────────── */
:root {
  /* Surfaces */
  --bg-page:    #08090a;
  --bg-elev-1:  #0f1011;
  --bg-elev-2:  #161718;
  --bg-elev-3:  #1c1d1f;
  --bg-hover:   #23252a;
  --bg-input:   #1a1b1d;
  --bg-active:  #2c2d31;

  /* Borders */
  --border-subtle:  rgba(255,255,255,0.06);
  --border-default: #23252a;
  --border-strong:  #323334;

  /* Text */
  --text-primary:   #f7f8f8;
  --text-secondary: #b4bcd0;
  --text-tertiary:  #8a8f98;
  --text-muted:     #62666d;

  /* Brand — rcode keeps Aether Blue */
  --accent-primary: #5e6ad2;
  --accent-hover:   #7170ff;
  --accent-active:  #4853bb;
  --accent-bg:      rgba(94,106,210,0.12);
  --accent-border:  rgba(94,106,210,0.35);

  /* Semantic */
  --green:   #4cb782;
  --amber:   #f2c94c;
  --red:     #eb5757;
  --blue:    #26b5ce;
  --violet:  #bf7af0;

  /* Status */
  --status-todo:     #e2e2e2;
  --status-progress: #f2c94c;
  --status-blocked:  #eb5757;
  --status-done:     #4cb782;

  /* Type */
  --font-sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-mono: "JetBrains Mono", "SF Mono", Menlo, Consolas, monospace;

  /* Size scale */
  --text-xl:  20px;
  --text-lg:  17px;
  --text-md:  15px;
  --text-sm:  14px;
  --text-xs:  13px;
  --text-2xs: 11px;
  --text-stat: 28px;  /* stat card value — large metric numeral */

  /* Component dimensions */
  --h-header-btn:  26px; /* topbar button height */
  --size-icon-btn: 32px; /* square icon button (hamburger, etc.) */

  /* Spacing (4px base) */
  --space-1: 2px;
  --space-2: 4px;
  --space-3: 8px;
  --space-4: 12px;
  --space-5: 16px;
  --space-6: 20px;
  --space-7: 24px;
  --space-8: 32px;
  --space-10: 64px;

  /* Radius */
  --radius-1: 2px;
  --radius-2: 4px;
  --radius-3: 6px;
  --radius-4: 8px;
  --radius-5: 12px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-lg:    0 16px 32px rgba(0,0,0,0.6);

  /* Motion */
  --ease: cubic-bezier(0.4,0,0.2,1);
  --t-fast: 120ms;
  --t-base: 200ms;
  --t-menu: 240ms;

  /* Legacy compat aliases */
  --bg: var(--bg-page);
  --bg-card: var(--bg-elev-2);
  --border: var(--border-default);
  --radius-sm: var(--radius-2);
  --radius-md: var(--radius-4);
  --accent-green: var(--green);
  --accent-amber: var(--amber);
  --accent-red: var(--red);
  --accent-blue: var(--blue);

  /* ── Dashboard redesign (mockup) tokens ──────────────────────────
     Exact values from .planning/campaign/MOCKUP-SPEC.md. Namespaced
     --dash-* so the Overview redesign can adopt the deep-navy mockup
     palette without disturbing the existing Linear theme above. */
  --dash-bg:         #0F1729; /* deep navy page base */
  --dash-card:       #111A2E; /* card surface */
  --dash-border:     #1E2A44; /* 1px hairline border */
  --dash-teal:       #2DD4BF;
  --dash-purple:     #A78BFA;
  --dash-blue:       #3B82F6;
  --dash-amber:      #F59E0B;
  --dash-sev-high:   #F87171; /* red   — High   */
  --dash-sev-medium: #FBBF24; /* amber — Medium */
  --dash-sev-low:    #9CA3AF; /* gray  — Low    */
  --dash-text:       #E6EDF7; /* primary text */
  --dash-text-muted: #8595AD; /* muted text   */
}

/* Light mode */
[data-theme="light"] {
  --bg-page:    #f5f5f7;
  --bg-elev-1:  #ffffff;
  --bg-elev-2:  #f0f0f2;
  --bg-elev-3:  #e8e8ec;
  --bg-hover:   #e2e2e8;
  --bg-input:   #f8f8fa;
  --bg-active:  #dcdce4;
  --border-subtle:  rgba(0,0,0,0.06);
  --border-default: #d8d8e0;
  --border-strong:  #c0c0cc;
  --text-primary:   #0f0f11;
  --text-secondary: #4a4a58;
  --text-tertiary:  #72727e;
  --text-muted:     #9898a4;
  --accent-bg: rgba(94,106,210,0.08);
}

/* ── Reset ─────────────────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html, body {
  height: 100%;
  background: var(--bg-page);
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  line-height: 1.5;
  letter-spacing: -0.011em;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

/* ── App shell — inverted L ────────────────────────────────────── */
.app-shell {
  display: grid;
  grid-template-columns: 240px 1fr;
  height: 100vh;
  overflow: hidden;
  position: relative;
}

/* ── Sidebar ───────────────────────────────────────────────────── */
.sidebar {
  background: var(--bg-elev-1);
  border-right: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
  z-index: 20;
}

.sidebar-project {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border-subtle);
  min-height: 52px;
  justify-content: center;
}
.sidebar-project .project-label {
  font-size: var(--text-2xs);
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.sidebar-project > *:last-child {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar nav {
  flex: 1;
  padding: var(--space-3) var(--space-2);
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.nav-section {
  font-size: var(--text-2xs);
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
  padding: var(--space-3) var(--space-3) var(--space-2);
  margin-top: var(--space-3);
}
.nav-section:first-child { margin-top: 0; }

.nav-link {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  height: 28px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-2);
  background: none;
  border: none;
  color: var(--text-tertiary);
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  font-weight: 500;
  letter-spacing: -0.006em;
  cursor: pointer;
  width: 100%;
  text-align: left;
  transition: background var(--t-fast) var(--ease), color var(--t-fast) var(--ease);
}
.nav-link:hover { background: var(--bg-hover); color: var(--text-secondary); }
.nav-link.active { background: var(--bg-elev-2); color: var(--text-primary); }
.nav-count {
  margin-left: auto;
  font-size: 10px;
  font-weight: 600;
  color: var(--text-muted);
  background: var(--bg-elev-2);
  padding: 1px 6px;
  border-radius: var(--radius-2);
}
.nav-link.active .nav-count { color: var(--text-secondary); background: var(--bg-hover); }

/* Mobile hamburger */
.hamburger-btn {
  display: none;
  flex-direction: column;
  gap: var(--space-2);
  width: var(--size-icon-btn);
  height: var(--size-icon-btn);
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  border-radius: var(--radius-2);
  padding: 6px;
}
.hamburger-btn:hover { background: var(--bg-hover); }
.hamburger-btn span {
  display: block;
  width: 16px;
  height: 1.5px;
  background: var(--text-tertiary);
  border-radius: 1px;
  transition: opacity var(--t-fast) var(--ease);
}

#sidebar-backdrop {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5); /* intentional: one-off overlay tint; translucency can't be expressed as a theme token */
  z-index: 15;
}

/* ── Content area ──────────────────────────────────────────────── */
.content-area {
  display: grid;
  grid-template-rows: 44px 1fr;
  min-height: 0;
  overflow: hidden;
  position: relative;
}

/* ── Topbar / header ───────────────────────────────────────────── */
header {
  background: rgba(8,9,10,0.8); /* intentional: frosted glass tied to --bg-page exact value; alpha can't be expressed as a theme token */
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-5);
  gap: var(--space-4);
  position: relative;
  z-index: 10;
  flex-shrink: 0;
}

[data-theme="light"] header {
  background: rgba(245,245,247,0.85); /* intentional: light frosted glass; alpha channel can't be expressed as a theme token */
}

.brand {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}
.brand .icon {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-2);
  background: linear-gradient(135deg, var(--accent-hover), var(--accent-active));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  flex-shrink: 0;
}
.brand h1 {
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: -0.006em;
  color: var(--text-primary);
}
.brand .arabic {
  font-size: var(--text-2xs);
  color: var(--text-muted);
  letter-spacing: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.topbar-start-group {
  display: flex;
  align-items: center;
  gap: var(--space-4); /* --space-4 = 12px */
}

.updated-ago {
  font-size: var(--text-2xs); /* --text-2xs = 11px */
  color: var(--text-muted);
}

.live {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--green);
  display: inline-block;
  animation: pulse-dot 2s ease-in-out infinite;
}
@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.header-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  height: var(--h-header-btn);
  padding: 0 var(--space-3);
  background: var(--bg-elev-2);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-2);
  color: var(--text-secondary);
  font-family: var(--font-sans);
  font-size: var(--text-2xs);
  font-weight: 500;
  cursor: pointer;
  transition: background var(--t-fast) var(--ease), color var(--t-fast) var(--ease);
  letter-spacing: -0.006em;
  white-space: nowrap;
}
.header-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
.header-btn:active { transform: scale(0.97); }

/* ── Main scroll area ──────────────────────────────────────────── */
.main-scroll {
  overflow-y: auto;
  overflow-x: hidden;
  padding: var(--space-6) var(--space-7);
  display: flex;
  flex-direction: column;
  gap: var(--space-7);
}

/* ── Views ─────────────────────────────────────────────────────── */
.view { display: none; }
.view.active { display: block; }

.view-title {
  font-size: var(--text-xl);
  font-weight: 600;
  letter-spacing: -0.017em;
  color: var(--text-primary);
  margin-bottom: var(--space-5);
}

/* ── Section ───────────────────────────────────────────────────── */
section {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  margin-top: var(--space-6);
}
section h2 {
  font-size: var(--text-md);
  font-weight: 600;
  letter-spacing: -0.011em;
  color: var(--text-primary);
}
.body {
  background: var(--bg-elev-2);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-4);
  overflow: hidden;
}
section .body {
  padding: var(--space-4) var(--space-5);
}

.ctx-pre {
  margin: 0;
  padding: var(--space-5);
  font-family: "JetBrains Mono", "SF Mono", Consolas, monospace;
  font-size: var(--text-xs);
  line-height: 1.65;
  color: var(--text-secondary);
  white-space: pre-wrap;
  word-break: break-word;
  background: transparent;
  border: none;
}

/* ── Stats ─────────────────────────────────────────────────────── */
.stats {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--space-3);
  margin-bottom: var(--space-7);
}
.stat {
  background: var(--bg-elev-2);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-4);
  padding: var(--space-5);
  border-left: 2px solid var(--accent-primary);
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.stat .label {
  font-size: var(--text-2xs);
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.stat .value {
  font-size: var(--text-stat);
  font-weight: 700;
  letter-spacing: -0.025em;
  color: var(--text-primary);
  line-height: 1;
}
.stat .sub {
  font-size: var(--text-2xs);
  color: var(--text-tertiary);
  letter-spacing: -0.006em;
}

/* ── Items / list ──────────────────────────────────────────────── */
.item {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-5);
  border-bottom: 1px solid var(--border-subtle);
  font-size: var(--text-xs);
  color: var(--text-secondary);
  cursor: pointer;
  transition: background var(--t-fast) var(--ease);
  letter-spacing: -0.006em;
}
.item:last-child { border-bottom: none; }
.item:hover { background: var(--bg-hover); }
.item strong {
  color: var(--text-primary);
  font-weight: 500;
}
.item-clickable { cursor: pointer; }
.item-clickable:hover { background: var(--bg-hover); }

.item-title {
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--text-primary);
  letter-spacing: -0.006em;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 4px;
}
.item-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  font-size: var(--text-2xs);
  color: var(--text-muted);
}

/* ── Tags (pill badges) ─────────────────────────────────────────── */
.tag {
  display: inline-flex;
  align-items: center;
  height: 16px;
  padding: 0 6px;
  background: var(--bg-elev-3);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-2);
  font-size: var(--text-2xs);
  color: var(--text-secondary);
  font-family: var(--font-mono);
  letter-spacing: 0;
  white-space: nowrap;
}

/* ── Phase list container ───────────────────────────────────────── */
.phase-list {
  background: var(--bg-elev-2);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-4);
  overflow: hidden;
}
.phase-list .item {
  display: block;
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--border-subtle);
}
.phase-list .item:last-child { border-bottom: none; }
.phase-list .item:hover { background: var(--bg-hover); }

/* ── Breadcrumb / back nav ──────────────────────────────────────── */
.breadcrumb {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
  flex-wrap: wrap;
}
.back-btn {
  background: var(--bg-elev-3);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-3);
  color: var(--text-secondary);
  font-size: var(--text-xs);
  padding: 3px var(--space-4);
  cursor: pointer;
  transition: background var(--t-fast) var(--ease), color var(--t-fast) var(--ease);
  font-family: var(--font-sans);
  letter-spacing: -0.006em;
}
.back-btn:hover { background: var(--bg-hover); color: var(--text-primary); }

/* ── Entity detail header ───────────────────────────────────────── */
.entity-header {
  background: var(--bg-elev-2);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-4);
  padding: var(--space-5) var(--space-6);
  margin-bottom: var(--space-5);
}
.entity-title {
  font-size: var(--text-xl);
  font-weight: 600;
  letter-spacing: -0.017em;
  color: var(--text-primary);
  margin-bottom: var(--space-4);
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}
.attr-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: var(--space-3) var(--space-6);
  margin-top: var(--space-4);
}
.attr-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.attr-label {
  font-size: var(--text-2xs);
  font-weight: 500;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.attr-value {
  font-size: var(--text-xs);
  color: var(--text-primary);
  font-weight: 400;
}

/* ── Completion ring ────────────────────────────────────────────── */
.completion-ring {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.completion-ring svg { transform: rotate(-90deg); }
.ring-text {
  position: absolute;
  font-size: var(--text-2xs);
  font-weight: 600;
  color: var(--text-primary);
  font-family: var(--font-mono);
}

/* ── Progress bar ───────────────────────────────────────────────── */
.progress-bar {
  height: 4px;
  background: var(--bg-elev-3);
  border-radius: 2px;
  overflow: hidden;
  width: 100%;
}
.progress-bar-fill {
  height: 100%;
  background: var(--accent-primary);
  border-radius: 2px;
  transition: width 0.3s var(--ease);
}

/* ── Velocity bars ──────────────────────────────────────────────── */
.velocity-bar {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
  font-size: var(--text-xs);
}
.velocity-bar-label {
  width: 48px;
  flex-shrink: 0;
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
}
.velocity-bar-track {
  flex: 1;
  height: 6px;
  background: var(--bg-elev-3);
  border-radius: 3px;
  overflow: hidden;
}
.velocity-bar-fill {
  height: 100%;
  background: var(--accent-blue);
  border-radius: 3px;
  transition: width 0.3s var(--ease);
}
.velocity-bar-val {
  width: 56px;
  flex-shrink: 0;
  color: var(--text-secondary);
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  text-align: right;
}

/* ── Roadmap tree ───────────────────────────────────────────────── */
.tree-container {
  background: var(--bg-elev-2);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-4);
  overflow: hidden;
  margin-bottom: var(--space-4);
}
.tree-node { border-bottom: 1px solid var(--border-subtle); }
.tree-node:last-child { border-bottom: none; }
.tree-ms > .tree-row { background: var(--bg-elev-3); }
.tree-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-5);
  cursor: pointer;
  font-size: var(--text-xs);
  color: var(--text-secondary);
  transition: background var(--t-fast) var(--ease);
  letter-spacing: -0.006em;
}
.tree-row:hover { background: var(--bg-hover); }
.tree-header { font-weight: 600; color: var(--text-primary); }
.tree-children { padding-left: var(--space-5); }
.tree-icon { font-size: 11px; flex-shrink: 0; }
.tree-label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tree-chevron {
  font-size: 8px;
  color: var(--text-muted);
  flex-shrink: 0;
  width: 10px;
}
.tree-badge {
  font-size: var(--text-2xs);
  color: var(--text-muted);
  font-family: var(--font-mono);
  flex-shrink: 0;
  white-space: nowrap;
}
.task-leaf .tree-row { padding-left: var(--space-3); opacity: 0.85; }

/* ── Task expand detail ─────────────────────────────────────────── */
.task-detail {
  background: var(--bg-elev-3);
  border-top: 1px solid var(--border-subtle);
  padding: var(--space-3) var(--space-5);
  font-size: var(--text-xs);
}
.task-detail-row {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  padding: 2px 0;
  color: var(--text-secondary);
}
.task-detail-row strong { color: var(--text-muted); font-weight: 500; min-width: 64px; flex-shrink: 0; }
.task-detail-cmds { margin-top: var(--space-3); }
.task-expand-icon {
  font-size: 8px;
  color: var(--text-muted);
  margin-left: auto;
  padding-left: var(--space-2);
  flex-shrink: 0;
}

/* ── Commands accordion ─────────────────────────────────────────── */
.cmd-hints {
  margin-top: var(--space-4);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-4);
  overflow: hidden;
  background: var(--bg-elev-2);
}
.cmd-hints summary {
  padding: var(--space-3) var(--space-5);
  font-size: var(--text-xs);
  color: var(--text-secondary);
  cursor: pointer;
  user-select: none;
}
.cmd-hints summary:hover { background: var(--bg-hover); }
.cmd-hints-list { padding: var(--space-2) 0; }
.cmd-hint-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-5);
  cursor: pointer;
  transition: background var(--t-fast) var(--ease);
}
.cmd-hint-item:hover { background: var(--bg-hover); }
.cmd-text {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--accent-primary);
  flex-shrink: 0;
}
.cmd-desc {
  font-size: var(--text-xs);
  color: var(--text-muted);
  flex: 1;
}
.cmd-copy {
  font-size: 11px;
  opacity: 0.4;
  flex-shrink: 0;
}
.cmd-hint-item:hover .cmd-copy { opacity: 0.8; }

/* ── Filter select ──────────────────────────────────────────────── */
.filter-select {
  height: 28px;
  background: var(--bg-input);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-3);
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  padding: 0 var(--space-3);
  cursor: pointer;
  outline: none;
  transition: border-color var(--t-fast) var(--ease);
}
.filter-select:focus { border-color: var(--accent-primary); }
.filter-bar { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; }

/* ── Decisions / Memory list ────────────────────────────────────── */
.decision-list {
  background: var(--bg-elev-2);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-4);
  overflow: hidden;
  margin-top: var(--space-2);
}
.memory-group-header {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-muted);
  padding: var(--space-4) var(--space-4) var(--space-2);
  text-transform: capitalize;
  letter-spacing: -0.006em;
}

/* ── Markdown render ────────────────────────────────────────────── */
.md-render {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  line-height: 1.6;
  letter-spacing: -0.006em;
}
.md-render h1,.md-render h2,.md-render h3 { color: var(--text-primary); margin: var(--space-4) 0 var(--space-2); font-weight: 600; }
.md-render h1 { font-size: var(--text-lg); }
.md-render h2 { font-size: var(--text-md); }
.md-render h3 { font-size: var(--text-xs); }
.md-render p  { margin: var(--space-2) 0; }
.md-render code { font-family: var(--font-mono); background: var(--bg-elev-3); padding: 1px 4px; border-radius: var(--radius-1); font-size: 0.9em; }
.md-render pre { background: var(--bg-elev-3); border: 1px solid var(--border-subtle); border-radius: var(--radius-3); padding: var(--space-4); overflow-x: auto; margin: var(--space-3) 0; }
.md-render pre code { background: none; padding: 0; }
.md-render a { color: var(--accent-primary); text-decoration: none; }
.md-render a:hover { text-decoration: underline; }
.md-render ul,.md-render ol { padding-left: var(--space-5); margin: var(--space-2) 0; }
.md-render li { margin: 2px 0; }
.md-render blockquote { border-left: 2px solid var(--accent-primary); padding-left: var(--space-4); color: var(--text-muted); margin: var(--space-3) 0; }
.md-render hr { border: none; border-top: 1px solid var(--border-subtle); margin: var(--space-4) 0; }
.md-render table { border-collapse: collapse; width: 100%; margin: var(--space-3) 0; }
.md-render th,.md-render td { border: 1px solid var(--border-subtle); padding: var(--space-2) var(--space-3); text-align: left; font-size: var(--text-2xs); }
.md-render th { background: var(--bg-elev-3); font-weight: 600; color: var(--text-primary); }

/* ── Skeleton / loading ─────────────────────────────────────────── */
.skeleton {
  background: linear-gradient(90deg, var(--bg-elev-2) 25%, var(--bg-elev-3) 50%, var(--bg-elev-2) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: var(--radius-3);
  height: 14px;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* ── Inline file entries ────────────────────────────────────────── */
.inline-file-entry {
  display: flex;
  align-items: center;
  padding: var(--space-2) var(--space-4);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-secondary);
  cursor: pointer;
  border-bottom: 1px solid var(--border-subtle);
  transition: background var(--t-fast) var(--ease), color var(--t-fast) var(--ease);
  letter-spacing: 0;
}
.inline-file-entry:last-child { border-bottom: none; }
.inline-file-entry:hover { background: var(--bg-hover); color: var(--text-primary); }
.inline-file-entry.selected { background: rgba(94,106,210,0.1); color: var(--accent-primary); }
.inline-file-group { margin-bottom: var(--space-3); }
.inline-subgroup { padding-left: var(--space-4); }
.file-path-header {
  font-size: var(--text-2xs);
  color: var(--text-muted);
  font-family: var(--font-mono);
  padding: var(--space-2) var(--space-4);
  border-bottom: 1px solid var(--border-subtle);
  letter-spacing: 0;
}

.item-preview {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  color: var(--text-tertiary);
  padding: var(--space-4) var(--space-5);
  max-height: 280px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  letter-spacing: 0;
  line-height: 1.55;
  border-top: 1px solid var(--border-subtle);
}

/* ── Empty states ──────────────────────────────────────────────── */
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-10) var(--space-8);
  color: var(--text-muted);
  gap: var(--space-3);
  text-align: center;
  font-size: var(--text-xs);
}
.empty-action {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  background: var(--bg-elev-3);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-3);
  padding: var(--space-2) var(--space-4);
  color: var(--text-tertiary);
  margin-top: var(--space-3);
  letter-spacing: 0;
}

/* ── Filter bar ────────────────────────────────────────────────── */
.filter-bar {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border-subtle);
}
.filter-input {
  width: 100%;
  height: 28px;
  background: var(--bg-input);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-3);
  padding: 0 var(--space-4);
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  letter-spacing: -0.006em;
  outline: none;
  transition: border-color var(--t-fast) var(--ease);
}
.filter-input::placeholder { color: var(--text-muted); }
.filter-input:focus { border-color: var(--accent-primary); }

/* ── Badges ────────────────────────────────────────────────────── */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 18px;
  padding: 0 6px;
  border-radius: var(--radius-1);
  font-size: var(--text-2xs);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

/* ── Agents grid ───────────────────────────────────────────────── */
.agents {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--space-3);
  padding: var(--space-4);
}
.agent-card {
  background: var(--bg-elev-2);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-4);
  padding: var(--space-4) var(--space-5);
  transition: background var(--t-fast) var(--ease), border-color var(--t-fast) var(--ease);
}
.agent-card:hover {
  background: var(--bg-elev-3);
  border-color: var(--border-default);
}
.agent-card .name {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
  letter-spacing: -0.006em;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.agent-card .arabic {
  font-size: var(--text-xl);
  color: var(--accent-primary);
  margin-bottom: 4px;
  line-height: 1.2;
}
.agent-card .role {
  font-size: var(--text-2xs);
  color: var(--text-tertiary);
  letter-spacing: -0.006em;
}
.real-badge {
  font-size: var(--text-2xs);
  font-weight: 500;
  padding: 1px 5px;
  border-radius: var(--radius-full);
  background: rgba(94,106,210,0.15);
  color: var(--accent-hover);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.type-badge {
  font-size: var(--text-2xs);
  font-weight: 500;
  padding: 1px 5px;
  border-radius: var(--radius-1);
  background: var(--bg-hover);
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* ── Toast ─────────────────────────────────────────────────────── */
.toast {
  position: fixed;
  bottom: var(--space-7);
  left: 50%;
  transform: translateX(-50%) translateY(80px);
  background: var(--bg-elev-3);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-4);
  padding: var(--space-3) var(--space-5);
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--text-primary);
  box-shadow: var(--shadow-lg);
  z-index: 1000;
  opacity: 0;
  transition: all var(--t-base) var(--ease);
  white-space: nowrap;
  letter-spacing: -0.006em;
  pointer-events: none;
}
.toast.show {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

/* ── Banners ───────────────────────────────────────────────────── */
#blocker-banner {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-5);
  background: rgba(235,87,87,0.1);
  border-bottom: 1px solid rgba(235,87,87,0.25);
  font-size: var(--text-xs);
  flex-shrink: 0;
}
.banner-title { font-weight: 600; color: var(--red); letter-spacing: -0.006em; }
.banner-list { color: var(--text-secondary); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.banner-dismiss {
  background: none;
  border: 1px solid rgba(235,87,87,0.4);
  border-radius: var(--radius-2);
  color: var(--red);
  font-size: var(--text-2xs);
  font-weight: 500;
  padding: 2px var(--space-3);
  cursor: pointer;
  white-space: nowrap;
}
.banner-dismiss:hover { background: rgba(235,87,87,0.15); }

#parse-warning {
  padding: var(--space-3) var(--space-5);
  background: rgba(242,201,76,0.08);
  border-bottom: 1px solid rgba(242,201,76,0.2);
  font-size: var(--text-xs);
  color: var(--amber);
}

/* ── Footer ────────────────────────────────────────────────────── */
footer {
  display: none;
}

/* ── File tree ─────────────────────────────────────────────────── */
.file-tree-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  height: 28px;
  padding: 0 var(--space-5);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  cursor: pointer;
  border-bottom: 1px solid var(--border-subtle);
  letter-spacing: -0.006em;
  transition: background var(--t-fast) var(--ease), color var(--t-fast) var(--ease);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.file-tree-item:last-child { border-bottom: none; }
.file-tree-item:hover { background: var(--bg-hover); color: var(--text-secondary); }
.file-tree-item.selected { background: var(--accent-bg); color: var(--text-primary); }
#file-view {
  padding: var(--space-5);
  background: var(--bg-elev-2);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-4);
  margin-top: var(--space-4);
}

/* ══════════════════════════════════════════════════════════════════
   KANBAN — orchestration board
   ══════════════════════════════════════════════════════════════════ */

.kanban-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-5);
  height: 40px;
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
}
.kanban-topbar-title {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.006em;
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.kanban-topbar-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

/* Orch status dot in topbar */
.orch-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
  background: var(--text-muted);
  transition: background var(--t-base) var(--ease);
}
.orch-status-dot.up { background: var(--green); animation: pulse-dot 2s ease-in-out infinite; }
.orch-status-dot.down { background: var(--red); animation: none; }

.kanban-board {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-3);
  padding: var(--space-5);
  height: 100%;
  min-height: 0;
  overflow-x: auto;
  align-items: start;
}

.kanban-col {
  background: var(--bg-elev-1);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-4);
  min-height: 200px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.kanban-col-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
}
.kanban-col-head .col-label {
  font-size: var(--text-2xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--text-tertiary);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.col-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}
.col-todo    .col-status-dot { background: var(--status-todo); }
.col-prog    .col-status-dot { background: var(--status-progress); }
.col-blocked .col-status-dot { background: var(--status-blocked); }
.col-done    .col-status-dot { background: var(--status-done); }

.kanban-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  background: var(--bg-elev-2);
  border-radius: var(--radius-full);
  font-size: var(--text-2xs);
  font-weight: 600;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

.kanban-col-body {
  flex: 1;
  padding: var(--space-2);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  overflow-y: auto;
}

/* Kanban card */
.kanban-card {
  background: var(--bg-elev-2);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-3);
  padding: var(--space-4);
  cursor: pointer;
  transition: background var(--t-fast) var(--ease), border-color var(--t-fast) var(--ease), box-shadow var(--t-fast) var(--ease);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  position: relative;
}
.kanban-card:hover {
  background: var(--bg-elev-3);
  border-color: var(--border-default);
}
.kanban-card.running {
  border-color: var(--accent-border);
  box-shadow: 0 0 0 1px var(--accent-border);
}
.kanban-card.done {
  border-color: rgba(76,183,130,0.3);
}
.kanban-card.blocked-state {
  border-color: rgba(235,87,87,0.3);
}

/* Drag-over highlight */
.kanban-card.drag-over { opacity: 0.5; }
.kanban-col-body.drag-target { background: var(--accent-bg); border-radius: var(--radius-3); }

.kanban-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
}
.kanban-card-title {
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--text-primary);
  letter-spacing: -0.006em;
  line-height: 1.4;
  flex: 1;
}
.kanban-card-id {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  color: var(--text-muted);
  flex-shrink: 0;
  padding-top: 1px;
  letter-spacing: 0;
}
.kanban-card-meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}
.kanban-card-sprint {
  font-size: var(--text-2xs);
  color: var(--text-muted);
  letter-spacing: -0.006em;
}
.kanban-card-status {
  font-size: var(--text-2xs);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 1px 5px;
  border-radius: var(--radius-1);
}
.s-todo     .kanban-card-status { background: rgba(226,226,226,0.1); color: var(--status-todo); }
.s-in_progress .kanban-card-status { background: rgba(242,201,76,0.12); color: var(--status-progress); }
.s-blocked  .kanban-card-status { background: rgba(235,87,87,0.12); color: var(--status-blocked); }
.s-done     .kanban-card-status { background: rgba(76,183,130,0.12); color: var(--status-done); }

/* Running indicator on card */
.card-run-indicator {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-2xs);
  color: var(--accent-primary);
  font-weight: 500;
  letter-spacing: -0.006em;
}
.run-pulse {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent-primary);
  animation: run-blink 1s ease-in-out infinite;
  flex-shrink: 0;
}
@keyframes run-blink {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.8); }
}

.kanban-card-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: 2px;
}

/* Run / Stop buttons */
.kanban-run-btn, .kanban-stop-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 24px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-2);
  font-family: var(--font-sans);
  font-size: var(--text-2xs);
  font-weight: 500;
  cursor: pointer;
  letter-spacing: -0.006em;
  transition: background var(--t-fast) var(--ease), color var(--t-fast) var(--ease);
  border: 1px solid transparent;
  white-space: nowrap;
}
.kanban-run-btn {
  background: var(--accent-bg);
  border-color: var(--accent-border);
  color: var(--accent-hover);
}
.kanban-run-btn:hover {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  color: white;
}
.kanban-run-btn:active { transform: scale(0.97); }

.kanban-stop-btn {
  background: rgba(235,87,87,0.1);
  border-color: rgba(235,87,87,0.3);
  color: var(--red);
}
.kanban-stop-btn:hover {
  background: rgba(235,87,87,0.2);
}
.kanban-stop-btn:active { transform: scale(0.97); }

.kanban-view-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 24px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-2);
  font-family: var(--font-sans);
  font-size: var(--text-2xs);
  font-weight: 500;
  cursor: pointer;
  letter-spacing: -0.006em;
  background: var(--bg-hover);
  border: 1px solid var(--border-default);
  color: var(--text-secondary);
  transition: background var(--t-fast) var(--ease);
}
.kanban-view-btn:hover {
  background: var(--bg-active);
  color: var(--text-primary);
}

.kanban-refresh-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 26px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-2);
  font-family: var(--font-sans);
  font-size: var(--text-2xs);
  font-weight: 500;
  cursor: pointer;
  letter-spacing: -0.006em;
  background: var(--bg-elev-2);
  border: 1px solid var(--border-default);
  color: var(--text-secondary);
  transition: background var(--t-fast) var(--ease);
}
.kanban-refresh-btn:hover { background: var(--bg-hover); color: var(--text-primary); }

/* ── Orchestrator side panel ────────────────────────────────────── */
#orch-panel {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 440px;
  max-width: 42vw;
  min-width: 320px;
  background: var(--bg-elev-1);
  border-left: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  z-index: 50;
  transform: translateX(100%);
  transition: transform var(--t-menu) var(--ease);
  box-shadow: -8px 0 32px rgba(0,0,0,0.4);
}
#orch-panel.open {
  transform: translateX(0);
}

.orch-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-4);
  height: 44px;
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
  background: var(--bg-elev-2);
}
.orch-panel-title {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.006em;
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.orch-panel-close {
  background: none;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-2);
  transition: background var(--t-fast) var(--ease), color var(--t-fast) var(--ease);
}
.orch-panel-close:hover { background: var(--bg-hover); color: var(--text-primary); }

/* Tab strip */
.orch-tabs {
  display: flex;
  align-items: center;
  gap: 1px;
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--border-subtle);
  overflow-x: auto;
  flex-shrink: 0;
  background: var(--bg-elev-1);
  scrollbar-width: none;
}
.orch-tabs::-webkit-scrollbar { display: none; }

.orch-tab {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  height: 26px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-2);
  font-family: var(--font-sans);
  font-size: var(--text-2xs);
  font-weight: 500;
  cursor: pointer;
  color: var(--text-tertiary);
  background: none;
  border: none;
  white-space: nowrap;
  letter-spacing: -0.006em;
  transition: background var(--t-fast) var(--ease), color var(--t-fast) var(--ease);
  flex-shrink: 0;
}
.orch-tab:hover { background: var(--bg-hover); color: var(--text-secondary); }
.orch-tab.active {
  background: var(--bg-elev-3);
  color: var(--text-primary);
}
.orch-tab-close {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
  padding: 0;
  display: flex;
  align-items: center;
  border-radius: 2px;
  width: 14px;
  height: 14px;
  justify-content: center;
  transition: background var(--t-fast) var(--ease), color var(--t-fast) var(--ease);
}
.orch-tab-close:hover { background: var(--bg-hover); color: var(--red); }
.orch-tab .tab-status-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
}
.orch-tab .tab-status-dot.running { background: var(--accent-primary); animation: run-blink 1s infinite; }
.orch-tab .tab-status-dot.done { background: var(--green); animation: none; }
.orch-tab .tab-status-dot.error { background: var(--red); animation: none; }
.orch-tab .tab-status-dot.stopped { background: var(--text-muted); animation: none; }
.orch-tab .tab-status-dot.starting { background: var(--amber); animation: run-blink 0.6s infinite; }

/* Terminal body */
.orch-terminal {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.orch-term-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-4) var(--space-5);
  background: #050507;
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.6;
  letter-spacing: 0;
  scroll-behavior: smooth;
}
.orch-term-body::-webkit-scrollbar { width: 4px; }
.orch-term-body::-webkit-scrollbar-track { background: transparent; }
.orch-term-body::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 2px; }

.orch-term-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-muted);
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  gap: var(--space-3);
  text-align: center;
}

.orch-empty-tab {
  padding: var(--space-2) var(--space-3); /* 6px 8px via space tokens */
  font-size: var(--text-2xs); /* 11px */
  color: var(--text-muted);
}

.orch-footer-spacer {
  flex: 1;
}

.orch-footer-status {
  font-size: var(--text-2xs); /* 11px */
  color: var(--text-muted);
}

/* Terminal log lines */
.kt-line { color: #a0c4a0; word-break: break-word; }
.kt-line.tool { color: #7cb8ff; }
.kt-line.warn { color: var(--amber); }
.kt-line.err  { color: var(--red); }
.kt-line.meta { color: var(--text-muted); }
.kt-line.done-line { color: var(--green); }
.kt-stream { color: #c8d8c8; word-break: break-word; }

/* File ops panel */
.orch-files {
  border-top: 1px solid var(--border-subtle);
  background: var(--bg-elev-2);
  max-height: 120px;
  overflow-y: auto;
  flex-shrink: 0;
}
.orch-files-head {
  padding: var(--space-2) var(--space-4);
  font-size: var(--text-2xs);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border-subtle);
  position: sticky;
  top: 0;
  background: var(--bg-elev-2);
}
.kt-file {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-1) var(--space-4);
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  color: var(--text-tertiary);
  border-bottom: 1px solid var(--border-subtle);
  letter-spacing: 0;
  min-height: 22px;
}
.kt-file:last-child { border-bottom: none; }
.kt-file .op-icon {
  font-size: 10px;
  flex-shrink: 0;
  width: 14px;
  text-align: center;
}
.op-w { color: var(--amber); }
.op-r { color: var(--blue); }
.op-b { color: var(--violet); }

/* Panel footer */
.orch-panel-footer {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--border-subtle);
  background: var(--bg-elev-2);
  flex-shrink: 0;
}
.orch-footer-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 26px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-2);
  font-family: var(--font-sans);
  font-size: var(--text-2xs);
  font-weight: 500;
  cursor: pointer;
  letter-spacing: -0.006em;
  background: var(--bg-hover);
  border: 1px solid var(--border-default);
  color: var(--text-secondary);
  transition: background var(--t-fast) var(--ease), color var(--t-fast) var(--ease);
}
.orch-footer-btn:hover { background: var(--bg-active); color: var(--text-primary); }
.orch-footer-btn.stop {
  background: rgba(235,87,87,0.1);
  border-color: rgba(235,87,87,0.3);
  color: var(--red);
}
.orch-footer-btn.stop:hover { background: rgba(235,87,87,0.2); }

/* ── Old kanban inline terminals (hidden) ────────────────────── */
.kanban-log-panel { display: none !important; }
.kanban-terminal { display: none !important; }

/* ── Roadmap / phases ───────────────────────────────────────── */
.phase-row {
  display: grid;
  grid-template-columns: 36px 1fr auto;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-5);
  border-bottom: 1px solid var(--border-subtle);
  font-size: var(--text-xs);
  cursor: pointer;
  transition: background var(--t-fast) var(--ease);
  letter-spacing: -0.006em;
}
.phase-row:last-child { border-bottom: none; }
.phase-row:hover { background: var(--bg-hover); }
.phase-num {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  color: var(--text-muted);
  text-align: right;
  letter-spacing: 0;
}
.phase-done { color: var(--text-tertiary); }
.phase-status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--text-2xs);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 1px 5px;
  border-radius: var(--radius-1);
}
.phase-status.done    { background: rgba(76,183,130,0.12); color: var(--green); }
.phase-status.planned { background: rgba(94,106,210,0.12); color: var(--accent-hover); }
.phase-status.active  { background: rgba(242,201,76,0.12); color: var(--amber); }

/* Sprint / tasks */
.sprint-card {
  background: var(--bg-elev-2);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-4);
  overflow: hidden;
  margin-bottom: var(--space-3);
}
.sprint-head {
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
}
.sprint-head:hover { background: var(--bg-hover); }
.sprint-name {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.006em;
}
.sprint-meta {
  font-size: var(--text-2xs);
  color: var(--text-muted);
  letter-spacing: -0.006em;
}
.task-row {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-5);
  border-bottom: 1px solid var(--border-subtle);
  font-size: var(--text-xs);
  letter-spacing: -0.006em;
}
.task-row:last-child { border-bottom: none; }
.task-check {
  width: 14px;
  height: 14px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-1);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  color: var(--green);
}
.task-check.done { border-color: var(--green); background: rgba(76,183,130,0.12); }
.task-id {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  color: var(--text-muted);
  flex-shrink: 0;
  letter-spacing: 0;
}
.task-title {
  color: var(--text-primary);
  flex: 1;
  font-weight: 500;
}
.task-agent {
  font-size: var(--text-2xs);
  color: var(--text-tertiary);
  flex-shrink: 0;
}

/* Memory bank */
.memory-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-3);
  padding: var(--space-4);
}
.memory-card {
  background: var(--bg-elev-2);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-4);
  padding: var(--space-4) var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.memory-type {
  font-size: var(--text-2xs);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 1px 5px;
  border-radius: var(--radius-1);
  display: inline-flex;
  align-self: flex-start;
}
.memory-type.user    { background: rgba(94,106,210,0.12); color: var(--accent-hover); }
.memory-type.feedback { background: rgba(242,201,76,0.12); color: var(--amber); }
.memory-type.project { background: rgba(76,183,130,0.12); color: var(--green); }
.memory-type.reference { background: rgba(38,181,206,0.12); color: var(--blue); }
.memory-name {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.006em;
}
.memory-desc {
  font-size: var(--text-2xs);
  color: var(--text-tertiary);
  line-height: 1.5;
  letter-spacing: -0.006em;
}

/* Decisions (ADRs) */
.decision-card {
  background: var(--bg-elev-2);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-4);
  padding: var(--space-4) var(--space-5);
  margin-bottom: var(--space-3);
  cursor: pointer;
  transition: background var(--t-fast) var(--ease);
}
.decision-card:hover { background: var(--bg-elev-3); }
.decision-id {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  color: var(--text-muted);
  letter-spacing: 0;
  margin-bottom: 4px;
}
.decision-title {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.006em;
  margin-bottom: 4px;
}
.decision-body {
  font-size: var(--text-2xs);
  color: var(--text-tertiary);
  line-height: 1.5;
  letter-spacing: -0.006em;
}

/* ── Responsive / mobile ────────────────────────────────────── */
@media (max-width: 768px) {
  .app-shell {
    grid-template-columns: 1fr;
    grid-template-rows: 44px 1fr;
  }
  .sidebar {
    position: fixed;
    top: 0;
    left: -240px;
    height: 100vh;
    width: 240px;
    transition: left var(--t-menu) var(--ease);
    z-index: 30;
  }
  .sidebar.open {
    left: 0;
  }
  #sidebar-backdrop.show {
    display: block;
  }
  .hamburger-btn { display: flex; }
  .content-area { grid-column: 1; }
  .kanban-board { grid-template-columns: repeat(4, 260px); }
  #orch-panel { max-width: 90vw; min-width: 280px; }
}

/* ── Milestones / roadmap dynamic ───────────────────────────── */
.milestone-section {
  background: var(--bg-elev-2);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-4);
  overflow: hidden;
  margin-bottom: var(--space-4);
}
.milestone-head {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--border-subtle);
  background: var(--bg-elev-1);
}
.milestone-name {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.006em;
  flex: 1;
}
.milestone-prog {
  font-size: var(--text-2xs);
  color: var(--text-muted);
  letter-spacing: -0.006em;
}

/* ── Overview dynamic area ──────────────────────────────────── */
#view-overview-dynamic section { margin-top: var(--space-5); }

/* ── xterm Terminal Panel ───────────────────────────────────── */
.term-backdrop {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45);
  z-index: 200;
}
.term-backdrop.open { display: block; }
.term-panel {
  display: none;
  position: fixed;
  bottom: 0;
  left: 236px;
  right: 0;
  height: 55vh;
  min-height: 300px;
  background: #0c0c0e;
  border-top: 2px solid var(--accent-primary);
  z-index: 201;
  flex-direction: column;
}
.term-panel.open { display: flex; }
.term-panel.fullscreen {
  inset: 0;
  left: 0;
  height: 100vh;
}

/* Minimized terminal pill */
.term-pill {
  display: none;
  position: fixed;
  bottom: var(--space-4);
  right: var(--space-4);
  z-index: 201;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: var(--bg-elev-3);
  border: 1px solid var(--accent-primary);
  border-radius: var(--radius-4);
  color: var(--text-primary);
  font-size: var(--text-xs);
  cursor: pointer;
  box-shadow: 0 6px 20px rgba(0,0,0,0.45);
}
.term-pill.show { display: flex; }
.term-pill:hover { background: var(--bg-hover); }
.term-pill-icon { color: var(--text-muted); }

/* "running" badge for phase / sprint / task cards */
.run-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: var(--space-2);
  padding: 1px var(--space-2);
  background: rgba(63,185,80,0.15);
  border: 1px solid rgba(63,185,80,0.4);
  border-radius: var(--radius-2);
  color: var(--accent-green);
  font-size: var(--text-2xs);
  font-weight: 600;
  white-space: nowrap;
}
.term-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-4);
  height: 38px;
  background: var(--bg-elev-2);
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
  user-select: none;
}
.term-header-left { display: flex; align-items: center; gap: var(--space-3); }
.term-header-right { display: flex; align-items: center; gap: var(--space-2); }
.term-title {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-secondary);
  font-family: var(--font-mono);
  letter-spacing: 0;
}
.term-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-muted);
  flex-shrink: 0;
}
.term-status-dot.running { background: var(--accent-green); animation: pulse 1.5s infinite; }
.term-status-dot.done    { background: var(--accent-green); animation: none; }
.term-status-dot.error   { background: #ff4444; animation: none; }
.term-status-dot.stopped { background: var(--accent-amber); animation: none; }
.term-status-dot.connecting { background: var(--accent-blue); animation: pulse 1s infinite; }
.term-btn {
  height: 22px;
  padding: 0 var(--space-3);
  background: var(--bg-elev-3);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-2);
  color: var(--text-secondary);
  font-size: 10px;
  font-family: var(--font-mono);
  cursor: pointer;
  transition: background var(--t-fast) var(--ease), color var(--t-fast) var(--ease);
  white-space: nowrap;
}
.term-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
.term-stop-btn { color: #ff6b6b; border-color: rgba(255,107,107,0.3); }
.term-stop-btn:hover { background: rgba(255,107,107,0.1); }
#term-container {
  flex: 1;
  overflow: hidden;
  padding: 6px 8px;
  background: #0c0c0e;
}
.term-hint {
  padding: var(--space-2) var(--space-3);
  background: var(--bg-elev-2);
  border-top: 1px solid var(--border-subtle);
  color: var(--text-muted);
  font-size: var(--text-xs);
  flex-shrink: 0;
}
/* Run / Terminal action buttons (used on sprint/phase detail) */
.term-run-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  height: 28px;
  padding: 0 var(--space-4);
  background: var(--accent-primary);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: var(--radius-3);
  color: white;
  font-size: var(--text-xs);
  font-weight: 500;
  font-family: var(--font-sans);
  cursor: pointer;
  transition: opacity var(--t-fast) var(--ease);
}
.term-run-btn:hover { opacity: 0.85; }
.term-run-btn.outline {
  background: transparent;
  border-color: var(--border-default);
  color: var(--text-secondary);
}
.term-run-btn.outline:hover { background: var(--bg-hover); color: var(--text-primary); }
.term-run-btn.danger {
  background: transparent;
  border-color: rgba(255,107,107,0.4);
  color: #ff6b6b;
}
.term-run-btn.danger:hover { background: rgba(255,107,107,0.12); opacity: 1; }
.term-action-bar {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-5);
}
.term-status-dot.exited  { background: #ff4444; animation: none; }
.term-status-dot.waiting { background: var(--accent-amber); animation: pulse 1.2s infinite; }

/* Compact ▶ Run button on phase / sprint / task list cards */
.card-run-btn {
  float: right;
  margin-left: var(--space-3);
  height: 20px;
  padding: 0 var(--space-3);
  background: transparent;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-2);
  color: var(--text-tertiary);
  font-size: 10px;
  font-weight: 500;
  cursor: pointer;
  transition: background var(--t-fast) var(--ease),
              color var(--t-fast) var(--ease),
              border-color var(--t-fast) var(--ease);
}
.card-run-btn:hover {
  background: var(--accent-green);
  border-color: var(--accent-green);
  color: #fff;
}
.ms-actions {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  margin-left: var(--space-3);
}
.ms-audit-btn:hover {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
}

/* ── Orchestration view ─────────────────────────────────────── */
.orch-subtitle {
  color: var(--text-tertiary);
  font-size: var(--text-sm);
  margin-bottom: var(--space-5);
}
.orch-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-4);
}
.orch-card {
  background: var(--bg-elev-2);
  border: 1px solid var(--border-subtle);
  border-left: 3px solid var(--text-muted);
  border-radius: var(--radius-4);
  padding: var(--space-4) var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.orch-card.orch-running { border-left-color: var(--accent-green); }
.orch-card.orch-waiting {
  border-left-color: var(--accent-amber);
  background: rgba(245,158,11,0.05);
}
.orch-card.orch-waiting .orch-card-badge { color: var(--accent-amber); }
.orch-card.orch-error,
.orch-card.orch-exited  { border-left-color: #ff4444; }
.orch-card.orch-stopped { border-left-color: var(--accent-amber); }
.orch-card.orch-done    { border-left-color: var(--accent-blue); }
.orch-card-head {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.orch-card-id {
  font-weight: 600;
  font-size: var(--text-sm);
  color: var(--text-primary);
}
.orch-card-badge {
  margin-left: auto;
  font-size: var(--text-2xs);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}
.orch-card-cmd {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-secondary);
  background: var(--bg-elev-1);
  border-radius: var(--radius-2);
  padding: var(--space-2) var(--space-3);
  word-break: break-all;
}
.orch-card-meta {
  font-size: var(--text-2xs);
  color: var(--text-tertiary);
}
.orch-card-actions {
  display: flex;
  gap: var(--space-2);
}

/* ── Icon alignment helpers (for sprint 32.2 SVG icon sweep) ── */
.ic {
  display: inline-block;
  vertical-align: -0.15em;  /* optical baseline alignment with surrounding text */
  flex-shrink: 0;
}
.btn-icon { display: inline-block; vertical-align: -0.1em; flex-shrink: 0; }
.section-icon {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}
.tree-icon .ic { vertical-align: -0.15em; }

/* ── Scrollbar global ───────────────────────────────────────── */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }
* { scrollbar-width: thin; scrollbar-color: var(--border-strong) transparent; }

/* ── Command runner (Sprint 33.2) ───────────────────────────────────────────── */
.cmd-runner {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  margin-bottom: var(--space-5);
}
.cmd-runner-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--space-3);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.cmd-runner-row {
  display: flex;
  gap: var(--space-3);
  align-items: center;
}
.cmd-runner-hint {
  margin-top: var(--space-3);
  font-size: var(--text-xs);
  color: var(--text-muted);
  line-height: 1.5;
}
.cmd-runner-select {
  flex: 1;
  background: var(--bg-input, var(--bg-elev-2));
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-sm);
  cursor: pointer;
}
.cmd-runner-select:focus {
  outline: none;
  border-color: var(--accent-blue);
}
.cmd-runner-btn {
  background: var(--accent-blue);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-4);
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  transition: opacity 0.15s;
  white-space: nowrap;
}
.cmd-runner-btn:hover:not(:disabled) { opacity: 0.85; }
.cmd-runner-btn:disabled,
.cmd-runner-btn--busy { opacity: 0.6; cursor: not-allowed; }

/* ── Dashboard redesign — base layout (mockup) ───────────────────── */
.dash-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 20px;
}
.dash-grid .col-4 { grid-column: span 4; }
.dash-grid .col-6 { grid-column: span 6; }
.dash-grid .col-12 { grid-column: span 12; }
@media (max-width: 1100px) {
  .dash-grid .col-4,
  .dash-grid .col-6 { grid-column: span 12; }
}
.dash-card {
  background: var(--dash-card);
  border: 1px solid var(--dash-border);
  border-radius: 14px;
  padding: 18px 20px;
  color: var(--dash-text);
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.02);
}
.dash-card-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--dash-text);
  margin: 0;
}
.dash-card-sub {
  font-size: 12px;
  color: var(--dash-text-muted);
  margin: 0;
}
.dash-slot {
  border: 1px dashed var(--dash-border);
  border-radius: 10px;
  color: var(--dash-text-muted);
  font-size: 12px;
  padding: 24px;
  text-align: center;
}

/* ── ProgressDonut — Project Progress card (Row 1, Card 1) ───────── */
.donut-body {
  display: flex;
  align-items: center;
  gap: 20px;
}
.donut-ring {
  position: relative;
  flex: 0 0 auto;
  width: 132px;
  height: 132px;
}
.donut-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
}
.donut-pct {
  font-size: 30px;
  font-weight: 700;
  line-height: 1;
  color: var(--dash-text);
}
.donut-pct-label {
  font-size: 11px;
  color: var(--dash-text-muted);
}
.donut-legend {
  flex: 1 1 auto;
/* ============================================================
   CompletedTasks (ct-*) + InProgress (ip-*) cards — Row 2
   Overview redesign. Appended by tasks agent A6.
   ============================================================ */
.ct-head,
.ip-head {
/* ── Blockers card (Row 2, Card 3) ───────────────────────────────── */
.bk-head {
/* ── Dashboard redesign — Recent Decisions (Row 3, Card 1) ───────── */
.rd-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.ct-viewall,
.ip-viewall {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  color: var(--dash-blue);
}
.ct-viewall:hover,
.ip-viewall:hover {
  text-decoration: underline;
}
.ct-list,
.ip-list {
.bk-viewall {
  background: none;
  border: none;
  padding: 0;
.rd-viewall {
  background: none;
  border: none;
  color: var(--dash-teal);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.bk-viewall:hover { text-decoration: underline; }
.bk-list {
  padding: 0;
}
.rd-viewall:hover { text-decoration: underline; }
.rd-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}
.donut-legend-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.donut-dot {
  flex: 0 0 auto;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  display: inline-block;
}
.donut-dot--done { background: var(--dash-teal); }
.donut-dot--prog { background: var(--dash-blue); }
.donut-dot--idle { background: var(--dash-sev-low); }
.donut-legend-label {
  flex: 1 1 auto;
  font-size: 13px;
  color: var(--dash-text-muted);
}
.donut-legend-pct {
  flex: 0 0 auto;
  gap: 14px;
}
.bk-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: start;
  column-gap: 10px;
}
.bk-icon {
  font-size: 14px;
  line-height: 1.4;
}
.bk-body { min-width: 0; }
.bk-title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--dash-text);
}
.donut-summary {
  font-size: 13px;
  color: var(--dash-text-muted);
  margin: 0;
}
.donut-summary strong {
  color: var(--dash-text);
  font-weight: 700;
}
.donut-bar {
  display: block;
  width: 100%;
  height: 6px;
}
/* ── Component: CurrentPhase card + milestone stepper (Row 1, Card 2) ──── */
.cp-card { gap: 14px; }
.cp-head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.cp-rocket {
  flex: 0 0 auto;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  border-radius: 10px;
  background: rgba(167, 139, 250, 0.12);
  border: 1px solid rgba(167, 139, 250, 0.25);
}
.cp-headtext { min-width: 0; }
.cp-titlerow {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.cp-name {
  font-size: 16px;
  font-weight: 700;
  color: var(--dash-purple);
}
.cp-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.rd-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid var(--dash-border);
}
.rd-row:last-child { border-bottom: none; }
.rd-title {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: var(--dash-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rd-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  color: var(--dash-purple);
  background: rgba(167, 139, 250, 0.12);
  border: 1px solid rgba(167, 139, 250, 0.3);
}
.cp-sub {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--dash-text-muted);
}
.cp-progress {
  margin: 0;
  font-size: 12px;
  color: var(--dash-text-muted);
}
.cp-dot { margin: 0 6px; }
.cp-pct { color: var(--dash-text); font-weight: 600; }

.cp-stepper {
  list-style: none;
  margin: 6px 0 0;
  padding: 0;
  display: flex;
  position: relative;
}
/* connecting line behind the nodes */
.cp-stepper::before {
  content: "";
  position: absolute;
  top: 11px;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--dash-border);
}
.cp-step {
  position: relative;
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.cp-node {
  width: 22px;
  height: 22px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  background: var(--dash-card);
  border: 2px solid var(--dash-sev-low);
  color: var(--dash-card);
  position: relative;
  z-index: 1;
}
.cp-done .cp-node {
  background: var(--dash-teal);
  border-color: var(--dash-teal);
  color: var(--dash-bg);
}
.cp-active .cp-node {
  background: var(--dash-card);
  border-color: var(--dash-purple);
  box-shadow: 0 0 0 4px rgba(167, 139, 250, 0.2);
}
.cp-label {
  font-size: 10px;
  line-height: 1.3;
  text-align: center;
  color: var(--dash-text-muted);
  max-width: 100%;
}
.cp-done .cp-label,
.cp-active .cp-label { color: var(--dash-text); }
/* ════════════════════════════════════════════════════════════════════
   Timeline card (.tl-*) — Overview Row 1 Card 3 (projected launch + chart)
   ════════════════════════════════════════════════════════════════════ */
.tl-card {
  gap: 6px;
}
.tl-label {
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.tl-date {
  font-size: 26px;
  font-weight: 700;
  line-height: 1.1;
  color: var(--dash-teal);
  margin: 0;
}
.tl-days {
  font-size: 12px;
  color: var(--dash-text-muted);
  margin: 0 0 4px 0;
}
.tl-chart {
  width: 100%;
  height: 88px;
  display: block;
  overflow: visible;
}
.tl-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
  font-size: 12px;
}
.tl-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--dash-text);
  font-weight: 600;
}
.tl-dot-badge {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--dash-teal);
  display: inline-block;
}
.tl-status-risk {
  color: var(--dash-sev-medium);
}
.tl-status-risk .tl-dot-badge {
  background: var(--dash-sev-medium);
}
.tl-note {
  color: var(--dash-text-muted);
  gap: 10px;
}
.ct-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: var(--dash-text);
}
.ct-check {
  flex: none;
  color: var(--accent-green);
}
.ct-title {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ct-date {
  flex: none;
  font-size: 12px;
  color: var(--dash-text-muted);
}
.ip-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: var(--dash-text);
}
.ip-title {
  flex: 1 1 auto;
  min-width: 0;
  white-space: nowrap;
}
.rd-badge--approved {
  color: var(--dash-teal);
  background: rgba(45, 212, 191, 0.12);
}
.rd-badge--rejected {
  color: var(--dash-sev-high);
  background: rgba(248, 113, 113, 0.12);
}
.rd-badge--proposed {
  color: var(--dash-purple);
  background: rgba(167, 139, 250, 0.12);
}
.rd-date {
  font-size: 12px;
  color: var(--dash-text-muted);
  white-space: nowrap;
}

/* ── Dashboard redesign — Progress Timeline (Row 3, Card 2) ──────── */
.pt-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.pt-viewall {
  background: none;
  border: none;
  color: var(--dash-teal);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}
.pt-viewall:hover { text-decoration: underline; }
.pt-ticks {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--dash-text-muted);
  padding: 0 2px;
}
.pt-tick { white-space: nowrap; }
.pt-track {
  display: flex;
  gap: 6px;
}
.pt-seg {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid var(--dash-border);
  border-top: 3px solid var(--dash-sev-low);
  background: rgba(255, 255, 255, 0.02);
}
.pt-seg--done   { border-top-color: var(--dash-teal); }
.pt-seg--active { border-top-color: var(--dash-purple); }
.pt-seg--todo   { border-top-color: var(--dash-sev-low); }
.pt-seg-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--dash-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ip-badge {
  flex: none;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  padding: 4px 9px;
  border-radius: 999px;
  color: var(--dash-blue);
  background: rgba(59, 130, 246, 0.15);
.bk-desc {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--dash-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.bk-pill {
  align-self: center;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 9px;
  border-radius: 999px;
  white-space: nowrap;
  border: 1px solid transparent;
}
.bk-sev-high   { color: var(--dash-sev-high);   }
.bk-sev-medium { color: var(--dash-sev-medium); }
.bk-sev-low    { color: var(--dash-sev-low);    }
.bk-pill.bk-sev-high {
  background: rgba(248, 113, 113, 0.12);
  border-color: rgba(248, 113, 113, 0.35);
}
.bk-pill.bk-sev-medium {
  background: rgba(251, 191, 36, 0.12);
  border-color: rgba(251, 191, 36, 0.35);
}
.bk-pill.bk-sev-low {
  background: rgba(156, 163, 175, 0.12);
  border-color: rgba(156, 163, 175, 0.35);
.pt-seg-range {
  font-size: 11px;
  color: var(--dash-text-muted);
}
.pt-seg-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 999px;
  align-self: flex-start;
  color: var(--dash-sev-low);
  background: rgba(156, 163, 175, 0.14);
}
.pt-seg--done .pt-seg-badge {
  color: var(--dash-teal);
  background: rgba(45, 212, 191, 0.12);
}
.pt-seg--active .pt-seg-badge {
  color: var(--dash-purple);
  background: rgba(167, 139, 250, 0.12);
}
@media (max-width: 700px) {
  .pt-track { flex-direction: column; }
}
</style>`;
}

module.exports = { renderCss };
