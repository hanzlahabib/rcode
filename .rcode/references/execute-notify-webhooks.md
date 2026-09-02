# execute.md — notify_on_completion (webhook notifications)

Extracted from `execute.md`'s `notify_on_completion` step. Only loaded when a webhook URL is configured — see the conditional include at that point in `execute.md`.

**Post phase completion to configured webhooks (Slack / Discord / MS Teams).**

```bash
node ".rcode/bin/rcode-tools.cjs" notify send \
  --title "Phase ${phase_number} complete — ${phase_name}" \
  --body "$(basename "$PWD") · $(git rev-parse --short HEAD) · ${incomplete_count:-0} plan(s) remaining" \
  --event "execute-done" 2>/dev/null || true
```

Users configure webhooks by editing `.rcode/config.yaml`:

```yaml
slack_webhook_url: "https://hooks.slack.com/services/..."
discord_webhook_url: "https://discord.com/api/webhooks/..."
teams_webhook_url: "https://outlook.office.com/webhook/..."
```

Then verify with `/rcode-notify-test`.
