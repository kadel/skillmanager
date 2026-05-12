# skillmanager

A CLI tool for installing and updating agent skills from local paths or GitHub URLs. Supports multiple agents (Claude Code, OpenClaw, Codex, Gemini CLI) with both project-level and global installation scopes.

## Why

Skills directories are becoming a standard path for AI coding assistants to discover reusable skills. Claude Code uses `~/.claude/skills/` natively, and other tools are adopting similar conventions. However, there is no built-in way to install skills into these directories from external sources, and more importantly, no way to keep them up to date as upstream skill repositories evolve.

skillmanager fills that gap. It handles installation from local paths or GitHub URLs, tracks provenance via metadata, and provides an update mechanism that detects upstream changes by comparing git commit SHAs.

## How it works

Skills are installed into the target agent's skills directory (e.g., `~/.claude/skills/` for Claude Code, `~/.codex/skills/` for Codex) where the agent can discover and use them. Use `--agent` to specify which agent(s) to install for, and `-g`/`-p` to choose global or project scope.

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18

## Quick start (no install needed)

Run directly with `npx`:

```bash
npx @tomaskral/skillmanager@latest install https://github.com/owner/repo/tree/main/path/to/skill
```

## Installation

If you prefer a persistent install:

```bash
npm install -g @tomaskral/skillmanager
```

After a global install, use `skillmanager` directly instead of `npx @tomaskral/skillmanager@latest`.

## Usage

The examples below use `npx` for convenience. If you installed globally, replace `npx @tomaskral/skillmanager@latest` with `skillmanager`.

### Install a skill

From a local path:

```bash
npx @tomaskral/skillmanager@latest install ~/Code/my-plugins/skills/my-skill --agent claude
npx @tomaskral/skillmanager@latest install ./plugins/jira-utils/skills/use-jira-cli --agent claude
```

From a GitHub URL (use the `tree` URL for the skill directory):

```bash
npx @tomaskral/skillmanager@latest install https://github.com/owner/repo/tree/main/path/to/skill --agent claude
```

Install for multiple agents at once:

```bash
npx @tomaskral/skillmanager@latest install ./my-skill --agent claude --agent codex
```

Install globally (to `~/.<agent>/skills/`) instead of the project directory:

```bash
npx @tomaskral/skillmanager@latest install ./my-skill --agent claude -g
```

If the skill already exists, use `--force` to overwrite:

```bash
npx @tomaskral/skillmanager@latest install ./path/to/skill --agent claude --force
```

Preview what would happen without making changes:

```bash
npx @tomaskral/skillmanager@latest install ./path/to/skill --agent claude --dry-run
```

### Uninstall a skill

```bash
npx @tomaskral/skillmanager@latest uninstall my-skill
```

Preview what would be removed without making changes:

```bash
npx @tomaskral/skillmanager@latest uninstall my-skill --dry-run
```

### Update installed skills

Update a single skill:

```bash
npx @tomaskral/skillmanager@latest update my-skill
```

Update all installed skills:

```bash
npx @tomaskral/skillmanager@latest update --all
```

Force re-install even if already up to date:

```bash
npx @tomaskral/skillmanager@latest update my-skill --force
```

## Details

1. **Install** copies a skill directory into the target agent's skills directory (e.g., `~/.claude/skills/<skill-name>/` for Claude Code global scope). The source directory must contain a `SKILL.md` file. A `.metadata.json` file is written alongside the skill to track where it came from, which agent it was installed for, and what commit it was installed from.

2. **Uninstall** removes an installed skill from all agents and scopes where it exists.

3. **Update** reads `.metadata.json` from installed skills and compares the stored git commit against the current commit at the source (local git HEAD or GitHub API). If a newer commit is found, the skill is re-copied.

### GitHub installs

GitHub sources are specified as `https://github.com/owner/repo/tree/branch/path/to/skill`. The tool downloads the branch tarball and extracts only the target subdirectory.

Authentication is resolved in order: the `GITHUB_TOKEN` environment variable, then the `gh` CLI (`gh auth token`). Set either to authenticate API requests and avoid rate limits:

```bash
export GITHUB_TOKEN=ghp_...
# or: gh auth login
```

### Metadata tracking

Each installed skill gets a `.metadata.json` file containing:

- **Source type** — `github` or `local`
- **Agent** — which agent the skill was installed for
- **Source location** — URL or filesystem path
- **Git commit SHA** — used for change detection during updates
- **Timestamps** — `installed_at` and `updated_at`

## Options reference

| Flag | Description |
|------|-------------|
| `--agent, -a <name>` | Target agent: `claude`, `openclaw`, `codex`, `gemini` (required for install, repeatable) |
| `-g, --global` | Install to user home directory (e.g., `~/.claude/skills/`) |
| `-p, --project` | Install to project directory (e.g., `.claude/skills/`) (default) |
| `--force` | Overwrite an existing skill or force re-install even if up to date |
| `--dry-run` | Show what would happen without making changes |
| `--all` | Update all installed skills (update command only) |
| `--help` | Show help message |
