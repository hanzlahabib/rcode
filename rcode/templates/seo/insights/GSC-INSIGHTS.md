<!-- Generated on demand from seo-gsc-striking-distance.cjs and
seo-gsc-decay.cjs output — see GSC-GROWTH-ENGINE.md for the workflow. This is
a regenerated snapshot, not a durable record; once a finding is acted on,
promote it into ACTIONS.md (durable) and/or DECISIONS.md (durable), don't
rely on this file surviving unchanged across runs. -->

# GSC Insights: {{project_name}} — {{YYYY-MM-DD}}

## Striking distance (position {{positionMin}}-{{positionMax}}, impressions >= {{minImpressions}})

| query | page | position | impressions | clicks | ctr |
|---|---|---|---|---|---|
| {{query}} | {{page, or "-" if the export had no page dimension}} | {{position}} | {{impressions}} | {{clicks}} | {{ctr}} |

## CTR gaps (actual CTR < {{ctrGapRatio}} x expected for position)

| query | page | position | impressions | ctr | expected ctr |
|---|---|---|---|---|---|
| {{query}} | {{page, or "-"}} | {{position}} | {{impressions}} | {{ctr}} | {{expectedCtr}} |

<!-- Do not assume every row here is a meta-description problem — see
GSC-GROWTH-ENGINE.md's CTR-cause checklist before recommending a fix. -->

## Cannibalization candidates (only populated when the export had a page dimension)

| query | competing pages (impressions) | total impressions |
|---|---|---|
| {{query}} | {{page A (impr), page B (impr), ...}} | {{totalImpressions}} |

<!-- A row here is a hypothesis, not a verdict — see GSC-GROWTH-ENGINE.md's
cannibalization workflow before differentiating/merging/canonicalizing/
redirecting anything. -->

## Decaying pages ({{metric}} decline <= {{declineThreshold}})

| page | current | prior | delta | hypotheses to check |
|---|---|---|---|---|
| {{page}} | {{current}} | {{prior}} | {{deltaRatio}} | {{fill in AFTER investigation — outdatedContent / strongerCompetitors / serpIntentChanged / cannibalization / lostBacklinks / aiAnswerReducedClicks / technicalProblem / seasonality — never pre-guess}} |

## Improving pages

| page | current | prior | delta |
|---|---|---|---|
| {{page}} | {{current}} | {{prior}} | {{deltaRatio}} |
