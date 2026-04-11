/**
 * rihal-code init — scaffold .rihal/ AND install skills/commands for multiple AI editors
 *
 * Discovery paths by editor:
 *   • Claude Code:    .claude/skills/     + .claude/commands/rihal/
 *   • Cursor:         .cursor/rules/      (.mdc files)
 *   • Windsurf:       .windsurf/rules/    (same .mdc format as Cursor)
 *   • Antigravity:    .antigravity/agents/ (follows AGENTS.md spec)
 *   • OpenAI Codex:   AGENTS.md (appended) + ~/.codex/ agents dir
 *   • Universal:      AGENTS.md at project root (standard)
 *
 * State directory:
 *   • .rihal/             — project state (git-friendly)
 *
 * Flags:
 *   --editor=claude|cursor|windsurf|antigravity|codex|all   (default: all)
 */

const fs = require('fs');
const path = require('path');
const { writeFileAtomic } = require('./lib/fsutil.cjs');

const RIHAL_DIRS = [
  '.rihal/phases',
  '.rihal/plans',
  '.rihal/decisions',
  '.rihal/artifacts',
  '.rihal/artifacts/brand',
  '.rihal/artifacts/reviews',
  '.rihal/artifacts/bugs',
  '.rihal/progress',
  '.rihal/context',
];

const CLAUDE_DIRS = [
  '.claude/skills',
  '.claude/commands/rihal',
];

function initStateFile() {
  return (
    JSON.stringify(
      {
        project_name: null,
        created: new Date().toISOString(),
        current_phase: null,
        phases: [],
        active_agents: [],
        context_version: 1,
      },
      null,
      2,
    ) + '\n'
  );
}

const STATE_FILES = {
  '.rihal/state.json': initStateFile(),

  '.rihal/context/active.md': `# Active Context

## Project
{fill this in}

## Phase
Not started

## Goal
{what are you building, why}

## Last completed
- Project initialized

## In progress
- Waiting for first task

## Blockers
- None

## Next steps
- Run the kickoff: /rihal:kickoff
- Or convene the Majlis: /rihal:convene "your strategic question"
`,

  '.rihal/README.md': `# .rihal/ — Project State

Managed by Rihal Code.

## Structure
- \`state.json\` — current project state
- \`phases/\` — phase briefs, sprints, stories
- \`decisions/\` — ADRs
- \`artifacts/\` — design system, pitch decks, reviews, bugs
- \`progress/\` — logs, retros, dispatch plans, Majlis sessions
- \`context/active.md\` — compacted context (under 2000 tokens)

## Slash Commands (Claude Code)
- \`/rihal:team\` — list the team
- \`/rihal:convene <question>\` — multi-agent Majlis
- \`/rihal:dispatch <request>\` — route to the right specialist
- \`/rihal:kickoff\` — start a new phase
- \`/rihal:dashboard\` — start the Diwan dashboard

## CLI
- \`npx github:hanzlahabib/rihal-code dashboard\`
- \`npx github:hanzlahabib/rihal-code team\`
- \`npx github:hanzlahabib/rihal-code doctor\`
`,
};

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
 * Install skills into .claude/skills/ so Claude Code can auto-discover them.
 * We install BOTH agent skills and action skills with namespaced prefixes so
 * they don't clash with other installed skills.
 */
function installSkills(packageRoot, cwd) {
  const skillsSource = path.join(packageRoot, 'rihal/skills');
  const skillsDest = path.join(cwd, '.claude/skills');

  if (!fs.existsSync(skillsSource)) {
    console.log(`   ⚠ rihal/skills/ not found in package`);
    return 0;
  }

  fs.mkdirSync(skillsDest, { recursive: true });
  let count = 0;

  // Copy agent skills
  const agentsDir = path.join(skillsSource, 'agents');
  if (fs.existsSync(agentsDir)) {
    for (const entry of fs.readdirSync(agentsDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const src = path.join(agentsDir, entry.name);
      const dest = path.join(skillsDest, `rihal-${entry.name}`);
      copyDirRecursive(src, dest);
      count++;
    }
  }

  // Copy action skills
  const actionsDir = path.join(skillsSource, 'actions');
  if (fs.existsSync(actionsDir)) {
    for (const entry of fs.readdirSync(actionsDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (entry.name === 'research') {
        // Handle research sub-directory
        const researchDir = path.join(actionsDir, 'research');
        for (const sub of fs.readdirSync(researchDir, { withFileTypes: true })) {
          if (!sub.isDirectory()) continue;
          const src = path.join(researchDir, sub.name);
          const dest = path.join(skillsDest, sub.name);
          copyDirRecursive(src, dest);
          count++;
        }
        continue;
      }
      const src = path.join(actionsDir, entry.name);
      const dest = path.join(skillsDest, entry.name);
      copyDirRecursive(src, dest);
      count++;
    }
  }

  return count;
}

/**
 * Build a pipeline slash command with streaming discussion instructions.
 *
 * Each pipeline command dispatches a PREDEFINED chain of agents in sequence,
 * printing each agent's response live as they speak (with handoff lines between
 * them), then synthesizes at the end. Same protocol, different chains:
 *
 *   - rihal:council   — full 13-agent Majlis for cross-domain strategic Qs
 *   - rihal:ui        — Zahra → Layla → Haitham → Fatima (design pipeline)
 *   - rihal:feature   — PM → CTO → UX → FE+BE → QA → DevOps (feature pipeline)
 *   - rihal:project   — Sadiq → Waleed → Ahmed Al Hassani → PM → Zahra → Layla → Nasser (kickoff)
 *
 * Using one builder keeps the instruction protocol DRY and consistent. The
 * chain is injected per command so each file only contains its specific
 * sequence — no 4x duplication of boilerplate.
 */
function buildPipelineCommand({ name, title, icon, purpose, whenToUse, chain, intro, sessionFile }) {
  const chainList = chain.map((a, i) => `${i + 1}. **${a}**`).join('\n');
  return `---
name: ${name}
description: ${purpose}. Runs a predefined pipeline of agents sequentially with live responses shown as each one speaks.
argument-hint: <task or question>
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
---

${icon} **${title}** — ${intro}

**Request:** $ARGUMENTS

## When to use this pipeline

${whenToUse}

## Pipeline chain (fixed order)

${chainList}

Each agent's full persona and principles live in:
- \`.claude/skills/rihal-<agent>-*/SKILL.md\` (full skill if loaded)
- \`rihal/digests/<agent>.md\` (lean digest — prefer this for lower context cost)

## How the discussion runs (streaming protocol)

This is a **live consultation**. Do NOT batch all responses into one final
answer. The user should see each agent speak as the discussion unfolds.

### Step 1 — Announce session start

Print this header immediately:

\`\`\`
${icon} ${title} — starting
Request: {restated request}
Pipeline: {N} agents — {chain as "A → B → C"}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`\`\`

### Step 2 — For EACH agent in the chain (one at a time)

**a) Handoff line** (before invoking the agent):

\`\`\`
→ Consulting {agent name} ({role})...
\`\`\`

**b) Load the agent's digest** from \`rihal/digests/{agent}.md\` (lean 20-line
summary — do NOT load the full SKILL.md unless strictly needed for this task).

**c) Adopt the persona and respond in first person** with this structure:

\`\`\`
**{Agent name} ({role})**

Position: {SUPPORT / CONDITIONAL / NEUTRAL / OPPOSE}
Confidence: {Critical / High / Medium / Low}

{2-3 sentences — the agent's take, in their voice. If agreeing with a
previous agent, name them explicitly. If disagreeing, name them and
explain why.}

{If this agent raises a condition or rejects a path, state it clearly.}
{If this agent produces a concrete artifact — a story, ADR, design spec,
test plan — reference where it was saved.}
\`\`\`

**d) Transition to next agent** (after the response):

\`\`\`
──────────────────────────────────────────────────
Handing over to {next agent name}...
\`\`\`

**Critical:** print each agent's block before moving to the next. The
user should feel the pipeline progressing live.

### Step 3 — Final synthesis (after all agents speak)

Print:

\`\`\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${icon} ${title} — Verdict
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`\`\`

Then give:

1. **Alignment** — who agreed on what (name them, count them)
2. **Dissent** — who disagreed, quoted verbatim. Never bury dissent.
3. **Synthesis** — 1-2 paragraphs respecting specialist authority.
4. **Concrete next step** — ONE clear action (not a menu of options).
5. **Decision owner** — which agent has final authority. The pipeline
   synthesizes; the specialist decides.

### Step 4 — Save the session

Save the full discussion to:

\`\`\`
.rihal/progress/${sessionFile}-{YYYY-MM-DD}-{short-slug}.md
\`\`\`

Use the current date. The slug is a 3-4 word summary of the request.
Format it as a markdown file with the same structure the user saw live.

## Rules

- Print agent responses live, one at a time, with handoff lines.
- Stay in character strictly for each agent.
- Never skip dissent or bury minority views.
- Never synthesize before all agents have spoken.
- The model profile from \`.rihal/config.json\` tells which model
  to use per agent (strategists → opus, executors → sonnet).
- If the request is outside this pipeline's scope, suggest a different
  pipeline (e.g., UI question → \`/rihal:ui\`, strategic → \`/rihal:council\`).
`;
}

/**
 * Create slash commands in .claude/commands/rihal/ that Claude Code auto-discovers.
 * Each command is a markdown file with frontmatter defining the command entry point.
 */
function installSlashCommands(packageRoot, cwd) {
  const commandsDir = path.join(cwd, '.claude/commands/rihal');
  fs.mkdirSync(commandsDir, { recursive: true });

  const commands = {
    'team.md': `---
name: rihal:team
description: List the full Rihal team roster with roles and authorities
allowed-tools:
  - Read
  - Bash
---

Read \`.claude/skills/rihal-*-*/SKILL.md\` (all installed agent skills) and produce a clean table of the team roster showing: Agent name, Arabic name, Role, Authority domain. Also show the currently loaded model profile from \`.rihal/config.json\` if present.

Do NOT load full SKILL.md content — just the YAML frontmatter for each.
`,

    // One canonical council command. No aliases — aliasing multiplies context
    // on every Claude Code session, since all slash-command files get indexed.
    // Users remember ONE word: 'council' (the team gathering).
    'council.md': buildPipelineCommand({
      name: 'rihal:council',
      title: 'Majlis Council',
      icon: '🕌',
      purpose: 'Full multi-agent consultation for cross-domain strategic questions',
      whenToUse: 'Strategic decisions that touch 4+ domains; crisis response; questions nobody can own alone',
      chain: [
        'sadiq',
        'hussain-pm',
        'waleed',
        'ahmed-hassani',
        'zayd',
        'haitham',
        'yousef',
        'fatima',
        'khalid',
        'zahra',
        'mariam',
        'nasser',
        'noor',
      ],
      intro: 'For cross-domain strategic questions where every perspective matters',
      sessionFile: 'majlis',
    }),

    'ui.md': buildPipelineCommand({
      name: 'rihal:ui',
      title: 'UI/UX Pipeline',
      icon: '🎨',
      purpose: 'Design and ship a user-facing interface change',
      whenToUse: 'New component, screen redesign, brand alignment, accessibility audit, Arabic RTL work, motion/interaction design',
      chain: ['zahra', 'layla', 'haitham', 'fatima'],
      intro: 'Design direction → UX states → implementation → quality gate',
      sessionFile: 'ui',
    }),

    'feature.md': buildPipelineCommand({
      name: 'rihal:feature',
      title: 'Feature Pipeline',
      icon: '⚡',
      purpose: 'Build a new feature end-to-end',
      whenToUse: 'Adding a new capability to an existing product. Requirements exist but need breakdown, build, test, and ship',
      chain: [
        'hussain-pm',   // scope + PRD
        'waleed',       // arch decision if non-trivial
        'layla',        // UX states
        'haitham',      // frontend
        'yousef',       // backend
        'fatima',       // tests + release gate
        'khalid',       // ship + monitor
      ],
      intro: 'Scope → arch → UX → FE + BE → tests → ship. End-to-end feature flow',
      sessionFile: 'feature',
    }),

    'project.md': buildPipelineCommand({
      name: 'rihal:project',
      title: 'Project Kickoff Pipeline',
      icon: '🚀',
      purpose: 'Start a new project from zero with full team alignment',
      whenToUse: 'A new engagement, product, or initiative. Nothing exists yet — you need strategy, architecture, scope, design system, and a squad',
      chain: [
        'sadiq',         // strategic positioning + kill criteria
        'waleed',        // stack + ADR
        'ahmed-hassani', // delivery plan + DORA targets
        'hussain-pm',    // phases + sprints
        'zahra',         // brand identity
        'layla',         // design system baseline
        'nasser',        // squad composition
      ],
      intro: 'Strategy → arch → delivery → scope → brand → design system → team. Full kickoff',
      sessionFile: 'kickoff',
    }),

    'dispatch.md': `---
name: rihal:dispatch
description: Route a request to the right Rihal specialist via Raees (orchestration director)
argument-hint: <request>
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
---

Route this request through Raees (orchestration director): **$ARGUMENTS**

1. Load \`.claude/skills/rihal-raees-orchestrator/SKILL.md\` for the Raees persona and dispatch matrix
2. Identify the primary owner from the matrix
3. Check dependencies and parallel opportunities
4. Build a numbered execution sequence with owners
5. Save the dispatch plan to \`.rihal/progress/dispatch-$(date +%Y-%m-%d).md\`
6. Present to user and ask confirmation before executing
`,

    'kickoff.md': `---
name: rihal:kickoff
description: Start a new project phase — Memory Bank setup with Sadiq, Waleed, Hussain-PM, Layla
allowed-tools:
  - Read
  - Write
  - Bash
---

Start a new Rihal Code phase. Follow the workflow in \`rihal/workflows/kickoff/instructions.md\`.

Steps:
1. Initialize \`.rihal/\` directories if missing
2. Load Sadiq (strategist) — ask: what problem, who for, kill criteria
3. Load Waleed (CTO) — lock tech stack, write ADR
4. Load Hussain-PM — break into 3-5 sprints
5. Load Layla — define design system baseline
6. Update \`.rihal/state.json\` with new phase
7. Create \`.rihal/context/active.md\` with phase summary
`,

    'dashboard.md': `---
name: rihal:dashboard
description: Start the Diwan view-only dashboard server
allowed-tools:
  - Bash
---

Start the Rihal Code dashboard (Diwan) on http://localhost:7717

\`\`\`bash
npx --yes github:hanzlahabib/rihal-code dashboard
\`\`\`

The dashboard scans \`.rihal/\` in the current working directory and shows phases, progress, decisions, team roster, and active context. View-only — no writes.

Stop with: \`kill $(lsof -t -i:7717)\`
`,

    'status.md': `---
name: rihal:status
description: Show current project status from .rihal/ state
allowed-tools:
  - Read
  - Bash
  - Glob
---

Read \`.rihal/state.json\` and \`.rihal/context/active.md\` and show a concise project status:

- Current phase
- Active agents
- Last 3 entries from \`.rihal/progress/\`
- Latest decisions from \`.rihal/decisions/\`
- Any blockers or risks flagged

Keep under 300 words. Do not load full file contents — just headers and summaries.
`,

    'progress.md': `---
name: rihal:progress
description: Check project progress, show situational awareness, and route to the next action
allowed-tools:
  - Read
  - Bash
  - Grep
  - Glob
---

<objective>
Provide situational awareness: where the project stands, what's been done, what's next. Then route to the right action (execute, convene, kickoff, or stop for user input).
</objective>

<process>

1. **Load state** — Read \`.rihal/state.json\` for current phase, active agents, and counters.

2. **Scan progress/** — List latest 10 files in \`.rihal/progress/\` (dispatch plans, Majlis sessions, status reports, retros).

3. **Scan decisions/** — List latest 5 ADRs in \`.rihal/decisions/\`.

4. **Scan current phase** — Read \`.rihal/phases/{current_phase}/brief.md\` and \`sprints.md\` if present.

5. **Check active context** — Read \`.rihal/context/active.md\`.

6. **Summarize in this exact structure:**

   \`\`\`
   # Rihal Code — Progress Report ({date})

   ## Where we are
   - Project: {name}
   - Current phase: {phase}
   - Active agents: {list}

   ## Recent work (last 5 days)
   - {date}: {entry}

   ## Decisions made
   - {ADR title} ({date})

   ## What's next
   - {suggested next action}

   ## Recommended command
   → /rihal:{command} {args}
   \`\`\`

7. **Route to next action** based on state:
   - No current phase → suggest \`/rihal:kickoff\`
   - Phase but no sprint plan → suggest \`/rihal:dispatch "plan the first sprint"\`
   - Sprint has unstarted stories → suggest \`/rihal:next\`
   - Stories in progress but blockers → suggest \`/rihal:convene "how to unblock X"\`
   - Sprint complete → suggest \`/rihal:discuss "retro"\`

Keep the report under 500 words. This is a quick check-in, not a full audit.

</process>
`,

    'next.md': `---
name: rihal:next
description: Automatically advance to the next logical step in the Rihal workflow
allowed-tools:
  - Read
  - Bash
  - Grep
  - Glob
  - SlashCommand
---

<objective>
Detect the current project state and automatically invoke the next logical step. No arguments needed — reads \`.rihal/state.json\`, the current phase, and recent progress to determine what comes next.

Designed for rapid workflow — remembering which phase/step you're on is overhead.
</objective>

<process>

1. **Read state**:
   - \`.rihal/state.json\` — current phase, active agents
   - \`.rihal/phases/{current}/sprints.md\` — sprint status
   - \`.rihal/phases/{current}/stories/\` — story files and their statuses
   - \`.rihal/progress/\` — latest entries

2. **Decision tree:**

   - **No \`.rihal/\` state** → run \`/rihal:kickoff\`
   - **No current phase** → ask user which phase, or run \`/rihal:kickoff\`
   - **Phase has no sprints.md** → invoke Hussain-SM via \`rihal-sprint-planning\` skill
   - **Sprint has unstarted story** → invoke Omar/Haitham via \`rihal-dev-story\` on the next story
   - **All stories in progress** → ask user which to pick up, or run \`/rihal:convene "unblock the sprint"\`
   - **Stories marked ready-for-review** → invoke Omar via \`rihal-code-review\`
   - **Review done, release pending** → invoke Fatima via \`rihal-qa-generate-e2e-tests\` + release gate
   - **Release gate GO** → invoke Khalid via \`rihal-ship-it\`
   - **Sprint complete** → invoke Hussain-SM via \`rihal-retrospective\`
   - **Phase complete (all sprints done)** → prompt user: mark phase complete + \`/rihal:kickoff\` next phase

3. **Report the decision to the user BEFORE executing:**

   \`\`\`
   Current state: {state summary}
   Next action:   {what I'm about to do}
   Will invoke:   {skill or command}

   Proceed? (yes / different action / stop)
   \`\`\`

4. **Wait for confirmation.** Do NOT auto-execute destructive or scope-expanding actions.

5. **Execute the chosen action** by invoking the appropriate skill or slash command.

</process>
`,

    'quick.md': `---
name: rihal:quick
description: Execute a quick task with Rihal Code guarantees (atomic commits, state tracking) but skip optional agents
argument-hint: <task description>
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - SlashCommand
---

<objective>
Execute a small task end-to-end with minimal ceremony. Skip Majlis consultation, skip full sprint planning, skip retrospectives. Just do the work, commit atomically, and update \`.rihal/progress/\`.

For bigger tasks, use \`/rihal:dispatch\` or \`/rihal:convene\` instead.
</objective>

<when_to_use>

- ✅ Small bug fix (under 50 lines)
- ✅ Copy change, config tweak, single dependency update
- ✅ Rename or refactor that's obviously safe
- ✅ Documentation update
- ✅ Test fix

Do NOT use for:

- ❌ Architecture changes (use \`/rihal:convene\` + ADR)
- ❌ New features (use \`/rihal:dispatch\`)
- ❌ Breaking changes (use \`/rihal:convene\`)
- ❌ Cross-team coordination (use Raees via \`/rihal:dispatch\`)

</when_to_use>

<process>

1. **Parse the task** from $ARGUMENTS. If unclear, ask ONE clarifying question.

2. **Pre-flight:**
   - \`git status\` — any uncommitted changes? If yes, ask user to stash/commit first.
   - Identify the exact files that will change (glob before editing)

3. **Load minimal context:**
   - Only the files being modified + their direct importers
   - Do NOT load \`.rihal/\` state or agent files
   - Do NOT invoke any Rihal agent unless the task explicitly needs one

4. **Make the change.** One atomic edit. No "while I'm here" improvements.

5. **Verify:**
   - Run tests if the project has them
   - \`git diff\` — confirm the change matches the task
   - Check for unintended side effects

6. **Commit atomically:**
   \`\`\`bash
   git add {specific files}
   git commit -m "{type}({scope}): {subject}"
   \`\`\`
   Follow Conventional Commits. No AI attribution in messages.

7. **Log to progress:**
   - Append one line to \`.rihal/progress/quick-tasks.md\` with date, task, and commit hash

8. **Report:**
   \`\`\`
   ✅ Quick task complete
   Files changed: {list}
   Commit: {sha} {message}
   Tests: {PASS / SKIPPED / FAIL}
   \`\`\`

9. **Do NOT push.** Per AGENTS.md rules, pushes require explicit per-action approval.

</process>
`,

    'fix.md': `---
name: rihal:fix
description: Systematic debugging with the Rihal team — gather symptoms, form hypothesis, test, fix
argument-hint: <issue description>
allowed-tools:
  - Read
  - Bash
  - Grep
  - Glob
  - Edit
  - SlashCommand
---

<objective>
Debug an issue using the scientific method. Gather symptoms, form a hypothesis, design a falsifying test, run it, and iterate. Use Fatima for test design and Omar/Haitham/Yousef for the actual fix, depending on the layer.
</objective>

<process>

1. **Capture the issue** from $ARGUMENTS. Ask for:
   - Reproduction steps (exact)
   - Expected behavior
   - Actual behavior
   - Environment (OS, browser, version)
   - Recent changes that might be related
   - Error messages or logs (paste verbatim)

   If the user has not provided enough, ask for it before proceeding.

2. **Classify the severity:**
   - **Critical:** blocks users, data loss risk, security issue → escalate to Fatima (release gate)
   - **High:** significant user impact → proceed with fix
   - **Medium:** minor impact, workaround exists → schedule via \`/rihal:dispatch\`
   - **Low:** cosmetic or edge case → consider logging and deferring

3. **Reproduce the bug FIRST.** If you cannot reproduce it reliably, debugging is guesswork. Document the exact reproduction sequence.

4. **Form ONE hypothesis at a time.** Write it down:
   > "I hypothesize that [cause], which would explain [symptoms]."

5. **Design a test that could falsify the hypothesis.** A good test is one where both outcomes (pass/fail) give you information.

6. **Run the test. Observe.** Update the hypothesis or proceed.

7. **Once the root cause is identified:**
   - Pick the right agent for the fix:
     - Frontend bug → Haitham
     - Backend bug → Yousef
     - ML/data bug → Zayd
     - Infra/deploy bug → Khalid
     - Cross-layer → Omar
   - Load that agent's skill
   - Apply the minimum fix that addresses the root cause

8. **Verify the fix:**
   - Run the original reproduction — should no longer reproduce
   - Run related tests
   - Consider adding a regression test (Fatima)

9. **Commit atomically** with a \`fix(scope): subject\` conventional commit message.

10. **Log the debug session** to \`.rihal/progress/debug-$(date +%Y-%m-%d)-{slug}.md\` with:
    - Symptoms
    - Root cause
    - Fix summary
    - Regression test added
    - Time spent

11. **If the bug was caused by a missing process** (no test, no gate, no review), flag it for discussion in next retro.

</process>
`,

    'github-sync.md': `---
name: rihal:github-sync
description: Sync .rihal/ state (phases, epics, stories) to GitHub — creates milestones, issues, and optionally a Project v2. Dry-run by default.
argument-hint: "[--execute] [--only=labels|milestones|epics|stories] [--phase=phase-01] [--project] [--repo=owner/name]"
allowed-tools:
  - Read
  - Bash
  - Glob
---

<objective>
Sync Rihal Code project state from \`.rihal/\` to the connected GitHub repository. Creates labels, milestones (per phase), issues for epics and stories, and optionally a Project v2 board.

This command mutates shared state on GitHub. Per AGENTS.md rules, it requires explicit per-invocation permission and defaults to DRY-RUN mode.
</objective>

<precondition>

1. **Check gh auth:** \`gh auth status\`. If not authenticated, stop and tell the user to run \`gh auth login\`.
2. **Check .rihal/ state exists.** If missing, suggest \`/rihal:kickoff\` first.
3. **Detect target repo** via \`gh repo view --json nameWithOwner\` in the current directory. If not in a git repo, ask for \`--repo=owner/name\`.

</precondition>

<process>

1. **Show the plan first (dry-run, always):**
   \`\`\`bash
   npx --yes github:hanzlahabib/rihal-code github-sync
   \`\`\`
   This lists labels, milestones, epics, stories that would be created.

2. **Review the plan with the user.** Confirm scope, narrow if needed (\`--only=epics\` or \`--phase=phase-02\`), ask if they want a Project v2 (add \`--project\`).

3. **Wait for explicit permission before executing.** Do NOT run \`--execute\` without the user confirming.

4. **Execute with confirmed scope:**
   \`\`\`bash
   npx --yes github:hanzlahabib/rihal-code github-sync --execute [flags]
   \`\`\`

5. **Report results.** Link to GitHub repo. Confirm sync map saved to \`.rihal/integrations/github-map.json\`.

6. **Subsequent syncs** use the sync map for idempotency — only new items get created.

</process>

<guardrails>

- Default is dry-run. \`--execute\` required to mutate.
- Interactive confirmation even in \`--execute\` mode (unless \`--yes\`).
- Sync map tracks IDs — no duplicate issues on re-run.
- Never deletes or updates existing GitHub items, only creates.
- GitHub mutations are treated the same as git pushes per AGENTS.md.

</guardrails>

<flags>
- \`--execute\` — actually create items (default: dry-run)
- \`--repo=owner/name\` — target a specific repo
- \`--only=labels|milestones|epics|stories\` — narrow the scope
- \`--phase=phase-id\` — sync only a specific phase
- \`--project\` — also create a Project v2 board
- \`--yes\` — skip interactive confirmation
</flags>
`,

    'discuss.md': `---
name: rihal:discuss
description: Structured discussion on a topic — adaptive questioning before taking action
argument-hint: <topic>
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
---

<objective>
Gather context through adaptive questioning before committing to a decision or plan. Use this when you have a half-formed idea and need the Rihal team to help clarify it BEFORE Majlis convenes or Raees dispatches.

Think of this as "pre-Majlis" — get your thinking straight first.
</objective>

<when_to_use>

- You have an idea but are not sure if it's worth building
- You need to frame a decision before asking the council
- You want to surface assumptions before committing
- The problem is fuzzy and needs to be sharpened
- Multiple competing ideas and you want to compare them

For structured multi-agent synthesis, use \`/rihal:convene\` instead.
For routing a clear request, use \`/rihal:dispatch\` instead.

</when_to_use>

<process>

1. **Read the topic** from $ARGUMENTS. If no topic, ask what we are discussing.

2. **Frame the discussion:**
   - What kind of question is this? (strategy / architecture / product / design / process)
   - What decision are we trying to make?
   - What is the reversibility? (one-way door vs two-way door)
   - What are the constraints (time, budget, team capacity)?

3. **Ask 3-5 adaptive questions** to surface context. Examples depending on topic type:

   **Strategy topic:**
   - Who specifically would use this?
   - What do they do today without it?
   - What would make us kill this in 3 months?

   **Architecture topic:**
   - Expected scale and lifetime?
   - Team experience with the candidate stacks?
   - Integration with existing systems?

   **Product topic:**
   - What user outcome are we trying to create?
   - How will we measure success?
   - What's the smallest thing that validates the assumption?

   **Process topic:**
   - What is the current process?
   - Where does it break?
   - What would "better" look like concretely?

4. **Listen.** Do not skip this step. The user's answers are data.

5. **Synthesize what you heard:**
   - Restate the problem in your own words
   - List the constraints
   - List the open questions

6. **Recommend a next action:**
   - **Clear enough to plan?** → \`/rihal:dispatch "{framed request}"\`
   - **Needs multi-agent synthesis?** → \`/rihal:convene "{framed question}"\`
   - **Still fuzzy?** → another round of \`/rihal:discuss\`
   - **Actually two problems?** → split and discuss each separately
   - **Not worth pursuing?** → document why and archive

7. **Save the discussion** to \`.rihal/progress/discuss-$(date +%Y-%m-%d)-{slug}.md\`:

   \`\`\`markdown
   # Discussion — {topic}

   **Date:** {date}
   **Reversibility:** {one-way / two-way}

   ## Framing
   {restated problem}

   ## Constraints
   - {constraint 1}

   ## Open questions
   - {question 1}

   ## Recommended next action
   {command to run next}
   \`\`\`

</process>
`,

    'help.md': `---
name: rihal:help
description: Show available Rihal Code commands and workflows
allowed-tools:
  - Read
  - Glob
---

Show all available Rihal Code slash commands, agent skills, and workflows.

**Pipeline Commands (predefined agent chains — pick by work type):**
- \`/rihal:project <name>\` — new project kickoff pipeline
  (Sadiq → Waleed → Ahmed Al Hassani → Hussain-PM → Zahra → Layla → Nasser)
- \`/rihal:feature <description>\` — feature build pipeline
  (Hussain-PM → Waleed → Layla → Haitham + Yousef → Fatima → Khalid)
- \`/rihal:ui <task>\` — UI/UX/design pipeline
  (Zahra → Layla → Haitham → Fatima)
- \`/rihal:council <question>\` — full 13-agent Majlis for strategic cross-domain questions

**Workflow Commands (single steps):**
- \`/rihal:kickoff\` — start a new phase (inside an existing project)
- \`/rihal:progress\` — situational awareness + route to next action
- \`/rihal:next\` — automatically advance to the next logical step
- \`/rihal:status\` — concise project status
- \`/rihal:discuss <topic>\` — structured discussion before committing
- \`/rihal:dispatch <request>\` — generic routing via Raees
- \`/rihal:quick <task>\` — execute a small task with atomic commit
- \`/rihal:fix <issue>\` — systematic debugging

**Utility Commands:**
- \`/rihal:team\` — list the team roster
- \`/rihal:dashboard\` — start the Diwan view-only dashboard
- \`/rihal:github-sync\` — sync phases/epics/stories to GitHub (dry-run default)
- \`/rihal:help\` — this message

**Agents** (load via \`.claude/skills/rihal-<agent>/SKILL.md\` or invoke by name):
- Strategy: Sadiq
- Leadership: Waleed (CTO), Ahmed Al Hassani (Tech Director), Nasser (Eng Manager)
- Product: Hussain (PM + SM)
- Design: Layla (UX), Zahra (Branding)
- Engineering: Omar (full-stack), Haitham (FE), Yousef (BE), Zayd (ML)
- Quality & Ops: Fatima (QA), Khalid (DevOps)
- Content: Noor (writer), Mariam (marketing)
- Meta: Raees (orchestrator), Majlis (council), Diwan (dashboard)

**Pick the right pipeline for your work:**
- New project from zero? → \`/rihal:project "project name"\`
- Building a feature? → \`/rihal:feature "description"\`
- UI/UX/design work? → \`/rihal:ui "task"\`
- Big strategic question? → \`/rihal:council "question"\`

**Quick helpers:**
- Just started? → \`/rihal:kickoff\` (phase-level, smaller than /rihal:project)
- Coming back after a break? → \`/rihal:progress\`
- Unsure what to do next? → \`/rihal:next\`
- Have a small task? → \`/rihal:quick "description"\`
- Have a bug? → \`/rihal:fix "description"\`
- Stuck on a decision? → \`/rihal:discuss "topic"\` then \`/rihal:council "question"\`
`,
  };

  let count = 0;
  for (const [file, content] of Object.entries(commands)) {
    fs.writeFileSync(path.join(commandsDir, file), content);
    count++;
  }
  return count;
}

/**
 * Install skills as Cursor rules (.cursor/rules/*.mdc)
 */
function installCursorRules(packageRoot, cwd) {
  const digestsDir = path.join(packageRoot, 'rihal/digests');
  const rulesDir = path.join(cwd, '.cursor/rules');
  fs.mkdirSync(rulesDir, { recursive: true });

  if (!fs.existsSync(digestsDir)) return 0;

  let count = 0;
  for (const file of fs.readdirSync(digestsDir)) {
    if (!file.endsWith('.md') || file === 'README.md') continue;
    const agent = file.replace('.md', '');
    const digestContent = fs.readFileSync(path.join(digestsDir, file), 'utf8');

    // Convert digest markdown → Cursor .mdc with frontmatter
    const mdc = `---
description: Rihal Code ${agent} agent — activates on @${agent} or when the user asks to consult ${agent}
globs: []
alwaysApply: false
---

# ${agent.toUpperCase()} — Rihal Code Agent

This rule activates when the user types \`@${agent}\` or asks to talk to ${agent}, consult ${agent}, or invoke ${agent}'s expertise.

${digestContent}

## Activation

When activated, adopt the ${agent} persona fully. Follow the principles and authority listed above. Defer to other agents on their domains. For deep agent behavior, load the full skill file from \`.claude/skills/rihal-${agent}-*/SKILL.md\` if present.
`;
    fs.writeFileSync(path.join(rulesDir, `rihal-${agent}.mdc`), mdc);
    count++;
  }

  // Meta rule: Rihal Code overview (always on)
  const overviewMdc = `---
description: Rihal Code — 19 specialized agents for AI-assisted team development
globs: []
alwaysApply: true
---

# Rihal Code Active

This project uses the Rihal Code — a context-aware AI team methodology with 19 specialized agents.

When the user invokes an agent by name (@waleed, @sadiq, @haitham, etc.) or asks strategic/cross-domain questions, load the matching rule from \`.cursor/rules/rihal-*.mdc\` and follow the agent's persona strictly.

For multi-agent questions, run the sequential Majlis protocol — consult agents one at a time in dependency order, each reading previous responses before adding their own position.

Full state lives in \`.rihal/\` directory.
Team roster: \`.rihal/team.yaml\` or \`rihal/digests/*.md\` in the package.
Model profiles: \`.rihal/model-profiles.json\` (quality / balanced / budget / inherit).

Available agents: sadiq, waleed, ahmed-hassani, nasser, hussain-pm, hussain-sm, layla, zahra, omar, haitham, yousef, zayd, fatima, khalid, noor, mariam, raees, majlis, diwan.
`;
  fs.writeFileSync(path.join(rulesDir, 'rihal-code.mdc'), overviewMdc);
  count++;

  return count;
}

/**
 * Install as Windsurf rules (same .mdc format as Cursor, different directory)
 */
function installWindsurfRules(packageRoot, cwd) {
  const rulesDir = path.join(cwd, '.windsurf/rules');
  fs.mkdirSync(rulesDir, { recursive: true });

  // Copy from .cursor/rules/ if they already exist (created by installCursorRules)
  const cursorRulesDir = path.join(cwd, '.cursor/rules');
  if (!fs.existsSync(cursorRulesDir)) return 0;

  let count = 0;
  for (const file of fs.readdirSync(cursorRulesDir)) {
    if (!file.startsWith('rihal') || !file.endsWith('.mdc')) continue;
    fs.copyFileSync(path.join(cursorRulesDir, file), path.join(rulesDir, file));
    count++;
  }
  return count;
}

/**
 * Install as Antigravity agents (follows AGENTS.md spec)
 */
function installAntigravityAgents(packageRoot, cwd) {
  const agentsDir = path.join(cwd, '.antigravity/agents');
  fs.mkdirSync(agentsDir, { recursive: true });

  const digestsDir = path.join(packageRoot, 'rihal/digests');
  if (!fs.existsSync(digestsDir)) return 0;

  let count = 0;
  for (const file of fs.readdirSync(digestsDir)) {
    if (!file.endsWith('.md') || file === 'README.md') continue;
    const src = path.join(digestsDir, file);
    const dest = path.join(agentsDir, `rihal-${file}`);
    fs.copyFileSync(src, dest);
    count++;
  }
  return count;
}

/**
 * Create or append to project-level AGENTS.md (universal standard for Codex, Aider, etc.)
 */
function installUniversalAgentsMd(packageRoot, cwd) {
  const agentsMdPath = path.join(cwd, 'AGENTS.md');

  const rihalSection = `

---

## Rihal Code Agents (installed)

This project has the Rihal Code team installed. The following agents are available when the user invokes them by name:

| Agent | Role | Authority |
|---|---|---|
| sadiq | Director of Strategy | Strategic direction, market fit, kill criteria |
| waleed | CTO | Tech stack, architecture, security |
| ahmed-hassani | Technology & Development Director | Delivery discipline, engineering standards, DORA metrics |
| nasser | Software Engineering Manager | 1:1s, hiring, growth plans, burnout prevention |
| hussain-pm | Product Manager | PRDs, requirements, scope |
| hussain-sm | Scrum Master | Sprint ops, story preparation, retros |
| layla | Lead UX Designer | Interaction design, design system, accessibility |
| zahra | Branding & Creative Director | Brand identity, typography (Latin + Arabic), color systems |
| omar | Senior Full-Stack Engineer | Implementation, code review |
| haitham | Senior Frontend Engineer | React/Next.js, Arabic RTL, pixel-perfect UIs |
| yousef | Senior Backend Engineer | APIs, databases, integrations |
| zayd | Senior ML Engineer | ML models, Arabic NLP, LLM integration |
| fatima | QA Lead | Testing, release gating |
| khalid | DevOps | CI/CD, infra, monitoring |
| noor | Technical Writer | Docs, pitch decks, diagrams |
| mariam | Marketing Lead | GTM, positioning, case studies |
| raees | Orchestration Director | Work dispatch, sequencing, handoffs |
| majlis | Consulting Council | Multi-agent consultation with dissent surfaced |
| diwan | Dashboard Registry | View-only project transparency |

Full agent digests: \`rihal/digests/<agent>.md\` (in the package) or \`.claude/skills/rihal-<agent>-*/SKILL.md\`

When the user says "@waleed", "talk to waleed", or "consult the CTO", adopt the Waleed persona from his skill/digest. For cross-domain questions, run the Majlis sequential protocol.

Model profiles (.rihal/model-profiles.json): quality / balanced / budget / inherit.

State directory: \`.rihal/\` — phases, decisions, progress, artifacts, context.
`;

  if (fs.existsSync(agentsMdPath)) {
    const current = fs.readFileSync(agentsMdPath, 'utf8');
    if (current.includes('## Rihal Code Agents (installed)')) {
      return 'updated';
    }
    // Atomic: AGENTS.md is user-owned project doc; partial write on Ctrl+C
    // would corrupt it.
    writeFileAtomic(agentsMdPath, current + rihalSection);
    return 'appended';
  } else {
    writeFileAtomic(
      agentsMdPath,
      `# AGENTS.md\n\nThis file provides context for AI coding agents working on this project.\n${rihalSection}`,
    );
    return 'created';
  }
}

function parseArgs(args) {
  const result = { editor: null, yes: false };
  for (const arg of args) {
    if (arg.startsWith('--editor=')) {
      result.editor = arg.slice('--editor='.length);
    } else if (arg === '--yes' || arg === '-y' || arg === '--all') {
      result.yes = true;
    }
  }
  return result;
}

/**
 * Interactive prompt to let the user pick which editor(s) to install for.
 *
 * Auto-detects existing editor directories in the project and pre-selects
 * them. Users can accept defaults (Enter) or pick a custom combination.
 */
async function pickEditorsInteractive(cwd) {
  const { askChoice } = require('./lib/prompts.cjs');

  // Auto-detect editors that are already set up in this project
  const detected = {
    claude: fs.existsSync(path.join(cwd, '.claude')),
    cursor: fs.existsSync(path.join(cwd, '.cursor')),
    windsurf: fs.existsSync(path.join(cwd, '.windsurf')),
    antigravity: fs.existsSync(path.join(cwd, '.antigravity')),
  };

  const detectedList = Object.entries(detected)
    .filter(([, v]) => v)
    .map(([k]) => k);

  const choices = [
    { key: '1', id: 'claude',      label: 'Claude Code' },
    { key: '2', id: 'cursor',      label: 'Cursor' },
    { key: '3', id: 'windsurf',    label: 'Windsurf' },
    { key: '4', id: 'antigravity', label: 'Antigravity' },
    { key: '5', id: 'all',         label: 'All of the above (recommended)' },
  ];

  console.log(`\n🕌 Rihal Code Install\n`);
  console.log(`Which AI editor(s) do you want to install for?\n`);
  for (const c of choices) {
    const mark = detectedList.includes(c.id) ? ' (detected)' : '';
    const star = c.id === 'all' && detectedList.length === 0 ? ' ←' : '';
    console.log(`  ${c.key}) ${c.label}${mark}${star}`);
  }
  console.log();
  console.log(`You can pick:`);
  console.log(`  - A single number (e.g. "1" for Claude Code only)`);
  console.log(`  - Multiple numbers comma-separated (e.g. "1,2" for Claude + Cursor)`);
  console.log(`  - "5" or just Enter for all editors`);
  console.log();

  // Default selection: detected editors, or "all" if none detected
  const defaultChoice = detectedList.length > 0
    ? detectedList.map((id) => choices.find((c) => c.id === id).key).join(',')
    : '5';

  // askChoice handles validation, re-prompting, empty=>default, SIGINT, EOF.
  // Invalid tokens like "a" or "6" trigger a friendly re-prompt instead of crashing.
  const picks = await askChoice(`Your choice [${defaultChoice}]: `, {
    choices,
    default: defaultChoice,
    allowMulti: true,
    expand: (id) =>
      id === 'all'
        ? ['claude', 'cursor', 'windsurf', 'antigravity']
        : [id],
  });

  const editorIds = new Set(picks);

  // Always include universal AGENTS.md regardless of editor picks
  editorIds.add('universal');

  return [...editorIds];
}

/**
 * Interactive identity wizard — collect user_name and language
 * preferences once per fresh install. All questions are skippable
 * (Enter → default), so the old non-interactive behavior is preserved
 * for users who just want to get going.
 *
 * Defaults cascade: user-level ~/.rihal-code/defaults.json → hardcoded.
 * If the user changes any answer from the effective default, offer to
 * save as global defaults so future projects inherit them.
 */
async function runIdentityWizard(cwd) {
  const { askText, askConfirm } = require('./lib/prompts.cjs');
  const {
    loadUserDefaults,
    writeUserDefaults,
    HARDCODED_DEFAULTS,
  } = require('./lib/config.cjs');

  const user = loadUserDefaults();
  const currentUserName = user.user_name || HARDCODED_DEFAULTS.user_name;
  const currentLang = user.communication_language || HARDCODED_DEFAULTS.communication_language;
  const currentDocLang = user.document_output_language || HARDCODED_DEFAULTS.document_output_language;

  console.log(`\n📝 Quick setup (press Enter to keep defaults)\n`);

  const user_name = await askText(
    `   Your name or team name [${currentUserName}]: `,
    { default: currentUserName },
  );
  const communication_language = await askText(
    `   Communication language [${currentLang}]: `,
    { default: currentLang },
  );
  const document_output_language = await askText(
    `   Document output language [${currentDocLang}]: `,
    { default: currentDocLang },
  );

  const answers = { user_name, communication_language, document_output_language };

  // Offer to save as global defaults — but only if at least one answer
  // differs from the effective user-level default. No point asking if
  // everything already matches.
  const changed =
    user_name !== currentUserName ||
    communication_language !== currentLang ||
    document_output_language !== currentDocLang;
  const alreadySaved =
    user.user_name === user_name &&
    user.communication_language === communication_language &&
    user.document_output_language === document_output_language;

  if (changed && !alreadySaved) {
    const save = await askConfirm(
      `\n   Save these as global defaults for future projects? [y/N] `,
      { default: 'n' },
    );
    if (save) {
      writeUserDefaults({
        user_name,
        communication_language,
        document_output_language,
      });
      console.log(`   ✓ saved to ~/.rihal-code/defaults.json\n`);
    } else {
      console.log();
    }
  } else {
    console.log();
  }

  return answers;
}

module.exports = async function init(args, { packageRoot }) {
  const { PromptAbortError } = require('./lib/prompts.cjs');
  try {
    return await runInstall(args, { packageRoot });
  } catch (err) {
    if (err instanceof PromptAbortError) {
      console.log(`\n❌ Install cancelled — ${err.message}.`);
      process.exit(0);
    }
    throw err;
  }
};

async function runInstall(args, { packageRoot }) {
  const cwd = process.cwd();
  const rihalDir = path.join(cwd, '.rihal');
  const opts = parseArgs(args);

  // Determine which editors to install for:
  //   1. --editor=X explicit flag wins
  //   2. --yes / --all flag installs everything
  //   3. Otherwise: interactive prompt
  let editors;
  const nonInteractive = !!(opts.editor || opts.yes);
  if (opts.editor) {
    // Explicit editor flag
    editors = opts.editor === 'all'
      ? ['claude', 'cursor', 'windsurf', 'antigravity', 'universal']
      : [opts.editor, 'universal'];
  } else if (opts.yes) {
    editors = ['claude', 'cursor', 'windsurf', 'antigravity', 'universal'];
  } else {
    // Interactive mode
    editors = await pickEditorsInteractive(cwd);
  }

  // Interactive identity wizard — skippable, only runs when:
  //   - Not in --yes / --editor non-interactive mode
  //   - .rihal/config.json doesn't already exist (fresh install only)
  // If user just hits Enter on every question, defaults apply and the
  // flow is identical to the old behavior.
  let wizardAnswers = {};
  const configPath = path.join(cwd, '.rihal/config.json');
  if (!nonInteractive && !fs.existsSync(configPath)) {
    wizardAnswers = await runIdentityWizard(cwd);
  }

  console.log(`\n🕌 Rihal Code — installing in ${cwd}`);
  console.log(`   Target editors: ${editors.filter((e) => e !== 'universal').join(', ')}${
    editors.includes('universal') ? ' (+ AGENTS.md)' : ''
  }\n`);

  // ------ Stage 1: .rihal/ state directory ------
  if (fs.existsSync(rihalDir)) {
    console.log(`   ⚠ .rihal/ already exists — skipping state scaffolding`);
  } else {
    for (const dir of RIHAL_DIRS) {
      fs.mkdirSync(path.join(cwd, dir), { recursive: true });
    }
    for (const [file, content] of Object.entries(STATE_FILES)) {
      writeFileAtomic(path.join(cwd, file), content);
    }
    console.log(`   ✓ .rihal/ state directory created`);
  }

  // Model profiles
  const profilesSource = path.join(packageRoot, 'rihal/config/model-profiles.json');
  const profilesDest = path.join(cwd, '.rihal/model-profiles.json');
  if (fs.existsSync(profilesSource) && !fs.existsSync(profilesDest)) {
    fs.copyFileSync(profilesSource, profilesDest);
    console.log(`   ✓ model-profiles.json copied`);
  }

  // Project config — canonical source for project_name, user_name, paths,
  // model_profile. Workflows read this at runtime. Values cascade:
  // hardcoded → ~/.rihal-code/defaults.json → wizard answers.
  const { initProjectConfig } = require('./lib/config.cjs');
  const configCreated = initProjectConfig(cwd, wizardAnswers);
  if (configCreated) {
    console.log(`   ✓ .rihal/config.json created`);
  }

  // ------ Stage 2: Editor-specific installs ------

  if (editors.includes('claude')) {
    const skillsDir = path.join(cwd, '.claude/skills');
    if (!fs.existsSync(skillsDir) || !fs.readdirSync(skillsDir).some((d) => d.startsWith('rihal-'))) {
      fs.mkdirSync(skillsDir, { recursive: true });
      const skillCount = installSkills(packageRoot, cwd);
      console.log(`   ✓ claude  → ${skillCount} skills in .claude/skills/`);
      const cmdCount = installSlashCommands(packageRoot, cwd);
      console.log(`   ✓ claude  → ${cmdCount} slash commands in .claude/commands/rihal/`);
    } else {
      console.log(`   ⚠ claude  → .claude/skills/rihal-* already exist, skipping`);
    }
  }

  if (editors.includes('cursor')) {
    const cursorCount = installCursorRules(packageRoot, cwd);
    console.log(`   ✓ cursor  → ${cursorCount} rules in .cursor/rules/`);
  }

  if (editors.includes('windsurf')) {
    const windsurfCount = installWindsurfRules(packageRoot, cwd);
    console.log(`   ✓ windsurf → ${windsurfCount} rules in .windsurf/rules/`);
  }

  if (editors.includes('antigravity')) {
    const agCount = installAntigravityAgents(packageRoot, cwd);
    console.log(`   ✓ antigravity → ${agCount} agents in .antigravity/agents/`);
  }

  if (editors.includes('universal') || editors.includes('all')) {
    const result = installUniversalAgentsMd(packageRoot, cwd);
    console.log(`   ✓ universal → AGENTS.md ${result}`);
  }

  // ------ Stage 2b: Verify manifest — catch partial installs ------
  // Non-fatal: warns about drift but doesn't abort. A Ctrl+C mid-install or
  // disk-full mid-copy would leave missing agents, and users would never know
  // without this check.
  const { verifyInstall, formatReport } = require('./lib/manifest.cjs');
  const { reports, hasDrift } = verifyInstall(cwd, packageRoot, editors);
  if (hasDrift) {
    console.log(`\n⚠ Install verification found drift:`);
    console.log(formatReport(reports));
    console.log(`\n   Re-run install to repair, or run 'rihal-code doctor' for details.`);
  } else {
    console.log(`\n   ✓ Install verified — all expected agents and skills present.`);
  }

  // ------ Stage 3: CLAUDE.md (only if Claude being installed and user doesn't have one) ------
  if (editors.includes('claude')) {
    const claudeMdDest = path.join(cwd, 'CLAUDE.md');
    if (!fs.existsSync(claudeMdDest)) {
      const claudeMdSource = path.join(packageRoot, 'rihal/templates/claude-md-starter.md');
      if (fs.existsSync(claudeMdSource)) {
        fs.copyFileSync(claudeMdSource, claudeMdDest);
        console.log(`   ✓ CLAUDE.md created`);
      }
    }
  }

  console.log(`
✅ Rihal Code installed.

Editor usage:

  Claude Code:
    /rihal:help                       — show all commands
    /rihal:team                       — list the team
    /rihal:convene "your question"    — multi-agent Majlis
    /rihal:dispatch "your request"    — route via Raees

  Cursor / Windsurf:
    @waleed                           — invoke the CTO
    @sadiq                            — invoke the strategist
    @zahra                            — invoke the branding director
    (19 agents total — see .cursor/rules/ or .windsurf/rules/)

  Antigravity:
    Agents loaded from .antigravity/agents/

  Any editor reading AGENTS.md:
    The Rihal team roster is in project-level AGENTS.md

Dashboard (any editor, runs outside):
  npx github:hanzlahabib/rihal-code dashboard

State: .rihal/
Model profiles: .rihal/model-profiles.json (quality / balanced / budget / inherit)

Change profile: npx github:hanzlahabib/rihal-code set-profile balanced
Show models:    npx github:hanzlahabib/rihal-code show-model
`);
}
