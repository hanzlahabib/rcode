# AUDIT: Agent Tool-Grant Mismatches (`.claude/agents/*.md`)

**Scope:** Every agent definition under `.claude/agents/*.md` **except** the 5 already-confirmed
cases (`rcode-hanzla`, `rcode-yousef`, `rcode-haitham`, `rcode-omar`, `rcode-executor`), which were
diagnosed prior to this sweep and are not re-litigated here.

**Method:** `.claude/agents/` is gitignored (see `.gitignore:54`, `.claude/*` block) and this
worktree therefore has no local copy — it only exists as untracked state in the primary checkout
at `/home/hanzla/development/rihal-code/.claude/agents/`. Verified byte-for-byte identical
(`diff`) against the tracked template source `rcode/agents/*.md`, confirming the installed agent
is a direct copy of the template with no drift. Frontmatter (`tools:` line) was grepped directly
from all 45 files; the 40 files in scope here had their full body read where the description was
ambiguous about file-writing, to check whether the loaded `@`-included skill/playbook actually
instructs a file write (a real gap) or the agent's real behavior is chat-response-only (no gap,
possibly a reverse-smell if Write/Edit is granted anyway).

45 total agent files − 5 already-known = **40 audited**. 3 gaps, 1 reverse-smell, 36 clean.

---

## Findings table

| Agent | `tools:` line | Description/instructions imply write access needed? | Verdict |
|---|---|---|---|
| rcode-advisor-researcher | Read, Bash, Grep, Glob, WebSearch, WebFetch | N — "returns a structured comparison table" (chat output) | clean |
| rcode-ahmed | Read, Grep, Glob, Bash | N — council advisor, text response | clean |
| rcode-assumptions-analyzer | Read, Bash, Grep, Glob | N — "returns structured assumptions" | clean |
| rcode-codebase-mapper | Read, Bash, Grep, Glob, **Write** | Y — "writes structured analysis documents" | clean (Write present, matches) |
| rcode-code-fixer (`name: rcode-fixer`) | Read, Grep, Glob, Bash, **Edit** | Y — "apply findings, implement fixes, refactor"; body confirms "Commits made" in response format | clean (Edit present, matches) |
| rcode-code-reviewer (`name: rcode-reviewer`) | Read, Grep, Glob, Bash | N — review/assessment only, no write claim | clean |
| rcode-cross-platform-auditor | Read, Bash, Grep, Glob | N — description explicitly states "Audit-only — never modifies scripts" | clean |
| rcode-debugger | Read, **Write, Edit**, Bash, Grep, Glob | Y — "manage persistent debug file state", "Document investigation in `.rcode/debug/investigation.md`", makes code changes to test hypotheses | clean (Write+Edit present, matches) |
| rcode-dep-auditor | Read, Bash, Grep, Glob | N — description explicitly states "Audit-only: never modifies package.json or runs installs" | clean |
| rcode-deviation-analyzer | Read, Grep, Glob, Bash, WebFetch | N — "Generates deviation reports" sounds write-ish, but body confirms pure chat response (`📊 **Deviation Analyzer:**` text block, no file path ever referenced) | clean |
| rcode-docs-auditor | Read, Grep, Glob, Bash | N — body explicitly says "You defer to rcode-noor for content creation" | clean |
| rcode-edge-case-hunter | Read, Grep, Glob, Bash, WebFetch | N — "enumerates edge cases", advisory | clean |
| rcode-fatima | Read, Grep, Glob, Bash | N — QA advisory/consulting, no write claim | clean |
| rcode-hussain-pm | Read, Grep, Glob, WebFetch | **Y** — description activation includes "PRD writing"; the `@`-included `rcode/skills/agents/hussain-pm/SKILL.md:145` workflow step explicitly says **"3. Save to `.planning/prd.md`"** | **GAP** — no Write, no Edit, not even Bash as a workaround; structurally cannot perform its own documented workflow step |
| rcode-i18n-auditor | Read, Bash, Grep, Glob | N — description explicitly states "Audit-only — never modifies string files" | clean |
| rcode-integration-checker | Read, Bash, Grep, Glob | N — "Verifies cross-phase integration", check-only | clean |
| rcode-khalid | Read, Grep, Glob, Bash | N — council advisor, no write claim | clean |
| rcode-layla | Read, Grep, Glob, WebFetch | N — council advisor (UX reviews), no write claim | clean |
| rcode-mariam | Read, Grep, Glob, WebFetch, WebSearch, Bash | N — council advisor (marketing), no write claim | clean |
| rcode-nasser | Read, Grep, Glob, Bash | N — council advisor (people ops), no write claim | clean |
| rcode-noor | Read, **Write, Edit**, Grep, Glob, Bash, WebFetch | Y — "for README files, API docs... changelogs, migration guides, pitch decks" | clean (Write+Edit present, matches) |
| rcode-nyquist-auditor | Read, Grep, Glob, Bash | **Y** — description says "generating tests"; the agent's own `<role>` block (line 21) states **"Only create/modify: test files, fixtures, VALIDATION.md"** | **GAP** — no Write, no Edit; self-contradictory (instructs file creation with tools that cannot create files) |
| rcode-observability-auditor | Read, Bash, Grep, Glob | N — description explicitly states "Audit-only — never adds instrumentation" | clean |
| rcode-phase-researcher | Read, **Write**, Bash, Grep, Glob, WebSearch, WebFetch | Y — "Produces RESEARCH.md" | clean (Write present, matches) |
| rcode-planner | Read, **Write**, Bash, Glob, Grep, WebFetch | Y — "Creates executable phase plans" (SPRINT.md) | clean (Write present, matches) |
| rcode-profiler | Read, Grep, Glob, Bash, WebFetch, WebSearch | N — "create personas" sounds write-ish, but body confirms pure chat response (`👥 **Profiler:**` text block, "provide user insight to inform decisions", no file path referenced) | clean |
| rcode-project-researcher | Read, **Write**, Bash, Grep, Glob, WebSearch, WebFetch | Y — "Produces files in `.rcode/research/`" | clean (Write present, matches) |
| rcode-remediation-planner | Read, Grep, Glob, Bash, **Edit** | Description says "Creates action plans" (sounds write-ish) but `rcode/references/remediation-planner-playbook.md` shows the actual output is 100% chat-response (`🔄 **Remediation Planner:**` text blocks in all 3 worked examples — happy path, edge case, negative — none write to a file) | **REVERSE-SMELL** — Edit granted to a role that is purely advisory per its own playbook; never touches files in practice |
| rcode-research-synthesizer | Read, **Write**, Bash | Y — "Synthesizes research outputs... into SUMMARY.md" | clean (Write present, matches) |
| rcode-roadmapper | Read, **Write**, Bash, Glob, Grep | Y — "Creates project roadmaps" | clean (Write present, matches) |
| rcode-sadiq | Read, Grep, Glob, WebFetch, WebSearch, Bash | N — council advisor (strategy), no write claim | clean |
| rcode-security-adversary | Read, Grep, Glob, Bash, WebFetch, WebSearch | N — "adversarial security review... identifying exploitation paths", advisory | clean |
| rcode-security-auditor | Read, Grep, Glob, Bash, WebFetch, WebSearch | N — audits/verifies, no write claim | clean |
| rcode-sprint-checker | Read, Bash, Glob, Grep | N — "Verifies sprints will achieve phase goal", check-only | clean |
| rcode-ui-auditor | Read, Grep, Glob, Bash, WebFetch | N — "audit user interface", advisory | clean |
| rcode-ux-designer | Read, Grep, Glob, WebFetch | N — "UI/UX reviews", advisory | clean |
| rcode-verifier | Read, **Write**, Bash, Grep, Glob | Y — "Creates VERIFICATION.md report" | clean (Write present, matches) |
| rcode-waleed | Read, Grep, Glob, Bash, WebFetch, WebSearch | **Y** — description lists "ADR writing" as a capability; the `@`-included `rcode/skills/agents/waleed-architect/SKILL.md` states (line 51) "Non-trivial decisions are captured as Architecture Decision Records saved to `.rcode/decisions/`", (line 66) "Every non-trivial decision gets a written ADR", (line 131) "ADR saved to `.rcode/decisions/001-initial-stack.md`" | **GAP** — no Write, no Edit; has Bash as a theoretical workaround, but no dedicated file-write tool for a role whose own skill file requires saving ADR files. (Note: `/rcode-create-architecture` is a separate skill/command not routed through this subagent — but the frontmatter description still advertises "ADR writing" as this agent's job, and its loaded skill instructs the save.) |
| rcode-zahra | Read, Grep, Glob, WebFetch | N — council advisor (branding), no write claim | clean |
| rcode-zayd | Read, Grep, Glob, Bash, WebFetch | N — council advisor (ML), no write claim | clean |

---

## Summary

**Gaps (3)** — description or the agent's own loaded skill/playbook instructs it to create or save
a file, but `tools:` grants neither `Write` nor `Edit`:

1. **rcode-nyquist-auditor** — most severe: the contradiction is in the agent's own `<role>` block, not just an included reference. It's told to create/modify test files and `VALIDATION.md` and has no way to do either.
2. **rcode-hussain-pm** — its loaded `SKILL.md` workflow ends with "Save to `.planning/prd.md`"; the agent has neither `Write`/`Edit` nor even `Bash` as a fallback.
3. **rcode-waleed** — description advertises "ADR writing"; its loaded skill says ADRs get saved to `.rcode/decisions/`; only `Bash` is available as an indirect workaround.

**Reverse-smell (1)** — `Edit` (a modify-in-place, can-corrupt-any-file capability) granted to a role
that is purely advisory by its own documentation:

4. **rcode-remediation-planner** — playbook's 3 worked examples are all pure chat-response text; the agent never demonstrates touching a file, yet holds `Edit`.

**Clean (36)** — tool grants match the agent's actual documented behavior (either both absent from
a pure-advisory role, or both present and exercised by a role that legitimately produces file
output).

## Notes / caveats

- This is a diagnostic pass only — no code or agent files were modified.
- For the 3 gap agents, `Bash` alone is not treated as "solves the gap": shell redirection to write files (`bash -c "cat > file"`) is an anti-pattern this repo's own `CLAUDE.md` forbids in favor of the dedicated `Write`/`Edit` tools, and for `rcode-hussain-pm` the agent doesn't even have `Bash`.
- `rcode-remediation-planner`'s reverse-smell finding is based on its playbook's worked examples, not a hard guarantee the agent never edits a file in production — but nothing in its own documentation describes or demonstrates it doing so.
