# Rule: Yolo Mode — Full Autonomous Execution

## Trigger Phrases
User says any of:
- "yolo"
- "do all the work and report after you finish"
- "do everything and report back"
- "do it all"
- "handle everything"
- "just do everything"
- "report when done"

## NOT Triggers (do NOT activate yolo on these)
- "solo yolo" — this was a one-off phrase, not a real trigger
- "run autonomously" — too vague, ask for clarification
- "full auto" — ask: "Do you mean yolo mode (full autonomous, report when done)?"

## What Changes in Yolo Mode

### Decision Rules (No User Approval Needed)
| Decision | Yolo Behavior |
|----------|-------------------|
| Niche selection | Auto-pick #1 scored niche |
| Domain name | Auto-pick top recommendation |
| Research findings | Continue without showing intermediate results |
| Article schedule | Auto-finalize based on DA + Weakspot sort |
| Site tech stack | Always use Next.js 16.2.1 + Velite |
| Content stubs | Generate all Tier 1+2 stubs automatically |
| BMAD install | Install automatically |

### What Yolo NEVER Skips
Even in full auto mode, always:
1. **Save all research files** — every agent writes its output file
2. **Generate keywords.txt** — user needs this for Ads Planner
3. **Tell user about keywords.txt** — they must manually run Ads Planner
4. **Create image-prompt files** — user generates images separately
5. **Report completion** — final summary of everything created

### Announcement at Start
When yolo is triggered, say:
```
🔴 YOLO MODE ACTIVATED

I will now run the complete workflow autonomously:
✓ Pick best niche automatically
✓ Launch 10 research agents in parallel
✓ Build complete master business plan
✓ Generate article schedule from keyword data
✓ Create all content stubs + image prompts
✓ Init Next.js site + install BMAD

I'll only stop if I hit a critical blocker.
Two things you'll need to do manually:
1. Paste keywords.txt into Google Keyword Planner
2. Generate images from the prompt files

Starting now...
```

## Yolo Execution Flow

```
1. Run niche discovery
   → Score all candidates
   → Pick #1 automatically
   → Announce: "Selected: [Niche] (Score: XX/35)"

2. Create project directory
   → /home/hanzla/development/[niche-slug]/

3. Launch ALL 10 research agents simultaneously
   → Announce each agent as it completes (1-line summary)

4. Fire synthesis agent
   → Wait for master plan

5. Extract + save keywords.txt
   → Copy to clipboard

6. Parse keyword data (if CSV exists)
   → OR use research data directly

7. Generate article-schedule.md
   → 50+ articles, Tier 1-5

8. Generate MDX stubs (Tier 1+2 articles)
   → All frontmatter filled

9. Generate image-prompt files
   → One per article

10. Init Next.js project
    → Full structure

11. Install BMAD

12. Create CLAUDE.md

13. Final report:
"✅ SOLO YOLO COMPLETE

Project: [domain].com
Location: /home/hanzla/development/[slug]/
Articles planned: [N]
Stubs created: [N]
Image prompts: [N] files in assets/image-prompts/

YOUR ACTIONS NEEDED:
1. 📊 Keywords in keywords.txt → paste into Google Keyword Planner
2. 🖼️ Generate images from assets/image-prompts/ files
3. 🚀 Open BMAD: bmad/core/agents/bmad-master.md

Research: research/00-MASTER-BUSINESS-PLAN.md"
```

## Yolo Blocker Conditions
STOP and ask user only if:
- All top 10 niches score below 18/35 (market is oversaturated)
- No affiliate programs found for selected niche
- Domain name ideas all appear taken
- Research agents return empty/error results 3+ times

## Continue with Next Idea
After completing one full workflow, if more niches exist in the queue:

**Interactive:** "Research complete for [Niche 1]. Want me to research [Niche 2] next?"
**Yolo:** Automatically start next niche research, announce: "Starting research for Niche #2: [Name]..."
