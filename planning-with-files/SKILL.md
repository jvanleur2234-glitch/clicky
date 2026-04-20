---
name: planning-with-files
description: Manus-style 3-file planning (task_plan.md/findings.md/progress.md) for complex multi-step tasks. Use for any JackConnect feature that takes more than 5 steps to build.
---
# planning-with-files — Manus-Style 3-File Planning

## What It Is
- 3-file system for complex agentic tasks
- `task_plan.md` — What to do, step by step
- `findings.md` — Research and discoveries
- `progress.md` — What was completed, what's blocked

## Why It Matters for JackConnect
Every complex feature (Stripe billing, multi-agent routing, etc.) gets planned using this system. Zo reads task_plan.md, executes, updates progress.md.

## Pattern
```
Task received
  → Create task_plan.md (breakdown)
  → Create findings.md (research)
  → Create progress.md (0% done)
  → Execute step 1 → update progress.md
  → Execute step 2 → update progress.md
  → Done → delete plan files
```

## Status
Cloned: /home/workspace/Skills/planning-with-files/
Recommendation: INTEGRATE — adopt as standard for all JackConnect complex builds
