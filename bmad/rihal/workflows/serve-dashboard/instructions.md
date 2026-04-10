# Serve Dashboard Workflow

Start the view-only Majlis dashboard server.

<workflow>

<step n="1" goal="Precondition">
<check if=".rihal/ directory doesn't exist">
  <action>Inform user: "No state found. Run *kickoff first."</action>
  <action>Halt.</action>
</check>
</step>

<step n="2" goal="Check if already running">
<action>Test: `curl -s http://localhost:7717/health`</action>
<check if="server responds">
  <action>Inform user: "Dashboard already running. Open http://localhost:7717"</action>
  <action>Halt.</action>
</check>
</step>

<step n="3" goal="Start server">
<action>Run: `node {project-root}/server/dashboard.js &`</action>
<action>Wait 2 seconds for startup</action>
<action>Verify: `curl -s http://localhost:7717/health`</action>
</step>

<step n="4" goal="Show URL">
<action>Inform user:
"🕌 Majlis is ready.
Dashboard: http://localhost:7717
The server auto-refreshes every 5 seconds by re-reading .rihal/
It is view-only. All edits happen through workflows.
Stop with: kill $(lsof -t -i:7717)"
</action>
</step>

<step n="5" goal="Optional: auto-open browser">
<ask>Open in browser now? (y/n)</ask>
<check if="yes">
  <action>Run: `xdg-open http://localhost:7717` (or `open` on Mac)</action>
</check>
</step>

</workflow>
