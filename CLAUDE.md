# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

`skillmanager` is a Node/TypeScript CLI tool that installs and updates agent skills from local paths or GitHub URLs. It supports multiple agents (claude, openclaw, codex, gemini) with both project-level and global installation scopes. It copies skill directories, validates they contain a `SKILL.md`, and tracks provenance via `.metadata.json` files for later updates.

## Commands

```bash
# Install dependencies
npm install

# Build
npm run build

# Run the CLI
npx skillmanager install <source> --agent <name> [--agent <name>...] [-g | -p] [--force] [--dry-run]
npx skillmanager list
npx skillmanager update [<skill-name>] [--all] [--force] [--dry-run]

# Type check
npx tsc --noEmit
```

## Architecture

The CLI has three commands (`install`, `list`, `update`) with two source types each (local filesystem and GitHub) and multi-agent support:

- `src/index.ts` — Entry point, arg parsing, command dispatch
- `src/agents.ts` — Agent registry (claude, openclaw, codex, gemini) with project/global path configs
- `src/commands/install.ts` — Copies a skill directory to the target agent's skills dir, writes `.metadata.json` for tracking
- `src/commands/update.ts` — Scans all agent dirs, reads `.metadata.json`, compares git commits to detect changes, re-copies if newer
- `src/commands/list.ts` — Lists all installed skills across all agent directories, grouped by agent
- `src/sources/github.ts` — Parses `github.com/owner/repo/tree/branch/path` URLs, downloads repo tarballs, extracts the skill subdirectory, fetches latest commit SHA via GitHub API
- `src/sources/local.ts` — Resolves local paths (with `~` expansion), gets git HEAD commit for change detection
- `src/metadata.ts` — `GitHubMetadata` and `LocalMetadata` types (with `agent` field), read/write `.metadata.json`
- `src/utils.ts` — `validateSkillDir` (checks for `SKILL.md`), colored logging helpers

GitHub installs download the full branch tarball and extract only the target subdirectory using `tar --strip-components`. The `GITHUB_TOKEN` env var is used for API requests if set.
