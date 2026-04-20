---
name: awesome-selfhosted
description: Curated directory of 500+ self-hosted apps for Solomon OS integrations. Maps category → service → JackConnect offering.
compatibility: Hermes Agent, Solomon OS
metadata:
  author: josephv.zo.computer
  source: github.com/awesome-selfhosted/awesome-selfhosted
  stars: 178K
  license: GPL-3.0
  categories: 100+
  entries: 500+
---

# Awesome-Selfhosted — Solomon OS Integration

Maps every category of self-hosted software → Solomon OS JackConnect service offering.

## How to Use

When a client needs a capability, search this skill:
1. Find the category
2. Match to a JackConnect service type
3. Generate the implementation using the reference app

## Categories → JackConnect Services

### Communication
| Category | Reference Apps | JackConnect Service |
|----------|--------------|-------------------|
| Email - Complete | MailCow, Docker Mailserver | cold-email |
| Video Conferencing | Jitsi Meet, LiveKit | social-content (content automation) |
| IRC / XMPP | Conduit, Mattermost | - |
| SIP / VoIP | Asterisk, FreeSWITCH | solomon-air |
| Social Networks | Mastodon, Lemmy | social-content |

### Business Operations
| Category | Reference Apps | JackConnect Service |
|----------|--------------|-------------------|
| CRM | EspoCRM, Twenty CRM | lead-gen |
| Project Management | Plane, Vikunja | project-management |
| CRM + ERP | ERPNext, Dolibarr | lead-gen + cma-report |
| Ticketing | osTicket, Peppermint | lead-gen (qualification) |
| Invoicing | Invoice Ninja,病死 | cold-email (follow-up) |

### Content & Media
| Category | Reference Apps | JackConnect Service |
|----------|--------------|-------------------|
| CMS | WordPress, Ghost | seo-audit |
| Blogging | WriteFreely, HUGO | social-content |
| Wikis | Wiki.js, BookStack | seo-audit (content audit) |
| Video Streaming | PeerTube, Jellyfin | social-content |
| Photo Galleries | Chevereto, Pigallery | social-content |

### Productivity
| Category | Reference Apps | JackConnect Service |
|----------|--------------|-------------------|
| Note-taking | Obsidian, AppFlowy | seo-audit (content ideas) |
| Office Suites | LibreOffice Online, OnlyOffice | cma-report |
| File Sync | Nextcloud, Syncthing | lead-gen (data collection) |
| Bookmarks | Linkding, Shaarli | market-report |
| Password Managers | Vaultwarden, Bitwarden | (internal use) |

### Marketing & Sales
| Category | Reference Apps | JackConnect Service |
|----------|--------------|-------------------|
| Campaign | Postiz, Statamic | social-content |
| Landing Pages | Payload, Umbraco | seo-audit |
| Form Builders | Superform, OhMyForm | lead-gen |
| Marketing | Mautic, leon.ai | cold-email, lead-gen |

### AI & Development
| Category | Reference Apps | JackConnect Service |
|----------|--------------|-------------------|
| GenAI | Ollama, Open WebUI | (core infrastructure) |
| AI Agents | n8n, Activepieces | (Solomon Bus) |
| Low Code | Budibase, Appsmith | project-management |
| IDE & Tools | VS Code Server, JetBrains | (developer tools) |

### Infrastructure
| Category | Reference Apps | JackConnect Service |
|----------|--------------|-------------------|
| VPN | WireGuard, Tailscale | (internal use) |
| Monitoring | Uptime Kuma, Grafana | (health checks) |
| Analytics | Plausible, Umami | seo-audit (analytics) |
| Backup | Restic, BorgBase | (internal ops) |
| DNS | Pi-hole, AdGuard Home | (internal use) |

### Finance
| Category | Reference Apps | JackConnect Service |
|----------|--------------|-------------------|
| Accounting | Frappe Books, Silverfin | cma-report |
| Budgeting | Actual Budget, Budgyt | market-report |
| POS | LXPy, CEC_POS | cma-report |

### Real Estate (JackConnect Special)
| Category | Reference Apps | JackConnect Service |
|----------|--------------|-------------------|
| Property Mgmt | ERPNext, OpenEstate | cma-report |
| MLS Integration | - | lead-gen (mls scraping) |
| IDX Websites | - | seo-audit |
| CMA Tools | - | cma-report (ours) |
| Drip Campaigns | Mautic | cold-email |

## Key Insights from awesome-selfhosted for Solomon OS

1. **500+ apps** exist as self-hosted alternatives — we position Solomon OS as the AI layer on top of them
2. **The pre-install batch** maps directly: Matrix, Jitsi, NextCloud, Vaultwarden, WireGuard, Cal.com, Obsidian, etc.
3. **Every category** is a potential service offering in JackConnect
4. **Licensing**: MIT/Apache = safe to fork, GPL = use as reference only

## Quick Commands

```bash
# Search for a specific category
grep -i "email\|crm\|analytics" /home/workspace/awesome-selfhosted/README.md

# Get top apps per category
grep -A20 "### Analytics" /home/workspace/awesome-selfhosted/README.md
grep -A20 "### CRM" /home/workspace/awesome-selfhosted/README.md

# Check license compatibility
grep -i "license\|mit\|apache\|gpl" /home/workspace/awesome-selfhosted/README.md
```

## Source
- Repo: github.com/awesome-selfhosted/awesome-selfhosted
- Stars: 178K (most starred self-hosted list)
- License: GPL-3.0
- Categories: 100+
- Entries: 500+
- Updated: Continuously

## Status
✅ SKILL — Hermes-compatible, integrated into JackConnect service mapping
