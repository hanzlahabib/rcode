# new-project - step 03: Auto mode config (auto mode only)

This step file was split verbatim out of `workflows/new-project.md`. Any `@path` below is a plain path, not an auto-include: use the Read tool on each referenced file before acting on this step.

## 2a. Auto Mode Config (auto mode only)

**If auto mode:** Collect config settings upfront.

YOLO mode is implicit (auto = YOLO). Ask remaining config questions:

**Round 1 — Core settings (3 questions, no Mode question):**

```
AskUserQuestion([
  {
    header: "Granularity",
    question: "How finely should scope be sliced into phases?",
    multiSelect: false,
    options: [
      { label: "Coarse (Recommended)", description: "Fewer, broader phases (3-5 phases, 1-3 plans each)" },
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
])
```

**Round 2 — Workflow agents (same as Step 5):**

```
AskUserQuestion([
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
])
```

Update `.rcode/config.yaml` (created by `/rcode-install`) with auto-mode settings:

```bash
node .rcode/bin/rcode-tools.cjs config-set mode yolo
node .rcode/bin/rcode-tools.cjs config-set granularity "[selected]"
node .rcode/bin/rcode-tools.cjs config-set parallelization true
node .rcode/bin/rcode-tools.cjs config-set commit_docs true
node .rcode/bin/rcode-tools.cjs config-set model_profile balanced
node .rcode/bin/rcode-tools.cjs config-set workflow.research true
node .rcode/bin/rcode-tools.cjs config-set workflow.plan_check true
node .rcode/bin/rcode-tools.cjs config-set workflow.verifier true
node .rcode/bin/rcode-tools.cjs config-set workflow.nyquist_validation true
node .rcode/bin/rcode-tools.cjs config-set workflow.auto_advance true
node .rcode/bin/rcode-tools.cjs config-set workflow._auto_chain_active true
```

**If commit_docs = No:** Add `.planning/` to `.gitignore`.

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

Proceed to Step 4 (skip Steps 3 and 5).

Next: Read `.rcode/workflows/new-project/steps/04-deep-questioning.md` before starting it (skip it if its Read-when condition is false).
