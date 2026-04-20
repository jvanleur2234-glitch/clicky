---
name: meilisearch
description: Self-hosted hybrid search engine (full-text + AI vector). Use when clients need semantic search, typo tolerance, or a private Google alternative.
---
# Meilisearch — AI Hybrid Search Engine

## What It Is
- Open source search engine (57.2K stars, MIT)
- Full-text search + typo tolerance + semantic/AI search
- Sub-millisecond queries
- Runs as single binary, Docker, or source

## JackConnect Integration
- Powers the JackConnect search feature
- Index properties, leads, client records
- Clients get private search engine = privacy + speed

## Quick Start
```bash
docker run -d --name meilisearch \
  -p 7700:7700 \
  -e MEILI_MASTER_KEY="your-secret-key" \
  getmeili/meilisearch:latest

# Index documents
curl -X POST 'http://localhost:7700/indexes/properties/documents' \
  -H 'Authorization: Bearer your-secret-key' \
  -H 'Content-Type: application/json' \
  --data-binary '{"id":"1","title":"123 Main St","price":450000}'
```

## Status
Cloned: /home/workspace/Skills/meilisearch/
Docker: Container name `meilisearch`, port 7700
Recommendation: INTEGRATE — powers JackConnect search feature
