---
name: arena2api
description: Reverse-engineer arena.ai API to use their models via CLI. Handles auth (PKCE OAuth + JWT cookies), reCAPTCHA enterprise token acquisition, model listing, and chat completions via SSE streaming.
metadata:
  author: josephv.zo.computer
compatability: Created for Zo Computer
allowed-tools: Bash, Read, Write
---

# Arena2API Skill

Reverse-engineered arena.ai API CLI that bypasses the UI and calls models directly.

## Quick Start

```bash
python3 /home/workspace/Skills/arena2api/scripts/arena2api.py --help
python3 /home/workspace/Skills/arena2api/scripts/arena2api.py chat "Say hello in 3 words"
python3 /home/workspace/Skills/arena2api/scripts/arena2api.py models
```

## Auth Flow

Arena.ai uses Google OAuth + PKCE:
1. User logs in → gets `arena-auth-prod-v1.0` (base64 JSON with nested JWT access_token) and `arena-auth-prod-v1.1` (the raw JWT)
2. JWT payload: `{ sub: "user-id", role: "authenticated", email: "...", iss: "https://arena.ai", exp: 1775626156 }`
3. Token type: `Bearer`, expires in 3600s, refresh token: `v7pqcyvihwt75`

## Chat API Endpoint

- **URL**: `POST https://arena.ai/nextjs-api/stream/create-evaluation`
- **Auth**: `Authorization: Bearer <arena-auth-prod-v1.1 JWT>`
- **Content-Type**: `application/json`
- **Response**: Server-Sent Events (SSE) stream
- **reCAPTCHA**: Requires `recaptchaV3Token` from `grecaptcha.enterprise.execute(sitekey, {action: "chat_submit"})`

## Request Body

```json
{
  "id": "uuid7-session-id",
  "mode": "direct",
  "modelAId": null,
  "modelBId": null,
  "userMessageId": "uuid7",
  "modelAMessageId": "uuid7",
  "modelBMessageId": null,
  "userMessage": {
    "content": "Your message here",
    "experimental_attachments": [],
    "metadata": {}
  },
  "modality": "chat",
  "recaptchaV3Token": "token-from-grecaptcha",
  "forceLowRecaptchaScore": true
}
```

## Session Data (Joseph - 2026-04-08)

- JWT sub: `59cc66b1-341a-4e99-bb9b-e57e656614e3`
- Email: `jcprojectai@gmail.com`
- exp: `1775626156` (2026-04-08T04:29:16Z)
- Refresh token: `v7pqcyvihwt75`
- Stored at: `session/auth.json`

## Status

BLOCKED: Chat API requires reCAPTCHA token from live browser session.
