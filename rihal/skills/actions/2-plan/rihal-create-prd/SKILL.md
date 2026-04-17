---
name: rihal-create-prd
description: >
  Create a new Product Requirements Document from scratch through guided
  facilitation. Activates when the user says "create a PRD", "write product
  requirements document", "lets make a PRD", "I want to create a new PRD",
  "draft requirements for", "new product spec", or "start a PRD". Do NOT use
  for updating an existing PRD (use rihal-edit-prd), or validating an
  existing PRD (use rihal-validate-prd).
---

Follow the instructions in ./workflow.md.

## Output Format

- Output: PRD file saved to the configured output folder
- Structure: Problem → User → Scope → Requirements → Success Metrics → Kill Criteria → Out-of-Scope
- Each requirement is quantified (numbers, not adjectives)
- Every section has explicit owner and deadline
- Do NOT include: vague verbs ("optimize"), unquantified metrics, or requirements without owners

## Examples

### Happy Path
**Input:** "Create a PRD for a task management feature"
**Expected behavior:** Interview user for Problem/User/Scope first. Do NOT start the PRD until all 5 discovery questions are answered. Then draft PRD with all sections populated. Save and report location.

### Edge Case: Empty User Input
**Input:** "Create a PRD"
**Expected behavior:** Do NOT create a blank template. Ask: "A PRD for what feature/product? And for which audience — engineering, executive, or external?"

### Edge Case: Existing PRD
**Input:** "Create a PRD for auth" (but one already exists)
**Expected behavior:** Detect the existing PRD. Respond: "A PRD for auth already exists at [path]. Use rihal-edit-prd to update it, or confirm you want to overwrite."
