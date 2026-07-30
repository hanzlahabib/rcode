/**
 * cli/lib/github-sync-discover.cjs — phase/epic/story discovery for github-sync
 *
 * Owns discovery for BOTH artifact tracks this project produces:
 *   - sprint-track:  .planning/phases/{slug}/{phase}-{plan}-SPRINT.md
 *                    (`<task id="" title="">` XML blocks, current planner output)
 *   - epic-track:    .planning/epics/EPIC-{NN}.md + .planning/epics/stories/{N}.{M}.md
 *                    (PRD → epics → stories chain, phase-agnostic per docs/adr/0001)
 *
 * Required by both cli/github-sync.js (the CLI entry point) and
 * test/github-sync.test.cjs (so discovery logic is exercised directly instead
 * of being duplicated inline in tests).
 */

const fs = require('fs');
const path = require('path');

/**
 * Parse YAML-ish frontmatter from the top of a markdown file.
 * Used to extract explicit epic/sprint linking from story files.
 * Returns an object of key/value strings, or {} if no frontmatter block.
 */
function extractFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const fm = {};
  for (const line of match[1].split(/\r?\n/)) {
    const m = line.match(/^([\w_-]+)\s*:\s*(.*)$/);
    if (m) fm[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return fm;
}

function extractTitle(markdown) {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

/**
 * Parse `<task id="" title="">` blocks out of a SPRINT.md's text, mirroring
 * server/lib/scanner.js's buildPhaseTree parser (the proven-working reference
 * implementation for the current planner output format). Falls back to the
 * legacy `### Story|Task N — title` heading format when no `<task>` blocks
 * are present (pre-<task> SPRINT.md era).
 *
 * Each returned item becomes a story-equivalent GitHub issue — the
 * sprint-track has no separate epic level; sprint grouping is surfaced via
 * the `sprintId` field in the issue body's "Sprint:" line.
 */
function parseSprintTasks(text, sprintId, file, sourcePathPrefix) {
  const tasks = [];
  const taskRe = /<task\b([^>]*)>([\s\S]*?)<\/task>/g;
  let tm;
  let n = 0;
  while ((tm = taskRe.exec(text))) {
    n += 1;
    const idM = tm[1].match(/id="([^"]+)"/);
    const titleAttrM = tm[1].match(/title="([^"]*)"/);
    const titleTagM = tm[2].match(/<title>([\s\S]*?)<\/title>/);
    tasks.push({
      id: idM ? idM[1] : `${sprintId}-task-${n}`,
      file,
      content: tm[0],
      title: (titleAttrM && titleAttrM[1].trim()) || (titleTagM && titleTagM[1].trim()) || `Task ${n}`,
      parentEpic: null,
      sprintId,
      frontmatter: {},
      sourcePath: `${sourcePathPrefix}/${file}`,
    });
  }

  // Fallback for pre-<task> SPRINT.md format: "### Story N — title" / "### Task X — title".
  if (tasks.length === 0) {
    const headRe = /^#{2,4}\s+(?:Story|Task)\s+([^\s—–-]+)\s*[—–-]\s*(.+?)\s*$/gm;
    let hm;
    while ((hm = headRe.exec(text))) {
      tasks.push({
        id: hm[1].trim(),
        file,
        content: hm[0],
        title: hm[2].trim(),
        parentEpic: null,
        sprintId,
        frontmatter: {},
        sourcePath: `${sourcePathPrefix}/${file}`,
      });
    }
  }

  return tasks;
}

/**
 * Discover sprint-track phases from .planning/phases/*-SPRINT.md files.
 * Returns every discovered phase directory, even ones with zero SPRINT.md
 * files (parity with the dead legacy directory-tree discovery behavior).
 */
function discoverSprintTrackPhases(cwd) {
  const phasesDir = path.join(cwd, '.planning', 'phases');
  if (!fs.existsSync(phasesDir)) return [];

  const phases = [];
  for (const entry of fs.readdirSync(phasesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    const numericIdM = entry.name.match(/^(\d+)-/);
    const numericId = numericIdM ? numericIdM[1] : null;
    const phaseDir = path.join(phasesDir, entry.name);
    const sourcePathPrefix = `.planning/phases/${entry.name}`;

    const sprintFiles = fs
      .readdirSync(phaseDir)
      .filter((f) => /-SPRINT\.md$/i.test(f))
      .sort((a, b) => {
        const na = parseInt((a.match(/-(\d+)-SPRINT\.md$/i) || [])[1] || '0', 10);
        const nb = parseInt((b.match(/-(\d+)-SPRINT\.md$/i) || [])[1] || '0', 10);
        return na - nb;
      });

    const stories = [];
    for (const file of sprintFiles) {
      const text = fs.readFileSync(path.join(phaseDir, file), 'utf8');
      const fileM = file.match(/^(\d+)-(\d+)-SPRINT\.md$/i);
      let sprintId;
      if (fileM) {
        sprintId = `${parseInt(fileM[1], 10)}.${parseInt(fileM[2], 10)}`;
      } else {
        const fm = extractFrontmatter(text);
        sprintId = fm.sprint || file.replace(/-SPRINT\.md$/i, '');
      }
      stories.push(...parseSprintTasks(text, sprintId, file, sourcePathPrefix));
    }

    phases.push({
      id: entry.name,
      numericId,
      brief: null,
      sprints: null,
      sprintMap: {},
      stories,
      epics: [],
      noMilestone: false,
    });
  }

  return phases;
}

/**
 * Discover the epic-track from .planning/epics/EPIC-{NN}.md +
 * .planning/epics/stories/{N}.{M}.md, per the layout in
 * rcode/workflows/create-epics-and-stories.md. Story files use bold
 * Markdown fields (`**Epic:** EPIC-{N} — {title}`), NOT YAML frontmatter —
 * extractFrontmatter correctly returns {} for these and is not used here.
 *
 * Epic file names are zero-padded (EPIC-01.md) but a story's `**Epic:**`
 * field is unpadded (EPIC-1) — match by NUMERIC value so padding
 * differences never break the parent link.
 *
 * Returns null when .planning/epics/ doesn't exist, or when it exists but
 * has no epics and no stories (nothing to sync — avoid a spurious empty
 * synthetic phase).
 */
function discoverEpicTrackPhase(cwd) {
  const epicsDir = path.join(cwd, '.planning', 'epics');
  if (!fs.existsSync(epicsDir)) return null;

  const epics = [];
  const epicFiles = fs.readdirSync(epicsDir).filter((f) => /^EPIC-\d+\.md$/i.test(f));
  for (const file of epicFiles) {
    const content = fs.readFileSync(path.join(epicsDir, file), 'utf8');
    const numM = file.match(/(\d+)/);
    const epicNumber = numM ? parseInt(numM[1], 10) : null;
    const id = file.replace(/\.md$/i, '');
    epics.push({
      id,
      file,
      epicNumber,
      content,
      title: extractTitle(content) || id,
      frontmatter: {},
      sourcePath: `.planning/epics/${file}`,
    });
  }

  const stories = [];
  const storiesDir = path.join(epicsDir, 'stories');
  if (fs.existsSync(storiesDir)) {
    const storyFiles = fs.readdirSync(storiesDir).filter((f) => /^[\d.]+\.md$/.test(f));
    for (const file of storyFiles) {
      const content = fs.readFileSync(path.join(storiesDir, file), 'utf8');
      const id = file.replace(/\.md$/i, '');
      const epicRefM = content.match(/\*\*Epic:\*\*\s*EPIC-(\d+)/i);
      let parentEpic = null;
      if (epicRefM) {
        const refNum = parseInt(epicRefM[1], 10);
        const matchedEpic = epics.find((e) => e.epicNumber === refNum);
        if (matchedEpic) parentEpic = matchedEpic.id;
      }
      stories.push({
        id,
        file,
        content,
        title: extractTitle(content) || id,
        parentEpic,
        sprintId: null,
        frontmatter: {},
        sourcePath: `.planning/epics/stories/${file}`,
      });
    }
  }

  if (epics.length === 0 && stories.length === 0) return null;

  return {
    id: 'epics',
    numericId: null,
    brief: null,
    sprints: null,
    sprintMap: {},
    stories,
    epics,
    // Signals this synthetic phase has no numbered-phase milestone to
    // attach to on GitHub — epic-track is a deliberately phase-agnostic
    // PRD→epics→stories chain per docs/adr/0001, distinct from the numbered
    // .planning/phases/ milestones.
    noMilestone: true,
  };
}

/**
 * Combine sprint-track and epic-track discovery into one phases array.
 */
function discoverPhases(cwd) {
  const phases = discoverSprintTrackPhases(cwd);
  const epicPhase = discoverEpicTrackPhase(cwd);
  if (epicPhase) phases.push(epicPhase);
  return phases;
}

/**
 * Apply granular --sprint/--epic/--story filters to the discovered phases.
 * Mutates a shallow copy — original discovery result is not touched.
 * Returns a new phases array where only the requested items remain.
 */
function applyGranularFilters(phases, opts) {
  // No filters → return as-is
  if (!opts.sprint && !opts.epic && !opts.story) return phases;

  const filtered = phases.map((p) => ({
    ...p,
    epics: [...p.epics],
    stories: [...p.stories],
  }));

  if (opts.sprint) {
    // Normalize both dash and dot sprint-id forms so --sprint=44-1 and
    // --sprint=44.1 both match a stored sprintId of "44.1".
    const sprintNorm = opts.sprint.replace(/-/g, '.');
    for (const p of filtered) {
      // Keep only stories whose sprintId matches
      p.stories = p.stories.filter((s) => s.sprintId === opts.sprint || s.sprintId === sprintNorm);
      // Keep only epics that have at least one remaining story or whose id
      // the user might also be interested in (conservative: keep all epics
      // in this phase so child stories have a visible parent reference)
      // Actually: if filtering by sprint, user wants the sprint's work —
      // stories only. Drop epics unless they're referenced by a remaining
      // story.
      const liveEpicIds = new Set(p.stories.map((s) => s.parentEpic).filter(Boolean));
      p.epics = p.epics.filter((e) => liveEpicIds.has(e.id));
    }
  }

  if (opts.epic) {
    for (const p of filtered) {
      p.epics = p.epics.filter((e) => e.id === opts.epic);
      // Keep stories whose parentEpic matches
      p.stories = p.stories.filter((s) => s.parentEpic === opts.epic);
    }
  }

  if (opts.story) {
    for (const p of filtered) {
      p.stories = p.stories.filter((s) => s.id === opts.story);
      // Keep any epic a surviving story points at (so link target exists)
      const parents = new Set(p.stories.map((s) => s.parentEpic).filter(Boolean));
      p.epics = p.epics.filter((e) => parents.has(e.id));
    }
  }

  // Drop phases that ended up completely empty after filtering
  return filtered.filter(
    (p) => p.epics.length > 0 || p.stories.length > 0,
  );
}

module.exports = {
  extractFrontmatter,
  extractTitle,
  discoverSprintTrackPhases,
  discoverEpicTrackPhase,
  discoverPhases,
  applyGranularFilters,
};
