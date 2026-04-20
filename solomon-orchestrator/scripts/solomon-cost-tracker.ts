#!/usr/bin/env bun
/**
 * Solomon Cost Tracker
 * Tracks tokens and cost per task/project/group.
 * Usage: bun solomon-cost-tracker.ts --summary
 *        bun solomon-cost-tracker.ts --project <name>
 *        bun solomon-cost-tracker.ts --record <project> <tokens> <costCents>
 *        bun solomon-cost-tracker.ts --export csv
 *        bun solomon-cost-tracker.ts --reset
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const DATA_DIR = process.env.SOLOMON_DATA_DIR || "/home/workspace/.solomon-data";
const COST_FILE = `${DATA_DIR}/costs.json`;
const RECORD_DIR = `${DATA_DIR}/records`;

interface CostRecord {
  id: string;
  project: string;
  group: string;
  tokens: number;
  costCents: number;
  timestamp: string;
  task?: string;
}

interface CostData {
  records: CostRecord[];
  lastUpdated: string;
}

function ensureDirs() {
  mkdirSync(DATA_DIR, { recursive: true });
  mkdirSync(RECORD_DIR, { recursive: true });
}

function loadData(): CostData {
  try {
    return JSON.parse(readFileSync(COST_FILE, "utf-8"));
  } catch {
    return { records: [], lastUpdated: new Date().toISOString() };
  }
}

function saveData(data: CostData) {
  writeFileSync(COST_FILE, JSON.stringify(data, null, 2));
}

function saveRecord(record: CostRecord) {
  ensureDirs();
  const data = loadData();
  data.records.push(record);
  data.lastUpdated = new Date().toISOString();
  saveData(data);
  // Also save individual record file for fast lookup
  const file = `${RECORD_DIR}/${record.id}.json`;
  writeFileSync(file, JSON.stringify(record, null, 2));
}

function projectRecords(project: string): CostRecord[] {
  const data = loadData();
  return data.records.filter(r => r.project === project);
}

function allProjects(): { name: string; totalTokens: number; totalCostCents: number; recordCount: number }[] {
  const data = loadData();
  const map = new Map<string, { name: string; totalTokens: number; totalCostCents: number; recordCount: number }>();
  for (const r of data.records) {
    const e = map.get(r.project) || { name: r.project, totalTokens: 0, totalCostCents: 0, recordCount: 0 };
    e.totalTokens += r.tokens;
    e.totalCostCents += r.costCents;
    e.recordCount++;
    map.set(r.project, e);
  }
  return Array.from(map.values()).sort((a, b) => b.totalCostCents - a.totalCostCents);
}

function summary() {
  const data = loadData();
  const projects = allProjects();
  const totalTokens = projects.reduce((s, p) => s + p.totalTokens, 0);
  const totalCost = projects.reduce((s, p) => s + p.totalCostCents, 0);

  console.log("\n=== SOLOMON COST SUMMARY ===");
  console.log(`Total records: ${data.records.length}`);
  console.log(`Total tokens:  ${totalTokens.toLocaleString()}`);
  console.log(`Total cost:    $${(totalCost / 100).toFixed(2)}`);
  console.log(`\nBy project:`);
  for (const p of projects) {
    console.log(`  ${p.name}: ${p.recordCount} runs, ${p.totalTokens.toLocaleString()} tokens, $${(p.totalCostCents / 100).toFixed(2)}`);
  }
  console.log(`\nLast updated: ${data.lastUpdated}`);
}

function showProject(name: string) {
  const records = projectRecords(name);
  if (!records.length) {
    console.log(`No records for project '${name}'`);
    return;
  }
  console.log(`\n=== ${name.toUpperCase()} — ${records.length} records ===`);
  const totalTokens = records.reduce((s, r) => s + r.tokens, 0);
  const totalCost = records.reduce((s, r) => s + r.costCents, 0);
  console.log(`Total: ${totalTokens.toLocaleString()} tokens, $${(totalCost / 100).toFixed(2)}`);
  console.log("\nRecent records:");
  for (const r of records.slice(-10).reverse()) {
    console.log(`  [${r.timestamp.split("T")[0]}] ${r.tokens.toLocaleString()} tokens, $${(r.costCents / 100).toFixed(3)}, task: ${r.task?.slice(0, 50) || "—"}`);
  }
}

function exportCsv() {
  const data = loadData();
  const lines = ["id,project,group,tokens,costCents,timestamp,task"];
  for (const r of data.records) {
    lines.push(`${r.id},"${r.project}","${r.group}",${r.tokens},${r.costCents},${r.timestamp},"${(r.task || "").replace(/"/g, '""')}"`);
  }
  const csv = lines.join("\n");
  const outFile = `${DATA_DIR}/costs_export_${Date.now()}.csv`;
  writeFileSync(outFile, csv);
  console.log(`Exported ${data.records.length} records to ${outFile}`);
}

const args = process.argv.slice(2);
const cmd = args[0];

async function main() {
  ensureDirs();

  if (!cmd || cmd === "--summary") {
    summary();
    process.exit(0);
  }

  if (cmd === "--project") {
    showProject(args[1] || "default");
    process.exit(0);
  }

  if (cmd === "--record") {
    const project = args[1] || "default";
    const tokens = parseInt(args[2] || "0");
    const costCents = parseFloat(args[3] || "0");
    const task = args.slice(4).join(" ");
    const record: CostRecord = {
      id: `rec_${Date.now()}`,
      project,
      group: "default",
      tokens,
      costCents,
      timestamp: new Date().toISOString(),
      task,
    };
    saveRecord(record);
    console.log(`Recorded: ${project}, ${tokens} tokens, $${(costCents / 100).toFixed(3)}`);
    process.exit(0);
  }

  if (cmd === "--export") {
    exportCsv();
    process.exit(0);
  }

  if (cmd === "--reset") {
    const data = loadData();
    console.log(`Clearing ${data.records.length} records...`);
    saveData({ records: [], lastUpdated: new Date().toISOString() });
    process.exit(0);
  }

  console.log(`Solomon Cost Tracker
Usage:
  bun solomon-cost-tracker.ts --summary          Show all-time summary
  bun solomon-cost-tracker.ts --project <name>  Show per-project breakdown
  bun solomon-cost-tracker.ts --record <project> <tokens> <costCents> [task]
  bun solomon-cost-tracker.ts --export csv       Export to CSV
  bun solomon-cost-tracker.ts --reset            Clear all records
`);
  process.exit(cmd === "--help" || cmd === "-h" ? 0 : 1);
}

main().catch(console.error);
