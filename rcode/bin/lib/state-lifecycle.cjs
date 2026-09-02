'use strict';
/**
 * state-lifecycle.cjs — `state <sub>` lifecycle branches, extracted from
 * cmdState() in rcode-tools.cjs (#204 step 3).
 *
 * Covers: read/get, clear-stub, init, set, reset, promote-backlog, sync,
 * snapshot, update-progress, set-user-profile/write-profile.
 *
 * Deps are injected via the `deps` object (same pattern as lib/phase.cjs)
 * rather than closed over, so this module has a single explicit contract
 * with rcode-tools.cjs's cmdState().
 */

const fs = require('fs');
const path = require('path');

function dispatch(subArgs, deps) {
  const {
    readState,
    writeState,
    writeStateCompact,
    defaultState,
    migrateState,
    parseFlags,
    PLANNING_DIR,
    PROJECT_ROOT,
    RCODE_DIR,
    STATE_PATH,
  } = deps;
  const statePath = STATE_PATH;
  const sub = subArgs[0];

  if (sub === 'read' || sub === 'get') {
    if (!fs.existsSync(statePath)) {
      // Auto-init with defaults if config.yaml exists (install happened).
      // Removes the "run /rcode-init first" friction — any workflow can
      // call `state read` and get a usable state back.
      const configPath = path.join(RCODE_DIR, 'config.yaml');
      if (fs.existsSync(configPath)) {
        let projectName = path.basename(PROJECT_ROOT);
        try {
          const cfg = fs.readFileSync(configPath, 'utf8');
          const match = cfg.match(/^project_name:\s*"?([^"\n]+)"?/m);
          if (match) projectName = match[1].trim();
        } catch { /* use basename fallback */ }
        const state = defaultState(projectName);
        writeState(state);
        return state;
      }
      return {
        ok: false,
        error: 'No state.json yet. Run /rcode-install to set up this project, or `state init --project <name>` directly.'
      };
    }
    const state = readState();
    if (!state) return { state: null };
    return state;
  }

  // --- clear-stub --- (issue #681)
  // Explicit way to flip _seeded_stub off. Useful for /rcode-new-project once
  // PROJECT.md / REQUIREMENTS.md / ROADMAP.md are committed. The auto-clear in
  // writeState() also handles this, but having an explicit subcommand lets
  // workflows be self-documenting and idempotent.
  if (sub === 'clear-stub') {
    if (!fs.existsSync(statePath)) {
      return { ok: false, error: 'No state.json — nothing to clear.' };
    }
    const state = readState();
    if (!state) return { ok: false, error: 'state.json unreadable' };
    const wasStub = state._seeded_stub === true;
    if (wasStub) delete state._seeded_stub;
    writeState(state);
    return { ok: true, was_stub: wasStub, project: state.project || null };
  }

  // --- init ---
  if (sub === 'init') {
    let existing;
    try {
      existing = fs.existsSync(statePath) ? readState() : null;
    } catch (e) {
      console.error(`Warning: existing state.json corrupted (${e.message}). Initializing fresh state.`);
      existing = null;
    }
    // #849: install seeds state.json with _seeded_stub:true and an empty
    // skeleton. When /rcode-new-project later calls `state init` (without
    // --force) to bootstrap a real project, the early-return below kept the
    // stub flag and any install-time phase entries instead of overwriting
    // them. Treat stub state as reinitializable so real project data wins.
    const existingIsStub = !!(existing && (
      existing._seeded_stub === true ||
      (Array.isArray(existing.phases) && existing.phases.some(p => p && p.name === 'Setup & Scaffolding'))
    ));
    if (existing && !existingIsStub && !parseFlags(1).force) {
      return { ok: true, state: existing, message: 'state.json already exists; pass --force to reinitialize' };
    }
    const flags = parseFlags(1);
    // Resolve project name: flag > config.yaml > directory basename (#816)
    let resolvedProject = flags.project || null;
    if (!resolvedProject) {
      const configPath = path.join(RCODE_DIR, 'config.yaml');
      if (fs.existsSync(configPath)) {
        try {
          const cfg = fs.readFileSync(configPath, 'utf8');
          const m = cfg.match(/^project_name:\s*"?([^"\n]+)"?/m);
          if (m) resolvedProject = m[1].trim();
        } catch { /* fallback to basename */ }
      }
    }
    const state = defaultState(resolvedProject);
    // Resolve milestone from ROADMAP.md if not already set (#816)
    if (!state.milestone) {
      const roadmapPath = path.join(PLANNING_DIR, 'ROADMAP.md');
      if (fs.existsSync(roadmapPath)) {
        try {
          const rm = fs.readFileSync(roadmapPath, 'utf8');
          const mMatch = rm.match(/\*\*M\d+[^*\n]+\*\*/);
          if (mMatch) {
            state.milestone = mMatch[0].replace(/\*\*/g, '').trim();
          } else {
            const mLine = rm.match(/[-*]\s+\*?\*?(M\d+[^\n*]+)/);
            if (mLine) state.milestone = mLine[1].trim();
          }
        } catch { /* leave null */ }
      }
    }
    return writeState(state);
  }

  // Compat shim: agents sometimes generate 'state set current_phase N' or
  // 'state set project X' instead of the real subcommands. Route them.
  if (sub === 'set') {
    const key = subArgs[1];
    const val = subArgs[2];
    if (key === 'current_phase' && val) {
      subArgs = [sub, val];
      sub = 'set-phase';
    } else if (key === 'project' && val) {
      const state = readState() || defaultState();
      state.project = val;
      return writeState(state);
    } else if (key === 'milestone' && val) {
      const state = readState() || defaultState();
      state.milestone = val;
      return writeState(state);
    } else if (key === '--ui-spec-path' && val) {
      const state = readState() || defaultState();
      state.ui_spec_path = val;
      return writeState(state);
    } else if (key === '--wireframes-path' && val) {
      const state = readState() || defaultState();
      state.wireframes_path = val;
      return writeState(state);
    } else {
      throw new Error(`Unknown state set key: ${key}. Use: set-phase <N>, or state set project|milestone|--ui-spec-path|--wireframes-path <value>`);
    }
  }

  // --- set-phase ---
  if (sub === 'snapshot') {
    if (!fs.existsSync(statePath)) {
      return { ok: false, error: 'No state.json — nothing to snapshot.' };
    }
    const state = readState();
    if (!state) return { ok: false, error: 'state.json unreadable' };
    const statemd = path.join(PLANNING_DIR, 'STATE.md');
    const now = new Date().toISOString();
    const lines = [
      `# State Snapshot`,
      ``,
      `**Generated:** ${now}`,
      `**Project:** ${state.project || '(unset)'}`,
      `**Milestone:** ${state.milestone || '(unset)'}`,
      `**Current phase:** ${state.current_phase || '(unset)'}`,
      `**Current plan:** ${state.current_plan ?? 0}`,
      `**Current sprint:** ${state.current_sprint || '(none)'}`,
      ``,
      `## Raw state.json`,
      ``,
      '```json',
      JSON.stringify(state, null, 2),
      '```',
    ];
    fs.mkdirSync(path.dirname(statemd), { recursive: true });
    fs.writeFileSync(statemd, lines.join('\n') + '\n');
    return { ok: true, snapshot_path: path.relative(PROJECT_ROOT, statemd), state };
  }

  // --- update-progress --- (#820)
  // Increment current_sprint counter or mark the current sprint complete.
  // Usage:
  //   state update-progress                  → increment current_plan by 1
  //   state update-progress --sprint NN.S    → mark that sprint complete
  if (sub === 'update-progress') {
    const flags = parseFlags(1);
    const state = readState() || defaultState();
    if (flags.sprint) {
      // Mark the named sprint complete
      const targetId = String(flags.sprint);
      let found = false;
      for (const phase of (state.phases || [])) {
        for (const sprint of (phase.sprints || [])) {
          if (sprint.id === targetId || String(sprint.number) === targetId) {
            sprint.status = 'completed';
            sprint.completed_at = sprint.completed_at || new Date().toISOString();
            found = true;
          }
        }
      }
      if (!found) {
        return { ok: false, error: `Sprint ${targetId} not found in state` };
      }
      const result = writeState(state);
      return { ...result, sprint_completed: targetId };
    }
    // Default: increment current_plan (progress counter)
    if (typeof state.current_plan !== 'number') state.current_plan = 0;
    state.current_plan += 1;
    const result = writeState(state);
    return { ...result, current_plan: state.current_plan };
  }

  // =====================================================================
  // Sprint & Story Management
  // =====================================================================

  // --- sprint add --phase NN --goal "Sprint goal" ---
  // NOTE: this populates entry.sprints[] (an array). A separate code path,
  // 'planned-phase' below, sets entry.plans (a plain count) on write. The
  // two are no longer read as independent sources of truth: migrateState()
  // (above, ~line 1100) unifies entry.plans into entry.sprints[] and drops
  // entry.plans on every read (#1069) — so entry.sprints.length is always
  // the count that matters downstream, even though this write path and
  // 'planned-phase' still populate their own field each on its own turn.
  if (sub === 'set-user-profile' || sub === 'write-profile') {
    const flags = parseFlags(1);
    if (!flags.json) throw new Error('write-profile requires --json <json-blob>');
    const state = readState() || defaultState();
    if (!state.user_profile) state.user_profile = {};
    try {
      state.user_profile = JSON.parse(flags.json);
    } catch (e) {
      throw new Error(`Invalid JSON in --json flag: ${e.message}`);
    }
    return writeState(state);
  }

  // --- next-phase-id ---
  if (sub === 'reset') {
    const state = readState() || defaultState();
    const preserved = {
      version: state.version || '1',
      project: state.project || path.basename(PROJECT_ROOT),
      created: state.created || new Date().toISOString(),
      current_phase: null,
      current_plan: 0,
      current_sprint: null,
      phases: [],
      velocity_history: [],
      executions: [],
      decisions: state.decisions || [],
      blockers: [],
      council_sessions: state.council_sessions || [],
      last_session: state.last_session || null,
      workstreams: state.workstreams || [],
      active_workstream: state.active_workstream || null,
    };
    writeState(preserved);
    return { updated: true, status: 'reset', preserved_decisions: preserved.decisions.length };
  }

  // --- promote-backlog <from> --to <target> ---
  // Promote a 999.x parking-lot phase to a real phase number.
  // Mutates state.phases[]; renames the on-disk directory if present.
  // Tracks issue #159 (M2.5 — 999.x parking-lot convention).
  if (sub === 'promote-backlog') {
    const from = subArgs[1];
    const flags = parseFlags(2);
    const to = flags.to;
    if (!from || !to) {
      throw new Error('Usage: state promote-backlog <999.x> --to <NN>');
    }
    if (!/^999\.\d+$/.test(from)) {
      throw new Error(`Source must be 999.x parking-lot number, got: ${from}`);
    }
    if (!/^\d+(\.\d+)?$/.test(to)) {
      throw new Error(`Target must be N or N.M (any non-negative integer; high numbers like 1001 are valid for hot-track phases), got: ${to}`);
    }
    const state = readState() || defaultState();
    if (!state.phases) state.phases = [];
    const idx = state.phases.findIndex(p => String(p.number) === from);
    if (idx < 0) {
      throw new Error(`Parking-lot phase ${from} not found in state.phases`);
    }
    if (state.phases.some(p => String(p.number) === to)) {
      throw new Error(`Target phase ${to} already exists`);
    }
    const phase = state.phases[idx];
    const oldNumber = phase.number;
    phase.number = to;
    phase.promoted_from = oldNumber;
    phase.promoted_at = new Date().toISOString();

    // Rename on-disk directory if present
    const phasesDir = path.join(PLANNING_DIR, 'phases');
    let renamed = false;
    if (fs.existsSync(phasesDir)) {
      for (const entry of fs.readdirSync(phasesDir)) {
        if (entry.startsWith(`${oldNumber}-`) || entry === oldNumber) {
          const oldPath = path.join(phasesDir, entry);
          const newPath = path.join(phasesDir, entry.replace(oldNumber, to));
          fs.renameSync(oldPath, newPath);
          renamed = true;
          break;
        }
      }
    }

    writeState(state);
    return { ok: true, promoted: { from: oldNumber, to }, renamed_disk: renamed };
  }

  // --- sync --from-disk ---
  // Parse ROADMAP.md + epics.md and upsert milestones/phases/epics into state.json.
  // Preserves existing statuses on matching phase names/numbers.
  // Tracks: issue #126 (state desync between planning artifacts and state.json).
  if (sub === 'sync') {
    const flags = parseFlags(1);
    if (!flags['from-disk'] && flags['from-disk'] !== '') {
      // Support both "--from-disk" (flag) and "--from-disk true"
      // parseFlags consumes the next token as value; accept empty-string value.
    }
    const roadmapPath = path.join(PLANNING_DIR, 'ROADMAP.md');
    const epicsPath = path.join(PLANNING_DIR, 'epics.md');
    const state = readState() || defaultState();

    const parsed = {
      milestones_found: 0,
      phases_found: 0,
      phases_upserted: 0,
      epics_found: 0,
      roadmap_exists: fs.existsSync(roadmapPath),
      epics_exists: fs.existsSync(epicsPath),
    };

    // Parse ROADMAP.md for phases. Supports two formats (issue #455):
    //   Format A — pipe tables:    | 01 | Phase Name | Goal text | ... |
    //   Format B — heading style:   ## Phase 01 — Name  /  ### Phase 01: Name
    // Milestone heading is also matched in any of: "## Milestone M1", "## Milestone v1.0 — Name",
    // "**Milestone: v1.0 — Name**".

    // Issue #651 — must be declared in outer scope. The prune step at end of
    // sync references seenNums even when roadmap_exists is false (no-op prune
    // path), causing 'seenNums is not defined' crash.
    const seenNums = new Set();
    if (parsed.roadmap_exists) {
      const roadmap = fs.readFileSync(roadmapPath, 'utf8');
      const milestoneMatches = [
        ...(roadmap.match(/^##\s+Milestone\s+M\d+/gim) || []),
        ...(roadmap.match(/^#{1,4}\s+Milestone\s*:?\s*[^\n]+$/gim) || []),
        ...(roadmap.match(/\*\*\s*Milestone\s*:?\s*[^\n*]+\*\*/gi) || []),
      ];
      parsed.milestones_found = new Set(milestoneMatches.map(s => s.trim().toLowerCase())).size;

      if (!state.phases) state.phases = [];

      // One-time normalization: drop null/garbage entries and merge duplicates
      // by id/number across the schema-drift boundary (#482-A). Sync is the
      // safe place to do this because we re-derive truth from disk anyway.
      const beforeClean = state.phases.length;
      const seenKeys = new Map();
      const cleaned = [];
      for (const ph of state.phases) {
        if (!ph) continue;
        const key = String(ph.id || ph.number || '').trim();
        if (!key || !/^\d+(\.\d+)?$/.test(key)) continue;
        if (seenKeys.has(key)) {
          // Merge into the kept entry: prefer non-null values from this duplicate.
          const keptIdx = seenKeys.get(key);
          for (const k of Object.keys(ph)) {
            if (cleaned[keptIdx][k] == null && ph[k] != null) cleaned[keptIdx][k] = ph[k];
          }
          continue;
        }
        seenKeys.set(key, cleaned.length);
        cleaned.push({ id: key, number: key, ...ph, id: key, number: key });
      }
      parsed.phases_normalized = beforeClean - cleaned.length;
      state.phases = cleaned;

      // Normalise any raw status string from ROADMAP into the canonical
      // vocabulary used by state.json: 'complete' | 'in_progress' | 'planned'.
      // Fix #897 — status was never read from ROADMAP, so every phase always
      // landed as 'planned' regardless of what the doc said.
      function normalizeStatus(raw) {
        if (!raw) return 'planned';
        // Match on the LEADING word, not exact string equality — ROADMAP.md
        // status lines legitimately carry trailing detail beyond the bare
        // status word (e.g. "Complete (verification: human_needed — live
        // deploy deferred)"), which an exact-match check silently drops to
        // 'planned' since the full string never equals 'complete'. A real
        // "Complete (...)" phase would then look un-synced forever.
        // Strip trailing detail (anything from the first paren/colon/em-dash
        // onward — "(verification: ...)", ": some note") before matching, then
        // collapse whitespace/underscores so "Complete (...)", "In Progress",
        // and "in_progress" all normalize the same way.
        const leading = String(raw).toLowerCase().replace(/[✅]/g, '')
          .split(/[(:—]/)[0].trim().replace(/[\s_]+/g, '');
        if (['complete','completed','shipped','verified','done'].includes(leading)) return 'complete';
        if (['executing','inprogress','active','started'].includes(leading)) return 'in_progress';
        return 'planned';
      }

      // Phase dirs are historically zero-padded ("03-evidence-ledger") while
      // ROADMAP tables and state.json use bare integers ("3"). Match on the
      // normalized number or every disk cross-check silently no-ops.
      const normPhaseNum = (k) => String(k ?? '').trim().replace(/^0+(\d)/, '$1');
      const findPhaseDirFiles = (phaseNum) => {
        const phasesRootDir = path.join(PLANNING_DIR, 'phases');
        if (!fs.existsSync(phasesRootDir)) return null;
        const want = normPhaseNum(phaseNum);
        const dirName = fs.readdirSync(phasesRootDir).find(d => {
          const m = d.match(/^(\d+(?:\.\d+)?)(?:-|$)/);
          return m && normPhaseNum(m[1]) === want;
        });
        if (!dirName) return null;
        const full = path.join(phasesRootDir, dirName);
        return { dirName, path: full, files: fs.readdirSync(full) };
      };

      const upsertPhase = (phaseNum, phaseName, phaseGoal, phaseStatus) => {
        if (!/^\d/.test(phaseNum)) return;
        if (phaseName.toLowerCase() === 'phase') return;
        if (seenNums.has(phaseNum)) return;
        seenNums.add(phaseNum);
        parsed.phases_found += 1;
        // Dedup against id, number, AND name — schema drift between writers means
        // older entries carry .id while newer carry .number. Checking only one
        // field caused duplicate entries (e.g. issue #482-A: phases 10-13 each
        // appeared twice after a re-sync because the .id-only entries were not
        // matched against the .number-only writer).
        const existingIdx = state.phases.findIndex(p =>
          String(p.number) === phaseNum ||
          String(p.id) === phaseNum ||
          p.name === phaseName
        );
        // Status precedence for advancement: complete > in_progress > planned.
        // A phase should never be downgraded by ROADMAP re-sync.
        const statusRank = { complete: 2, in_progress: 1, planned: 0 };
        let incomingStatus = normalizeStatus(phaseStatus);

        // --from-disk means FROM DISK. The ROADMAP status column is only one
        // signal, and in several roadmap shapes column 4 isn't a status column
        // at all (e.g. a "Blocking?" column), so ROADMAP-only sync leaves every
        // shipped phase sitting at `planned` forever and no amount of re-running
        // sync fixes it. Advance from the artifacts that actually exist on disk.
        // Status never downgrades (statusRank guard below), so this can only
        // correct an under-reported phase, never overwrite a truer one.
        try {
          const dirInfo = findPhaseDirFiles(phaseNum);
          if (dirInfo) {
            const verFile = dirInfo.files.find(f => /-?VERIFICATION\.md$/i.test(f));
            const verText = verFile ? fs.readFileSync(path.join(dirInfo.path, verFile), 'utf8') : '';
            // `passed` alone is not enough: a report with no `falsification:`
            // key was self-certified — the pass that tries to refute it never
            // ran. Treat that as in_progress, not complete.
            const verPassed = /^status:\s*passed/mi.test(verText);
            // A `passed` report with no `falsification:` key was self-certified
            // — the pass that tries to refute it never ran. Do NOT downgrade it
            // here: every VERIFICATION.md written before the falsification pass
            // existed lacks the key, and silently reverting those phases to
            // in_progress would undo real completion history. Surface it
            // instead, so the gap is visible without rewriting the past.
            if (verPassed && !/^falsification:\s*upheld/mi.test(verText)) {
              parsed.self_certified_phases = parsed.self_certified_phases || [];
              parsed.self_certified_phases.push(phaseNum);
            }
            const hasSummary = dirInfo.files.some(f => /SUMMARY\.md$/i.test(f));
            const hasSprint = dirInfo.files.some(f => /-SPRINT\.md$/i.test(f));
            let diskStatus = null;
            // A passed VERIFICATION.md is the strongest completion artifact
            // there is — do NOT also require a SUMMARY.md. Summaries stop
            // being written partway through many real projects, and gating on
            // them leaves verified phases stuck at in_progress forever.
            if (verPassed) diskStatus = 'complete';
            else if (hasSummary || hasSprint) diskStatus = 'in_progress';
            if (diskStatus && (statusRank[diskStatus] ?? 0) > (statusRank[incomingStatus] ?? 0)) {
              incomingStatus = diskStatus;
              parsed.disk_derived_status = parsed.disk_derived_status || [];
              parsed.disk_derived_status.push({ phase: phaseNum, status: diskStatus });
            }
          }
        } catch { /* best-effort — never fail sync over disk inspection */ }

        // Cross-check against VERIFICATION.md before trusting a 'complete' claim
        // from ROADMAP prose. A phase can be hand-edited to say "Complete" (or
        // "gaps_found → closed") without ever re-running the verifier — confirmed
        // live: an agent wrote that exact phrase into ROADMAP.md while the phase's
        // own VERIFICATION.md frontmatter still said `status: gaps_found`,
        // bypassing execute.md's uat_gate entirely via a direct file edit. Don't
        // let a prose claim override what the actual verification artifact says.
        if (incomingStatus === 'complete') {
          try {
            const phasesRootDir = path.join(PLANNING_DIR, 'phases');
            const phaseDirName = (findPhaseDirFiles(phaseNum) || {}).dirName || null;
            if (phaseDirName) {
              const verFile = fs.readdirSync(path.join(phasesRootDir, phaseDirName))
                .find(f => /-VERIFICATION\.md$/i.test(f));
              if (verFile) {
                const verText = fs.readFileSync(path.join(phasesRootDir, phaseDirName, verFile), 'utf8');
                const verStatusMatch = verText.match(/^status:\s*(\S+)/m);
                const verStatus = verStatusMatch ? verStatusMatch[1].trim() : null;
                if (verStatus && verStatus !== 'passed') {
                  incomingStatus = 'in_progress';
                  parsed.unverified_complete_claims = parsed.unverified_complete_claims || [];
                  parsed.unverified_complete_claims.push({
                    phase: phaseNum,
                    roadmap_claim: phaseStatus,
                    verification_file: verFile,
                    verification_status: verStatus,
                  });
                }
              }
            }
          } catch { /* best-effort cross-check — never fail sync over it */ }
        }

        if (existingIdx >= 0) {
          // Identity check BEFORE anything is carried over. Sync matched this
          // entry by NUMBER, but a number is a slot, not an identity. When a
          // roadmap is replaced, slot 3 can go from "Location Template" to
          // "Competitor Gap Analysis" — two unrelated pieces of work. Carrying
          // the old status across told a live project that competitor analysis
          // was "complete" when it had never been started, and only a manual
          // disk audit caught it.
          const priorName = String(state.phases[existingIdx].name || '').trim();
          const incomingName = String(phaseName || '').trim();
          const normName = (n) => n.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
          const identityChanged = priorName && incomingName
            && normName(priorName) !== normName(incomingName);
          if (identityChanged) {
            // Different work in the same slot. Drop the inherited status and
            // completion, and let the disk-derived pass below decide afresh.
            state.phases[existingIdx].status = 'planned';
            delete state.phases[existingIdx].completed;
            delete state.phases[existingIdx].started;
            parsed.identity_changed = parsed.identity_changed || [];
            parsed.identity_changed.push({
              phase: phaseNum,
              was: priorName,
              now: incomingName,
              carried_status_dropped: true,
            });
          }
          // Backfill both id and number so future readers using either schema find it.
          state.phases[existingIdx].number = state.phases[existingIdx].number || phaseNum;
          state.phases[existingIdx].id = state.phases[existingIdx].id || phaseNum;
          state.phases[existingIdx].name = phaseName;
          if (phaseGoal) state.phases[existingIdx].goal = phaseGoal;
          // Only advance status — never downgrade an existing phase's status via sync.
          const currentRank = statusRank[normalizeStatus(state.phases[existingIdx].status)] ?? 0;
          if ((statusRank[incomingStatus] ?? 0) > currentRank) {
            state.phases[existingIdx].status = incomingStatus;
          }
        } else {
          // Write both id and number on every new entry so dedup works regardless
          // of which schema future readers expect.
          state.phases.push({
            id: phaseNum,
            number: phaseNum,
            name: phaseName,
            goal: phaseGoal,
            status: incomingStatus,
            started: null,
            completed: null,
            plan_count: 0,
          });
          parsed.phases_upserted += 1;
        }
      };

      // Format A — pipe tables
      // Phase number: \d+ (not \d{1,3}) — high numbers like 1001 are valid for
      // hot-track parking-lot phases per parking-lot-convention.md.
      // The optional 4th capture group reads the status column when present
      // (fix #897 — status was silently dropped before).
      const rowRe = /^\|\s*(\d+(?:\.\d+)?)\s*\|\s*([^|]+?)\s*\|\s*([^|]*?)\s*\|(?:\s*([^|\n]*?)\s*\|)?/gm;
      let m;
      while ((m = rowRe.exec(roadmap)) !== null) {
        upsertPhase(m[1].trim(), m[2].trim(), m[3].trim(), m[4] || '');
      }

      // Format B — heading style
      const headRe = /^#{2,4}\s*Phase\s+(\d+(?:\.\d+)?)\s*[—\-:]\s*([^\n]+)$/gm;
      while ((m = headRe.exec(roadmap)) !== null) {
        const num = m[1].trim();
        const name = m[2].trim();
        const after = roadmap.slice(headRe.lastIndex).split(/\n/).slice(0, 8).join('\n');
        const goalMatch = after.match(/\*\*Goal:\*\*\s*([^\n]+)/i);
        // Fix #897 — read **Status:** from the post-heading block so heading-format
        // ROADMAPs propagate phase status into state just like pipe-table format.
        const statusMatch = after.match(/\*\*Status:\*\*\s*(.+)/i);
        const phaseStatus = statusMatch ? statusMatch[1].trim() : '';
        upsertPhase(num, name, goalMatch ? goalMatch[1].trim() : '', phaseStatus);
      }
    }

    // Parse epics.md for epics AND stories (issue #135 — story-level sync).
    // Supports both whole-document "## EPIC-NN" and sharded "epics/epic-N.md" layouts.
    parsed.stories_found = 0;
    parsed.stories_upserted = 0;
    parsed.stories_preserved_status = 0;
    parsed.sprints_found = 0;
    parsed.sprints_upserted = 0;

    if (parsed.epics_exists) {
      const epics = fs.readFileSync(epicsPath, 'utf8');
      parsed.epics_found = (epics.match(/^##\s+EPIC-\d+/gim) || epics.match(/^##\s+Epic\s+\d+/gim) || []).length;
      state.epics_count = parsed.epics_found;

      // Parse epic blocks and their stories.
      // Epic heading examples:  "## EPIC-01 — Setup"  or  "## Epic 1: User Auth"
      // Story heading examples: "### Story 01.03 — Schema"  or  "### Story 1.3: Foo"
      if (!state.epics) state.epics = [];
      const epicBlocks = epics.split(/^##\s+(?:EPIC-\d+|Epic\s+\d+)/im);
      const epicHeaders = epics.match(/^##\s+(?:EPIC-\d+|Epic\s+\d+)[^\n]*$/gim) || [];
      for (let i = 0; i < epicHeaders.length; i++) {
        const header = epicHeaders[i];
        const body = epicBlocks[i + 1] || '';
        const numMatch = header.match(/(\d+)/);
        if (!numMatch) continue;
        const epicNum = String(parseInt(numMatch[1], 10)); // strip leading zeros
        const nameMatch = header.match(/[—\-:]\s*(.+?)\s*$/);
        const epicName = nameMatch ? nameMatch[1].trim() : `Epic ${epicNum}`;

        // Upsert epic with story-level preservation.
        let epicEntry = state.epics.find(e => String(parseInt(e.number, 10)) === epicNum);
        if (!epicEntry) {
          epicEntry = { number: epicNum, name: epicName, status: 'planned', stories: [] };
          state.epics.push(epicEntry);
        } else {
          epicEntry.name = epicName;
          if (!epicEntry.stories) epicEntry.stories = [];
        }

        // Parse stories inside this epic's body.
        const storyRe = /^###\s+Story\s+(\d+[\.-]\d+)[^\n]*?(?:[—\-:]\s*(.+?))?$/gim;
        let sm;
        while ((sm = storyRe.exec(body)) !== null) {
          const storyId = sm[1].replace('-', '.');
          const storyName = (sm[2] || '').trim() || `Story ${storyId}`;
          parsed.stories_found += 1;
          const existing = epicEntry.stories.find(s => String(s.id) === storyId);
          if (existing) {
            // Preserve status — state is authoritative for "completed" / "in_progress"
            existing.name = storyName;
            parsed.stories_preserved_status += 1;
          } else {
            epicEntry.stories.push({
              id: storyId,
              name: storyName,
              status: 'pending',
            });
            parsed.stories_upserted += 1;
          }
        }
      }
    }

    // Walk phase sprint artifacts into state.sprints[] (issue #135).
    // Support both legacy `sprint-1.md` and workflow-generated
    // `01-01-SPRINT.md` / `1-1-SPRINT.md` names.
    const phasesDir = path.join(PLANNING_DIR, 'phases');
    const rcodePhasesDir = path.join(RCODE_DIR, 'phases');
    const sprintRoot = fs.existsSync(phasesDir) ? phasesDir : (fs.existsSync(rcodePhasesDir) ? rcodePhasesDir : null);
    if (sprintRoot) {
      if (!state.sprints) state.sprints = [];
      for (const phaseEntry of fs.readdirSync(sprintRoot)) {
        const phaseDir = path.join(sprintRoot, phaseEntry);
        if (!fs.statSync(phaseDir).isDirectory()) continue;
        const phaseNumMatch = phaseEntry.match(/^(\d+(?:\.\d+)?)/);
        const phaseNum = phaseNumMatch ? phaseNumMatch[1] : phaseEntry;
        for (const file of fs.readdirSync(phaseDir)) {
          const sprintMatch =
            file.match(/^sprint-(\d+)\.md$/i) ||
            file.match(/^(?:\d+(?:\.\d+)?[-_.])?(\d+)[-_.].*SPRINT\.md$/i);
          if (!sprintMatch) continue;
          const sprintNum = String(parseInt(sprintMatch[1], 10));
          const sprintKey = `${phaseNum}/${sprintNum}`;
          parsed.sprints_found += 1;
          const sprintPath = path.join(phaseDir, file);
          const sprintText = fs.readFileSync(sprintPath, 'utf8');
          const goalMatch = sprintText.match(/(?:^goal:\s*(.+)$|\*\*Sprint Goal:\*\*\s*(.+))/im);
          const goal = goalMatch ? (goalMatch[1] || goalMatch[2] || '').trim() : '';
          const existing = state.sprints.find(s => s.key === sprintKey);
          if (existing) {
            existing.phase = phaseNum;
            existing.number = sprintNum;
            if (goal) existing.goal = goal;
            existing.file = path.relative(PROJECT_ROOT, sprintPath);
          } else {
            state.sprints.push({
              key: sprintKey,
              phase: phaseNum,
              number: sprintNum,
              goal,
              status: 'planned',
              file: path.relative(PROJECT_ROOT, sprintPath),
            });
            parsed.sprints_upserted += 1;
          }
        }
      }
    }

    if (!parsed.roadmap_exists && !parsed.epics_exists && parsed.sprints_found === 0) {
      throw new Error(`state sync --from-disk: no ROADMAP.md, epics.md, or sprint files found`);
    }

    // Issue #478 — prune state phases not present in ROADMAP.
    // After upserting ROADMAP → state, seenNums holds every number the ROADMAP
    // parser found. Any state entry whose id/number is NOT in seenNums is stale
    // (e.g. from renumbering, manual edits, or partial removals). Prune them,
    // but only when we successfully parsed at least 1 phase from ROADMAP.
    parsed.phases_pruned = 0;
    if (parsed.roadmap_exists && seenNums.size > 0) {
      const before = state.phases.length;
      state.phases = state.phases.filter(p => {
        const key = String(p.id || p.number || '').trim();
        return !key || seenNums.has(key);
      });
      parsed.phases_pruned = before - state.phases.length;
    }

    // Issue #455 — surface silent no-op when ROADMAP exists but parser found nothing.
    const warnings = [];
    if (parsed.roadmap_exists && parsed.phases_found === 0) {
      warnings.push('ROADMAP.md exists but no phases parsed — check format (expected pipe-table rows or "## Phase NN — Name" headings).');
    }
    if (parsed.epics_exists && parsed.epics_found === 0) {
      warnings.push('epics.md exists but no epics parsed — check "## EPIC-NN" or "## Epic N" heading format.');
    }

    // #894 — Proactively sync state.milestone from ROADMAP on state sync.
    // After upserting phases from ROADMAP, also derive the active milestone from
    // the last top-level milestone heading and correct state.milestone if stale.
    if (parsed.roadmap_exists) {
      try {
        const rmSync = fs.readFileSync(roadmapPath, 'utf8');
        const syncMhRe = /^#{1,2}\s+(M\d+[^\n]*)/gm;
        let syncLastLabel = null, syncMhM;
        while ((syncMhM = syncMhRe.exec(rmSync)) !== null) {
          if (/^milestones?\s*$/i.test(syncMhM[1].trim())) continue;
          syncLastLabel = syncMhM[1].trim();
        }
        if (syncLastLabel && syncLastLabel !== (state.milestone || '')) {
          state.milestone = syncLastLabel;
          parsed.milestone_synced = syncLastLabel;
        }
      } catch (_) { /* ROADMAP unreadable at write time; leave milestone as-is */ }
    }

    writeState(state);
    return { ok: true, synced: true, ...parsed, ...(warnings.length ? { warnings } : {}) };
  }


  return undefined;
}

module.exports = { dispatch };
