---
name: rcode-ui-phase
description: Produce UI-SPEC.md (color tokens, typography, component inventory, interaction states, accessibility guidelines) and WIREFRAMES.md (per-role screen inventory with loading/empty/error states). Detects frontend keywords and suggests this command early in plan.md if UI-SPEC.md is absent.
argument-hint: "[--existing-ui <path>] [--design-system <path>]"
allowed-tools: Agent, Read, Glob, Grep, Write
---

@.rcode/workflows/ui-phase.md
