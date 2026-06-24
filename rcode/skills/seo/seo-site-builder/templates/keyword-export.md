# Keyword Export — Google Ads Planner Instructions

## Step 1 — Copy Keywords
The `keywords.txt` file in your project root contains all target keywords, comma-separated.
Copy contents to clipboard (already done automatically).

## Step 2 — Google Keyword Planner
1. Go to: https://ads.google.com
2. Click **Tools** (top nav) → **Keyword Planner**
3. Click **"Discover new keywords"**
4. Select **"Enter keywords manually"**
5. Paste your keywords (up to 10 at a time — batch if needed)
6. Set location: **United States** (or your target market)
7. Click **"Get results"**

## Step 3 — Download CSV
1. Click **"Download keyword ideas"** button
2. Choose **CSV format**
3. Save as `KeywordData.csv` in your project root

## Step 4 — Share CSV
Drop the CSV in your project or share with Claude.
Claude will parse these columns:
- `Keyword` — the keyword
- `Avg. monthly searches` → maps to Volume
- `Competition` → Low/Medium/High
- `Top of page bid (low range)` → CPC low
- `Top of page bid (high range)` → CPC high

## Step 5 — Re-prioritization
Claude will:
1. Parse the CSV
2. Cross-reference with competitor DA data from research
3. Re-sort article-schedule.md by actual volume + competition
4. Flag any keywords with CPC > $3 (high commercial value)
5. Flag any keywords trending upward

## What to Look For
| Signal | Meaning |
|--------|---------|
| Volume > 1000 + Low competition | 🟢 Priority target |
| Volume 100-1000 + Low/Medium | 🟡 Secondary target |
| Volume > 500 + CPC > $2 | 💰 High commercial value |
| Volume 0 but exists in PAA | Worth writing (zero-volume trick) |
| Trending upward | 🚀 Write immediately |
