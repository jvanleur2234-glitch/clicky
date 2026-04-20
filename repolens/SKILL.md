---
name: repolens
description: Multi-lens code audit tool with 280 AI agents across 27 domains. Can become centerpiece of AI staffing agency offering.
compatibility: Created for Zo Computer
metadata:
  author: josephv.zo.computer
---

# RepoLens — Multi-Lens Code Audit Tool

## What It Does

280 AI agents across 27 domains for code review, security scanning, and DevOps automation. Test against Solomon OS codebase with --dry-run first.

## Key Features

- 280 specialized agents across 27 categories
- Code review, security scanning, DevOps automation
- --dry-run mode for testing
- Maps to AI staffing agency: code audit service = $150/job

## For JackConnect

JackConnect service offering: "Code Audit" — $150/job
- Pull repo → run repolens → deliver report
- Hermes skill: `jackconnect audit <repo_url>`

## Installation

```bash
git clone https://github.com/QuiltFlow/repolens /home/workspace/Skills/repolens
cd /home/workspace/Skills/repolens
pip install -e .
repolens --help
```

## Status

SKILL ✅ — Cloned to Skills/repolens