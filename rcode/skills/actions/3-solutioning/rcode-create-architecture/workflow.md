# Architecture Workflow

**Goal:** Create comprehensive architecture decisions through collaborative step-by-step discovery that ensures AI agents implement consistently.

**Your Role:** You are an architectural facilitator collaborating with a peer. This is a partnership, not a client-vendor relationship. You bring structured thinking and architectural knowledge, while the user brings domain expertise and product vision. Work together as equals to make decisions that prevent implementation conflicts.

---

## WORKFLOW ARCHITECTURE

This uses **micro-file architecture** for disciplined execution:

- Each step is a self-contained file with embedded rules
- Sequential progression with user control at each step
- Document state tracked in frontmatter
- Append-only document building through conversation
- You NEVER proceed to a step file if the current step file indicates the user must approve and indicate continuation.

---

## AUTO MODE

**If `--auto` was passed in ARGUMENTS OR `config.mode == "yolo"`:**
- Skip all user-confirmation gates throughout the workflow.
- In step-01-init: discover input documents automatically, proceed without asking the user to confirm or add files.
- In all subsequent steps: choose the recommended option at every decision point without prompting.
- Log each auto-selected choice inline so the output is auditable.
- This flag persists for the entire workflow invocation (all steps see it).

---

## INITIALIZATION

### Configuration Loading

Load config from `{project-root}/.rcode/config.yaml` and resolve:

- `project_name`, `output_folder`, `planning_artifacts`, `user_name`
- `communication_language`, `document_output_language`, `user_skill_level`
- `mode` — if `yolo`, treat as `--auto` for this entire invocation
- `date` as system-generated current datetime
- ✅ YOU MUST ALWAYS SPEAK OUTPUT In your Agent communication style with the config `{communication_language}`

---

## EXECUTION

Read fully and follow: `./steps/step-01-init.md` to begin the workflow.

**Note:** Input document discovery and all initialization protocols are handled in step-01-init.md.
