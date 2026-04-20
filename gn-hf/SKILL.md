---
name: gn-hf
description: Iteration engine that iterates on code overnight with success/commit or failure/rollback. Gn hf pattern maps to Solomon Bus overnight worker loop.
compatibility: Created for Zo Computer
metadata:
  author: josephv.zo.computer
---

# gn hf — Iteration Engine

## What It Does

Iteration engine that builds code overnight. Pattern: commit on success, rollback on failure, notes.md tracks all iterations.

## How It Works

```
PRD file → iterate → progress.txt → notes.md
     ↑_________________________________↓
              (loop)
```

1. Read task from task_queue.json
2. Attempt implementation  
3. If works: commit + move progress.txt forward
4. If fails: rollback + log in notes.md
5. Next morning: review notes.md + continue

## For Solomon Bus

The gn hf pattern maps directly to Solomon Bus overnight loop:
- Worker picks up task at end of day
- Iterates while you sleep  
- Commits working version in the morning
- Logs failures with context for review

## Key Pattern: notes.md

Every iteration gets logged in notes.md:
```
### Iteration 1 (2026-04-20 01:45)
Tried: Full refactor of job queue
Result: FAILED — breaking change in Postgres SKIP LOCKED
Fix: Revert to simple JSON file approach

### Iteration 2 (2026-04-20 02:30)  
Tried: JSON file with dequeue lock
Result: SUCCESS — clean queue operations
```

## Usage

```bash
# Start overnight iteration on task
job submit "gn hf --task seo-audit-v2 --notes"

# Check morning status  
cat /dev/shm/gn-hf/notes.md
```

## Status

SKILL ✅ — For implementation in Solomon Bus overnight worker