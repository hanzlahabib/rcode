'use strict';
/**
 * state-decisions.cjs — `state <sub>` decision/blocker/session branches,
 * extracted from cmdState() in rcode-tools.cjs (#204 step 3).
 *
 * Covers: record-execution, add-decision, decisions-global, add-blocker,
 * resolve-blocker, record-session, record-council, sync-from-git,
 * record-chain, logs prune.
 *
 * Deps are injected via the `deps` object (same pattern as lib/phase.cjs).
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
    globalDecisionsPath,
    appendGlobalDecision,
    readGlobalDecisions,
    PLANNING_DIR,
    PROJECT_ROOT,
    RCODE_DIR,
    STATE_PATH,
  } = deps;
  const statePath = STATE_PATH;
  const sub = subArgs[0];

  if (sub === 'logs' && subArgs[1] === 'prune') {
    const flags = parseFlags(2);
    const dryRun = ('dry-run' in flags) || !subArgs.includes('--no-dry-run');
    const dir = flags.dir
      ? path.resolve(PROJECT_ROOT, flags.dir)
      : path.join(RCODE_DIR, 'progress');
    const olderDays = parseInt(flags['older-than'] || '90', 10);
    const pattern = flags.pattern || 'session-*.md';
    const cutoff = Date.now() - olderDays * 24 * 60 * 60 * 1000;

    if (!fs.existsSync(dir)) {
      return {
        ok: true,
        dry_run: dryRun,
        pruned: 0,
        message: `No logs directory at ${path.relative(PROJECT_ROOT, dir)} — nothing to prune.`,
      };
    }

    // Translate the glob pattern to a RegExp (only the * wildcard for safety).
    const reSrc = '^' + pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$';
    const fileRe = new RegExp(reSrc);

    const toPrune = [];
    for (const entry of fs.readdirSync(dir)) {
      if (!fileRe.test(entry)) continue;
      const full = path.join(dir, entry);
      let stat;
      try { stat = fs.statSync(full); } catch (_) { continue; }
      if (!stat.isFile()) continue;
      if (stat.mtimeMs < cutoff) {
        toPrune.push({
          file: path.relative(PROJECT_ROOT, full),
          age_days: Math.floor((Date.now() - stat.mtimeMs) / (24 * 60 * 60 * 1000)),
          bytes: stat.size,
        });
      }
    }

    if (!dryRun) {
      for (const item of toPrune) {
        try { fs.unlinkSync(path.join(PROJECT_ROOT, item.file)); }
        catch (e) { item.error = e.message; }
      }
    }

    return {
      ok: true,
      dry_run: dryRun,
      dir: path.relative(PROJECT_ROOT, dir),
      pattern,
      older_than_days: olderDays,
      pruned: dryRun ? 0 : toPrune.filter(t => !t.error).length,
      would_prune: dryRun ? toPrune.length : 0,
      details: toPrune,
    };
  }

  // --- sprint init-all [--file <path>] [--dry-run] ---
  // Bulk-initialize sprints by parsing .planning/sprints.md (#11).
  // Supported formats: markdown table with `| Sprint | Phase | Goal |` columns,
  // OR a simple "## Sprint N — Phase X — Goal" heading list. Skips rows whose
  // sprint id already exists for that phase (idempotent). No-op when the
  // file is absent — prints a helpful message rather than failing.
  if (sub === 'record-execution') {
    const flags = parseFlags(1);
    const state = readState() || defaultState();
    if (!state.executions) state.executions = [];
    state.executions.push({
      plan: flags.plan || '',
      tasks: parseInt(flags.tasks || '0', 10),
      duration_ms: flags.duration ? parseInt(flags.duration, 10) : null,
      commit_hash: flags.hash || null,
      committed_at: new Date().toISOString(),
    });
    return writeState(state);
  }

  // --- add-decision ---
  if (sub === 'add-decision') {
    // Issue #658 — caller can scope explicitly with --phase <N>; otherwise we
    // infer from state.current_phase (which can mis-fire mid-orchestration).
    const flagStart = (() => {
      for (let i = 1; i < subArgs.length; i++) if (subArgs[i].startsWith('--')) return i;
      return subArgs.length;
    })();
    const summary = subArgs.slice(1, flagStart).join(' ');
    const flags = parseFlags(flagStart);
    if (!summary) throw new Error('add-decision requires a summary argument');
    const state = readState() || defaultState();
    if (!state.decisions) state.decisions = [];
    const record = {
      summary,
      phase: flags.phase ? String(flags.phase) : state.current_phase,
      plan: flags.plan ? String(flags.plan) : state.current_plan,
      date: new Date().toISOString(),
    };
    state.decisions.push(record);
    writeState(state);
    // Mirror to cross-project store (best-effort, never fails the local write).
    try {
      appendGlobalDecision({
        ts: record.date,
        project: state.project || path.basename(PROJECT_ROOT),
        project_root: PROJECT_ROOT,
        phase: record.phase,
        plan: record.plan,
        summary: record.summary,
      });
    } catch (_) { /* silent — local commit must not break on home-dir issues */ }
    // Issue #658 — return the appended record so callers can confirm the
    // phase scope and ID without re-reading state.json.
    return {
      ok: true,
      decision: record,
      decision_index: state.decisions.length - 1,
      total_decisions: state.decisions.length,
    };
  }

  // --- decisions-global: query ~/.rcode/decisions.jsonl across all projects ---
  if (sub === 'decisions-global') {
    const flags = parseFlags(1);
    const limit = Math.max(1, parseInt(flags.limit || '20', 10));
    const sinceMs = flags.since ? Date.parse(flags.since) : null;
    const lines = readGlobalDecisions();
    const filtered = lines.filter((d) => {
      if (flags.project && d.project !== flags.project) return false;
      if (sinceMs && Date.parse(d.ts) < sinceMs) return false;
      return true;
    });
    // newest first
    filtered.sort((a, b) => (a.ts < b.ts ? 1 : -1));
    return { decisions: filtered.slice(0, limit), total: filtered.length };
  }

  // --- add-blocker ---
  if (sub === 'add-blocker') {
    const description = subArgs.slice(1).join(' ');
    if (!description) throw new Error('add-blocker requires a description argument');
    const state = readState() || defaultState();
    if (!state.blockers) state.blockers = [];
    state.blockers.push({
      description,
      phase: state.current_phase,
      plan: state.current_plan,
      date: new Date().toISOString(),
      resolved: null,
    });
    return writeState(state);
  }

  // --- resolve-blocker ---
  if (sub === 'resolve-blocker') {
    const state = readState();
    if (!state) throw new Error('No state.json found');
    if (!state.blockers || state.blockers.length === 0) {
      throw new Error('No blockers to resolve');
    }
    // Issue #656 — support --all and --phase <N> for batch resolution.
    const flagStart = subArgs[1] && /^--/.test(subArgs[1]) ? 1 : 2;
    const flags = parseFlags(flagStart);
    const indices = [];
    if (flags.all === true || flags.all === 'true') {
      for (let i = 0; i < state.blockers.length; i++) {
        if (!state.blockers[i].resolved) indices.push(i);
      }
    } else if (flags.phase) {
      const ph = String(flags.phase).replace(/^[Pp]hase\s*/, '');
      for (let i = 0; i < state.blockers.length; i++) {
        const b = state.blockers[i];
        if (b.resolved) continue;
        const matchesPhase = String(b.phase || '') === ph ||
          (b.description || '').includes(`Phase ${ph}`) ||
          (b.description || '').includes(`[Phase ${ph}]`);
        if (matchesPhase) indices.push(i);
      }
    } else {
      const index = parseInt(subArgs[1], 10);
      if (Number.isNaN(index) || index < 0 || index >= state.blockers.length) {
        throw new Error(`Invalid blocker index: ${subArgs[1]}. Valid range: 0-${state.blockers.length - 1}, or use --all / --phase <N>`);
      }
      indices.push(index);
    }
    if (indices.length === 0) {
      throw new Error('No matching unresolved blockers found');
    }
    // Issue #654 — tickets-first. Resolution must reference an issue, a
    // commit SHA, or be explicitly marked as internal with --noref. Silent
    // resolution drops the audit trail.
    const hasIssue = flags.issue && /^#?\d+$/.test(String(flags.issue));
    const hasCommit = flags.commit && /^[0-9a-f]{7,40}$/i.test(String(flags.commit));
    const noref = flags.noref === true || flags.noref === 'true';
    if (!hasIssue && !hasCommit && !noref) {
      throw new Error(
        `resolve-blocker [${index}] requires an audit reference. Pass one of:\n` +
        `  --issue <gh-issue-number>     e.g. --issue 654\n` +
        `  --commit <sha>                7-40 hex chars\n` +
        `  --noref                       acknowledge no external reference (audit trail will say "internal")`
      );
    }
    const now = new Date().toISOString();
    for (const idx of indices) {
      state.blockers[idx].resolved = now;
      if (hasIssue) state.blockers[idx].resolved_issue = String(flags.issue).replace(/^#/, '');
      if (hasCommit) state.blockers[idx].resolved_commit = String(flags.commit).slice(0, 40);
      if (noref && !hasIssue && !hasCommit) state.blockers[idx].resolved_ref = 'internal';
    }
    const result = writeState(state);
    return { ...result, resolved_count: indices.length, resolved_indices: indices };
  }

  // --- record-session ---
  if (sub === 'record-session') {
    const state = readState() || defaultState();
    state.last_session = new Date().toISOString();
    return writeState(state);
  }

  // --- record-council ---
  if (sub === 'record-council') {
    const flags = parseFlags(1);
    if (!flags.slug) throw new Error('record-council requires --slug <value>');
    const state = readState() || defaultState();
    if (!state.council_sessions) state.council_sessions = [];
    state.council_sessions.push({
      date: new Date().toISOString(),
      question_slug: flags.slug || '',
      panel: (flags.panel || '').split(',').map((s) => s.trim()).filter(Boolean),
      artifact_path: flags.artifact || '',
    });
    return writeState(state);
  }

  // --- sync-from-git ---
  // Recover execution state by inspecting git log for implementation commits.
  // For each phase that has sprints, checks whether feat:/fix:/refactor: commits
  // referencing that phase number exist. If so, marks sprints completed and phase
  // as executed (not complete — verifier should still run). Issue #915.
  if (sub === 'sync-from-git') {
    const state = readState();
    if (!state) return { ok: false, error: 'No state.json — run `state init` first.' };

    const { execSync } = require('child_process');
    let gitLog = '';
    try {
      gitLog = execSync('git log --oneline', { cwd: PROJECT_ROOT, encoding: 'utf8' });
    } catch (e) {
      return { ok: false, error: `git log failed: ${e.message}` };
    }

    const implPrefixRe = /^[a-f0-9]+ (feat|fix|refactor|perf|style|test|chore)\(/i;
    const implLines = gitLog.split('\n').filter(l => implPrefixRe.test(l));

    // Read ROADMAP.md once so we can look up each phase's declared status.
    // Fix #897 — sync-from-git was ignoring ROADMAP status entirely, causing
    // all phases to stay as 'planned' even when ROADMAP said 'complete'.
    let roadmapText = '';
    try {
      const roadmapPath = path.join(PLANNING_DIR, 'ROADMAP.md');
      if (fs.existsSync(roadmapPath)) roadmapText = fs.readFileSync(roadmapPath, 'utf8');
    } catch { /* ignore — ROADMAP is optional */ }

    // Normalise raw status strings from ROADMAP into canonical state.json vocabulary.
    // Mirrors the normalizeStatus() defined in the `state sync` handler.
    function normalizeStatusSFG(raw) {
      if (!raw) return 'planned';
      const s = String(raw).toLowerCase().replace(/[✅\s]/g, '');
      if (['complete','completed','shipped','verified','done'].includes(s)) return 'complete';
      if (['executing','in_progress','inprogress','active','started'].includes(s)) return 'in_progress';
      return 'planned';
    }

    // Returns the status declared in ROADMAP for a given phase number, or null
    // if the phase isn't found. Handles both pipe-table and heading-block formats.
    function readPhaseStatusFromRoadmap(phaseNum) {
      if (!roadmapText) return null;
      // Pipe-table row: | <num> | <name> | <goal> | <status> |
      const tableRe = new RegExp(
        `^\\|\\s*${phaseNum.replace('.', '\\.')}\\s*\\|[^|]+\\|[^|]*\\|(?:\\s*([^|\\n]*?)\\s*\\|)?`,
        'm'
      );
      const tableMatch = roadmapText.match(tableRe);
      if (tableMatch && tableMatch[1] !== undefined) return normalizeStatusSFG(tableMatch[1]);

      // Heading-block format: ## Phase <num> — <name>\n...**Status:** <value>
      const headRe = new RegExp(
        `^#{2,4}\\s*Phase\\s+${phaseNum.replace('.', '\\.')}\\s*[—\\-:]`,
        'm'
      );
      const headMatch = headRe.exec(roadmapText);
      if (headMatch) {
        const after = roadmapText.slice(headMatch.index + headMatch[0].length).split('\n').slice(0, 8).join('\n');
        const statusMatch = after.match(/\*\*Status:\*\*\s*(.+)/i);
        if (statusMatch) return normalizeStatusSFG(statusMatch[1].trim());
      }
      return null;
    }

    let syncedPhases = 0;
    let syncedSprints = 0;

    const statusRankSFG = { complete: 3, verified: 3, executed: 2, in_progress: 1, planned: 0 };

    const phases = Array.isArray(state.phases) ? state.phases : [];
    for (const phase of phases) {
      if (!phase) continue;
      const num = String(phase.number || phase.id || '').trim();
      if (!num) continue;

      // Read the phase's declared status from ROADMAP and apply it when it
      // advances the current status — never downgrade. (#897)
      const roadmapStatus = readPhaseStatusFromRoadmap(num);
      if (roadmapStatus) {
        const currentRank = statusRankSFG[phase.status] ?? 0;
        const roadmapRank = statusRankSFG[roadmapStatus] ?? 0;
        if (roadmapRank > currentRank) {
          phase.status = roadmapStatus;
          syncedPhases++;
        }
      }

      // Check if any implementation commit references this phase number.
      // Matches patterns: "phase 1", "phase 1.", "1.1", "(1)", "#1 "
      const phaseNumEscaped = num.replace('.', '\\.');
      const phaseRe = new RegExp(
        `(phase\\s*${phaseNumEscaped}[^\\d]|\\b${phaseNumEscaped}\\.\\d|\\(${phaseNumEscaped}\\)|\\s${phaseNumEscaped}\\s)`,
        'i'
      );
      const hasImplCommit = implLines.some(l => phaseRe.test(l));

      // Also check if SUMMARY.md exists for this phase
      let hasSummary = false;
      try {
        const phaseDirs = fs.existsSync(PLANNING_DIR)
          ? fs.readdirSync(PLANNING_DIR).filter(d => {
              const m = d.match(/^(\d+)/);
              return m && m[1] === num;
            })
          : [];
        if (phaseDirs.length > 0) {
          const summaryPath = path.join(PLANNING_DIR, phaseDirs[0], 'SUMMARY.md');
          hasSummary = fs.existsSync(summaryPath);
        }
      } catch { /* ignore fs errors */ }

      const sprints = Array.isArray(phase.sprints) ? phase.sprints : [];
      if ((hasImplCommit || hasSummary) && sprints.length > 0) {
        for (const sprint of sprints) {
          if (sprint && sprint.status !== 'completed') {
            sprint.status = 'completed';
            syncedSprints++;
          }
        }
        if (phase.status !== 'complete' && phase.status !== 'verified') {
          // Git evidence upgrades to 'executed' only when ROADMAP doesn't already
          // report a higher status (complete/verified already applied above).
          if ((statusRankSFG['executed'] ?? 0) > (statusRankSFG[phase.status] ?? 0)) {
            phase.status = 'executed';
            syncedPhases++;
          }
        }
      }
    }

    writeState(state);
    return {
      ok: true,
      message: `Synced ${syncedPhases} phases, ${syncedSprints} sprints from git history`,
      synced_phases: syncedPhases,
      synced_sprints: syncedSprints,
    };
  }

  // --- record-chain ---
  if (sub === 'record-chain') {
    const flags = parseFlags(1);
    if (!flags.slug) throw new Error('record-chain requires --slug <value>');
    const state = readState() || defaultState();
    if (!state.chains) state.chains = [];
    state.chains.push({
      date: new Date().toISOString(),
      slug: flags.slug || '',
      agents: (flags.agents || '').split(',').map((s) => s.trim()).filter(Boolean),
      artifacts_dir: flags.artifacts || '',
    });
    return writeState(state);
  }

  return undefined;
}

module.exports = { dispatch };
