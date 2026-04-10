## Description
Briefly explain what this PR does and why.

## Related Issue
Closes #ISSUE_ID

## Type of Change
- [ ] Bug fix
- [ ] New feature (agent, skill, or workflow)
- [ ] Refactoring (no behavior change)
- [ ] Documentation
- [ ] Breaking change (skill ID rename, agent authority change, config schema change)

## Rihal Method Compliance
If this PR adds or modifies a skill, verify the 5-component standard:
- [ ] YAML header has explicit trigger phrases (5-12)
- [ ] YAML header has negative boundaries ("Do NOT use for...")
- [ ] Overview paragraph present
- [ ] Output Format section specifies structure and constraints
- [ ] Examples section has happy path + edge cases + negative test

## Agent Changes (if applicable)
- [ ] `team.yaml` updated with the new/renamed agent
- [ ] Dashboard server (`server/dashboard.js`) team roster updated
- [ ] README agent table updated
- [ ] Agent's persona, principles, and authority are documented
- [ ] Cross-references in other agents updated

## Testing
- [ ] Dashboard server still runs (`node server/dashboard.js`)
- [ ] No stray BMAD references (`grep -rn -i bmad rihal docs examples README.md server`)
- [ ] All 5-component compliance checks pass
- [ ] Manually verified the change works end-to-end

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Docs updated if needed (README, METHODOLOGY, SKILLS_INDEX)
- [ ] No breaking changes (or documented in PR description)
- [ ] Commit messages follow Conventional Commits format (see `CONTRIBUTING.md`)

## Proof of Success
Attach screenshots, GIFs, dashboard screenshots, or skill invocation examples if applicable.
