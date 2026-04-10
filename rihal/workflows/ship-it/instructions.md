# Ship It Workflow

<workflow>

<step n="1" goal="Release gate">
<action>Load fatima.qa.agent.md</action>
<action>Invoke *gate command</action>
<check if="verdict is NO-GO">Halt. Fix blockers first.</check>
</step>

<step n="2" goal="Pre-deploy checks">
<action>Load khalid.devops.agent.md</action>
Verify:
☐ All tests pass on main branch
☐ Build succeeds
☐ Security scan clean
☐ Staging smoke tests pass
☐ Rollback plan documented
☐ Monitoring dashboards ready
</step>

<step n="3" goal="Deploy">
<action>Execute deploy command for chosen platform</action>
<action>Tail logs during deploy</action>
</step>

<step n="4" goal="Post-deploy verification">
<action>Run production smoke tests</action>
<action>Check golden signals for 10 minutes</action>
<check if="error rate spikes OR latency degrades">
  <action>Execute rollback immediately</action>
  <action>Load khalid *incident to manage</action>
</check>
</step>

<step n="5" goal="Announce">
<action>Load noor.scribe.agent.md</action>
<action>Generate:
  - Internal Slack announcement
  - Changelog entry
  - User-facing release note
</action>
</step>

<step n="6" goal="Update state">
<action>Update .rihal/state.json:
  - Last deploy: {timestamp}
  - Version: {version}
  - Deployer: {user}
</action>

<action>Append to .rihal/progress/deploys.md</action>
</step>

</workflow>
