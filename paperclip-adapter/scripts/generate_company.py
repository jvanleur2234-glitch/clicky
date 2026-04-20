#!/usr/bin/env python3
"""
generate_company.py — Paperclip Company Generator for JCPaid

Usage:
    python3 generate_company.py --type lead-gen --name "Jack's Leads" --budget 300
    python3 generate_company.py --type seo-audit --name "SEO Pro" --budget 150
    python3 generate_company.py --type cold-email --name "Email Machine" --budget 200
"""

import argparse
import uuid
import json
import sys
from datetime import datetime, timedelta

# Company templates mapped to JackConnect services
COMPANY_TEMPLATES = {
    "lead-gen": {
        "name": "Lead Gen Company",
        "mission": "Generate qualified leads for clients on demand",
        "agents": [
            {"name": "Lead Scout", "role": "researcher", "adapter": "openclaw",
             "prompt": "Search LinkedIn and web for potential clients matching the target ICP. Extract name, email, company, title. Output a CSV of 50 leads."},
            {"name": "Lead Wrangler", "role": "enricher", "adapter": "openclaw",
             "prompt": "Take raw leads and enrich with company data, verify emails, score lead quality. Return cleaned CSV."},
            {"name": "Cold Email Writer", "role": "copywriter", "adapter": "claude-code",
             "prompt": "Write personalized cold emails for each lead. Subject line + body. Follow the JackConnect email framework."},
            {"name": "CRM Manager", "role": "ops", "adapter": "bash",
             "prompt": "Update CRM with all leads, tag by quality score, schedule follow-up tasks."},
        ],
        "skills": ["linkedin-scrape", "email-verification", "cold-email-template", "crm-update"],
        "budget_per_agent": 75,
    },
    "seo-audit": {
        "name": "SEO Audit Company",
        "mission": "Deliver comprehensive SEO audits that drive ranking improvements",
        "agents": [
            {"name": "SEO Analyst", "role": "analyst", "adapter": "openclaw",
             "prompt": "Crawl the target website. Analyze technical SEO, on-page factors, backlinks, Core Web Vitals. Output findings as structured JSON."},
            {"name": "Keyword Hunter", "role": "researcher", "adapter": "openclaw",
             "prompt": "Research keyword opportunities for the target site's pages. Find high-volume, low-competition terms."},
            {"name": "Content Strategist", "role": "planner", "adapter": "claude-code",
             "prompt": "Create content briefs for each target keyword. Include headings, word count, internal linking suggestions."},
        ],
        "skills": ["seo-crawl", "keyword-research", "content-brief", " Screaming Frog integration"],
        "budget_per_agent": 50,
    },
    "cold-email": {
        "name": "Cold Email Company",
        "mission": "Run full cold email campaigns that get replies",
        "agents": [
            {"name": "Audience Researcher", "role": "researcher", "adapter": "openclaw",
             "prompt": "Build a target list based on ICP. Find 100 decision-makers at companies matching criteria."},
            {"name": "Email Strategist", "role": "planner", "adapter": "claude-code",
             "prompt": "Design the email strategy: angle, pain points, social proof to use, offer framing."},
            {"name": "Copywriter", "role": "copywriter", "adapter": "claude-code",
             "prompt": "Write email sequences (3 emails). Subject lines, preview text, body. Each under 150 words."},
            {"name": "Deliverability Manager", "role": "ops", "adapter": "bash",
             "prompt": "Check domain reputation, warm up new sending domains, configure SPF/DKIM/DMARC."},
        ],
        "skills": ["linkedin-scrape", "email-strategy", "copywrite", "email-warmup", " SPF配置"],
        "budget_per_agent": 50,
    },
    "cma-report": {
        "name": "CMA Report Company",
        "mission": "Generate accurate comparative market analyses for real estate",
        "agents": [
            {"name": "CMA Specialist", "role": "analyst", "adapter": "openclaw",
             "prompt": "Pull comparables from MLS/public records for the subject property. Apply adjustments for size, age, location, condition."},
        ],
        "skills": ["cma-template", "comparables-analysis", " MLS integration"],
        "budget_per_agent": 75,
    },
    "market-report": {
        "name": "Market Report Company",
        "mission": "Deliver real-time market intelligence reports",
        "agents": [
            {"name": "Market Analyst", "role": "analyst", "adapter": "openclaw",
             "prompt": "Gather market data: median prices, inventory, days on market, trend lines. Compare to prior period."},
            {"name": "Visualizer", "role": "designer", "adapter": "claude-code",
             "prompt": "Create charts and visualizations for the report. Use Chart.js or Matplotlib."},
        ],
        "skills": ["market-data", "trend-analysis", "visualization", " Chart.js"],
        "budget_per_agent": 50,
    },
}


def generate_company_manifest(company_type: str, name: str, budget: int) -> dict:
    """Generate the company manifest that would be written to Paperclip DB."""
    if company_type not in COMPANY_TEMPLATES:
        print(f"ERROR: Unknown company type: {company_type}")
        print(f"Available types: {list(COMPANY_TEMPLATES.keys())}")
        sys.exit(1)

    template = COMPANY_TEMPLATES[company_type]
    budget_per = template["budget_per_agent"]
    num_agents = len(template["agents"])

    manifest = {
        "id": str(uuid.uuid4()),
        "name": name,
        "type": company_type,
        "mission": template["mission"],
        "created_at": datetime.utcnow().isoformat(),
        "budget": {
            "total_monthly": budget,
            "per_agent": budget_per,
            "num_agents": num_agents,
            "remaining": budget - (budget_per * num_agents),
        },
        "agents": [
            {
                "id": str(uuid.uuid4()),
                "name": a["name"],
                "role": a["role"],
                "adapter": a["adapter"],
                "prompt": a["prompt"],
                "budget_monthly": budget_per,
            }
            for a in template["agents"]
        ],
        "skills": template["skills"],
        "goals": [
            {
                "id": str(uuid.uuid4()),
                "description": f"Execute {company_type} work for one client this month",
                "target_date": (datetime.utcnow() + timedelta(days=30)).isoformat(),
                "status": "active",
            }
        ],
    }
    return manifest


def print_manifest(manifest: dict):
    print("=" * 60)
    print(f"COMPANY MANIFEST: {manifest['name']}")
    print(f"Type: {manifest['type']} | Budget: ${manifest['budget']['total_monthly']}/mo")
    print("=" * 60)
    print(f"Mission: {manifest['mission']}")
    print()
    print("AGENTS:")
    for agent in manifest["agents"]:
        print(f"  [{agent['role']}] {agent['name']} ({agent['adapter']}) - ${agent['budget_monthly']}/mo")
    print()
    print("SKILLS:")
    for skill in manifest["skills"]:
        print(f"  - {skill}")
    print()
    print("GOALS:")
    for goal in manifest["goals"]:
        print(f"  - {goal['description']} (by {goal['target_date']})")
    print()


def main():
    parser = argparse.ArgumentParser(description="Generate a Paperclip AI company")
    parser.add_argument("--type", "-t", required=True,
                        choices=list(COMPANY_TEMPLATES.keys()),
                        help="Company type (maps to JackConnect service)")
    parser.add_argument("--name", "-n", required=True,
                        help="Company name")
    parser.add_argument("--budget", "-b", type=int, required=True,
                        help="Monthly budget in dollars")
    parser.add_argument("--dry-run", action="store_true",
                        help="Print manifest without writing to DB")
    parser.add_argument("--output", "-o",
                        help="Write manifest to JSON file")
    args = parser.parse_args()

    manifest = generate_company_manifest(args.type, args.name, args.budget)
    print_manifest(manifest)

    if args.output:
        with open(args.output, "w") as f:
            json.dump(manifest, f, indent=2)
        print(f"\nManifest written to: {args.output}")

    if args.dry_run:
        print("\n[DRY RUN] No changes written to Paperclip DB.")
        print("To instantiate, run without --dry-run and ensure Paperclip is running.")
    else:
        print("\n[DRY RUN] DB write disabled — Paperclip server not running in this environment.")
        print("To deploy: run Paperclip (cd /home/workspace/paperclip && pnpm dev:server)")
        print("Then re-run without --dry-run.")


if __name__ == "__main__":
    main()