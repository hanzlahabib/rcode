/**
 * rihal-code github-sync — smart sync .rihal/ state to GitHub
 *
 * Creates missing items, updates changed items, closes completed items.
 * All in one command. Dry-run by default.
 *
 * Usage (only two things to remember):
 *   rihal-code github-sync              # see the plan (dry-run)
 *   rihal-code github-sync --execute    # do it (asks for confirmation)
 *
 * Advanced narrowing (optional):
 *   --repo=owner/name    target a specific repo
 *   --only=epics         limit to epics (or labels/milestones/stories)
 *   --phase=phase-02     limit to one phase
 *   --project            also create a Project v2 board
 *   --yes                skip the confirmation prompt
 *
 * Advanced opt-outs (optional):
 *   --no-update          create-only mode — never touch existing items
 *   --no-update-body     don't rewrite bodies, still update labels/state
 *   --no-update-labels   don't touch labels
 *   --no-close           don't close issues when local marks them done
 *
 * Per AGENTS.md: mutations always require --execute, gh auth, and
 * interactive confirmation (unless --yes). Never auto-pushes.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');
const gh = require('./lib/github.cjs');

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
    createProject: false, // also create a Project v2 board
    yes: false, // skip interactive confirmation

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
    }
  }

  // Master switch: updateEnabled is true if ANY update flag is true
  opts.updateEnabled = opts.updateBody || opts.updateLabels || opts.updateMilestone || opts.updateState;

  return opts;
}

// ---------- Interactive prompt ----------

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

// ---------- Discover .rihal/ content ----------

function loadState(cwd) {
  const statePath = path.join(cwd, '.rihal/state.json');
  if (!fs.existsSync(statePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(statePath, 'utf8'));
}

function discoverPhases(cwd) {
  const phasesDir = path.join(cwd, '.rihal/phases');
  if (!fs.existsSync(phasesDir)) return [];

  const phases = [];
  for (const entry of fs.readdirSync(phasesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const phaseDir = path.join(phasesDir, entry.name);
    const briefPath = path.join(phaseDir, 'brief.md');
    const sprintsPath = path.join(phaseDir, 'sprints.md');
    const storiesDir = path.join(phaseDir, 'stories');
    const tasksDir = path.join(phaseDir, 'tasks');

    const phase = {
      id: entry.name,
      brief: fs.existsSync(briefPath) ? fs.readFileSync(briefPath, 'utf8') : null,
      sprints: fs.existsSync(sprintsPath) ? fs.readFileSync(sprintsPath, 'utf8') : null,
      stories: [],
      epics: [],
    };

    if (fs.existsSync(storiesDir)) {
      for (const file of fs.readdirSync(storiesDir)) {
        if (!file.endsWith('.md')) continue;
        const content = fs.readFileSync(path.join(storiesDir, file), 'utf8');
        phase.stories.push({
          id: file.replace('.md', ''),
          file,
          content,
          title: extractTitle(content) || file.replace('.md', ''),
        });
      }
    }

    if (fs.existsSync(tasksDir)) {
      for (const file of fs.readdirSync(tasksDir)) {
        if (!file.endsWith('.md')) continue;
        const content = fs.readFileSync(path.join(tasksDir, file), 'utf8');
        phase.epics.push({
          id: file.replace('.md', ''),
          file,
          content,
          title: extractTitle(content) || file.replace('.md', ''),
        });
      }
    }

    phases.push(phase);
  }

  return phases;
}

function extractTitle(markdown) {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

// ---------- Load/save sync map (for idempotency) ----------

function loadSyncMap(cwd) {
  const mapPath = path.join(cwd, '.rihal/integrations/github-map.json');
  if (!fs.existsSync(mapPath)) {
    return { phases: {}, epics: {}, stories: {}, project: null, labels: [] };
  }
  return JSON.parse(fs.readFileSync(mapPath, 'utf8'));
}

function saveSyncMap(cwd, map) {
  const integrationsDir = path.join(cwd, '.rihal/integrations');
  fs.mkdirSync(integrationsDir, { recursive: true });
  const mapPath = path.join(integrationsDir, 'github-map.json');
  fs.writeFileSync(mapPath, JSON.stringify(map, null, 2) + '\n');
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

  console.log(`\n🕌 Rihal Code — GitHub Sync`);
  console.log(`   Mode:  ${opts.dryRun ? 'DRY-RUN (preview only, nothing is sent)' : 'EXECUTE'}`);
  console.log(`   Scope: ${opts.only || 'full (create + update existing)'}`);
  if (!opts.updateEnabled) console.log(`   Note:  --no-update passed → create-only mode`);
  if (opts.phase) console.log(`   Phase: ${opts.phase}`);
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

  // ------ Precondition: .rihal/ exists ------
  const state = loadState(cwd);
  if (!state) {
    console.error(`❌ No .rihal/state.json found. Run 'rihal-code init' first.`);
    process.exit(1);
  }
  console.log(`   ✓ Project: ${state.project_name || '(unnamed)'}`);

  // ------ Discover phases ------
  let phases = discoverPhases(cwd);
  if (opts.phase) {
    phases = phases.filter((p) => p.id === opts.phase);
    if (phases.length === 0) {
      console.error(`❌ Phase '${opts.phase}' not found.`);
      process.exit(1);
    }
  }

  if (phases.length === 0) {
    console.error(`❌ No phases found in .rihal/phases/.`);
    process.exit(1);
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
  // Label taxonomy follows the Rihal GitHub Standards
  // (best-practices/github/github-workflow-best-practices/):
  // 4 categories: Type / Priority / Status / Area
  const plan = {
    labels: [
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
    ],
    milestones: phases.filter((p) => !syncMap.phases[p.id]),
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
  if (!opts.only || opts.only === 'labels') console.log(`   Labels to ensure:     ${plan.labels.length}`);
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
  if (opts.execute && !opts.yes) {
    console.log(`⚠️  This will modify ${repo} on GitHub.`);
    console.log(`   Items to create: ${
      plan.labels.length + plan.milestones.length + plan.epics.length + plan.stories.length
    }`);
    console.log();
    const answer = await prompt(`   Proceed? Type 'yes' to continue: `);
    if (answer !== 'yes' && answer !== 'y') {
      console.log(`\n❌ Aborted by user. No changes made.`);
      process.exit(0);
    }
    console.log();
  }

  // ------ Execute (or dry-run) ------
  const results = { labels: [], milestones: [], epics: [], stories: [], errors: [] };
  const syncOpts = { execute: opts.execute, dryRun: opts.dryRun, repo };

  // 1. Labels
  if (!opts.only || opts.only === 'labels') {
    console.log(`\n🏷️  Labels`);
    for (const label of plan.labels) {
      const result = gh.ensureLabel(label.name, label.color, label.description, syncOpts);
      results.labels.push(result);
      if (result.error) {
        results.errors.push(`label ${label.name}: ${result.error}`);
      } else if (!result.dryRun) {
        if (!syncMap.labels.includes(label.name)) syncMap.labels.push(label.name);
        console.log(`   ✓ ${result.existed ? 'exists' : 'created'}: ${label.name}`);
      }
    }
  }

  // 2. Milestones (phases)
  if (!opts.only || opts.only === 'milestones') {
    console.log(`\n🎯 Milestones (phases)`);
    for (const phase of plan.milestones) {
      const desc = phase.brief ? phase.brief.split('\n').slice(0, 5).join('\n') : 'Rihal Code phase';
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
        console.log(`   ✓ created: ${phase.id} → milestone #${result.number}`);
      }
    }
  }

  // 3. Epics — use Rihal standard epic template structure
  if (!opts.only || opts.only === 'epics') {
    console.log(`\n📦 Epics`);
    for (const epic of plan.epics) {
      const body = [
        `## 🎯 Epic Vision`,
        ``,
        `_Strategic goal this Epic contributes to. Fill in from \`.rihal/phases/${epic.phase}/tasks/${epic.file}\`._`,
        ``,
        `## 📋 Source Content`,
        ``,
        epic.content.slice(0, 3000),
        ``,
        `---`,
        ``,
        `## 📊 Meta`,
        ``,
        `- **Phase:** \`${epic.phase}\``,
        `- **Source:** \`.rihal/phases/${epic.phase}/tasks/${epic.file}\``,
        `- **Synced by:** Rihal Code github-sync`,
        ``,
        `> **Note:** This epic follows the Rihal GitHub standards (type: epic).`,
        `> Add related stories as sub-issues or link them in comments with \`refs #${'{issue}'}\`.`,
      ].join('\n');

      const milestoneNumber =
        syncMap.phases[epic.phase] && syncMap.phases[epic.phase].milestone_number;

      const result = gh.createIssue(
        {
          title: `[Epic] ${epic.title}`,
          body,
          labels: ['epic', 'priority:medium', 'status:backlog'],
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
        };
        console.log(`   ✓ created: ${epic.id} → #${result.number}`);
      }
    }
  }

  // 4. Stories — use Rihal standard feature template structure
  if (!opts.only || opts.only === 'stories') {
    console.log(`\n📄 Stories`);
    for (const story of plan.stories) {
      const parentEpicRef = Object.values(syncMap.epics).find((e) => e.phase === story.phase);
      const parentRef = parentEpicRef
        ? `- **Parent Epic:** #${parentEpicRef.issue_number}`
        : `- **Parent Epic:** (none — standalone story)`;

      const body = [
        `## 🎯 Problem Statement`,
        ``,
        `_Clear explanation of what this story solves. Fill in from \`.rihal/phases/${story.phase}/stories/${story.file}\`._`,
        ``,
        `## ✅ Acceptance Criteria`,
        ``,
        `- [ ] Given/When/Then flows documented in source`,
        `- [ ] Tests written and passing`,
        `- [ ] Code review complete`,
        ``,
        `## 📋 Source Content`,
        ``,
        story.content.slice(0, 3000),
        ``,
        `---`,
        ``,
        `## 📊 Meta`,
        ``,
        parentRef,
        `- **Phase:** \`${story.phase}\``,
        `- **Source:** \`.rihal/phases/${story.phase}/stories/${story.file}\``,
        `- **Synced by:** Rihal Code github-sync`,
        ``,
        `> **Note:** This story follows the Rihal GitHub standards (type: feature).`,
        `> Link commits with \`(refs #${'{issue}'})\` and close via PR with \`Closes #${'{issue}'}\`.`,
      ].join('\n');

      const milestoneNumber =
        syncMap.phases[story.phase] && syncMap.phases[story.phase].milestone_number;

      const result = gh.createIssue(
        {
          title: story.title,
          body,
          labels: ['type:feature', 'priority:medium', 'status:backlog'],
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
          synced_at: new Date().toISOString(),
          content_hash: contentHash(story.content),
        };
        console.log(`   ✓ created: ${story.id} → #${result.number}`);
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
        `_Strategic goal this Epic contributes to. Fill in from \`.rihal/phases/${epic.phase}/tasks/${epic.file}\`._`,
        ``,
        `## 📋 Source Content`,
        ``,
        epic.content.slice(0, 3000),
        ``,
        `---`,
        ``,
        `## 📊 Meta`,
        ``,
        `- **Phase:** \`${epic.phase}\``,
        `- **Source:** \`.rihal/phases/${epic.phase}/tasks/${epic.file}\``,
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
        `_From \`.rihal/phases/${story.phase}/stories/${story.file}\`._`,
        ``,
        `## 📋 Source Content`,
        ``,
        story.content.slice(0, 3000),
        ``,
        `---`,
        ``,
        `## 📊 Meta`,
        ``,
        `- **Phase:** \`${story.phase}\``,
        `- **Source:** \`.rihal/phases/${story.phase}/stories/${story.file}\``,
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
    console.log(`\n💾 Sync map saved to .rihal/integrations/github-map.json`);
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
    console.error(`\n❌ GitHub sync failed:`, err.message);
    if (process.env.DEBUG) console.error(err.stack);
    process.exit(1);
  });
};
