/**
 * Solomon Shared — Config + Group matching utilities
 * Used by router, webhook trigger, and other orchestrator scripts.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const CONFIG_DIR = process.env.SOLOMON_CONFIG_DIR || "/home/workspace/MegaPlan/configs/groups";
const DEFAULT_GROUP = "default";

export interface GroupConfig {
  name: string;
  model: string;
  systemPrompt: string;
  tools: string[];
  maxTokensPerRun: number;
  costLimitCents: number;
  extensions: string[];
  telegramChatIds: string[];
  webhookSecret: string | null;
  keywords?: string[];
}

export function ensureConfigDir() {
  if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true });
}

export function configPath(name: string): string {
  return join(CONFIG_DIR, `${name}.json`);
}

export async function existsConfig(name: string): Promise<boolean> {
  return existsSync(configPath(name));
}

export async function readConfig(name: string): Promise<GroupConfig | null> {
  const path = configPath(name);
  if (!existsSync(path)) return null;
  try {
    const content = readFileSync(path, "utf-8");
    return JSON.parse(content) as GroupConfig;
  } catch {
    return null;
  }
}

export async function writeConfig(name: string, config: GroupConfig): Promise<void> {
  ensureConfigDir();
  writeFileSync(configPath(name), JSON.stringify(config, null, 2));
}

export async function listGroups(): Promise<string[]> {
  ensureConfigDir();
  return readdirSync(CONFIG_DIR)
    .filter(f => f.endsWith(".json"))
    .map(f => f.replace(".json", ""));
}

export async function matchGroup(
  message: string,
  chatId: string,
  groups: string[]
): Promise<string | null> {
  // Priority 1: explicit chatId match
  for (const name of groups) {
    const cfg = await readConfig(name);
    if (!cfg) continue;
    if (cfg.telegramChatIds?.includes(chatId)) return name;
  }

  // Priority 2: keyword match
  const lowerMsg = message.toLowerCase();
  for (const name of groups) {
    const cfg = await readConfig(name);
    if (!cfg || !cfg.keywords?.length) continue;
    if (cfg.keywords.some((kw: string) => lowerMsg.includes(kw.toLowerCase()))) return name;
  }

  return null;
}

export async function createDefaultConfig(): Promise<GroupConfig> {
  const defaultConfig: GroupConfig = {
    name: DEFAULT_GROUP,
    model: "vercel:minimax/minimax-m2.7",
    systemPrompt: "You are a Solomon OS agent. Be concise, resourceful, and act on behalf of Joseph.",
    tools: ["Bash", "Read", "Write"],
    maxTokensPerRun: 4000,
    costLimitCents: 10,
    extensions: ["memory", "cost-tracker"],
    telegramChatIds: [],
    webhookSecret: null,
    keywords: [],
  };
  await writeConfig(DEFAULT_GROUP, defaultConfig);
  return defaultConfig;
}

export async function ensureDefaultConfig(): Promise<GroupConfig> {
  if (!(await existsConfig(DEFAULT_GROUP))) {
    return createDefaultConfig();
  }
  return (await readConfig(DEFAULT_GROUP))!;
}

// Initialize default config on first import
ensureConfigDir();
