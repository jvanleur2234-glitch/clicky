---
name: lead-scout
description: Find and qualify potential SEO clients using web research + scoring. Use when you need leads for SoloSEO agency. Output: ranked list of businesses with SEO opportunity scores.
owner: SoloSEO
category: business-dev
tags: [lead-gen, seo, sales, prospecting]
created: 2026-04-20
status: active
---

# Lead Scout Agent

## What It Does

Finds local businesses with poor SEO and scores them by opportunity — how easy it would be to win them as a client and how much value we could add.

## Usage

```bash
python3 /home/workspace/Skills/lead-scout/scripts/scout.py
```

## Output

- Ranked list of top 5 leads with SEO scores
- Saved to `solomon-vault/jackconnect-leads.json`

## Lead Scoring Criteria

| Signal | Points | Why |
|--------|--------|-----|
| Local service business | +30 | High intent, needs visibility |
| No HTTPS | +15 | Easy quick win for client |
| No Google Business | +20 | Free listing = fast ranking |
| Regional name (valley, mountain, etc.) | +25 | Usually outdated SEO |

## Next Step

Take top lead → run `paperclip-adapter` to generate outreach email → send via cold-email skill.