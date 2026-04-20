#!/usr/bin/env bun
/**
 * Solomon Memory — Structured Memory Layer
 * Daily logs, topic files, searchable archive.
 * Usage: bun solomon-memory.ts [--help]
 *        bun solomon-memory.ts --today
 *        bun solomon-memory.ts --search "query"
 *        bun solomon-memory.ts --topic add <name> <content>
 *        bun solomon-memory.ts --topic list
 *        bun solomon-memory.ts --topic get <name>
 *        bun solomon-memory.ts --archive
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync, unlinkSync, renameSync } from "node:fs";
import { join, basename } from "node:path";

const MEMORY_DIR = process.env.SOLOMON_VAULT || "/home/workspace/solomon-vault";
const DAILY_DIR = `${MEMORY_DIR}/memory/daily`;
const TOPICS_DIR = `${MEMORY_DIR}/memory/topics`;
const ARCHIVE_DIR = `${MEMORY_DIR}/memory/archive`;
const INDEX_FILE = `${MEMORY_DIR}/memory/index.json`;
const ARCHIVE_AGE_DAYS = 30;

function today(): string {
  return new Date().toISOString().split("T")[0];
}

function ensureDirs() {
  for (const d of [MEMORY_DIR, DAILY_DIR, TOPICS_DIR, ARCHIVE_DIR]) {
    if (!existsSync(d)) mkdirSync(d, { recursive: true });
  }
}

function getIndex(): { entries: Array<{ path: string; type: string; updated: string; size: number }> } {
  try {
    return JSON.parse(readFileSync(INDEX_FILE, "utf-8"));
  } catch {
    return { entries: [] };
  }
}

function saveIndex(index: ReturnType<typeof getIndex>) {
  writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
}

function updateIndex(path: string, type: string) {
  const index = getIndex();
  const existing = index.entries.findIndex(e => e.path === path);
  const entry = { path, type, updated: new Date().toISOString(), size: existsSync(path) ? statSync(path).size : 0 };
  if (existing >= 0) index.entries[existing] = entry;
  else index.entries.push(entry);
  saveIndex(index);
}

// ─── Daily Logs ───────────────────────────────────────────────

function getDailyPath(date?: string): string {
  return join(DAILY_DIR, `${date || today()}.md`);
}

function appendDaily(content: string, date?: string): string {
  ensureDirs();
  const path = getDailyPath(date);
  const entry = `\n## ${new Date().toISOString()} — SESSION LOG\n\n${content}\n`;
  const existing = existsSync(path) ? readFileSync(path, "utf-8") : "";
  writeFileSync(path, existing + entry);
  updateIndex(path, "daily");
  return path;
}

function readDaily(date?: string): string {
  const path = getDailyPath(date);
  return existsSync(path) ? readFileSync(path, "utf-8") : "(empty)";
}

// ─── Topic Files ──────────────────────────────────────────────

function getTopicPath(name: string): string {
  return join(TOPICS_DIR, `${name}.md`);
}

function writeTopic(name: string, content: string): string {
  ensureDirs();
  const path = getTopicPath(name);
  writeFileSync(path, content);
  updateIndex(path, "topic");
  return path;
}

function readTopic(name: string): string {
  const path = getTopicPath(name);
  return existsSync(path) ? readFileSync(path, "utf-8") : "(not found)";
}

function listTopics(): Array<{ name: string; updated: string; size: number }> {
  ensureDirs();
  return readdirSync(TOPICS_DIR)
    .filter(f => f.endsWith(".md"))
    .map(f => {
      const p = join(TOPICS_DIR, f);
      const s = statSync(p);
      return { name: f.replace(".md", ""), updated: s.mtime.toISOString(), size: s.size };
    });
}

// ─── Search ────────────────────────────────────────────────────

function search(query: string): Array<{ path: string; type: string; preview: string }> {
  const results: Array<{ path: string; type: string; preview: string }> = [];
  const ql = query.toLowerCase();

  for (const dir of [DAILY_DIR, TOPICS_DIR]) {
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir).filter(f => f.endsWith(".md"))) {
      const p = join(dir, file);
      const content = readFileSync(p, "utf-8").toLowerCase();
      if (content.includes(ql)) {
        const idx = content.indexOf(ql);
        const start = Math.max(0, idx - 60);
        const end = Math.min(content.length, idx + ql.length + 60);
        results.push({
          path: p,
          type: dir === DAILY_DIR ? "daily" : "topic",
          preview: "..." + readFileSync(p, "utf-8").slice(start, end) + "...",
        });
      }
    }
  }
  return results;
}

// ─── Archive ──────────────────────────────────────────────────

async function archiveOldLogs(): Promise<string[]> {
  ensureDirs();
  const archived: string[] = [];
  const cutoff = Date.now() - ARCHIVE_AGE_DAYS * 24 * 60 * 60 * 1000;

  for (const file of readdirSync(DAILY_DIR).filter(f => f.endsWith(".md"))) {
    const p = join(DAILY_DIR, file);
    const s = statSync(p);
    if (s.mtimeMs < cutoff) {
      const archivePath = join(ARCHIVE_DIR, file);
      renameSync(p, archivePath);
      archived.push(archivePath);
      // Update index
      const index = getIndex();
      const idx = index.entries.findIndex(e => e.path === p);
      if (idx >= 0) {
        index.entries[idx].path = archivePath;
        index.entries[idx].type = "archive";
      }
      saveIndex(index);
    }
  }
  return archived;
}

// ─── CLI ──────────────────────────────────────────────────────

const args = process.argv.slice(2);
const cmd = args[0];

async function main() {
  ensureDirs();

  if (!cmd || cmd === "--help" || cmd === "-h") {
    console.log(`Solomon Memory Layer
Usage:
  bun solomon-memory.ts --today              Show today's log
  bun solomon-memory.ts --append "<text>"   Append to today's log
  bun solomon-memory.ts --search "<query>"  Search all memory
  bun solomon-memory.ts --topic add <name> <content>  Add/update topic file
  bun solomon-memory.ts --topic list         List all topics
  bun solomon-memory.ts --topic get <name>   Read a topic
  bun solomon-memory.ts --archive            Archive logs >30 days
  bun solomon-memory.ts --index             Show memory index
  bun solomon-memory.ts --help              Show this help
`);
    process.exit(0);
  }

  if (cmd === "--today") {
    console.log(readDaily());
    process.exit(0);
  }

  if (cmd === "--append") {
    const content = args.slice(1).join(" ");
    const path = appendDaily(content);
    console.log(`Appended to ${path}`);
    process.exit(0);
  }

  if (cmd === "--search") {
    const query = args[1];
    if (!query) { console.error("Missing query"); process.exit(1); }
    const results = search(query);
    if (!results.length) { console.log("No results found."); process.exit(0); }
    for (const r of results) {
      console.log(`\n[${r.type}] ${r.path}`);
      console.log(r.preview);
    }
    process.exit(0);
  }

  if (cmd === "--topic") {
    const sub = args[1];
    if (sub === "list") {
      const topics = listTopics();
      if (!topics.length) { console.log("No topics yet."); process.exit(0); }
      for (const t of topics) console.log(`  ${t.name} (${t.size}b, ${t.updated.split("T")[0]})`);
      process.exit(0);
    }
    if (sub === "get") {
      const name = args[2];
      if (!name) { console.error("Missing topic name"); process.exit(1); }
      console.log(readTopic(name));
      process.exit(0);
    }
    if (sub === "add") {
      const name = args[2];
      const content = args.slice(3).join(" ");
      if (!name || !content) { console.error("Usage: --topic add <name> <content>"); process.exit(1); }
      const path = writeTopic(name, content);
      console.log(`Topic '${name}' saved to ${path}`);
      process.exit(0);
    }
    console.error(`Unknown topic subcommand: ${sub}`);
    process.exit(1);
  }

  if (cmd === "--archive") {
    const archived = await archiveOldLogs();
    console.log(`Archived ${archived.length} old logs`);
    for (const a of archived) console.log(`  ${a}`);
    process.exit(0);
  }

  if (cmd === "--index") {
    const index = getIndex();
    console.log(`Memory index (${index.entries.length} entries):`);
    for (const e of index.entries) {
      console.log(`  [${e.type}] ${e.path} (${e.size}b, ${e.updated.split("T")[0]})`);
    }
    process.exit(0);
  }

  console.error(`Unknown command: ${cmd}`);
  process.exit(1);
}

main().catch(console.error);
