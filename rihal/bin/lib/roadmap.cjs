/**
 * Roadmap — Rihal ROADMAP.md parsing and mutation helpers.
 *
 * Self-contained (stdlib only). Subcommands invoked by Rihal workflows:
 * get-phase, list-phases, update-plan-progress, clear.
 */

const fs = require('fs');
const path = require('path');

function escapeRegex(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function roadmapPathFor(projectRoot) {
  return path.join(projectRoot, '.planning', 'ROADMAP.md');
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
  // **Requirements** or **Requirements:** followed by numbered or bulleted list
  const match = section.match(/\*\*Requirements(?::\*\*|\*\*:)[^\n]*\n((?:\s*(?:\d+\.|[-*])\s+[^\n]+\n?)+)/i);
  if (!match) return [];
  return match[1].split('\n')
    .map((l) => l.replace(/^\s*(?:\d+\.|[-*])\s+/, '').trim())
    .filter(Boolean);
}

function parseSuccessCriteria(section) {
  const match = section.match(/\*\*Success Criteria\*\*[^\n]*:\s*\n((?:\s*(?:\d+\.|[-*])\s+[^\n]+\n?)+)/i);
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
function cmdGetPhase(projectRoot, phaseNum, opts = {}) {
  const rp = roadmapPathFor(projectRoot);
  if (!fs.existsSync(rp)) {
    return { found: false, error: 'ROADMAP.md not found', phase_number: phaseNum };
  }
  const content = fs.readFileSync(rp, 'utf8');
  const phases = extractPhases(content);
  const match = phases.find((p) => p.number === String(phaseNum));
  if (!match) return { found: false, phase_number: phaseNum };

  if (opts.pick === 'section') {
    return { __raw: match.section };
  }

  return {
    found: true,
    phase_number: match.number,
    name: match.name,
    goal: match.goal,
    requirements: parseRequirements(match.section),
    success_criteria: parseSuccessCriteria(match.section),
    plans: parsePlans(match.section),
  };
}

function cmdListPhases(projectRoot) {
  const rp = roadmapPathFor(projectRoot);
  if (!fs.existsSync(rp)) return [];
  const content = fs.readFileSync(rp, 'utf8');
  // Phase 10 / #466 — prefer the parsed Status field from extractPhases over
  // the legacy phaseStatus() heuristic, which only matched literal "completed"
  // in the header and missed our **Status:** Complete convention. Fall back to
  // phaseStatus() only when extractPhases couldn't parse a Status line.
  return extractPhases(content).map((p) => ({
    number: p.number,
    name: p.name,
    status: p.status === 'unknown' ? phaseStatus(p.section) : p.status,
    status_raw: p.status_raw,
  }));
}

/**
 * roadmap update-plan-progress <phase> <plan-id> <status>
 * Atomically rewrites the plan status in ROADMAP.md.
 */
function cmdUpdatePlanProgress(projectRoot, phaseNum, planId, status) {
  if (!phaseNum || !planId || !status) {
    throw new Error('Usage: roadmap update-plan-progress <phase> <plan-id> <status>');
  }
  const rp = roadmapPathFor(projectRoot);
  if (!fs.existsSync(rp)) {
    return { updated: false, error: 'ROADMAP.md not found' };
  }
  const content = fs.readFileSync(rp, 'utf8');
  const phases = extractPhases(content);
  const phase = phases.find((p) => p.number === String(phaseNum));
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
 * roadmap clear — archive and scaffold.
 */
function cmdClear(projectRoot) {
  const rp = roadmapPathFor(projectRoot);
  // Derive current version from config.yaml or default v1.0
  const configPath = path.join(projectRoot, '.rihal', 'config.yaml');
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
    default:
      throw new Error(`Unknown roadmap subcommand: ${sub}. Valid: get-phase, list-phases, update-plan-progress, clear`);
  }
}

module.exports = {
  dispatch,
  cmdGetPhase,
  cmdListPhases,
  cmdUpdatePlanProgress,
  cmdClear,
};
