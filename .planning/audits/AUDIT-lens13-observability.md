# AUDIT — Lens 13: Observability (rihal residue)

**Branch:** audit-lens-13-observability  
**Date:** 2026-05-24  
**Status:** FAIL  
**Auditor:** lens-13-observability agent (audit-only, no source edits)

---

## Scope Scanned

Lens 13 targets four observability-class rihal residue patterns:

| Target | Description |
|--------|-------------|
| (a) rihal-tools call sites | `$(rihal-tools ...)` or `node rihal-tools.cjs` where binary is now `rcode-tools.cjs` |
| (b) Silent rihal-* failures | `2>/dev/null` on `rihal-*` commands with no `\|\|` fallback |
| (c) Task() rihal- subagent_type | `Task(subagent_type="rihal-...")` where agents are now `rcode-*` |
| (d) console.log rihal branding | `console.log`/`console.error` calls with `rihal` brand prefix in source |

**Directories scanned:** `.rcode/`, `rcode/`, `cli/`, `server/`, `scripts/`, `.github/`, root config files  
**Excluded:** `audit/` (prior audit outputs), `node_modules/`, CHANGELOG.md (historical record)

---

## Commands Run

```bash
grep -rn 'rihal-tools' --include='*.cjs,*.js,*.sh,*.md,*.yaml,*.yml,*.json' . | grep -v node_modules | grep -v '^./audit/'
grep -rn 'rihal-tools' .rcode/ rcode/
grep -rn '2>/dev/null' .rcode/ | grep -i 'rihal'
grep -rn 'subagent_type.*rihal-' .rcode/ rcode/
grep -rn "console\.(log|error|warn).*rihal" cli/ server/ rcode/ scripts/
grep -rn 'rihal-' .rcode/workflows/
find .rcode/skills/actions -path "*rihal-*" 2>/dev/null
find rcode/skills/actions -name "workflow.md" | grep -E 'create-architecture|scaffold-project|validate-prd|create-prd|retrospective|edit-prd'
sed -n '621,628p' rcode/bin/rcode-tools.cjs   # AGENT_ID_ALIASES
sed -n '627,650p' rcode/bin/rcode-tools.cjs   # resolveAgentId
```

---

## Findings

### Critical

| File | Line | Description | Severity |
|------|------|-------------|----------|
| `.rcode/workflows/verify-work.md` | 53 | `agent-skills rihal-checker 2>/dev/null` — `rihal-checker` is not a known alias; `resolveAgentId` only strips `rcode-` prefix, not `rihal-`; tool exits 1 silently; `AGENT_SKILLS_CHECKER` becomes empty string; subagent spawned at line 565 gets no checker config | **critical** |
| `.rcode/workflows/discuss-phase.md` | 155 | `agent-skills rihal-advisor 2>/dev/null` — same resolution failure; `AGENT_SKILLS_ADVISOR` becomes empty; advisor subagent at line 577 gets no model/skill configuration | **critical** |
| `.rcode/workflows/research-phase.md` | 47 | `agent-skills rihal-researcher 2>/dev/null` — same resolution failure; `AGENT_SKILLS_RESEARCHER` becomes empty; researcher subagent at line 64 gets no configuration | **critical** |
| `.rcode/skills/rihal-code-review/steps/step-02-review.md` | 23 | `Task(subagent_type="rihal-security-adversary", ...)` — agent is now registered as `rcode-security-adversary` (in `rcode/agents/`); `rihal-security-adversary` is only a Cursor MDC file, not a Claude Code subagent; Task() dispatch will silently fail (no such subagent type in CC registry) | **critical** |
| `.rcode/skills/rihal-code-review/steps/step-02-review.md` | 26 | `Task(subagent_type="rihal-edge-case-hunter", ...)` — same; agent is `rcode-edge-case-hunter` in `rcode/agents/`; the `rihal-` type is not registered in `.claude/agents/` (which doesn't exist) | **critical** |

### Warning

| File | Line | Description | Severity |
|------|------|-------------|----------|
| `.rcode/workflows/create-architecture.md` | 12 | `find .rcode/skills/actions -path "*rihal-create-architecture/workflow.md"` — double mismatch: (1) dir `.rcode/skills/actions/` does not exist; (2) skill was renamed to `rcode-create-architecture` in `rcode/skills/actions/3-solutioning/`; find returns empty; fallback error tells user to reinstall when skill exists at wrong path | **warn** |
| `.rcode/workflows/validate-prd.md` | 12 | `find .rcode/skills/actions -path "*rihal-validate-prd/workflow.md"` — same double mismatch; skill lives at `rcode/skills/actions/2-plan/rcode-validate-prd/workflow.md` | **warn** |
| `.rcode/workflows/create-prd.md` | 12 | `find .rcode/skills/actions -path "*rihal-create-prd/workflow.md"` — same; skill at `rcode/skills/actions/2-plan/rcode-create-prd/workflow.md` | **warn** |
| `.rcode/workflows/edit-prd.md` | 12 | `find .rcode/skills/actions -path "*rihal-edit-prd/workflow.md"` — same; skill at `rcode/skills/actions/2-plan/rcode-edit-prd/workflow.md` | **warn** |
| `.rcode/workflows/scaffold-project.md` | 12 | `find .rcode/skills/actions -path "*rihal-scaffold-project/workflow.md"` — same; skill at `rcode/skills/actions/4-implementation/rcode-scaffold-project/` | **warn** |
| `.rcode/workflows/retrospective.md` | 12 | `find .rcode/skills/actions -path "*rihal-retrospective/workflow.md"` — same; skill at `rcode/skills/actions/4-implementation/rcode-retrospective/workflow.md` | **warn** |
| `.rcode/skills/rihal-code-review/steps/step-02-review.md` | 28 | `Dispatch via rihal-code-reviewer` (inline text, no Task() call) — stale name; correct agent is `rcode-code-reviewer` | **warn** |
| `.github/workflows/semantic.yaml` | 94 | `rihal-tools` retained as valid commit scope alongside `rcode-tools` — accepted as intentional backward-compat per `audit/16-rihal-docs-tests.md` and `CONTRIBUTING.md:342`, but actively instructs CI to accept old scope name indefinitely | **warn** |
| `.rcode/workflows/review.md` | 138,146,151,156,164,169 | Temp files named `/tmp/rihal-review-prompt-{phase}.md`, `/tmp/rihal-review-gemini-{phase}.md`, etc. — brand residue in tmp file names; not a functional failure (underlying commands are `gemini`, `claude`, `codex`) but inconsistent with rcode brand | **warn** |

### Info

| File | Line | Description | Severity |
|------|------|-------------|----------|
| `AGENTS.md` | 27 | `rihal-tools` in scope list — intentional backward-compat per prior audit classification | **info** |
| `CLAUDE.md` | 27 | `rihal-tools` in scope list — same | **info** |
| `CONTRIBUTING.md` | 342 | Documents `rihal-tools` as legacy scope — already flagged P3 in `audit/16-rihal-docs-tests.md:192` | **info** |
| `scripts/build.cjs` | 54 | Banner comment `github.com/hanzlahabib/rihal-code` — repo URL preserved intentionally per `audit/16-rihal-docs-tests.md:25` | **info** |
| `cli/index.js` | 94 | `github.com/hanzlahabib/rihal-code` URL — same intentional preservation | **info** |
| `cli/install.js` | 360,684 | `github.com/hanzlahabib/rihal-code` URL — same | **info** |
| `cli/postinstall.js` | 127 | `github.com/hanzlahabib/rihal-code` URL — same | **info** |
| `cli/nuke.js` | 5,88,380 | `@hanzlahabib/rihal-code` legacy npm package name — correct: nuke.js exists to detect and remove the old package | **info** |

---

## Verification Notes

### (a) rihal-tools call sites
**Verified CLEAN.** All `.rcode/workflows/` and `.rcode/agents-rules/` files were scanned. Every `node ... rcode-tools.cjs` or `rcode-tools.cjs` reference uses the correct renamed binary. `rcode/bin/rcode-tools.cjs` and `.rcode/bin/rcode-tools.cjs` both exist. No `rihal-tools.cjs` binary call sites remain in live instruction files.

### (b) Silent rihal-* failures
**Verified FAIL — 3 critical instances.** The `resolveAgentId` function in `rcode/bin/rcode-tools.cjs:627–650` strips `rcode-` prefix but NOT `rihal-`. The `AGENT_ID_ALIASES` map (`rcode-tools.cjs:621`) has keys `researcher`, `checker`, `advisor` — these only match AFTER stripping the prefix. Since `rihal-advisor` → strips to `rihal-advisor` (prefix `rihal-` not removed), no alias is found, and `cmdAgentInfo` calls `process.exit(1)`. The `2>/dev/null` on all three call sites silences the exit. The calling workflow variable (`AGENT_SKILLS_*`) receives an empty string and the subagent is spawned without model/configuration data — a silent data-loss failure.

### (c) Task() rihal- subagent_type dispatches
**Verified FAIL — 2 critical instances** in `.rcode/skills/rihal-code-review/steps/step-02-review.md`. The correct agents are in `rcode/agents/rcode-security-adversary.md` and `rcode/agents/rcode-edge-case-hunter.md`. The `.claude/agents/` directory does not exist in this repo. `Task(subagent_type="rihal-security-adversary")` will fail to resolve. The skill file's own comment (line 20) acknowledges the mapping issue but uses the wrong (rihal-) names in the actual dispatch lines.

### (d) console.log rihal brand prefix
**Verified PASS.** No `console.log`, `console.error`, or `console.warn` calls with a `rihal` string prefix were found in `cli/`, `server/`, `rcode/bin/`, or `scripts/`. The rihal references in those JS files are all URL strings pointing to the GitHub repo (intentional preservation).

### Skill delegation path mismatch (warn)
**Verified WARN — 6 workflows.** The `find .rcode/skills/actions` pattern fails doubly: (1) `.rcode/skills/actions/` directory does not exist; (2) skills were renamed from `rihal-*` to `rcode-*` and moved to `rcode/skills/actions/`. Each workflow falls through to the error branch (`"Skill not installed — run: npx @hanzlaa/rcode install"`) even though the skill exists at `rcode/skills/actions/*/rcode-<name>/workflow.md`. This is a silent misdirection rather than a crash.

---

## Summary

| Category | Count | Status |
|----------|-------|--------|
| (a) rihal-tools binary call sites | 0 remaining | PASS |
| (b) Silent rihal-* agent-skills failures | 3 | FAIL |
| (c) Task() rihal- subagent_type dispatches | 2 | FAIL |
| (d) console.log rihal brand prefix | 0 | PASS |
| Skill delegation path mismatch (warn) | 6 workflows | WARN |
| Intentional / backward-compat residue | 9 | INFO |

**Overall lens status: FAIL**

The binary rename is complete and clean. The residue is in *agent name strings* passed to the binary and *subagent_type strings* in Task() dispatches — both silently fail because `2>/dev/null` suppresses the exit and the wrong `rihal-` prefix is not stripped by the resolver.

---

## Recommended Fixes (for issue filing — do not fix in this audit branch)

1. **`rcode-tools.cjs:627` — extend `resolveAgentId` to also strip `rihal-` prefix** so existing workflow files that still say `rihal-advisor` / `rihal-checker` / `rihal-researcher` resolve correctly during the transition window.
2. **`.rcode/workflows/verify-work.md:53`, `discuss-phase.md:155`, `research-phase.md:47`** — rename `rihal-checker` → `rcode-checker`, `rihal-advisor` → `rcode-advisor`, `rihal-researcher` → `rcode-researcher` (or bare `checker`/`advisor`/`researcher`).
3. **`.rcode/skills/rihal-code-review/steps/step-02-review.md:23,26,28`** — replace `rihal-security-adversary` → `rcode-security-adversary`, `rihal-edge-case-hunter` → `rcode-edge-case-hunter`, `rihal-code-reviewer` → `rcode-code-reviewer`.
4. **6 delegate workflows** — fix `find .rcode/skills/actions -path "*rihal-<name>/workflow.md"` → `find rcode/skills/actions -path "*rcode-<name>/workflow.md"`.
5. **`.rcode/workflows/review.md:138`** — rename `/tmp/rihal-review-*` temp files to `/tmp/rcode-review-*` (low priority, no functional impact).
