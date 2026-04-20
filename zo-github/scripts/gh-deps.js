import { parseArgs } from "node:util";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    path: { type: "string" },
  },
});

if (!values.path) {
  console.error("Usage: gh-deps.js --path <repo-path>");
  process.exit(1);
}

const result = {
  packageManagers: [],
  dependencies: [],
  devDependencies: [],
  peerDependencies: [],
  systemDeps: [],
  scripts: {},
};

const files = readdirSync(values.path);

// Detect package manager and parse deps
if (files.includes("package.json")) {
  result.packageManagers.push("npm/yarn/pnpm");
  const pkg = JSON.parse(readFileSync(join(values.path, "package.json"), "utf-8"));
  result.dependencies = Object.keys(pkg.dependencies || {});
  result.devDependencies = Object.keys(pkg.devDependencies || {});
  result.peerDependencies = Object.keys(pkg.peerDependencies || {});
  result.scripts = pkg.scripts || {};
}

if (files.includes("requirements.txt")) {
  result.packageManagers.push("pip");
  const content = readFileSync(join(values.path, "requirements.txt"), "utf-8");
  result.dependencies = result.dependencies.concat(
    content.split("\n").filter(l => l.trim() && !l.startsWith("#"))
  );
}

if (files.includes("Pipfile")) {
  result.packageManagers.push("pipenv");
}

if (files.includes("go.mod")) {
  result.packageManagers.push("go");
  const content = readFileSync(join(values.path, "go.mod"), "utf-8");
  const lines = content.split("\n");
  let inRequire = false;
  for (const line of lines) {
    if (line.startsWith("require (")) inRequire = true;
    else if (line === ")") inRequire = false;
    else if (inRequire && line.trim()) result.dependencies.push(line.trim());
  }
}

if (files.includes("Cargo.toml")) {
  result.packageManagers.push("cargo/rust");
  const content = readFileSync(join(values.path, "Cargo.toml"), "utf-8");
  const depsMatch = content.match(/\[dependencies\]([\s\S]*?)(?=\[|$)/);
  if (depsMatch) {
    const lines = depsMatch[1].split("\n").filter(l => l.trim() && !l.startsWith("#"));
    result.dependencies = result.dependencies.concat(lines.map(l => l.trim().split("=")[0].trim()));
  }
}

if (files.includes("pom.xml")) {
  result.packageManagers.push("maven");
  const content = readFileSync(join(values.path, "pom.xml"), "utf-8");
  const depMatches = content.matchAll(/<dependency>\s*<groupId>([^<]+)<\/groupId>\s*<artifactId>([^<]+)<\/artifactId>/g);
  for (const m of depMatches) {
    result.dependencies.push(`${m[1]}:${m[2]}`);
  }
}

if (files.includes("build.gradle") || files.includes("build.gradle.kts")) {
  result.packageManagers.push("gradle");
}

if (files.includes("setup.py") || files.includes("pyproject.toml")) {
  result.packageManagers.push("python");
}

if (files.includes("Dockerfile")) {
  result.systemDeps.push("docker");
}

if (files.includes("docker-compose.yml") || files.includes("docker-compose.yaml")) {
  result.systemDeps.push("docker-compose");
}

if (files.includes("Makefile")) {
  result.systemDeps.push("make");
}

if (files.includes("CMakeLists.txt")) {
  result.systemDeps.push("cmake");
}

console.log(JSON.stringify(result, null, 2));
