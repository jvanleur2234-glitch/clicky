# Clicky — Solomon OS Walkthrough Player

> **"Clicky, set up JackConnect for a new client."**  
> Watch it happen.

## What It Does

Clicky plays back pre-recorded browser walkthroughs — automated guides that perform complex multi-step setup tasks. Each walkthrough is a `.clicky` file (JSON) that:
- Records every action: clicks, text inputs, navigations, waits
- Captures verification at each step ("how do we know it worked?")
- Replays with self-healing selectors if something shifts
- Stops immediately if a step fails, tells you exactly why

## Architecture

```
Skills/clicky/
├── SKILL.md              ← This file
├── scripts/
│   ├── play.py           ← Walkthrough playback engine
│   ├── record.py         ← CDP-based action recorder
│   ├── verify.py         ← Step verification checker
│   └── walkthrough.py    ← Shared walkthrough format + helpers
└── walkthroughs/         ← .clicky files organized by category
    ├── jackconnect/
    │   ├── setup.clicky
    │   ├── add-client.clicky
    │   └── assign-task.clicky
    ├── solomon-os/
    │   ├── connect-services.clicky
    │   └── install-skill.clicky
    └── onboarding/
        └── first-time-setup.clicky
```

## Walkthrough Format (.clicky)

```json
{
  "name": "jackconnect-setup",
  "version": "1.0",
  "description": "Install JackConnect and connect services for a new client",
  "author": "Solomon OS",
  "created": "2026-04-20",
  "params": {
    "client_name": "Acme Realty",
    "client_email": "client@acme.com"
  },
  "steps": [
    {
      "id": 1,
      "action": "navigate",
      "target": "https://jackconnect.solomon.os/setup",
      "verify": {
        "type": "url_contains",
        "value": "/setup"
      }
    },
    {
      "id": 2,
      "action": "click",
      "target": "#start-wizard",
      "verify": {
        "type": "text_visible",
        "value": "New Client Setup"
      }
    },
    {
      "id": 3,
      "action": "type",
      "target": "#client-name",
      "value": "{{client_name}}",
      "verify": {
        "type": "text_visible",
        "value": "Acme Realty"
      }
    }
  ]
}
```

## Verify Types

| Type | What It Checks |
|------|----------------|
| `url_contains` | Expected substring in URL |
| `url_equals` | URL matches exactly |
| `text_visible` | Key text appears on page |
| `text_not_visible` | Expected text is gone |
| `element_visible` | Selector present and visible |
| `element_clickable` | Element visible + enabled |

## Playing a Walkthrough

```bash
python3 /home/workspace/Skills/clicky/scripts/play.py jackconnect-setup \
  --params client_name="Acme Realty",client_email="client@acme.com"
```

Output:
```
🎬 Clicky: jackconnect-setup
   Steps: 12  |  Params: client_name=Acme Realty

  1. navigate → https://jackconnect.solomon.os/setup
     ✅ URL contains '/setup'

  2. click → #start-wizard
     ✅ Text found: 'New Client Setup'

  3. type → #client-name = Acme Realty
     ✅ Text found: 'Acme Realty'

  4. click → #continue-btn
     ✅ Element visible: '#verify-email-step'
...
```

## Recording a New Walkthrough

```bash
python3 /home/workspace/Skills/clicky/scripts/record.py start \
  --name my-custom-setup \
  --port 9222 \
  --url https://example.com/setup
```

1. Open Chrome with `--remote-debugging-port=9222`
2. Run record command above
3. Perform the full flow in Chrome
4. Press Ctrl+C to stop — saves to `walkthroughs/my-custom-setup.clicky`

## Categories

- **jackconnect/** — Real estate client workflows (setup, CMA, lead intake)
- **solomon-os/** — System configuration, service connections
- **thunderbolt/** — Thunderbolt desktop setup
- **onboarding/** — First-time setup for new users/clients

## Status

```bash
python3 /home/workspace/Skills/clicky/scripts/play.py --list
```

Lists all available walkthroughs with step count and categories.