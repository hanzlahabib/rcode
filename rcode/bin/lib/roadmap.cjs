/**
 * Roadmap — rcode ROADMAP.md parsing and mutation helpers.
 *
 * Self-contained (stdlib only). Subcommands invoked by rcode workflows:
 * get-phase, list-phases, update-plan-progress, clear.
 */

const fs = require('fs');
const path = require('path');

function escapeRegex(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function roadmapPathFor(projectRoot) {
  return path.join(projectRoot, '.planning', 'ROADMAP.md');
}

/**
 * Resolve the active ROADMAP file path for a project.
 *
 * Convention detection (#734):
 *   1. Single file — .planning/ROADMAP.md (primary / existing behaviour)
 *   2. Per-milestone — .planning/ROADMAP-M<N>.md, e.g. ROADMAP-M3.md
 *      Selects the file that matches state.current_milestone when present;
 *      falls back to the lexicographically last file when no state is set.
 *
 * Returns { path, convention, milestone } where convention is
 * 'single' | 'per-milestone'.
 */
function resolveRoadmapPath(projectRoot) {
  const single = path.join(projectRoot, '.planning', 'ROADMAP.md');
  if (fs.existsSync(single)) {
    return { path: single, convention: 'single', milestone: null };
  }

  // Scan for ROADMAP-M*.md files
  const planningDir = path.join(projectRoot, '.planning');
  let milestoneFiles = [];
  if (fs.existsSync(planningDir)) {
    milestoneFiles = fs.readdirSync(planningDir)
      .filter(f => /^ROADMAP-M\d+\.md$/i.test(f))
      .sort();
  }

  if (milestoneFiles.length === 0) {
    // Neither convention found — return the canonical path (callers handle missing file)
    return { path: single, convention: 'single', milestone: null };
  }

  // Read state.json to find current_milestone
  const stateJsonPath = path.join(projectRoot, '.rcode', 'state.json');
  let currentMilestone = null;
  if (fs.existsSync(stateJsonPath)) {
    try {
      const st = JSON.parse(fs.readFileSync(stateJsonPath, 'utf8'));
      currentMilestone = st.current_milestone || null;
    } catch { /* non-fatal */ }
  }

  // Try to match by milestone id (e.g. "M3", "3", "milestone-3")
  let matched = null;
  if (currentMilestone) {
    const numMatch = String(currentMilestone).match(/(\d+)/);
    const milestoneNum = numMatch ? numMatch[1] : null;
    if (milestoneNum) {
      matched = milestoneFiles.find(f => {
        const m = f.match(/^ROADMAP-M(\d+)\.md$/i);
        return m && m[1] === milestoneNum;
      });
    }
  }

  // Fall back to the last file in sorted order
  if (!matched) matched = milestoneFiles[milestoneFiles.length - 1];

  const resolvedPath = path.join(planningDir, matched);
  const milestoneLabel = matched.replace(/^ROADMAP-M(\d+)\.md$/i, 'M$1');
  return { path: resolvedPath, convention: 'per-milestone', milestone: milestoneLabel };
}

/**
 * Extract all phase sections. Each returned entry includes:
 *   number, name, goal, section (raw markdown slice), headerIndex, sectionEnd
 */
function extractPhases(content) {
  // Accept any of: ":", "—" (em-dash), "-" (hyphen) between phase number and name.
  // Pre-#464 the regex required ":" only, which silently rejected heading-style
  // ROADMAP using em-dash ("## Phase 6 — Name") and broke roadmap list-phases
  // and roadmap get-phase. Same drift family as #455.
  const phasePattern = /#{2,4}\s*Phase\s+(\d+[A-Z]?(?:\.\d+)*)\s*[—\-:]\s*([^\n]+)/gi;
  const hits = [];
  let m;
  while ((m = phasePattern.exec(content)) !== null) {
    hits.push({ number: m[1], name: m[2].trim(), headerIndex: m.index });
  }
  const phases = [];
  for (let i = 0; i < hits.length; i++) {
    const h = hits[i];
    const end = i + 1 < hits.length ? hits[i + 1].headerIndex : content.length;
    const section = content.slice(h.headerIndex, end).trim();
    const goalMatch = section.match(/\*\*Goal(?::\*\*|\*\*:)\s*([^\n]+)/i);
    const goal = goalMatch ? goalMatch[1].trim() : null;

    // Status parsing (Phase 10 / #466 / closes secondary part of #464).
    // Maps the literal **Status:** line to a canonical enum.
    const statusMatch = section.match(/\*\*Status(?::\*\*|\*\*:)\s*([^\n]+)/i);
    const statusRaw = statusMatch ? statusMatch[1].trim() : null;
    let status = 'unknown';
    if (statusRaw) {
      const s = statusRaw.toLowerCase();
      if (s.startsWith('complete')) status = 'complete';
      else if (s.startsWith('active') || s.startsWith('in progress') || s.includes('sprint')) status = 'active';
      else if (s.startsWith('planned')) status = 'planned';
      else if (s.startsWith('closed')) status = 'closed';
    }

    phases.push({
      number: h.number,
      name: h.name,
      goal,
      status,
      status_raw: statusRaw,
      section,
      headerIndex: h.headerIndex,
      sectionEnd: end,
    });
  }
  return phases;
}

function parseRequirements(section) {
  // Matches both bold-style (**Requirements:**) and heading-style (### Requirements)
  // followed by a list block.
  const listMatch = section.match(/(?:\*\*Requirements(?::\*\*|\*\*:)|#{1,4}\s*Requirements\s*:?)[^\n]*\n((?:\s*(?:\d+\.|[-*])\s+[^\n]+\n?)+)/i);
  if (listMatch) {
    return listMatch[1].split('\n')
      .map((l) => l.replace(/^\s*(?:\d+\.|[-*])\s+/, '').trim())
      .filter(Boolean);
  }

  // Also capture REQ-IDs from inline lines like:
  //   **REQs:** REQ-004, REQ-010, REQ-020
  //   Requirements: REQ-001, REQ-002
  //   **Covers:** REQ-001, REQ-003
  // Collect every line in the section that contains REQ-\d+ patterns.
  const seen = new Set();
  const out = [];
  const reqIdRe = /\bREQ-[A-Z0-9][A-Z0-9-]*\b/g;
  for (const line of section.split('\n')) {
    if (!/REQ-/i.test(line)) continue;
    const ids = line.match(reqIdRe) || [];
    for (const id of ids) {
      if (!seen.has(id)) { seen.add(id); out.push(id); }
    }
  }
  return out;
}

function parseSuccessCriteria(section) {
  // Matches both bold-style (**Success Criteria:**) and heading-style (### Success Criteria)
  const match = section.match(/(?:\*\*Success Criteria\*\*[^\n]*:|#{1,4}\s*Success Criteria\s*:?)\s*\n((?:\s*(?:\d+\.|[-*])\s+[^\n]+\n?)+)/i);
  if (!match) return [];
  return match[1].split('\n')
    .map((l) => l.replace(/^\s*(?:\d+\.|[-*])\s+/, '').trim())
    .filter(Boolean);
}

function parsePlans(section) {
  // Match a table of plans or checklist of plan IDs. Return array of
  // { id, title, status } best-effort. Recognises conventional-commits style
  // rows: "| NN-MM | title | status |" or "- [ ] NN-MM title".
  const plans = [];
  // Table rows
  const tableRe = /^\|\s*(\d+-\d+)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/gm;
  let m;
  while ((m = tableRe.exec(section)) !== null) {
    plans.push({ id: m[1], title: m[2].trim(), status: m[3].trim().toLowerCase() });
  }
  if (plans.length > 0) return plans;
  // Checklist fallback
  const checkRe = /-\s*\[([ x])\]\s*(\d+-\d+)[:\s]+([^\n]+)/g;
  while ((m = checkRe.exec(section)) !== null) {
    plans.push({
      id: m[2],
      title: m[3].trim(),
      status: m[1] === 'x' ? 'completed' : 'pending',
    });
  }
  return plans;
}

function phaseStatus(section) {
  // Look at the header line for "(completed ...)" or "(in progress)" hints.
  const header = section.split('\n', 1)[0] || '';
  if (/completed/i.test(header)) return 'complete';
  const checkboxMatch = section.match(/-\s*\[(x| )\]\s*.*Phase\s+/i);
  if (checkboxMatch && checkboxMatch[1] === 'x') return 'complete';
  if (/\*\*Plans:\*\*[^\n]*plans complete/i.test(section)) return 'complete';
  if (/in progress/i.test(section)) return 'in_progress';
  return 'planned';
}

/**
 * roadmap get-phase <N> [--pick section]
 * Returns JSON or raw section markdown.
 */
function normalizePhaseNum(n) { return parseInt(String(n).replace(/^0+/, '') || '0', 10); }

function cmdGetPhase(projectRoot, phaseNum, opts = {}) {
  const { path: rp } = resolveRoadmapPath(projectRoot);
  if (!fs.existsSync(rp)) {
    return { found: false, error: 'ROADMAP.md not found', phase_number: phaseNum };
  }
  const content = fs.readFileSync(rp, 'utf8');
  const phases = extractPhases(content);
  // #813 — normalize leading zeros on both sides before comparing
  const needle = normalizePhaseNum(phaseNum);
  const match = phases.find((p) => normalizePhaseNum(p.number) === needle);
  if (!match) return { found: false, phase_number: phaseNum };

  if (opts.pick === 'section') {
    return { __raw: match.section };
  }

  // #833 — fall back to phase directory scan when parsePlans returns nothing
  let plans = parsePlans(match.section);
  if (plans.length === 0) {
    const phasesDir = path.join(projectRoot, '.planning', 'phases');
    const padded = String(needle).padStart(2, '0');
    if (fs.existsSync(phasesDir)) {
      for (const entry of fs.readdirSync(phasesDir)) {
        if (entry === String(needle) || entry.startsWith(`${needle}-`) || entry.startsWith(`${padded}-`)) {
          const phaseDir = path.join(phasesDir, entry);
          plans = fs.readdirSync(phaseDir)
            .filter((f) => /(?:^|-)(SPRINT|PLAN)\.md$/i.test(f))
            .map((f) => ({ id: f.replace(/\.md$/i, ''), title: f, status: 'planned' }));
          break;
        }
      }
    }
  }

  return {
    found: true,
    phase_number: match.number,
    name: match.name,
    goal: match.goal,
    requirements: parseRequirements(match.section),
    success_criteria: parseSuccessCriteria(match.section),
    plans,
  };
}

function cmdListPhases(projectRoot) {
  const { path: rp } = resolveRoadmapPath(projectRoot);
  if (!fs.existsSync(rp)) return [];
  const content = fs.readFileSync(rp, 'utf8');
  // Phase 10 / #466 — prefer the parsed Status field from extractPhases over
  // the legacy phaseStatus() heuristic, which only matched literal "completed"
  // in the header and missed our **Status:** Complete convention. Fall back to
  // phaseStatus() only when extractPhases couldn't parse a Status line.
  const phases = extractPhases(content).map((p) => ({
    number: p.number,
    name: p.name,
    status: p.status === 'unknown' ? phaseStatus(p.section) : p.status,
    status_raw: p.status_raw,
  }));

  // Fix #856 — state.current_phase is authoritative for which phase is in_progress.
  // ROADMAP.md may carry a stale "Active" marker from a previous phase after
  // `state set-phase` has moved forward. Read state.json and override statuses so
  // exactly one phase (the current one) gets in_progress, and any other phase that
  // ROADMAP still labels active/in_progress is demoted to planned.
  const stateJsonPath = path.join(projectRoot, '.rcode', 'state.json');
  let currentPhase = null;
  if (fs.existsSync(stateJsonPath)) {
    try {
      const st = JSON.parse(fs.readFileSync(stateJsonPath, 'utf8'));
      currentPhase = st.current_phase || null;
    } catch { /* non-fatal — fall through to ROADMAP-only statuses */ }
  }

  if (!currentPhase) return phases;

  // Extract the numeric prefix from current_phase (e.g. "02-correctness-fixes" → "2").
  const numPrefixMatch = String(currentPhase).match(/^(\d+)/);
  const leadingNum = numPrefixMatch ? String(parseInt(numPrefixMatch[1], 10)) : null;

  let matched = false;
  return phases.map((p) => {
    // Normalize the ROADMAP phase number (strip leading zeros) for comparison.
    const normNum = String(parseInt(String(p.number), 10));
    const isCurrentPhase =
      !matched && (
        p.name === currentPhase ||
        (leadingNum !== null && normNum === leadingNum) ||
        String(p.number) === String(currentPhase)
      );
    if (isCurrentPhase) {
      matched = true;
      // Only promote to in_progress if not already complete/closed.
      const s = String(p.status || '').toLowerCase();
      if (s !== 'complete' && s !== 'closed') {
        return { ...p, status: 'in_progress' };
      }
      return p;
    }
    // Demote any other phase that ROADMAP still marks active/in_progress —
    // state.current_phase is the single source of truth for the active phase.
    const s = String(p.status || '').toLowerCase();
    if (s === 'active' || s === 'in_progress') {
      return { ...p, status: 'planned' };
    }
    return p;
  });
}

/**
 * roadmap update-plan-progress <phase> [<plan-id> <status>]
 *
 * 1-arg form (phase only): scans the phase directory for *-SPRINT.md /
 *   *-PLAN.md and *-SUMMARY.md files and updates the ROADMAP progress row
 *   for the phase. Used by execute-sprint.md. Closes #843.
 * 3-arg form: atomically rewrites a specific plan-id status in ROADMAP.md.
 */
function cmdUpdatePlanProgress(projectRoot, phaseNum, planId, status) {
  if (!phaseNum) {
    throw new Error('Usage: roadmap update-plan-progress <phase> [<plan-id> <status>]');
  }
  // 1-arg form: auto-detect progress from disk
  if (!planId && !status) {
    const planningDir = path.join(projectRoot, '.planning', 'phases');
    let phaseDir = null;
    if (fs.existsSync(planningDir)) {
      const padded = String(Number(phaseNum)).padStart(2, '0');
      for (const entry of fs.readdirSync(planningDir)) {
        if (entry === String(phaseNum) || entry.startsWith(`${phaseNum}-`) || entry.startsWith(`${padded}-`)) {
          phaseDir = path.join(planningDir, entry);
          break;
        }
      }
    }
    if (!phaseDir) return { updated: false, note: `phase dir for ${phaseNum} not found — skipping progress update` };
    const files = fs.readdirSync(phaseDir);
    const planFiles = files.filter(f => /(?:^|-)(SPRINT|PLAN)\.md$/i.test(f));
    const summaryFiles = files.filter(f => /(?:^|-)SUMMARY\.md$/i.test(f));
    const allDone = planFiles.length > 0 && summaryFiles.length >= planFiles.length;
    return {
      updated: false,
      note: `phase ${phaseNum}: ${planFiles.length} plan(s), ${summaryFiles.length} summary(s) — ${allDone ? 'complete' : 'in progress'}`,
      plan_count: planFiles.length,
      summary_count: summaryFiles.length,
      status: allDone ? 'complete' : 'in_progress',
    };
  }

  if (!planId || !status) {
    throw new Error('Usage: roadmap update-plan-progress <phase> <plan-id> <status>');
  }
  const { path: rp } = resolveRoadmapPath(projectRoot);
  if (!fs.existsSync(rp)) {
    return { updated: false, error: 'ROADMAP.md not found' };
  }
  const content = fs.readFileSync(rp, 'utf8');
  const phases = extractPhases(content);
  const phase = phases.find((p) => normalizePhaseNum(p.number) === normalizePhaseNum(phaseNum));
  if (!phase) return { updated: false, error: `phase ${phaseNum} not found` };

  const planEscaped = escapeRegex(planId);
  const section = content.slice(phase.headerIndex, phase.sectionEnd);

  let previousStatus = null;
  let newSection = section;

  // Try table row first: "| id | title | old-status |"
  const tableRowRe = new RegExp(`^(\\|\\s*${planEscaped}\\s*\\|[^\\n]*\\|\\s*)([^|\\n]+?)(\\s*\\|)`, 'm');
  const tMatch = section.match(tableRowRe);
  if (tMatch) {
    previousStatus = tMatch[2].trim();
    newSection = section.replace(tableRowRe, (_, a, _old, c) => `${a}${status.padEnd(Math.max(status.length, _old.length))}${c}`);
  } else {
    // Checklist: "- [ ] planId: ..." or "- [x] planId"
    const mark = /completed|complete|done/i.test(status) ? 'x' : ' ';
    const checkRe = new RegExp(`(-\\s*\\[)([ x])(\\]\\s*(?:\\*\\*)?${planEscaped})`, 'i');
    const cMatch = section.match(checkRe);
    if (cMatch) {
      previousStatus = cMatch[2] === 'x' ? 'completed' : 'pending';
      newSection = section.replace(checkRe, `$1${mark}$3`);
    } else {
      return { updated: false, error: `plan ${planId} not found in phase ${phaseNum}` };
    }
  }

  const newContent = content.slice(0, phase.headerIndex) + newSection + content.slice(phase.sectionEnd);
  const tmp = rp + '.tmp';
  fs.writeFileSync(tmp, newContent, 'utf8');
  fs.renameSync(tmp, rp);

  return {
    updated: true,
    phase: phaseNum,
    plan: planId,
    status,
    previous_status: previousStatus,
  };
}

/**
 * roadmap summary — overview of phase counts and active phase.
 */
function cmdSummary(projectRoot) {
  const { path: rp } = resolveRoadmapPath(projectRoot);
  if (!fs.existsSync(rp)) return { found: false, error: 'ROADMAP.md not found' };
  const phases = cmdListPhases(projectRoot);
  const total = phases.length;
  const completed = phases.filter((p) => p.status === 'complete' || p.status === 'closed').length;
  const active = phases.find((p) => p.status === 'active') || null;
  const upcoming = phases.filter((p) => p.status === 'planned');
  return {
    total_phases: total,
    completed_phases: completed,
    active_phase: active ? { number: active.number, name: active.name } : null,
    upcoming_phases: upcoming.map((p) => ({ number: p.number, name: p.name })),
  };
}

/**
 * roadmap clear — archive and scaffold.
 */
function cmdClear(projectRoot) {
  // Clear always targets the canonical single-file path — per-milestone files
  // are managed per-milestone and not cleared globally.
  const rp = roadmapPathFor(projectRoot);
  // Derive current version from config.yaml or default v1.0
  const configPath = path.join(projectRoot, '.rcode', 'config.yaml');
  let version = 'v1.0';
  if (fs.existsSync(configPath)) {
    const text = fs.readFileSync(configPath, 'utf8');
    const m = text.match(/^\s*version:\s*"?([^"\n]+)"?/m);
    if (m) version = m[1].trim().startsWith('v') ? m[1].trim() : 'v' + m[1].trim();
  }
  const archiveDir = path.join(projectRoot, '.planning', 'archive', version);
  fs.mkdirSync(archiveDir, { recursive: true });

  let archived = null;
  if (fs.existsSync(rp)) {
    archived = path.join(archiveDir, 'ROADMAP.md');
    fs.renameSync(rp, archived);
  }

  const scaffold = `# Roadmap\n\n_Reset on ${new Date().toISOString()}. Previous roadmap archived to \`.planning/archive/${version}/ROADMAP.md\`._\n\n## Phases\n\n<!-- Add phases here with the format: ### Phase N: Name -->\n`;
  fs.mkdirSync(path.dirname(rp), { recursive: true });
  fs.writeFileSync(rp, scaffold, 'utf8');

  return { cleared: true, archived, version, roadmap: rp };
}

/**
 * roadmap detect — report which ROADMAP convention is in use (#734).
 *
 * Outputs a human-readable line and returns structured JSON.
 * Examples:
 *   single: .planning/ROADMAP.md
 *   per-milestone: .planning/ROADMAP-M3.md (current)
 */
function cmdDetect(projectRoot) {
  const resolved = resolveRoadmapPath(projectRoot);
  const exists = fs.existsSync(resolved.path);
  const rel = path.relative(projectRoot, resolved.path);

  if (resolved.convention === 'single') {
    const label = exists ? `single: ${rel}` : `single: ${rel} (not found)`;
    return { __raw: label, convention: 'single', path: rel, exists, milestone: null };
  }

  // per-milestone — also list all available milestone files
  const planningDir = path.join(projectRoot, '.planning');
  const allFiles = fs.existsSync(planningDir)
    ? fs.readdirSync(planningDir).filter(f => /^ROADMAP-M\d+\.md$/i.test(f)).sort()
    : [];

  const label = exists
    ? `per-milestone: ${rel} (current)`
    : `per-milestone: ${rel} (current, not found)`;
  return {
    __raw: label,
    convention: 'per-milestone',
    path: rel,
    exists,
    milestone: resolved.milestone,
    all_milestone_files: allFiles.map(f => path.join('.planning', f)),
  };
}

function dispatch(projectRoot, subArgs) {
  const sub = subArgs[0];
  const rest = subArgs.slice(1);
  switch (sub) {
    case 'get-phase': {
      const phaseNum = rest[0];
      if (!phaseNum) throw new Error('Usage: roadmap get-phase <N> [--pick section]');
      // Parse --pick
      let pick = null;
      for (let i = 1; i < rest.length; i++) {
        if (rest[i] === '--pick') { pick = rest[i + 1]; i++; }
      }
      return cmdGetPhase(projectRoot, phaseNum, { pick });
    }
    case 'list-phases':
      return cmdListPhases(projectRoot);
    case 'update-plan-progress':
      return cmdUpdatePlanProgress(projectRoot, rest[0], rest[1], rest[2]);
    case 'clear':
      return cmdClear(projectRoot);
    case 'summary':
      return cmdSummary(projectRoot);
    case 'detect':
      return cmdDetect(projectRoot);
    default:
      throw new Error(`Unknown roadmap subcommand: ${sub}. Valid: get-phase, list-phases, update-plan-progress, clear, summary, detect`);
  }
}

module.exports = {
  dispatch,
  cmdGetPhase,
  cmdListPhases,
  cmdUpdatePlanProgress,
  cmdClear,
  cmdSummary,
  cmdDetect,
  resolveRoadmapPath,
};
