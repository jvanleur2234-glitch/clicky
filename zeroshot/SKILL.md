---
name: zeroshot
description: Autonomous multi-agent coding CLI — planner + implementer + validators in loop until verified. Works with Claude Code, Codex, Gemini CLI, OpenCode. Use for complex refactors, bug fixes with validation, autonomous PR workflows.
metadata:
  author: josephv.zo.computer
  compatibility: Created for Zo Computer
---

# Zeroshot Integration for Solomon OS

## What It Is
Zeroshot = autonomous coding agent with PLANNER → IMPLEMENTER → VALIDATORS loop until verified or rejected.

```bash
npm install -g @covibes/zeroshot
zeroshot run "Add dark mode"
```

## Key Pattern: Verification Loop
```
Planner → Implementer → Validator₁ → Validator₂ → ...
     ↑                    ↓         ↓
     └──────── iterate until VERIFIED or REJECTED
```

## Status
✅ Installed globally (`npm install -g @covibes/zeroshot`)
✅ Cloned at `/home/workspace/Skills/zeroshot/`
🔄 Integrate into Solomon Bus as background worker
