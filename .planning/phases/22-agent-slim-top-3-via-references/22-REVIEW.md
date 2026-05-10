---
status: issues_found
phase: 22
critical: 1
high: 1
medium: 1
low: 0
generated: 2026-05-10T12:00:00Z
---

# Phase 22 Code Review — Agent Slim via @-include

## Pattern Check

The phase goal is correct in principle: extract static playbook content from
three heavy agent files into `rihal/references/` and replace with `@-include`
directives. The approach is consistent with how existing references are handled
in this repo (e.g. `response-style.md`, `karpathy-guidelines.md`).

All three agent stubs retain their YAML frontmatter intact (`name`, `description`,
`tools`, `color`). The retained inline content (`<role>`, `<core_principle>`,
`<inputs>`, `<why_this_matters>`, `<philosophy>`) is appropriate: this is
agent-identity content that should stay close to the agent definition. Extracting
only the procedural playbook content into references is the right split.

---

## Findings

### BLOCKER — @-include paths point to a directory that does not contain the new files

**Files:** All three agent stubs
- `rihal/agents/rihal-integration-checker.md:10`
  `@.rihal/references/integration-verification-playbook.md`
- `rihal/agents/rihal-research-synthesizer.md:10`
  `@.rihal/references/research-synthesis-playbook.md`
- `rihal/agents/rihal-codebase-mapper.md:11`
  `@.rihal/references/codebase-mapping-process.md`

**Why this is a blocker:** The `@-include` directive resolves relative to the
project root. The three new reference files were written to `rihal/references/`,
not `.rihal/references/`. Running `ls .rihal/references/` confirms the three
files are absent there. Every other `@-include` in the codebase consistently
uses `.rihal/references/` (verified across all agents: `rihal-waleed.md`,
`rihal-planner.md`, `rihal-verifier.md`, `rihal-omar.md`, etc.).

At runtime, all three playbook includes will silently fail to load — the agents
will execute without their procedural content. This negates the entire phase.

**Required fix:** Move (or copy) the three files into `.rihal/references/`:
- `rihal/references/integration-verification-playbook.md` → `.rihal/references/integration-verification-playbook.md`
- `rihal/references/research-synthesis-playbook.md` → `.rihal/references/research-synthesis-playbook.md`
- `rihal/references/codebase-mapping-process.md` → `.rihal/references/codebase-mapping-process.md`

If `rihal/references/` is intentional as a new parallel directory (separate
concern from `.rihal/references/`), then the agent stubs must be updated to
match. Either way, one side must change. The path convention used by all other
agents is `.rihal/references/` — that should be the canonical destination.

---

### HIGH — XML structural tags stripped from integration-checker reference without equivalent replacements

**File:** `rihal/references/integration-verification-playbook.md`

**Original:** `rihal/agents/rihal-integration-checker.md` (pre-phase, at commit
`cf374b5`) wrapped its procedural content in `<verification_process>…</verification_process>`,
output template in `<output>…</output>`, rules in `<critical_rules>…</critical_rules>`,
and checklist in `<success_criteria>…</success_criteria>`.

**Current reference file:** These XML wrappers are absent. The content is present
as flat markdown sections separated by `---` rules.

**Why this matters:** The agent definition still has `<role>`, `<core_principle>`,
and `<inputs>` as XML blocks. The injected reference content will arrive as
structurally different (flat markdown) and may be harder for the model to parse
as distinct behavioral sections. The risk is reduced model adherence to the
output format and success-criteria checklist, since those are no longer in a
named XML block that the agent definition primes the model to respect.

This is a degradation in structural consistency, not a content loss. Severity is
high rather than critical because the content is present and most models will
follow flat markdown instructions adequately.

**Required fix (judgment call for Waleed):** Either restore the XML wrappers in
the reference file, or remove the XML wrappers from the agent stub's retained
sections as well, making the entire agent definition consistently flat markdown.
Do not leave a mixed convention.

---

### MEDIUM — Unclosed code fence in `codebase-mapping-process.md:165`

**File:** `rihal/references/codebase-mapping-process.md:165`

The `return_confirmation` step opens a triple-backtick code fence at line 165
and never closes it. The `</step>` tag at line 174 is inside the open fence,
meaning a model parsing this file will treat the `</step>`, the `</output>` tag
at line 175, and any content that follows as code rather than instructions.

**Pre-existing status:** This defect existed in the source agent file at commit
`cf374b5` (line 238 of the original `rihal-codebase-mapper.md`). Phase 22
faithfully extracted it — it was not introduced here.

**Required fix:** Add a closing ` ``` ` after the "Read only when the current
task needs the detail." line, before `</step>`. This is a pre-existing bug that
Phase 22 could have fixed during extraction but did not.

---

## Test Coverage

No automated test coverage for `@-include` path resolution exists in this repo.
The path mismatch (Finding 1) would only surface at agent runtime. A simple
shell check would catch this class of regression:

```bash
# Verify all @-include paths resolve to actual files
grep -rh "^@" rihal/agents/ | sed 's/^@//' | while read path; do
  [ -f "$path" ] || echo "MISSING: $path"
done
```

This check does not exist. Recommend adding it to the compliance check block
in `CLAUDE.md` alongside the existing skill compliance checks.

---

## Maintainability Notes

The reference files carry correct attribution headers ("Loaded by X via
`@-include`"). This is good — a future reader knows why the file exists and
which agent consumes it.

The content fidelity across all three reference files is high. Comparing
pre-phase agent bodies against the reference files: the six-step integration
process, eight-step synthesis process, and four-step mapping process are all
fully present with no truncation.

---

## Required Fixes

1. **Move the three reference files to `.rihal/references/`** (or update all
   three agent stubs to `@rihal/references/` — but `.rihal/references/` is the
   established convention). This unblocks runtime use.
2. **Resolve XML structural inconsistency** in `integration-verification-playbook.md`
   — either restore tags in the reference or strip them from the agent stub.
   Route decision to Waleed if uncertain.
3. **Close the code fence** at `codebase-mapping-process.md:165` — add ` ``` `
   before `</step>`.

---

## Optional Improvements

- Add a `@-include` path-resolution check to the existing compliance shell block
  in `CLAUDE.md` to catch this class of path mismatch in future phases.
