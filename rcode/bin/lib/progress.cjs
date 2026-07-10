/**
 * Progress — single pre-computed progress blob (issue #159).
 *
 * Subcommands:
 *   progress init          Full snapshot — everything /rcode-progress needs.
 *   progress bar --raw     ASCII bar only (e.g. "[████░░░░] 50%").
 *   progress insights      insights[] array (drift warnings, between-milestone detection).
 *   progress routes        intent-tree routes[] for Next Up menu.
 *
 * Pushing logic into the CLI lets the workflow file shrink to pure
 * rendering — no ROADMAP.md parsing, no SUMMARY.md walking, no grep.
 *
 * Extracted from rcode-tools.cjs's cmdProgress (issue #204) — pure
 * mechanical move, no behavior change.
 */

const fs = require('fs');
const path = require('path');

function cmdProgress(args, { PROJECT_ROOT, RCODE_DIR, PLANNING_DIR }) {
  const sub = args[0] || 'init';
  const rawMode = args.includes('--raw');
  // #200 — opt-in strict mode: exit 1 when insights contain drift/undercount.
  // Off by default (warning preserves the soft-surface UX). Toggle via --strict
  // flag or RCODE_STRICT_STATE=true env var. Used by CI / pre-deploy gates.
  const strictMode = args.includes('--strict')
    || /^(true|1|yes)$/i.test(process.env.RCODE_STRICT_STATE || '');

  // Resolve paths — workflow files may run this from any subdirectory.
  const statePath = path.join(RCODE_DIR, 'state.json');
  const roadmapPath = path.join(PLANNING_DIR, 'ROADMAP.md');
  const phasesDir = path.join(PLANNING_DIR, 'phases');

  function readState() {
    if (!fs.existsSync(statePath)) return null;
    try { return JSON.parse(fs.readFileSync(statePath, 'utf8')); }
    catch { return null; }
  }

  function parseRoadmapPhases() {
    if (!fs.existsSync(roadmapPath)) return [];
    const text = fs.readFileSync(roadmapPath, 'utf8');
    const phases = [];
    const seen = new Set();

    // Format A — markdown pipe tables: | 07 | Name | Goal |
    // Phase 14 / #476 — \d+ supports high-N phases (1000+, hot-track).
    const rowRe = /^\|\s*(\d+(?:\.\d+)?)\s*\|\s*([^|]+?)\s*\|\s*([^|]*?)\s*\|/gm;
    let m;
    while ((m = rowRe.exec(text)) !== null) {
      const num = m[1].trim();
      const name = m[2].trim();
      const goal = m[3].trim();
      if (!/^\d/.test(num)) continue;
      if (name.toLowerCase() === 'phase') continue;
      if (seen.has(num)) continue;
      seen.add(num);
      phases.push({ number: num, name, goal });
    }

    // Format B — heading style: ## Phase 07 — Name  /  ### Phase 07: Name  /  ## Phase 07 - Name
    // Phase 14 / #476 — \d+ supports high-N phases (1000+, hot-track).
    const headRe = /^#{2,4}\s*Phase\s+(\d+(?:\.\d+)?)\s*[—\-:]\s*([^\n]+)$/gm;
    while ((m = headRe.exec(text)) !== null) {
      const num = m[1].trim();
      const name = m[2].trim();
      if (seen.has(num)) continue;
      seen.add(num);
      // Goal: pull the first non-empty line after the heading that starts with **Goal:** or is plain text
      const after = text.slice(headRe.lastIndex).split(/\n/).slice(0, 8).join('\n');
      const goalMatch = after.match(/\*\*Goal:\*\*\s*([^\n]+)/i);
      phases.push({ number: num, name, goal: goalMatch ? goalMatch[1].trim() : '' });
    }

    // Sort numerically (handles "07" vs "10" string ordering correctly)
    phases.sort((a, b) => parseFloat(a.number) - parseFloat(b.number));
    return phases;
  }

  function extractMilestoneName() {
    // 1. Try ROADMAP.md headings — match any milestone header form
    if (fs.existsSync(roadmapPath)) {
      const text = fs.readFileSync(roadmapPath, 'utf8');
      // Bold form: **Milestone: v1.0 — Name** or **Milestone v1.0 — Name**
      let m = text.match(/\*\*\s*Milestone\s*:?\s*([^\n*]+?)\s*\*\*/i);
      if (m) return m[1].trim();
      // Header form: ## Milestone v1.0 — Name  /  ## Milestone: v1.0 — Name
      m = text.match(/^#{1,4}\s+Milestone\s*:?\s*([^\n]+)$/m);
      if (m) return m[1].trim();
    }
    // 2. Fall back to state.json milestone field
    try {
      if (fs.existsSync(statePath)) {
        const s = JSON.parse(fs.readFileSync(statePath, 'utf8'));
        if (s && s.milestone) return String(s.milestone).trim();
      }
    } catch { /* ignore */ }
    return null;
  }

  // Treat any of `number`, `id`, or `name` as the phase identifier.
  // Different commands historically write different field names — accept all.
  function phaseKey(p) {
    return String(p?.number ?? p?.id ?? p?.name ?? '').trim();
  }

  function walkPhaseDirs() {
    if (!fs.existsSync(phasesDir)) return {};
    const byNum = {};
    for (const entry of fs.readdirSync(phasesDir)) {
      const full = path.join(phasesDir, entry);
      if (!fs.statSync(full).isDirectory()) continue;
      // Phase 14 / #476 — \d+ supports high-N phase dirs (1000+).
      const numMatch = entry.match(/^(\d+(?:\.\d+)?)/);
      if (!numMatch) continue;
      const num = numMatch[1];
      const files = fs.readdirSync(full);
      byNum[num] = {
        path: full,
        dirName: entry,
        plan_count: files.filter(f => /-SPRINT\.md$/i.test(f)).length,
        summary_count: files.filter(f => /SUMMARY\.md$|-SUMMARY\.md$/.test(f)).length,
        has_research: files.includes('RESEARCH.md'),
        has_context: files.includes('CONTEXT.md'),
        has_verification: files.some(f => /VERIFICATION\.md$/i.test(f)),
      };
    }
    return byNum;
  }

  // #200 — opt-in strict gate. Walks insights for drift/undercount kinds and
  // exits 1 with the failure list to stderr. No-op when strictMode=false.
  function enforceStrictGate(insightsList) {
    if (!strictMode) return;
    const blocking = (insightsList || []).filter(i =>
      i && (i.kind === 'drift' || i.kind === 'undercount') && i.severity !== 'info'
    );
    if (blocking.length === 0) return;
    process.stderr.write('✖ State drift detected — state.json is out of sync with disk.\n');
    for (const i of blocking) process.stderr.write(`  • ${i.message}\n`);
    process.stderr.write('\n  Auto-fix:  node .rcode/bin/rcode-tools.cjs state sync --from-disk\n');
    process.stderr.write('  Inspect:   node .rcode/bin/rcode-tools.cjs state read\n');
    process.exit(1);
  }

  function detectInsights(state, roadmapPhases, diskByNum) {
    const insights = [];
    const statePhases = (state && (state.state?.phases || state.phases)) || [];

    // Drift: ROADMAP phase count vs state.json phase count
    if (roadmapPhases.length > 0 && statePhases.length !== roadmapPhases.length) {
      insights.push({
        kind: 'drift',
        severity: 'warn',
        message: `ROADMAP.md has ${roadmapPhases.length} phases, state.json has ${statePhases.length}. Run: node .rcode/bin/rcode-tools.cjs state sync --from-disk`,
      });
    }

    // Undercount: phases that exist on disk but not in state.
    // Accept any of `number`, `id`, or `name` as the phase identifier — the codebase historically writes different fields.
    // Also normalize "07" / "7" / 7 to a comparable form.
    const norm = (k) => String(k ?? '').replace(/^0+(\d)/, '$1');
    const statePhaseNums = new Set(statePhases.map(p => norm(phaseKey(p))));
    const diskPhaseNums = Object.keys(diskByNum);
    const missingFromState = diskPhaseNums.filter(n => !statePhaseNums.has(norm(n)));
    if (missingFromState.length > 0) {
      insights.push({
        kind: 'undercount',
        severity: 'warn',
        message: `${missingFromState.length} phase dir(s) on disk not registered in state.json: ${missingFromState.slice(0, 5).join(', ')}`,
      });
    }

    // Phantom-complete: phase claimed Complete (in ROADMAP or state) but missing
    // PLAN.md AND SUMMARY.md on disk. User-visible bug: /rcode-status would
    // happily report 'all complete' while /rcode-audit correctly flagged the
    // gap because the two read different sources of truth.
    // Surfaced 2026-04-29 in a real session — siraaj phases 07-12 had ROADMAP
    // markers but zero artifacts.
    const phantomCompletes = [];
    const claimedComplete = (p) => {
      if (!p) return false;
      const s = String(p.status ?? '').toLowerCase();
      return p.completed || s === 'complete' || s === 'completed' || s === 'done';
    };
    // Walk ROADMAP-claimed completes and state-claimed completes, both directions.
    const completeKeys = new Set();
    for (const p of roadmapPhases) if (claimedComplete(p)) completeKeys.add(norm(phaseKey(p)));
    for (const p of statePhases) if (claimedComplete(p)) completeKeys.add(norm(phaseKey(p)));
    for (const k of completeKeys) {
      const disk = diskByNum[k] || diskByNum[k.padStart(2, '0')];
      // Only flag when the phase dir EXISTS — purely-state-only entries are a
      // separate problem (drift/undercount above). Here we want claim-vs-files.
      if (!disk) continue;
      if (disk.plan_count === 0 && disk.summary_count === 0) {
        phantomCompletes.push(k);
      }
    }
    if (phantomCompletes.length > 0) {
      insights.push({
        kind: 'phantom-complete',
        severity: 'warn',
        message: `${phantomCompletes.length} phase(s) marked Complete but missing both PLAN.md and SUMMARY.md on disk: ${phantomCompletes.slice(0, 5).join(', ')}. The completion claim is unsupported. Run /rcode-audit phase <N> to inspect.`,
      });
    }

    // Between-milestones heuristic: no current_phase + previous milestone's last phase is complete
    if (state && state.current_phase === null && statePhases.length > 0) {
      const allComplete = statePhases.every(p => p.status === 'complete' || p.completed);
      if (allComplete) {
        insights.push({
          kind: 'between-milestones',
          severity: 'info',
          message: 'All registered phases complete — effectively between milestones. Consider /rcode-audit-milestone or /rcode-new-milestone.',
        });
      }
    }

    // Stuck-phase: in_progress phase with no commits touching its .planning dir in 7+ days
    try {
      const inProgressPhases = statePhases.filter(p => {
        const s = String(p.status ?? '').toLowerCase();
        return s === 'in_progress' || s === 'in-progress' || s === 'executing';
      });
      for (const p of inProgressPhases) {
        const key = norm(phaseKey(p));
        const disk = diskByNum[key] || diskByNum[key.padStart(2, '0')];
        if (!disk) continue;
        const dirName = disk.dirName;
        const gitArgs = ['log', '--oneline', '--since=7 days ago', '--', `.planning/phases/${dirName}/`];
        let recentCommits = '';
        try {
          recentCommits = require('child_process').execSync(
            `git ${gitArgs.join(' ')}`,
            { cwd: PROJECT_ROOT, stdio: 'pipe', timeout: 5000 }
          ).toString().trim();
        } catch { /* git not available or no history */ }
        if (recentCommits === '') {
          insights.push({
            kind: 'stuck-phase',
            severity: 'warn',
            message: `Phase ${key} is in progress but has no commits in the last 7 days. It may be stuck. Run /rcode-status or /rcode-audit phase ${key} to investigate.`,
          });
        }
      }
    } catch { /* non-fatal — git unavailable or project root not set */ }

    return insights;
  }

  function deriveRoutes(state, roadmapPhases, diskByNum, insights) {
    const routes = [];
    const statePhases = (state && (state.state?.phases || state.phases)) || [];

    // Route A — phases with pending plans (ready to execute).
    // Issue #653 — never recommend executing a phase whose state.json status
    // is already complete/done/verified, even if its on-disk plan_count >
    // summary_count. Missing second summary file is not the canonical
    // completion signal; state.json is. Run /rcode-audit phase <N> for
    // disk-vs-state drift, but stop steering users into re-executing
    // finished work.
    const isPhaseDone = (p) => {
      const s = String((p && p.status) || '').toLowerCase();
      return s === 'complete' || s === 'completed' || s === 'done' || s === 'verified' || Boolean(p && p.completed);
    };
    const pendingExec = statePhases.filter(p => {
      if (isPhaseDone(p)) return false;
      const disk = diskByNum[phaseKey(p)];
      return disk && disk.plan_count > disk.summary_count;
    }).slice(0, 3);
    for (const p of pendingExec) {
      const k = phaseKey(p);
      routes.push({ letter: 'A', label: '', command: `/rcode-execute ${k}` });
    }

    // Route B — phases with research but no plans
    const researchOnly = Object.entries(diskByNum)
      .filter(([num, d]) => d.has_research && d.plan_count === 0)
      .slice(0, 3);
    for (const [num] of researchOnly) {
      routes.push({ letter: 'B', label: '', command: `/rcode-plan ${num}` });
    }

    // Route B' — in-progress phases without plans
    const inProgressNoPlan = statePhases
      .filter(p => (p.status === 'in_progress' || p.status === 'in-progress'))
      .filter(p => {
        const disk = diskByNum[phaseKey(p)];
        return !disk || disk.plan_count === 0;
      })
      .slice(0, 2);
    for (const p of inProgressNoPlan) {
      const k = phaseKey(p);
      routes.push({ letter: 'B', label: '', command: `/rcode-plan ${k}` });
    }

    // Route C — close out milestone if everything seems done
    const allDone = statePhases.length > 0 && statePhases.every(p => p.status === 'complete' || p.completed);
    if (allDone) {
      // Count unverified phases (complete but no VERIFICATION.md on disk)
      const unverifiedCount = statePhases.filter(p => {
        const disk = diskByNum[phaseKey(p)];
        return (p.status === 'complete' || p.completed) && disk && !disk.has_verification;
      }).length;
      const hasDrift = (insights || []).some(i => i.kind === 'roadmap-drift' || (i.message && i.message.includes('ROADMAP')));
      const auditArgs = [];
      if (unverifiedCount > 0) auditArgs.push(String(unverifiedCount));
      if (hasDrift) auditArgs.push('--fix-drift');
      const auditCmd = auditArgs.length > 0
        ? `/rcode-audit-milestone ${auditArgs.join(' ')}`
        : '/rcode-audit-milestone';
      routes.push({ letter: 'C', label: '', command: auditCmd });
      routes.push({ letter: 'C', label: '', command: '/rcode-complete-milestone' });
    }

    // Fallback — nothing obvious: offer status
    if (routes.length === 0) {
      routes.push({ letter: 'A', label: '', command: '/rcode-progress' });
      routes.push({ letter: 'B', label: '', command: '/rcode-council' });
    }

    return routes;
  }

  function buildBar(completed, total) {
    if (!total) return '[░░░░░░░░░░░░░░░░░░░░] 0/0 (0%)';
    const pct = Math.round((completed / total) * 100);
    const width = 20;
    const filled = Math.min(width, Math.round((completed / total) * width));
    const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
    return `[${bar}] ${completed}/${total} (${pct}%)`;
  }

  /**
   * Compute weighted progress that recognizes intermediate phase states.
   * Weights: has_context only = 0.15, has_research = 0.25, has plan = 0.5,
   * has verification or summary = 1.0.
   * Returns { weighted: number (0..total), pct: number (0..100) }.
   */
  function computeWeightedProgress(stPhases, diskMap) {
    if (!stPhases.length) return { weighted: 0, pct: 0 };
    const norm = (k) => String(k ?? '').replace(/^0+(\d)/, '$1');
    let sum = 0;
    for (const p of stPhases) {
      const k = norm(phaseKey(p));
      if (p.status === 'complete' || p.completed) { sum += 1; continue; }
      const disk = diskMap[k] || diskMap[phaseKey(p)];
      if (!disk) continue;
      if (disk.summary_count > 0)       { sum += 1;    continue; }
      if (disk.has_verification)         { sum += 0.85; continue; }
      if (disk.plan_count > 0)           { sum += 0.5;  continue; }
      if (disk.has_research)             { sum += 0.25; continue; }
      if (disk.has_context)              { sum += 0.15; continue; }
    }
    const total = Math.max(stPhases.length, 1);
    return { weighted: Math.round(sum * 100) / 100, pct: Math.round((sum / total) * 100) };
  }

  function buildWeightedBar(stPhases, diskMap, total) {
    const { weighted, pct } = computeWeightedProgress(stPhases, diskMap);
    if (!total) return '[░░░░░░░░░░░░░░░░░░░░] 0/0 (0%)';
    const width = 20;
    const filled = Math.min(width, Math.round((weighted / total) * width));
    const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
    return `[${bar}] ~${pct}% weighted`;
  }

  // Build the core snapshot once — all subcommands derive from it.
  const state = readState();
  const roadmapPhases = parseRoadmapPhases();
  const diskByNum = walkPhaseDirs();
  const statePhases = (state && (state.state?.phases || state.phases)) || [];
  const completedCount = statePhases.filter(p => p.status === 'complete' || p.completed).length;
  const phaseCount = Math.max(statePhases.length, roadmapPhases.length);

  if (sub === 'bar') {
    const bar = buildBar(completedCount, phaseCount);
    if (rawMode) { console.log(bar); process.exit(0); }
    return { ok: true, bar, completed: completedCount, total: phaseCount };
  }

  if (sub === 'insights') {
    const insightsList = detectInsights(state, roadmapPhases, diskByNum);
    enforceStrictGate(insightsList);
    return { ok: true, insights: insightsList };
  }

  if (sub === 'routes') {
    const routeInsights = detectInsights(state, roadmapPhases, diskByNum);
    return { ok: true, routes: deriveRoutes(state, roadmapPhases, diskByNum, routeInsights) };
  }

  // sub === 'init' (default) — full snapshot
  const currentPhase = state && state.current_phase;
  const insights = detectInsights(state, roadmapPhases, diskByNum);
  enforceStrictGate(insights);
  const routes = deriveRoutes(state, roadmapPhases, diskByNum, insights);
  const { weighted: weightedCompleted, pct: weightedPct } = computeWeightedProgress(statePhases, diskByNum);

  return {
    ok: true,
    project: state && state.project,
    milestone: extractMilestoneName(),
    current_phase: currentPhase,
    phase_count: phaseCount,
    completed_count: completedCount,
    weighted_progress: weightedPct,
    bar: buildBar(completedCount, phaseCount),
    weighted_bar: buildWeightedBar(statePhases, diskByNum, phaseCount),
    phases: (() => {
      // Prefer ROADMAP-parsed phases when available; fall back to state.phases
      // when the roadmap doesn't use a parseable format. Normalize "07" / "7" / 7.
      const norm = (k) => String(k ?? '').replace(/^0+(\d)/, '$1');
      const source = roadmapPhases.length > 0 ? roadmapPhases : statePhases.map(p => ({
        number: phaseKey(p),
        name: p.name || '',
        goal: p.goal || '',
        status: p.status,
      }));
      return source.map(p => {
        const k = phaseKey(p);
        const sp = statePhases.find(x => norm(phaseKey(x)) === norm(k));
        return {
          ...p,
          number: k,
          status: p.status || (sp && sp.status) || null,
          disk: diskByNum[k] || null,
          in_state: !!sp,
        };
      });
    })(),
    decisions: state ? (state.decisions || []).slice(-3) : [],
    blockers: state ? (state.blockers || []).filter(b => !b.resolved).slice(0, 5) : [],
    insights,
    routes,
    updated: state && state.updated,
  };
}

module.exports = { cmdProgress };
