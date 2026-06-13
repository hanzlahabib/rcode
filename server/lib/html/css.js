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
  --dash-hover:      rgba(255, 255, 255, 0.04); /* row/button hover wash */
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

  /* Dashboard mockup tokens — light theme. Surfaces/text flip to light;
     teal/purple/blue/amber accents and severity colors stay the same. */
  --dash-bg:         #F4F6FB;
  --dash-card:       #FFFFFF;
  --dash-border:     #E2E8F0;
  --dash-text:       #1A2233;
  --dash-text-muted: #5B6B82;
  --dash-hover:      rgba(15, 23, 41, 0.05);
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
/* Selector matches the Preact component's class="orch-panel" — the legacy
   id="orch-panel" DOM was removed in the Preact migration (Sprint 31.4). */
.orch-panel {
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
.orch-panel.open {
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
  .orch-panel { max-width: 90vw; min-width: 280px; }
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
.term-status-dot.exited { background: #ff4444; animation: none; }
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

/* ── Run history panel ── */
.hist-panel { margin-top: var(--space-6); }
.hist-panel-title { display: flex; align-items: center; gap: var(--space-2); font-size: var(--text-md); color: var(--text-primary); margin-bottom: var(--space-4); }
.hist-group { margin-bottom: var(--space-5); }
.hist-group-title { font-size: var(--text-xs); text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-tertiary); margin-bottom: var(--space-2); }
.hist-date { font-size: var(--text-2xs); color: var(--text-muted); margin: var(--space-3) 0 var(--space-2); }
.hist-row { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-2) var(--space-3); background: var(--bg-elev-2); border: 1px solid var(--border-subtle); border-radius: var(--radius-2); margin-bottom: var(--space-2); }
.hist-row-id { font-weight: 600; font-size: var(--text-sm); color: var(--text-primary); }
.hist-row-cmd { font-family: var(--font-mono); font-size: var(--text-2xs); color: var(--text-secondary); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hist-row-duration { display: flex; align-items: center; gap: var(--space-1); font-size: var(--text-2xs); color: var(--text-muted); white-space: nowrap; }
.hist-row-status { margin-left: auto; font-size: var(--text-2xs); text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }

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

/* ── Dashboard redesign — sidebar + header chrome + project health ──
   Mockup chrome. Re-declares .sidebar / header layout (later-wins per
   property; mobile position/transform from the base rule are preserved)
   and adds prefixed sb-* / tb-* / phealth-* classes. Tokens only. */

/* Sidebar shell */
.sidebar {
  display: flex;
  flex-direction: column;
  gap: 14px;
  height: 100%;
  padding: 16px 14px;
  background: var(--dash-bg);
  border-right: 1px solid var(--dash-border);
  box-sizing: border-box;
  overflow-y: auto;
}

/* Logo badge */
.sb-logo { display: flex; align-items: center; gap: 10px; padding: 2px 4px; }
.sb-logo-badge {
  width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: 16px; color: #06121f;
  background: linear-gradient(135deg, var(--dash-teal), var(--dash-blue));
}
.sb-logo-word { font-size: 16px; font-weight: 700; color: var(--dash-text); letter-spacing: -0.01em; }

/* Project switcher */
.sb-switcher {
  display: flex; align-items: center; gap: 8px; width: 100%;
  padding: 9px 11px; border-radius: 10px;
  background: var(--dash-card); border: 1px solid var(--dash-border);
  color: var(--dash-text); font-size: 13px; font-weight: 600;
  cursor: pointer; text-align: left;
  transition: border-color 0.15s, background 0.15s;
}
.sb-switcher:hover { border-color: var(--dash-teal); }
.sb-switcher-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--dash-teal); flex-shrink: 0; }
.sb-switcher-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sb-switcher-chev { color: var(--dash-text-muted); font-size: 11px; }

/* Vertical nav */
.sb-nav { display: flex; flex-direction: column; gap: 2px; }
.sb-nav-link {
  display: flex; align-items: center; gap: 11px; width: 100%;
  padding: 9px 11px; border-radius: 9px;
  background: transparent; border: 0;
  color: var(--dash-text-muted); font-size: 13px; font-weight: 500;
  cursor: pointer; text-align: left;
  transition: background 0.15s, color 0.15s;
}
.sb-nav-link:hover { background: rgba(255, 255, 255, 0.04); color: var(--dash-text); }
.sb-nav-link.active { background: rgba(45, 212, 191, 0.12); color: var(--dash-text); font-weight: 600; }
.sb-nav-link.active .sb-nav-ic { color: var(--dash-teal); }
.sb-nav-ic { display: inline-flex; color: var(--dash-text-muted); }
.sb-nav-label { flex: 1; }

/* Health mini-card — pushed toward the bottom above the profile */
.sb-health { margin-top: auto; }

/* Project Health card */
.phealth {
  display: flex; flex-direction: column; gap: 8px;
  padding: 14px; border-radius: 12px;
  background: var(--dash-card); border: 1px solid var(--dash-border);
}
.phealth-title { margin: 0; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--dash-text-muted); }
.phealth-head { display: flex; align-items: baseline; gap: 8px; }
.phealth-pct { font-size: 26px; font-weight: 800; line-height: 1; color: var(--dash-text); }
.phealth-pct-sign { font-size: 14px; font-weight: 700; margin-left: 1px; color: var(--dash-text-muted); }
.phealth-label { font-size: 12px; font-weight: 600; }
.phealth--good .phealth-label { color: var(--dash-teal); }
.phealth--warn .phealth-label { color: var(--dash-sev-medium); }
.phealth--risk .phealth-label { color: var(--dash-sev-high); }
.phealth-spark { width: 100%; height: 36px; display: block; }
.phealth-spark-line { fill: none; stroke-width: 2; vector-effect: non-scaling-stroke; }
.phealth--good .phealth-spark-line { stroke: var(--dash-teal); }
.phealth--warn .phealth-spark-line { stroke: var(--dash-sev-medium); }
.phealth--risk .phealth-spark-line { stroke: var(--dash-sev-high); }
.phealth-spark-area { stroke: none; opacity: 0.14; }
.phealth--good .phealth-spark-area { fill: var(--dash-teal); }
.phealth--warn .phealth-spark-area { fill: var(--dash-sev-medium); }
.phealth--risk .phealth-spark-area { fill: var(--dash-sev-high); }

/* Profile footer */
.sb-profile {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 8px; border-top: 1px solid var(--dash-border);
}
.sb-avatar {
  width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; color: #06121f;
  background: linear-gradient(135deg, var(--dash-purple), var(--dash-blue));
}
.sb-profile-meta { display: flex; flex-direction: column; min-width: 0; }
.sb-profile-name { font-size: 13px; font-weight: 600; color: var(--dash-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sb-profile-email { font-size: 11px; color: var(--dash-text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* Header (Topbar) */
.topbar {
  display: flex; align-items: center; gap: 16px; height: 100%;
  padding: 0 20px;
  background: var(--dash-bg);
  border-bottom: 1px solid var(--dash-border);
  box-sizing: border-box;
}
.tb-greeting { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.tb-welcome { margin: 0; font-size: 15px; font-weight: 700; line-height: 1.2; color: var(--dash-text); white-space: nowrap; }
.tb-wave { display: inline-block; }
.tb-sub { margin: 0; font-size: 11px; line-height: 1.2; color: var(--dash-text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tb-actions { display: flex; align-items: center; gap: 10px; margin-left: auto; }
.tb-synced {
  display: flex; align-items: center; gap: 7px;
  padding: 6px 10px; border-radius: 8px;
  background: transparent; border: 0; cursor: pointer;
  font-size: 12px; color: var(--dash-text-muted);
}
.tb-synced:hover { color: var(--dash-text); }
.tb-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--dash-teal); box-shadow: 0 0 0 3px rgba(45, 212, 191, 0.18); flex-shrink: 0; }
.tb-synced--busy .tb-dot { background: var(--dash-blue); box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.18); animation: tb-pulse 0.8s ease-in-out infinite; }
@keyframes tb-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
.tb-btn {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 8px 13px; border-radius: 9px;
  background: var(--dash-card); border: 1px solid var(--dash-border);
  color: var(--dash-text); font-size: 13px; font-weight: 600;
  cursor: pointer; white-space: nowrap;
  transition: border-color 0.15s, background 0.15s, filter 0.15s;
}
.tb-btn:hover { border-color: var(--dash-teal); }
.tb-btn--primary {
  background: linear-gradient(135deg, var(--dash-teal), var(--dash-blue));
  border-color: transparent; color: #06121f;
}
.tb-btn--primary:hover { filter: brightness(1.05); border-color: transparent; }
.tb-btn--icon { padding: 8px 11px; }
.tb-kebab { font-size: 16px; line-height: 1; letter-spacing: 1px; }

@media (max-width: 760px) {
  .tb-sub { display: none; }
  .tb-synced { display: none; }
}

/* ════════════════════════════════════════════════════════════════════
   POLISH — Overview card grid (single source of truth)
   Replaces the earlier per-agent .dash-grid / .dash-card / donut-* /
   cp-* / tl-* / ct-* / ip-* / bk-* / rd-* / pt-* blocks, whose
   interleaved appends left unbalanced braces. ALL dashboard-card CSS
   lives here — append card changes to this block only.
   ════════════════════════════════════════════════════════════════════ */

/* ── Global view normalization — every view on the dash palette ──
   The pre-redesign views (tasks, decisions, phases, sprints, files,
   agents, memory, kanban …) consume the legacy Linear tokens. Re-mapping
   those custom properties on .main-scroll bridges ALL views onto the
   mockup palette — and onto its light-theme flips — without per-view
   rules. min-height: 0 lets the 1fr grid row shrink so the area scrolls
   instead of clipping the bottom card row below the fold. */
.main-scroll {
  min-height: 0;
  padding: 26px 28px;
  background: var(--dash-bg);
  --bg-page:        var(--dash-bg);
  --bg-elev-1:      var(--dash-card);
  --bg-elev-2:      var(--dash-card);
  --bg-elev-3:      var(--dash-border);
  --bg-input:       var(--dash-bg);
  --bg-hover:       var(--dash-hover);
  --bg-active:      var(--dash-hover);
  --border-subtle:  var(--dash-border);
  --border-default: var(--dash-border);
  --text-primary:   var(--dash-text);
  --text-secondary: var(--dash-text);
  --text-tertiary:  var(--dash-text-muted);
  --text-muted:     var(--dash-text-muted);
}

/* Legacy list panels pick up the card chrome and roomier rows. */
.phase-list, .decision-list, .body { border-radius: 14px; }
.item { padding: 11px 16px; }
.phase-list .item { padding: 13px 16px; }

/* ── Grid — 12 cols, 20px gaps; wrappers stretch cards to equal row height ── */
.dash-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 20px;
  align-items: stretch;
}
.dash-grid .col-4,
.dash-grid .col-6,
.dash-grid .col-12 {
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.dash-grid .col-4  { grid-column: span 4; }
.dash-grid .col-6  { grid-column: span 6; }
.dash-grid .col-12 { grid-column: span 12; }
.dash-grid .col-4 > .dash-card,
.dash-grid .col-6 > .dash-card,
.dash-grid .col-12 > .dash-card { flex: 1 1 auto; }
@media (max-width: 1100px) {
  .dash-grid .col-4,
  .dash-grid .col-6 { grid-column: span 12; }
}

/* ── Card surface ── */
.dash-card {
  /* margin: 0 cancels the global "section" margin-top rule — the
     cards are section elements and grid gap owns the spacing. */
  margin: 0;
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

/* ── Card header row: title left, "View all" link right ── */
.ct-head, .ip-head, .bk-head, .rd-head, .pt-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.ct-viewall, .ip-viewall, .bk-viewall, .rd-viewall, .pt-viewall {
  background: none;
  border: 0;
  padding: 0;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  color: var(--dash-teal);
  white-space: nowrap;
}
.ct-viewall:hover, .ip-viewall:hover, .bk-viewall:hover,
.rd-viewall:hover, .pt-viewall:hover { text-decoration: underline; }

/* ── Shared list shells + row separators (mockup: subtle hairlines) ── */
.ct-list, .ip-list, .bk-list, .rd-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.ct-row, .ip-row, .bk-row, .rd-row {
  padding: 9px 0;
  border-bottom: 1px solid var(--dash-border);
}
.ct-row:first-child, .ip-row:first-child,
.bk-row:first-child, .rd-row:first-child { padding-top: 2px; }
.ct-row:last-child, .ip-row:last-child,
.bk-row:last-child, .rd-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

/* ── ProgressDonut — Project Progress (Row 1, Card 1) ── */
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
}
/* ============================================================
   CompletedTasks (ct-*) + InProgress (ip-*) cards — Row 2
   Overview redesign. Appended by tasks agent A6.
   ============================================================ */
/* ── Blockers card (Row 2, Card 3) ───────────────────────────────── */
/* ── Dashboard redesign — Recent Decisions (Row 3, Card 1) ───────── */
/* Merge repair: the four card-head rules were spliced into each other
   mid-rule (unclosed braces nested every later rule). They share one
   header layout — combined into a single rule. */
.ct-head,
.ip-head,
.bk-head,
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
  list-style: none;
  margin: 0;
  padding: 0;
}
.bk-viewall {
  background: none;
  border: none;
  padding: 0;
}
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
  gap: 10px;
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
  border-radius: 3px;
  overflow: hidden;
}

/* ── CurrentPhase — phase stepper (Row 1, Card 2) ── */
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
  font-size: 11px;
  font-weight: 600;
  padding: 2px 9px;
  border-radius: 999px;
  color: var(--dash-purple);
  background: rgba(167, 139, 250, 0.12);
  border: 1px solid rgba(167, 139, 250, 0.3);
  white-space: nowrap;
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
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cp-done .cp-label,
.cp-active .cp-label { color: var(--dash-text); }

/* ── Timeline — projected launch + sparkline (Row 1, Card 3) ── */
.tl-card { gap: 6px; }
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
/* flex:1 + preserveAspectRatio="none" → the sparkline stretches to fill
   whatever height the equal-height row leaves; min-height guards collapse. */
.tl-chart {
  width: 100%;
  flex: 1 1 auto;
  min-height: 84px;
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
.tl-status-risk { color: var(--dash-sev-medium); }
.tl-status-risk .tl-dot-badge { background: var(--dash-sev-medium); }
.tl-note { color: var(--dash-text-muted); }

/* ── CompletedTasks — check + title + date (Row 2, Card 1) ── */
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

/* ── InProgress — title + % pill (Row 2, Card 2) ── */
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
}

/* ── Blockers — icon + title/desc + severity pill (Row 2, Card 3) ── */
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
}

/* ── RecentDecisions — title + status badge + date (Row 3, Card 1) ── */
.rd-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.rd-title {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 13px;
  color: var(--dash-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rd-badge {
  flex: none;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
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
  flex: none;
  font-size: 12px;
  color: var(--dash-text-muted);
  white-space: nowrap;
}

/* ── ProgressTimeline — horizontal phase segments (Row 3, Card 2) ── */
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
}
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
}
.pt-seg-range {
  font-size: 11px;
  color: var(--dash-text-muted);
  white-space: nowrap;
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

/* ── Dashboard redesign — sidebar + header chrome + project health ──
   Mockup chrome. Re-declares .sidebar / header layout (later-wins per
   property; mobile position/transform from the base rule are preserved)
   and adds prefixed sb-* / tb-* / phealth-* classes. Tokens only. */

/* Sidebar shell */
.sidebar {
  display: flex;
  flex-direction: column;
  gap: 14px;
  height: 100%;
  padding: 16px 14px;
  background: var(--dash-bg);
  border-right: 1px solid var(--dash-border);
  box-sizing: border-box;
  overflow-y: auto;
}

/* Logo badge */
.sb-logo { display: flex; align-items: center; gap: 10px; padding: 2px 4px; }
.sb-logo-badge {
  width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: 16px; color: var(--dash-ink);
  background: linear-gradient(135deg, var(--dash-teal), var(--dash-blue));
}
.sb-logo-word { font-size: 16px; font-weight: 700; color: var(--dash-text); letter-spacing: -0.01em; }

/* Project switcher */
.sb-switcher {
  display: flex; align-items: center; gap: 8px; width: 100%;
  padding: 9px 11px; border-radius: 10px;
  background: var(--dash-card); border: 1px solid var(--dash-border);
  color: var(--dash-text); font-size: 13px; font-weight: 600;
  cursor: pointer; text-align: left;
  transition: border-color 0.15s, background 0.15s;
}
.sb-switcher:hover { border-color: var(--dash-teal); }
.sb-switcher-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--dash-teal); flex-shrink: 0; }
.sb-switcher-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sb-switcher-chev { color: var(--dash-text-muted); font-size: 11px; }

/* Vertical nav */
.sb-nav { display: flex; flex-direction: column; gap: 2px; }
.sb-nav-link {
  display: flex; align-items: center; gap: 11px; width: 100%;
  padding: 9px 11px; border-radius: 9px;
  background: transparent; border: 0;
  color: var(--dash-text-muted); font-size: 13px; font-weight: 500;
  cursor: pointer; text-align: left;
  transition: background 0.15s, color 0.15s;
}
.sb-nav-link:hover { background: var(--dash-hover); color: var(--dash-text); }
.sb-nav-link.active { background: rgba(45, 212, 191, 0.12); color: var(--dash-text); font-weight: 600; }
.sb-nav-link.active .sb-nav-ic { color: var(--dash-teal); }
.sb-nav-ic { display: inline-flex; color: var(--dash-text-muted); }
.sb-nav-label { flex: 1; }

/* Health mini-card — pushed toward the bottom above the profile */
.sb-health { margin-top: auto; }

/* Project Health card */
.phealth {
  display: flex; flex-direction: column; gap: 8px;
  padding: 14px; border-radius: 12px;
  background: var(--dash-card); border: 1px solid var(--dash-border);
}
.phealth-title { margin: 0; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--dash-text-muted); }
.phealth-head { display: flex; align-items: baseline; gap: 8px; }
.phealth-pct { font-size: 26px; font-weight: 800; line-height: 1; color: var(--dash-text); }
.phealth-pct-sign { font-size: 14px; font-weight: 700; margin-left: 1px; color: var(--dash-text-muted); }
.phealth-label { font-size: 12px; font-weight: 600; }
.phealth--good .phealth-label { color: var(--dash-teal); }
.phealth--warn .phealth-label { color: var(--dash-sev-medium); }
.phealth--risk .phealth-label { color: var(--dash-sev-high); }
.phealth-spark { width: 100%; height: 36px; display: block; }
.phealth-spark-line { fill: none; stroke-width: 2; vector-effect: non-scaling-stroke; }
.phealth--good .phealth-spark-line { stroke: var(--dash-teal); }
.phealth--warn .phealth-spark-line { stroke: var(--dash-sev-medium); }
.phealth--risk .phealth-spark-line { stroke: var(--dash-sev-high); }
.phealth-spark-area { stroke: none; opacity: 0.14; }
.phealth--good .phealth-spark-area { fill: var(--dash-teal); }
.phealth--warn .phealth-spark-area { fill: var(--dash-sev-medium); }
.phealth--risk .phealth-spark-area { fill: var(--dash-sev-high); }

/* Profile footer */
.sb-profile {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 8px; border-top: 1px solid var(--dash-border);
}
.sb-avatar {
  width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; color: var(--dash-ink);
  background: linear-gradient(135deg, var(--dash-purple), var(--dash-blue));
}
.sb-profile-meta { display: flex; flex-direction: column; min-width: 0; }
.sb-profile-name { font-size: 13px; font-weight: 600; color: var(--dash-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sb-profile-email { font-size: 11px; color: var(--dash-text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* Header (Topbar) */
.topbar {
  display: flex; align-items: center; gap: 16px; height: 100%;
  padding: 0 20px;
  background: var(--dash-bg);
  border-bottom: 1px solid var(--dash-border);
  box-sizing: border-box;
}
.tb-greeting { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.tb-welcome { margin: 0; font-size: 15px; font-weight: 700; line-height: 1.2; color: var(--dash-text); white-space: nowrap; }
.tb-wave { display: inline-block; }
.tb-sub { margin: 0; font-size: 11px; line-height: 1.2; color: var(--dash-text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tb-actions { display: flex; align-items: center; gap: 10px; margin-left: auto; }
.tb-synced {
  display: flex; align-items: center; gap: 7px;
  padding: 6px 10px; border-radius: 8px;
  background: transparent; border: 0; cursor: pointer;
  font-size: 12px; color: var(--dash-text-muted);
}
.tb-synced:hover { color: var(--dash-text); }
.tb-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--dash-teal); box-shadow: 0 0 0 3px rgba(45, 212, 191, 0.18); flex-shrink: 0; }
.tb-synced--busy .tb-dot { background: var(--dash-blue); box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.18); animation: tb-pulse 0.8s ease-in-out infinite; }
@keyframes tb-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
.tb-btn {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 8px 13px; border-radius: 9px;
  background: var(--dash-card); border: 1px solid var(--dash-border);
  color: var(--dash-text); font-size: 13px; font-weight: 600;
  cursor: pointer; white-space: nowrap;
  transition: border-color 0.15s, background 0.15s, filter 0.15s;
}
.tb-btn:hover { border-color: var(--dash-teal); }
.tb-btn--primary {
  background: linear-gradient(135deg, var(--dash-teal), var(--dash-blue));
  border-color: transparent; color: var(--dash-ink);
}
.tb-btn--primary:hover { filter: brightness(1.05); border-color: transparent; }
.tb-btn--icon { padding: 8px 11px; }
.tb-kebab { font-size: 16px; line-height: 1; letter-spacing: 1px; }

@media (max-width: 760px) {
  .tb-sub { display: none; }
  .tb-synced { display: none; }
}

/* ════════════════════════════════════════════════════════════════════
   POLISH — chrome frame (app shell + sidebar + topbar + status bar).
   Appended LAST so it wins ties against earlier conflicting rules.
   Owner: p1-chrome agent. Scope: Sidebar / Topbar / App layout only.
   ════════════════════════════════════════════════════════════════════ */

:root {
  /* Sidebar surface — darker sibling of --dash-card per mockup spec
     ("Card surface: #0E1626 / #111A2E"); kept separate so the sidebar
     reads one step below the page base. */
  --dash-sidebar: #0E1626;
  /* Ink on accent-filled surfaces (logo badge, avatar, primary button,
     offline banner) — dark navy reads on the teal/blue gradient in both
     themes, so it has no light override. */
  --dash-ink: #06121F;
  /* Subtle hover overlay for nav items — theme-dependent direction
     (lighten on dark, darken on light). */
  --dash-hover: rgba(255, 255, 255, 0.04);
  /* Plain-text log view (OrchPanel) + xterm panel surround. The xterm
     canvas itself keeps its own dark JS theme — these style the chrome. */
  --dash-term-bg:   #050507;
  --dash-term-text: #C8D8C8;
  --dash-term-line: #A0C4A0;
  --dash-term-tool: #7CB8FF;
}

/* Light theme — same --dash-* tokens, light values. The chrome (and any
   card CSS built on these tokens) flips with the existing data-theme
   toggle; accents (teal/purple/blue/amber/severity) stay identical. */
[data-theme="light"] {
  --dash-bg:         #F4F6FB;
  --dash-card:       #FFFFFF;
  --dash-border:     #E2E8F0;
  --dash-text:       #1A2233;
  --dash-text-muted: #5B6B82;
  --dash-sidebar:    #FFFFFF;
  --dash-hover:      rgba(15, 23, 41, 0.05);
  --dash-term-bg:    #F1F5F9;
  --dash-term-text:  #334155;
  --dash-term-line:  #166534;
  --dash-term-tool:  #1D4ED8;
}

/* Frame: deep-navy base behind chrome AND content so the mockup palette
   is continuous (legacy body bg is near-black #08090a). */
.app-shell,
.main-scroll { background: var(--dash-bg); }

/* Content column: 64px header row (greeting + subtitle need the height),
   scrollable middle, auto-height status bar. Replaces the inline
   grid-template-rows that previously lived on #main-content in App.js. */
.content-area { grid-template-rows: 64px 1fr auto; }

/* Sidebar surface per mockup. */
.sidebar {
  background: var(--dash-sidebar);
  border-right: 1px solid var(--dash-border);
}

/* The legacy ".sidebar nav" rule (flex:1 + padding) outranks .sb-nav
   (element+class beats class) and breaks the chrome nav alignment.
   Re-assert: nav grows so the health card + profile hug the bottom. */
.sidebar nav.sb-nav {
  flex: 1 0 auto;
  padding: 0;
  gap: 2px;
}

/* Topbar: solid navy header — disable the legacy frosted-glass "header"
   element rule (rgba near-black + backdrop blur) that bleeds through. */
header.topbar {
  background: var(--dash-bg);
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  border-bottom: 1px solid var(--dash-border);
}
.tb-welcome { font-size: 17px; letter-spacing: -0.012em; }
.tb-sub { font-size: 12px; }

/* Status bar (was inline styles in App.js StatusBar). */
.statusbar {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  height: 24px;
  padding: 0 var(--space-4);
  background: var(--dash-sidebar);
  border-top: 1px solid var(--dash-border);
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  color: var(--dash-text-muted);
  white-space: nowrap;
  overflow: hidden;
}
.statusbar-dot {
  width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
  background: var(--dash-teal);
}
.statusbar-dot--offline { background: var(--dash-sev-high); }
.statusbar-dot--busy { animation: pulse-dot 1s ease-in-out infinite; }
.statusbar-path { overflow: hidden; text-overflow: ellipsis; }
.statusbar-version { margin-left: auto; }

/* Offline banner (was inline styles in App.js OfflineBanner). */
.offline-banner {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: var(--dash-sev-high);
  color: var(--dash-ink);
  font-size: var(--text-sm);
  font-weight: 600;
  border-radius: 8px;
}

/* ── Agent Sessions panel (OrchPanel) — themed on --dash-* tokens so it
   follows the light/dark toggle like the rest of the chrome. */
.orch-panel {
  background: var(--dash-sidebar);
  border-left: 1px solid var(--dash-border);
}
.orch-panel-header,
.orch-panel-footer,
.orch-files,
.orch-files-head {
  background: var(--dash-card);
  border-color: var(--dash-border);
}
.orch-panel-title { color: var(--dash-text); }
.orch-panel-close { color: var(--dash-text-muted); }
.orch-panel-close:hover { background: var(--dash-hover); color: var(--dash-text); }
.orch-tabs { background: var(--dash-sidebar); border-color: var(--dash-border); }
.orch-tab { color: var(--dash-text-muted); }
.orch-tab:hover { background: var(--dash-hover); color: var(--dash-text); }
.orch-tab.active { background: var(--dash-card); color: var(--dash-text); }
.orch-term-body { background: var(--dash-term-bg); }
.orch-term-empty,
.orch-empty-tab,
.orch-footer-status { color: var(--dash-text-muted); }
.kt-line { color: var(--dash-term-line); }
.kt-line.tool { color: var(--dash-term-tool); }
.kt-line.meta { color: var(--dash-text-muted); }
.kt-stream { color: var(--dash-term-text); }
.kt-file { color: var(--dash-text-muted); border-color: var(--dash-border); }
.orch-footer-btn {
  background: var(--dash-card);
  border: 1px solid var(--dash-border);
  color: var(--dash-text);
}
.orch-footer-btn:hover { background: var(--dash-card); border-color: var(--dash-teal); color: var(--dash-text); }

/* ── xterm terminal panel chrome — same treatment. The xterm canvas keeps
   its own dark JS theme (it is a real terminal); only the surround themes. */
.term-panel { background: var(--dash-term-bg); border-top-color: var(--dash-teal); }
.term-header { background: var(--dash-card); border-color: var(--dash-border); }
.term-title { color: var(--dash-text); }
.term-hint {
  background: var(--dash-card);
  border-color: var(--dash-border);
  color: var(--dash-text-muted);
}
.term-btn {
  background: var(--dash-card);
  border-color: var(--dash-border);
  color: var(--dash-text);
}
.term-btn:hover { background: var(--dash-card); border-color: var(--dash-teal); color: var(--dash-text); }
.term-pill {
  background: var(--dash-card);
  border-color: var(--dash-teal);
  color: var(--dash-text);
}

/* Mobile: the content column owns the full height (legacy 44px first row
   squashed it). Sidebar open/close uses the canonical .sidebar.open /
   #sidebar-backdrop.show classes from the base mobile block — App.js
   toggles those same names. */
@media (max-width: 768px) {
  .app-shell { grid-template-rows: 1fr; }
}
/* ============================================================
   TaskPipeline (tpipe-*) — per-task stage stepper
   Planned → In Progress → Review → Done. Rendered inside task
   rows (Tasks view via TaskCard) and the Overview In Progress
   card rows (mini variant). Appended by pipeline agent F1.
   ============================================================ */
.tpipe {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  flex: none;
  vertical-align: middle;
}
.tpipe-node {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  line-height: 1;
  font-weight: 700;
  flex: none;
  color: transparent;
  background: transparent;
  border: 1.5px solid var(--dash-sev-low, var(--text-muted));
}
.tpipe-node--done {
  background: var(--dash-teal, var(--accent-green));
  border-color: var(--dash-teal, var(--accent-green));
  color: var(--dash-bg, var(--bg-page));
}
.tpipe-node--current {
  border-color: var(--dash-purple, var(--accent-blue));
  animation: tpipe-pulse 1.6s ease-in-out infinite;
}
.tpipe-node--blocked {
  border-color: var(--dash-sev-high, var(--accent-red));
  animation: none;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--dash-sev-high, var(--accent-red)) 20%, transparent);
}
@keyframes tpipe-pulse {
  0%, 100% { box-shadow: 0 0 0 2px color-mix(in srgb, var(--dash-purple, var(--accent-blue)) 45%, transparent); }
  50%      { box-shadow: 0 0 0 5px color-mix(in srgb, var(--dash-purple, var(--accent-blue)) 12%, transparent); }
}
.tpipe-line {
  width: 14px;
  height: 2px;
  border-radius: 1px;
  flex: none;
  background: color-mix(in srgb, var(--dash-sev-low, var(--text-muted)) 45%, transparent);
}
.tpipe-line--done {
  background: var(--dash-teal, var(--accent-green));
}
.tpipe-blocked {
  flex: none;
  margin-left: 4px;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 600;
  line-height: 1.2;
  color: var(--dash-sev-high, var(--accent-red));
  background: color-mix(in srgb, var(--dash-sev-high, var(--accent-red)) 14%, transparent);
}
/* Mini variant — overview card rows */
.tpipe--mini { gap: 2px; }
.tpipe--mini .tpipe-node {
  width: 9px;
  height: 9px;
  border-width: 1px;
  font-size: 6px;
}
.tpipe--mini .tpipe-line { width: 8px; height: 1.5px; }
.tpipe--mini .tpipe-blocked { padding: 1px 5px; font-size: 9px; margin-left: 2px; }

/* ── Data-honesty states: card empty states + first-run hero ────────
   Shared by the Overview slot components when a slice is legitimately
   empty (no blockers, no phases, no decisions…) and by OverviewView's
   first-run state when no .rcode project exists. Theme variables only —
   valid in both dark and [data-theme=light]. */
.dash-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 24px 12px;
  text-align: center;
  color: var(--dash-text-muted);
  font-size: 12px;
}
.dash-empty-emoji { font-size: 20px; line-height: 1; }
.dash-empty-hint {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--dash-text);
  background: var(--dash-hover);
  border: 1px solid var(--dash-border);
  border-radius: 6px;
  padding: 3px 8px;
}
/* Decision row without a recorded status — muted dash, no fake badge. */
.rd-status-none { color: var(--dash-text-muted); font-size: 12px; }
/* Sidebar progress card before anything is tracked — neutral tone. */
.phealth--none .phealth-label { color: var(--dash-text-muted); }
/* Timeline card placeholder when no velocity history is recorded. */
.tl-nochart {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88px;
  color: var(--dash-text-muted);
  font-size: 12px;
  border: 1px dashed var(--dash-border);
  border-radius: 8px;
}
/* First-run hero — Overview when no .rcode project exists. */
.firstrun {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 64px 24px;
  text-align: center;
  background: var(--dash-card);
  border: 1px solid var(--dash-border);
  border-radius: 12px;
}
.firstrun-badge {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 800;
  color: #fff;
  background: linear-gradient(135deg, var(--dash-teal), var(--dash-purple));
}
.firstrun-title { margin: 0; font-size: 18px; font-weight: 700; color: var(--dash-text); }
.firstrun-sub { margin: 0; font-size: 13px; color: var(--dash-text-muted); max-width: 440px; line-height: 1.5; }
.firstrun-sub code { font-family: var(--font-mono); color: var(--dash-text); }
.firstrun-cmd {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--dash-teal);
  background: var(--dash-hover);
  border: 1px solid var(--dash-border);
  border-radius: 8px;
  padding: 6px 12px;
}
/* ── App loading shell — visible until /js/app.js boots (cleared by app.js) ── */
.app-loading {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 14px; min-height: 100vh; color: var(--dash-text-muted);
}
.app-loading-spinner {
  width: 28px; height: 28px; border-radius: 50%;
  border: 3px solid var(--dash-border); border-top-color: var(--dash-teal);
  animation: app-loading-spin 0.8s linear infinite;
}
.app-loading-text { font-size: 13px; margin: 0; }
@keyframes app-loading-spin { to { transform: rotate(360deg); } }

/* ── Inert project switcher — single-project server, no menu to open ── */
.sb-switcher--static { cursor: default; }
.sb-switcher--static:hover { border-color: var(--dash-border); }

/* Nav now lists all 12 views — let it scroll on short viewports instead of
   pushing the health card / profile footer off-screen. */
.sb-nav { overflow-y: auto; min-height: 0; }
/* ════════════════════════════════════════════════════════════════════
   R3 — accessibility baseline + failure visibility + mobile pass.
   Owner: r3-access agent. Appended last so it wins ties.
   ════════════════════════════════════════════════════════════════════ */

/* ── Focus indicators — keyboard-only (:focus-visible) for all interactive
   chrome. Both themes define --dash-teal, so the ring is visible on the
   dark and light surfaces alike. */
button:focus-visible,
a:focus-visible,
select:focus-visible,
input:focus-visible,
summary:focus-visible,
[role="button"]:focus-visible {
  outline: 2px solid var(--dash-teal, #2DD4BF);
  outline-offset: 2px;
  border-radius: 4px;
}
/* Clickable rows/cards get the ring inside their own radius. */
.item-clickable:focus-visible,
.cmd-hint-item:focus-visible {
  outline-offset: -2px;
}

/* ── Disabled run buttons (orchestrator unreachable) ── */
.card-run-btn:disabled,
.kanban-run-btn:disabled,
.cmd-runner-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* ── state.json parse-error banner (dismissible, role=alert) ── */
.parse-error-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-4);
  margin-bottom: var(--space-3);
  background: var(--accent-amber, #F59E0B);
  color: var(--dash-ink, #06121F);
  font-size: var(--text-sm);
  font-weight: 600;
  border-radius: 8px;
}
.banner-dismiss {
  flex: none;
  background: none;
  border: none;
  cursor: pointer;
  color: inherit;
  font-size: var(--text-sm);
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
}
.banner-dismiss:hover { background: rgba(0,0,0,0.12); /* intentional: dim overlay on amber; alpha can't be a theme token */ }

/* ── Orchestrator-down banner (Orchestration view) ── */
.orch-down-banner {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  margin: var(--space-3) 0;
  background: color-mix(in srgb, var(--dash-sev-high, var(--accent-red)) 14%, transparent);
  border: 1px solid var(--dash-sev-high, var(--accent-red));
  color: var(--dash-text, var(--text-primary));
  font-size: var(--text-sm);
  font-weight: 600;
  border-radius: 8px;
}

/* ── Mobile pass (≤768px) — redesigned chrome + overview grid ──
   Cards already stack via the ≤1100px .dash-grid rule; this tightens
   spacing and keeps the topbar on one row without horizontal scroll. */
@media (max-width: 768px) {
  .main-scroll { padding: 14px 12px; }
  .dash-grid { gap: 14px; }
  header { padding: 0 var(--space-4); }
  .tb-greeting { min-width: 0; }
  .tb-welcome { font-size: 14px; overflow: hidden; text-overflow: ellipsis; }
  .tb-actions { gap: 6px; }
  .tb-btn--share { display: none; }
  /* Slide-in sidebar sits above the backdrop; backdrop above content. */
  .sidebar { z-index: 30; }
  #sidebar-backdrop { z-index: 25; }
}

/* ══════════════════════════════════════════════════════════════════
   FILE READER — shared slide-over for Files + Memory views
   (components/FileReader.js)
   ══════════════════════════════════════════════════════════════════ */
.reader-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45); /* intentional: one-off overlay tint; translucency can't be expressed as a theme token */
  z-index: 220;
}
.reader-panel {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(720px, 92vw);
  display: flex;
  flex-direction: column;
  background: var(--bg-elev-2);
  border-left: 1px solid var(--border-default);
  box-shadow: -12px 0 32px rgba(0,0,0,0.35); /* intentional: overlay shadow; alpha can't be a theme token */
  z-index: 221;
}
/* ════════════════════════════════════════════════════════════════════
   AGENTS VIEW v2 — sectioned card grid + agent detail drawer
   (appended block — theme variables only, valid in dark and
   [data-theme=light]. Per-role color comes from --agent-accent, set by
   the agent-accent--<type> variants on the card/drawer root.)
   ════════════════════════════════════════════════════════════════════ */

/* Per-role accent variants — hue tokens are theme-stable in both modes. */
.agent-accent--leadership  { --agent-accent: var(--accent-primary); }
.agent-accent--engineering { --agent-accent: var(--accent-green); }
.agent-accent--product     { --agent-accent: var(--accent-blue); }
.agent-accent--design      { --agent-accent: var(--violet); }
.agent-accent--quality     { --agent-accent: var(--accent-amber); }
.agent-accent--support     { --agent-accent: var(--dash-teal); }
.agent-accent--system      { --agent-accent: var(--dash-sev-low); }

/* ── Search bar (same chrome as Files) + result count ── */
.agent-filter-bar {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}
.agent-count {
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  color: var(--text-muted);
  white-space: nowrap;
}

/* ── Category sections with sticky headers ── */
.agent-section-head {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-2);
  margin-top: var(--space-4);
  background: var(--bg-page);
  border-bottom: 1px solid var(--border-subtle);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: 0.07em;
}
.agent-section-count {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  font-weight: 400;
  color: var(--text-muted);
}

/* ── Card grid ── */
.agent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: var(--space-4);
  padding: var(--space-4) 0 var(--space-3);
}

/* ── Card — overrides the base .agent-card block: hover lift + accent ── */
.agent-card {
  cursor: pointer;
  display: flex;
  flex-direction: column;
  transition: transform 0.15s var(--ease), box-shadow 0.15s var(--ease),
              border-color 0.15s var(--ease), background 0.15s var(--ease);
}
.agent-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.30); /* intentional: shadows stay dark in both themes, like --shadow-lg */
  border-color: color-mix(in srgb, var(--agent-accent, var(--accent-primary)) 45%, var(--border-default));
}
.agent-card:focus-visible {
  outline: none;
  border-color: var(--agent-accent, var(--accent-primary));
}
.agent-card-top {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  min-width: 0;
}
.agent-card-id {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
}
.agent-card-name {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.006em;
}
.agent-card-arabic {
  align-self: flex-start;
  font-size: var(--text-md);
  color: color-mix(in srgb, var(--agent-accent, var(--accent-primary)) 75%, var(--text-tertiary));
  line-height: 1.2;
}
.agent-card-desc {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: var(--space-3) 0 0;
  font-size: var(--text-2xs);
  line-height: 1.45;
  color: var(--text-tertiary);
}

/* ── Avatar circle with initials ── */
.agent-avatar {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: 0.02em;
  background: color-mix(in srgb, var(--agent-accent, var(--accent-primary)) 16%, transparent);
  color: var(--agent-accent, var(--accent-primary));
  border: 1px solid color-mix(in srgb, var(--agent-accent, var(--accent-primary)) 32%, transparent);
}
.agent-avatar--lg {
  width: 44px;
  height: 44px;
  font-size: var(--text-sm);
}

/* ── Role badge — tinted by the per-role accent ── */
.role-badge {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--text-2xs);
  font-weight: 500;
  padding: 1px 6px;
  border-radius: var(--radius-1);
  background: color-mix(in srgb, var(--agent-accent, var(--accent-primary)) 12%, transparent);
  color: color-mix(in srgb, var(--agent-accent, var(--accent-primary)) 80%, var(--text-primary));
  border: 1px solid color-mix(in srgb, var(--agent-accent, var(--accent-primary)) 28%, transparent);
  letter-spacing: -0.006em;
}

/* ── Frontmatter chips — model + tools, shared by cards and drawer ── */
.agent-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: var(--space-3);
}
.agent-chip {
  font-size: var(--text-2xs);
  font-family: var(--font-mono);
  padding: 1px 6px;
  border-radius: var(--radius-full);
  background: var(--bg-hover);
  color: var(--text-secondary);
  border: 1px solid var(--border-subtle);
  white-space: nowrap;
}
.agent-chip--model {
  color: var(--accent-hover);
  border-color: var(--accent-border);
}
.agent-chip--more { color: var(--text-muted); }

/* ── Detail drawer — fixed right panel above the mobile sidebar (z 30) ── */
.agent-drawer-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45); /* intentional: one-off overlay tint; translucency can't be expressed as a theme token */
  z-index: 50;
}
.agent-drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(720px, 92vw);
  display: flex;
  flex-direction: column;
  background: var(--bg-elev-2);
  border-left: 1px solid var(--border-default);
  box-shadow: -12px 0 32px rgba(0,0,0,0.35); /* intentional: overlay shadow; alpha can't be a theme token */
  z-index: 221;
}
.reader-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-5);
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
}
.reader-heading { min-width: 0; }
.reader-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.reader-path {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: 0;
}
.reader-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-shrink: 0;
}
.reader-copy {
  font-size: var(--text-2xs);
  font-family: var(--font-mono);
  padding: var(--space-1) var(--space-3);
  background: var(--bg-elev-3);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-3);
  color: var(--text-secondary);
  cursor: pointer;
  letter-spacing: 0;
  transition: background var(--t-fast) var(--ease), color var(--t-fast) var(--ease);
}
.reader-copy:hover { background: var(--bg-hover); color: var(--text-primary); }
.reader-close {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-3);
  color: var(--text-secondary);
  font-size: var(--text-md);
  line-height: 1;
  cursor: pointer;
  transition: background var(--t-fast) var(--ease), color var(--t-fast) var(--ease);
}
.reader-close:hover { background: var(--bg-hover); color: var(--text-primary); }
.reader-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-5);
}
.reader-error {
  color: var(--accent-red);
  font-size: var(--text-xs);
  padding: var(--space-4);
}
.reader-skel-line { margin-bottom: var(--space-3); }
.reader-skel-block { height: 200px; }
@media (max-width: 768px) {
  .reader-panel { width: 100vw; border-left: none; }
}
.agent-drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(560px, 92vw);
  display: flex;
  flex-direction: column;
  background: var(--bg-elev-1);
  border-left: 1px solid var(--border-default);
  box-shadow: var(--shadow-lg);
  z-index: 51;
  animation: agent-drawer-in 0.18s var(--ease);
}
@keyframes agent-drawer-in {
  from { transform: translateX(24px); opacity: 0; }
  to   { transform: translateX(0);    opacity: 1; }
}
.agent-drawer-head {
  display: flex;
  align-items: flex-start;
  gap: var(--space-4);
  padding: var(--space-5) var(--space-5) var(--space-4);
  border-bottom: 1px solid var(--border-subtle);
}
.agent-drawer-titles {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-2);
}
.agent-drawer-name {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: var(--text-md);
  font-weight: 600;
  color: var(--text-primary);
}
.agent-drawer-arabic {
  font-size: var(--text-md);
  color: var(--agent-accent, var(--accent-primary));
  font-weight: 400;
}
.agent-drawer-close {
  flex-shrink: 0;
  width: var(--size-icon-btn, 28px);
  height: var(--size-icon-btn, 28px);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-lg);
  line-height: 1;
  color: var(--text-muted);
  background: transparent;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-2);
  cursor: pointer;
  transition: color var(--t-fast) var(--ease), border-color var(--t-fast) var(--ease);
}
.agent-drawer-close:hover {
  color: var(--text-primary);
  border-color: var(--border-default);
}

/* Meta row — file path + copy + jump-to-Files actions */
.agent-drawer-meta {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-5);
  border-bottom: 1px solid var(--border-subtle);
  background: var(--bg-elev-2);
}
.agent-drawer-meta-path {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  color: var(--text-muted);
}
.agent-drawer-btn {
  flex-shrink: 0;
  padding: 2px 8px;
  font-size: var(--text-2xs);
  font-family: var(--font-sans);
  color: var(--text-secondary);
  background: transparent;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-2);
  cursor: pointer;
  white-space: nowrap;
  transition: color var(--t-fast) var(--ease), border-color var(--t-fast) var(--ease);
}
.agent-drawer-btn:hover {
  color: var(--text-primary);
  border-color: var(--border-strong);
}
.agent-drawer-btn--link {
  color: var(--accent-hover);
  border-color: var(--accent-border);
}
.agent-drawer-btn--link:hover {
  color: var(--accent-hover);
  border-color: var(--accent-hover);
}

.agent-drawer-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: var(--space-4) var(--space-5);
}
.agent-drawer-skeleton { height: 200px; }
.agent-drawer-empty,
.agent-drawer-error {
  padding: var(--space-4);
  font-size: var(--text-sm);
  color: var(--text-tertiary);
}
.agent-drawer-error { color: var(--accent-red); }
/* ════════ RunnerPicker — runner + model picker popover (BEGIN) ════════
   Anchored under the clicked Run button via --rp-x/--rp-y custom
   properties set from the component ref (no inline style attribute).
   Built entirely on theme tokens, so it follows dark and
   [data-theme="light"] automatically. z-index sits above the terminal
   panel (201) and below the toast (1000). */
.runner-picker {
  position: fixed;
  /* Default off-screen until the component measures + clamps to viewport. */
  left: var(--rp-x, -9999px);
  top:  var(--rp-y, -9999px);
  z-index: 900;
  width: 248px;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--bg-elev-3);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-4);
  box-shadow: var(--shadow-lg);
}
.runner-picker-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.runner-picker-hint {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
}
.runner-picker-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.runner-picker-label {
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--text-tertiary);
}
.runner-picker-select {
  width: 100%;
  padding: 6px 8px;
  background: var(--bg-input);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-3);
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: var(--text-xs);
}
.runner-picker-select:focus {
  outline: none;
  border-color: var(--accent-border);
}

/* Runner option list — buttons instead of a <select> so each row can carry
   a Beta pill and unavailable rows can show their reason inline. */
.runner-picker-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 220px;
  overflow-y: auto;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-3);
  background: var(--bg-input);
  padding: 3px;
}
.runner-picker-option {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  padding: 5px 8px;
  background: transparent;
  border: none;
  border-radius: var(--radius-2);
  color: var(--text-secondary);
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  text-align: left;
  cursor: pointer;
}
.runner-picker-option:hover:not(:disabled) {
  background: var(--bg-hover);
  color: var(--text-primary);
}
.runner-picker-option.selected {
  background: var(--accent-bg);
  color: var(--text-primary);
}
.runner-picker-option:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.runner-picker-option-label {
  flex: 0 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.runner-picker-option-hint {
  margin-left: auto;
  color: var(--text-muted);
  font-size: 10px;
  white-space: nowrap;
}
/* "Beta" pill — every runner except claude (the first-class default). */
.runner-beta-pill {
  flex: 0 0 auto;
  padding: 0 5px;
  background: color-mix(in srgb, var(--amber) 16%, transparent);
  border: 1px solid color-mix(in srgb, var(--amber) 45%, transparent);
  border-radius: var(--radius-full);
  color: var(--amber);
  font-size: 9px;
  font-weight: 600;
  line-height: 14px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.runner-picker-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}
.runner-picker-btn {
  padding: 5px 12px;
  background: var(--bg-elev-2);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-3);
  color: var(--text-secondary);
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  font-weight: 500;
  cursor: pointer;
}
.runner-picker-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}
.runner-picker-btn--run {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  color: #fff;
}
.runner-picker-btn--run:hover {
  background: var(--accent-hover);
  color: #fff;
}
.runner-picker-btn--run:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Runner badge — which CLI/model launched a session (Orchestration cards). */
.runner-badge {
  display: inline-flex;
  align-items: center;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 1px 7px;
  background: var(--accent-bg);
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-full);
  color: var(--text-secondary);
  font-family: var(--font-mono);
  font-size: 10px;
  line-height: 16px;
}
/* ════════ RunnerPicker (END) ════════ */

/* ── Status summary bar ────────────────────────────────────────── */
.summary-bar {
  display: flex;
  flex-direction: row;
  gap: var(--space-4);
  flex-wrap: wrap;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border-subtle);
}
.summary-group {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: var(--space-2);
}
.summary-group-label {
  font-size: var(--text-2xs);
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.summary-count-chip {
  display: inline-flex;
  gap: 4px;
  font-size: var(--text-2xs);
  padding: 2px var(--space-2);
  border-radius: var(--radius-3);
  background: var(--bg-elev-3);
  border: 1px solid var(--border-subtle);
}
.summary-count-chip.complete { color: var(--accent-green); }
.summary-count-chip.active   { color: var(--accent-blue); }
.summary-count-chip.blocked  { color: var(--accent-red); }
.summary-count-chip.planned,
.summary-count-chip.todo     { color: var(--text-secondary); }
/* Session status chips — use sessionChip() vocabulary, not chip() */
.summary-count-chip.sess-running  { color: var(--accent-blue); }
.summary-count-chip.sess-starting { color: var(--amber); }
.summary-count-chip.sess-stopped  { color: var(--text-secondary); }
.summary-count-chip.sess-error    { color: var(--accent-red); }

/* ── Filter chips ────────────────────────────────────────────────── */
.filter-chips {
  display: flex;
  flex-direction: row;
  gap: var(--space-3);
  flex-wrap: wrap;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border-subtle);
}
.filter-chip-group {
  display: flex;
  flex-direction: row;
  gap: var(--space-1);
  align-items: center;
}
.filter-chip {
  font-size: var(--text-2xs);
  padding: 3px var(--space-3);
  border-radius: var(--radius-4);
  border: 1px solid var(--border-default);
  background: var(--bg-input);
  color: var(--text-secondary);
  cursor: pointer;
  transition: border-color var(--t-fast) var(--ease), color var(--t-fast) var(--ease);
}
.filter-chip:hover { border-color: var(--accent-primary); }
.filter-chip.active {
  background: var(--accent-primary);
  color: #fff;
  border-color: var(--accent-primary);
}
.filter-chip-clear {
  font-size: var(--text-2xs);
  padding: 3px var(--space-3);
  border-radius: var(--radius-4);
  border: 1px solid var(--border-default);
  background: var(--bg-input);
  color: var(--text-muted);
  cursor: pointer;
  transition: border-color var(--t-fast) var(--ease), color var(--t-fast) var(--ease);
}
.filter-chip-clear:disabled { opacity: 0.4; cursor: default; }

/* ── Command palette (Sprint 36.1 — DSH-4) ─────────────────────────────────
   z-index reference: #orch-panel slide-in = 50, xterm term-backdrop = 200,
   xterm term-panel/term-pill = 201, .toast notification layer = 1000.
   1100 places the palette overlay above every stacking context, including
   the toast layer (pointer-events:none but must still paint beneath us). */
.cmd-palette-overlay {
  position: fixed;
  inset: 0;
  z-index: 1100;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 15vh;
  background: rgba(0, 0, 0, 0.45);
}
.cmd-palette {
  width: 90%;
  max-width: 560px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
  overflow: hidden;
}
.cmd-palette-search {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border);
}
.cmd-palette-search-icon {
  color: var(--text-muted);
  flex-shrink: 0;
}
.cmd-palette-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-primary);
  font-size: var(--text-sm);
}
.cmd-palette-list {
  max-height: 50vh;
  overflow-y: auto;
}
.cmd-palette-group {
  font-size: var(--text-2xs);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  padding: var(--space-3) var(--space-4) var(--space-1);
}
.cmd-palette-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  background: transparent;
  border: none;
  color: var(--text-primary);
  text-align: left;
  cursor: pointer;
  padding: var(--space-2) var(--space-4);
  font-size: var(--text-sm);
}
.cmd-palette-item:hover,
.cmd-palette-item.active { background: var(--bg-hover); }
.cmd-palette-cmd {
  font-size: var(--text-2xs);
  color: var(--text-muted);
  font-family: var(--font-mono);
}
.cmd-palette-empty {
  text-align: center;
  color: var(--text-muted);
  padding: var(--space-6) var(--space-4);
  font-size: var(--text-sm);
}
/* ════════ Command palette (END) ════════ */

/* ── Reject dialog ── */
.reject-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: center;
}
.reject-dialog {
  background: var(--bg-elev-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-3);
  box-shadow: var(--shadow-lg);
  padding: var(--space-5);
  width: min(480px, 90vw);
}
.reject-dialog-title {
  font-size: var(--text-md);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--space-3);
}
.reject-dialog-input {
  width: 100%;
  min-height: 96px;
  background: var(--bg-input);
  color: var(--text-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-2);
  padding: var(--space-2);
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  resize: vertical;
  box-sizing: border-box;
}
.reject-dialog-input:focus { outline: none; border-color: var(--accent-primary); }
.reject-dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  margin-top: var(--space-4);
}
.reject-cancel {
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 var(--space-4);
  background: transparent;
  border: 1px solid var(--border);
  border-radius: var(--radius-3);
  color: var(--text-secondary);
  font-size: var(--text-xs);
  font-weight: 500;
  font-family: var(--font-sans);
  cursor: pointer;
  transition: background var(--t-fast) var(--ease), color var(--t-fast) var(--ease);
}
.reject-cancel:hover { background: var(--bg-hover); color: var(--text-primary); }
.reject-submit {
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 var(--space-4);
  background: transparent;
  border: 1px solid rgba(255,107,107,0.4);
  border-radius: var(--radius-3);
  color: #ff6b6b;
  font-size: var(--text-xs);
  font-weight: 500;
  font-family: var(--font-sans);
  cursor: pointer;
  transition: background var(--t-fast) var(--ease), opacity var(--t-fast) var(--ease);
}
.reject-submit:hover:not(:disabled) { background: rgba(255,107,107,0.12); }
.reject-submit:disabled { opacity: 0.5; cursor: not-allowed; }
.orch-card-rejection {
  margin-top: var(--space-2);
  font-size: var(--text-xs);
  color: var(--accent-red);
  border-left: 2px solid var(--accent-red);
  padding-left: var(--space-2);
}
/* ── Reject dialog (END) ── */

/* ════════ Sidebar health badges (36-2) ════════ */
.sidebar-health {
  display: flex;
  flex-direction: row;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border-bottom: 1px solid var(--border-subtle);
  flex-wrap: wrap;
}
.health-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--text-2xs);
  padding: 2px var(--space-2);
  border-radius: var(--radius-2);
  background: var(--bg-elev-2);
  color: var(--text-secondary);
  white-space: nowrap;
  user-select: none;
}
/* Non-zero blocker state — flag with amber to draw attention */
.health-badge--alert {
  color: var(--accent-amber);
}
/* Zero count — de-emphasise so it reads as "all clear", not an alarm */
.health-badge--zero {
  color: var(--text-muted);
  opacity: 0.6;
}
/* ════════ Sidebar health badges (END) ════════ */

/* ════════ Live session join — tasks/kanban/overview (l1-livetasks) ════════ */
/* Self-contained: own keyframes, no dependencies on other blocks. */
@keyframes live-session-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%      { opacity: 0.35; transform: scale(0.75); }
}
/* Pulsing green dot — marks anything backed by a live orchestrator session */
.live-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent-green);
  animation: live-session-pulse 1.1s ease-in-out infinite;
  flex-shrink: 0;
}
/* Overview In Progress card — clickable live-session rows (above scanned tasks) */
.ip-live-row {
  cursor: pointer;
  border-radius: var(--radius-2);
}
.ip-live-row:hover,
.ip-live-row:focus-visible {
  background: rgba(63, 185, 80, 0.08);
}
.ip-live-title {
  font-weight: 500;
  color: var(--accent-green);
}
.ip-live-elapsed {
  flex: none;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: var(--text-muted);
}
/* TaskPipeline current node pulses while a live session runs for the task */
.tpipe-node--live {
  animation: live-session-pulse 1.1s ease-in-out infinite;
}
/* Donut subtitle "· N running now" fragment */
.donut-live {
  color: var(--accent-green);
  font-weight: 600;
}
/* ════════ Live session join (END) ════════ */
/* ════════ Blocked-session notifications (l2-notify) (BEGIN) ════════
   Self-contained block: status-dot palette (teal running / amber blocked /
   gray exited), topbar bell + dropdown, persistent blocked toasts.
   Theme variables only — valid in dark and [data-theme=light]. */

@keyframes nb-pulse {
  0%   { opacity: 1; }
  50%  { opacity: 0.35; }
  100% { opacity: 1; }
}

/* Status dots — teal pulse running, amber blocked, gray exited. Overrides the
   earlier .term-status-dot palette via cascade (this block loads last). */
.term-status-dot.running { background: var(--dash-teal); animation: nb-pulse 1.5s infinite; }
.term-status-dot.blocked { background: var(--accent-amber); animation: nb-pulse 1s infinite; }
.term-status-dot.waiting { background: var(--accent-amber); animation: nb-pulse 1s infinite; }
.term-status-dot.exited  { background: var(--text-muted); animation: none; }
.tab-status-dot.blocked  { background: var(--accent-amber); animation: nb-pulse 1s infinite; }

/* Blocked session card accent in the Orchestration grid */
.orch-card.orch-blocked {
  border-color: var(--accent-amber);
  box-shadow: 0 0 0 1px var(--accent-amber) inset;
}

/* ── Topbar bell ── */
.nb-bell-wrap { position: relative; display: inline-flex; }
.nb-bell { position: relative; }
.nb-bell--alert { color: var(--accent-amber); }
.nb-bell-count {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 14px;
  height: 14px;
  padding: 0 3px;
  border-radius: var(--radius-full);
  background: var(--accent-amber);
  color: var(--bg-page);
  font-size: 10px;
  font-weight: 700;
  line-height: 14px;
  text-align: center;
  pointer-events: none;
}
.nb-bell-dropdown {
  position: absolute;
  top: calc(100% + var(--space-2));
  right: 0;
  z-index: 1100;
  min-width: 260px;
  max-width: 360px;
  background: var(--bg-elev-2);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-4);
  box-shadow: var(--shadow-lg);
  padding: var(--space-2);
}
.nb-bell-title {
  font-size: var(--text-2xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-tertiary);
  padding: var(--space-2) var(--space-3);
}
.nb-bell-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  padding: var(--space-2) var(--space-3);
  background: transparent;
  border: none;
  border-radius: var(--radius-2);
  color: var(--text-primary);
  font-size: var(--text-xs);
  font-family: var(--font-sans);
  text-align: left;
  cursor: pointer;
}
.nb-bell-item:hover { background: var(--bg-hover); }
.nb-bell-item-id { font-weight: 600; white-space: nowrap; }
.nb-bell-item-cmd {
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Persistent blocked toasts ── */
.nb-toasts {
  position: fixed;
  bottom: var(--space-6);
  right: var(--space-6);
  z-index: 1200;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  max-width: 380px;
}
.nb-toast {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--bg-elev-3);
  border: 1px solid var(--accent-amber);
  border-radius: var(--radius-4);
  box-shadow: var(--shadow-lg);
  color: var(--text-primary);
  font-size: var(--text-xs);
  cursor: pointer;
}
.nb-toast:hover { background: var(--bg-hover); }
.nb-toast-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent-amber);
  animation: nb-pulse 1s infinite;
  flex-shrink: 0;
}
.nb-toast-text { display: flex; flex-direction: column; gap: var(--space-1); min-width: 0; }
.nb-toast-cmd {
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.nb-toast-dismiss {
  margin-left: auto;
  background: transparent;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  padding: var(--space-1);
  border-radius: var(--radius-1);
  flex-shrink: 0;
}
.nb-toast-dismiss:hover { color: var(--text-primary); background: var(--bg-active); }
/* ════════ Blocked-session notifications (l2-notify) (END) ════════ */
/* ════════ Living overview cards (l3-cards) ════════ */
/* Hover/keyboard affordance for clickable card rows + timeline segments.
   Applied alongside existing row classes; self-contained — only .ovr-link
   selectors live here. */
.ovr-link {
  cursor: pointer;
  border-radius: var(--radius-2);
  transition: background var(--t-fast) var(--ease);
}
.ovr-link:hover { background: var(--bg-hover); }
.ovr-link:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 1px;
}
/* "Up Next" pill on the Current Phase card — amber, distinct from the
   active-phase pill, so an upcoming phase never reads as in-flight. */
.cp-pill--next {
  color: var(--accent-amber);
  border-color: var(--accent-amber);
}
/* Milestone outlook (Target Launch card without a configured launch_date). */
.tl-outlook-name {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 var(--space-2);
}
.tl-outlook {
  list-style: none;
  margin: 0 0 var(--space-2);
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.tl-outlook-row {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  font-size: var(--text-xs);
}
.tl-outlook-key { color: var(--text-muted); }
.tl-outlook-val { color: var(--text-secondary); font-weight: 500; }
.tl-outlook-hint {
  margin: var(--space-2) 0 0;
  font-size: var(--text-2xs);
  color: var(--text-muted);
}
.tl-outlook-hint code {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  color: var(--text-secondary);
}
/* ════════ Living overview cards (END) ════════ */

/* ════════ Phase dependency graph (PhaseGraph.js) ════════
   Status colors are --pg-* tokens scoped to the panel so both themes flip
   them without touching the global token block. */
.pg-panel {
  --pg-done:    #2dd4bf; /* teal   */
  --pg-active:  #a78bfa; /* purple */
  --pg-todo:    var(--text-muted);
  --pg-blocked: var(--amber);
  margin-bottom: var(--space-4);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-4);
  background: var(--bg-elev-1);
}
[data-theme="light"] .pg-panel {
  --pg-done:   #0d9488;
  --pg-active: #7c3aed;
}
.pg-panel summary {
  padding: var(--space-3) var(--space-5);
  font-size: var(--text-xs);
  color: var(--text-secondary);
  cursor: pointer;
  user-select: none;
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.pg-panel summary:hover { background: var(--bg-hover); }
.pg-count {
  margin-left: auto;
  font-size: var(--text-2xs);
  color: var(--text-muted);
}
.pg-legend {
  display: flex;
  align-items: center;
  gap: var(--space-5);
  padding: 0 var(--space-5) var(--space-3);
  font-size: var(--text-2xs);
  color: var(--text-tertiary);
}
.pg-legend-item {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}
.pg-swatch {
  width: 10px;
  height: 10px;
  border-radius: var(--radius-1);
  background: var(--bg-elev-3);
  border: 1.5px solid var(--pg-todo);
}
.pg-swatch.pg-done    { border-color: var(--pg-done); }
.pg-swatch.pg-active  { border-color: var(--pg-active); }
.pg-swatch.pg-blocked { border-color: var(--pg-blocked); }

/* DAG mode — horizontal scroll when the graph is wider than the panel. */
.pg-scroll {
  overflow-x: auto;
  padding: 0 var(--space-3) var(--space-3);
}
.pg-svg { display: block; }
.pg-node { cursor: pointer; }
.pg-node rect {
  fill: var(--bg-elev-2);
  stroke: var(--pg-todo);
  stroke-width: 1.5;
  transition: opacity var(--t-fast) var(--ease);
}
.pg-node.pg-done rect    { stroke: var(--pg-done); }
.pg-node.pg-active rect  { stroke: var(--pg-active); animation: pg-pulse 2s var(--ease) infinite; }
.pg-node.pg-blocked rect { stroke: var(--pg-blocked); }
@keyframes pg-pulse {
  0%, 100% { stroke-opacity: 1;   stroke-width: 1.5; }
  50%      { stroke-opacity: 0.45; stroke-width: 2.5; }
}
.pg-label {
  fill: var(--text-primary);
  font-size: var(--text-2xs);
  font-weight: 600;
  pointer-events: none;
}
.pg-sublabel {
  fill: var(--text-secondary);
  font-size: 10px;
  pointer-events: none;
}
.pg-edge {
  stroke: var(--text-tertiary);
  stroke-width: 1.5;
  fill: none;
  transition: opacity var(--t-fast) var(--ease);
}
.pg-arrow { fill: var(--text-tertiary); }
/* Hovering a node spotlights its ancestors + descendants, dims the rest. */
.pg-hovering .pg-node:not(.pg-related) { opacity: 0.22; }
.pg-hovering .pg-edge:not(.pg-related) { opacity: 0.12; }
.pg-edge.pg-related { stroke: var(--accent-primary); stroke-width: 2; }
.pg-tip rect {
  fill: var(--bg-elev-3);
  stroke: var(--border-strong);
  stroke-width: 1;
}
.pg-tip text { font-size: var(--text-2xs); fill: var(--text-secondary); pointer-events: none; }
.pg-tip .pg-tip-title { fill: var(--text-primary); font-weight: 600; }

/* Flow-row mode — no cross-phase dependencies: wrapped chip sequence. */
.pg-flow {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  padding: 0 var(--space-5) var(--space-2);
}
.pg-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  max-width: 220px;
  padding: var(--space-2) var(--space-3);
  border: 1.5px solid var(--pg-todo);
  border-radius: var(--radius-3);
  background: var(--bg-elev-2);
  color: var(--text-secondary);
  font-size: var(--text-2xs);
  font-family: var(--font-sans);
  cursor: pointer;
  transition: background var(--t-fast) var(--ease);
}
.pg-chip:hover { background: var(--bg-hover); }
.pg-chip.pg-done    { border-color: var(--pg-done); }
.pg-chip.pg-active  { border-color: var(--pg-active); animation: pg-chip-pulse 2s var(--ease) infinite; }
.pg-chip.pg-blocked { border-color: var(--pg-blocked); }
@keyframes pg-chip-pulse {
  0%, 100% { box-shadow: 0 0 0 0 transparent; }
  50%      { box-shadow: 0 0 6px 0 var(--pg-active); }
}
.pg-chip-id { font-weight: 600; color: var(--text-primary); }
.pg-chip-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pg-hint, .pg-empty {
  padding: 0 var(--space-5) var(--space-3);
  font-size: var(--text-2xs);
  color: var(--text-muted);
}
.pg-empty { padding-top: var(--space-2); }
.pg-empty code { font-family: var(--font-mono); color: var(--text-secondary); }
/* ════════ Phase dependency graph (END) ════════ */
</style>`;
}

module.exports = { renderCss };
