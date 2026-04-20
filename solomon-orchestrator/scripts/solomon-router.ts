#!/usr/bin/env bun
/**
 * Solomon Router — Channel Router
 * Polls Telegram for new messages, routes to agents by group config.
 * Usage: bun solomon-router.ts [--group <name>]
 */

import { existsConfig, readConfig, listGroups, matchGroup } from "./solomon-shared.ts";

const POLL_INTERVAL_MS = 3000;
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.SOLOMON_TELEGRAM_TOKEN;

interface TelegramUpdate {
  update_id: number;
  message?: {
    chat: { id: number; type: string };
    from?: { id: number };
    text?: string;
    date: number;
  };
}

interface RoutedTask {
  group: string;
  message: string;
  chatId: number;
  messageId: number;
  timestamp: number;
}

// Track last processed update to avoid duplicates
let lastUpdateId = 0;

async function telegramRequest(method: string, body?: Record<string, unknown>) {
  if (!TELEGRAM_TOKEN) {
    throw new Error("TELEGRAM_BOT_TOKEN not set in environment");
  }
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Telegram API error ${res.status}: ${err}`);
  }
  return res.json();
}

async function getUpdates(): Promise<TelegramUpdate[]> {
  const data = await telegramRequest("getUpdates", {
    offset: lastUpdateId + 1,
    timeout: POLL_INTERVAL_MS / 1000,
    allowed_updates: ["message"],
  });
  return data.result || [];
}

function log(msg: string) {
  console.log(`[${new Date().toISOString()}] [router] ${msg}`);
}

async function forkToZo(task: string, groupConfig: Record<string, unknown>) {
  const model = (groupConfig.model as string) || "vercel:minimax/minimax-m2.7";
  const systemPrompt = (groupConfig.systemPrompt as string) || "You are a Solomon OS agent.";
  
  const res = await fetch("https://api.zo.computer/zo/ask", {
    method: "POST",
    headers: {
      "Authorization": process.env.ZO_CLIENT_IDENTITY_TOKEN || "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: `[GROUP: ${groupConfig.name}] ${task}`,
      model_name: model,
    }),
  });
  const data = await res.json();
  return data.output || data;
}

async function processUpdate(update: TelegramUpdate) {
  const msg = update.message;
  if (!msg || !msg.chat || !msg.text) return;

  const chatId = msg.chat.id;
  const text = msg.text;
  const messageId = msg.message_id;
  const timestamp = msg.date;

  log(`Incoming from ${chatId}: ${text.slice(0, 80)}`);

  // Match message to a group
  const groups = await listGroups();
  const matched = await matchGroup(text, chatId.toString(), groups);

  if (!matched) {
    // Default to 'default' group
    const defaultConfig = await readConfig("default");
    if (defaultConfig) {
      log(`No group match — using 'default'`);
      await forkToZo(text, defaultConfig);
    }
    return;
  }

  const groupConfig = await readConfig(matched);
  if (!groupConfig) {
    log(`Group '${matched}' config not found, using 'default'`);
    const def = await readConfig("default");
    if (def) await forkToZo(text, def);
    return;
  }

  log(`Routing to group '${matched}'`);
  const result = await forkToZo(text, groupConfig);

  // Send response back to Telegram
  if (TELEGRAM_TOKEN && result) {
    await telegramRequest("sendMessage", {
      chat_id: chatId,
      text: typeof result === "string" ? result : JSON.stringify(result, null, 2),
      reply_to_message_id: messageId,
    });
  }
}

async function main() {
  console.log("🚀 Solomon Router starting...");
  console.log(`   Poll interval: ${POLL_INTERVAL_MS}ms`);
  console.log(`   Memory dir: ${process.env.SOLOMON_VAULT || "/home/workspace/solomon-vault"}/memory/`);

  if (!TELEGRAM_TOKEN) {
    console.warn("⚠️  TELEGRAM_BOT_TOKEN not set — router will not receive messages");
  }

  // Init memory index
  const memoryDir = `${process.env.SOLOMON_VAULT || "/home/workspace/solomon-vault"}/memory`;
  await Bun.write(`${memoryDir}/index.json`, JSON.stringify({ entries: [], updated: new Date().toISOString() }, null, 2)).catch(() => {});

  // Main poll loop
  while (true) {
    try {
      const updates = await getUpdates();
      for (const update of updates) {
        lastUpdateId = update.update_id;
        await processUpdate(update);
      }
    } catch (err) {
      log(`Error: ${err}`);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

main().catch(console.error);
