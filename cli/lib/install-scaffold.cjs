/**
 * cli/lib/install-scaffold.cjs — directory/file scaffolding helpers: mkdir,
 * recursive directory copy, and seeding .planning/ + .rcode/state.json for
 * a fresh install.
 *
 * Split out of cli/install.js (#1066 Phase 1) — mechanical move, no
 * behavior change.
 */

const fs = require('fs');
const path = require('path');
const { writeFileAtomic } = require('./fsutil.cjs');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

/**
 * Recursive directory copy (pure Node stdlib, no deps).
 */
function copyDirRecursive(source, dest) {
  if (!fs.existsSync(source)) return;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const srcPath = path.join(source, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDirRecursive(srcPath, destPath);
    else if (entry.isFile()) fs.copyFileSync(srcPath, destPath);
  }
}

/**
 * Seed .planning/ with starter ROADMAP.md + STATE.md + PROJECT.md so
 * workflows work immediately after install. User can /rcode-sprint-planning
 * on a fresh install without manual setup.
 *
 * Only seeds if .planning/ROADMAP.md doesn't already exist (preserves user data).
 */
function seedStarterPlanning(target, projectName) {
  const planningDir = path.join(target, '.planning');
  const roadmapPath = path.join(planningDir, 'ROADMAP.md');
  const statePath = path.join(planningDir, 'STATE.md');
  const projectPath = path.join(planningDir, 'PROJECT.md');

  if (fs.existsSync(roadmapPath)) return false; // preserve existing

  fs.mkdirSync(planningDir, { recursive: true });

  const today = new Date().toISOString().slice(0, 10);
  const name = projectName || path.basename(target);

  // Stub planning files: clearly marked as install templates so users (and
  // /rcode-new-project Step 0.5 detection) can tell them apart from real
  // planning artifacts. See issues #670 #671 #676.
  const STUB_BANNER =
    `<!-- INSTALL STUB — overwritten by /rcode-new-project. Delete this file or run\n` +
    `     /rcode-new-project before committing. See https://github.com/hanzlahabib/rcode/issues/670 -->\n\n`;

  fs.writeFileSync(projectPath,
    STUB_BANNER +
    `# ${name}\n\n` +
    `**One-line:** Describe what this project is in one sentence.\n\n` +
    `## Vision\n\n` +
    `What this project delivers and who it serves.\n\n` +
    `## Stack\n\n` +
    `- Language/framework\n- Key dependencies\n- Deployment target\n`
  );

  fs.writeFileSync(roadmapPath,
    STUB_BANNER +
    `# ${name} — Roadmap\n\n` +
    `**Milestone: M1 — Initial Delivery** (v1.0)\n` +
    `Started: ${today} · Current\n\n` +
    `---\n\n` +
    `> **No phases yet.** Run \`/rcode-new-project\` to design your roadmap,\n` +
    `> or \`/rcode-add-phase <name>\` to add your first phase manually.\n\n` +
    `---\n\n` +
    `## Backlog\n\n` +
    `Ideas and future phases go here.\n`
  );

  fs.writeFileSync(statePath,
    STUB_BANNER +
    `# ${name} — State\n\n` +
    `**Last updated:** ${today}\n` +
    `**Milestone:** M1 — Initial Delivery\n` +
    `**Current phase:** none — run /rcode-new-project or /rcode-add-phase\n` +
    `**Branch:** main\n\n` +
    `---\n\n` +
    `## Decisions\n\n_None yet._\n\n` +
    `## Blockers\n\n_None._\n\n` +
    `## Next Action\n\nRun \`/rcode-new-project <description>\` to bootstrap, or \`/rcode-sprint-planning\` once a real phase exists.\n`
  );

  // Issue #670: do NOT pre-seed .rcode/state.json with a fake project +
  // "Setup & Scaffolding" phase. That made every fresh install look like a
  // real initialized project and broke /rcode-new-project Step 0.5 detection.
  //
  // Write a minimal shell with _seeded_stub:true so:
  //   - rcode-tools doesn't have to re-init on first call (avoids race)
  //   - /rcode-new-project Step 0.5 (issue #671) can detect "stub" reliably
  //   - sprint tools that previously relied on phase 01 will surface a clear
  //     "no phases yet — run /rcode-new-project first" error instead of
  //     silently operating on a fake phase
  //
  // Issue #705: only mark _seeded_stub when the planning ROADMAP is also
  // a stub. If the user manually deletes state.json but has real
  // .planning/ROADMAP.md (no INSTALL STUB banner), seeding _seeded_stub
  // would mis-classify a real project as fresh and let /rcode-new-project
  // overwrite it. Guard with the banner check.
  const rcodeStateJson = path.join(target, '.rcode', 'state.json');
  function planningRoadmapIsStub() {
    const rmPath = path.join(target, '.planning', 'ROADMAP.md');
    if (!fs.existsSync(rmPath)) return true; // missing → fresh install case
    try {
      const text = fs.readFileSync(rmPath, 'utf8');
      return text.includes('<!-- INSTALL STUB');
    } catch { return true; }
  }
  if (!fs.existsSync(rcodeStateJson)) {
    const now = new Date().toISOString();
    const isStubProject = planningRoadmapIsStub();

    // Resolve project name from config.yaml if available (#816)
    let resolvedProject = null;
    const configYamlPath = path.join(target, '.rcode', 'config.yaml');
    if (fs.existsSync(configYamlPath)) {
      try {
        const cfg = fs.readFileSync(configYamlPath, 'utf8');
        const m = cfg.match(/^project_name:\s*"?([^"\n]+)"?/m);
        if (m) resolvedProject = m[1].trim();
      } catch { /* leave null */ }
    }

    // Sync current_phase from ROADMAP.md if it exists and isn't a stub (#810)
    let resolvedPhase = null;
    const roadmapPath = path.join(target, '.planning', 'ROADMAP.md');
    if (!isStubProject && fs.existsSync(roadmapPath)) {
      try {
        const rm = fs.readFileSync(roadmapPath, 'utf8');
        // Format A — pipe table: | 01 | Phase Name | ...
        const tableMatch = rm.match(/^\|\s*(\d+(?:\.\d+)?)\s*\|/m);
        if (tableMatch) {
          resolvedPhase = String(parseInt(tableMatch[1], 10));
        } else {
          // Format B — heading: ## Phase 01 — Name
          const headMatch = rm.match(/^#{2,4}\s*Phase\s+(\d+(?:\.\d+)?)/im);
          if (headMatch) resolvedPhase = String(parseInt(headMatch[1], 10));
        }
      } catch { /* leave null */ }
    }

    const state = {
      version: '1',
      // #940 — match the canonical schema (cli/lib/schemas.cjs stateSchema):
      // schema_version is required, milestones is a plural array. Without these
      // a freshly-installed state.json failed `rcode-tools validate` until the
      // first migrateState() read. Write conformant state up front.
      schema_version: 2,
      project: resolvedProject || path.basename(target),
      ...(isStubProject ? { _seeded_stub: true } : {}),
      created: now,
      updated: now,
      current_phase: resolvedPhase,
      current_plan: 0,
      current_sprint: null,
      phases: [],
      milestones: [],
      executions: [],
      decisions: [],
      blockers: [],
      council_sessions: [],
      chains: [],
      workstreams: [],
      active_workstream: null,
      last_session: null,
      velocity_history: [],
    };
    fs.mkdirSync(path.dirname(rcodeStateJson), { recursive: true });
    writeFileAtomic(rcodeStateJson, JSON.stringify(state, null, 2) + '\n');
  }

  return true;
}

module.exports = {
  ensureDir,
  copyDirRecursive,
  seedStarterPlanning,
};
