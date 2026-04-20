#!/usr/bin/env python3
"""
Clicky Playback Engine — Run pre-recorded walkthroughs in the browser.
Usage: python3 play.py <walkthrough_name> [--params key=value,...]
"""
import argparse
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path

WALKTHROUGH_DIR = Path(__file__).parent.parent / "walkthroughs"
CHROME_PORT = 9222

def load_walkthrough(name: str) -> dict:
    for category_dir in WALKTHROUGH_DIR.iterdir():
        if not category_dir.is_dir():
            continue
        clicky_file = category_dir / f"{name}.clicky"
        if not clicky_file.exists():
            clicky_file = category_dir / f"{name}.json"
        if clicky_file.exists():
            with open(clicky_file) as f:
                return json.load(f)
    raise FileNotFoundError(f"Walkthrough '{name}' not found in any category")

def substitute_params(text: str, params: dict) -> str:
    for key, val in params.items():
        text = text.replace(f"{{{{{key}}}}}", str(val))
    return text

def verify_step(driver, step: dict) -> bool:
    verify = step.get("verify", {})
    vtype = verify.get("type")
    value = verify.get("value", "")
    timeout = verify.get("timeout", 5)

    if vtype == "url_contains":
        import urllib.parse
        return value in driver.current_url
    elif vtype == "url_equals":
        return driver.current_url == value
    elif vtype in ("text_visible", "text_not_visible"):
        found = value in driver.page_source
        return found if vtype == "text_visible" else not found
    elif vtype == "element_visible":
        try:
            el = driver.find_element("css selector", step.get("target", ""))
            return el.is_displayed()
        except Exception:
            return False
    return True

def run_step(driver, step: dict, params: dict) -> bool:
    action = step.get("action")
    target = substitute_params(step.get("target", ""), params)
    value = substitute_params(step.get("value", ""), params)

    if action == "navigate":
        driver.get(target)
    elif action == "click":
        el = driver.find_element("css selector", target)
        el.click()
    elif action == "type":
        el = driver.find_element("css selector", target)
        el.clear()
        el.send_keys(value)
    elif action == "wait":
        time.sleep(float(step.get("seconds", 1)))
    elif action == "select":
        from selenium.webdriver.support.ui import Select
        el = driver.find_element("css selector", target)
        Select(el).select_by_value(value)
    else:
        print(f"  ⚠️  Unknown action: {action}")
        return False
    return True

def main():
    parser = argparse.ArgumentParser(description="Clicky Walkthrough Player")
    parser.add_argument("name", help="Walkthrough name (without .clicky)")
    parser.add_argument("--params", default="", help="params as key=value,key=value")
    parser.add_argument("--list", action="store_true", help="List all walkthroughs")
    parser.add_argument("--chrome-port", type=int, default=CHROME_PORT)
    args = parser.parse_args()

    if args.list:
        print("🎬 Clicky Walkthrough Library\n")
        for cat_dir in WALKTHROUGH_DIR.iterdir():
            if not cat_dir.is_dir():
                continue
            print(f"  [{cat_dir.name}/]")
            for f in cat_dir.iterdir():
                if f.suffix in (".clicky", ".json"):
                    try:
                        with open(f) as fd:
                            d = json.load(fd)
                            steps = len(d.get("steps", []))
                            desc = d.get("description", "")
                            print(f"    {f.stem}: {steps} steps — {desc}")
                    except Exception:
                        print(f"    {f.stem}")
        return

    params = {}
    if args.params:
        for pair in args.params.split(","):
            if "=" in pair:
                k, v = pair.split("=", 1)
                params[k.strip()] = v.strip()

    wt = load_walkthrough(args.name)
    print(f"🎬 Clicky: {wt['name']}")
    print(f"   Steps: {len(wt['steps'])}  |  Params: {params}\n")

    # Try selenium
    try:
        from selenium import webdriver
        from selenium.webdriver.common.by import By
        from selenium.webdriver.chrome.options import Options
        from selenium.webdriver.chrome.service import Service

        opts = Options()
        opts.add_experimental_option("debuggerAddress", f"localhost:{args.chrome_port}")
        driver = webdriver.Chrome(options=opts)
    except Exception as e:
        print(f"⚠️  Selenium not available ({e}) — dry-run mode")
        print("   To run walkthroughs live, open Chrome with:")
        print(f"   chrome --remote-debugging-port={args.chrome_port}")
        print("   Then retry.\n")
        for i, step in enumerate(wt["steps"], 1):
            action = step.get("action")
            target = step.get("target", "")
            value = step.get("value", "")
            print(f"  {i}. [{action}] {target} {value}")
        return

    passed = 0
    for step in wt["steps"]:
        sid = step.get("id", "?")
        action = step.get("action")
        target = step.get("target", "")
        value = step.get("value", "")
        desc = step.get("description", "")

        print(f"  {sid}. {action} → {target} {value or ''}")
        try:
            ok = run_step(driver, step, params)
            if not ok:
                print(f"     ❌ Action failed")
                break
            time.sleep(0.3)
            if verify_step(driver, step):
                print(f"     ✅ OK")
                passed += 1
            else:
                print(f"     ❌ Verify failed — stopping")
                break
        except Exception as e:
            print(f"     ❌ Error: {e}")
            break

    driver.quit()
    print(f"\n✅ {passed}/{len(wt['steps'])} steps passed")

if __name__ == "__main__":
    main()