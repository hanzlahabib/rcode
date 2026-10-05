# new-project - step 06: Workflow preferences, sub-repo detection, model profile resolution

This step file was split verbatim out of `workflows/new-project.md`. Any `@path` below is a plain path, not an auto-include: use the Read tool on each referenced file before acting on this step.

## 5. Workflow Preferences

**If auto mode:** Skip — config was collected in Step 2a. Proceed to Step 5.5.

**Check for global defaults** at `~/.rcode/defaults.json`. If the file exists, offer to use saved defaults:

```
AskUserQuestion([
  {
    question: "Use your saved default settings? (from ~/.rcode/defaults.json)",
    header: "Defaults",
    multiSelect: false,
    options: [
      { label: "Yes (Recommended)", description: "Use saved defaults, skip settings questions" },
      { label: "No", description: "Configure settings manually" }
    ]
  }
])
```

If "Yes": read `~/.rcode/defaults.json`, use those values for config.json, skip to **Commit config.json** below.

If "No" or file doesn't exist: proceed with the questions below.

**Round 1 — Core workflow settings (4 questions):**

```
questions: [
  {
    header: "Mode",
    question: "How do you want to work?",
    multiSelect: false,
    options: [
      { label: "YOLO (Recommended)", description: "Auto-approve, just execute" },
      { label: "Interactive", description: "Confirm at each step" }
    ]
  },
  {
    header: "Granularity",
    question: "How finely should scope be sliced into phases?",
    multiSelect: false,
    options: [
      { label: "Coarse", description: "Fewer, broader phases (3-5 phases, 1-3 plans each)" },
      { label: "Standard", description: "Balanced phase size (5-8 phases, 3-5 plans each)" },
      { label: "Fine", description: "Many focused phases (8-12 phases, 5-10 plans each)" }
    ]
  },
  {
    header: "Execution",
    question: "Run plans in parallel?",
    multiSelect: false,
    options: [
      { label: "Parallel (Recommended)", description: "Independent plans run simultaneously" },
      { label: "Sequential", description: "One plan at a time" }
    ]
  },
  {
    header: "Git Tracking",
    question: "Commit planning docs to git?",
    multiSelect: false,
    options: [
      { label: "Yes (Recommended)", description: "Planning docs tracked in version control" },
      { label: "No", description: "Keep .planning/ local-only (add to .gitignore)" }
    ]
  }
]
```

**Round 2 — Workflow agents:**

These spawn additional agents during planning/execution. They add tokens and time but improve quality.

| Agent | When it runs | What it does |
|-------|--------------|--------------|
| **Researcher** | Before planning each phase | Investigates domain, finds patterns, surfaces gotchas |
| **Plan Checker** | After plan is created | Verifies plan actually achieves the phase goal |
| **Verifier** | After phase execution | Confirms must-haves were delivered |

```
questions: [
  {
    header: "Research",
    question: "Research before planning each phase? (adds tokens/time)",
    multiSelect: false,
    options: [
      { label: "Yes (Recommended)", description: "Investigate domain, find patterns, surface gotchas" },
      { label: "No", description: "Plan directly from requirements" }
    ]
  },
  {
    header: "Plan Check",
    question: "Verify plans will achieve their goals? (adds tokens/time)",
    multiSelect: false,
    options: [
      { label: "Yes (Recommended)", description: "Catch gaps before execution starts" },
      { label: "No", description: "Execute plans without verification" }
    ]
  },
  {
    header: "Verifier",
    question: "Verify work satisfies requirements after each phase? (adds tokens/time)",
    multiSelect: false,
    options: [
      { label: "Yes (Recommended)", description: "Confirm deliverables match phase goals" },
      { label: "No", description: "Trust execution, skip verification" }
    ]
  },
  {
    header: "AI Models",
    question: "Which AI models for planning agents?",
    multiSelect: false,
    options: [
      { label: "Balanced (Recommended)", description: "Sonnet for most agents — good quality/cost ratio" },
      { label: "Quality", description: "Opus for research/roadmap — higher cost, deeper analysis" },
      { label: "Budget", description: "Haiku where possible — fastest, lowest cost" },
      { label: "Inherit", description: "Use the current session model for all agents" }
    ]
  }
]
```

Update `.rcode/config.yaml` (created by `/rcode-install`) with collected settings:

```bash
node .rcode/bin/rcode-tools.cjs config-set mode "[yolo|interactive]"
node .rcode/bin/rcode-tools.cjs config-set granularity "[selected]"
node .rcode/bin/rcode-tools.cjs config-set parallelization true
node .rcode/bin/rcode-tools.cjs config-set commit_docs true
node .rcode/bin/rcode-tools.cjs config-set model_profile "[quality|balanced|budget|inherit]"
node .rcode/bin/rcode-tools.cjs config-set workflow.research true
node .rcode/bin/rcode-tools.cjs config-set workflow.plan_check true
node .rcode/bin/rcode-tools.cjs config-set workflow.verifier true
node .rcode/bin/rcode-tools.cjs config-set workflow.nyquist_validation true
```

**Note:** Run `/rcode-settings` anytime to update model profile, workflow agents, branching strategy, and other preferences.

**If commit_docs = No:**

- Set `commit_docs: false` via `node .rcode/bin/rcode-tools.cjs config-set commit_docs false`
- Add `.planning/` to `.gitignore` (create if needed)

**Commit config update (guarded):**

```bash
if git check-ignore -q .rcode/config.yaml 2>/dev/null; then
  echo "ℹ .rcode/ gitignored — config updated, not committed"
else
  git add .rcode/config.yaml \
    && git commit -m "chore: configure project for rcode" 2>/dev/null \
    || echo "ℹ config updated; commit skipped (not a git repo or no change)"
fi
```

## 5.1. Sub-Repo Detection

**Detect multi-repo workspace:**

```bash
find . -maxdepth 1 -type d -not -name ".*" -not -name "node_modules" -exec test -d "{}/.git" \; -print
```

**If sub-repos found:**

Strip the `./` prefix (e.g., `./backend` → `backend`).

Use AskUserQuestion:

- header: "Multi-Repo Workspace"
- question: "I detected separate git repos in this workspace. Which directories contain code that rcode should commit to?"
- multiSelect: true
- options: one option per detected directory

**If user selects one or more directories:**

- Set `planning.sub_repos` in config.json to the selected directory names array
- Auto-set `planning.commit_docs` to `false` (planning docs stay local in multi-repo workspaces)
- Add `.planning/` to `.gitignore` if not already present

**If no sub-repos found or user selects none:** Continue with no changes to config.

## 5.5. Resolve Model Profile

Use models resolved in Step 1: `RESEARCHER_MODEL`, `SYNTHESIZER_MODEL`, `ROADMAPPER_MODEL`.


@rcode/workflows/new-project-research-decision.md



@rcode/workflows/new-project-define-requirements.md



@rcode/workflows/new-project-create-roadmap.md

Next: Read `.rcode/workflows/new-project/steps/07-done.md` before starting it (skip it if its Read-when condition is false).
