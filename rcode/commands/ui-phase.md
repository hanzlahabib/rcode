---
name: rcode-ui-phase
description: Produce UI-SPEC.md (color tokens, typography, component inventory, corner radius, elevation/depth, spacing/density, interaction states, accessibility guidelines) and WIREFRAMES.md (per-role screen inventory with loading/empty/error states). Also handles image-driven extraction — give it a screenshot/mockup/design image and no existing code, and it drafts the full spec from that image before any UI code gets written. Detects frontend keywords and suggests this command early in plan.md if UI-SPEC.md is absent. For cloning a LIVE URL pixel-perfectly (not a static image), use rcode-clone-website instead.
argument-hint: "[--existing-ui <path>] [--design-system <path>] [--image <path>]"
allowed-tools: Agent, Read, Glob, Grep, Write
---

@.rcode/workflows/ui-phase.md
