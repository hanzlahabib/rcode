# Universal Anti-Patterns

Patterns that show up across every Rihal project. When a planning workflow surfaces these, halt and discuss before proceeding — they're cheap to fix during planning, expensive to fix after execution.

## Scope anti-patterns

### "While we're at it…"
Phase plan picks up scope adjacent to the actual goal. Symptom: phase description starts with the real goal but acceptance criteria reference 3 unrelated files. Fix: spin the side-scope into its own phase, even if it's a 1-day phase. Linear roadmaps are easier to verify than tangled ones.

### Implicit prerequisites
Phase assumes another phase has shipped without declaring the dependency. Symptom: plan refers to a file or table that doesn't exist yet. Fix: surface the dependency in the phase's `Depends on` line in ROADMAP.md.

### Vague acceptance
Acceptance criterion is "users can do X" with no measurable threshold. Fix: make every acceptance criterion observable from outside the system — a CLI command, an API response, a log line, a UI assertion.

## Estimation anti-patterns

### Round-number capacity
Sprint commits to "30 points this week" because that's what last week was. No data-backed velocity. Fix: use 80% of the trailing 3-sprint average, never a round number.

### Hidden multitasking
Phase plan assumes the dev works on it full-time when in reality they're also on-call, in interviews, and at standups. Fix: explicit `effective_dev_hours` field in sprint capacity.

## Decision anti-patterns

### Reversible vs irreversible confusion
Treating reversible decisions (CSS framework choice) like irreversible ones (database engine), and vice versa. Fix: tag every recorded decision with `reversibility: reversible | one-way | nuanced`.

### Council asked, council ignored
Council session produces a clear recommendation, the team builds the rejected option anyway. Fix: if you reject a council recommendation, explicitly log the override in `state.decisions[]` with `override_council: <session-id>` so the disagreement is searchable later.

## Implementation anti-patterns

### Defensive code for impossible states
Adding null checks, fallbacks, and validation for inputs that can never occur in this code path. Fix: trust internal contracts. Validate at system boundaries (user input, network, FS), not internally.

### "Just in case" abstractions
Building a generic helper because someday three callers might need it, when right now there's one. Fix: three concrete callers first, then extract.

### Comments that explain what
"// increment counter by 1" — the code says that. Fix: comments only for *why* (hidden constraint, surprising behaviour, workaround for specific bug, invariant that's not obvious from reading).

### Silent failures
`try { ... } catch { /* ignore */ }`. Fix: every catch block has either a logged warning, a metric increment, or a re-throw. Never bare empty catches.

## Process anti-patterns

### Half-merged migrations
Old code path and new code path both running in production "for safety". Fix: complete migrations within one phase. Both paths existing forever doubles the maintenance burden.

### Documentation that ages out silently
README written once, never updated. Code drifts. README lies. Fix: documentation that references specific files / functions includes a sentinel marker; CI fails if the docs reference paths that no longer exist.

### "We'll fix it in v2"
Known broken behaviour that ships anyway because the deadline. Fix: the phase doesn't ship if known-broken behaviour reaches users. Cut the broken feature, don't ship it broken.

---

When a phase plan or sprint hits any of these patterns during discussion, halt. Surface it explicitly. Adjust before execution starts. The cost compounds.
