---
name: cli-anything-web
description: Generate production-grade Python CLIs from any website by capturing live HTTP traffic. Use browser-use to browse the site, capture API calls, analyze endpoints, and generate a complete Click-based CLI with auth, REPL, --json output, and tests. Activate when Joseph asks to "build a CLI for [website]", "reverse engineer [site]", or "make an agent tool for [service]".
compatibility: Created for Zo Computer
metadata:
  author: josephv.zo.computer
---

# CLI-Anything-Web Skill

Generates production Python CLIs from any web application by capturing live HTTP traffic.

## When to Use

Activate when you see requests like:
- "Build a CLI for [website]"
- "Reverse engineer [site] API"
- "Make an agent tool for [service]"
- "Create a command-line tool for [app]"

## Core Workflow

### Phase 1: Capture
1. Use `browser-use` or `camofox` to navigate to the target URL
2. Capture HTTP traffic during user interactions
3. Save traffic to `traffic-capture/raw-traffic.json`

### Phase 2: Analyze & Generate
1. Analyze traffic patterns (REST, GraphQL, batchexecute, SSR)
2. Detect auth requirements and API structure
3. Generate CLI scaffold under `cli_web/<app>/`

### Phase 3: Implement
Generate these files:
- `cli_web/<app>/core/client.py` — httpx or curl_cffi HTTP client
- `cli_web/<app>/core/auth.py` — Auth management with playwright login
- `cli_web/<app>/core/exceptions.py` — Domain exception hierarchy
- `cli_web/<app>/core/models.py` — Response models
- `cli_web/<app>/<app>_cli.py` — Click entry point with REPL
- `cli_web/<app>/commands/` — One file per resource
- `cli_web/<app>/utils/helpers.py` — Utility functions
- `cli_web/<app>/tests/` — Unit + E2E tests

### Phase 4: Validate
- Run `pip install -e .` and test
- Verify `--json` output on every command
- Test auth flow

## Key Patterns

### Exception Hierarchy (required)
```
AppError (base)
├── AuthError (recoverable)
├── RateLimitError (retry_after)
├── NetworkError
├── ServerError (status_code)
└── NotFoundError
```

### Auth Strategy
- Use `curl_cffi` with `impersonate='chrome'` for anti-bot sites
- Fall back to `httpx` for standard APIs
- Browser login (playwright) only for auth flow

### JSON Error Format
```python
{"error": true, "code": "AUTH_EXPIRED", "message": "Session expired"}
```

## Reference Files

- Full methodology: `~/.hermes/skills/cli-anything-web/HARNESS.md`
- Templates: `~/.hermes/skills/cli-anything-web/reference_templates/`
- Example CLIs: `/home/workspace/CLI-Anything-WEB/<app>/agent-harness/`

## Tech Stack

- CLI framework: Click
- HTTP client: httpx (default) or curl_cffi (anti-bot)
- HTML parsing: BeautifulSoup4
- Output: Rich (>=13.0)
- Auth: Python sync_playwright()

## Important Rules

1. Every command MUST support `--json`
2. REPL is default when no subcommand given
3. Auth credentials go in `auth.json` with `chmod 600`
4. Tests FAIL (not skip) when auth is missing
5. Use exponential backoff for polling (2s→10s)
