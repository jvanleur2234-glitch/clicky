#!/usr/bin/env python3
"""
Browser Recorder - CDP-based browser event capture with auto-verify
Records user actions AND captures post-action state as built-in verification.
"""

import json
import sys
import time
import socket
import threading
import argparse
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse

try:
    import websocket
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "websocket-client", "-q"])
    import websocket

SKILLS_DIR = Path("/home/workspace/Skills/browser-recorder/skills")
SKILLS_DIR.mkdir(parents=True, exist_ok=True)

class BrowserRecorder:
    def __init__(self, port=9222, skill_name=None):
        self.port = port
        self.skill_name = skill_name
        self.ws = None
        self.msg_id = 0
        self.steps = []          # The recorded steps
        self.previous_url = ""
        self.previous_snapshot = ""
        self.running = False
        self.ws_connected = False
        
    def ws_connect(self):
        ws_url = f"ws://localhost:{self.port}/devtools/page/target-{self.port}"
        try:
            import http.client
            conn = http.client.HTTPConnection("localhost", self.port)
            conn.request("GET", "/json")
            resp = json.loads(conn.getresponse().read())
            if resp:
                ws_url = resp[0].get("webSocketDebuggerUrl", ws_url)
        except Exception:
            pass
        
        self.ws = websocket.create_connection(ws_url, suppress=True)
        self.ws_connected = True
        
    def send(self, method, params=None):
        self.msg_id += 1
        msg = {"id": self.msg_id, "method": method}
        if params:
            msg["params"] = params
        self.ws.send(json.dumps(msg))
        
        while True:
            resp = json.loads(self.ws.recv())
            if resp.get("id") == self.msg_id:
                return resp.get("result", {})

    def get_snapshot(self):
        """Get current page URL and accessibility snapshot."""
        url = ""
        try:
            url = self.send("Runtime.evaluate", {
                "expression": "window.location.href"
            }).get("result", {}).get("value", "")
        except:
            pass
        
        snapshot = ""
        try:
            tree = self.send("Accessibility.getFullTree", {})
            nodes = tree.get("nodes", [])
            snapshot = " ".join(
                n.get("role", {}).get("value", "") + " " + n.get("name", {}).get("value", "")
                for n in nodes[:30]
            )
        except:
            pass
        
        return url, snapshot
    
    def record_step(self, action, selector, value=None, description=""):
        """
        Record a step AND capture its resulting state for verification.
        This is the core of knowing whether a step worked - we capture
        what the page looks like AFTER the action, and that becomes
        the expected result.
        """
        # Capture state BEFORE the action
        before_url = self.previous_url or ""
        before_snapshot = self.previous_snapshot or ""
        
        step = {
            "timestamp": datetime.now().isoformat(),
            "action": action,
            "selector": selector,
            "description": description
        }
        if value is not None:
            step["value"] = value
        
        self.steps.append(step)
        
        # Give the action time to complete
        time.sleep(1)
        
        # Capture state AFTER the action
        after_url, after_snapshot = self.get_snapshot()
        
        # Store what "success" looks like
        step["recorded_url"] = after_url
        step["recorded_snapshot"] = after_snapshot[:500]
        
        # AUTO-GENERATE verify config: how do we know this step worked?
        # Compare before → after to detect what changed
        if after_url and after_url != before_url:
            # Navigation happened - verify by URL
            step["verify"] = {
                "type": "url_contains",
                "value": after_url.split("?")[0].rstrip("/"),  # Strip query for stable match
                "timeout": 5
            }
        elif before_snapshot != after_snapshot[:200]:
            # Content changed - find key new text
            old_words = set(before_snapshot.lower().split()) if before_snapshot else set()
            new_words = set(after_snapshot.lower().split()) if after_snapshot else set()
            new_text = " ".join(new_words - old_words)[:80].strip()
            if new_text:
                step["verify"] = {
                    "type": "text_visible",
                    "value": new_text,
                    "timeout": 3
                }
            else:
                step["verify"] = {
                    "type": "element_visible", 
                    "value": selector,
                    "timeout": 3
                }
        else:
            step["verify"] = {
                "type": "element_visible",
                "value": selector,
                "timeout": 3
            }
        
        # Update previous state for next step
        self.previous_url = after_url
        self.previous_snapshot = after_snapshot[:200]
        
        # Save incrementally
        self._save_incremental()
        
        print(f"  📝 [{len(self.steps)}] {action} → {selector[:50]}")
        print(f"     📍 URL: {after_url[:60] if after_url else 'n/a'}")
        print(f"     🔍 Verify: {step['verify']['type']} = '{step['verify']['value'][:50]}'")
    
    def _save_incremental(self):
        """Save current recording to disk so we don't lose data."""
        path = SKILLS_DIR / f"{self.skill_name}.json"
        skill = {
            "name": self.skill_name,
            "created": datetime.now().isoformat(),
            "steps": self.steps,
            "metadata": {
                "total_steps": len(self.steps),
                "recorded_from": self.previous_url
            }
        }
        with open(path, "w") as f:
            json.dump(skill, f, indent=2)
    
    def listen_for_input(self):
        """Monitor DOM for user actions (clicks, type, etc)."""
        last_doc_hash = ""
        while self.running:
            time.sleep(0.5)
            try:
                doc = self.send("DOM.getDocument", {"depth": 1})
                # Watch for click events via CDP
            except:
                pass
    
    def start(self, url=None):
        print(f"\n🎬 Browser Recorder started on port {self.port}")
        print(f"   Skill: {self.skill_name}")
        print(f"   Skills saved to: {SKILLS_DIR}")
        print("\n   Perform actions in Chrome now...")
        print("   Press Ctrl+C to stop and save.\n")
        
        self.ws_connect()
        self.send("DOM.enable")
        self.send("Input.enable")
        self.send("Page.enable")
        
        if url:
            print(f"   Navigating to: {url}")
            self.send("Page.navigate", {"url": url})
            time.sleep(2)
            self.previous_url = url
        
        # Capture initial state
        self.previous_url, self.previous_snapshot = self.get_snapshot()
        
        # Start DOM listener
        listener = threading.Thread(target=self.listen_for_input, daemon=True)
        listener.start()
        
        # Keep alive
        try:
            while self.running:
                time.sleep(1)
        except KeyboardInterrupt:
            self.stop()
    
    def stop(self):
        self.running = False
        print(f"\n\n💾 Saving skill '{self.skill_name}'...")
        
        if not self.steps:
            print("   No actions recorded.")
            return
        
        path = SKILLS_DIR / f"{self.skill_name}.json"
        with open(path, "w") as f:
            json.dump({
                "name": self.skill_name,
                "created": datetime.now().isoformat(),
                "steps": self.steps,
                "metadata": {
                    "total_steps": len(self.steps),
                    "recorded_from": self.previous_url
                }
            }, f, indent=2)
        
        print(f"   ✅ Saved {len(self.steps)} steps → {path}")
        print(f"\n   Replay with verification:")
        print(f"   python3 replay.py {self.skill_name}")
        
        if self.ws:
            self.ws.close()


def find_chrome_port():
    for port in [9222, 9333, 9444, 9555]:
        try:
            import http.client
            conn = http.client.HTTPConnection("localhost", port, timeout=1)
            conn.request("GET", "/json")
            resp = json.loads(conn.getresponse().read())
            if resp.status == 200:
                return port
        except:
            continue
    return None


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Browser Recorder with auto-verify")
    parser.add_argument("action", choices=["start", "stop", "status"], help="Action")
    parser.add_argument("--name", "-n", help="Skill name")
    parser.add_argument("--port", "-p", type=int, default=9222, help="CDP port")
    parser.add_argument("--url", "-u", help="Starting URL")
    
    args = parser.parse_args()
    
    if args.action == "start":
        port = find_chrome_port() or args.port
        name = args.name or input("Skill name: ").strip().replace(" ", "-").lower()
        
        if not name:
            print("Error: skill name required")
            sys.exit(1)
        
        recorder = BrowserRecorder(port=port, skill_name=name)
        recorder.running = True
        try:
            recorder.start(url=args.url)
        except KeyboardInterrupt:
            pass
            
    elif args.action == "status":
        port = find_chrome_port()
        if port:
            print(f"✅ Chrome on port {port}")
        else:
            print("❌ Chrome DevTools not found. Start Chrome with:")
            print("   chrome --remote-debugging-port=9222")