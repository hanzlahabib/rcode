# GSC page-2 keyword gold mine

Prereq: user is logged into Google Search Console in Chrome. Claude reads it via the Claude
Chrome extension or browser-harness (the user's own session — never enter credentials).

```
Use my logged-in Google Search Console tab. Pull my query/page performance data.

Build a "page-2 gold mine" list with these filters:
- average position between 8 and 20
- has impressions
- query is NOT branded
- query has commercial or transactional intent
Sort by impressions, take the top 20.

For each of the top 20, open the URL currently ranking and do a forensic audit:
- keyword in title tag? in H1? in first 100 words?
- current word count vs the avg of the top-5 ranking pages for that query
- internal links pointing to this page (count)
- current meta description
- schema present on the page?

Then for each, REWRITE: new title tag and new meta description.

Finally, produce a 30-day sprint: week-by-week, each fix as current state → new state,
with a short rule set for execution.
```
