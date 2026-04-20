#!/usr/bin/env python3
"""
Clicky Playback Engine — Run pre-recorded walkthroughs
Usage: python3 play.py <walkthrough_name> [--params k=v,k=v] [--headless]
"""

import json
import sys
import subprocess
import time
from pathlib import Path

WALKTHROUGH_DIR = Path(__file__).parent.parent / "walkthroughs"


def load_walkthrough(name: str) -> dict:
    # Try each subdirectory
    for subdir in WALKTHROUGH_DIR.iterdir():
        if subdir.is_dir():
            clicky_file = subdir / f"{name}.clicky"
            if clicky_file.exists():
                return json.loads(clicky_file.read_text())
    # Try top-level
    clicky_file = WALKTHROUGH_DIR / f"{name}.clicky"
    if clicky_file.exists():
        return json.loads(clicky_file.read_text())
    raise FileNotFoundError(f"Walkthrough '{name}' not found in {WALKTHROUGH_DIR}")


def parse_params(params_str: str | None) -> dict:
    if not params_str:
        return {}
    return dict(kv.split("=", 1) for kv in params_str.split(","))


def substitute(value: str, params: dict) -> str:
    for k, v in params.items():
        value = value.replace(f"{{{{{k}}}}}", v)
    return value


def verify_step(driver, step: dict, params: dict) -> bool:
    verify = step.get("verify", {})
    verify_type = verify.get("type", "")
    expected = substitute(verify.get("value", ""), params)

    if verify_type == "url_contains":
        return expected in driver.current_url
    elif verify_type == "text_visible":
        return expected in driver.page_source
    elif verify_type == "element_visible":
        try:
            elem = driver.find_element("css selector", expected)
            return elem.is_displayed()
        except Exception:
            return False
    return True


def run_step(driver, step: dict, params: dict, browser_port: int = 9222) -> bool:
    action = step["action"]
    target = substitute(step.get("target", ""), params)
    value = substitute(step.get("value", ""), params)

    if action == "navigate":
        driver.get(target)
    elif action == "click":
        driver.find_element("css selector", target).click()
    elif action == "type":
        elem = driver.find_element("css selector", target)
        elem.clear()
        elem.send_keys(value)
    elif action == "wait":
        time.sleep(float(step.get("seconds", 2)))
    else:
        print(f"   ⚠️ Unknown action: {action}")
        return True  # Don't fail on unknown actions

    # Verify if present
    if "verify" in step:
        time.sleep(1)  # Let page settle
        ok = verify_step(driver, step, params)
        return ok
    return True


def init_driver(port: int = 9222):
    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options

    opts = Options()
    opts.add_experimental_option("debuggerAddress", f"localhost:{port}")
    return webdriver.Chrome(options=opts)


def main():
    if len(sys.argv) < 2:
        print("Usage: play.py <walkthrough_name> [--params k=v,k=v] [--port 9222]")
        sys.exit(1)

    name = sys.argv[1]
    params_str = None
    port = 9222

    for arg in sys.argv[2:]:
        if arg.startswith("--params"):
            params_str = arg.split("=", 1)[1] if "=" in arg else None
        elif arg.startswith("--port"):
            port = int(arg.split("=", 1)[1])

    params = parse_params(params_str)
    try:
        walkthrough = load_walkthrough(name)
    except FileNotFoundError as e:
        print(f"❌ {e}")
        sys.exit(1)

    steps = walkthrough.get("steps", [])
    print(f"🎬 Clicky: {walkthrough['name']} (v{walkthrough.get('version','1.0')})")
    print(f"   Steps: {len(steps)}  |  Params: {params}")

    try:
        driver = init_driver(port)
    except Exception as e:
        print(f"❌ Failed to connect to Chrome on port {port}: {e}")
        print(f"   Start Chrome with: chrome --remote-debugging-port={port}")
        sys.exit(1)

    passed = 0
    failed = 0

    for i, step in enumerate(steps, 1):
        step_id = step.get("id", i)
        action = step.get("action", "unknown")
        target = step.get("target", step.get("value", ""))
        print(f"\n  {i}. [{action.upper()}] {target[:60]}")

        ok = run_step(driver, step, params, port)
        if ok:
            print(f"     ✅ Step passed")
            passed += 1
        else:
            print(f"     ❌ VERIFY FAILED — stopping")
            failed += 1
            break

    driver.quit()
    print(f"\n{'='*40}")
    print(f"Results: {passed} passed, {failed} failed")

    if failed > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()