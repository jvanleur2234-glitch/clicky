---
name: zo-foam
description: "Zo Foam — organized AI second brain with categories, agent tags, and experiment tracking. Joseph's personal memory system."
---

# Zo Foam — Organized AI Second Brain

## What It Does
Zo Foam is Joseph's personal memory layer — organized, categorized, and queryable. Unlike a flat dump, every piece of memory goes into a category immediately, making it fast to find anything later.

## Core Concepts

- **Organized by category** — not just chronological dumps
- **Agent color tags** — `[ZO]`, `[HERMES]`, `[RUSSELL]`, `[SOLOMON]`, `[USER]` for instant filtering
- **Experiment tracking** — document what you tried, what worked, what failed, what you learned
- **Project isolation** — each project has its own journal folder
- **No mess** — structure enforced at creation time, not retroactively

## Directory Structure

```
zo-foam/
├── dumps/
│   ├── YYYY-MM-DD.jsonl          # Daily dumps (raw, unstructured)
│   └── by-type/
│       ├── decisions/            # Key decisions
│       ├── experiments/          # Things tried
│       │   ├── success/          # Experiments that worked
│       │   └── failure/          # Experiments that didn't
│       ├── ideas/                # Half-formed ideas
│       ├── code/                 # Code created/modified
│       ├── conversations/        # Session summaries
│       ├── errors/              # Problems, failed approaches
│       └── wins/                # Victories
├── journal/
│   ├── by-project/              # Per-project journals
│   │   ├── solomon-os/
│   │   ├── arena2api/
│   │   ├── arena-intelligence/
│   │   ├── russell-tuna/
│   │   ├── zo-foam/
│   │   └── [other projects]/
│   ├── by-agent/                # Agent-specific memories
│   │   ├── zo/
│   │   ├── hermes/
│   │   ├── russell/
│   │   └── solomon/
│   ├── active/                  # Currently active projects
│   └── JOURNAL_SYSTEM.md        # System documentation
└── skills/zo-foam/              # This skill
```

## Color Coding — Agent Tags

| Agent | Tag | Meaning |
|-------|-----|---------|
| Zo (this AI) | `[ZO]` | My own work, decisions, observations |
| Hermes | `[HERMES]` | Hermes capabilities, skills, evolution |
| Russell Tuna | `[RUSSELL]` | Russell bot sessions, features |
| Solomon Bus | `[SOLOMON]` | Inter-agent events |
| Joseph | `[USER]` | Joseph's direct requests, priorities |

Every entry gets an agent tag. Always.

## Journal Entry Format

```markdown
# [AGENT] Project: Entry Title
**Date:** YYYY-MM-DD  
**Type:** decision|experiment|idea|code|conversation|error|win  
**Project:** project-name  
**Tags:** [ZO], project, topic  

## What Happened
[2-3 sentences]

## Outcome / Status
[What happened, what it means]

## Next Action
[What happens next]
```

## Experiment Tracking

Every experiment gets a structured entry in `dumps/by-type/experiments/`:

```json
{
  "id": "uuid",
  "timestamp": "ISO8601",
  "agent": "[ZO]",
  "project": "arena2api",
  "experiment": "what you tried",
  "approach": "how you tried it",
  "outcome": "success|partial|failure|unknown",
  "result": "what happened",
  "lessons": "what you learned",
  "next": "what to try next or abandon"
}
```

## Rules — Don't Get Messy

1. Every dump gets a project tag — if none fits, use `general`
2. Every experiment gets its own entry in `by-type/experiments/`
3. Success AND failure get documented — both are valuable
4. Active projects live in `journal/active/`
5. No empty entries — if you write it, make it useful
6. Joseph's requests get `[USER]` tag

## Quick Commands

```bash
# Find all experiments for a project
grep -l "arena2api" zo-foam/dumps/by-type/experiments/*.jsonl

# Find all decisions this week
grep -l "decision" zo-foam/dumps/2026-04-*.jsonl

# Find what Joseph asked for this week
grep -l "USER" zo-foam/dumps/2026-04-*.jsonl

# See active projects
cat zo-foam/journal/active/PROJECTS.md
```

## When to Use

- **Start of session:** Check `active/PROJECTS.md` to know what's hot
- **Working on a project:** Create entry in `by-project/[project]/`
- **Trying something new:** Log it in `by-type/experiments/`
- **Making a decision:** Write it to `by-type/decisions/`
- **Joseph asks something:** Tag with `[USER]`
- **Something works:** Log to `by-type/wins/`
- **Something fails:** Log to `by-type/errors/` with lessons learned

## Per-Project Foam Folders

```
journal/by-project/solomon-os/    → Business system, north star
journal/by-project/arena2api/     → API reverse-engineering
journal/by-project/arena-intelligence/ → Model rankings
journal/by-project/russell-tuna/  → Telegram bot
journal/by-project/zo-foam/       → This memory system itself
journal/by-project/wife-app/      → WifeApp v2
journal/by-project/hyrve/         → Marketplace
```

## Access Points

- **Zo (here):** Just tell me things — I organize automatically
- **Russell Tuna:** `/foam dump <text>` or `/foam recall <query>` or `/foam recent`
- **Hermes:** Same as Russell via Hermes skill interface

---

*System: Don't just dump — organize. Every entry into a category. Every experiment tracked.*