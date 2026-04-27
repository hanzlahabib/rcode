# Rihal Code — Multi-Agent Council Example

This example shows how to use the Majlis (council) for a cross-domain decision.

## Scenario

You're deciding whether to build a mobile app or a PWA for your product.

## Invoke the council

```
/rihal-council Should we build a native mobile app or a PWA for our leave tracker?
```

## What happens

1. **Raees** (orchestrator) selects relevant agents based on the question
2. Each agent provides their perspective in character:
   - **Sadiq** (strategy): Market fit, user expectations, ROI
   - **Waleed** (CTO): Technical trade-offs, maintenance cost
   - **Haitham** (frontend): Implementation complexity, PWA capabilities
   - **Layla** (UX): User experience differences, offline behavior
   - **Mariam** (marketing): Go-to-market implications
3. **Majlis** synthesizes into a recommendation with explicit dissent noted

## Sample output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 RIHAL ► COUNCIL SESSION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 Sadiq: For an Omani government ministry, mobile-first is expected.
   Users are on phones in the field. PWA might not feel "official" enough.

🏗️ Waleed: PWA covers 90% of the use case. Native adds 3x maintenance.
   Recommend PWA with app-shell caching for offline.

🎨 Layla: Push notifications and home screen install make PWA feel native.
   The UX gap has narrowed significantly.

📊 Mariam: Government clients expect "an app in the store" — perception matters.

━━━ SYNTHESIS ━━━

Recommendation: PWA with store listing via TWA (Trusted Web Activity)
Consensus: 4/5 agree
Dissent: Mariam notes perception risk with government stakeholders
```

## Decision logged

The council decision is automatically saved to `.rihal/decisions.jsonl` and can be browsed with `/rihal-decisions`.
