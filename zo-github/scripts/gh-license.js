import { parseArgs } from "node:util";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    path: { type: "string" },
    url: { type: "string" },
  },
});

if (!values.path && !values.url) {
  console.error("Usage: gh-license.js --path <repo-path> OR --url <github-url>");
  process.exit(1);
}

const LICENSE_PATTERNS = [
  "LICENSE",
  "LICENSE.md",
  "LICENSE.txt",
  "LICENCE",
  "COPYING",
  "COPYING.md",
];

function findLicenseFile(repoPath) {
  const entries = readdirSync(repoPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile()) {
      const lower = entry.name.toLowerCase();
      if (LICENSE_PATTERNS.some(p => lower === p.toLowerCase())) {
        return join(repoPath, entry.name);
      }
    }
  }
  return null;
}

function analyzeLicense(content) {
  const lower = content.toLowerCase();

  // Detect license type
  let spdx = "UNKNOWN";
  if (lower.includes("mit license") || lower.includes("permission is hereby granted, free of charge")) spdx = "MIT";
  else if (lower.includes("apache license") && lower.includes("version 2.0")) spdx = "Apache-2.0";
  else if (lower.includes("gnu general public license") && lower.includes("version 3")) spdx = "GPL-3.0";
  else if (lower.includes("gnu general public license") && lower.includes("version 2")) spdx = "GPL-2.0";
  else if (lower.includes("gnu lesser general public license")) spdx = "LGPL";
  else if (lower.includes("gnu affero general public license")) spdx = "AGPL";
  else if (lower.includes("bsd license") && lower.includes("redistribution and use in source and binary forms")) spdx = "BSD";
  else if (lower.includes("isc license") || lower.includes("Permission to use, copy, modify, and/or distribute")) spdx = "ISC";
  else if (lower.includes("unlicense") || lower.includes("This is free and unencumbered software")) spdx = "Unlicense";
  else if (lower.includes("cc0") || lower.includes("creative commons zero")) spdx = "CC0-1.0";
  else if (lower.includes("creative commons") && lower.includes(" Attribution")) spdx = "CC-BY";
  else if (lower.includes("creative commons") && lower.includes("sharealike")) spdx = "CC-BY-SA";
  else if (lower.includes("mozilla public license")) spdx = "MPL";

  const analysis = {
    spdx,
    canUseCommercially: false,
    canModify: false,
    canCombine: false,
    canSell: false,
    canKeepSourcePrivate: false,
    requiresAttribution: false,
    requiresShareAlike: false,
    requiresSourceDisclosure: false,
    patentGrant: false,
    warnsOnTrademark: false,
    warnings: [],
  };

  if (spdx === "UNKNOWN") {
    analysis.warnings.push("Could not identify license — treat as all rights reserved.");
    console.log(JSON.stringify(analysis, null, 2));
    return;
  }

  // Commercial use
  if (!lower.includes("noncommercial") && !lower.includes("non-commercial") &&
      !lower.includes("private use") && spdx !== "CC-BY-NC" && spdx !== "CC-BY-NC-SA") {
    analysis.canUseCommercially = true;
  }

  // Modification
  if (!lower.includes("modifications") || lower.includes("modifications and derivative works are permitted")) {
    analysis.canModify = true;
  }

  // Patent grant
  if (lower.includes("patent") && (lower.includes("granted") || lower.includes("license") && lower.includes("patent"))) {
    analysis.patentGrant = true;
  }

  // GPL family — strong copyleft
  if (spdx.startsWith("GPL") && !spdx.includes(" LGPL")) {
    analysis.canCombine = false;
    analysis.canSell = false;
    analysis.requiresSourceDisclosure = true;
    analysis.warnings.push("Strong copyleft — derivative works must be released under same license.");
  } else if (spdx === "LGPL") {
    analysis.canCombine = true;
    analysis.canSell = true;
    analysis.requiresSourceDisclosure = true;
    analysis.warnings.push("Weak copyleft — can combine with proprietary code if linking dynamically.");
  } else if (spdx === "AGPL") {
    analysis.canCombine = false;
    analysis.canSell = false;
    analysis.requiresSourceDisclosure = true;
    analysis.warnings.push("AGPL — even stricter than GPL, especially for network use.");
  } else if (spdx === "MIT" || spdx === "Apache-2.0" || spdx === "BSD" || spdx === "ISC" || spdx === "Unlicense") {
    analysis.canCombine = true;
    analysis.canSell = true;
    analysis.canKeepSourcePrivate = true;
    analysis.requiresAttribution = true;
    if (spdx === "Apache-2.0") {
      analysis.patentGrant = true;
      analysis.warnsOnTrademark = true;
    }
  } else if (spdx === "CC0") {
    analysis.canCombine = true;
    analysis.canSell = true;
    analysis.canKeepSourcePrivate = true;
  } else if (spdx === "CC-BY") {
    analysis.canCombine = true;
    analysis.canSell = true;
    analysis.requiresAttribution = true;
  } else if (spdx === "CC-BY-SA") {
    analysis.canCombine = true;
    analysis.canSell = true;
    analysis.requiresAttribution = true;
    analysis.requiresShareAlike = true;
  }

  // No license = no rights
  if (spdx === "UNKNOWN" && content.trim().length < 50) {
    analysis.warnings.push("No license file found — default copyright applies. Do NOT use without permission.");
  }

  console.log(JSON.stringify(analysis, null, 2));
}

if (values.path) {
  const licensePath = findLicenseFile(values.path);
  if (!licensePath) {
    const result = { spdx: "NONE", warnings: ["No license file found in repository root."] };
    console.log(JSON.stringify(result, null, 2));
  } else {
    const content = readFileSync(licensePath, "utf-8");
    console.error(`Analyzing: ${licensePath}`);
    analyzeLicense(content);
  }
} else if (values.url) {
  // Fetch LICENSE from GitHub API
  const match = values.url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) {
    console.error("Invalid GitHub URL");
    process.exit(1);
  }
  const [,, owner, repo] = match;
  const cleanRepo = repo.replace(/\.git$/, "");
  try {
    const result = execSync(
      `curl -s "https://api.github.com/repos/${owner}/${cleanRepo}/license" --jq '.license.spdx_id, .content'`,
      { encoding: "utf-8" }
    );
    console.log(result);
  } catch (e) {
    console.error("Failed to fetch license:", e.message);
  }
}
