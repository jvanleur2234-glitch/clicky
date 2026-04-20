---
name: mrholmes
description: OSINT tool for lead research. Search by username, email, phone, domain across 50+ sites. For JackConnect lead-gen — find decision-maker contact info automatically.
compatibility: Created for Zo Computer
metadata:
  author: josephv.zo.computer
---

# Mr.Holmes — OSINT Lead Research Tool

Source: github.com/Lucksi/Mr.Holmes

## What It Does
- Username search across 50+ social platforms
- Email lookup (haveibeenpwned, hunter.io)
- Phone number reconnaissance
- Domain reconnaissance (WHOIS, DNS, subdomains)

## For JackConnect Lead Gen
When Jack needs new real estate leads, Mr.Holmes + lead-gen skill = automated contact discovery. Find decision-maker emails, phone numbers, social profiles.

## Quick Start
```bash
git clone https://github.com/Lucksi/Mr.Holmes
cd Mr.Holmes && bash install.sh
python3 MrHolmes.py
```

## Hermes Integration
Add `mrholmes search --email {lead_email}` to lead-gen workflow.