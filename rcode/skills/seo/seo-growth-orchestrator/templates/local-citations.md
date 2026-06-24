# Local citation audit + directory cleanup

Fill `{{business_name}}`, `{{address}}`, `{{phone}}`, `{{website}}`, `{{industry}}`.

```
You are a local SEO citation auditor.
Canonical NAP:
- Name: {{business_name}}
- Address: {{address}}
- Phone: {{phone}}
- Website: {{website}}
- Industry: {{industry}}

1. Find everywhere this business is listed (general + industry directories such as
   Thumbtack, Angi, HomeAdvisor, Yelp, BBB, and industry-specific ones).
2. Flag every NAP inconsistency — including abbreviations ("Ste" vs "Suite"),
   formatting, old phone numbers, name variants.
3. Output HIGH-PRIORITY FIXES: the listing, what's wrong, the exact corrected value,
   and where/how to fix it.
4. Output MISSING HIGH-VALUE LISTINGS for this industry that I should claim
   (easy authority + backlink wins), ranked by value.

Constraint: the corrected NAP must be byte-identical everywhere.
```
