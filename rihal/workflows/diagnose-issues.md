<purpose>
Diagnose issues surfaced during /rihal:verify-work. For each failed acceptance criterion, identify root cause, classify severity, and decide whether to fix in-flight or file as follow-up.

Spawned by /rihal:verify-work when verification fails. Not typically called directly by users.
</purpose>

<required_reading>
@.rihal/references/output-format.md
@.rihal/references/common-bug-patterns.md
@.rihal/references/verification-patterns.md
</required_reading>

<process>

## 1. Receive failure list

`/rihal:verify-work` passes a structured list of failures:

```json
[
  {
    "criterion": "Auth login completes in <2s",
    "expected": "redirect to /dashboard within 2s of submit",
    "actual": "redirected after 8s",
    "evidence": "browser network log shows 6s spent on /api/me"
  }
]
```

## 2. For each failure — diagnose

Parallel-spawn one investigator per failure. Each investigator:

a. **Reproduce** locally using the verification steps from UAT.md.
b. **Bisect** — narrow down which file/function/commit introduced the regression. Use `git log --since` + `git bisect` if needed.
c. **Classify** — bug / config / docs / environment / spec.
d. **Severity** — critical (blocks ship) / high (degrades core feature) / medium (workaround exists) / low (cosmetic).
e. **Root cause** — one-sentence explanation.
f. **Fix proposal** — one of:
   - **In-flight** — small enough to fix in this phase before merging
   - **Follow-up** — substantial; file an issue and proceed
   - **Stop** — phase shouldn't ship; halt and re-plan

## 3. Aggregate diagnosis

Each investigator returns a structured diagnosis. The orchestrator collates:

```
Failed criteria: 3
Diagnosis:
  Critical: 1   (must fix before ship)
  High:     1   (recommended fix in-flight)
  Medium:   1   (file as follow-up, ship anyway)
```

## 4. Decide

- All criticals fixable in-flight → loop into rihal-code-fixer with the diagnosis bundle.
- Any critical not fixable in-flight → return STOP to verify-work; phase doesn't ship.
- Otherwise → file follow-ups, return PROCEED to verify-work.

## 5. Output

`DIAGNOSIS.md` per failure, written to `.planning/phases/<NN>/diagnosis/<criterion-slug>.md`. Each contains:

- Reproduction steps
- Bisect result
- Root cause
- Severity + classification
- Fix proposal + estimated effort

Plus an aggregate `DIAGNOSIS-INDEX.md` summarizing all failures and the orchestrator's decision.

</process>

## Success Criteria

- [ ] Every failed criterion has a DIAGNOSIS.md file
- [ ] Each DIAGNOSIS.md has reproduction + root cause + fix proposal
- [ ] Critical failures either get in-flight fix or halt the phase
- [ ] Follow-up issues filed for medium/low items proceed without blocking ship

## On Error

- **Cannot reproduce** — mark diagnosis status `cannot-reproduce`. Often signals environment drift between verifier and dev. File as follow-up; do not block ship if all other criticals pass.
- **Bisect inconclusive** — fall back to a hypothesis-driven investigation (read recent commits in the affected file, look for likely causes).
- **Repair budget exhausted** — STOP. Return control to user with the full diagnosis bundle.
