# CloudBrowser Skill

## What It Does
Gives the agent full control of an isolated cloud browser. The agent can:
- Open any URL
- Click, type, scroll, navigate
- Extract data from any website
- Take screenshots and recordings
- Run entire workflows autonomously

## When To Use It
Use when you need to:
- Scrape a website that requires JavaScript
- Automate a web form or workflow
- Extract data from a web app
- Monitor a page for changes
- Navigate a site that blocks non-browser requests

## How It Works
1. Create a session → get a session_id
2. Submit a task → browser opens, does the task
3. Get results → screenshot, recording, extracted data

## Commands
```bash
# Create session
curl -X POST http://localhost:9876/session

# Run task
curl -X POST http://localhost:9876/task \
  -H "Content-Type: application/json" \
  -d '{"session_id": "cb_xxx", "task": "Go to MLS and search for 123 Main St"}'

# Get screenshot
curl http://localhost:9876/screenshot/cb_xxx

# Get recording
curl http://localhost:9876/recording/cb_xxx
```

## Status
Running at http://localhost:9876
