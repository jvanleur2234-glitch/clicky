#!/usr/bin/env python3
"""Resurface memories from Zo Foam using semantic search."""
import sys
import json
import os
from datetime import datetime, timedelta

def resurface(query: str, days_back: int = 90, limit: int = 10, projects: list[str] | None = None):
    """Find memories related to query using keyword + context matching."""
    cutoff = datetime.now() - timedelta(days=days_back)
    results = []

    dumps_dir = "/home/workspace/zo-foam/dumps"
    if not os.path.exists(dumps_dir):
        return []

    query_words = set(query.lower().split())

    for fname in sorted(os.listdir(dumps_dir)):
        if not fname.endswith(".jsonl"):
            continue
        fdate = datetime.strptime(fname.replace(".jsonl",""), "%Y-%m-%d")
        if fdate < cutoff:
            continue
        with open(os.path.join(dumps_dir, fname)) as f:
            for line in f:
                try:
                    entry = json.loads(line)
                except:
                    continue
                # Project filter
                if projects:
                    if not any(p in entry.get("projects",[]) for p in projects):
                        continue
                # Score by word overlap in text + tags + summary
                text_lower = (entry.get("text","") + " ".join(entry.get("tags",[])) + entry.get("summary","")).lower()
                score = sum(1 for w in query_words if w in text_lower)
                if score > 0:
                    results.append((score, entry))

    results.sort(key=lambda x: x[0], reverse=True)
    return [r for _, r in results[:limit]]

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Resurface Zo Foam memories")
    parser.add_argument("query", help="Search query")
    parser.add_argument("--days", type=int, default=90)
    parser.add_argument("--limit", type=int, default=10)
    parser.add_argument("--projects", default="", help="Comma-separated projects to filter")
    args = parser.parse_args()
    results = resurface(args.query, args.days, args.limit,
                       [p.strip() for p in args.projects.split(",") if p.strip()] or None)
    if not results:
        print("No memories found.")
    for r in results:
        print(f"[{r['timestamp'][:10]}] [{r['source']}] {r['summary']}")
        print(f"  Tags: {', '.join(r['tags'])}")
        print(f"  Text: {r['text'][:200]}")
        print()
