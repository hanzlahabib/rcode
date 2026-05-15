/**
 * Dashboard CSS — Linear design system.
 * Dark-first (Linear-style). Rihal accent: #5e6ad2 (Aether Blue).
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
  --text-on-accent: #ffffff;

  /* Brand — Rihal keeps Aether Blue */
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
  --orange:  #f2994a;

  /* Status */
  --status-todo:     #e2e2e2;
  --status-progress: #f2c94c;
  --status-blocked:  #eb5757;
  --status-done:     #4cb782;

  /* Type */
  --font-sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-mono: "JetBrains Mono", "SF Mono", Menlo, Consolas, monospace;

  /* Size scale */
  --text-2xl: 24px;
  --text-xl:  20px;
  --text-lg:  17px;
  --text-md:  15px;
  --text-sm:  14px;
  --text-xs:  13px;
  --text-2xs: 11px;

  /* Spacing (4px base) */
  --space-1: 2px;
  --space-2: 4px;
  --space-3: 8px;
  --space-4: 12px;
  --space-5: 16px;
  --space-6: 20px;
  --space-7: 24px;
  --space-8: 32px;
  --space-9: 48px;
  --space-10: 64px;

  /* Radius */
  --radius-1: 2px;
  --radius-2: 4px;
  --radius-3: 6px;
  --radius-4: 8px;
  --radius-5: 12px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm:    0 1px 2px rgba(0,0,0,0.4);
  --shadow-md:    0 4px 12px rgba(0,0,0,0.5);
  --shadow-lg:    0 16px 32px rgba(0,0,0,0.6);
  --shadow-modal: 0 32px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06);
  --shadow-focus: 0 0 0 2px var(--bg-page), 0 0 0 4px var(--accent-primary);

  /* Motion */
  --ease: cubic-bezier(0.4,0,0.2,1);
  --ease-in: cubic-bezier(0.4,0,1,1);
  --t-fast: 120ms;
  --t-base: 200ms;
  --t-menu: 240ms;
  --t-view: 320ms;

  /* Legacy compat aliases */
  --bg: var(--bg-page);
  --bg-card: var(--bg-elev-2);
  --border: var(--border-default);
  --radius-sm: var(--radius-2);
  --radius-md: var(--radius-4);
  --radius-lg: var(--radius-5);
  --accent-green: var(--green);
  --accent-amber: var(--amber);
  --accent-red: var(--red);
  --accent-blue: var(--blue);
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

/* Mobile hamburger */
.hamburger-btn {
  display: none;
  flex-direction: column;
  gap: 4px;
  width: 32px;
  height: 32px;
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
  background: rgba(0,0,0,0.5);
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
  background: rgba(8,9,10,0.8);
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
  background: rgba(245,245,247,0.85);
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
  gap: 4px;
  height: 26px;
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

/* ── Stats ─────────────────────────────────────────────────────── */
.stats {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--space-3);
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
  font-size: 28px;
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
  letter---spacing: -0.006em;
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

/* ── Scrollbar global ───────────────────────────────────────── */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }
* { scrollbar-width: thin; scrollbar-color: var(--border-strong) transparent; }
</style>`;
}

module.exports = { renderCss };
