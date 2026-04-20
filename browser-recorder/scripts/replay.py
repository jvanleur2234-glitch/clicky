#!/usr/bin/env python3
"""
Browser Skill Replay - Execute recorded skills with VERIFICATION
After each step, we CHECK if it actually worked. No guessing.
"""

import json
import sys
import time
import re
import subprocess
import argparse
from pathlib import Path

SKILLS_DIR = Path("/home/workspace/Skills/browser-recorder/skills")

def load_skill(name):
    path = SKILLS_DIR / f"{name}.json"
    if not path.exists():
        path = SKILLS_DIR / f"{name.replace('.json','')}.json"
    if not path.exists():
        print(f"❌ Skill '{name}' not found in {SKILLS_DIR}")
        print(f"   Available: {[p.stem for p in SKILLS_DIR.glob('*.json')]}")
        sys.exit(1)
    with open(path) as f:
        return json.load(f)

def substitute_params(text, params):
    if not text:
        return text
    result = str(text)
    for key, value in params.items():
        result = result.replace(f"{{{{{key}}}}}", str(value))
    return result

def run_command(cmd):
    result = subprocess.run(
        ["agent-browser"] + cmd.split(),
        capture_output=True, text=True, timeout=30
    )
    return result.stdout.strip(), result.stderr.strip(), result.returncode

def get_page_state():
    """Get current URL and visible text to verify actions worked."""
    url_out, _, url_code = run_command("get url")
    snapshot_out, _, snap_code = run_command("snapshot -i")
    
    state = {"url": url_out if url_code == 0 else "", "snapshot": snapshot_out if snap_code == 0 else ""}
    return state

def verify_condition(state, verify_config, step_description):
    """
    Check if a verify condition passed.
    Returns (passed: bool, message: str)
    """
    if not verify_config:
        return True, "no verification configured"
    
    vtype = verify_config.get("type", "")
    value = verify_config.get("value", "")
    timeout = verify_config.get("timeout", 3)
    
    deadline = time.time() + timeout
    
    while time.time() < deadline:
        state = get_page_state()
        
        if vtype == "url_contains":
            if value in state["url"]:
                return True, f"URL contains '{value}': {state['url']}"
        
        elif vtype == "url_equals":
            if state["url"].rstrip("/") == value.rstrip("/"):
                return True, f"URL equals: {state['url']}"
        
        elif vtype == "text_visible":
            if value.lower() in state["snapshot"].lower():
                return True, f"Text found: '{value}'"
        
        elif vtype == "text_not_visible":
            if value.lower() not in state["snapshot"].lower():
                return True, f"Text absent: '{value}'"
        
        elif vtype == "element_visible":
            # Check if element selector appears in snapshot with some text
            # For now just check selector text appears
            if value and value in state["snapshot"]:
                return True, f"Element/content found: '{value}'"
        
        time.sleep(0.5)
    
    # Timed out
    if vtype == "url_contains":
        return False, f"URL never contained '{value}'. Got: {state['url']}"
    elif vtype == "text_visible":
        return False, f"Text '{value}' never appeared. Page snapshot: {state['snapshot'][:200]}"
    elif vtype == "url_equals":
        return False, f"URL never equals '{value}'. Got: {state['url']}"
    else:
        return False, f"Verification '{vtype}' failed after {timeout}s. URL: {state['url']}"

def replay_skill(skill_name, params=None, dry_run=False, stop_on_fail=True):
    """Replay a recorded skill with verification after each step."""
    skill = load_skill(skill_name)
    params = params or {}
    
    variables = skill.get("variables", {})
    for key, val in variables.items():
        if key not in params:
            params[key] = val
    
    print(f"\n🎬 Replaying skill: {skill['name']}")
    print(f"   Steps: {len(skill['steps'])}")
    print(f"   Params: {params}")
    print(f"   Stop on fail: {stop_on_fail}\n")
    
    # Check browser connection
    url, _, code = run_command("get url")
    if code != 0 or not url or "empty" in url.lower():
        print("❌ Browser not connected. Run: agent-browser connect --port 9222")
        sys.exit(1)
    
    print(f"   Current page: {url}\n")
    
    results = []
    
    for i, step in enumerate(skill["steps"], 1):
        action = step.get("action")
        selector = substitute_params(step.get("selector", ""), params)
        value = substitute_params(step.get("value"), params)
        description = step.get("description", "")
        verify = step.get("verify")  # Verification config
        
        print(f"  {i}. {action} → {selector} {f'= {value}' if value else ''}")
        if description:
            print(f"     └ {description}")
        
        if dry_run:
            print(f"     [DRY RUN - skipping]")
            continue
        
        # Execute the action
        exec_error = None
        if action == "navigate":
            out, err, rc = run_command(f"open {selector}")
            if rc != 0:
                exec_error = f"Navigation failed: {err}"
        
        elif action == "click":
            out, err, rc = run_command(f"click {selector}")
            if rc != 0:
                exec_error = f"Click failed: {err[:100]}"
        
        elif action in ("type", "fill"):
            safe_value = value.replace('"', '\\"') if value else ""
            out, err, rc = run_command(f"fill {selector} \"{safe_value}\"")
            if rc != 0:
                exec_error = f"Type/fill failed: {err[:100]}"
        
        elif action == "select":
            out, err, rc = run_command(f"select {selector} {value}")
            if rc != 0:
                exec_error = f"Select failed: {err[:100]}"
        
        elif action == "press":
            out, err, rc = run_command(f"press {selector}")
            if rc != 0:
                exec_error = f"Press failed: {err[:100]}"
        
        elif action == "wait":
            time.sleep(int(selector) if selector.isdigit() else 2)
        
        else:
            print(f"     ⚠️ Unknown action: {action}")
        
        time.sleep(0.5)  # Let page settle
        
        # VERIFY the action worked
        if not exec_error:
            passed, msg = verify_condition(get_page_state(), verify, description)
            results.append({"step": i, "action": action, "passed": passed, "message": msg})
            
            if passed:
                print(f"     ✅ {msg}")
            else:
                print(f"     ❌ VERIFY FAILED: {msg}")
                if stop_on_fail:
                    print(f"\n🚫 Stopping at step {i} — verification failed.")
                    print_results(results)
                    sys.exit(1)
        else:
            print(f"     ❌ {exec_error}")
            results.append({"step": i, "action": action, "passed": False, "message": exec_error})
            if stop_on_fail:
                print(f"\n🚫 Stopping at step {i} — execution error.")
                print_results(results)
                sys.exit(1)
    
    print(f"\n✅ Replay complete!")
    print_results(results)
    return results

def print_results(results):
    passed = sum(1 for r in results if r["passed"])
    print(f"\n📊 Results: {passed}/{len(results)} steps passed")
    for r in results:
        icon = "✅" if r["passed"] else "❌"
        print(f"   {icon} Step {r['step']}: {r['action']} — {r['message']}")

def list_skills():
    skills = list(SKILLS_DIR.glob("*.json"))
    if not skills:
        print("No skills recorded yet.")
        print(f"   Record one: python3 record.py start --name my-skill")
        return
    print(f"\n📋 Recorded Skills ({len(skills)}):\n")
    for p in skills:
        with open(p) as f:
            s = json.load(f)
        created = s.get("created", "unknown")[:10]
        steps = s.get("metadata", {}).get("total_steps", len(s.get("steps", [])))
        has_verify = any("verify" in step for step in s.get("steps", []))
        print(f"   {p.stem}")
        print(f"     Created: {created} | Steps: {steps} | Verify: {'yes' if has_verify else 'none'}")
        if s.get("trigger"):
            print(f"     Trigger: {s['trigger']}")
        print()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Browser Skill Replay")
    parser.add_argument("skill", nargs="?", help="Skill name to replay")
    parser.add_argument("--params", "-p", help="Parameters as key=value,key=value")
    parser.add_argument("--dry-run", "-n", action="store_true", help="Show steps without executing")
    parser.add_argument("--list", "-l", action="store_true", help="List all skills")
    
    args = parser.parse_args()
    
    if args.list or (not args.skill):
        list_skills()
    else:
        params = {}
        if args.params:
            for pair in args.params.split(","):
                if "=" in pair:
                    k, v = pair.split("=", 1)
                    params[k.strip()] = v.strip()
        
        replay_skill(args.skill, params, dry_run=args.dry_run)
