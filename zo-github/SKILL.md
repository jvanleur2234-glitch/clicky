---
name: zo-github
description: Search, fork, clone, and analyze GitHub repositories. Handles license compliance, dependency mapping, and repo integration for composable workflows.
compatibility: Created for Zo Computer
metadata:
  author: josephv.zo.computer
---

# zo-github Skill

Search, fork, clone, and analyze GitHub repositories. Core tool for the open-source composability system.

## Scripts

### `gh-search.js` — Search repositories
Search by keyword, language, topic, stars. Returns repo info + license.

```bash
bun Skills/zo-github/scripts/gh-search.js --query "image recognition" --language "JavaScript" --stars ">100"
```

### `gh-fork.js` — Fork a repository
Fork by owner/repo name. Returns the new fork URL.

```bash
bun Skills/zo-github/scripts/gh-fork.js --owner "facebook" --repo "react"
```

### `gh-clone.js` — Clone a repository
Clone any repo (yours or others) into the workspace.

```bash
bun Skills/zo-github/scripts/gh-clone.js --repo "https://github.com/owner/repo" --dest "/home/workspace/Projects/repo-name"
```

### `gh-license.js` — Analyze license for commercial use
Parse LICENSE file and determine if commercial use, modification, distribution, patent grant, and trademark use are allowed.

```bash
bun Skills/zo-github/scripts/gh-license.js --path "/home/workspace/Projects/some-repo"
```

### `gh-deps.js` — Map dependencies
Read package.json, requirements.txt, Cargo.toml, go.mod, etc. and output a dependency graph.

```bash
bun Skills/zo-github/scripts/gh-deps.js --path "/home/workspace/Projects/some-repo"
```

## License Compatibility Matrix

| License | Commercial Use | Modify | Combine | Sell |
|---------|----------------|--------|---------|------|
| MIT | ✅ | ✅ | ✅ | ✅ |
| Apache 2.0 | ✅ | ✅ | ✅ | ✅ |
| BSD 2/3-Clause | ✅ | ✅ | ✅ | ✅ |
| ISC | ✅ | ✅ | ✅ | ✅ |
| Unlicense | ✅ | ✅ | ✅ | ✅ |
| GPL v2/v3 | ⚠️ | ⚠️ | ⚠️ | ❌ |
| LGPL | ⚠️ | ⚠️ | ✅ | ❌ |
| AGPL | ⚠️ | ⚠️ | ⚠️ | ❌ |
| CC0 | ✅ | ✅ | ✅ | ✅ |
| CC BY | ✅ | ✅ | ✅ | ⚠️ |
| CC BY-SA | ✅ | ✅ | ⚠️ | ❌ |
| No License | ❌ | ❌ | ❌ | ❌ |

⚠️ = Conditional / restricted
