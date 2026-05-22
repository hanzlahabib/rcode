# Advanced Elicitation — Detailed Reference

Detailed method registry semantics, response handling, and execution rules for [`SKILL.md`](SKILL.md).

---

## CSV schema (`methods.csv`)

| Column | Meaning |
|---|---|
| `category` | Method grouping — core, structural, risk, etc. |
| `method_name` | Display name shown in the menu |
| `description` | Rich explanation of what the method does, when to use it, why it's valuable |
| `output_pattern` | Flexible flow guide using arrows (e.g. `analysis → insights → action`) |

The CSV is the single source of truth for available methods. Adding a method = adding a row.

---

## Smart selection (Step 3 of the process)

Apply this when picking the 5 methods to surface:

1. **Analyse context** — content type, complexity, stakeholder needs, risk level, creative potential.
2. **Parse descriptions** — understand each method's purpose from the rich descriptions.
3. **Select 5** — choose methods that best match the context based on their descriptions.
4. **Balance approach** — include a mix of foundational and specialised techniques.

Slot 1 and Slot 2 should be the most relevant for the section being enhanced — users skim before reading.

---

## Response handling (full case list)

**Cases 1-5 — user selects a numbered method:**
- Execute the method using its CSV description.
- Adapt complexity and output format to the current context.
- Apply creatively to the section content being enhanced.
- Display the enhanced version showing what the method revealed or improved.
- Ask `apply changes? (y/n/other)` and HALT.
- On `y` → apply. On `n` → discard. Other → follow user's instructions as best as possible.
- Re-present the menu.

**Case `r` — reshuffle:**
- Pick 5 random methods from the CSV.
- Aim for diversity across categories.
- Slot 1 and Slot 2 should still be the most useful for the current content.

**Case `x` — proceed:**
- Return the fully enhanced content to the invoking skill.
- The enhanced content becomes the final version for that section.
- Signal completion so the parent skill continues with the next section.

**Case `a` — list all:**
- Show every method with its description in a compact table.
- Allow selection by name or number from the full list.
- Then execute as if selected from cases 1-5.

**Case — direct feedback:**
- Apply the user's feedback to the current section content.
- Re-present the menu.

**Case — multiple numbers (e.g. `1,3`):**
- Execute methods in sequence on the content.
- Show the cumulative enhancement after each.
- Re-present the menu.

---

## Execution guidelines

- **Method execution.** Use the CSV description to understand and apply each method.
- **Output pattern.** Treat the pattern as a flexible guide, not a contract.
- **Dynamic adaptation.** Adjust complexity to content needs (simple to sophisticated).
- **Creative application.** Interpret methods flexibly while maintaining pattern consistency.
- **Stay relevant.** Tie elicitation to the specific content being analysed.
- **Identify personas.** For single- or multi-persona methods, name viewpoints clearly. Use party members from memory if available.
- **Loop behaviour.** Always re-offer the menu after each execution.
- **Build cumulatively.** Each method runs against the current enhanced version, not the original.
- **Track enhancements.** Maintain history so the user can see the trajectory.
- **End on `x` or explicit user confirmation.**

---

## HALT conditions

- HALT after presenting the menu — wait for user choice.
- HALT after applying a method — wait for `y/n/other` on whether to keep the change.
- HALT if `methods.csv` is missing or empty — report and exit.
- HALT if the section content to enhance is missing — ask the user to provide it.

---

## Integration when invoked indirectly

When the parent skill or workflow calls this skill mid-flow:

1. Receive the section content that was just generated.
2. Apply elicitation methods iteratively to enhance only that section.
3. Return the enhanced version when the user picks `x`.
4. The enhanced content replaces the original section in the parent's output document.
