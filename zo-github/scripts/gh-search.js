import { parseArgs } from "node:util";
import { execSync } from "node:child_process";

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    query: { type: "string" },
    language: { type: "string" },
    stars: { type: "string" },
    limit: { type: "string", default: "10" },
  },
});

if (!values.query) {
  console.error("Usage: gh-search.js --query <searchterm> [--language js] [--stars >100] [--limit 10]");
  process.exit(1);
}

let q = values.query;
if (values.language) q += ` language:${values.language}`;
if (values.stars) q += ` stars:${values.stars}`;

const limit = parseInt(values.limit);

try {
  const output = execSync(
    `gh search repos "${q}" --limit ${limit} --json name,fullName,description,license,stargazersCount,url,language --jq '.[] | {name, full_name: .fullName, description, license: .license.spdxId, stars: .stargazersCount, url, language}'`,
    { encoding: "utf-8" }
  );
  const repos = output.trim().split("\n").map(line => {
    try { return JSON.parse(line); } catch { return line; }
  });
  console.log(JSON.stringify(repos, null, 2));
} catch (e) {
  console.error("Search failed:", e.message);
  process.exit(1);
}
