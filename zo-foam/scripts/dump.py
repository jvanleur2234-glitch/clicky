#!/usr/bin/env python3
"""Dump a memory entry into Zo Foam."""
import sys
import json
import uuid
from datetime import datetime, timezone

def dump(text: str, source: str = "chat", tags: list[str] | None = None,
         projects: list[str] | None = None, media_path: str | None = None):
    entry = {
        "id": str(uuid.uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source": source,
        "text": text,
        "tags": tags or [],
        "projects": projects or [],
        "summary": text[:120],
    }
    date = datetime.now().strftime("%Y-%m-%d")
    path = f"/home/workspace/zo-foam/dumps/{date}.jsonl"
    with open(path, "a") as f:
        f.write(json.dumps(entry) + "\n")
    if media_path:
        import shutil
        dest = f"/home/workspace/zo-foam/media/{entry['id']}"
        shutil.copy(media_path, dest)
        entry["media"] = dest
    return entry

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Dump to Zo Foam")
    parser.add_argument("text", help="The memory to save")
    parser.add_argument("--source", default="chat", choices=["telegram","chat","email","browser"])
    parser.add_argument("--tags", default="", help="Comma-separated tags")
    parser.add_argument("--projects", default="", help="Comma-separated projects")
    args = parser.parse_args()
    entry = dump(
        text=args.text,
        source=args.source,
        tags=[t.strip() for t in args.tags.split(",") if t.strip()],
        projects=[p.strip() for p in args.projects.split(",") if p.strip()],
    )
    print(f"Saved: {entry['id']}")
