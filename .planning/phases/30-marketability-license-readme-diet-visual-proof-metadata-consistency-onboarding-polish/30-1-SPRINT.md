---
phase: 30
plan_number: 1
sprint: 30.1
type: execute
wave: 1
depends_on: []
files_modified:
  - LICENSE
  - package.json
  - README.md
autonomous: false
requirements: [REQ-755]
must_haves:
  truths:
    - "A LICENSE file exists at the repo root and a human chose its terms."
    - "package.json `license` field, README License section, and the LICENSE file all state the same thing."
  artifacts:
    - "LICENSE (repo root)"
  key_links:
    - "package.json `license` <-> LICENSE file <-> README `## License` section must agree."
    - "`publishConfig.access: public` only makes sense if the chosen license permits public distribution."
---

<objective>
Resolve the license contradiction (#755). Today `package.json` says `"license": "UNLICENSED"` with `publishConfig.access: public`, the README says "UNLICENSED — proprietary. All rights reserved.", and there is NO `LICENSE` file at the repo root. This is a hard adoption blocker — a public npm package with no usable license terms.

Purpose: Make the legal posture of the package unambiguous and consistent across all three surfaces.
Output: A `LICENSE` file plus aligned `package.json` and README.
</objective>

<execution_context>
@.rcode/workflows/execute.md
@.rcode/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
</context>

<tasks>

### Task 30.1.1 — checkpoint:decision — Choose the license
<type>checkpoint:decision</type>
<read_first>
- /home/hanzla/development/rcode/package.json (lines 49, 71-73 — `license` + `publishConfig`)
- /home/hanzla/development/rcode/README.md (lines 521-523 — current License section)
- /home/hanzla/development/rcode/ATTRIBUTION.md (full — records third-party MIT credit obligations)
</read_first>
<files></files>
<action>
PAUSE and ask the user to decide. Do NOT pick a license. Present exactly these options and wait for an explicit answer:

1. **MIT** — permissive OSS. Matches the `publishConfig.access: public` already in package.json and the MIT-licensed Karpathy guidelines credited in ATTRIBUTION.md. Anyone can use/modify/redistribute with attribution.
2. **Apache-2.0** — permissive OSS with an explicit patent grant. Same freedoms as MIT plus patent protection.
3. **Commercial / proprietary** — keep "all rights reserved". If chosen, the package should NOT be published publicly, so `publishConfig.access: public` must also be revisited.

Record the user's answer verbatim. The remaining tasks in this sprint depend on it. If the user picks commercial, flag that `publishConfig.access: public` (package.json line 72) contradicts that choice and ask whether to keep publishing.
</action>
<acceptance_criteria>
- The user has stated one of: MIT, Apache-2.0, or commercial.
- The decision is written into the sprint SUMMARY.md as a decision record.
</acceptance_criteria>
<verify>
<automated>echo "checkpoint: license decision recorded by human — no automated check"</automated>
</verify>
<done>User has explicitly chosen the license; choice is logged.</done>
<evidence>lines: package.json:49 (`"license": "UNLICENSED"`), package.json:71-73 (`publishConfig.access: public`); README.md:521-523 (`UNLICENSED — proprietary. All rights reserved.`); `test -f LICENSE` returns false — confirmed no LICENSE file exists.</evidence>

### Task 30.1.2 — auto — Create the LICENSE file
<type>auto</type>
<read_first>
- The decision recorded in Task 30.1.1
- /home/hanzla/development/rcode/package.json (line 45-48 — `author.name` = "Hanzla Habib")
</read_first>
<files>LICENSE</files>
<action>
Create `LICENSE` at the repo root using the EXACT canonical text for the license chosen in 30.1.1:
- MIT → standard MIT License text, copyright line: `Copyright (c) 2026 Hanzla Habib`.
- Apache-2.0 → full canonical Apache License 2.0 text.
- Commercial → a proprietary "all rights reserved" notice naming Hanzla Habib / rcode as copyright holder.
Use the exact canonical wording — do not paraphrase OSS license text. Pull the year from the current date (2026) and the holder from `package.json` `author.name`.
</action>
<acceptance_criteria>
- `test -f LICENSE` succeeds.
- `LICENSE` is non-empty and its text matches the chosen license type (e.g. MIT → contains "Permission is hereby granted, free of charge").
</acceptance_criteria>
<verify>
<automated>test -f LICENSE && test -s LICENSE && echo "LICENSE exists and non-empty"</automated>
</verify>
<done>LICENSE file exists, non-empty, contains the canonical text for the chosen license.</done>
<evidence>creates: LICENSE — no LICENSE file exists today (`test -f LICENSE` → false); package.json:45-46 supplies the copyright holder name.</evidence>

### Task 30.1.3 — auto — Align package.json and README with the LICENSE
<type>auto</type>
<read_first>
- LICENSE (created in 30.1.2)
- /home/hanzla/development/rcode/package.json (line 49, 71-73)
- /home/hanzla/development/rcode/README.md (lines 521-523)
</read_first>
<files>package.json, README.md</files>
<action>
1. In `package.json` set `"license"` (line 49) to the SPDX identifier matching LICENSE: `"MIT"`, `"Apache-2.0"`, or for commercial `"SEE LICENSE IN LICENSE"`.
2. If the user chose commercial in 30.1.1 AND decided to stop public publishing, change `publishConfig.access` accordingly per their instruction; otherwise leave `publishConfig` untouched.
3. In `README.md` replace the `## License` section body (lines 522-523) with one sentence that matches: e.g. for MIT — `Released under the [MIT License](LICENSE).`; for Apache-2.0 — `Released under the [Apache License 2.0](LICENSE).`; for commercial — `Proprietary. All rights reserved. See [LICENSE](LICENSE).`
Do not touch any other README section — README diet is sprint 30-2's job.
</action>
<acceptance_criteria>
- `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'))"` succeeds (valid JSON).
- The `license` value in package.json, the README License section, and the LICENSE file all describe the same license.
- README no longer contains the string "UNLICENSED".
</acceptance_criteria>
<verify>
<automated>node -e "const p=require('./package.json'); if(p.license==='UNLICENSED'){process.exit(1)}" && ! grep -q "UNLICENSED" README.md && echo "package.json + README aligned, no UNLICENSED left"</automated>
</verify>
<done>package.json `license`, README `## License`, and LICENSE file are mutually consistent; the word "UNLICENSED" no longer appears in README or package.json.</done>
<evidence>lines: package.json:49 (`"license": "UNLICENSED"`); README.md:521-523 (License section to replace); grep `UNLICENSED README.md package.json` → 2 hits, both must be removed.</evidence>

</tasks>

<verification>
- `test -f LICENSE` succeeds.
- `grep -rc "UNLICENSED" package.json README.md` returns 0.
- package.json parses as valid JSON.
- The license type is identical across LICENSE, package.json `license`, and README `## License`.
</verification>

<success_criteria>
- A human chose the license (not the planner or executor).
- LICENSE file exists and is canonical for the chosen type.
- package.json + README + LICENSE agree; "UNLICENSED" is gone.
</success_criteria>

<output>
Create `.planning/phases/30-marketability-license-readme-diet-visual-proof-metadata-consistency-onboarding-polish/30-1-SUMMARY.md`
</output>
