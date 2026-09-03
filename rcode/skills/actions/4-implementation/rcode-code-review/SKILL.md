---
name: rcode-review
internal: true
description: >
  Review code changes from eight parallel angles — three that gather evidence
  (cold scan, what was removed, call-path trace) and five that judge (reuse,
  simplification, efficiency, altitude, concurrency) — then verify every finding
  adversarially before reporting, so false positives never reach the user. Activates when the user says "review this PR", "review
  this code", "run code review", "do a PR review", "review the diff", "review
  this branch", "critique this implementation", or "CR" — including when a
  GitHub PR URL or a PR number is given with no other wording ("review
  https://github.com/org/repo/pull/792", "review #792"). Do NOT use for
  documentation review (use rcode-validate-prd or editorial skills).
triggers:
  # English
  - "review this code"
  - "run code review"
  - "do a PR review"
  - "review this PR"
  - "review the PR"
  - "review this branch"
  - "review the diff"
  - "critique this implementation"
  - "find bad code practices"
  - "code smells"
  - "code quality check"
  # Roman Urdu / Hindi
  - "code check karo"
  - "code review karo"
  - "kharab code dekho"
  # Arabic native
  - "راجع الكود"
  - "مراجعة الكود"
  - "افحص الكود"
  - "تدقيق الكود"
  - "جودة الكود"
user-invocable: true
---

<!-- Bridge status: not currently invoked by any rcode/workflows/*.md file (no delegate_to_skill cross-reference exists in either direction). Reachable only via direct phrase-trigger match or explicit @-inclusion. See AUDIT-redundant-work.md finding 3. -->
@.rcode/references/karpathy-guidelines.md


## Overview

Review code changes using parallel adversarial review layers and produce actionable findings.

## Workflow

Follow the instructions in ./workflow.md.

## Output Format

- Produces review report with severity per finding: Critical / High / Medium / Low
- Report table: File:Line | Severity | Issue | Suggested Fix
- Final verdict: APPROVE / REQUEST CHANGES / BLOCK
- Saved to .rcode/artifacts/reviews/{pr-id}.md
- Do NOT silently fix issues — the author must decide

## Examples

### Happy Path
**Input:** "Run code review on this PR diff"
**Expected behavior:** Load diff, run parallel reviews (blind hunter, edge case hunter, acceptance auditor), triage findings, produce verdict.

### Edge Case: Diff Too Large
**Input:** (diff is 2000+ lines)
**Expected behavior:** Report: "Diff is too large for a single review (2000+ lines). Split into smaller PRs, or pick 3-4 focus areas to review first."
