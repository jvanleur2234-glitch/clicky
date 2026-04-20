# Browser Recorder Skill

Record browser actions as reusable, verifiable skills.

## What It Does

1. **Record** — You perform actions in Chrome, the system captures each step + the resulting page state
2. **Verify** — Each step gets auto-generated verification: "how do we know this worked?"
3. **Replay** — Execute the skill with `replay.py`, which checks each step and stops immediately if something fails

## Architecture

```
scripts/record.py    — CDP event capture, auto-verify generation
scripts/replay.py    — Execute with verification, stop-on-fail
skills/*.json        — Recorded skills with verify configs
```

## Core Principle: Know If It Worked

The system NEVER guesses. Every recorded step captures:
- The action (click, type, navigate)
- The selector used
- The expected result (what the URL and page looked like AFTER the action)
- An auto-generated verify config (URL changed, text appeared, element visible)

When replaying, replay.py checks each step against its verify config. If the step failed, it stops and reports exactly which step broke.

## Recording a Skill

**Step 1: Start Chrome with DevTools**
```bash
chrome --remote-debugging-port=9222
```

**Step 2: Start recording**
```bash
python3 /home/workspace/Skills/browser-recorder/scripts/record.py start \
  --name pizza-ranch-order \
  --port 9222 \
  --url https://pizzaranch.com
```

**Step 3: Perform actions**
Do the full flow in Chrome. Each action is recorded with post-action state captured.

**Step 4: Stop and save**
Press Ctrl+C. The skill saves to `skills/pizza-ranch-order.json`.

## Replaying a Skill

```bash
python3 replay.py pizza-ranch-order
```

Output:
```
🎬 Replaying skill: pizza-ranch-order
   Steps: 8
   Params: {}

  1. navigate → https://pizzaranch.com/menu
     📝 Navigated to: pizzaranh.com/menu
     ✅ URL contains 'menu': https://pizzaranch.com/menu

  2. click → #pizza-builder
     🔍 Verify: text_visible = 'build your own pizza'
     ✅ Text found: 'build your own pizza'

  3. type → #size-select = Large
     🔍 Verify: url_contains = 'size=large'
     ❌ VERIFY FAILED: URL never contained 'size=large'. Got: https://pizzaranch.com/build

🚫 Stopping at step 3 — verification failed.
```

## Verify Types

| Type | What It Checks |
|------|----------------|
| `url_contains` | Expected substring in URL |
| `url_equals` | URL matches exactly |
| `text_visible` | Key text appears on page |
| `text_not_visible` | Expected text is gone |
| `element_visible` | Selector/content present |

## Parameter Substitution

Skills support `{{variable}}` placeholders:

```bash
python3 replay.py pizza-ranch-order --params item=Supreme Pizza,size=Large
```

The recorded variables become defaults but can be overridden at replay time.

## Auto-Verify Generation

When recording, after each action the system:
1. Captures the resulting URL and page snapshot
2. Compares to previous state
3. Detects what changed (navigation, new text, content change)
4. Generates the appropriate verify config automatically

Example auto-generated verify:
```json
{
  "type": "url_contains",
  "value": "pizza-ranch.com/menu",
  "timeout": 5
}
```

## Manual Step Addition

For complex skills, you can manually add steps with custom verify:
```json
{
  "action": "click",
  "selector": "#submit-order",
  "description": "Submit order",
  "verify": {
    "type": "text_visible",
    "value": "order confirmed",
    "timeout": 5
  }
}
```

## Status

```bash
python3 /home/workspace/Skills/browser-recorder/scripts/record.py status
```

## Next Phase

- Natural language parameter extraction (parse "order a large pepperoni" into params)
- Self-healing: when verify fails, analyze and auto-retry with adjusted selectors
- Learning loop: track failed steps across replays and auto-fix