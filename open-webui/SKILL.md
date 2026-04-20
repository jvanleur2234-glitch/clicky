---
name: open-webui
description: Self-hosted AI chat interface — ChatGPT alternative fully on your server. Connects to Ollama, OpenAI, Groq, Google AI, Azure. Use when JackConnect clients need a branded chat UI for their AI workers.
metadata:
  author: josephv.zo.computer
  compatibility: Created for Zo Computer
---

# Open WebUI Integration for Solomon OS

## What It Is
Open WebUI = self-hosted ChatGPT. Fully on your server, connects to Ollama on port 11434.

## Quick Start
```bash
cd /home/workspace/Skills/open-webui
docker compose up -d
# OR: pip install open-webui && open-webui serve
```

## JackConnect Integration
Client signs up → gets Open WebUI access connected to their own Ollama worker instance.

## Status
✅ Cloned at `/home/workspace/Skills/open-webui/`
🔄 Docker setup for Zo server
🔄 Branded theme for JackConnect
