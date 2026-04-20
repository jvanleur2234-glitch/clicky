---
name: stealth-browser
description: >
  Bypass anti-bot protections (Cloudflare, Turnstile, reCAPTCHA) using SeleniumBase's
  undetected Chrome mode. Use when normal browser automation gets blocked. Handles form
  fills, signups, logins, and data extraction on sites that fight bots.
compatibility: Created for Zo Computer
metadata:
  author: josephv.zo.computer
allowed-tools:
  - Bash
  - Read
  - Write
---

# Stealth Browser Skill

Uses SeleniumBase UC Mode (undetectable Chrome) to bypass anti-bot protections.

## Setup

```bash
pip install seleniumbase
apt-get install -y chromium  # already installed on this server
```

## Test Chrome

```bash
python3 -c "
from seleniumbase import Driver
driver = Driver(uc=True, browser='chromium')
driver.get('https://www.jaiportal.com/')
print(driver.title)
driver.quit()
"
```

## Key Methods

- `Driver(uc=True)` — launch undetectable browser
- `driver.uc_open_with_trigger(url)` — wait for human verification
- `driver.uc_click(selector)` — human-like click
- `driver.get_newest_tab_url()` — get URL of new tab opened

## Workflow for Signup

1. Launch: `driver = Driver(uc=True, browser='chromium', headless=False)`
2. Navigate to signup URL
3. Wait for Turnstile challenge (user completes it manually)
4. Fill form fields with `driver.send_keys()`
5. Submit and wait for redirect
6. Extract API key from dashboard

## Troubleshooting

- If still blocked: add `incognito=True` and `headless=False`
- For Cloudflare: use `uc_open_with_trigger()` instead of `get()`
- Always check for new tabs after clicks — some flows open confirmation tabs
