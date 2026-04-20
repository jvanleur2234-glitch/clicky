#!/usr/bin/env bun
/**
 * Solomon Extension System
 * Pluggable capability registry for Solomon OS agents.
 * 
 * Extensions hook into the agent lifecycle:
 *   beforeAgent(ctx)  — runs before agent starts (setup, logging, etc.)
 *   afterAgent(ctx, result) — runs after agent completes (cleanup, memory, etc.)
 *   onError(ctx, err) — runs when agent errors
 * 
 * Usage: bun solomon-extension.ts --list
 *        bun solomon-extension.ts --enable <name>
 *        bun solomon-extension.ts --disable <name>
 *        bun solomon-extension.ts --register <name> <script.ts>
 *        bun solomon-extension.ts --run <name> <hook> <json-context>
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const EXT_DIR = process.env.SOLOMON_EXT_DIR || "/home/workspace/.solomon-extensions";
const REGISTRY_FILE = `${EXT_DIR}/registry.json`;
const ENABLED_FILE = `${EXT_DIR}/enabled.json`;

export interface AgentContext {
  task: string;
  group: string;
  model: string;
  agentId: string;
  startTime: number;
  chatId?: string;
  messageId?: number;
  webhookPayload?: Record<string, unknown>;
}

export interface AgentResult {
  output: string;
  durationMs: number;
  tokens?: number;
  costCents?: number;
}

export interface Extension {
  name: string;
  description?: string;
  hooks: {
    beforeAgent?: (ctx: AgentContext) => Promise<void>;
    afterAgent?: (ctx: AgentContext, result: AgentResult) => Promise<void>;
    onError?: (ctx: AgentContext, err: Error) => Promise<void>;
  };
}

interface Registry {
  extensions: Record<string, { path: string; description?: string; hooks: string[] }>;
  enabled: Record<string, string[]>; // group -> enabled extension names
}

function ensureDirs() {
  mkdirSync(EXT_DIR, { recursive: true });
  mkdirSync(`${EXT_DIR}/scripts`, { recursive: true });
}

function loadRegistry(): Registry {
  try {
    return JSON.parse(readFileSync(REGISTRY_FILE, "utf-8"));
  } catch {
    return { extensions: {}, enabled: {} };
  }
}

function saveRegistry(reg: Registry) {
  writeFileSync(REGISTRY_FILE, JSON.stringify(reg, null, 2));
}

function loadEnabled(): Record<string, boolean> {
  try {
    return JSON.parse(readFileSync(ENABLED_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function saveEnabled(enabled: Record<string, boolean>) {
  writeFileSync(ENABLED_FILE, JSON.stringify(enabled, null, 2));
}

async function importExtension(path: string): Promise<Extension> {
  // Dynamic import for Bun
  const mod = await import(path);
  return mod.default || mod;
}

async function runHook(hook: "beforeAgent" | "afterAgent" | "onError", ctx: AgentContext, arg?: unknown) {
  const registry = loadRegistry();
  const enabled = loadEnabled();

  for (const [name, ext] of Object.entries(registry.extensions)) {
    if (!enabled[name]) continue;
    try {
      const extInst = await importExtension(ext.path);
      const fn = extInst.hooks[hook];
      if (fn) {
        console.log(`[ext] Running ${hook} for ${name}`);
        if (hook === "afterAgent") {
          await fn(ctx, arg as AgentResult);
        } else if (hook === "onError") {
          await fn(ctx, arg as Error);
        } else {
          await fn(ctx);
        }
      }
    } catch (e) {
      console.error(`[ext] ${hook} failed for ${name}: ${e}`);
    }
  }
}

// Built-in extensions
const builtInExtensions: Record<string, Extension> = {
  memory: {
    name: "memory",
    description: "Logs all agent runs to Solomon memory layer",
    hooks: {
      afterAgent: async (ctx, result) => {
        const { appendDaily } = await import("./solomon-memory.js");
        // Import from compiled path
        const memoryPath = `${process.env.SOLOMON_VAULT || "/home/workspace/solomon-vault"}/memory/daily/${new Date().toISOString().split("T")[0]}.md`;
        const entry = `\n## Agent Run [${ctx.group}] ${new Date().toISOString()}\n\n**Task:** ${ctx.task}\n**Output:** ${result.output?.slice(0, 200) || "—"}\n**Duration:** ${result.durationMs}ms\n`;
        require("node:fs").appendFileSync(memoryPath, entry);
      },
    },
  },
  "cost-tracker": {
    name: "cost-tracker",
    description: "Records cost per agent run",
    hooks: {
      afterAgent: async (ctx, result) => {
        if (result.costCents !== undefined) {
          const { execSync } = require("child_process");
          execSync(
            `bun solomon-cost-tracker.ts --record "${ctx.group}" ${result.tokens || 0} ${result.costCents} "${ctx.task.slice(0, 50).replace(/"/g, "\\\"")}"`,
            { cwd: "/home/workspace/Skills/solomon-orchestrator/scripts" }
          );
        }
      },
    },
  },
  logger: {
    name: "logger",
    description: "Logs all agent lifecycle events to stdout",
    hooks: {
      beforeAgent: async (ctx) => {
        console.log(`[agent] Starting ${ctx.agentId} on task: ${ctx.task.slice(0, 80)}`);
      },
      afterAgent: async (ctx, result) => {
        console.log(`[agent] Finished ${ctx.agentId} in ${result.durationMs}ms`);
      },
      onError: async (ctx, err) => {
        console.error(`[agent] Error in ${ctx.agentId}: ${err.message}`);
      },
    },
  },
  webhook: {
    name: "webhook",
    description: "POSTs agent results to configured webhook URLs",
    hooks: {
      afterAgent: async (ctx, result) => {
        const webhookUrl = process.env[`SOLOMON_WEBHOOK_URL_${ctx.group.toUpperCase()}`];
        if (webhookUrl && result.output) {
          fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ctx, result }),
          }).catch(e => console.error(`[webhook] POST failed: ${e}`));
        }
      },
    },
  },
};

// CLI
const args = process.argv.slice(2);
const cmd = args[0];

async function main() {
  ensureDirs();
  const registry = loadRegistry();
  const enabled = loadEnabled();

  if (!cmd || cmd === "--list") {
    console.log("\n=== Solomon Extension Registry ===\n");
    
    // Show built-ins
    console.log("Built-in extensions:");
    for (const [name, ext] of Object.entries(builtInExtensions)) {
      const isEnabled = enabled[name] ? "✅" : "❌";
      console.log(`  ${isEnabled} ${name} — ${ext.description}`);
    }
    
    // Show registered
    const registered = Object.entries(registry.extensions);
    if (registered.length) {
      console.log("\nRegistered extensions:");
      for (const [name, ext] of registered) {
        const isEnabled = enabled[name] ? "✅" : "❌";
        console.log(`  ${isEnabled} ${name} — ${ext.description || "no description"} [${ext.hooks.join(", ")}]`);
      }
    }

    console.log("\nGroup-specific enabled:");
    for (const [group, exts] of Object.entries(registry.enabled)) {
      console.log(`  [${group}]: ${exts.join(", ") || "(none)"}`);
    }
    process.exit(0);
  }

  if (cmd === "--enable") {
    const name = args[1];
    if (!name) { console.error("Usage: --enable <name>"); process.exit(1); }
    enabled[name] = true;
    saveEnabled(enabled);
    console.log(`Enabled: ${name}`);
    process.exit(0);
  }

  if (cmd === "--disable") {
    const name = args[1];
    if (!name) { console.error("Usage: --disable <name>"); process.exit(1); }
    delete enabled[name];
    saveEnabled(enabled);
    console.log(`Disabled: ${name}`);
    process.exit(0);
  }

  if (cmd === "--run") {
    const name = args[1] as keyof typeof builtInExtensions;
    const hook = args[2] as "beforeAgent" | "afterAgent" | "onError";
    const ctxJson = args[3] || "{}";
    const ctx = JSON.parse(ctxJson) as AgentContext;

    const ext = builtInExtensions[name] || (await importExtension(registry.extensions[name]?.path || ""));
    if (!ext) { console.error(`Extension '${name}' not found`); process.exit(1); }

    const fn = ext.hooks[hook];
    if (!fn) { console.error(`No '${hook}' hook in '${name}'`); process.exit(1); }

    if (hook === "beforeAgent") await fn(ctx);
    else if (hook === "afterAgent") await fn(ctx, { output: "test", durationMs: 0 });
    else if (hook === "onError") await fn(ctx, new Error("test error"));
    process.exit(0);
  }

  console.log(`Solomon Extension System
Usage:
  bun solomon-extension.ts --list              List all extensions
  bun solomon-extension.ts --enable <name>    Enable extension globally
  bun solomon-extension.ts --disable <name>   Disable extension globally
  bun solomon-extension.ts --run <name> <hook> <json-ctx>  Run a hook manually
`);
  process.exit(1);
}

main().catch(console.error);
