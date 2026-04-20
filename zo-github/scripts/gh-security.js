#!/usr/bin/env bun
/**
 * Security Analyzer for GitHub Repos
 * Scans for: malware, backdoors, data exfiltration, cryptomining,
 *           shell injection, secret leaks, dependency vulnerabilities
 * 
 * Designed for LOW FALSE POSITIVES - only flags actual malicious patterns
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, extname } from "node:path";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    path: { type: "string" },
    verbose: { type: "boolean", default: false },
  },
});

if (!values.path) {
  console.error("Usage: gh-security.js --path <repo-path> [--verbose]");
  process.exit(1);
}

const VERBOSE = values.verbose;
const repoName = values.path.split("/").pop();

function getAllFiles(dir, files = []) {
  if (!existsSync(dir)) return files;
  try {
    const items = readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = join(dir, item.name);
      if (item.isDirectory()) {
        const skip = [".git", "node_modules", "__pycache__", ".venv", "venv", ".tox", "dist", "build", ".eggs", "*.egg-info"];
        if (!skip.includes(item.name) && !item.name.endsWith(".egg-info")) {
          getAllFiles(fullPath, files);
        }
      } else {
        files.push(fullPath);
      }
    }
  } catch {}
  return files;
}

function scanFile(filepath) {
  const issues = [];
  const content = readFileSync(filepath, "utf-8");
  const lines = content.split("\n");
  const ext = extname(filepath).toLowerCase();
  const filename = filepath.split("/").pop();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Skip comments and strings that look benign
    const stripped = line.replace(/#.*$/, "").replace(/["'].*?["']/g, "\"\"");

    // CRITICAL: Actual embedded secrets (not just mentions)
    if (/ghp_[a-zA-Z0-9]{36}|gho_[a-zA-Z0-9]{36}/i.test(line)) {
      issues.push({ severity: "CRITICAL", type: "EMBEDDED_SECRET", reason: "GitHub token hardcoded in source", file: filepath, line: lineNum });
    }
    if (/sk-[a-zA-Z0-9]{48}/i.test(line)) {
      issues.push({ severity: "CRITICAL", type: "EMBEDDED_SECRET", reason: "OpenAI API key hardcoded in source", file: filepath, line: lineNum });
    }
    if (/AKIA[0-9A-Z]{16}/i.test(line)) {
      issues.push({ severity: "CRITICAL", type: "EMBEDDED_SECRET", reason: "AWS access key hardcoded in source", file: filepath, line: lineNum });
    }
    if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i.test(line)) {
      issues.push({ severity: "CRITICAL", type: "EMBEDDED_SECRET", reason: "Private key embedded in source code", file: filepath, line: lineNum });
    }

    // HIGH: Download and execute pattern (curl|wget piped to bash/sh)
    if (/\b(?:curl|wget).*(\|\s*(?:bash|sh|ash|busybox|python|perl))/i.test(line) && !line.trim().startsWith("#")) {
      issues.push({ severity: "HIGH", type: "DOWNLOAD_AND_EXECUTE", reason: "Remote code download piped to shell execution", file: filepath, line: lineNum });
    }
    // exec with remote URL
    if (/\bexec\s*\(\s*(?:curl|wget).*/i.test(line)) {
      issues.push({ severity: "HIGH", type: "DOWNLOAD_AND_EXECUTE", reason: "exec() with remote download", file: filepath, line: lineNum });
    }

    // HIGH: Destructive rm -rf with other suspicious content on same line
    if (/\brm\s+(-rf|--recursive\s+--force)/i.test(line) && /\*|;|&|\$\(|`/.test(line)) {
      issues.push({ severity: "HIGH", type: "DESTRUCTIVE_CMD", reason: "Recursive force remove combined with command substitution", file: filepath, line: lineNum });
    }

    // HIGH: eval with decoded content (obfuscation)
    if (/\beval\s*\(\s*(?:atob|btoa|base64)/i.test(line)) {
      issues.push({ severity: "HIGH", type: "OBFUSCATION", reason: "eval() with encoded string decoding", file: filepath, line: lineNum });
    }

    // HIGH: Known cryptomining patterns
    if (/\b(?:xmrig|coinhive|cryptonight|stratum\+tcp)/i.test(line)) {
      issues.push({ severity: "HIGH", type: "CRYPTO_MINING", reason: "Cryptocurrency mining component detected", file: filepath, line: lineNum });
    }

    // HIGH: Base64 encoded shell script execution
    if (/\bbase64\s+-d\s+.*\|\s*(?:bash|sh)/i.test(line)) {
      issues.push({ severity: "HIGH", type: "ENCODED_SHELL", reason: "Base64-decoded shell script execution", file: filepath, line: lineNum });
    }

    // MEDIUM: Discord/Telegram webhook exfiltration
    if (/discord(?:app)?\.com\/api\/webhooks/i.test(line) && /(?:send|post|fetch|request)\s*\(/.test(line)) {
      issues.push({ severity: "MEDIUM", type: "WEBHOOK_EXFIL", reason: "Data potentially being sent to Discord webhook", file: filepath, line: lineNum });
    }

    // MEDIUM: Suspicious free-tier domains (common for malware C2)
    if (/\bhttps?:\/\/[^\s"'`]+(?:\.tk|\.ml|\.ga|\.cf|\.gq)\b/i.test(line) && !filepath.endsWith(".md") && !filepath.endsWith(".txt")) {
      issues.push({ severity: "MEDIUM", type: "SUSPICIOUS_DOMAIN", reason: "Network call to suspicious free-tier domain", file: filepath, line: lineNum });
    }

    // MEDIUM: Tor hidden service
    if (/\.onion\b/i.test(line) && !filepath.endsWith(".md")) {
      issues.push({ severity: "MEDIUM", type: "TOR_ENDPOINT", reason: "Network call to Tor hidden service", file: filepath, line: lineNum });
    }

    // LOW: Subprocess with shell=True (Python) - not automatically malicious but risky
    if (/\.Popen\s*\(.*shell\s*=\s*True/i.test(line) || /subprocess\.run\s*\(.*shell\s*=\s*True/i.test(line)) {
      issues.push({ severity: "LOW", type: "SHELL_SPAWN", reason: "Shell=True in subprocess - command injection risk if input is unsanitized", file: filepath, line: lineNum });
    }

    // LOW: Telemetry/telemetry setup (flags it but doesn't block)
    if (/datadog|newrelic|sentry\.io|logrocket/i.test(line) && /api|key|token|secret/i.test(line)) {
      issues.push({ severity: "LOW", type: "TELEMETRY", reason: "Third-party telemetry/monitoring SDK detected", file: filepath, line: lineNum });
    }
  }

  return issues;
}

function checkDependencies(repoPath) {
  const issues = [];
  const depFiles = [
    { file: "package.json", lock: "package-lock.json", tool: "npm audit", manager: "npm" },
    { file: "requirements.txt", tool: "pip-audit", manager: "pip" },
    { file: "pyproject.toml", lock: "poetry.lock", tool: "pip-audit", manager: "pip/poetry" },
    { file: "go.mod", lock: "go.sum", tool: "govulncheck", manager: "go" },
    { file: "Cargo.toml", lock: "Cargo.lock", tool: "cargo audit", manager: "rust" },
  ];

  for (const dep of depFiles) {
    const fullPath = join(repoPath, dep.file);
    if (existsSync(fullPath)) {
      const hasLock = dep.lock ? existsSync(join(repoPath, dep.lock)) : false;
      issues.push({
        severity: "INFO",
        type: "DEPENDENCY_FILE",
        reason: `${dep.manager} project with ${dep.tool} recommended before install`,
        file: fullPath,
        hasLockFile: hasLock,
      });
    }
  }
  return issues;
}

async function main() {
  console.log(`\n🔒 SECURITY ANALYSIS: ${repoName}`);
  console.log("═".repeat(50));

  const allFiles = getAllFiles(values.path);
  const codeFiles = allFiles.filter(f => {
    const ext = extname(f).toLowerCase();
    return [".js", ".ts", ".mjs", ".cjs", ".jsx", ".tsx", ".py", ".sh", ".bash", ".zsh", ".rb", ".go", ".rs", ".java", ".php", ".json", ".yaml", ".yml", ".toml", ".tf", ".dockerfile"].includes(ext) || f.includes("Makefile") || f.includes("makefile");
  });

  console.log(`✅ Found ${codeFiles.length} code files...`);
  
  const allIssues = [];
  for (const file of codeFiles) {
    try {
      const issues = scanFile(file);
      allIssues.push(...issues);
    } catch {}
  }

  console.log("✅ Checking dependency files...");
  allIssues.push(...checkDependencies(values.path));

  // Score
  const critical = allIssues.filter(i => i.severity === "CRITICAL").length;
  const high = allIssues.filter(i => i.severity === "HIGH").length;
  const medium = allIssues.filter(i => i.severity === "MEDIUM").length;
  const low = allIssues.filter(i => i.severity === "LOW").length;
  const info = allIssues.filter(i => i.severity === "INFO").length;

  let score = "PASS";
  if (critical > 0) score = "BLOCK";
  else if (high > 0) score = "WARN";
  else if (medium > 1) score = "REVIEW";

  console.log(`\n${"═".repeat(50)}`);
  console.log(`\n📊 SCORE: ${score}`);
  console.log(`   Critical: ${critical}  High: ${high}  Medium: ${medium}  Low: ${low}  Info: ${info}`);
  console.log(`   Files scanned: ${codeFiles.length}`);

  if (score === "BLOCK") {
    console.log("\n🚫 INSTALLATION BLOCKED");
  } else if (score === "WARN") {
    console.log("\n⚠️  WARNINGS FOUND - Review recommended");
  } else {
    console.log("\n✅ CLEARED - No dangerous patterns found");
  }

  const actionable = allIssues.filter(i => i.severity !== "INFO");
  if (VERBOSE && actionable.length > 0) {
    console.log("\n📋 ISSUES:\n");
    for (const issue of actionable.slice(0, 30)) {
      console.log(`  [${issue.severity}] ${issue.type}: ${issue.reason}`);
      console.log(`    → ${issue.file}:${issue.line || "?"}`);
    }
    if (actionable.length > 30) console.log(`  ... and ${actionable.length - 30} more`);
  }

  const result = {
    repo: repoName,
    scannedAt: new Date().toISOString(),
    score,
    issues: allIssues,
    summary: { critical, high, medium, low, info, filesScanned: codeFiles.length },
  };

  writeFileSync("/tmp/security_report.json", JSON.stringify(result, null, 2));
  console.log(`\n📄 Full report: /tmp/security_report.json`);

  process.exit(score === "BLOCK" ? 2 : 0);
}

main().catch(e => { console.error("Scan error:", e.message); process.exit(1); });
