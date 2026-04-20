import { parseArgs } from "node:util";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    repo: { type: "string" },
    dest: { type: "string" },
    branch: { type: "string" },
  },
});

if (!values.repo || !values.dest) {
  console.error("Usage: gh-clone.js --repo <url-or-owner/repo> --dest <path>");
  process.exit(1);
}

// Ensure parent dir exists
const parent = values.dest.substring(0, values.dest.lastIndexOf("/"));
if (parent && !existsSync(parent)) {
  mkdirSync(parent, { recursive: true });
}

let cmd = `git clone`;
if (values.branch) cmd += ` --branch "${values.branch}"`;
cmd += ` "${values.repo}" "${values.dest}"`;

try {
  const result = execSync(cmd, { encoding: "utf-8" });
  console.log(`Cloned to: ${values.dest}`);
} catch (e) {
  console.error("Clone failed:", e.message);
  process.exit(1);
}
