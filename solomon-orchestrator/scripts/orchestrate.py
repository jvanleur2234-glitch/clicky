#!/usr/bin/env python3
"""
Solomon Orchestrator — Spawns child Zo sessions to build businesses in parallel.
Joseph's idea → Orchestrator delegates → Child Zoes build → LIVE business
"""
import os
import json
import time
import subprocess
import requests
from datetime import datetime
from pathlib import Path

ORCHESTRATOR_DIR = Path("/home/workspace/Skills/solomon-orchestrator")
SESSIONS_DIR = ORCHESTRATOR_DIR / "sessions"
SESSIONS_DIR.mkdir(exist_ok=True)

ZO_API = "https://api.zo.computer/zo/ask"
MODEL = "vercel:minimax/minimax-m2.7"

def get_token():
    return os.environ.get("ZO_CLIENT_IDENTITY_TOKEN", "")

# ── Context Injection ─────────────────────────────────────────────────────────
def build_context_brief(idea_name: str, idea_desc: str, track: str) -> str:
    """Build a complete context brief for a child Zo."""
    
    track_instructions = {
        "build": """
TRACK: BUILD
Your job: Build the product using Zo Space.
- Create the zo.space page or full app
- Implement all core features
- Make it look good and work
- Deploy to live URL
- Test it works end-to-end

SUCCESS: Live URL where the product is fully functional
""",
        "marketing": """
TRACK: MARKETING
Your job: Create all marketing materials and launch presence.
- Facebook page setup and first 3 posts
- X/Twitter account setup and launch thread
- SEO meta tags and descriptions
- Email launch sequence (3 emails)
- Ad creative copy for Facebook

SUCCESS: All marketing channels live and ready, launch copy written
""",
        "monetization": """
TRACK: MONETIZATION
Your job: Make the product collect money.
- Create Stripe product with correct pricing
- Generate payment link
- Set up email receipts
- Create upsell path if applicable
- Test the purchase flow

SUCCESS: Real payment link that works, money can be collected
""",
        "distribution": """
TRACK: DISTRIBUTION
Your job: Get the product in front of people.
- Google indexing (submit to search)
- Facebook Marketplace if applicable
- Product Hunt submission (scheduled)
- Hacker News if SaaS
- Any relevant marketplaces

SUCCESS: Product submitted to all relevant platforms
"""
    }
    
    return f"""
# BUSINESS: {idea_name}

{idea_desc}

{track_instructions.get(track, "UNKNOWN TRACK")}

TIMELINE: Build and launch within 24-48 hours.
REPORT BACK: When your track is complete, write results to /home/workspace/orchestrator/results/{idea_name}/{track}_result.md

Report:
1. What you built/accomplished
2. Live URL or link to assets
3. Any blockers
4. Next steps
"""

# ── Spawn Child Zo ────────────────────────────────────────────────────────────
def spawn_child(idea_name: str, idea_desc: str, track: str, session_id: str) -> dict:
    """Spawn a child Zo session for a specific track."""
    
    token = get_token()
    if not token:
        return {"error": "No ZO_CLIENT_IDENTITY_TOKEN found"}
    
    context = build_context_brief(idea_name, idea_desc, track)
    
    prompt = f"""
You are a child Zo session building the {track} track for: {idea_name}

{context}

Work until this track is complete. Report your results to /home/workspace/orchestrator/results/{idea_name}/{track}_result.md
Then respond to this message with a summary of what you built.
"""
    
    try:
        resp = requests.post(
            ZO_API,
            headers={
                "Authorization": token,
                "Content-Type": "application/json"
            },
            json={
                "input": prompt,
                "model_name": MODEL
            },
            timeout=30
        )
        result = resp.json()
        child_id = result.get("conversation_id", f"{track}-{session_id}")
        return {"success": True, "child_id": child_id, "track": track}
    except Exception as e:
        return {"error": str(e), "track": track}

# ── Orchestrate ───────────────────────────────────────────────────────────────
def orchestrate(idea_name: str, idea_desc: str, tracks: list[str] = None):
    """
    Main entry point. Takes an idea and spawns child Zoes for each track.
    """
    if tracks is None:
        tracks = ["build", "marketing", "monetization", "distribution"]
    
    session_id = f"orch-{idea_name.lower().replace(' ', '-')}-{int(time.time())}"
    results_dir = Path(f"/home/workspace/orchestrator/results/{idea_name}")
    results_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"[Orchestrator] Starting: {idea_name}")
    print(f"[Orchestrator] Session: {session_id}")
    print(f"[Orchestrator] Tracks: {', '.join(tracks)}")
    
    # Spawn all tracks in parallel
    children = []
    for track in tracks:
        print(f"[Orchestrator] Spawning {track}...")
        result = spawn_child(idea_name, idea_desc, track, session_id)
        children.append(result)
        time.sleep(2)  # Small stagger to avoid rate limits
    
    # Save session
    session_data = {
        "idea_name": idea_name,
        "idea_desc": idea_desc,
        "session_id": session_id,
        "started_at": datetime.now().isoformat(),
        "tracks": tracks,
        "children": children
    }
    
    with open(SESSIONS_DIR / f"{session_id}.json", "w") as f:
        json.dump(session_data, f, indent=2)
    
    print(f"\n[Orchestrator] {len(children)} child sessions spawned")
    print(f"[Orchestrator] Session saved: {session_id}.json")
    
    return session_data

# ── Status ───────────────────────────────────────────────────────────────────
def status():
    """Check status of all orchestrator sessions."""
    sessions = list(SESSIONS_DIR.glob("*.json"))
    if not sessions:
        print("[Orchestrator] No active sessions")
        return
    
    for session_file in sessions:
        with open(session_file) as f:
            data = json.load(f)
        print(f"\n=== {data['idea_name']} ===")
        print(f"Session: {data['session_id']}")
        print(f"Started: {data['started_at']}")
        for child in data.get("children", []):
            status_icon = "✅" if child.get("success") else "❌"
            print(f"  {status_icon} {child.get('track', 'unknown')}: {child.get('child_id', child.get('error', 'unknown'))}")

# ── CLI ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import sys
    
    cmd = sys.argv[1] if len(sys.argv) > 1 else "status"
    
    if cmd == "status":
        status()
    elif cmd == "orchestrate" and len(sys.argv) >= 3:
        idea_name = sys.argv[2]
        idea_desc = sys.argv[3] if len(sys.argv) > 3 else ""
        tracks = sys.argv[4].split(",") if len(sys.argv) > 4 else None
        result = orchestrate(idea_name, idea_desc, tracks)
        print(json.dumps(result, indent=2))
    elif cmd == "help":
        print("""
Solomon Orchestrator

Usage:
  orchestrator.py status
  orchestrator.py orchestrate "Business Name" "Description" [tracks]
  
Examples:
  orchestrator.py orchestrate "Subscription Trimmer" "Track and cancel subscriptions"
  orchestrator.py orchestrate "FakerFaker" "Facebook scam detector" build,marketing
  orchestrator.py status
""")
    else:
        print("Unknown command. Run: orchestrator.py help")
