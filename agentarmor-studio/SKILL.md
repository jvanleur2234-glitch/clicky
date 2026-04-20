---
name: agentarmor-studio
description: 8-layer security framework for AI agents. Protects against prompt injection, tool poisoning, context manipulation, MITRE ATLAS agentic AI threats. OWASP LLM Top 10 aligned. Install guard-scanner on Hermes skill install.
compatibility: Created for Zo Computer
metadata:
  author: josephv.zo.computer
---

# AgentArmor Studio — 8-Layer Security for AI Agents

Source: github.com/Agastya910/agentarmorstudio

## Layers
1. Input validation + sanitization
2. Output filtering + hallucination detection
3. Context isolation
4. Memory protection
5. Tool invocation monitoring
6. Rate limiting + anomaly detection
7. Agent-to-agent authentication
8. Audit logging + rollback

## For Solomon Guardian
Install guard-scanner on every new Hermes skill:
```bash
npx agentarmor scan --agent hermes
```

## MITRE ATLAS Alignment
Covers: LLM01-LLM10 (prompt injection, data exfil, poisoning, supply chain, vector attacks)