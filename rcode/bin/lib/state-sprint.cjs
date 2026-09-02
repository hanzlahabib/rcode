'use strict';
/**
 * state-sprint.cjs — `state sprint <sub>` / `state story <sub>` branches,
 * extracted from cmdState() in rcode-tools.cjs (#204 step 3).
 *
 * Covers: sprint add/init-all/list/status/start/complete/velocity,
 * story add/move/list.
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
    PLANNING_DIR,
    PROJECT_ROOT,
    RCODE_DIR,
    STATE_PATH,
  } = deps;
  const statePath = STATE_PATH;
  const sub = subArgs[0];

  if (sub === 'sprint' && subArgs[1] === 'add') {
    const flags = parseFlags(2);
    const state = readState() || defaultState();
    if (!flags.phase) throw new Error('sprint add requires --phase <NN>');
    if (!flags.goal) throw new Error('sprint add requires --goal "Sprint goal"');

    const phaseIdx = state.phases.findIndex(p =>
      String(p.number) === String(flags.phase) ||
      String(p.id) === String(flags.phase) ||
      p.name === flags.phase
    );
    if (phaseIdx === -1) throw new Error(`Phase "${flags.phase}" not found in state. If the phase exists in ROADMAP.md, run "rcode state sync" or "/rcode-update" to synchronize state first.`);
    const phase = state.phases[phaseIdx];

    // Derive phase number: prefer explicit .number, fallback to array position
    // Prefer explicit .number, then .id (zero-padded string like "01"),
    // then array position
    const phaseNum = phase.number != null
      ? phase.number
      : phase.id != null
        ? parseInt(phase.id, 10) || (phaseIdx + 1)
        : phaseIdx + 1;
    if (!phase.sprints) phase.sprints = [];
    const sprintNum = phase.sprints.length + 1;
    const padPhase = String(phaseNum); // no leading zeros
    const sprintId = `${padPhase}.${sprintNum}`;

    const sprint = {
      id: sprintId,
      number: sprintNum,
      goal: flags.goal,
      status: 'planned',
      velocity_target: flags.velocity ? parseInt(flags.velocity, 10) : null,
      velocity_actual: null,
      started_at: null,
      completed_at: null,
      stories: [],
    };
    phase.sprints.push(sprint);
    state.current_sprint = sprintId;
    return writeStateCompact(state, { sprint_id: sprintId, phase: padPhase });
  }

  // --- logs prune [--dir <path>] [--older-than <days>] [--dry-run] ---
  // Prune dated session-* artifacts (#13). Defaults:
  //   dir         = .rcode/progress/
  //   pattern     = session-*.md
  //   older-than  = 90 days
  //   dry-run     = true (so accidental invocation never deletes)
  // No-op if the directory doesn't exist — prints a friendly message.
  // File age is determined by mtime, not filename.
  if (sub === 'sprint' && subArgs[1] === 'init-all') {
    const flags = parseFlags(2);
    const dryRun = ('dry-run' in flags) || subArgs.includes('--dry-run');
    const filePath = flags.file || path.join(PLANNING_DIR, 'sprints.md');
    if (!fs.existsSync(filePath)) {
      return {
        ok: true,
        created: 0,
        message: `No sprints.md found at ${path.relative(PROJECT_ROOT, filePath)}. Write one with rows like '| 1 | 3 | Migrate auth module |' to bulk-initialize sprints.`,
      };
    }
    const text = fs.readFileSync(filePath, 'utf8');
    const rows = [];

    // Parse markdown-table form: skip header + separator rows, accept any
    // row with at least 3 pipe-delimited cells (sprint, phase, goal).
    const lines = text.split(/\r?\n/);
    let inTable = false;
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('|')) { inTable = false; continue; }
      // Separator row like |---|---|---|
      if (/^\|\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?$/.test(trimmed)) { inTable = true; continue; }
      const cells = trimmed.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
      if (cells.length < 3) continue;
      // Header detection: skip if first cell is non-numeric AND we haven't seen separator yet
      if (!inTable && !/^\d/.test(cells[0])) continue;
      // Tolerate extra columns; first three are sprint, phase, goal.
      const sprintNum = parseInt(cells[0], 10);
      const phaseRef = cells[1];
      const goal = cells[2];
      if (!Number.isFinite(sprintNum) || !phaseRef || !goal) continue;
      rows.push({ sprint: sprintNum, phase: phaseRef, goal });
    }

    // Fallback: parse "## Sprint N — Phase X — Goal" heading form.
    if (rows.length === 0) {
      const hRe = /^#{2,3}\s*Sprint\s+(\d+)\s*[—\-:]\s*Phase\s+([\d.]+)\s*[—\-:]\s*(.+)$/gim;
      let m;
      while ((m = hRe.exec(text)) !== null) {
        rows.push({ sprint: parseInt(m[1], 10), phase: m[2], goal: m[3].trim() });
      }
    }

    if (rows.length === 0) {
      return {
        ok: true,
        created: 0,
        message: `sprints.md parsed but no rows recognized. Expected '| sprint | phase | goal |' table or '## Sprint N — Phase X — Goal' headings.`,
      };
    }

    const state = readState() || defaultState();
    const created = [];
    const skipped = [];
    for (const row of rows) {
      const phaseIdx = state.phases.findIndex(p =>
        String(p.number) === String(row.phase) ||
        String(p.id) === String(row.phase) ||
        p.name === row.phase
      );
      if (phaseIdx === -1) {
        skipped.push({ ...row, reason: `phase ${row.phase} not found` });
        continue;
      }
      const phase = state.phases[phaseIdx];
      if (!phase.sprints) phase.sprints = [];
      const phaseNum = phase.number != null ? phase.number
        : phase.id != null ? (parseInt(phase.id, 10) || (phaseIdx + 1))
        : phaseIdx + 1;
      const sprintId = `${phaseNum}.${row.sprint}`;
      if (phase.sprints.some(s => s.id === sprintId || s.number === row.sprint)) {
        skipped.push({ ...row, reason: `sprint ${sprintId} already exists` });
        continue;
      }
      const sprint = {
        id: sprintId,
        number: row.sprint,
        goal: row.goal,
        status: 'planned',
        velocity_target: null,
        velocity_actual: null,
        started_at: null,
        completed_at: null,
        stories: [],
      };
      if (!dryRun) phase.sprints.push(sprint);
      created.push({ sprint_id: sprintId, phase: String(phaseNum), goal: row.goal });
    }
    if (!dryRun && created.length > 0) writeState(state);
    return {
      ok: true,
      dry_run: dryRun,
      created: created.length,
      skipped: skipped.length,
      file: path.relative(PROJECT_ROOT, filePath),
      details: { created, skipped },
    };
  }

  // --- sprint list [--phase NN] ---
  if (sub === 'sprint' && subArgs[1] === 'list') {
    const flags = parseFlags(2);
    const state = readState() || defaultState();
    const results = [];
    for (const phase of (state.phases || [])) {
      if (flags.phase && String(phase.number) !== String(flags.phase)) continue;
      for (const s of (phase.sprints || [])) {
        const done = (s.stories || []).filter(t => t.status === 'done').length;
        const total = (s.stories || []).length;
        const points_done = (s.stories || []).filter(t => t.status === 'done').reduce((a, t) => a + (t.points || 0), 0);
        const points_total = (s.stories || []).reduce((a, t) => a + (t.points || 0), 0);
        results.push({
          id: s.id, goal: s.goal, status: s.status,
          stories: `${done}/${total}`, points: `${points_done}/${points_total}`,
          velocity_target: s.velocity_target,
        });
      }
    }
    return results;
  }

  // --- sprint status [--sprint NN.S] ---
  if (sub === 'sprint' && subArgs[1] === 'status') {
    const flags = parseFlags(2);
    const state = readState() || defaultState();
    const targetId = flags.sprint || state.current_sprint;
    if (!targetId) throw new Error('No current sprint. Use --sprint NN.S or run sprint add first.');

    let found = null;
    for (const phase of (state.phases || [])) {
      for (const s of (phase.sprints || [])) {
        if (s.id === targetId) { found = s; break; }
      }
      if (found) break;
    }
    if (!found) throw new Error(`Sprint "${targetId}" not found`);

    const stories = found.stories || [];
    const byStatus = { todo: [], in_progress: [], review: [], done: [] };
    for (const st of stories) (byStatus[st.status] || byStatus.todo).push(st);
    const points_done = byStatus.done.reduce((a, t) => a + (t.points || 0), 0);
    const points_total = stories.reduce((a, t) => a + (t.points || 0), 0);

    return {
      sprint: found.id, goal: found.goal, status: found.status,
      velocity_target: found.velocity_target, velocity_actual: found.velocity_actual,
      stories: { todo: byStatus.todo.length, in_progress: byStatus.in_progress.length,
                 review: byStatus.review.length, done: byStatus.done.length, total: stories.length },
      points: { done: points_done, total: points_total,
                remaining: points_total - points_done },
    };
  }

  // --- sprint start [--sprint NN.S] ---
  if (sub === 'sprint' && subArgs[1] === 'start') {
    const flags = parseFlags(2);
    const state = readState() || defaultState();
    const targetId = flags.sprint || state.current_sprint;
    if (!targetId) throw new Error('No sprint to start. Use --sprint NN.S.');

    for (const phase of (state.phases || [])) {
      for (const s of (phase.sprints || [])) {
        if (s.id === targetId) {
          s.status = 'active';
          s.started_at = new Date().toISOString();
          state.current_sprint = targetId;
          return writeStateCompact(state, { started: targetId });
        }
      }
    }
    throw new Error(`Sprint "${targetId}" not found`);
  }

  // --- sprint complete [--sprint NN.S] ---
  if (sub === 'sprint' && subArgs[1] === 'complete') {
    const flags = parseFlags(2);
    const state = readState() || defaultState();
    const targetId = flags.sprint || state.current_sprint;
    if (!targetId) throw new Error('No sprint to complete. Use --sprint NN.S.');

    for (const phase of (state.phases || [])) {
      for (const s of (phase.sprints || [])) {
        if (s.id === targetId) {
          const points_done = (s.stories || []).filter(t => t.status === 'done').reduce((a, t) => a + (t.points || 0), 0);
          s.status = 'completed';
          s.completed_at = new Date().toISOString();
          s.velocity_actual = points_done;
          if (!state.velocity_history) state.velocity_history = [];
          state.velocity_history.push({ sprint: targetId, points: points_done, completed_at: s.completed_at });
          state.current_sprint = null;
          return writeStateCompact(state, { completed: targetId, velocity: points_done });
        }
      }
    }
    throw new Error(`Sprint "${targetId}" not found`);
  }

  // --- sprint velocity ---
  if (sub === 'sprint' && subArgs[1] === 'velocity') {
    const state = readState() || defaultState();
    const history = state.velocity_history || [];
    const avg = history.length > 0
      ? Math.round(history.reduce((a, v) => a + v.points, 0) / history.length)
      : 0;
    return { history, average_velocity: avg, sprint_count: history.length };
  }

  // --- story add --sprint NN.S --title "Story title" --points N ---
  if (sub === 'story' && subArgs[1] === 'add') {
    const flags = parseFlags(2);
    const state = readState() || defaultState();
    const sprintId = flags.sprint || state.current_sprint;
    if (!sprintId) throw new Error('story add requires --sprint NN.S or an active sprint');
    if (!flags.title) throw new Error('story add requires --title "Story title"');

    for (const phase of (state.phases || [])) {
      for (const s of (phase.sprints || [])) {
        if (s.id === sprintId) {
          if (!s.stories) s.stories = [];
          const storyNum = s.stories.length + 1;
          const storyId = `${sprintId}.${String(storyNum)}`;
          const story = {
            id: storyId,
            title: flags.title,
            points: flags.points ? parseInt(flags.points, 10) : 0,
            status: 'todo',
            acceptance: flags.acceptance || null,
          };
          s.stories.push(story);
          return writeStateCompact(state, { story_id: storyId, sprint: sprintId });
        }
      }
    }
    throw new Error(`Sprint "${sprintId}" not found`);
  }

  // --- story move --id NN.S.TT --status done ---
  if (sub === 'story' && subArgs[1] === 'move') {
    const flags = parseFlags(2);
    const state = readState() || defaultState();
    if (!flags.id) throw new Error('story move requires --id NN.S.TT');
    if (!flags.status) throw new Error('story move requires --status <todo|in_progress|review|done>');
    const validStatuses = ['todo', 'in_progress', 'review', 'done'];
    if (!validStatuses.includes(flags.status)) throw new Error(`Invalid status "${flags.status}". Valid: ${validStatuses.join(', ')}`);

    for (const phase of (state.phases || [])) {
      for (const s of (phase.sprints || [])) {
        for (const story of (s.stories || [])) {
          if (story.id === flags.id) {
            const prev = story.status;
            story.status = flags.status;
            return writeStateCompact(state, { story: flags.id, from: prev, to: flags.status });
          }
        }
      }
    }
    throw new Error(`Story "${flags.id}" not found`);
  }

  // --- story list [--sprint NN.S] [--status todo|in_progress|done] ---
  if (sub === 'story' && subArgs[1] === 'list') {
    const flags = parseFlags(2);
    const state = readState() || defaultState();
    const sprintId = flags.sprint || state.current_sprint;
    const results = [];
    for (const phase of (state.phases || [])) {
      for (const s of (phase.sprints || [])) {
        if (sprintId && s.id !== sprintId) continue;
        for (const story of (s.stories || [])) {
          if (flags.status && story.status !== flags.status) continue;
          results.push({ ...story, sprint: s.id });
        }
      }
    }
    return results;
  }

  // --- record-execution ---

  return undefined;
}

module.exports = { dispatch };
