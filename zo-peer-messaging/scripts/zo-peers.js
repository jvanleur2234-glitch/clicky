#!/usr/bin/env bun
/**
 * zo-peer-messaging - Peer-to-peer messaging for Zo agents
 * Based on claude-peers-mcp methodology (louislva/claude-peers-mcp)
 * 
 * Allows Zo agent sessions to:
 * - Register as a peer with workspace info
 * - Discover other active peers
 * - Send/receive messages between peers
 * - Coordinate on shared tasks
 */

import { parseArgs } from "node:util";
import { Database } from "bun:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { randomUUID } from "crypto";

// DB path
const PEER_DB_DIR = `${homedir()}/.zo/peers`;
const PEER_DB_PATH = `${PEER_DB_DIR}/peers.db`;

function ensureDb() {
  if (!existsSync(PEER_DB_DIR)) {
    mkdirSync(PEER_DB_DIR, { recursive: true });
  }
  const db = new Database(PEER_DB_PATH);
  
  // Peers table
  db.run(`
    CREATE TABLE IF NOT EXISTS peers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      workspace TEXT NOT NULL,
      conversation_id TEXT,
      task TEXT,
      model TEXT,
      last_seen INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);
  
  // Messages table
  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      from_peer TEXT NOT NULL,
      to_peer TEXT NOT NULL,
      content TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (from_peer) REFERENCES peers(id),
      FOREIGN KEY (to_peer) REFERENCES peers(id)
    )
  `);
  
  return db;
}

const COMMANDS = {
  register: "register",
  list: "list",
  send: "send",
  messages: "messages",
  unregister: "unregister",
  ping: "ping"
};

const args = parseArgs({
  args: Bun.argv,
  options: {
    name: { type: "string", short: "n" },
    workspace: { type: "string", short: "w" },
    task: { type: "string", short: "t" },
    model: { type: "string", short: "m" },
    to: { type: "string", short: "t" },
    message: { type: "string", short: "M" },
    conversation: { type: "string", short: "c" }
  },
  allowPositionals: true
});

const db = ensureDb();
const peerId = process.env.ZO_PEER_ID || "";
const command = args.positionals[2] || "help";

switch (command) {
  case COMMANDS.register: {
    const name = args.values.name || `agent-${randomUUID().slice(0, 8)}`;
    const workspace = args.values.workspace || process.cwd();
    const task = args.values.task || "";
    const model = args.values.model || "minimax-m2.7";
    const conversationId = args.values.conversation || randomUUID();
    const now = Date.now();
    
    if (peerId) {
      db.run(
        `UPDATE peers SET name=?, workspace=?, task=?, model=?, conversation_id=?, last_seen=? WHERE id=?`,
        [name, workspace, task, model, conversationId, now, peerId]
      );
      console.log(JSON.stringify({ success: true, id: peerId, conversation_id: conversationId }));
    } else {
      const id = randomUUID();
      db.run(
        `INSERT INTO peers (id, name, workspace, conversation_id, task, model, last_seen, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, name, workspace, conversationId, task, model, now, now]
      );
      console.log(JSON.stringify({ success: true, id, conversation_id: conversationId }));
    }
    break;
  }
  
  case COMMANDS.list: {
    const now = Date.now();
    const ttl = 5 * 60 * 1000; // 5 min TTL
    
    // Mark stale peers
    db.run(`DELETE FROM peers WHERE last_seen < ?`, [now - ttl]);
    
    const peers = db.query(`SELECT id, name, workspace, task, model, last_seen FROM peers ORDER BY last_seen DESC`).all();
    console.log(JSON.stringify(peers));
    break;
  }
  
  case COMMANDS.send: {
    const to = args.values.to;
    const content = args.values.message;
    const fromPeer = peerId;
    
    if (!to || !content || !fromPeer) {
      console.error(JSON.stringify({ error: "Usage: zo-peers send --to <peer-id> --message <text>" }));
      process.exit(1);
    }
    
    const id = randomUUID();
    const now = Date.now();
    db.run(
      `INSERT INTO messages (id, from_peer, to_peer, content, created_at) VALUES (?, ?, ?, ?, ?)`,
      [id, fromPeer, to, content, now]
    );
    console.log(JSON.stringify({ success: true, message_id: id }));
    break;
  }
  
  case COMMANDS.messages: {
    const toPeer = peerId;
    if (!toPeer) {
      console.error(JSON.stringify({ error: "Not registered as a peer" }));
      process.exit(1);
    }
    
    const messages = db.query(
      `SELECT m.*, p.name as from_name FROM messages m JOIN peers p ON m.from_peer = p.id WHERE m.to_peer = ? AND m.read = 0 ORDER BY m.created_at ASC`
    ).all(toPeer);
    
    // Mark as read
    db.run(`UPDATE messages SET read = 1 WHERE to_peer = ?`, [toPeer]);
    
    console.log(JSON.stringify(messages));
    break;
  }
  
  case COMMANDS.unregister: {
    if (peerId) {
      db.run(`DELETE FROM messages WHERE from_peer = ? OR to_peer = ?`, [peerId, peerId]);
      db.run(`DELETE FROM peers WHERE id = ?`, [peerId]);
    }
    console.log(JSON.stringify({ success: true }));
    break;
  }
  
  case COMMANDS.ping: {
    if (!peerId) {
      console.log(JSON.stringify({ registered: false }));
      break;
    }
    db.run(`UPDATE peers SET last_seen = ? WHERE id = ?`, [Date.now(), peerId]);
    const peer = db.query(`SELECT * FROM peers WHERE id = ?`).get(peerId);
    console.log(JSON.stringify({ registered: true, peer }));
    break;
  }
  
  default:
    console.log(`Zo Peer Messaging — inter-agent communication
Based on claude-peers-mcp methodology

USAGE:
  zo-peers register --name <name> --workspace <path> --task <task>
  zo-peers list
  zo-peers send --to <peer-id> --message <text>
  zoep <peer-id>
  zo-peers unregister

ENV:
  ZO_PEER_ID  Set to your peer ID to persist across calls
`);
}

db.close();
