# Source-of-Truth Grounding

Loaded by any workflow/agent that generates domain terminology, schema fields,
enum values, or seed data — discuss-phase, roadmapper, project-researcher,
planner, sprint-checker.

## The failure this prevents

A real incident: a competency-tracking app's requirements referenced an
authoritative Excel file (the actual HR competency matrix) and a meeting
transcript explaining it. The planner never opened the Excel — it invented
plausible-sounding competency names (`TECH`, `DELIV`, `COLLAB`, `GROWTH`,
`IMPACT`) and level names (`Junior`, `Associate`, `Senior I/II/III`) that
*sounded* right for a generic engineering-competency system. The real Excel
defined different names (`Technical Skills`, `Delivery & Quality`,
`Communication & Collaboration`, `Leadership & Coaching`, `Strategic Impact`,
`Innovation & Improvement`) and different levels (`Potential`, `Competency`,
`Proficiency`, `Expertise`, `Mastery`). The invented values got baked into
the database schema, seed data, and UI labels — an entire app built on
plausible-sounding fiction instead of the actual source of truth, discovered
only when the user manually re-fed the same files back in and asked for a
gap check.

This is not a hypothetical edge case. Any project with domain-specific
terminology defined by an external document (an HR/compliance matrix, a
partner's API spec, a legal/regulatory definition list, a brand's existing
design system, a client's glossary) is exposed to this failure the moment a
planner treats "sounds plausible" as good enough.

## The rule

**If a source document exists — the user references it, provides a file
path, pastes its content, or it's already sitting in the project (`docs/`,
an attached spreadsheet, a transcript, an existing spec) — and it defines
domain terminology, categories, enum values, or a data model that the
current work touches, that document MUST be read in full before generating
anything that uses those concepts. Extract the actual values verbatim.**

- Don't paraphrase a defined term into a shorter or "cleaner" one. If the
  source says `Communication & Collaboration`, the schema/seed/UI say
  `Communication & Collaboration` — not `COLLAB`, not `Comm & Collab`.
- Don't guess the count or order. If the source defines 6 categories, use
  the 6 it defines — don't invent 5 that seem close enough.
- Don't treat "I've seen similar systems before" as a substitute for reading
  this one's actual source. Training-data familiarity with how competency
  matrices *usually* look is exactly what produces plausible-but-wrong output.
- Excel/spreadsheet files: read the actual cell contents (via a script,
  `openpyxl`/`pandas`-equivalent, or unzipping the `.xlsx` and parsing the
  shared-strings XML if no library is available) — not the filename, not an
  assumption about what a file named "Competency Matrix" probably contains.
- Transcripts/recordings-as-text: read the whole thing, not just the first
  few lines — the real values are often stated once, in the middle, in
  passing ("we have six core competencies, which is technical skills,
  delivery quality, communication, collaboration...").

## Self-check before presenting or committing

After generating requirements/schema/seed-data/UI copy that should be
grounded in a source document, do one pass comparing what you generated
against the source: does every category/level/field name match verbatim?
If you can't point to the specific line/cell in the source for a value you
used, that value is invented — fix it before presenting, not after the user
catches it.

## Where this applies

- **discuss-phase / new-project**: when a source document is mentioned or
  present, read it during context-gathering, before requirements get
  drafted — not after.
- **project-researcher / phase-researcher**: cite the source document's
  actual terminology in STACK.md/FEATURES.md, not an approximation.
- **roadmapper**: phase success criteria referencing domain concepts use the
  source's exact terms.
- **planner**: schema fields, enum values, and seed-data tasks cite the
  source document path and use its verbatim values — a task creating seed
  data for a domain concept with a known source document is incomplete if
  it doesn't reference that source.
- **sprint-checker**: if PROJECT.md/REQUIREMENTS.md reference a source
  document, flag as a blocker any schema/seed-data task whose field/enum
  values aren't traceable to it.
