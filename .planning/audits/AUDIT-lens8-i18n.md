# Audit: Lens 8 — i18n / User-Facing String Brand Leaks

**Branch:** audit-lens-8-i18n  
**Date:** 2026-05-24  
**Auditor:** lens-8-i18n (rihal-i18n-auditor)  
**Status:** WARN  
**Prior classification source:** `audit/11-migration-gaps.md`

---

## Scope Scanned

| Area | Paths Covered |
|---|---|
| Workflow docs | `.rcode/workflows/*.md` (~100 files) |
| Reference docs | `.rcode/references/*.md` (~20 files) |
| Skills / agents | `.rcode/skills/**/*.md` (all agent SKILL.md files) |
| CLI source | `cli/tiers.js`, `package.json` |
| Public docs | `README.md`, `DOCS.md`, `docs/USP.md` |
| Templates | `rcode/templates/*.md`, `.rcode/templates/**/*.md` |
| Config | `rcode/config.yaml`, `.rcode/JOURNEY.md` |

Excluded: `node_modules/`, `.git/`, `CHANGELOG.md`, `ATTRIBUTION.md`, `audit/`, `.planning/milestones/` (frozen history).

---

## Commands Run

```bash
# Full rihal brand sweeps
grep -rn "Rihalian|Rihalians" --include="*.md" -r .
grep -rn "\bRihal\b" --include="*.md" --include="*.yaml" --include="*.js" .
grep -rn "AskUserQuestion" --include="*.md" . | grep -i "rihal"
grep -rn "Rihal_" --include="*.md" .rcode/workflows/
grep -rn "/rihal-code\b" --include="*.md" .
grep -rn "/tmp/rihal-review" --include="*.md" .rcode/workflows/
grep -rn "رحال|رحّال" --include="*.md" --include="*.yaml" .
cat package.json | grep -A10 '"bin"'   # verified binary names
```

---

## Classification Framework

| Label | Meaning |
|---|---|
| **INTENTIONAL** | Company-name attribution (Rihal the Omani company), Arabic etymology terms, `/rihal-*` slash command names, agent persona names (Sadiq, Mariam, etc. at Rihal), backward-compat bin lookup |
| **GAP** | Stale body copy where the tool name (rcode) should appear instead of the brand (Rihal), user-visible env var names, nonexistent command references |

---

## Findings

### A. AskUserQuestion Prompts

| File | Line | Current text | Classification | Severity |
|---|---|---|---|---|
| `.rcode/references/auto-init-guard.md` | 22 | `Rihal isn't configured for this project yet.` | **GAP** — printed verbatim to user as onboarding message; tool is now rcode | warn |
| `.rcode/references/auto-init-guard.md` | 53 | `Your name (what Rihal calls you)` | **GAP** — appears in AskUserQuestion config table shown to user at first run | warn |
| `.rcode/references/auto-init-guard.md` | 55 | `Mode (how Rihal handles decision gates)` | **GAP** — same AskUserQuestion config table | warn |
| `.rcode/references/auto-init-guard.md` | 100 | `✓ Rihal configured for this project.` | **GAP** — success banner printed after first-run setup | warn |

**Verification:** Read full file. Lines 22, 53, 55, and 100 are inside literal output blocks (backtick fences and table cells) that the workflow agent prints directly to the user. These are the first strings a new user sees during init.

---

### B. Banner / Echo Lines in Workflow Output

| File | Line | Current text | Classification | Severity |
|---|---|---|---|---|
| `.rcode/workflows/execute-regression-gates.md` | 91 | `⚠ Schema drift detected but Rihal_SKIP_SCHEMA_CHECK=true — bypassing gate.` | **GAP** — user-visible warning banner containing old brand prefix in env var name | warn |
| `.rcode/workflows/execute-regression-gates.md` | 119 | `Skip schema check (Rihal_SKIP_SCHEMA_CHECK=true) — bypass this gate` | **GAP** — user-visible menu option; user must type `Rihal_SKIP_SCHEMA_CHECK=true` | warn |
| `.rcode/workflows/review.md` | 138, 146, 151, 156, 164, 169–171 | `/tmp/rihal-review-prompt-{phase}.md`, `/tmp/rihal-review-gemini-{phase}.md`, etc. (8 occurrences) | **GAP** — temp file paths containing old brand; visible in shell output | info |

**Verification:**
- `execute-regression-gates.md` line 91: in a fenced code block output block. Line 119: in a numbered menu list shown to user. Both cases the `Rihal_SKIP_SCHEMA_CHECK` env var name is printed and must be typed by the user.
- `review.md`: searched for `/tmp/rihal-review` — 8 hits. These are shell commands the workflow runs and the paths appear in terminal output.

---

### C. Command References with "Rihal" in Body Text

| File | Line | Current text | Classification | Severity |
|---|---|---|---|---|
| `.rcode/workflows/dev-story.md` | 338, 387, 401, 409 | `/rihal-code .planning/dev-sessions/{story-id}-dev-prompt.md` and `Next: /rihal-code {path}` | **GAP** — references a binary named `rihal-code` that does not exist; `package.json` only ships `rcode` bin | critical |
| `.rcode/workflows/execute.md` | 659 | `Run /rihal-code-review-fix first` | **INTENTIONAL** — `/rihal-code-review-fix` is a valid slash command name (backward-compat preserved) | — |
| `.rcode/workflows/plan-research-validation.md` | 246 | `` `Run /rihal-ui-phase {N} ${Rihal_WS}` `` | **GAP** — `${Rihal_WS}` is a user-visible variable name with stale brand prefix (also see area D) | warn |
| `.rcode/references/auto-init-guard.md` | (all) | Variable `GLOBAL_RIHAL` used internally in bash block | **GAP** — internal var name with old brand; minor since not printed to user, but inconsistent | info |
| `.rcode/workflows/karpathy-guidelines-full.md` (inside `.rcode/references/`) | 17, 68 | `Rihal application:` labels | **INTENTIONAL** — internal annotation for agent-internal reference docs, not user output | — |

**Verification for `/rihal-code` in dev-story:**
- `package.json` bin section: only `"rcode": "dist/rcode.js"` — no `rihal-code` binary.
- `ls rcode/commands/` shows no `rihal-code.md` command file.
- dev-story.md lines 338/387/401/409 show this as a user-facing next-step command they should run. The command does not exist.

---

### D. Rihal_WS Shell Variable (User-Visible Workspace Flag)

| File | Occurrences | Current text example | Classification | Severity |
|---|---|---|---|---|
| 8 workflow files (`.rcode/workflows/`) | 90 total | `${Rihal_WS}`, e.g. `/rihal-execute {phase} ${Rihal_WS}` | **GAP** — user-visible in command suggestions printed after each workflow step | warn |

Affected workflows:
- `.rcode/workflows/execute.md`
- `.rcode/workflows/resume-work.md`
- `.rcode/workflows/discuss-phase.md`
- `.rcode/workflows/validate-phase.md`
- `.rcode/workflows/plan-research-validation.md`
- `.rcode/workflows/plan.md`
- `.rcode/workflows/execute-verify-phase-goal.md`
- `.rcode/workflows/execute-regression-gates.md`

**Verification:** `grep -rln "Rihal_" --include="*.md" .rcode/workflows/` → 8 files; `grep -rn "Rihal_WS" --include="*.md" . | wc -l` → 90 occurrences. These variables appear in output-block command suggestions that the user copies and runs, e.g.:

```
/rihal-execute {phase} ${Rihal_WS}
```

`Rihal_WS` is the old brand prefix. Should be `RCODE_WS` or `rcode_WS`.

---

### E. Arabic / RTL Strings

| File | Line | Current text | Classification | Severity |
|---|---|---|---|---|
| `README.md` | 3 | `<div dir="rtl">طريقة رحال</div>` | **INTENTIONAL** — `رحال` is the Arabic etymology word for the tool name, explained at line 163 | — |
| `README.md` | 163 | `رحّال (Rihāl) means "traveler" in Arabic` | **INTENTIONAL** — etymology explanation preserved by design; noted in CHANGELOG.md line 19 | — |
| `rcode/config.yaml` | 4 | `arabic_name: طريقة رحال` | **INTENTIONAL** — Arabic name for the methodology; `رحال` is the tool's Arabic name | — |
| `.rcode/JOURNEY.md` | 1 | HTML comment explaining `رحّال` vs `رحلة` | **INTENTIONAL** — etymology disambiguation note; explicitly preserved per `init.md:167` | — |
| `.rcode/workflows/init.md` | 167 | `rcode (رحّال) = the traveler/tool` | **INTENTIONAL** — developer-facing naming note; explicitly labeled "do NOT remove" | — |

**Verification:** All Arabic strings are `رحال` (traveler) not a product branding error. CHANGELOG.md line 19 explicitly lists `رحّال / طريقة رحال` as intentionally preserved. No Arabic strings found that say the old company brand ("ريحل" / "Rihal" in Arabic script) as a product name.

---

### F. Agent Persona Files (Rihal as Company Attribution)

| File group | Classification | Severity |
|---|---|---|
| `.rcode/skills/agents/*/SKILL.md` — "This skill embodies X, Rihal's Y" (~12 files) | **INTENTIONAL** — agents are fictional personas employed at Rihal the Omani company; this is the design | — |
| `.rcode/references/agent-shared-rules.md:1` — "every Rihal persona" | **INTENTIONAL** — internal agent-facing reference, not user output | — |
| `.rcode/references/commit-conventions.md:117` — "When a Rihal workflow creates a commit" | **INTENTIONAL** — internal reference doc | — |
| `.rcode/references/dispatch-banner.md:3,5` — "every time a Rihal workflow spawns a sub-agent" | **INTENTIONAL** — internal reference doc | — |
| `docs/USP.md:198` — "encoded from incidents on real Rihal projects" | **INTENTIONAL** — factual attribution to origin company | — |

**Note on `response-style.md:29`:** The instruction `Do not drop "Rihal's 2,441% growth / 270 employees / Series A"` is agent-facing guidance (not user output) telling agents NOT to company-promote. This is intentional and correct as written — removing `Rihal` here would break the instruction.

---

## Items Previously Fixed (Verified)

| Item | Prior Gap (audit/11) | Current State |
|---|---|---|
| `cli/tiers.js:15` | "First-time Rihalian." | Fixed: "First-time rcode user." ✓ |
| `rcode/brain/README.md` | "Rihalians", "every Rihalian benefits" | Fixed: no Rihalian strings found ✓ |
| `rcode/brain/sources.yaml` | "Rihalian's AI" | Fixed: no Rihalian strings found ✓ |
| `rcode/skills/actions/4-implementation/rcode-scaffold-project/SKILL.md` | "Rihalian project" | Fixed: no Rihalian strings found ✓ |
| `.rcode/workflows/docs-update.md` | Title "rihal-docs-update" | Fixed: title now "rcode-docs-update" ✓ |
| `.rcode/workflows/workstream.md` | Title/desc referenced "Rihal" as tool name | Fixed: now references rcode ✓ |
| `.rcode/workflows/update.md` | Banner "✓ rihal-code is up to date" | Fixed: banner now "✓ rcode is up to date" ✓ |

---

## Summary Table

| # | File | Line(s) | Issue | Classification | Severity |
|---|---|---|---|---|---|
| 1 | `.rcode/references/auto-init-guard.md` | 22 | User banner: "Rihal isn't configured for this project yet." | GAP | warn |
| 2 | `.rcode/references/auto-init-guard.md` | 53 | AskUserQuestion prompt: "what Rihal calls you" | GAP | warn |
| 3 | `.rcode/references/auto-init-guard.md` | 55 | AskUserQuestion prompt: "how Rihal handles decision gates" | GAP | warn |
| 4 | `.rcode/references/auto-init-guard.md` | 100 | Success banner: "✓ Rihal configured for this project." | GAP | warn |
| 5 | `.rcode/workflows/execute-regression-gates.md` | 84, 91, 119 | Env var `Rihal_SKIP_SCHEMA_CHECK` in user-visible menu & warning | GAP | warn |
| 6 | `.rcode/workflows/review.md` | 138–171 | `/tmp/rihal-review-*` temp file paths in shell output (8 refs) | GAP | info |
| 7 | `.rcode/workflows/dev-story.md` | 338, 387, 401, 409 | `/rihal-code` referenced as runnable command; binary does not exist | GAP | critical |
| 8 | 8 workflow files | ~90 occurrences | `${Rihal_WS}` variable name in user-facing command suggestions | GAP | warn |

---

## Status: WARN

**Critical (1):** The `/rihal-code` binary reference in `dev-story.md` — it points to a non-existent binary. Users who follow the "Running This Story" or "Step 6" instructions will get `command not found`. The correct command is `rcode` (per `package.json` bin field).

**Warn (6 items):** `auto-init-guard.md` user-facing prompts (4), `Rihal_SKIP_SCHEMA_CHECK` env var shown to users (1), `${Rihal_WS}` in 90 command suggestions across 8 workflows (1 pattern).

**Info (1):** `/tmp/rihal-review-*` temp file prefix in `review.md` — not user-blocking but cosmetically inconsistent.

**No Arabic/RTL gaps found.** All Arabic strings are intentional etymology (رحّال = traveler), explicitly preserved per `CHANGELOG.md:19` and `init.md:167`.

**No AskUserQuestion body text gaps found** beyond the `auto-init-guard.md` table entries already captured above.

---

## Suggested Fixes (ordered by severity)

1. **Critical — `dev-story.md`:** Replace `/rihal-code` with `rcode` at lines 338, 387, 401, 409.
2. **Warn — `auto-init-guard.md`:** Replace `Rihal` with `rcode` in lines 22, 53, 55, 100.
3. **Warn — `execute-regression-gates.md`:** Rename `Rihal_SKIP_SCHEMA_CHECK` → `RCODE_SKIP_SCHEMA_CHECK` at lines 84, 91, 119.
4. **Warn — all 8 workflow files:** Rename `${Rihal_WS}` → `${RCODE_WS}` throughout (90 occurrences). This is a bulk-replace — also update wherever `Rihal_WS` is set/exported.
5. **Info — `review.md`:** Rename `/tmp/rihal-review-*` → `/tmp/rcode-review-*` (8 occurrences).
