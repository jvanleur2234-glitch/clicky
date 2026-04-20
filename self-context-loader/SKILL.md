---
name: self-context-loader
description: Auto-detects context degradation and reloads brain files before hallucinating or running blind. Fires when Zo is about to answer something outside its known context, or when conversations get long enough that fidelity degrades. Triggers on: missing file references, low-confidence responses, long sessions without a brain-file check, or when the user asks something that requires context from SOLOMON_OS.md, recent Telegram summaries, or the task queue.
compatibility: Created for Zo Computer
metadata:
  author: josephv.zo.computer
---

# Self Context Loader

## Purpose

Prevents hallucination and context degradation by reloading brain files BEFORE answering questions that fall outside the current context window. This is a meta-cognitive skill — it monitors the conversation for signals that Zo is about to answer something it shouldn't guess at.

## Trigger Conditions

Fire automatically when ANY of these conditions are true:

1. **Low confidence signal**: The user asks something and Zo doesn't have the relevant files read yet
2. **File reference without read**: User mentions a file, project, or concept that hasn't been read in this session
3. **Long conversation drift**: 20+ messages without re-reading SOLOMON_OS.md or recent summaries
4. **New topic detection**: User introduces something completely new (new project, new person, new tool)
5. **Hallucination risk phrases**: "I think", "maybe", "probably", "I'm not sure" appearing in Zo's own output
6. **Context gap**: User references something from a previous session that isn't in the last 5 messages
7. **Technical question outside training**: User asks something that requires workspace-specific information (file paths, past decisions, project state)

## What To Do When Triggered

1. Stop and assess — don't just guess
2. Read the relevant files:
   - `/home/workspace/SOLOMON_OS.md` (always check first)
   - `/home/workspace/solomon-vault/raw/telegram_SUMMARY_latest.md` (most recent Telegram summary)
   - `/home/workspace/solomon-vault/brain/Services.md` (if services are involved)
   - `/home/workspace/MegaPlan/HERMES_CAPABILITIES.md` (if Hermes/skills are involved)
   - `/home/workspace/zo.space-tasks/task_queue.json` (if tasks are involved)
3. Confirm: "Context reloaded. Here's what I know about [topic]..."
4. If the files don't have the answer → say "I don't have that in my brain files yet. Want me to research it and add it?"
5. If GitHub sync is needed → run `/home/workspace/.agent/sync-to-github.sh`

## Signals This Is Working

- Zo says "Let me reload context" BEFORE answering, not after
- No hallucinated file paths or project names
- References to actual files in the workspace
- Clear "I don't know" when truly unknown, rather than filling the gap with guesses

## Self-Check Question

Before every complex answer, ask: "Do I actually have the files read that would let me answer this correctly?" If no → reload context first.

---

*Last updated: 2026-04-19*