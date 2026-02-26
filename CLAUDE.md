# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

`skillmanager` is a Node/TypeScript CLI tool that installs and updates Claude Code skills from local paths or GitHub URLs into `~/.claude/skills/`. It copies skill directories, validates they contain a `SKILL.md`, and tracks provenance via `.metadata.json` files for later updates.

## Commands

```bash
# Install dependencies
npm install

# Build
npm run build

# Run the CLI
node dist/index.js install <local-path-or-github-url> [--force] [--dry-run]
node dist/index.js update [<skill-name>] [--all] [--force] [--dry-run]

# Type check
npx tsc --noEmit
```

## Architecture

The CLI has two commands (`install` and `update`) with two source types each (local filesystem and GitHub):

- `src/index.ts` — Entry point, arg parsing, command dispatch
- `src/commands/install.ts` — Copies a skill directory to `~/.claude/skills/<name>/` from either a local path or GitHub URL, writes `.metadata.json` for tracking
- `src/commands/update.ts` — Reads `.metadata.json` from installed skills, compares git commits (local) or GitHub API commits to detect changes, re-copies if newer
- `src/sources/github.ts` — Parses `github.com/owner/repo/tree/branch/path` URLs, downloads repo tarballs, extracts the skill subdirectory, fetches latest commit SHA via GitHub API
- `src/sources/local.ts` — Resolves local paths (with `~` expansion), gets git HEAD commit for change detection
- `src/metadata.ts` — `GitHubMetadata` and `LocalMetadata` types, read/write `.metadata.json`
- `src/utils.ts` — `SKILLS_DIR` constant (`~/.claude/skills`), `validateSkillDir` (checks for `SKILL.md`), colored logging helpers

GitHub installs download the full branch tarball and extract only the target subdirectory using `tar --strip-components`. The `GITHUB_TOKEN` env var is used for API requests if set.
