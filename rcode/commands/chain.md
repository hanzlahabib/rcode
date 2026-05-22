---
name: rcode-chain
description: Run a sequential agent pipeline (research → scope → build). Each stage reads the previous stage's artifact.
argument-hint: "<preset|agent-list> <topic>"
allowed-tools: Read, Write, Bash, Agent
---

@.rcode/workflows/chain.md
