# Rule: Keyword Strategy

## When to Run
After deep research completes and user approves (or solo yolo auto-continues)

## Step 1 — Build Keywords.txt
Extract ALL keywords from research/02-keyword-research.md
Format: comma-separated, one line, saved to `/keywords.txt`

```bash
# Extract and deduplicate all keywords from research file
grep -E "^\|" research/02-keyword-research.md | \
  grep -v "Keyword\|---\|keyword" | \
  awk -F'|' '{print $2}' | \
  sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//' | \
  grep -v "^$" | grep -v "^[0-9]*$" | \
  sort -u | tr '\n' ',' | sed 's/,$/\n/' > keywords.txt
```

**Tell user:**
"Keywords saved to keywords.txt — please paste into Google Keyword Planner:
1. Go to ads.google.com → Tools → Keyword Planner
2. Click 'Discover new keywords' → 'Enter keywords manually'
3. Paste the contents of keywords.txt
4. Download CSV with Volume, CPC, Competition columns
5. Share the CSV here and I'll re-prioritize the article schedule"

## Step 2 — If CSV Provided (Preferred Path)
Parse CSV with these columns:
- Keyword, Volume, CPC, AVG DA, Weakspot, Golden Score, Intent, Trending

**Priority sort algorithm:**
```python
# Step 1: Filter to AVG DA < 55 (beatable without backlinks)
# Step 2: Sort by Weakspot DESC (more weak pages = easier)
# Step 3: Within same Weakspot tier, sort by Volume DESC
# Step 4: Flag Trending=true keywords with ⭐
# Step 5: Put Golden Score > 1.5 keywords in priority tier
```

**Article Schedule Tiers:**
- Tier 1: AVG DA < 45, any Weakspot → Publish Month 1 (no backlinks needed)
- Tier 2: AVG DA 45-55, Weakspot ≥ 2 → Publish Month 1-2
- Tier 3: AVG DA 55-65, Weakspot ≥ 1 → Publish Month 3-4
- Tier 4: AVG DA 65-75, any → Publish Month 4-5 (need some authority)
- Tier 5: AVG DA 75+, high volume → Money pages, Publish Month 6+

## Step 3 — If No CSV (Fallback Path)
Use browser tool to manually check top 10 SERPs for top 30 keywords:
- Note if top results are: big brands (bad) vs small blogs (good)
- Check Moz or Ahrefs toolbar data if visible
- Estimate DA based on: site type, content depth, known brand recognition

## Step 4 — Generate article-schedule.md
Save to `docs/article-schedule.md` with exact format:
```markdown
| # | Title | Keyword | DA | Vol | Weak | Score | Type |
```

Each article must have:
- Exact target keyword
- Suggested URL slug
- Article type (Review/Comparison/How-To/Use-Case/FAQ/Roundup)
- Target publish month
- Why it ranks without backlinks (1 sentence)

## Step 5 — Identify Top 5 "First Week" Articles
These go live in Week 1-2 for fastest sandbox exit signals:
1. One troubleshoot/panic search (Reddit/forums dominate SERP)
2. One specific model review (retailer pages only, zero affiliates)
3. One comparison nobody wrote (brand A vs brand B gap)
4. One question-based article (PAA box with weak answers)
5. One use-case article (health condition + product recommendation)

## Copy Keywords to Clipboard
Always run at end:
```bash
cat keywords.txt | clip.exe  # WSL
# or
cat keywords.txt | pbcopy    # Mac
```
Tell user: "Keywords copied to clipboard — paste into Google Ads Planner now"
