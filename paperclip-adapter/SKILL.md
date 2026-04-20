---
name: paperclip-adapter
description: |
  Hermes ↔ Paperclip adapter for JCPaid company generation.
  Generates full AI companies in Paperclip from a single prompt.
  Use when: user says "build me a lead gen company", "create an SEO agency", etc.
  Maps: Hermes brain → Paperclip DB → Running company with agents.
compatibility: Created for Zo Computer
metadata:
  author: josephv.zo.computer
  version: 1.0.0
---

# Paperclip Adapter — JCPaid Company Generator

## What It Does

Generates a complete AI company in Paperclip from a single prompt.

```
User: "Build me a $300/mo lead gen company"
    → Hermes designs the company structure
    → paperclip-adapter writes to Paperclip DB
    → Paperclip instantiates all agents
    → JackConnect dashboard monitors
```

## Architecture

```
Hermes (JCPaid brain)
    │
    ├── designs company: roles, skills, budget, goals
    │
    ▼
paperclip-adapter (Python)
    │
    ├── writes to Paperclip PostgreSQL DB
    │   ├── companies table
    │   ├── agents table
    │   ├── goals table
    │   ├── company_skills table
    │   └── budget_policies table
    │
    └── Paperclip API (port 3100) takes over orchestration
```

## Quick Start

```bash
# 1. Start Paperclip
cd /home/workspace/paperclip
pnpm dev:server

# 2. Generate a lead gen company
python3 /home/workspace/Skills/paperclip-adapter/scripts/generate_company.py \
  --type lead-gen \
  --name "Jack's Lead Machine" \
  --budget 300

# 3. Monitor at http://localhost:3100
```

## Company Templates

| Type | Price | Agents | Skills |
|------|-------|--------|--------|
| `seo-audit` | $150/mo | CEO, SEO Specialist, Content Writer | seo-audit, keyword-research, content-gen |
| `lead-gen` | $300/mo | CEO, Lead Researcher, Cold Email Writer, CRM Manager | linkedin-scrape, cold-email, crm-update |
| `cold-email` | $200/mo | CEO, Email Strategist, Copywriter, Deliverability Specialist | email-strategy, copywrite, warmup |
| `cma-report` | $75/mo | CMA Agent | cma-template, comparables-analysis |
| `market-report` | $100/mo | Market Analyst | market-data, trend-analysis, visualization |

## Database Schema Used

```sql
-- Each company = one JCPaid client or service
INSERT INTO companies (name, mission) VALUES ('Lead Gen Co', 'Generate 50 qualified leads/month');

-- Agents with roles and budgets
INSERT INTO agents (company_id, name, role, adapter_type, budget_policy)
VALUES (company_uuid, 'Lead Scout', 'researcher', 'openclaw', budget_policy_id);

-- Company goals
INSERT INTO goals (company_id, goal_type, description, target_date)
VALUES (company_uuid, 'monthly', 'Generate 50 qualified leads', DATE_TRUNC('month', NOW()) + INTERVAL '1 month');

-- Skills per company
INSERT INTO company_skills (company_id, name, config_json)
VALUES (company_uuid, 'linkedin-scrape', '{"query": "real estate investors", "limit": 100}');
```

## For JackConnect

Each JackConnect job type maps to a Paperclip company template:

```
JackConnect service
    │
    ├── seo-audit     → Paperclip "SEO Company" template
    ├── lead-gen     → Paperclip "Lead Gen Company" template
    ├── cold-email    → Paperclip "Email Agency" template
    ├── cma-report    → Paperclip "CMA Agent" template
    └── social-content → Paperclip "Social Agency" template
```

When JackConnect scales, we can offer:
- "Run your own Lead Gen Company" = Paperclip instance with full company
- "Solomon OS manages it" = Hermes watches and optimizes

## Status

SKILL ✅ — Paperclip cloned at /home/workspace/paperclip/
DB schema mapped, adapter script ready to build

---
*Last updated: 2026-04-20*