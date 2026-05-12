---
name: Use skillmanager
description: Use this when the user mentions installing, updating, or managing agent skills.
---

# Use skillmanager

A CLI tool for installing, updating, and managing agent skills from local paths or GitHub URLs. Supports multiple agents with project-level and global installation scopes. Run via npx with no installation required:

```bash
npx @tomaskral/skillmanager@latest <command> [options]
```

## Supported Agents

Each agent has its own project and global skills directory:

- `claude` (Claude Code) — project: `.claude/skills/`, global: `~/.claude/skills/`
- `openclaw` (OpenClaw) — project: `skills/`, global: `~/.openclaw/skills/`
- `codex` (Codex) — project: `.agents/skills/`, global: `~/.codex/skills/`
- `gemini` (Gemini CLI) — project: `.agents/skills/`, global: `~/.gemini/skills/`

When the user does not specify an agent, ask which agent(s) to target. If the context makes the agent obvious (e.g., running inside Claude Code), default to that agent.

## Install

Install a skill from a local path or GitHub URL. The `--agent` flag is required.

```bash
# From a local path
npx @tomaskral/skillmanager@latest install ./path/to/skill --agent claude

# From a GitHub URL (must use the /tree/branch/path format)
npx @tomaskral/skillmanager@latest install https://github.com/owner/repo/tree/main/path/to/skill --agent claude

# Multiple agents at once
npx @tomaskral/skillmanager@latest install ./my-skill --agent claude --agent codex

# Global scope (to ~/.<agent>/skills/ instead of project directory)
npx @tomaskral/skillmanager@latest install ./my-skill --agent claude -g

# Overwrite existing
npx @tomaskral/skillmanager@latest install ./my-skill --agent claude --force

# Preview only
npx @tomaskral/skillmanager@latest install ./my-skill --agent claude --dry-run
```

The source directory must contain a `SKILL.md` file or installation will fail.

**Scopes:**

- **Project** (default, `-p`): installs into the current working directory (e.g., `.claude/skills/`). Appropriate for project-specific skills.
- **Global** (`-g`): installs into the user's home directory (e.g., `~/.claude/skills/`). Appropriate for skills that should be available across all projects.

Recommend global (`-g`) for general-purpose skills the user wants everywhere, and project (default) for skills tied to a specific codebase or workflow.

## Uninstall

Remove an installed skill from all agents and scopes where it exists.

```bash
npx @tomaskral/skillmanager@latest uninstall my-skill
npx @tomaskral/skillmanager@latest uninstall my-skill --dry-run
```

## List

Display all installed skills grouped by agent and scope, including source, commit SHA, and last update time.

```bash
npx @tomaskral/skillmanager@latest list
```

## Update

Check for upstream changes by comparing stored git commit SHAs and re-install if newer.

```bash
# Single skill
npx @tomaskral/skillmanager@latest update my-skill

# All installed skills
npx @tomaskral/skillmanager@latest update --all

# Force re-install even if up to date
npx @tomaskral/skillmanager@latest update my-skill --force

# Preview only
npx @tomaskral/skillmanager@latest update --all --dry-run
```

## Options Reference

- `--agent, -a <name>` — Target agent: `claude`, `openclaw`, `codex`, `gemini` (required for install, repeatable)
- `-g, --global` — Install to user home directory (e.g., `~/.claude/skills/`)
- `-p, --project` — Install to project directory (e.g., `.claude/skills/`) (default)
- `--force` — Overwrite existing skill or force re-install even if up to date
- `--dry-run` — Show what would happen without making changes
- `--all` — Update all installed skills (update command only)

## GitHub URL Format

GitHub URLs must use the `tree` format pointing to the skill directory:

```
https://github.com/owner/repo/tree/branch/path/to/skill
```

When the user provides a GitHub URL without the `/tree/branch/` segment (e.g., just `https://github.com/owner/repo`), prompt for the specific path to the skill directory within the repo and default the branch to `main`. If the URL points to a file rather than a directory, inform the user that skillmanager installs directories, not individual files.

## GitHub Authentication

For private repos or to avoid rate limits, authentication is resolved in order:

1. `GITHUB_TOKEN` environment variable
2. `gh auth token` from the GitHub CLI

If neither is set, public repos will still work but may hit rate limits. For private repos, suggest setting `GITHUB_TOKEN` or running `gh auth login`.

## How It Works

Each installed skill gets a `.metadata.json` file that tracks:

- **Source type** — `github` or `local`
- **Agent** — which agent the skill was installed for
- **Source location** — the original URL or filesystem path
- **Git commit SHA** — used for change detection during updates
- **Timestamps** — `installed_at` and `updated_at`

The `update` command reads this metadata, fetches the current commit SHA from the source (GitHub API or local git HEAD), and re-copies the skill only if the commit has changed. Use `--force` to bypass this check.

## Common Workflows

**Install a skill and verify:**

```bash
npx @tomaskral/skillmanager@latest install ./my-skill --agent claude -g
npx @tomaskral/skillmanager@latest list
```

**Update all skills and review changes:**

```bash
npx @tomaskral/skillmanager@latest update --all --dry-run
npx @tomaskral/skillmanager@latest update --all
```

**Replace a skill with a newer version from a different source:**

```bash
npx @tomaskral/skillmanager@latest uninstall old-skill
npx @tomaskral/skillmanager@latest install https://github.com/owner/repo/tree/main/new-skill --agent claude -g
```

## Troubleshooting

- **"No SKILL.md found"** — Source directory is missing `SKILL.md`. Verify the path points to a valid skill directory.
- **"Skill already exists"** — Skill already installed without `--force`. Add `--force` to overwrite, or `uninstall` first.
- **"Invalid GitHub URL format"** — URL missing `/tree/branch/path`. Reformat to `https://github.com/owner/repo/tree/branch/path/to/skill`.
- **"Failed to download tarball"** — Auth failure or wrong branch/path. Check that the repo, branch, and path exist. Set `GITHUB_TOKEN` for private repos.
- **"No commits found for path"** — The path does not exist in the repo on the specified branch. Verify the path.
- **Update shows "up to date"** — Commit SHA unchanged. Use `--force` to re-install regardless, or verify upstream changes were pushed.
