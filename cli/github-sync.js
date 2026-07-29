/**
 * rcode github-sync — sync .rcode/ state to GitHub as issues
 *
 * Creates milestones (phases), epics (issues), and stories (issues) with
 * proper parent-child linking via GitHub's native issue references.
 * Labels are NOT created by default — opt in with --with-labels.
 * Dry-run by default. Mutations always require --execute.
 *
 * Usage:
 *   rcode github-sync                 # dry-run preview
 *   rcode github-sync --execute       # actually create issues
 *
 * Granular targeting (push specific items):
 *   --phase=phase-02          push one phase (all its epics + stories)
 *   --sprint=sprint-01        push stories belonging to one sprint
 *   --epic=epic-1-auth        push one epic and its child stories
 *   --story=story-1-1-login   push one story
 *
 * Options:
 *   --repo=owner/name     target a specific repo (otherwise auto-detect)
 *   --with-labels         also create/ensure the rcode label taxonomy
 *   --project             also create a Project v2 board
 *   --yes                 skip the confirmation prompt (denied in yolo mode)
 *   --force-yolo          allow --yes to apply in yolo mode (explicit opt-in)
 *
 * Update opt-outs:
 *   --no-update           create-only mode — never touch existing items
 *   --no-update-body      don't rewrite bodies
 *   --no-update-labels    don't touch labels
 *   --no-close            don't close issues when local marks them done
 *
 * Safety:
 *   - Mutations always require --execute AND gh auth
 *   - In communication_mode=guided: asks to confirm before mutations
 *     (skippable with --yes)
 *   - In communication_mode=yolo: STILL asks to confirm before GitHub
 *     mutations unless BOTH --yes AND --force-yolo are passed
 *   - Per AGENTS.md: never auto-pushes, every mutation is explicit
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const gh = require('./lib/github.cjs');
const { askText, PromptAbortError } = require('./lib/prompts.cjs');
const { writeJsonAtomic } = require('./lib/fsutil.cjs');
const { loadConfig } = require('./lib/config.cjs');
const { discoverPhases, applyGranularFilters } = require('./lib/github-sync-discover.cjs');

/**
 * Hash a string — used to detect content changes between syncs.
 * Cheap and deterministic; nothing security-sensitive here.
 */
function contentHash(str) {
  return crypto.createHash('sha256').update(str || '').digest('hex').slice(0, 12);
}

// ---------- Arg parsing ----------

/**
 * Simple flag philosophy:
 *   - Default: smart sync — create missing, update changed, close completed
 *   - User only needs to remember: dry-run (default) vs --execute
 *   - All narrowing flags are optional escape hatches for advanced users
 *
 * User can think of it as: "sync my project to GitHub" — that's the whole command.
 */
function parseArgs(args) {
  const opts = {
    execute: false,
    dryRun: true,
    repo: null,
    only: null, // narrow the scope (advanced): labels | milestones | epics | stories
    phase: null, // sync only one phase
    sprint: null, // sync only one sprint (filters stories)
    epic: null, // sync only one epic + its child stories
    story: null, // sync only one story
    withLabels: false, // opt-in to label creation (default off per user)
    createProject: false, // also create a Project v2 board
    yes: false, // skip interactive confirmation
    forceYolo: false, // allow --yes to apply in yolo mode

    // Smart default: enable all update operations.
    // These flags let advanced users OPT OUT, not opt in.
    updateBody: true,
    updateLabels: true,
    updateMilestone: true,
    updateState: true,
  };

  for (const arg of args) {
    // The two most common flags
    if (arg === '--execute' || arg === '-e') {
      opts.execute = true;
      opts.dryRun = false;
    } else if (arg === '--dry-run') {
      opts.dryRun = true;
      opts.execute = false;
    } else if (arg === '--yes' || arg === '-y') {
      opts.yes = true;
    } else if (arg === '--force-yolo') {
      opts.forceYolo = true;
    } else if (arg === '--with-labels') {
      opts.withLabels = true;
    } else if (arg === '--project') {
      opts.createProject = true;
    }
    // Escape hatches — disable specific update types
    else if (arg === '--no-update') {
      // Create-only mode (the old default) — disables ALL updates
      opts.updateBody = false;
      opts.updateLabels = false;
      opts.updateMilestone = false;
      opts.updateState = false;
    } else if (arg === '--no-update-body') {
      opts.updateBody = false;
    } else if (arg === '--no-update-labels') {
      opts.updateLabels = false;
    } else if (arg === '--no-close') {
      opts.updateState = false;
    }
    // Scope narrowing
    else if (arg.startsWith('--repo=')) {
      opts.repo = arg.slice('--repo='.length);
    } else if (arg.startsWith('--only=')) {
      opts.only = arg.slice('--only='.length);
    } else if (arg.startsWith('--phase=')) {
      opts.phase = arg.slice('--phase='.length);
    } else if (arg.startsWith('--sprint=')) {
      opts.sprint = arg.slice('--sprint='.length);
    } else if (arg.startsWith('--epic=')) {
      opts.epic = arg.slice('--epic='.length);
    } else if (arg.startsWith('--story=')) {
      opts.story = arg.slice('--story='.length);
    }
  }

  // Master switch: updateEnabled is true if ANY update flag is true
  opts.updateEnabled = opts.updateBody || opts.updateLabels || opts.updateMilestone || opts.updateState;

  return opts;
}

// ---------- Discover .rcode/ content ----------

function loadState(cwd) {
  const statePath = path.join(cwd, '.rcode/state.json');
  if (!fs.existsSync(statePath)) {
    return null;
  }
  // on-disk state file written by users/CI — guard against corruption or partial writes
  try { return JSON.parse(fs.readFileSync(statePath, 'utf8')); } catch { return null; }
}

// ---------- Load/save sync map (for idempotency) ----------

function loadSyncMap(cwd) {
  const mapPath = path.join(cwd, '.rcode/integrations/github-map.json');
  if (!fs.existsSync(mapPath)) {
    return { phases: {}, epics: {}, stories: {}, project: null, labels: [] };
  }
  // on-disk sync map — guard against corruption so a bad write doesn't kill the sync run
  try {
    return JSON.parse(fs.readFileSync(mapPath, 'utf8'));
  } catch {
    return { phases: {}, epics: {}, stories: {}, project: null, labels: [] };
  }
}

function saveSyncMap(cwd, map) {
  const mapPath = path.join(cwd, '.rcode/integrations/github-map.json');
  // Atomic: partial writes on Ctrl+C would desync our local↔remote mapping
  // and orphan issues. writeJsonAtomic ensures the file is either old or new.
  writeJsonAtomic(mapPath, map);
}

// ---------- Main sync flow ----------

/**
 * Detect which fields of an existing issue need updating.
 * Returns an object with only the changed fields set, or null if nothing changed.
 * Never modifies GitHub directly — this is pure diffing.
 */
function diffIssue(existing, desired, opts) {
  const updates = {};
  let hasChanges = false;

  if (opts.updateBody && desired.body !== undefined && existing.body !== desired.body) {
    updates.body = desired.body;
    hasChanges = true;
  }

  if (opts.updateLabels && desired.labels) {
    const existingLabelNames = new Set((existing.labels || []).map((l) => l.name));
    const desiredLabelNames = new Set(desired.labels);
    const toAdd = [...desiredLabelNames].filter((l) => !existingLabelNames.has(l));
    const toRemove = [...existingLabelNames].filter(
      (l) => !desiredLabelNames.has(l) && (l.startsWith('status:') || l.startsWith('priority:') || l === 'epic' || l.startsWith('type:')),
    );
    if (toAdd.length > 0) {
      updates.addLabels = toAdd;
      hasChanges = true;
    }
    if (toRemove.length > 0) {
      updates.removeLabels = toRemove;
      hasChanges = true;
    }
  }

  if (opts.updateMilestone && desired.milestone !== undefined) {
    const existingMilestone = existing.milestone ? existing.milestone.number : null;
    if (existingMilestone !== desired.milestone) {
      updates.milestone = desired.milestone;
      hasChanges = true;
    }
  }

  if (opts.updateState && desired.state !== undefined && existing.state !== desired.state) {
    updates.state = desired.state;
    hasChanges = true;
  }

  return hasChanges ? updates : null;
}

async function main(args) {
  const opts = parseArgs(args);
  const cwd = process.cwd();
  const config = loadConfig(cwd);
  const communicationMode = config.communication_mode || 'guided';

  console.log(`\n🕌 rcode — GitHub Sync`);
  console.log(`   Mode:          ${opts.dryRun ? 'DRY-RUN (preview only, nothing is sent)' : 'EXECUTE'}`);
  console.log(`   Comms mode:    ${communicationMode}`);
  console.log(`   Scope:         ${opts.only || 'full (create + update existing)'}`);
  console.log(`   Labels:        ${opts.withLabels ? 'will create/ensure taxonomy' : 'skipped (pass --with-labels to enable)'}`);
  if (!opts.updateEnabled) console.log(`   Note:          --no-update passed → create-only mode`);
  if (opts.phase) console.log(`   Phase filter:  ${opts.phase}`);
  if (opts.sprint) console.log(`   Sprint filter: ${opts.sprint}`);
  if (opts.epic) console.log(`   Epic filter:   ${opts.epic}`);
  if (opts.story) console.log(`   Story filter:  ${opts.story}`);
  console.log();

  // ------ Precondition: gh auth ------
  const auth = gh.checkAuth();
  if (!auth.authenticated) {
    console.error(`❌ gh CLI not authenticated.`);
    console.error(`   Run: gh auth login`);
    console.error(`   Error: ${auth.error || 'unknown'}`);
    process.exit(1);
  }
  console.log(`   ✓ Authenticated as ${auth.account}`);

  // ------ Precondition: target repo ------
  let repo = opts.repo;
  if (!repo) {
    const detected = gh.detectRepo(cwd);
    if (!detected) {
      console.error(`❌ Could not detect GitHub repo. Run from a git repo or pass --repo=owner/name`);
      process.exit(1);
    }
    repo = detected.nameWithOwner;
  }
  console.log(`   ✓ Target repo: ${repo}`);

  // ------ Precondition: .rcode/ exists ------
  const state = loadState(cwd);
  if (!state) {
    console.error(`❌ No .rcode/state.json found. Run 'rcode install' first.`);
    process.exit(1);
  }
  console.log(`   ✓ Project: ${state.project_name || '(unnamed)'}`);

  // ------ Discover phases ------
  let phases = discoverPhases(cwd);
  if (opts.phase) {
    // Match either the full directory id or the bare numeric prefix so
    // --phase=44 and --phase=44-github-sync-... both work.
    phases = phases.filter((p) => p.id === opts.phase || p.numericId === opts.phase);
    if (phases.length === 0) {
      console.error(`❌ Phase '${opts.phase}' not found.`);
      process.exit(1);
    }
  }

  // Apply granular filters (sprint/epic/story) AFTER phase filter
  phases = applyGranularFilters(phases, opts);

  if (phases.length === 0) {
    if (opts.sprint || opts.epic || opts.story) {
      const filter = opts.sprint
        ? `sprint '${opts.sprint}'`
        : opts.epic
        ? `epic '${opts.epic}'`
        : `story '${opts.story}'`;
      console.error(`❌ No items matched ${filter}.`);
      console.error(`   Check the filter value or run without filters to see available ids.`);
      process.exit(1);
    }
    console.log(`ℹ  No phases found in .planning/phases/ or epics in .planning/epics/ — nothing to sync.`);
    console.log(`   Run /rcode-plan or /rcode-create-epics-and-stories to get started.`);
    process.exit(0);
  }

  console.log(`   ✓ Phases found: ${phases.length}`);
  for (const p of phases) {
    console.log(`     - ${p.id} (${p.epics.length} epics, ${p.stories.length} stories)`);
  }

  // ------ Load existing sync map (for idempotency) ------
  const syncMap = loadSyncMap(cwd);
  const alreadySynced = {
    phases: Object.keys(syncMap.phases).length,
    epics: Object.keys(syncMap.epics).length,
    stories: Object.keys(syncMap.stories).length,
  };
  if (alreadySynced.phases + alreadySynced.epics + alreadySynced.stories > 0) {
    console.log(
      `   ℹ Existing sync map: ${alreadySynced.phases} phases, ${alreadySynced.epics} epics, ${alreadySynced.stories} stories`,
    );
  }

  // ------ Build the plan ------
  //
  // Plan has two parts:
  //   1. CREATE — new items not in the sync map
  //   2. UPDATE — items already in sync map whose local content has changed
  //
  // The plan diffs local state against what we know was synced before.
  // If updateEnabled is false, the update list stays empty (create-only mode).
  //
  // Label taxonomy follows the rcode GitHub Standards (4 categories:
  // Type / Priority / Status / Area). It is NOT created or assigned by
  // default — pass --with-labels to opt in. Without the flag, we focus
  // on clean issue creation with proper parent-child linking and leave
  // labeling to the user or a later explicit run.
  const plan = {
    labels: opts.withLabels ? [
      // Type (what kind of work)
      { name: 'epic', color: '6f42c1', description: 'Strategic initiative spanning multiple sprints' },
      { name: 'type:feature', color: '0e8a16', description: 'New functionality' },
      { name: 'type:task', color: 'c5def5', description: 'Development work' },
      { name: 'type:bug', color: 'd73a4a', description: 'Something is broken' },
      { name: 'type:docs', color: '0075ca', description: 'Documentation' },

      // Priority
      { name: 'priority:critical', color: 'b60205', description: 'Drop everything' },
      { name: 'priority:high', color: 'd93f0b', description: 'Important for sprint' },
      { name: 'priority:medium', color: 'fbca04', description: 'Standard priority' },
      { name: 'priority:low', color: '0e8a16', description: 'Nice to have' },

      // Status (flow state)
      { name: 'status:backlog', color: 'c5def5', description: 'Not started' },
      { name: 'status:todo', color: '0075ca', description: 'Ready to start' },
      { name: 'status:in-progress', color: 'fbca04', description: 'Currently working' },
      { name: 'status:blocked', color: 'd73a4a', description: 'Cannot progress' },
      { name: 'status:review', color: '6f42c1', description: 'Code review needed' },
      { name: 'status:done', color: '0e8a16', description: 'Completed' },

      // Area (team/layer)
      { name: 'FE', color: '1e3a8a', description: 'Frontend' },
      { name: 'BE', color: '0e8a16', description: 'Backend' },
      { name: 'ML', color: '6f42c1', description: 'Machine Learning' },
      { name: 'API', color: '0075ca', description: 'API / Backend services' },
      { name: 'Design', color: 'f59e0b', description: 'UI/UX design work' },
      { name: 'DevOps', color: 'fbca04', description: 'Infrastructure and deployment' },
      { name: 'QA', color: 'd73a4a', description: 'Quality assurance' },
      { name: 'Docs', color: 'c5def5', description: 'Documentation' },
    ] : [],
    milestones: phases.filter((p) => !p.noMilestone && !syncMap.phases[p.id]),
    epics: phases.flatMap((p) =>
      p.epics.filter((e) => !syncMap.epics[e.id]).map((e) => ({ ...e, phase: p.id })),
    ),
    stories: phases.flatMap((p) =>
      p.stories.filter((s) => !syncMap.stories[s.id]).map((s) => ({ ...s, phase: p.id })),
    ),

    // Items that already exist on GitHub — candidates for update.
    // Only populated when updateEnabled is true.
    updateEpics: opts.updateEnabled
      ? phases.flatMap((p) =>
          p.epics.filter((e) => syncMap.epics[e.id]).map((e) => ({
            ...e,
            phase: p.id,
            issueNumber: syncMap.epics[e.id].issue_number,
            lastSyncedAt: syncMap.epics[e.id].synced_at,
            lastSyncedContentHash: syncMap.epics[e.id].content_hash,
          })),
        )
      : [],
    updateStories: opts.updateEnabled
      ? phases.flatMap((p) =>
          p.stories.filter((s) => syncMap.stories[s.id]).map((s) => ({
            ...s,
            phase: p.id,
            issueNumber: syncMap.stories[s.id].issue_number,
            lastSyncedAt: syncMap.stories[s.id].synced_at,
            lastSyncedContentHash: syncMap.stories[s.id].content_hash,
          })),
        )
      : [],
  };

  console.log(`\n📋 Plan:`);
  if (opts.withLabels && (!opts.only || opts.only === 'labels')) {
    console.log(`   Labels to ensure:     ${plan.labels.length}`);
  }
  if (!opts.only || opts.only === 'milestones') console.log(`   Milestones to create: ${plan.milestones.length}`);
  if (!opts.only || opts.only === 'epics') console.log(`   Epics to create:      ${plan.epics.length}`);
  if (!opts.only || opts.only === 'stories') console.log(`   Stories to create:    ${plan.stories.length}`);
  if (opts.updateEnabled) {
    if (!opts.only || opts.only === 'epics') console.log(`   Epics to check:       ${plan.updateEpics.length} (existing, will update if changed)`);
    if (!opts.only || opts.only === 'stories') console.log(`   Stories to check:     ${plan.updateStories.length} (existing, will update if changed)`);
  }
  if (opts.createProject) console.log(`   Project v2: will create "${state.project_name || repo}"`);
  console.log();

  // ------ Permission gate ------
  //
  // Rules:
  //   - Execute without --yes → always prompt (guided behavior)
  //   - Execute with --yes in guided mode → skip prompt (user opted out)
  //   - Execute with --yes in yolo mode → STILL prompt unless --force-yolo
  //     is also passed. This is deliberate: github mutations are visible to
  //     colleagues and cost rate-limit budget, so YOLO mode does not
  //     automatically apply to them. The user has to explicitly opt in.
  //
  const yoloBypassBlocked = communicationMode === 'yolo' && opts.yes && !opts.forceYolo;
  const needsConfirmation = opts.execute && (!opts.yes || yoloBypassBlocked);

  if (needsConfirmation) {
    if (yoloBypassBlocked) {
      console.log(`⚠️  communication_mode=yolo does not auto-confirm GitHub mutations.`);
      console.log(`   Pass --force-yolo to skip this prompt, or answer interactively below.`);
      console.log();
    }
    console.log(`⚠️  This will modify ${repo} on GitHub.`);
    const totalCreate =
      plan.labels.length + plan.milestones.length + plan.epics.length + plan.stories.length;
    console.log(`   Items to create: ${totalCreate}`);
    if (opts.sprint || opts.epic || opts.story) {
      console.log(`   Granular filter: ${opts.sprint || opts.epic || opts.story}`);
    }
    console.log();
    // Require literal "yes" (not just y) because this mutates remote state.
    const answer = await askText(`   Proceed? Type 'yes' to continue: `, {
      default: 'no',
      validate: (v) => {
        const lower = v.toLowerCase();
        if (['yes', 'y', 'no', 'n'].includes(lower)) return true;
        return `Please type 'yes' to confirm, or 'no' to abort.`;
      },
    });
    if (!['yes', 'y'].includes(answer.toLowerCase())) {
      console.log(`\n❌ Aborted by user. No changes made.`);
      process.exit(0);
    }
    console.log();
  }

  // ------ Execute (or dry-run) ------
  const results = { labels: [], milestones: [], epics: [], stories: [], errors: [] };
  const syncOpts = { execute: opts.execute, dryRun: opts.dryRun, repo };

  // 1. Labels — only when explicitly opted in via --with-labels
  if (opts.withLabels && (!opts.only || opts.only === 'labels')) {
    console.log(`\n🏷️  Labels`);
    for (const label of plan.labels) {
      const result = gh.ensureLabel(label.name, label.color, label.description, syncOpts);
      results.labels.push(result);
      if (result.error) {
        results.errors.push(`label ${label.name}: ${result.error}`);
      } else if (!result.dryRun) {
        if (!syncMap.labels.includes(label.name)) syncMap.labels.push(label.name);
        if (opts.execute) saveSyncMap(cwd, syncMap);
        console.log(`   ✓ ${result.existed ? 'exists' : 'created'}: ${label.name}`);
      }
    }
  }

  // 2. Milestones (phases)
  if (!opts.only || opts.only === 'milestones') {
    console.log(`\n🎯 Milestones (phases)`);
    for (const phase of plan.milestones) {
      const desc = phase.brief ? phase.brief.split('\n').slice(0, 5).join('\n') : 'rcode phase';
      const result = gh.createMilestone(phase.id, desc, null, syncOpts);
      results.milestones.push({ phase: phase.id, ...result });
      if (result.error) {
        results.errors.push(`milestone ${phase.id}: ${result.error}`);
      } else if (!result.dryRun) {
        syncMap.phases[phase.id] = {
          milestone_number: result.number,
          milestone_id: result.id,
          url: result.url,
          synced_at: new Date().toISOString(),
        };
        if (opts.execute) saveSyncMap(cwd, syncMap);
        console.log(`   ✓ created: ${phase.id} → milestone #${result.number}`);
      }
    }
  }

  // 3. Epics — create first so stories can reference their issue numbers
  if (!opts.only || opts.only === 'epics') {
    console.log(`\n📦 Epics`);
    for (const epic of plan.epics) {
      const body = [
        `## 🎯 Epic Vision`,
        ``,
        `_Strategic goal this Epic contributes to._`,
        ``,
        `## 📋 Source Content`,
        ``,
        epic.content.slice(0, 60000),
        ``,
        `---`,
        ``,
        `## 📊 Meta`,
        ``,
        `- **Phase:** \`${epic.phase}\``,
        `- **Source:** \`${epic.sourcePath}\``,
        `- **Synced by:** rcode github-sync`,
        ``,
        `## 📝 Child Stories`,
        ``,
        `_Child story issues will be appended here after they are created._`,
      ].join('\n');

      const milestoneNumber =
        syncMap.phases[epic.phase] && syncMap.phases[epic.phase].milestone_number;

      const result = gh.createIssue(
        {
          title: `[Epic] ${epic.title}`,
          body,
          // Only assign labels if the user opted in — otherwise GitHub
          // would reject the issue creation on labels that don't exist.
          labels: opts.withLabels ? ['epic', 'priority:medium', 'status:backlog'] : [],
          milestone: milestoneNumber,
        },
        syncOpts,
      );
      results.epics.push({ epic: epic.id, ...result });
      if (result.error) {
        results.errors.push(`epic ${epic.id}: ${result.error}`);
      } else if (!result.dryRun) {
        syncMap.epics[epic.id] = {
          issue_number: result.number,
          url: result.url,
          phase: epic.phase,
          synced_at: new Date().toISOString(),
          content_hash: contentHash(epic.content),
          child_story_issues: [],
        };
        if (opts.execute) saveSyncMap(cwd, syncMap);
        console.log(`   ✓ created: ${epic.id} → #${result.number}`);
      }
    }
  }

  // 4. Stories — reference actual parent epic via discovered mapping.
  // Also record child story issue numbers on their parent epic so we can
  // update the epic body with a task list in a second pass below.
  if (!opts.only || opts.only === 'stories') {
    console.log(`\n📄 Stories`);
    for (const story of plan.stories) {
      // Look up the ACTUAL parent epic by id (from frontmatter or naming
      // convention), not "any epic in this phase" — that bug led to all
      // stories pointing at the same epic previously.
      const parentEpicEntry = story.parentEpic
        ? syncMap.epics[story.parentEpic]
        : null;
      const parentRefLine = parentEpicEntry
        ? `- **Parent Epic:** #${parentEpicEntry.issue_number} (Part of this epic)`
        : story.parentEpic
        ? `- **Parent Epic:** \`${story.parentEpic}\` (not yet synced to GitHub)`
        : `- **Parent Epic:** (standalone — no parent epic)`;
      const sprintRefLine = story.sprintId
        ? `- **Sprint:** \`${story.sprintId}\``
        : `- **Sprint:** (not assigned to a sprint)`;

      const body = [
        `## 🎯 Problem Statement`,
        ``,
        `_Clear explanation of what this story solves._`,
        ``,
        `## ✅ Acceptance Criteria`,
        ``,
        `- [ ] Given/When/Then flows documented in source`,
        `- [ ] Tests written and passing`,
        `- [ ] Code review complete`,
        ``,
        `## 📋 Source Content`,
        ``,
        story.content.slice(0, 60000),
        ``,
        `---`,
        ``,
        `## 📊 Meta`,
        ``,
        parentRefLine,
        sprintRefLine,
        `- **Phase:** \`${story.phase}\``,
        `- **Source:** \`${story.sourcePath}\``,
        `- **Synced by:** rcode github-sync`,
        ``,
        `> **Linking:** Reference this story in commits with \`refs #${'{issue}'}\``,
        `> or close it via PR with \`Closes #${'{issue}'}\`.`,
      ].join('\n');

      const milestoneNumber =
        syncMap.phases[story.phase] && syncMap.phases[story.phase].milestone_number;

      const result = gh.createIssue(
        {
          title: story.title,
          body,
          labels: opts.withLabels ? ['type:feature', 'priority:medium', 'status:backlog'] : [],
          milestone: milestoneNumber,
        },
        syncOpts,
      );
      results.stories.push({ story: story.id, ...result });
      if (result.error) {
        results.errors.push(`story ${story.id}: ${result.error}`);
      } else if (!result.dryRun) {
        syncMap.stories[story.id] = {
          issue_number: result.number,
          url: result.url,
          phase: story.phase,
          parent_epic: story.parentEpic || null,
          sprint_id: story.sprintId || null,
          synced_at: new Date().toISOString(),
          content_hash: contentHash(story.content),
        };
        if (opts.execute) saveSyncMap(cwd, syncMap);
        // Remember this child on the parent epic so we can update the
        // epic body with a task list after all stories have been created.
        if (parentEpicEntry) {
          parentEpicEntry.child_story_issues = parentEpicEntry.child_story_issues || [];
          if (!parentEpicEntry.child_story_issues.includes(result.number)) {
            parentEpicEntry.child_story_issues.push(result.number);
          }
        }
        console.log(`   ✓ created: ${story.id} → #${result.number}`);
      }
    }
  }

  // 4b. Back-fill epic bodies with a task list of child stories.
  // GitHub renders `- [ ] #N` as a clickable task-list link and shows a
  // progress counter in the parent epic. Only runs if we just created
  // any stories AND their parent epics were also touched in this run.
  if (opts.execute && (!opts.only || opts.only === 'epics' || opts.only === 'stories')) {
    const epicsToBackfill = Object.entries(syncMap.epics).filter(
      ([, e]) => e.child_story_issues && e.child_story_issues.length > 0,
    );
    if (epicsToBackfill.length > 0) {
      console.log(`\n🔗 Linking stories → epics (task lists)`);
      for (const [epicId, epicEntry] of epicsToBackfill) {
        const taskList = epicEntry.child_story_issues
          .sort((a, b) => a - b)
          .map((n) => `- [ ] #${n}`)
          .join('\n');

        // Fetch current body and append / replace the Child Stories block
        const issue = gh.getIssue(epicEntry.issue_number, { repo });
        if (issue.error) {
          results.errors.push(`link epic #${epicEntry.issue_number}: ${issue.error}`);
          continue;
        }
        const currentBody = issue.body || '';
        // Replace the placeholder block or append one at the end
        let newBody;
        const blockRegex = /## 📝 Child Stories[\s\S]*?(?=\n## |$)/;
        const newBlock = `## 📝 Child Stories\n\n${taskList}\n`;
        if (blockRegex.test(currentBody)) {
          newBody = currentBody.replace(blockRegex, newBlock);
        } else {
          newBody = currentBody.trimEnd() + '\n\n' + newBlock;
        }
        const updateResult = gh.updateIssue(
          epicEntry.issue_number,
          { body: newBody },
          syncOpts,
        );
        if (updateResult.error) {
          results.errors.push(`update epic #${epicEntry.issue_number}: ${updateResult.error}`);
        } else {
          console.log(
            `   ✓ linked ${epicEntry.child_story_issues.length} stories → epic #${epicEntry.issue_number}`,
          );
        }
      }
    }
  }

  // 5. UPDATE existing epics (if changed locally)
  if (opts.updateEnabled && (!opts.only || opts.only === 'epics') && plan.updateEpics.length > 0) {
    console.log(`\n🔄 Update existing epics`);
    for (const epic of plan.updateEpics) {
      const newHash = contentHash(epic.content);
      if (newHash === epic.lastSyncedContentHash) {
        // Nothing changed — skip silently
        continue;
      }

      const body = [
        `## 🎯 Epic Vision`,
        ``,
        `_Strategic goal this Epic contributes to. Fill in from \`${epic.sourcePath}\`._`,
        ``,
        `## 📋 Source Content`,
        ``,
        epic.content.slice(0, 60000),
        ``,
        `---`,
        ``,
        `## 📊 Meta`,
        ``,
        `- **Phase:** \`${epic.phase}\``,
        `- **Source:** \`${epic.sourcePath}\``,
        `- **Last synced:** ${new Date().toISOString()}`,
      ].join('\n');

      const result = gh.updateIssue(
        epic.issueNumber,
        {
          title: opts.updateBody ? `[Epic] ${epic.title}` : undefined,
          body: opts.updateBody ? body : undefined,
        },
        syncOpts,
      );
      if (result.error) {
        results.errors.push(`update epic #${epic.issueNumber}: ${result.error}`);
      } else if (!result.dryRun) {
        syncMap.epics[epic.id].content_hash = newHash;
        syncMap.epics[epic.id].updated_at = new Date().toISOString();
        console.log(`   ✓ updated: #${epic.issueNumber} (${epic.id})`);
      }
    }
  }

  // 6. UPDATE existing stories (if changed locally)
  if (opts.updateEnabled && (!opts.only || opts.only === 'stories') && plan.updateStories.length > 0) {
    console.log(`\n🔄 Update existing stories`);
    for (const story of plan.updateStories) {
      const newHash = contentHash(story.content);
      if (newHash === story.lastSyncedContentHash) {
        continue;
      }

      const body = [
        `## 🎯 Problem Statement`,
        ``,
        `_From \`${story.sourcePath}\`._`,
        ``,
        `## 📋 Source Content`,
        ``,
        story.content.slice(0, 60000),
        ``,
        `---`,
        ``,
        `## 📊 Meta`,
        ``,
        `- **Phase:** \`${story.phase}\``,
        `- **Source:** \`${story.sourcePath}\``,
        `- **Last synced:** ${new Date().toISOString()}`,
      ].join('\n');

      const result = gh.updateIssue(
        story.issueNumber,
        {
          title: opts.updateBody ? story.title : undefined,
          body: opts.updateBody ? body : undefined,
        },
        syncOpts,
      );
      if (result.error) {
        results.errors.push(`update story #${story.issueNumber}: ${result.error}`);
      } else if (!result.dryRun) {
        syncMap.stories[story.id].content_hash = newHash;
        syncMap.stories[story.id].updated_at = new Date().toISOString();
        console.log(`   ✓ updated: #${story.issueNumber} (${story.id})`);
      }
    }
  }

  // 7. Project v2 (optional)
  if (opts.createProject && (!opts.only || opts.only === 'project')) {
    console.log(`\n📊 Project v2`);
    const owner = repo.split('/')[0];
    const title = state.project_name || repo.split('/')[1];
    const result = gh.createProject(owner, title, syncOpts);
    if (result.error) {
      results.errors.push(`project: ${result.error}`);
    } else if (!result.dryRun) {
      syncMap.project = { number: result.number, url: result.url, synced_at: new Date().toISOString() };
      console.log(`   ✓ created: Project v2 "${title}" → ${result.url}`);
    }
  }

  // ------ Save sync map (only if we executed) ------
  if (opts.execute) {
    saveSyncMap(cwd, syncMap);
    console.log(`\n💾 Sync map saved to .rcode/integrations/github-map.json`);
  }

  // ------ Summary ------
  console.log(`\n📊 Summary`);
  console.log(`   Labels:    ${results.labels.length}`);
  console.log(`   Milestones: ${results.milestones.length}`);
  console.log(`   Epics:     ${results.epics.length} created`);
  console.log(`   Stories:   ${results.stories.length} created`);
  if (opts.updateEnabled) {
    const epicUpdates = plan.updateEpics.filter((e) => contentHash(e.content) !== e.lastSyncedContentHash).length;
    const storyUpdates = plan.updateStories.filter((s) => contentHash(s.content) !== s.lastSyncedContentHash).length;
    console.log(`   Updated:   ${epicUpdates} epics, ${storyUpdates} stories (content changed since last sync)`);
  }
  if (results.errors.length > 0) {
    console.log(`   Errors:    ${results.errors.length}`);
    for (const err of results.errors) console.log(`     ❌ ${err}`);
  }

  if (opts.dryRun) {
    console.log(`\n⚠️  This was a DRY-RUN. No changes were made to GitHub.`);
    console.log(`   To actually apply these changes, run again with: --execute`);
  } else {
    console.log(`\n✅ Sync complete. View on GitHub: https://github.com/${repo}`);
  }
}

module.exports = function githubSync(args) {
  main(args).catch((err) => {
    if (err instanceof PromptAbortError) {
      console.log(`\n❌ GitHub sync cancelled — ${err.message}.`);
      process.exit(0);
    }
    console.error(`\n❌ GitHub sync failed:`, err.message);
    if (process.env.DEBUG) console.error(err.stack);
    process.exit(1);
  });
};
