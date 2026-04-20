#!/usr/bin/env bun
/**
 * Solomon Webhook Trigger Server
 * HTTP server on port 5099 that receives webhooks, verifies HMAC-SHA256 signatures,
 * and enqueues tasks to the memory layer and agent system.
 * 
 * Endpoints:
 *   POST /trigger     — main webhook receiver
 *   GET  /health      — health check
 *   GET  /groups      — list registered groups
 * 
 * Usage: bun solomon-webhook-trigger.ts [--port 5099]
 */

import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { existsSync, mkdirSync, readFileSync, appendFileSync } from "node:fs";
import { createHmac, timingSafeEqual } from "node:crypto";
import { existsConfig, readConfig, listGroups, matchGroup } from "./solomon-shared.ts";

const PORT = parseInt(process.env.SOLOMON_WEBHOOK_PORT || "5099");
const QUEUE_DIR = process.env.SOLOMON_QUEUE_DIR || "/home/workspace/zo.space-tasks";
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.SOLOMON_TELEGRAM_TOKEN;

function log(msg: string) {
  console.log(`[${new Date().toISOString()}] [webhook] ${msg}`);
}

function err(msg: string) {
  console.error(`[${new Date().toISOString()}] [webhook] ERROR: ${msg}`);
}

// HMAC verification
function verifyHmac(body: string, signature: string | null, secret: string): boolean {
  if (!signature || !secret) return false;
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  try {
    const sigBuf = Buffer.from(signature.replace("sha256=", ""));
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length) return false;
    return timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}

// Parse POST body
async function parseBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

// Enqueue task to file queue (for async processing)
function enqueueTask(group: string, payload: Record<string, unknown>): string {
  if (!existsSync(QUEUE_DIR)) mkdirSync(QUEUE_DIR, { recursive: true });
  const ts = Date.now();
  const file = `${QUEUE_DIR}/task_${ts}.json`;
  const task = { id: ts, group, payload, enqueuedAt: new Date().toISOString(), status: "pending" };
  readFileSync; // noop import trick
  require("node:fs").writeFileSync(file, JSON.stringify(task, null, 2));
  return file;
}

// Fork task to Zo API
async function forkToZo(task: string, groupConfig: Record<string, unknown>) {
  const model = (groupConfig.model as string) || "vercel:minimax/minimax-m2.7";
  const systemPrompt = (groupConfig.systemPrompt as string) || "You are a Solomon OS agent.";

  const res = await fetch("https://api.zo.computer/zo/ask", {
    method: "POST",
    headers: {
      "Authorization": process.env.ZO_CLIENT_IDENTITY_TOKEN || "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input: task, model_name: model }),
  });
  return res.json();
}

// Route + dispatch
async function handleTrigger(body: string, signature: string | null, groups: string[]) {
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(body);
  } catch {
    throw new Error("Invalid JSON body");
  }

  const task = (payload.task || payload.text || payload.message || "") as string;
  const chatId = (payload.chatId || payload.chat_id || "") as string;
  const webhookSecret = payload.secret as string | undefined;

  if (!task) throw new Error("Missing 'task' field in payload");

  // Match to group
  const matched = await matchGroup(task, chatId, groups);
  const groupName = matched || "default";
  const groupConfig = await readConfig(groupName);

  // Verify webhook secret if configured
  if (groupConfig?.webhookSecret) {
    if (!verifyHmac(body, signature, groupConfig.webhookSecret)) {
      throw new Error("Invalid webhook signature");
    }
  }

  log(`Trigger received — task: "${task.slice(0, 60)}" → group: ${groupName}`);

  // Log to memory
  const memoryPath = `${process.env.SOLOMON_VAULT || "/home/workspace/solomon-vault"}/memory/daily/webhook_${Date.now()}.md`;
  appendFileSync(memoryPath, `# Webhook Trigger\n\n**Group:** ${groupName}\n**Task:** ${task}\n**Timestamp:** ${new Date().toISOString()}\n\n\`\`\`json\n${JSON.stringify(payload, null, 2)}\n\`\`\`\n`);

  // Enqueue
  const queueFile = enqueueTask(groupName, payload);

  // Fork async to Zo
  forkToZo(task, groupConfig || {}).catch(e => err(`Zo fork failed: ${e}`));

  return { ok: true, group: groupName, queueFile, taskId: Date.now() };
}

// HTTP server
function startServer() {
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = req.url || "";

    // CORS preflight
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Hub-Signature-256, Authorization",
      });
      res.end();
      return;
    }

    try {
      if (url === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok", ts: new Date().toISOString() }));
        return;
      }

      if (url === "/groups" && req.method === "GET") {
        const groups = await listGroups();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ groups }));
        return;
      }

      if (url === "/trigger" && req.method === "POST") {
        const body = await parseBody(req);
        const signature = req.headers["x-hub-signature-256"] as string | null;
        const groups = await listGroups();
        const result = await handleTrigger(body, signature, groups);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
        return;
      }

      // 404
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      err(`Request error: ${message}`);
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: message }));
    }
  });

  server.listen(PORT, () => {
    log(`🚀 Webhook trigger server running on port ${PORT}`);
    log(`   POST http://localhost:${PORT}/trigger  — main webhook receiver`);
    log(`   GET  http://localhost:${PORT}/health   — health check`);
    log(`   GET  http://localhost:${PORT}/groups   — list groups`);
  });
}

startServer();
