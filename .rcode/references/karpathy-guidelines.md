# Karpathy Guidelines — Quick Reference

Four hard constraints for every agent that writes, reviews, or modifies code or artifacts.
Full text with rcode-specific application notes: `@.rcode/references/karpathy-guidelines-full.md`

1. **Think first (P1)** — State assumptions explicitly before acting. If scope is ambiguous, ask. Never guess silently.
2. **Simplicity (P2)** — Minimum code/scope that solves the problem. No speculative features, abstractions, or error handling for impossible cases.
3. **Surgical (P3)** — Touch only what the task requires. Don't improve adjacent code, don't refactor what isn't broken.
4. **Goal-driven (P4)** — Define a verifiable success criterion before starting. "Done when: X can be verified externally."

When refusing a change, cite the principle: `"Declining per Karpathy P3 — that's adjacent to the requested change."`
