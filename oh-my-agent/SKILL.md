---
name: oh-my-agent
description: Portable Multi-Agent Harness — 19 specialized agents (frontend, backend, architecture, QA, PM, DB, debug). Works with Claude Code, Cursor, Codex, Gemini CLI. Use for complex multi-domain builds, architecture reviews, and parallel agent orchestration.
metadata:
  author: josephv.zo.computer
  compatibility: Created for Zo Computer
---

# oh-my-agent Integration for Solomon OS

## What It Is
`oh-my-agent` (OMA) = 19 specialized sub-agents. Each knows its domain deeply.

## Quick Reference
```bash
cd /home/workspace/oh-my-agent
bunx oh-my-agent@latest
```

| Command | When to Use |
|---------|-------------|
| `/brainstorm <idea>` | Free-form ideation |
| `/architecture <feature>` | ADR/ATAM architecture review |
| `/plan <feature>` | PM breaks down into tasks |
| `/work` | Multi-agent execution |
| `/orchestrate` | Spawn agents in parallel |
| `/ultrawork` | 5-phase quality workflow |
| `/review` | Security + performance audit |

## Key Agents
- `oma-architecture` — tradeoffs, ADR/ATAM analysis
- `oma-backend` — APIs in Python/Node.js/Rust
- `oma-db` — schema, migrations, indexing, vectors
- `oma-debug` — root cause + regression tests
- `oma-frontend` — React/Next.js, shadcn/ui
- `oma-pm` — task breakdown, API contracts
- `oma-qa` — OWASP security review
- `oma-scm` — Git workflow, Conventional Commits

## Status
✅ Installed at `/home/workspace/oh-my-agent/`
✅ Available via `bunx oh-my-agent@latest`
🔄 Integrate into Hermes skills registry
