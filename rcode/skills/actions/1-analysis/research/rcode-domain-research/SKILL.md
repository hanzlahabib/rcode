---
name: rcode-domain-research
internal: true
description: >
  Conduct industry domain deep-dive research to build subject matter
  expertise on a specific business domain. Activates when the user says
  "research this domain", "domain deep dive", "explain this industry", "help
  me understand X industry", or "domain research for". Do NOT use for market
  analysis (use rcode-market-research) or technical feasibility (use
  rcode-technical-research).
triggers:
  - "research this domain"
  - "domain deep dive"
  - "explain this industry"
  - "help
  me understand X industry"
  - "domain research for"
user-invocable: true
---
@.rcode/references/karpathy-guidelines.md


## Overview

Conduct industry domain deep-dive research to build subject matter expertise on a specific business domain.

## Workflow

Follow the instructions in ./workflow.md.

## Output Format

- Report: Domain Overview | Key Players | Terminology Glossary | Common Workflows | Regulatory Notes | References
- Every claim cited with a source URL or flagged as assumption
- Saved to .rcode/artifacts/research/domain-{slug}.md
- Do NOT include unsourced statistics

## Examples

### Happy Path
**Input:** "Research the real estate brokerage domain in Oman"
**Expected behavior:** Multi-source research, produce report with glossary of Omani real estate terms, regulatory citations, and key players.

### Edge Case: Narrow Domain
**Input:** "Research quantum basket weaving"
**Expected behavior:** Report: "Insufficient verifiable sources. Can narrow or pivot to adjacent domain?"
