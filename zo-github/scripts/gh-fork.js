import { parseArgs } from "node:util";
import { execSync } from "node:child_process";

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    owner: { type: "string" },
    repo: { type: "string" },
    org: { type: "string" },
  },
});

if (!values.owner || !values.repo) {
  console.error("Usage: gh-fork.js --owner <owner> --repo <repo> [--org <target-org>]");
  process.exit(1);
}

let cmd = `gh repo fork "${values.owner}/${values.repo}"`;
if (values.org) cmd += ` --org "${values.org}"`;
cmd += " --clone=false --fetch=false";

try {
  const result = execSync(cmd, { encoding: "utf-8" });
  console.log(result);
} catch (e) {
  console.error("Fork failed:", e.message);
  process.exit(1);
}
