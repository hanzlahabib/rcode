<!-- Machine-readable action queue, promoted from STATE.md's freeform "Next
recommended actions" list (see PORTFOLIO-MANAGEMENT.md and ACTION-QUEUE.md).
Populated and read via seo-action-queue.cjs `add`/`list` — do not hand-edit
the column names or row order; editing an existing row's field VALUES
directly is fine. -->
<!-- Dedupe key: normalized (project, url, issue). ANY existing row for that
key blocks a plain duplicate `add`, regardless of its status — including
DONE and REJECTED, since those are exactly "already implemented" / "already
declined". Pass --reopen plus a required --reopenReason to intentionally
re-propose the same key anyway; see ACTION-QUEUE.md. -->

# SEO Action Queue

| project | url | issue | evidence | action | priority | effort | expectedEffect | status | created | lastReviewed |
|---|---|---|---|---|---|---|---|---|---|---|
