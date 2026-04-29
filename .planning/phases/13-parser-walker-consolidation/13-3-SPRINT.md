---
phase: 13-parser-walker-consolidation
sprint: 13.3
type: execute
wave: 2
depends_on: ["13.1", "13.2"]
sequential: false
files_modified:
  - scripts/dogfood-check.sh
autonomous: true
requirements_addressed:
  - "#469 — dogfood gate enforces exactly-one-canonical for parser + walker"
  - "BRIEF acceptance: Dogfood gate passes after consolidation"
must_haves:
  truths:
    - "`bash scripts/dogfood-check.sh` exits 0 with the new gate active"
    - "If a future commit adds a second `function walkPhaseDirs` to rihal-tools.cjs OR a second roadmap-parser function across the two files, the gate FAILS the script"
    - "The gate runs in <1 second and uses only grep + bash arithmetic (no node spawn)"
  artifacts:
    - "scripts/dogfood-check.sh has a 'Check 7 — parser/walker canonical (#469)' block"
    - "The check section is bracketed by clear comments referencing #469 so future maintainers know why it exists"
  key_links:
    - "The grep counts are the same expressions used in the BRIEF acceptance criteria"
    - "Failure mode prints the offending function definitions for fast triage"
---

<objective>
Add a dogfood gate that enforces the consolidation done in 13.1 and 13.2. The gate will fail any future commit that re-introduces a duplicate parser or walker. Without this gate, the drift fixed by Phases 10/12/13 will return.

Purpose: Convert "we cleaned this up once" into "the next attempt to drift fails CI".

Output: One new ~25-line check appended to `scripts/dogfood-check.sh`.
</objective>

<context>
@scripts/dogfood-check.sh
@.planning/phases/13-parser-walker-consolidation/13-1-SPRINT.md
@.planning/phases/13-parser-walker-consolidation/13-2-SPRINT.md
</context>

<tasks>

### Story 13.3.1 — Add Check 7 to scripts/dogfood-check.sh

<files>
- scripts/dogfood-check.sh (append a new check between the existing Check 6 and the final summary block)
</files>

<read_first>
- scripts/dogfood-check.sh (full file — 155 lines; specifically lines 109-155 to find the right insertion point AFTER Check 6 and BEFORE the `echo` / `if [ "$FAIL" -eq 0 ]` final summary)
</read_first>

<action>
Insert the following block in `scripts/dogfood-check.sh` immediately after the Check 6 closing `fi` (around line 145, before the blank line and the final `echo` summary):

```bash
# Check 7 — parser + walker canonical (#469 / Phase 13)
# Enforces consolidation: exactly one ROADMAP parser function across
# rihal-tools.cjs + lib/roadmap.cjs, and exactly one walkPhaseDirs across
# rihal-tools.cjs (canonical lives in lib/phase-dirs.cjs after Phase 13).
# Fails on any new duplicate that would reintroduce the drift behind
# #460/#462/#464/#465.
PARSER_COUNT=$(grep -hcE "^function (extractPhases|parseRoadmap[A-Za-z]*)\b|^\s+function parseRoadmap[A-Za-z]*\b" \
  rihal/bin/rihal-tools.cjs rihal/bin/lib/roadmap.cjs 2>/dev/null | \
  awk '{s+=$1} END {print s+0}')
if [ "$PARSER_COUNT" = "1" ]; then
  pass "exactly 1 ROADMAP parser function (#469)"
else
  fail "expected 1 ROADMAP parser, found $PARSER_COUNT (#469 regression — duplicate parsers reintroduced)"
  grep -nE "^function (extractPhases|parseRoadmap[A-Za-z]*)\b|^\s+function parseRoadmap[A-Za-z]*\b" \
    rihal/bin/rihal-tools.cjs rihal/bin/lib/roadmap.cjs 2>/dev/null | sed 's/^/    /'
fi

WALKER_TOOLS=$(grep -c "function walkPhaseDirs" rihal/bin/rihal-tools.cjs 2>/dev/null || echo 0)
WALKER_LIB=$(grep -c "function walkPhaseDirs" rihal/bin/lib/phase-dirs.cjs 2>/dev/null || echo 0)
if [ "$WALKER_TOOLS" = "0" ] && [ "$WALKER_LIB" = "1" ]; then
  pass "walkPhaseDirs lifted to lib/phase-dirs.cjs (#469)"
else
  fail "walker drift (#469): tools.cjs has $WALKER_TOOLS walkPhaseDirs (expected 0), lib/phase-dirs.cjs has $WALKER_LIB (expected 1)"
fi
```

Notes:
- Two separate counts for the parser regex: top-level `function extractPhases` and any-indent `function parseRoadmap*`. After Phase 13 the only match is `extractPhases` in `lib/roadmap.cjs` line 21 — that's the "1" we expect.
- For the walker, we deliberately split the count into "must be 0 in tools" + "must be 1 in lib". A combined `grep -c` would mask a duplicate where both files define it. The split makes failure modes obvious.
- `awk '{s+=$1}'` correctly sums per-file counts emitted by `grep -hc` across the two file arguments.
- `2>/dev/null || echo 0` keeps the script robust if `lib/phase-dirs.cjs` doesn't yet exist (e.g., running this gate against an older checkout) — it'll fail with the "expected 1" message rather than crashing.
- Use `pass`/`fail` helpers already defined at the top of the file (lines 20-21) — same convention as Checks 1-6.
- Place AFTER Check 6 because the existing checks are ordered roughly chronologically by issue number; Check 7 (#469) is the newest.

Do NOT change the `set -e` directive. Do NOT touch any of Checks 1-6.
</action>

<verify>
<automated>
cd /home/hanzla/development/rihal-code && bash scripts/dogfood-check.sh 2>&1 | grep -q "exactly 1 ROADMAP parser function" && echo "PASS: parser gate runs" || { echo "FAIL: parser gate not invoked"; bash scripts/dogfood-check.sh 2>&1; exit 1; }
</automated>

<automated>
cd /home/hanzla/development/rihal-code && bash scripts/dogfood-check.sh 2>&1 | grep -q "walkPhaseDirs lifted to lib/phase-dirs.cjs" && echo "PASS: walker gate runs" || { echo "FAIL: walker gate not invoked"; bash scripts/dogfood-check.sh 2>&1; exit 1; }
</automated>

<automated>
cd /home/hanzla/development/rihal-code && bash scripts/dogfood-check.sh 2>&1 | tail -3 | grep -q "Dogfood checks passed" && echo "PASS: full script exits 0" || { echo "FAIL: dogfood failed overall"; bash scripts/dogfood-check.sh; exit 1; }
</automated>

<automated>
# Negative test — temporarily inject a fake duplicate parser, prove the gate fails, then revert.
cd /home/hanzla/development/rihal-code && cp rihal/bin/rihal-tools.cjs /tmp/rihal-tools.cjs.bak && \
  printf '\nfunction parseRoadmapPhasesFAKE() { return []; }\n' >> rihal/bin/rihal-tools.cjs && \
  ! bash scripts/dogfood-check.sh > /tmp/dogfood-neg.log 2>&1 && grep -q "expected 1 ROADMAP parser, found 2" /tmp/dogfood-neg.log && echo "PASS: gate correctly FAILS on injected duplicate" || { echo "WARN: negative test inconclusive"; cat /tmp/dogfood-neg.log; }; \
  cp /tmp/rihal-tools.cjs.bak rihal/bin/rihal-tools.cjs && rm /tmp/rihal-tools.cjs.bak && bash scripts/dogfood-check.sh > /dev/null 2>&1 && echo "PASS: restored — script back to green"
</automated>
</verify>

<done>
- `scripts/dogfood-check.sh` contains a "Check 7 — parser + walker canonical (#469)" block
- `bash scripts/dogfood-check.sh` exits 0 with the new gate passing
- Negative test confirms the gate FAILS the script when a duplicate parser is injected (proves the gate has teeth, not just decoration)
- All previous checks (1-6) still pass
</done>

</tasks>

<verification>
- Run `bash scripts/dogfood-check.sh` — exit code 0
- Confirm the new check produces visible `pass:` lines in the output
- Run the negative-test sequence (inject fake duplicate, verify gate fails, revert) to prove the gate isn't vacuous
- Run `pnpm test` — 132/132 still pass (this sprint doesn't touch JS, so this is just sanity)
</verification>

<success_criteria>
1. Check 7 lands in scripts/dogfood-check.sh
2. Gate currently passes (because 13.1 and 13.2 already consolidated)
3. Gate FAILS on injected duplicate (proven by the negative test in verify block)
4. No regression of Checks 1-6
</success_criteria>

<output>
On completion, write `.planning/phases/13-parser-walker-consolidation/13-3-SUMMARY.md` documenting:
- The exact lines added to dogfood-check.sh (line range + LOC)
- Negative-test result (must show the gate fails on duplicate injection)
- Final phase sign-off: all three sprints complete, BRIEF acceptance criteria met
</output>
