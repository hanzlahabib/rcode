'use strict';
/**
 * phase.cjs — `phase <sub>` subcommand family, extracted from rcode-tools.cjs (#204).
 *
 * Self-contained aside from state I/O and a few shared helpers, which the
 * caller (rcode-tools.cjs's main()) injects via `deps` rather than this
 * module re-deriving them — keeps a single source of truth for
 * readState/writeState/PHASE_STATUS_ENUM/etc. until #204 step 2 hoists them
 * into lib/state-io.cjs.
 */

const fs = require('fs');
const path = require('path');

/**
 * cmdPhase — top-level phase operations.
 *
 * Subcommands:
 *   add <name>   Add an integer phase to end of current milestone.
 *                Computes next phase number from disk + ROADMAP + state.json,
 *                creates .planning/phases/{NN}-{slug}/, inserts a Goal/Status/
 *                Plans/Acceptance entry into ROADMAP.md before "## Backlog"
 *                (or at end if absent), and upserts state.phases[].
 *
 * Closes #460. Replaces the broken `phase add` invocation referenced by
 * .rcode/workflows/add-phase.md, which previously hit the dispatcher's
 * "Unknown subcommand: phase" path.
 */
function cmdPhase(subArgs, deps) {
  const {
    readState, writeState, milestoneCloseNudge, cmdFindPhase,
    PHASE_STATUS_ENUM, PLANNING_DIR, RCODE_DIR, PROJECT_ROOT, STATE_PATH,
  } = deps;
  const sub = subArgs[0];

  if (sub === 'add') {
    // Extract --decimal <parent> if present (closes #477 item C). The flag may
    // appear before or after the phase name; we splice it out before joining.
    const remaining = subArgs.slice(1);
    let decimalParent = null;
    const decimalIdx = remaining.findIndex(a => a === '--decimal');
    if (decimalIdx !== -1) {
      decimalParent = remaining[decimalIdx + 1];
      if (!decimalParent || decimalParent.startsWith('--')) {
        throw new Error('--decimal requires a parent phase number (e.g., --decimal 13)');
      }
      if (!/^\d+$/.test(decimalParent)) {
        throw new Error(`--decimal parent must be a positive integer, got: ${decimalParent}`);
      }
      remaining.splice(decimalIdx, 2);
    }

    // #583 --number N flag: explicit phase number override, bypasses auto-computation.
    let forcedNumber = null;
    const numberIdx = remaining.findIndex(a => a === '--number');
    if (numberIdx !== -1) {
      const nVal = remaining[numberIdx + 1];
      if (!nVal || nVal.startsWith('--') || !/^\d+$/.test(nVal)) {
        throw new Error('--number requires a positive integer (e.g., --number 22)');
      }
      forcedNumber = parseInt(nVal, 10);
      remaining.splice(numberIdx, 2);
    }

    const phaseName = remaining.join(' ').trim();
    if (!phaseName) throw new Error('phase add requires <name>');

    const slug = phaseName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
    if (!slug) {
      throw new Error('Phase name must contain at least one alphanumeric character');
    }

    const phasesDir = path.join(PLANNING_DIR, 'phases');
    const roadmapPath = path.join(PLANNING_DIR, 'ROADMAP.md');

    // State lives in .rcode/state.json — same path used by cmdState (line ~634)
    // and every other state-writing subcommand. Phase 6 dogfood surfaced this:
    // earlier drafts wrote to .planning/state.json, creating an orphan file
    // invisible to `state sync` / `state set-phase` / etc. Closes #462.
    //
    // Routed through readState()/writeState() (#1060) instead of ad-hoc
    // JSON.parse/fs.writeFileSync — gets the locked, atomic writer and the
    // migration pass every other state reader/writer gets, closing the lost-
    // update race between concurrent executor agents each calling `phase *`.
    let state = readState() || { phases: [], decisions: [], blockers: [] };
    if (!state.phases) state.phases = [];

    let number;
    if (forcedNumber !== null) {
      // --number N: explicit override. Validate it doesn't already exist.
      number = String(forcedNumber);
      if (state.phases.some(p => String(p.number) === number)) {
        throw new Error(`Phase ${number} already exists in state.json (--number override)`);
      }
    } else if (decimalParent !== null) {
      // Verify parent exists somewhere (state, dir, or ROADMAP) before slotting under it.
      const parentNum = parseInt(decimalParent, 10);
      let parentExists = state.phases.some(p => parseInt(String(p.number), 10) === parentNum);
      if (!parentExists && fs.existsSync(phasesDir)) {
        parentExists = fs.readdirSync(phasesDir).some(e => {
          const m = e.match(/^(\d+)(?:[.-]|$)/);
          return m && parseInt(m[1], 10) === parentNum;
        });
      }
      if (!parentExists && fs.existsSync(roadmapPath)) {
        const text = fs.readFileSync(roadmapPath, 'utf8');
        const re = new RegExp(`(^|\\n)(?:##+\\s*Phase\\s+|\\|\\s*)${parentNum}\\b`);
        parentExists = re.test(text);
      }
      if (!parentExists) {
        throw new Error(`--decimal parent ${parentNum} not found (no state entry, directory, or ROADMAP row matches)`);
      }

      // Find max minor across phases dir, ROADMAP, and state for `<parent>.M`.
      let maxMinor = 0;
      if (fs.existsSync(phasesDir)) {
        for (const entry of fs.readdirSync(phasesDir)) {
          const m = entry.match(new RegExp(`^${parentNum}\\.(\\d+)`));
          if (m) maxMinor = Math.max(maxMinor, parseInt(m[1], 10));
        }
      }
      if (fs.existsSync(roadmapPath)) {
        const text = fs.readFileSync(roadmapPath, 'utf8');
        const pipeRe = new RegExp(`^\\|\\s*${parentNum}\\.(\\d+)\\s*\\|`, 'gm');
        let m;
        while ((m = pipeRe.exec(text)) !== null) {
          maxMinor = Math.max(maxMinor, parseInt(m[1], 10));
        }
        const headRe = new RegExp(`^#{2,4}\\s*Phase\\s+${parentNum}\\.(\\d+)\\b`, 'gm');
        while ((m = headRe.exec(text)) !== null) {
          maxMinor = Math.max(maxMinor, parseInt(m[1], 10));
        }
      }
      for (const p of state.phases) {
        const m = String(p.number || '').match(new RegExp(`^${parentNum}\\.(\\d+)$`));
        if (m) maxMinor = Math.max(maxMinor, parseInt(m[1], 10));
      }
      number = `${parentNum}.${maxMinor + 1}`;
    } else {
      let maxNum = 0;
      if (fs.existsSync(phasesDir)) {
        for (const entry of fs.readdirSync(phasesDir)) {
          const m = entry.match(/^(\d+)/);
          if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
        }
      }
      if (fs.existsSync(roadmapPath)) {
        const text = fs.readFileSync(roadmapPath, 'utf8');
        // Phase 14 / #476 — \d+ (not \d{1,3}). High numbers like 1001 are valid
        // for hot-track phases. The cap was silently dropping them from maxNum
        // computation, causing the next phase to collide with an existing one.
        const pipeRe = /^\|\s*(\d+)\s*\|/gm;
        let m;
        while ((m = pipeRe.exec(text)) !== null) {
          maxNum = Math.max(maxNum, parseInt(m[1], 10));
        }
        const headRe = /^#{2,4}\s*Phase\s+(\d+)\b/gm;
        while ((m = headRe.exec(text)) !== null) {
          maxNum = Math.max(maxNum, parseInt(m[1], 10));
        }
      }
      for (const p of state.phases) {
        const n = parseInt(String(p.number || ''), 10);
        if (!Number.isNaN(n)) maxNum = Math.max(maxNum, n);
      }

      const next = maxNum + 1;
      // No leading zeros — phases use plain integer identifiers (6, not 06).
      // Per Hanzla feedback: leading zeros add visual clutter without disambiguation
      // value at the scales we operate. Applies to phases, sprints, epics, stories,
      // tasks, decisions across all artifacts (dirs, ROADMAP, state.json, banners).

      // #583 / #944 sanity guard: prevent phantom phase numbers caused by stale
      // high-number entries in ROADMAP.md or phases/ (e.g. a prior phantom
      // "## Phase 1009" left in ROADMAP triggers the next add to produce 1010).
      //
      // The guard must NOT misfire on an INTENTIONAL high-base numbering scheme
      // (e.g. a milestone that deliberately numbers phases 1031, 1032, …). The
      // discriminant: is the high number an actual TRACKED phase in state.json,
      // or only a ROADMAP/dir entry that state has never seen?
      //   - next === maxTracked + 1  → contiguous with real tracked phases →
      //     intentional, allow regardless of absolute magnitude.
      //   - maxNum (overall) sits far ABOVE maxTracked → a non-tracked phantom
      //     is driving the number → suspect, abort.
      const trackedNums = state.phases
        .map(p => parseInt(String(p.number || ''), 10))
        .filter(n => !Number.isNaN(n) && n > 0);
      const trackedCount = trackedNums.length;
      const maxTracked = trackedNums.length ? Math.max(...trackedNums) : 0;
      if (maxNum > maxTracked && (maxNum - maxTracked) > 50) {
        throw new Error(
          `Computed phase number ${next} is driven by a non-tracked entry ` +
          `(highest in ROADMAP/phases = ${maxNum}, highest in state.json = ${maxTracked}). ` +
          `ROADMAP.md or the phases/ directory likely contains a stale high-number entry. ` +
          `Inspect with: node rcode-tools.cjs phases list\n` +
          `Then retry with an explicit number: rcode-tools.cjs phase add "${phaseName}" --number ${maxTracked + 1}`
        );
      }

      number = String(next);
    }

    if (state.phases.some(p => String(p.number) === number)) {
      throw new Error(`Phase ${number} already exists in state.json`);
    }

    const dirName = `${number}-${slug}`;
    const directory = path.join(phasesDir, dirName);
    if (fs.existsSync(directory)) {
      throw new Error(`Phase directory already exists: ${path.relative(PROJECT_ROOT, directory)}`);
    }
    fs.mkdirSync(directory, { recursive: true });

    const entry = `## Phase ${number} — ${phaseName}\n\n` +
      `**Goal:** _TBD — fill in via /rcode-discuss-phase ${number} or edit directly._\n\n` +
      `**Status:** Planned\n\n` +
      `**Plans:**\n- _TBD_\n\n` +
      `**Acceptance:** _TBD_\n\n---\n`;

    if (fs.existsSync(roadmapPath)) {
      let text = fs.readFileSync(roadmapPath, 'utf8');

      // #895 — Validate state.milestone against ROADMAP before inserting.
      // Find the last top-level milestone heading ("# M\d+" or "## M\d+") in
      // ROADMAP.md. That is the active milestone — use it as the insertion
      // target and correct state.milestone if it is stale.
      const milestoneHeadingRe = /^#{1,2}\s+(M\d+[^\n]*)/gm;
      let lastMilestoneLabel = null;
      let mh;
      while ((mh = milestoneHeadingRe.exec(text)) !== null) {
        // Skip the generic "## Milestones" index heading.
        if (/^milestones?\s*$/i.test(mh[1].trim())) continue;
        lastMilestoneLabel = mh[1].trim();
      }
      if (lastMilestoneLabel && lastMilestoneLabel !== (state.milestone || '')) {
        state.milestone = lastMilestoneLabel;
      }

      const backlogMatch = text.match(/^##\s+Backlog\b/m);
      if (backlogMatch) {
        const backlogIdx = backlogMatch.index;
        text = text.slice(0, backlogIdx) + entry + '\n' + text.slice(backlogIdx);
      } else {
        if (!text.endsWith('\n')) text += '\n';
        text += '\n' + entry;
      }
      fs.writeFileSync(roadmapPath, text);
    }

    state.phases.push({
      number,
      name: phaseName,
      slug,
      goal: '',
      status: 'planned',
      created: new Date().toISOString(),
      started: null,
      completed: null,
      plan_count: 0,
    });
    writeState(state);

    // #942 — surface the milestone close nudge from the CLI itself so it can't
    // be bypassed by adding phases outside the add-phase workflow.
    const { milestone_health, nudge } = milestoneCloseNudge();
    return {
      ok: true,
      phase_number: number,
      name: phaseName,
      slug,
      directory: path.relative(PROJECT_ROOT, directory),
      milestone_health,
      ...(nudge ? { nudge } : {}),
    };
  }

  // =====================================================================
  // phase complete <phase_number> — mark a phase complete and report the
  // next phase. Closes the workflow/CLI drift (#766): execute.md calls
  // `phase complete` but only set-status existed.
  // =====================================================================
  if (sub === 'complete') {
    const phaseRef = subArgs[1];
    if (!phaseRef) throw new Error('phase complete requires <phase_number>');
    const state = readState();
    if (!state) {
      throw new Error(`state.json not found at ${STATE_PATH} — run 'rcode-tools state init' first`);
    }
    if (!state.phases) state.phases = [];
    const idx = state.phases.findIndex(p =>
      String(p.number) === String(phaseRef) ||
      String(p.id) === String(phaseRef) ||
      p.name === phaseRef
    );
    if (idx === -1) {
      throw new Error(`Phase "${phaseRef}" not found in state.phases (looked up by number, id, and name)`);
    }
    const previous = state.phases[idx].status || null;

    // State-hygiene gate (#955): if an earlier-numbered phase is still stuck
    // 'executing' while this later phase gets marked complete, that's exactly
    // the drift that misorients resolveActivePhase() / the SessionStart greeter.
    // Warn rather than block — completing out of order is sometimes correct
    // (parallel workstreams), but it must never happen silently. (Ported from
    // the unused `state complete-phase` twin — this is the code path every
    // workflow actually calls.)
    const thisNum = parseInt(String(state.phases[idx].number || phaseRef), 10);
    const stalePhases = Number.isNaN(thisNum) ? [] : state.phases.filter((p) => {
      if (!p || p.status !== 'executing') return false;
      const n = parseInt(String(p.number ?? p.id), 10);
      return !Number.isNaN(n) && n < thisNum;
    });
    const warnings = [];
    if (stalePhases.length > 0) {
      const staleList = stalePhases.map((p) => p.number ?? p.id).join(', ');
      warnings.push(
        `Phase ${phaseRef} marked complete while earlier phase(s) ${staleList} are still 'executing'. ` +
        `Close out the stale phase(s) or confirm this is an intentional parallel workstream.`
      );
    }

    state.phases[idx].status = 'complete';
    state.phases[idx].status_updated = new Date().toISOString();
    state.phases[idx].completed_at = state.phases[idx].completed_at || new Date().toISOString().slice(0, 10);

    const num = parseInt(String(state.phases[idx].number || phaseRef), 10);
    const next = state.phases
      .filter(p => parseInt(String(p.number), 10) > num)
      .sort((a, b) => parseInt(String(a.number), 10) - parseInt(String(b.number), 10))[0] || null;

    writeState(state);

    // #943 — when no open phases remain, the milestone is effectively finished.
    // Surface the close/next guidance from this chokepoint so finishing the
    // last phase via execute/verify/dev-story doesn't strand the user (the
    // guidance previously only appeared in /rcode-status or progress insights).
    const doneStatuses = new Set(['complete', 'completed', 'verified', 'shipped']);
    const openRemaining = state.phases.filter(p => !doneStatuses.has(p.status)).length;
    let nudge = null;
    if (openRemaining === 0 && state.phases.length > 0) {
      nudge = 'All phases are complete — this milestone is finished. ' +
        'Run /rcode-complete-milestone to archive it, then /rcode-new-milestone to start the next.';
    }

    return {
      ok: true,
      phase: phaseRef,
      previous_status: previous,
      new_status: 'complete',
      next_phase: next ? next.number : null,
      next_phase_name: next ? (next.name || null) : null,
      is_last_phase: !next,
      open_phases_remaining: openRemaining,
      ...(nudge ? { nudge } : {}),
      warnings,
      has_warnings: warnings.length > 0,
    };
  }

  // =====================================================================
  // phase sync-sprints <phase_number> — register sprint records into
  // state.json by deriving them from the .planning/phases/<dir>/*-SPRINT.md
  // files (the source of truth). Closes #765: planner agents write SPRINT.md
  // files but do not always register sprint entries, leaving state.json an
  // incomplete mirror. This makes registration a deterministic CLI step.
  // =====================================================================
  if (sub === 'sync-sprints') {
    const phaseRef = subArgs[1];
    if (!phaseRef) throw new Error('phase sync-sprints requires <phase_number>');
    const state = readState();
    if (!state) {
      throw new Error(`state.json not found at ${STATE_PATH} — run 'rcode-tools state init' first`);
    }
    if (!state.phases) state.phases = [];
    const idx = state.phases.findIndex(p =>
      String(p.number) === String(phaseRef) ||
      String(p.id) === String(phaseRef) ||
      p.name === phaseRef
    );
    if (idx === -1) {
      throw new Error(`Phase "${phaseRef}" not found in state.phases`);
    }

    const phasesDir = path.join(PLANNING_DIR, 'phases');
    const intId = String(phaseRef).split('.')[0];
    let dirs;
    try { dirs = fs.readdirSync(phasesDir, { withFileTypes: true }).filter(d => d.isDirectory()); }
    catch { throw new Error(`No .planning/phases directory found`); }
    const dir = dirs.find(d => d.name.startsWith(intId + '-') ||
                               d.name.startsWith(intId.padStart(2, '0') + '-'));
    if (!dir) throw new Error(`No phase directory on disk for phase ${phaseRef}`);

    const files = fs.readdirSync(path.join(phasesDir, dir.name));
    const sprintFiles = files.filter(f => /-SPRINT\.md$/i.test(f)).sort();
    const sprints = sprintFiles.map(f => {
      const m   = f.match(/^(\d+)-(\d+)-SPRINT\.md$/i);
      const num = m ? parseInt(m[2], 10) : 0;
      const sid = m ? `${parseInt(m[1], 10)}.${num}` : f.replace(/-SPRINT\.md$/i, '');
      const text = fs.readFileSync(path.join(phasesDir, dir.name, f), 'utf8');
      const fmGoal = (text.match(/^goal:\s*(.+)$/m) || [])[1];
      let goal = fmGoal ? fmGoal.trim() : '';
      if (!goal) {
        const obj = (text.match(/<objective>\s*([\s\S]*?)<\/objective>/) || [])[1] || '';
        goal = (obj.trim().split('\n').map(s => s.trim()).filter(Boolean)[0] || '').slice(0, 160);
      }
      const stories = [];
      const taskRe = /<task\b([^>]*)>([\s\S]*?)<\/task>/g;
      let tm;
      while ((tm = taskRe.exec(text))) {
        const idM = tm[1].match(/id="([^"]+)"/);
        const tM  = tm[2].match(/<title>([\s\S]*?)<\/title>/);
        stories.push({ id: idM ? idM[1] : `${sid}.${stories.length + 1}`,
                       title: tM ? tM[1].trim() : `Task ${stories.length + 1}`,
                       status: 'planned' });
      }
      if (!stories.length) {
        // Legacy SPRINT.md: "### Story|Task <id> — <title>" headings.
        const headRe = /^#{2,4}\s+(?:Story|Task)\s+([^\s—–-]+)\s*[—–-]\s*(.+?)\s*$/gm;
        let hm;
        while ((hm = headRe.exec(text))) {
          stories.push({ id: hm[1].trim(), title: hm[2].trim(), status: 'planned' });
        }
      }
      const hasSummary = files.includes(f.replace(/-SPRINT\.md$/i, '-SUMMARY.md'));
      return { id: sid, number: num, goal: goal || `Sprint ${num}`,
               status: hasSummary ? 'complete' : 'planned', stories };
    });

    state.phases[idx].sprints = sprints;
    state.phases[idx].plan_count = sprints.length;
    writeState(state);
    return {
      ok: true,
      phase: phaseRef,
      sprints_registered: sprints.length,
      stories_registered: sprints.reduce((a, s) => a + s.stories.length, 0),
    };
  }

  if (sub === 'set-status') {
    const phaseRef = subArgs[1];
    const newStatus = subArgs[2];
    if (!phaseRef) throw new Error('phase set-status requires <phase_number> <status>');
    // Reconciled with the canonical PHASE_STATUS_ENUM (#1060) — this used to
    // be a separately hand-maintained array ('in_progress' instead of
    // 'executing', no shared source with migrateState()'s normalizer), which
    // is exactly the kind of drift that let two different notions of "valid
    // phase status" diverge.
    const validStatuses = [...PHASE_STATUS_ENUM];
    if (!newStatus) throw new Error(`phase set-status requires <status> (e.g., ${validStatuses.join(', ')})`);
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Invalid status "${newStatus}". Valid: ${validStatuses.join(', ')}`);
    }

    const state = readState();
    if (!state) {
      throw new Error(`state.json not found at ${STATE_PATH} — run 'rcode-tools state init' first`);
    }
    if (!state.phases) state.phases = [];

    const phaseIdx = state.phases.findIndex(p =>
      String(p.number) === String(phaseRef) ||
      String(p.id) === String(phaseRef) ||
      p.name === phaseRef
    );
    if (phaseIdx === -1) {
      throw new Error(`Phase "${phaseRef}" not found in state.phases (looked up by number, id, and name)`);
    }
    const previous = state.phases[phaseIdx].status || null;
    state.phases[phaseIdx].status = newStatus;
    state.phases[phaseIdx].status_updated = new Date().toISOString();

    writeState(state);
    return { ok: true, phase: phaseRef, previous_status: previous, new_status: newStatus };
  }

  // =====================================================================
  // phase next-range [count] — return next N contiguous free phase numbers.
  // Closes #730. Enables bulk-scaffold and parallel planning workflows
  // to reserve a block of numbers atomically before creating directories.
  // =====================================================================
  if (sub === 'next-range') {
    const count = Math.max(1, parseInt(subArgs[1] || '1', 10));
    if (Number.isNaN(count) || count < 1 || count > 200) {
      throw new Error('phase next-range count must be a positive integer ≤ 200');
    }

    const phasesDir = path.join(PLANNING_DIR, 'phases');
    const roadmapPath = path.join(PLANNING_DIR, 'ROADMAP.md');
    const statePath = path.join(RCODE_DIR, 'state.json');

    let maxNum = 0;
    if (fs.existsSync(phasesDir)) {
      for (const entry of fs.readdirSync(phasesDir)) {
        const m = entry.match(/^(\d+)/);
        if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
      }
    }
    if (fs.existsSync(roadmapPath)) {
      const text = fs.readFileSync(roadmapPath, 'utf8');
      const pipeRe = /^\|\s*(\d+)\s*\|/gm;
      let m;
      while ((m = pipeRe.exec(text)) !== null) maxNum = Math.max(maxNum, parseInt(m[1], 10));
      const headRe = /^#{2,4}\s*Phase\s+(\d+)\b/gm;
      while ((m = headRe.exec(text)) !== null) maxNum = Math.max(maxNum, parseInt(m[1], 10));
    }
    if (fs.existsSync(statePath)) {
      try {
        const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
        for (const p of (state.phases || [])) {
          const n = parseInt(String(p.number || ''), 10);
          if (!Number.isNaN(n)) maxNum = Math.max(maxNum, n);
        }
      } catch {}
    }

    const first = maxNum + 1;
    const last  = maxNum + count;
    const range = [];
    for (let i = first; i <= last; i++) range.push(i);
    return { ok: true, first, last, count, range };
  }

  // =====================================================================
  // phase scaffold-milestone --names "n1|n2|n3" [--start N]
  // Closes #731. Bulk-creates phase folders for a milestone in one call.
  // Names are pipe-separated (| avoids shell quoting issues with commas).
  // --start N overrides the computed first number (defaults to next-range).
  // =====================================================================
  if (sub === 'scaffold-milestone') {
    const remaining = subArgs.slice(1);
    let rawNames = null;
    let startOverride = null;

    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i] === '--names' && remaining[i + 1]) {
        rawNames = remaining[++i];
      } else if (remaining[i] === '--start' && remaining[i + 1]) {
        startOverride = parseInt(remaining[++i], 10);
        if (Number.isNaN(startOverride)) throw new Error('--start requires an integer');
      }
    }
    if (!rawNames) throw new Error('phase scaffold-milestone requires --names "name1|name2|..."');

    const names = rawNames.split('|').map(n => n.trim()).filter(Boolean);
    if (!names.length) throw new Error('--names must contain at least one non-empty name');

    // Compute starting number via same logic as next-range / phase add
    const phasesDir = path.join(PLANNING_DIR, 'phases');
    const roadmapPath = path.join(PLANNING_DIR, 'ROADMAP.md');
    const statePath = path.join(RCODE_DIR, 'state.json');

    // #769 — the next free number is derived from phase DIRECTORIES only.
    // A directory is the physical "slot taken" signal. ROADMAP.md headings and
    // directory-less state.json entries represent phases that are *planned but
    // not yet scaffolded* — which is exactly what this command materialises —
    // so they must NOT push the start number forward. (The old code also read
    // the roadmap + state into maxNum, which made scaffold-milestone skip past
    // an already-written roadmap range, e.g. scaffolding 38-41 for a 34-37
    // milestone.)
    const dirNumbers = new Set();
    let maxNum = 0;
    if (fs.existsSync(phasesDir)) {
      for (const entry of fs.readdirSync(phasesDir)) {
        const m = entry.match(/^(\d+)/);
        if (m) {
          const n = parseInt(m[1], 10);
          dirNumbers.add(n);
          maxNum = Math.max(maxNum, n);
        }
      }
    }
    let state = { phases: [] };
    if (fs.existsSync(statePath)) {
      try { state = JSON.parse(fs.readFileSync(statePath, 'utf8')); }
      catch (e) { throw new Error(`Invalid JSON in state.json: ${e.message}`); }
    }
    if (!Array.isArray(state.phases)) state.phases = [];

    const firstNum = startOverride !== null ? startOverride : maxNum + 1;
    const created  = [];
    const roadmapSkipped = [];

    for (let i = 0; i < names.length; i++) {
      const phaseName = names[i];
      const number = String(firstNum + i);
      const slug = phaseName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
      if (!slug) {
        throw new Error(`Name at index ${i} ("${phaseName}") produces an empty slug`);
      }
      // #769 — a real collision is a state entry that ALSO has a directory on
      // disk (the phase is genuinely already scaffolded). A directory-less
      // state entry is a phantom — e.g. rcode-roadmapper synced the phase into
      // state.json but never created the folder — so reconcile it in place
      // instead of aborting.
      const existingIdx = state.phases.findIndex(p => String(p.number) === number);
      if (existingIdx !== -1) {
        if (dirNumbers.has(firstNum + i)) {
          throw new Error(`Phase ${number} already scaffolded (directory + state entry exist) — collision at index ${i}`);
        }
        state.phases.splice(existingIdx, 1);
      }

      const dirName  = `${number}-${slug}`;
      const directory = path.join(phasesDir, dirName);
      if (fs.existsSync(directory)) {
        throw new Error(`Directory already exists: ${path.relative(PROJECT_ROOT, directory)}`);
      }
      fs.mkdirSync(directory, { recursive: true });

      // Append ROADMAP entry — but skip if the roadmap already declares this
      // phase (#769: rcode-roadmapper writes `## Phase N` sections directly, so
      // appending a stub here produced a duplicate heading).
      if (fs.existsSync(roadmapPath)) {
        let text = fs.readFileSync(roadmapPath, 'utf8');
        const headingRe = new RegExp(`^#{2,4}\\s*Phase\\s+${number}\\b`, 'm');
        if (headingRe.test(text)) {
          roadmapSkipped.push(number);
        } else {
          const entry = `## Phase ${number} — ${phaseName}\n\n` +
            `**Goal:** _TBD — fill in via /rcode-discuss-phase ${number} or edit directly._\n\n` +
            `**Status:** Planned\n\n` +
            `**Plans:**\n- _TBD_\n\n` +
            `**Acceptance:** _TBD_\n\n---\n`;
          const backlogMatch = text.match(/^##\s+Backlog\b/m);
          if (backlogMatch) {
            text = text.slice(0, backlogMatch.index) + entry + '\n' + text.slice(backlogMatch.index);
          } else {
            if (!text.endsWith('\n')) text += '\n';
            text += '\n' + entry;
          }
          fs.writeFileSync(roadmapPath, text);
        }
      }

      state.phases.push({
        number, name: phaseName, slug,
        goal: '', status: 'planned',
        created: new Date().toISOString(),
        started: null, completed: null, plan_count: 0,
      });
      created.push({ number, name: phaseName, directory: path.relative(PROJECT_ROOT, directory) });
    }

    state.updated = new Date().toISOString();
    if (typeof state.schema_version !== 'number') state.schema_version = 1;
    const stateDir = path.dirname(statePath);
    if (!fs.existsSync(stateDir)) fs.mkdirSync(stateDir, { recursive: true });
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2) + '\n');

    // #942 — same milestone close nudge for the bulk-draft path.
    const bulkHealth = milestoneCloseNudge();
    return {
      ok: true, count: created.length, phases: created, roadmap_skipped: roadmapSkipped,
      milestone_health: bulkHealth.milestone_health,
      ...(bulkHealth.nudge ? { nudge: bulkHealth.nudge } : {}),
    };
  }

  // =====================================================================
  // phase scaffold-all — materialise folders for every phase in ROADMAP.md
  // that lacks a directory under .planning/phases/.
  // Closes #731. No --names arg required — reads the ROADMAP table directly.
  // Only creates directories; does NOT create .md files inside them.
  // =====================================================================
  // phase rename-dir <N> — align a phase directory's slug with its ROADMAP name.
  // Dry-run by default: renaming a directory moves artifacts and, without git mv,
  // detaches their history. There was no mechanism for this at all, so a roadmap
  // rewrite left every directory carrying the name of whatever it used to be.
  if (sub === 'rename-dir') {
    // cmdPhase has no shared flag parser (parseFlags is local to cmdState), so
    // read the two flags this needs directly.
    const argvIdx = subArgs.findIndex((a, i) => i > 0 && !String(a).startsWith('--'));
    const phaseFlagIdx = subArgs.indexOf('--phase');
    const target = argvIdx > 0 ? subArgs[argvIdx]
      : (phaseFlagIdx !== -1 ? subArgs[phaseFlagIdx + 1] : null);
    if (!target) throw new Error('phase rename-dir requires a phase number');
    const apply = subArgs.includes('--apply');

    const found = cmdFindPhase([String(target)]);
    if (!found.exists) throw new Error(`No phase directory on disk for phase ${target}`);

    const roadmapLib = require(path.join(__dirname, 'roadmap.cjs'));
    const rp = roadmapLib.dispatch(PROJECT_ROOT, ['get-phase', String(target)]);
    if (!rp || !rp.found || !rp.name) {
      throw new Error(`Phase ${target} not found in ROADMAP.md — nothing to rename toward`);
    }

    const slugify = (t) => String(t).toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').replace(/-+/g, '-');
    const newSlug = slugify(rp.name);
    const phasesDir = path.join(PLANNING_DIR, 'phases');
    const oldDirName = path.basename(found.dir);
    const newDirName = `${target}-${newSlug}`;

    if (oldDirName === newDirName) {
      return { ok: true, renamed: false, reason: 'directory already matches the roadmap name', dir: found.dir };
    }
    const newPath = path.join(phasesDir, newDirName);
    if (fs.existsSync(newPath)) {
      throw new Error(`Target directory already exists: ${newDirName}. Resolve by hand — two phase dirs for one number is worse than a stale name.`);
    }

    if (!apply) {
      return {
        ok: true,
        renamed: false,
        dry_run: true,
        from: oldDirName,
        to: newDirName,
        note: 'Dry run. Re-run with --apply to rename. Check first that the artifacts in this directory belong to the phase the roadmap now describes — if the phase was REPLACED rather than renamed, renaming hides that instead of fixing it.',
      };
    }

    // Prefer `git mv` so the artifacts keep their history.
    const oldPath = path.join(phasesDir, oldDirName);
    let method = 'fs';
    const { spawnSync } = require('child_process');
    const gitMv = spawnSync('git', ['mv', oldPath, newPath], { cwd: PROJECT_ROOT, encoding: 'utf8' });
    if (gitMv.status === 0) { method = 'git mv'; }
    else { fs.renameSync(oldPath, newPath); }

    return {
      ok: true, renamed: true, method,
      from: oldDirName, to: newDirName,
      warning: 'Any file referencing the old path (SPRINT frontmatter, SUMMARY links, notes) still points at it. Grep for the old slug.',
    };
  }

  if (sub === 'scaffold-all') {
    const roadmapPath = path.join(PLANNING_DIR, 'ROADMAP.md');
    const phasesDir   = path.join(PLANNING_DIR, 'phases');

    if (!fs.existsSync(roadmapPath)) {
      throw new Error(`No ROADMAP.md found at ${roadmapPath} — run /rcode-init first`);
    }

    const roadmap = fs.readFileSync(roadmapPath, 'utf8');

    // Collect (number, name) pairs from pipe-table rows: | N | Phase Name | ...
    // Also pick up ## Phase N — Name headings as a fallback.
    const phases = [];
    const seen = new Set();

    // Table rows: | 8 | Feature X | ...
    const tableRe = /^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|/gm;
    let m;
    while ((m = tableRe.exec(roadmap)) !== null) {
      const num = m[1];
      const name = m[2].trim();
      // Skip header rows (e.g. "Phase" as the number column)
      if (!seen.has(num) && /^\d+$/.test(num)) {
        seen.add(num);
        phases.push({ num: num.padStart(2, '0'), rawNum: num, name });
      }
    }

    // Heading rows: ## Phase 8 — Feature X
    const headRe = /^#{2,4}\s*Phase\s+(\d+)\s*[—–-]\s*(.+?)\s*$/gm;
    while ((m = headRe.exec(roadmap)) !== null) {
      const num = m[1];
      const name = m[2].trim();
      if (!seen.has(num)) {
        seen.add(num);
        phases.push({ num: num.padStart(2, '0'), rawNum: num, name });
      }
    }

    if (phases.length === 0) {
      return { ok: true, message: 'No phases found in ROADMAP.md — nothing to scaffold', created: [], existed: [] };
    }

    const created = [];
    const existed = [];

    for (const p of phases) {
      const slug = p.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
      if (!slug) continue; // skip rows with no usable name (e.g. header rows)

      const dirName = `${p.num}-${slug}`;
      const dirPath = path.join(phasesDir, dirName);

      if (fs.existsSync(dirPath)) {
        existed.push(dirPath);
        console.log(`Exists:  ${dirPath}`);
      } else {
        fs.mkdirSync(dirPath, { recursive: true });
        created.push(dirPath);
        console.log(`Created: ${dirPath}`);
      }
    }

    return { ok: true, created: created.length, existed: existed.length, dirs: { created, existed } };
  }

  throw new Error(`Unknown phase subcommand: ${sub || '(none)'}. Valid: add, complete, sync-sprints, set-status, next-range, scaffold-milestone, scaffold-all`);
}

module.exports = { cmdPhase };
