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

Each agent's full persona and principles are available via:
- \`.claude/skills/rihal-<agent>-*/SKILL.md\` (full skill, installed in this project)
- \`rihal-code digest <agent>\` (lean digest CLI command — prefer this for lower context cost; the CLI resolves the digest internally, no project-relative file paths)

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

**b) Load the agent's digest** by shelling out to the rihal-code CLI:

\`\`\`bash
rihal-code digest {agent}
\`\`\`

The CLI knows where digests live internally — it prints the digest content to stdout. Never read \`rihal/digests/...\` directly; that path only exists inside the rihal-code package itself and would cross project boundaries on a user's machine. The digest is a lean 20-line summary — do NOT load the full SKILL.md unless strictly needed for this task.

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
description: Start a new project phase — strategy + stack + sprint plan + design baseline
allowed-tools:
  - Read
  - Write
  - Bash
---

🚀 **Rihal Kickoff — new phase setup**

Run when starting a new phase of work inside an existing project. This is a **context-heavy** workflow that loads 4 agents sequentially and writes multiple artifacts. It intentionally STOPS after sprint planning so you can choose how to proceed with epic/story generation — keeping the context budget lean for downstream work.

## Prerequisites

- \`.rihal/\` exists (run \`rihal-code install\` if not)
- Project is initialized (\`.rihal/state.json\` present)

## Steps

0. **Ensure a milestone exists.** Run:

   \`\`\`bash
   rihal-code milestone current --json
   \`\`\`

   If the result is \`null\`, no milestone is active. Create and activate a default one so this phase has a top-level parent to belong to:

   \`\`\`bash
   rihal-code milestone create m-0.1.0 --name="Initial milestone" --goal="First shippable unit"
   rihal-code milestone activate m-0.1.0
   \`\`\`

   If a milestone already exists, skip this step. New phases inherit the active milestone automatically via their frontmatter — no extra work needed.

1. **Initialize \`.rihal/\` directories** if any are missing (phases, plans, decisions, artifacts, progress, context).

2. **Load Sadiq** (strategist) — ask:
   - What problem are we solving?
   - Who is it for?
   - What are the kill criteria (when do we stop)?
   Write findings to \`.rihal/phases/{phase}/brief.md\`.

   Then link the new phase to the active milestone:

   \`\`\`bash
   rihal-code milestone link {phase}
   \`\`\`

   This writes \`milestone: <active-id>\` into the phase brief's frontmatter. Sprints and stories created under this phase will inherit automatically unless they override.

3. **Load Waleed** (CTO) — lock the tech stack and write an ADR to \`.rihal/decisions/001-stack-{phase}.md\`.

4. **Load Hussain-PM** — break the phase into 3-5 sprints. Write goals, duration, and capacity notes to \`.rihal/phases/{phase}/sprints.md\` using the standard header convention:

   \`\`\`markdown
   ## Sprint 01 — {sprint goal}
   Duration: {N weeks}
   Capacity: {devs} devs, {days} days, {points} points
   DoD:
     - tests pass
     - a11y audit
     - deployed to staging

   ## Sprint 02 — {sprint goal}
   ...
   \`\`\`

5. **Initialize per-sprint state** — for each sprint parsed from sprints.md, run:

   \`\`\`bash
   rihal-code sprint init sprint-{N}
   \`\`\`

   This creates \`.rihal/phases/{phase}/sprints/sprint-{N}/state.json\` with the goal, capacity, and DoD extracted from sprints.md. Then activate the first sprint:

   \`\`\`bash
   rihal-code sprint activate sprint-01
   \`\`\`

   The CLI is atomic and idempotent — re-running init on an existing sprint is a no-op.

6. **Load Layla** — define the design system baseline. Write token decisions to \`.rihal/artifacts/brand/design-system.md\`.

7. **Update state:**
   - \`.rihal/state.json\` → record current phase
   - \`.rihal/context/active.md\` → 2k-token phase summary that downstream commands will read

8. **🛑 STOP and present the next-step menu below.** Do NOT auto-continue into epic/story generation — let the user decide so the context budget stays lean for the next step.

## Output summary

After steps 1-6 complete, print a concise summary:

\`\`\`
✅ Kickoff complete — {phase}
   Strategy:      .rihal/phases/{phase}/brief.md
   Stack decision: .rihal/decisions/001-stack-{phase}.md
   Sprint plan:    .rihal/phases/{phase}/sprints.md  ({N} sprints)
   Sprint state:   .rihal/phases/{phase}/sprints/    ({N} × state.json + active-sprint marker)
   Design tokens:  .rihal/artifacts/brand/design-system.md
   Active context: .rihal/context/active.md ({token count} tokens)

   ★ Active sprint: sprint-01
\`\`\`

Verify the state is queryable:

\`\`\`bash
rihal-code sprint                  # list all sprints with status
rihal-code sprint current          # show active sprint detail
\`\`\`

## 🎯 Next step — choose one

**Option A — Continue in this session (fast, heavier context):**
  Generate epics and stories for **Sprint 1 only** inline. Adds ~3k tokens.
  Say: \`generate sprint 1 epics and stories\` and I'll run rihal-create-epics-and-stories scoped to sprint-01.

**Option B — Fresh context (recommended if context > 40%):**
  1. Run \`/clear\` to reset
  2. Run \`/rihal:generate-sprint sprint-01\` to regenerate epics/stories with a clean slate
     (The command re-reads \`.rihal/phases/{phase}/brief.md\` + sprints.md — nothing is lost.)

**Option C — Review first:**
  Run \`/rihal:progress\` or open \`.rihal/context/active.md\` to review what was written.

Ask the user which option, then proceed accordingly. Do NOT pick for them unless \`communication_mode\` is \`yolo\` AND they have explicitly said "just go".
`,

    'bug.md': `---
name: rihal:bug
description: Capture a bug mid-sprint without derailing current work — links to active sprint and in-progress story
argument-hint: <bug description>
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
---

🐛 **Rihal Bug — non-blocking intake for mid-sprint bugs**

Captures a bug as a structured markdown file under \`.rihal/artifacts/bugs/pending/\` and registers it in the active sprint's \`state.json\`. Does NOT interrupt current work unless the severity is critical (then it asks whether to pause).

## When to run this

- You hit a bug mid-sprint and want to remember it without losing context
- Code review surfaced something broken that isn't your current story
- User-reported issue came in while you're deep in another task
- Anything you'd otherwise write on a sticky note and lose

## Process

### Step 1 — Parse \$ARGUMENTS as the bug title

If \$ARGUMENTS is empty, ask: "What's the bug? Short title (one line)."

### Step 2 — Gather metadata

In **guided** communication_mode, ask briefly:

\`\`\`
Severity: critical / high / medium / low  [default: medium]
Area:     frontend / backend / ml / infra / devops / docs / qa / design  [default: unknown]
\`\`\`

Also offer to fill the description (1-3 sentences) and steps to reproduce.

In **yolo** mode, infer from keywords:
- "crash", "broken", "blocker", "data loss" → high (or critical if explicit)
- "typo", "minor", "cosmetic" → low
- Everything else → medium
- Area inferred from current in-progress story's files (frontend if .tsx, backend if .ts server files, etc.)

### Step 3 — Call the CLI helper

Run \`rihal-code bug\` with the collected flags:

\`\`\`bash
rihal-code bug "TITLE" --severity=SEVERITY --area=AREA [--story=STORY-ID] [--description='DESCRIPTION']
\`\`\`

The CLI handles:
- File creation at \`.rihal/artifacts/bugs/pending/bug-{date}-{slug}.md\` with YAML frontmatter
- Auto-linking to active sprint + in-progress story (if unambiguous)
- Registration in sprint state.json via \`addBugToSprint()\`
- Atomic writes via \`writeFileAtomic\` — Ctrl+C cannot corrupt state

### Step 4 — Handle critical severity

If severity is critical, the CLI prints a recommendation to pause current work. Relay it to the user and ASK:

\`\`\`
⚠ This is a CRITICAL bug. Pause your current story and fix this now? [Y/n]
\`\`\`

If yes:
1. Block the current in-progress story: \`rihal-code sprint story <current-id> blocked\`
2. Write a pause handoff: \`/rihal:pause "critical bug {bug-id} — paused for immediate fix"\`
3. Suggest switching to the bug fix flow

If no, the bug stays in pending/ for later triage.

### Step 5 — Report

Show the CLI output verbatim (it already formats it well):

\`\`\`
🐛 Bug captured: bug-2026-04-11-login-button-mobile
   Severity: high
   Area:     frontend
   Sprint:   sprint-01 (linked to sprint state)
   Story:    story-1-2-signup
   File:     .rihal/artifacts/bugs/pending/bug-2026-04-11-login-button-mobile.md
\`\`\`

Then suggest the follow-up:
- To view all pending bugs: \`/rihal:bugs\`
- To edit the bug file (add repro steps, etc.): open the file directly
- To resolve later: \`/rihal:bug-resolve bug-2026-04-11-login-button-mobile\`

## Rules

- Do NOT automatically pause current work for non-critical bugs. That derails flow.
- Do NOT invent repro steps you don't know. If the user didn't provide them, leave the template placeholders.
- ALWAYS prefer explicit \`--story=\` over auto-detection if there are multiple in-progress stories (ambiguity → no auto-link).
- Never write secrets into bug descriptions. If the user pastes a stack trace with a token, redact it.
`,

    'bugs.md': `---
name: rihal:bugs
description: List pending bugs with optional severity/area/sprint filters
argument-hint: [--severity=high] [--area=frontend] [--sprint=sprint-01]
allowed-tools:
  - Read
  - Bash
  - Glob
---

📋 **Rihal Bugs — list pending bugs**

Reads \`.rihal/artifacts/bugs/pending/\` and renders the bug queue grouped by severity. Fast — reads only frontmatter from each file.

## Process

Run:

\`\`\`bash
rihal-code bug list \$ARGUMENTS
\`\`\`

Pass through any filters the user provided: \`--severity=\`, \`--area=\`, \`--sprint=\`.

The CLI returns a grouped list like:

\`\`\`
🐛 Pending bugs (5)

🔴 CRITICAL (1)
   • bug-2026-04-11-oauth-redirect-loop  [backend · sprint-01 · → story-1-2-signup]

🟠 HIGH (2)
   • bug-2026-04-11-login-button-mobile  [frontend · sprint-01]
     Login button off-screen on iPhone SE

🟡 MEDIUM (2)
   • bug-2026-04-10-signup-validation  [frontend]
   • bug-2026-04-09-stripe-webhook-retry  [backend]
\`\`\`

## When to run

- Start of day to review what's outstanding
- Before sprint wrap to decide what rolls over
- When a user reports a bug and you want to check if it's already tracked

Print the CLI output verbatim. After printing, summarize in one line:

\`\`\`
{N} pending bugs total — {critical+high} need attention, {medium+low} can wait.

To resolve: /rihal:bug-resolve <bug-id>
To filter further: /rihal:bugs --severity=high
\`\`\`
`,

    'bug-resolve.md': `---
name: rihal:bug-resolve
description: Mark a bug as resolved — moves the file to done/ and updates sprint state
argument-hint: <bug-id>
allowed-tools:
  - Read
  - Write
  - Bash
---

✅ **Rihal Bug Resolve — close out a tracked bug**

Moves the bug file from \`.rihal/artifacts/bugs/pending/\` to \`.rihal/artifacts/bugs/done/\`, rewrites the \`status:\` frontmatter field to \`resolved\`, and marks the bug resolved in the active sprint's \`state.json\` (if it was registered there).

## Process

### Step 1 — Parse bug id

\$ARGUMENTS must be a bug id like \`bug-2026-04-11-login-button-mobile\`. If missing:

\`\`\`bash
rihal-code bug list
\`\`\`

Show the list and ask which one.

### Step 2 — Call the CLI helper

\`\`\`bash
rihal-code bug resolve \$ARGUMENTS
\`\`\`

Atomic: the file move uses \`writeFileAtomic\` + \`unlinkSync\`, the sprint state update uses \`resolveBugInSprint()\`. Both or neither.

### Step 3 — Offer follow-up

If this was the LAST pending bug:
\`\`\`
🎉 All pending bugs resolved.
\`\`\`

If there are more:
\`\`\`
{N} pending bugs remaining. Run /rihal:bugs to see them.
\`\`\`

If the resolved bug was linked to a story that's now clear of bugs:
\`\`\`
Consider resuming the story: /rihal:sprint story <story-id> in_progress
\`\`\`

## Rules

- Do NOT delete bug files — always move to done/ so the history is preserved.
- If the bug id doesn't exist in pending/, stop and show the user what's available via \`rihal-code bug list\`. Don't guess.
- Never change a bug's severity or area on resolve — if the metadata was wrong, it's wrong in the history too.
`,

    'preserve.md': `---
name: rihal:preserve
description: Add a durable learning or decision to the project's permanent memory file (with auto-archive)
argument-hint: <section> <learning>
allowed-tools:
  - Read
  - Write
  - Bash
---

🧠 **Rihal Preserve — add to the project's permanent brain**

Writes a single learning, decision, or pattern to \`.rihal/context/permanent.md\` under the right section. When the file grows past 200 lines (roughly 3k tokens), it auto-archives the oldest entries to \`.rihal/context/permanent-archive.md\` so the active memory stays lean.

## When to run this

- You just figured out a non-obvious convention the team uses (e.g. "tests live in \`__tests__/\`, not \`test/\`")
- An architecture decision was made that future-you will forget the reason for
- You hit a gotcha that burned an hour and want to never hit it again
- You want to remember a key file path without grepping the repo
- A common workflow has 3+ steps and nobody has written them down

**Don't use this for:**
- Session-specific details (use \`/rihal:save-session\` instead — those are searchable history, not permanent)
- Project strategy or kill criteria (that belongs in \`.rihal/phases/{phase}/brief.md\`)
- Formal architecture decisions with tradeoff analysis (use \`.rihal/decisions/NNN-*.md\` ADR files)

The difference from save-session: save-session is *"this happened today"*, preserve is *"agents should ALWAYS know this about this project"*.

## Sections

Fixed categories the entry routes to. Pick the best fit — if nothing matches exactly, the helper creates a new section.

- **Conventions** — "Use pnpm not npm", "Tests live in X", "Config is YAML not JSON"
- **Architecture Decisions** — "Store state in .rihal/config.json", "Use writeJsonAtomic for all state writes"
- **Key File Paths** — "cli/index.js — CLI entry", "server/dashboard.js — Diwan server"
- **Common Workflows** — "To publish: pnpm test → pnpm build → pnpm publish"
- **Gotchas** — "readline with piped stdin hangs on second question() call"
- **Misc** — anything that doesn't fit the above

## Process

### Step 1 — Parse arguments

\$ARGUMENTS format: \`<section> <entry text>\` where section is one of the fixed names (case-insensitive). Example:

    /rihal:preserve Gotchas readline with piped stdin hangs on second question call

If the first word is not a recognized section, assume the whole \$ARGUMENTS is the entry and route to \`Misc\` (or ask in guided mode which section).

If \$ARGUMENTS is empty in guided mode, show the current stats and ask:

\`\`\`
🧠 Permanent memory stats:
   Location:        .rihal/context/permanent.md
   Entries:         {total}  ({percent_full}% full)
   Per section:     {breakdown}
   Archive:         {archive_lines} lines archived

What do you want to preserve, and under which section?
\`\`\`

### Step 2 — Call the CLI

\`\`\`bash
rihal-code preserve '{section}' '{entry_text}'
\`\`\`

The CLI is project-isolated — it resolves the permanent-memory library from its own installed package root, never from the user's filesystem. You never need to know where the library lives. It:
- Prefixes the entry with today's date (\`[YYYY-MM-DD]\`)
- Adds it to the right section
- Writes atomically via writeFileAtomic
- If the file exceeds 200 lines, triggers auto-archive (moves oldest dated entries to permanent-archive.md until back under 150 lines)
- Reports the result to stdout with entry count + archived count

Use \`rihal-code preserve --stats\` to see current usage without writing anything.

### Step 3 — Report

\`\`\`
🧠 Preserved: {section}
   → [2026-04-11] {entry text}

   File:    .rihal/context/permanent.md ({line_count} lines, {percent_full}% full)
   Section: {entries_in_section} entries
\`\`\`

If \`archived > 0\`, add:

\`\`\`
   📦 Auto-archived {archived} oldest entries to .rihal/context/permanent-archive.md
      to keep active memory lean.
\`\`\`

## Rules

- Entries should be **short, declarative, atomic** — one fact per entry. Avoid long paragraphs.
- No duplicate entries — check existing entries in the target section first, skip if it already says the same thing (even in different words).
- In yolo mode, still confirm the section choice before writing if it's ambiguous. Routing to the wrong section is annoying to fix.
- Never preserve anything secret (API keys, credentials, personal data).
- Never preserve anything that belongs in other state files (phase briefs, sprint state, ADRs, story content).
`,

    'save-session.md': `---
name: rihal:save-session
description: Write a searchable session log to .rihal/progress/ capturing decisions, learnings, pending tasks
argument-hint: [optional title]
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
---

💾 **Rihal Save Session — permanent searchable session log**

Writes a timestamped markdown file to \`.rihal/progress/session-{date}-{slug}.md\` with structured YAML frontmatter. Unlike \`/rihal:pause\` (which is transient — one HANDOFF.json, auto-deleted on resume), session logs are **permanent history**. They pile up in \`.rihal/progress/\` and form a searchable trail of every work session on the project.

## When to run this

- End of a productive work session before \`/clear\`
- After solving a tricky bug you want to remember
- After making a meaningful decision you don't want to lose
- Before switching to an unrelated task so future-you can come back

## Difference from /rihal:pause

| | /rihal:pause | /rihal:save-session |
|---|---|---|
| Purpose | "pick me up later" | "remember this forever" |
| File count | 1 (HANDOFF.json, singleton) | many (session-*.md, append-only) |
| Auto-deleted on resume? | Yes | No |
| Searchable by topic? | No | Yes (frontmatter) |
| Overwrites existing? | Refuses w/o force | Never (unique filename) |

Run BOTH if you want both: /rihal:pause for immediate resume + /rihal:save-session for permanent history.

## Process

### Step 1 — Detect context

Read these state files (nothing from source code):
- \`.rihal/config.json\` → project_name, communication_mode
- \`.rihal/state.json\` → current_phase
- \`.rihal/phases/{phase}/sprints/active-sprint\` → active sprint id
- Active sprint's state.json → in_progress stories

Run \`git status --short\` and \`git diff --stat\` to list files modified in this session.

### Step 2 — Gather fields (guided mode)

In **guided** communication_mode, present a multi-select to the user:

\`\`\`
💾 What do you want to save from this session?

[x] Title + outcome (auto-detected from context)
[x] Topics (keywords for search)
[ ] Decisions made
[ ] Key learnings
[ ] Pending tasks
[x] Files modified (auto-detected from git)
[ ] Errors + workarounds
[ ] Free-form notes
\`\`\`

Ask for each checked field. Keep answers concise — bullet lists not paragraphs.

In **yolo** communication_mode, skip the prompt and auto-capture:
- outcome: last significant action inferred from conversation
- topics: keywords from recent messages
- files modified: from git status
- decisions/learnings/pending: blank unless clearly inferable

### Step 3 — Write the log via the CLI

\`\`\`bash
rihal-code session save \\
  --title='{title}' \\
  --topics='{topic1,topic2,topic3}' \\
  --sprint='{sprint_id}' \\
  --story='{story_id}' \\
  --phase='{phase}' \\
  --outcome='{outcome}' \\
  --decision='{decision 1}' --decision='{decision 2}' \\
  --learning='{learning 1}' --learning='{learning 2}' \\
  --pending='{pending 1}' --pending='{pending 2}' \\
  --file='{file 1}' --file='{file 2}' \\
  --error='{error + workaround 1}' \\
  --notes='{free-form notes}'
\`\`\`

Only pass the flags you actually have content for — every field is optional. Repeatable flags (\`--decision\`, \`--learning\`, \`--pending\`, \`--file\`, \`--error\`) can appear as many times as needed; \`--topics\` is comma-separated in a single flag.

The CLI is project-isolated: it resolves the session-log library from its own installed package root, never from the user's filesystem. It also auto-picks a unique filename (\`session-{date}-{slug}.md\`, with \`-2\`, \`-3\` suffix on collision) and writes atomically.

### Step 4 — Report

\`\`\`
💾 Session saved: .rihal/progress/session-2026-04-11-{slug}.md

   Topics:    {topics joined}
   Sprint:    {sprint_id}
   Decisions: {N recorded}
   Learnings: {N recorded}
   Pending:   {N recorded}
   Files:     {N modified}

   Searchable later with: /rihal:continue {topic}
\`\`\`

## Rules

- Never overwrite an existing log — the helper auto-numbers collisions (\`-2\`, \`-3\`, …).
- Keep the log under 500 words total. If it needs more, the session was probably too broad.
- Topics must be concrete nouns ("jwt", "stripe", "rtl-layout") — NOT adjectives or phases.
- Do NOT dump the entire conversation into the log. Save decisions, learnings, and pointers. The live conversation is ephemeral; the log is the distilled value.
- If the user runs this in yolo mode, infer as much as you can but don't hallucinate fields. Empty sections are fine.
`,

    'pause.md': `---
name: rihal:pause
description: Save current work state to a HANDOFF file so you can resume exactly where you left off
argument-hint: [optional note]
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
---

⏸  **Rihal Pause — snapshot current state for later resume**

Writes a structured handoff file capturing exactly what you're working on right now, so when you come back (in 2 hours or 2 days) \`/rihal:resume\` can take you right back to the same story, the same task, the same blockers.

## When to run this

- You need to stop mid-sprint and switch to something else
- End of day and you want tomorrow-you to know where to continue
- Context window is filling up and you need to \`/clear\` but preserve state
- You have uncommitted work and want a persistent note about why

## What gets written

1. **\`.rihal/HANDOFF.json\`** — machine-readable state, one per project. Auto-detected by \`/rihal:resume\` and by entry of feature/ui/fix/quick commands.

2. **\`.rihal/phases/{phase}/sprints/{sprint-id}/.continue-here.md\`** — human-readable markdown for eyes, never auto-deleted (kept as a trail).

## Process

1. **Detect current work:**
   - Read \`.rihal/config.json\` for \`current_phase\`
   - Read \`.rihal/state.json\` to confirm phase
   - Read active sprint from \`.rihal/phases/{phase}/sprints/active-sprint\`
   - Read the sprint's \`state.json\` and find any story with \`status: in_progress\` — that's what you were doing
   - Run \`git status --short\` to list uncommitted files
   - Read \$ARGUMENTS as the next_action hint (if provided)

2. **Ask the user** (in guided mode; skip in yolo):
   - Confirm the inferred story is correct
   - Ask "any blockers you want to record?" — capture as a list
   - Ask "one-line description of your next action?" — capture for next_action

3. **Write the handoff via the CLI:**
   \`\`\`bash
   rihal-code handoff write \\
     --phase='{phase}' \\
     --sprint-id='{sprint_id}' \\
     --story-id='{story_id}' \\
     --current-task={current_task} \\
     --total-tasks={total_tasks} \\
     --last-command='{last_command}' \\
     --next-action='{next_action_string}' \\
     --blocker='{blocker 1}' --blocker='{blocker 2}' \\
     --file='{uncommitted file 1}' --file='{uncommitted file 2}'
   \`\`\`

   Repeatable flags: \`--blocker\`, \`--file\` (use each one multiple times for multiple entries). The CLI resolves the handoff library internally — you never need to know where it lives on disk.

   If the CLI reports a pending handoff already exists (\`--force\` not passed), tell the user there's an existing pause state and ask whether to overwrite. Re-run with \`--force\` if they confirm.

4. **Summarize what was saved:**
   \`\`\`
   ⏸  Paused at sprint-01 / story-1-2-signup (task 3/7)
      Blockers:   1 recorded
      Uncommitted: 3 files
      Next:       finish form validation then run tests
      Saved:      .rihal/HANDOFF.json
                  .rihal/phases/phase-01/sprints/sprint-01/.continue-here.md
   \`\`\`

5. **Suggest next steps:**
   - If they want to clear context: \`/clear\` then later \`/rihal:resume\`
   - If they want to switch sprints: \`rihal-code sprint activate <other-id>\`, then continue
   - If they want to commit uncommitted work as WIP: offer the command

## Rules

- Never overwrite an existing handoff without explicit confirmation. If one exists, show its summary first.
- Do NOT delete the .continue-here.md files — those are history across pauses.
- Blockers and next_action are the most valuable fields — spend time getting them right.
- In yolo mode, skip the asking and just snapshot whatever you can infer.
`,

    'resume.md': `---
name: rihal:resume
description: Read the pending HANDOFF and take you back to exactly where you left off
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
---

▶  **Rihal Resume — pick up where you paused**

Reads \`.rihal/HANDOFF.json\` and restores the working context: the phase, the sprint, the story, the task, the blockers, the uncommitted files. After successful resume, auto-deletes the handoff file so it doesn't get re-applied on the next command.

## When to run this

- Re-opened your editor after a break and \`/rihal:continue\` flagged a pending handoff
- You just ran \`/clear\` to free up context and want to re-enter the same work
- You're switching back after working on a different project

## Prerequisites

- \`.rihal/HANDOFF.json\` exists. If not, tell the user "no pending handoff — try \`/rihal:continue\` to see current state."

## Process

1. **Read the handoff via the CLI:**
   \`\`\`bash
   rihal-code handoff read
   \`\`\`
   Prints the HANDOFF.json as JSON, or the literal string \`null\` if none pending. Exit with "no pending handoff" if the CLI reports null.

   For a one-line summary instead of the full JSON, use \`rihal-code handoff read --summary\`.

2. **Verify the referenced sprint still exists.** Read \`.rihal/phases/{phase}/sprints/{sprint_id}/state.json\`. If missing, warn the user the sprint was deleted or moved — ask before proceeding.

3. **Re-activate the sprint** if it's not already active:
   \`\`\`bash
   rihal-code sprint activate {sprint_id} --phase={phase}
   \`\`\`

4. **Present the resume summary to the user:**
   \`\`\`
   ▶  Resuming from handoff written {paused_at}

      Phase:       {phase}
      Sprint:      {sprint_id}
      Story:       {story_id}
      Task:        {current_task}/{total_tasks}
      Last cmd:    {last_command}
      Blockers:    {blockers joined}
      Uncommitted: {uncommitted_files joined}

      Next action: {next_action}

      Proceed with this plan? [Y/n]
   \`\`\`

5. **Wait for confirmation** (unless communication_mode=yolo). If the user says yes:

6. **Load the relevant artifacts** to rebuild working context:
   - \`.rihal/context/active.md\` (always)
   - \`.rihal/phases/{phase}/stories/{story_id}.md\` (if story_id present)
   - \`.rihal/phases/{phase}/sprints/{sprint_id}/state.json\` (already read in step 2)

7. **Clear the handoff** (one-shot — we've consumed it):
   \`\`\`bash
   rihal-code handoff clear
   \`\`\`
   Note: the .continue-here.md file is KEPT as history. Only HANDOFF.json is deleted.

8. **Pick the right follow-on command** based on what was paused:
   - If a story was in_progress → suggest \`/rihal:dev-story\` to continue it
   - If just a sprint activation → suggest \`/rihal:next\` to pick the next ready story
   - If blockers exist → surface them prominently and ask if they're resolved

## Rules

- Never assume the resume is safe. Always show the summary and get user confirmation before re-entering the workflow (unless yolo).
- If the referenced sprint/story no longer exists (e.g. file deleted), STOP and ask the user what to do. Do not auto-recover silently.
- After successful resume, delete HANDOFF.json so it doesn't re-trigger.
- The .continue-here.md files are never deleted — they're a history trail.
`,

    'continue.md': `---
name: rihal:continue
description: Read state and suggest next action, optionally search past session logs by topic
argument-hint: [optional topic like "auth" or "payment"]
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
---

🧭 **Rihal Continue — where should I go next?**

A stateful helper. Reads \`.rihal/\` to figure out where the project is, what the last completed step was, and what the next logical step should be. Then presents you with two options: continue in this session, or clear context and run a specific fresh command.

If you pass a **topic argument** (e.g. \`/rihal:continue auth\`), it also searches past session logs in \`.rihal/progress/\` for matching entries and loads the most recent 3 so you get back relevant historical context without loading everything.

Runs in **under 2k tokens** — reads only state files and frontmatter, never source code or full artifacts.

## When to run this

- You just re-opened your editor and forgot where you left off
- You finished a major step and want the lean next action, not a full kickoff flow
- Your context is heavy and you want to know the cheapest way to proceed
- You want to know "what's actually blocked right now?"
- You remember solving something similar weeks ago and want to find that session log (\`/rihal:continue auth\`)

## Process

1. **Read state files only — no source code:**
   - \`.rihal/config.json\` (project name + communication_mode)
   - \`.rihal/state.json\` (current phase + any init markers)
   - \`.rihal/context/active.md\` (last compacted session summary)
   - Active milestone via \`rihal-code milestone current --json 2>/dev/null\` (returns \`null\` if none — that's fine, milestones are optional)
   - Active sprint via \`rihal-code sprint current --json 2>/dev/null\`
   - \`ls .rihal/phases/\` (list of phases, no content)
   - For the current phase, \`ls\` its \`tasks/\`, \`stories/\`, and check for \`brief.md\`, \`sprints.md\`

2. **If \$ARGUMENTS is non-empty, do a topic search** on session logs via the CLI:

   \`\`\`bash
   rihal-code session search '\$ARGUMENTS' --limit=3 --json
   \`\`\`

   Returns a JSON array of matching session metadata (date, slug, topics, outcome). For the top hits, read the full file via \`rihal-code session show <filename>\` — but only the frontmatter + "Quick Reference" + "Decisions Made" sections (keep under 500 tokens per log). Summarize what you found so the user sees: "Found 2 past sessions on 'auth': {slug} (date) — {outcome}".

   This is how you re-enter specific historical context without loading 30+ session logs.

3. **Check for a pending HANDOFF.json** at \`.rihal/HANDOFF.json\`. If present, the user paused mid-work. Recommend \`/rihal:resume\` as the top option.

4. **Compute the furthest-complete artifact** for the current phase:
   - Has \`brief.md\`? ✓
   - Has \`sprints.md\`? ✓
   - Has epics (files in \`tasks/\`)? ✓
   - Has stories (files in \`stories/\`)? ✓
   - Any story has a commit reference? ✓

   The highest ✓ tells you the last completed step. The next step is what comes after it.

5. **Check GitHub sync state** at \`.rihal/integrations/github-map.json\`:
   - If it exists and has entries, some work is already on GitHub
   - Compare local story count to synced count — flag the gap

6. **Check memory bank freshness** via \`rihal-code context --check 2>&1\` (returns exit 1 if stale). If stale, add a warning.

7. **Present the state report + next-action menu** (format below). If topic search in step 2 found matches, include a section above the menu: "Relevant past sessions: …"

## Output format (strict — keep terse)

\`\`\`
🧭 Rihal state — {project_name}

   Milestone: {m-id}  ({status}, target: {date})   ← omit line if no active milestone
   Phase:     {current-phase}
   Sprint:    {sprint-id}  ({status})              ← omit line if no active sprint
   Comms:     {guided|yolo}
   Memory:    {fresh|stale|never}
   HANDOFF:   {none|pending from {date}}

   Furthest:  {brief|sprints|epics|stories|committed}
   GitHub:    {N/M stories synced}

🎯 Recommended next step:

   A) {most efficient continuation}
      {one-line reason}

   B) Fresh context (if your session is heavy):
      /clear
      {exact command to run after clearing}

Which? [A/B/other]
\`\`\`

## Examples of next-step recommendations by state

| Last completed | Recommended A (in context) | Recommended B (fresh) |
|---|---|---|
| brief.md only | \`Load Hussain-PM and plan sprints\` | \`/clear\` + \`/rihal:sprint-planning\` |
| sprints.md done, no epics | \`Generate epics for sprint 1 inline\` | \`/clear\` + \`/rihal:generate-sprint sprint-01\` |
| epics + stories done, not pushed | \`Dry-run github-sync here\` | \`/clear\` + \`/rihal:push-sprint sprint-01\` |
| stories pushed, ready to code | \`Start story 1 inline\` | \`/clear\` + \`/rihal:dev-story\` |
| All sprints done | \`Run retrospective in context\` | \`/clear\` + \`/rihal:retrospective\` |
| Pending HANDOFF | \`Resume pending handoff\` | \`/clear\` + \`/rihal:resume\` |

## Rules

- Never pick the option for the user. Always present A + B and wait.
- Unless \`communication_mode=yolo\` AND the user explicitly said "just do it", then pick A and proceed.
- Output must fit on one screen. If the state is complex, pick the top 2 signals only.
- Do NOT read source files during this command. State files only.
`,

    'generate-sprint.md': `---
name: rihal:generate-sprint
description: Generate epics and stories for a specific sprint, re-reading state from disk (context-lean)
argument-hint: <sprint-id>
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
---

📝 **Rihal Generate Sprint — per-sprint epic/story creation**

Designed to run in a **fresh context** (right after \`/clear\`) so the session budget stays lean. Re-reads everything it needs from \`.rihal/\` state files — no assumption of prior session memory.

## When to run this

- Right after \`/rihal:kickoff\` finishes planning sprints, to generate stories for sprint 1
- Between sprints, to generate stories for the next sprint without carrying old context forward
- As part of a phased rollout where each sprint gets fleshed out just before execution

**Do NOT use this to plan the sprints themselves** — that's \`/rihal:kickoff\` or \`/rihal:sprint-planning\`. This command assumes sprints already exist in \`.rihal/phases/{phase}/sprints.md\`.

## Prerequisites

- \`.rihal/config.json\` exists
- \`.rihal/phases/{current-phase}/brief.md\` exists
- \`.rihal/phases/{current-phase}/sprints.md\` exists and contains a section for the requested sprint

If any are missing, stop and tell the user what to run first.

## Context load (deliberately minimal)

Do NOT read the full codebase. Read **only**:

1. \`.rihal/config.json\` → project name, languages
2. \`.rihal/state.json\` → current phase
3. \`.rihal/phases/{phase}/brief.md\` → problem, audience, kill criteria
4. \`.rihal/phases/{phase}/sprints.md\` → the ONE section for the requested sprint
5. \`.rihal/decisions/001-stack-{phase}.md\` if present → stack constraints

Target context load: ~5k tokens max. If you find yourself reading more than this, stop and ask the user whether to proceed.

## Process

1. **Parse the sprint id from \$ARGUMENTS.** If missing, read sprints.md and list available sprints, then ask.

2. **Extract the sprint's goal and scope** from its section in sprints.md. Example:
   \`\`\`
   ## Sprint 01 — Auth basics
   Goal: User can sign up and log in
   Scope: email/password auth, session management, password reset
   \`\`\`

3. **Generate 2-5 epics** scoped to this sprint's goal. Each epic has:
   - Title (one line)
   - Vision (why this epic)
   - 3-6 stories underneath

4. **Generate stories** for each epic. Each story has:
   - Frontmatter with \`epic: epic-N-slug\` and \`sprint: {sprint-id}\`
   - Problem statement
   - Acceptance criteria (Given/When/Then or bullet checklist)
   - Test hints
   - Rough size (points or t-shirt)

5. **Write files:**
   - \`.rihal/phases/{phase}/tasks/epic-{N}-{slug}.md\` — one per epic
   - \`.rihal/phases/{phase}/stories/story-{epic-N}-{story-M}-{slug}.md\` — one per story
   - Update \`.rihal/phases/{phase}/sprints.md\` to mark checkboxes with the actual story ids

6. **Do NOT push to GitHub in this command.** That's what \`/rihal:push-sprint {sprint-id}\` is for (separate, explicit, with \`gh\` under the hood).

## Output summary

\`\`\`
📝 Sprint {sprint-id} epics + stories generated
   Epics:   {N} at .rihal/phases/{phase}/tasks/
   Stories: {M} at .rihal/phases/{phase}/stories/
   Linked:  every story has epic: + sprint: frontmatter

Next:
  /rihal:push-sprint {sprint-id}     # create GitHub issues (dry-run first, then --execute)
  /rihal:dev-story                   # start implementing the first story
  /clear && /rihal:generate-sprint {next-sprint-id}   # next sprint in fresh context
\`\`\`

## Rules

- Never invent content not grounded in brief.md. If a sprint's scope is vague, ask the user to clarify before writing stories — don't hallucinate.
- Every story MUST have the \`epic:\` and \`sprint:\` frontmatter so \`/rihal:push-sprint\` can filter correctly.
- In \`guided\` communication mode: present the epic breakdown to the user before writing story files, wait for confirmation.
- In \`yolo\` mode: proceed through writing without confirmation.
- Stay under 5k tokens of context load. If you need more, it's a sign the work should be decomposed further.
`,

    'init.md': `---
name: rihal:init
description: Scan the codebase, write a project brief, and populate the .rihal/ memory bank
argument-hint: (no args — uses current working directory)
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
---

🧠 **Rihal Init — codebase scan & memory bank setup**

Goal: Understand what's in this project and write a concise brief + memory bank so every future Rihal agent starts with real context instead of guessing.

## When to run this

- First time using Rihal Code in an existing project (brownfield)
- After a major refactor changed the tech stack
- When \`.rihal/context/active.md\` feels stale or wrong
- Before running \`/rihal:feature\` for the first time on an unfamiliar repo

Do NOT use this to START a new project from zero — that's \`/rihal:project\`.

## Prerequisites

- \`.rihal/\` directory exists (run \`rihal-code install\` first if not)
- \`.rihal/config.json\` present

If either is missing, stop and tell the user to run \`npx --yes github:hanzlahabib/rihal-code install\`.

## What to do

### Step 1 — Load config
Read \`.rihal/config.json\` to get \`project_name\`, \`user_name\`, \`communication_language\`, \`planning_artifacts\`. Use these throughout.

### Step 2 — Scan the codebase (read-only, efficient)

Use Glob and Read to collect facts. Do NOT load entire source files — read targeted metadata.

**Tech stack detection** — check for and read the first 50 lines of whichever of these exist:
- \`package.json\` (Node/JS/TS)
- \`pyproject.toml\` / \`requirements.txt\` / \`Pipfile\` (Python)
- \`Cargo.toml\` (Rust)
- \`go.mod\` (Go)
- \`Gemfile\` (Ruby)
- \`pom.xml\` / \`build.gradle\` (Java/Kotlin)
- \`composer.json\` (PHP)
- \`mix.exs\` (Elixir)
- \`.csproj\` (C#/.NET)

**Structure scan** — use Glob for:
- \`**/README.md\` (root + key subdirs)
- \`**/*.md\` in \`docs/\` if present
- Top-level directory listing (one level deep only)
- Test directory pattern (\`test/\`, \`tests/\`, \`__tests__\`, \`spec/\`)
- Config files (\`.env.example\`, \`tsconfig.json\`, \`.eslintrc*\`, \`tailwind.config.*\`, \`next.config.*\`, \`vite.config.*\`, \`.prettierrc*\`)

**Entry points** — identify and read top 30 lines of:
- \`src/index.*\` / \`src/main.*\` / \`app/\` / \`pages/\`
- \`server.js\` / \`main.py\` / \`app.js\` / \`server/index.*\`

**Git context** — run:
\`\`\`bash
git log --oneline -20 2>/dev/null | head -20
git remote get-url origin 2>/dev/null
git branch --show-current 2>/dev/null
\`\`\`

### Step 3 — Synthesize findings

Extract these facts from the scan:

- **Stack:** languages, frameworks, major libraries (with versions)
- **Structure:** key top-level dirs and what they contain
- **Entry points:** where execution starts (API server, CLI, web app, etc.)
- **Conventions:** file naming (kebab/camel/snake), test location, module system (ESM/CJS), TypeScript or not
- **Scripts:** what \`package.json\` scripts (or Makefile targets) exist — build, test, lint, dev
- **External services:** anything obvious from \`.env.example\` or config files (DB, Redis, third-party APIs)
- **Recent activity:** what the last 20 commits were about (feature work? bugs? refactor?)

If anything is ambiguous (mixed conventions, unclear entry point, etc.), note it explicitly — don't guess.

### Step 4 — Write the memory bank (two files)

**A. \`.rihal/context/active.md\` — lean brief, hard budget: under 2000 tokens**

Structure:
\`\`\`markdown
# Active Context — {project_name}

_Last updated: {ISO date} | Generated by /rihal:init_

## What this project is
_One paragraph, 2-3 sentences. What it does, who it's for, what tech._

## Stack
- **Language:** {primary + secondary}
- **Framework:** {main + key libs}
- **Build:** {tool}
- **Tests:** {framework + location}

## Structure
\\\`\\\`\\\`
{annotated tree of top-level dirs only, 10-15 lines max}
\\\`\\\`\\\`

## Entry points
- \`{path}\` — {what runs here}

## Key scripts
- \`{cmd}\` — {purpose}

## Conventions spotted
- {item}

## Recent focus
_Based on last 20 commits:_ {theme in 1-2 sentences}

## Unknowns / flags
_Things that need human clarification:_
- {item} (if any)

## Next recommended command
_Based on what I found:_ \`/rihal:{command}\` — {reason}
\`\`\`

**B. \`.rihal/context/project-brief.md\` — fuller briefing, 500-1500 words**

Structure:
\`\`\`markdown
# Project Brief — {project_name}

_Generated by /rihal:init on {date}_

## Executive summary
{3-4 sentences}

## Tech stack (detailed)
{full versions table from package.json etc.}

## Directory tour
{each top-level dir with 1-2 sentence explanation}

## Build & test workflow
{what commands to run, in what order}

## External dependencies & services
{databases, APIs, auth providers, etc.}

## Observed conventions
{file naming, folder layout, import style, test patterns}

## Recent history
{last 20 commits summarized by theme}

## Open questions for the user
{bullet list of things that need clarification before any changes}
\`\`\`

Both files must be written atomically — use Write tool, not Edit, since these are new files.

### Step 5 — Update state

Read \`.rihal/state.json\`, merge in:
\`\`\`json
{
  "initialized": true,
  "initialized_at": "{ISO timestamp}",
  "init_source": "/rihal:init scan"
}
\`\`\`

Write back atomically.

### Step 6 — Print a terse summary

Tell the user what was written and recommend the next command. Under 200 words.

Format:
\`\`\`
🧠 Rihal Init complete.

📁 Scanned: {X files, Y dirs}
🛠️  Stack: {one-line summary}
📝 Wrote:
   .rihal/context/active.md (Y tokens)
   .rihal/context/project-brief.md (Y words)

⚠ Unknowns: {count} (see project-brief.md § Open questions)

➡ Next: {recommended slash command} — {reason in one line}
\`\`\`

## Rules

- Never fabricate facts not present in the codebase. If something is unclear, flag it under "Unknowns" rather than guessing.
- Do NOT read entire source files — targeted metadata reads only, to stay under context budget.
- Do NOT skip Step 5 (state update) — that's what marks the project as initialized so other commands can check it.
- If \`.rihal/context/active.md\` or \`project-brief.md\` already exist, BACK THEM UP to \`.rihal/backups/context-{timestamp}.md\` before overwriting.
- Speak in the user's \`communication_language\` from config.
- Write document output in \`document_output_language\` from config.
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

1. **Read milestone and sprint state FIRST** (one query each, cheap):

   \`\`\`bash
   rihal-code milestone current --json 2>/dev/null
   rihal-code sprint current --json 2>/dev/null
   \`\`\`

   The milestone is the top-level organizing unit. If one is active, it scopes everything that follows. If none exists, fall back to the phase-level state.

2. **Read state**:
   - \`.rihal/state.json\` — current phase, active agents
   - \`.rihal/phases/{current}/sprints.md\` — sprint status
   - \`.rihal/phases/{current}/stories/\` — story files and their statuses
   - \`.rihal/progress/\` — latest entries

3. **Decision tree:**

   - **No \`.rihal/\` state** → run \`/rihal:kickoff\`
   - **Active milestone is \`completed\`** → suggest \`rihal-code milestone activate <next-id>\` or close out this phase
   - **No current phase** → ask user which phase, or run \`/rihal:kickoff\`
   - **Active sprint has a \`ready\` story** → call \`rihal-code sprint current\` to see it, invoke \`rihal-dev-story\` on the next ready one
   - **Active sprint has an \`in_progress\` story** → resume it directly via dev-story
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
- \`--sprint=sprint-id\` — sync only stories belonging to one sprint
- \`--epic=epic-id\` — sync only one epic + its child stories
- \`--story=story-id\` — sync only one story
- \`--with-labels\` — also create/ensure the Rihal label taxonomy (off by default)
- \`--project\` — also create a Project v2 board
- \`--yes\` — skip interactive confirmation
- \`--force-yolo\` — allow \`--yes\` to bypass confirmation in yolo mode
</flags>
`,

    'push-sprint.md': `---
name: rihal:push-sprint
description: Push one sprint's stories to GitHub as issues (linked to their parent epics)
argument-hint: <sprint-id>
allowed-tools:
  - Read
  - Bash
  - Glob
---

<objective>
Push a specific sprint's stories to GitHub as issues. Creates/reuses the phase milestone, creates any missing parent epic issues first, then creates the sprint's stories with parent-epic links in the body. Dry-run first, then confirmed execute.
</objective>

<process>

1. **Read sprint id from \$ARGUMENTS.** If missing, ask: "Which sprint? Format: sprint-01"

2. **Dry-run preview:**
   \`\`\`bash
   npx --yes github:hanzlahabib/rihal-code github-sync --sprint=\$ARGUMENTS
   \`\`\`
   Show the plan. Warn if any parent epic is missing from the sprint scope.

3. **Confirm with user.** If they say go, execute:
   \`\`\`bash
   npx --yes github:hanzlahabib/rihal-code github-sync --sprint=\$ARGUMENTS --execute
   \`\`\`
   Answer interactively at the "Proceed? Type 'yes' to continue" prompt.

4. **After execution:** report created issues and the phase milestone URL.

</process>

<guardrails>
- Default is dry-run. Execute only with explicit user confirmation.
- Labels are NOT created unless the user explicitly asks for them (add \`--with-labels\`).
- In yolo communication mode, STILL requires interactive confirmation for GitHub mutations unless the user adds \`--force-yolo\`.
- Never creates duplicate issues — the sync map at \`.rihal/integrations/github-map.json\` tracks what's already on GitHub.
</guardrails>
`,

    'push-epic.md': `---
name: rihal:push-epic
description: Push one epic (and its child stories) to GitHub as linked issues
argument-hint: <epic-id>
allowed-tools:
  - Read
  - Bash
  - Glob
---

<objective>
Push a specific epic to GitHub as an issue, along with all its child stories. Stories are linked back to the parent epic via both the story body ("Parent Epic: #N") and a task list in the epic body ("- [ ] #N"), so GitHub renders the progress counter.
</objective>

<process>

1. **Read epic id from \$ARGUMENTS.** If missing, ask: "Which epic? Format: epic-1-auth"

2. **Dry-run preview:**
   \`\`\`bash
   npx --yes github:hanzlahabib/rihal-code github-sync --epic=\$ARGUMENTS
   \`\`\`
   Shows the epic + its discovered child stories.

3. **Confirm with user.** On go:
   \`\`\`bash
   npx --yes github:hanzlahabib/rihal-code github-sync --epic=\$ARGUMENTS --execute
   \`\`\`

4. **After execution:** show the epic issue URL and the count of linked stories. Remind user that the task-list block in the epic body auto-updates as stories are closed.

</process>

<guardrails>
- Default is dry-run.
- Child stories are discovered by parsing story frontmatter (\`epic: epic-id\`) or by naming convention (\`story-N-...\` → \`epic-N-...\`).
- Labels off by default. Add \`--with-labels\` to opt in.
- In yolo mode, mutation still requires explicit confirmation unless \`--force-yolo\`.
</guardrails>
`,

    'push-story.md': `---
name: rihal:push-story
description: Push a single story to GitHub as an issue linked to its parent epic
argument-hint: <story-id>
allowed-tools:
  - Read
  - Bash
  - Glob
---

<objective>
Push exactly one story to GitHub as an issue. If its parent epic hasn't been synced yet, creates the parent epic first so the link is valid. Otherwise reuses the existing parent epic issue number from the sync map.
</objective>

<process>

1. **Read story id from \$ARGUMENTS.** If missing, ask: "Which story? Format: story-1-1-login"

2. **Dry-run preview:**
   \`\`\`bash
   npx --yes github:hanzlahabib/rihal-code github-sync --story=\$ARGUMENTS
   \`\`\`

3. **Confirm with user.** On go:
   \`\`\`bash
   npx --yes github:hanzlahabib/rihal-code github-sync --story=\$ARGUMENTS --execute
   \`\`\`

4. **After execution:** show the story issue URL and confirm the parent epic link.

</process>

<guardrails>
- Default is dry-run.
- If the parent epic is not yet on GitHub, it's created first (and shows up in the plan preview).
- Labels off by default.
- In yolo mode, explicit confirmation still required for GitHub mutations.
</guardrails>
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
- \`/rihal:init\` — scan existing codebase, write brief, populate memory bank
- \`/rihal:kickoff\` — start a new phase (strategy + stack + sprint plan + design baseline)
- \`/rihal:continue\` — read state, suggest the most efficient next step (context-lean)
- \`/rihal:generate-sprint <id>\` — generate epics + stories for one sprint (fresh-context safe)
- \`/rihal:pause\` — snapshot current work to HANDOFF.json for later resume
- \`/rihal:resume\` — read HANDOFF.json and re-enter the same context
- \`/rihal:save-session\` — write permanent searchable session log (decisions, learnings, pending)
- \`/rihal:preserve <section> <learning>\` — add to permanent memory with auto-archive
- \`/rihal:progress\` — situational awareness + route to next action
- \`/rihal:next\` — automatically advance to the next logical step
- \`/rihal:status\` — concise project status
- \`/rihal:discuss <topic>\` — structured discussion before committing
- \`/rihal:dispatch <request>\` — generic routing via Raees
- \`/rihal:quick <task>\` — execute a small task with atomic commit
- \`/rihal:fix <issue>\` — systematic debugging
- \`/rihal:bug <description>\` — capture a mid-sprint bug without derailing current work
- \`/rihal:bugs\` — list pending bugs (filters: --severity, --area, --sprint)
- \`/rihal:bug-resolve <bug-id>\` — mark a bug resolved and move to done/

**GitHub Integration:**
- \`/rihal:push-sprint <sprint-id>\` — push one sprint's stories to GitHub (linked to parent epics)
- \`/rihal:push-epic <epic-id>\` — push one epic + child stories (with task-list linking)
- \`/rihal:push-story <story-id>\` — push a single story (creates parent epic if missing)
- \`/rihal:github-sync\` — full sync with granular \`--sprint\` / \`--epic\` / \`--story\` flags

**Utility Commands:**
- \`/rihal:team\` — list the team roster
- \`/rihal:dashboard\` — start the Diwan view-only dashboard
- \`/rihal:help\` — this message

**Milestones and state** (CLI-only, invoke from your terminal):
- \`rihal-code milestone\` — list/show/create/activate/close/link milestones (shippable groupings)
- \`rihal-code sprint\` — per-sprint story queue, status mutations
- \`rihal-code bug\` — mid-sprint bug intake linked to active sprint
- \`rihal-code context\` — memory bank freshness check

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
 * preferences for THIS project. All three questions are skippable
 * (Enter → keeps the shown default).
 *
 * The wizard is project-scoped by design. Answers are written to
 * {cwd}/.rihal/config.json only. If the user wants global defaults,
 * they set them explicitly with `rihal-code config --global <key> <value>`.
 *
 * Defaults cascade: user-level ~/.rihal-code/defaults.json → hardcoded.
 * If the user has previously set globals, those show as the default
 * values in the prompt and they can accept them by hitting Enter.
 */
async function runIdentityWizard(cwd) {
  const { askText } = require('./lib/prompts.cjs');
  const { loadUserDefaults, HARDCODED_DEFAULTS } = require('./lib/config.cjs');

  const user = loadUserDefaults();
  const currentUserName = user.user_name || HARDCODED_DEFAULTS.user_name;
  const currentLang =
    user.communication_language || HARDCODED_DEFAULTS.communication_language;
  const currentDocLang =
    user.document_output_language || HARDCODED_DEFAULTS.document_output_language;

  console.log(`\n📝 Quick setup for this project (press Enter to keep defaults)\n`);

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

  console.log();
  console.log(
    `   ℹ These answers are saved to .rihal/config.json for THIS project only.`,
  );
  console.log(
    `     To set global defaults once, use: rihal-code config --global user_name "Name"`,
  );
  console.log();

  return { user_name, communication_language, document_output_language };
}

module.exports = async function init(args, { packageRoot, packageJson }) {
  const { PromptAbortError } = require('./lib/prompts.cjs');
  try {
    return await runInstall(args, { packageRoot, packageJson });
  } catch (err) {
    if (err instanceof PromptAbortError) {
      console.log(`\n❌ Install cancelled — ${err.message}.`);
      process.exit(0);
    }
    throw err;
  }
};

async function runInstall(args, { packageRoot, packageJson }) {
  const cwd = process.cwd();
  const rihalDir = path.join(cwd, '.rihal');
  const opts = parseArgs(args);
  const packageVersion = packageJson?.version || '0.0.0';

  // ------ Existing-install detection ------
  // If .rihal/config.json exists with an installed_version, compare against
  // the current package version and branch: same → already installed,
  // different → offer update, missing → fresh install.
  const existingConfigPath = path.join(cwd, '.rihal/config.json');
  if (fs.existsSync(existingConfigPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(existingConfigPath, 'utf8'));
      const installedVersion = existing.installed_version;

      if (installedVersion === packageVersion) {
        console.log(`\n✓ Rihal Code ${packageVersion} is already installed in this directory.`);
        console.log(`\n   To refresh files anyway: rihal-code update`);
        console.log(`   To reconfigure:         rihal-code config`);
        console.log(`   To uninstall:           rihal-code uninstall`);
        console.log();
        return;
      }

      if (installedVersion && installedVersion !== packageVersion) {
        console.log(`\n📦 Rihal Code ${installedVersion} is already installed in this directory.`);
        console.log(`   Current package version: ${packageVersion}`);
        console.log();
        console.log(`   ➡ To update: rihal-code update`);
        console.log(`   ➡ To force reinstall: rihal-code uninstall && rihal-code install`);
        console.log();
        return;
      }

      // Config exists but no installed_version recorded — older install
      // from before this tracking was added. Fall through to normal install
      // and we'll write installed_version at the end.
      console.log(`\n⚠ Existing install detected without version info — proceeding to refresh.\n`);
    } catch {
      // Corrupted config — fall through to fresh install
    }
  }

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
  // hardcoded → ~/.rihal-code/defaults.json → wizard answers → installed_version.
  const { initProjectConfig } = require('./lib/config.cjs');
  const configCreated = initProjectConfig(cwd, {
    ...wizardAnswers,
    installed_version: packageVersion,
  });
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

// Exports for internal reuse (cli/update.js)
module.exports.installSkills = installSkills;
module.exports.installSlashCommands = installSlashCommands;
module.exports.installCursorRules = installCursorRules;
module.exports.installWindsurfRules = installWindsurfRules;
module.exports.installAntigravityAgents = installAntigravityAgents;
module.exports.installUniversalAgentsMd = installUniversalAgentsMd;
