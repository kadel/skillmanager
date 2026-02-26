# skillmanager

A CLI tool for installing and updating [Claude Code](https://docs.anthropic.com/en/docs/claude-code) skills from local paths or GitHub URLs.

## Why

The `~/.claude/skills/` directory is becoming a standard path for AI coding assistants to discover reusable skills. Claude Code uses it natively, and other tools like Cursor are adopting the same convention. However, there is no built-in way to install skills into this directory from external sources, and more importantly, no way to keep them up to date as upstream skill repositories evolve.

skillmanager fills that gap. It handles installation from local paths or GitHub URLs, tracks provenance via metadata, and provides an update mechanism that detects upstream changes by comparing git commit SHAs.

## How it works

Skills are installed into `~/.claude/skills/` where Claude Code can discover and use them.

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18

## Installation

```bash
cd scripts/skillmanager
npm install
npm run build
```

## Usage

### Install a skill

From a local path:

```bash
node dist/index.js install ~/Code/my-plugins/skills/my-skill
node dist/index.js install ./plugins/jira-utils/skills/use-jira-cli
```

From a GitHub URL (use the `tree` URL for the skill directory):

```bash
node dist/index.js install https://github.com/owner/repo/tree/main/path/to/skill
```

If the skill already exists, use `--force` to overwrite:

```bash
node dist/index.js install ./path/to/skill --force
```

Preview what would happen without making changes:

```bash
node dist/index.js install ./path/to/skill --dry-run
```

### Update installed skills

Update a single skill:

```bash
node dist/index.js update my-skill
```

Update all installed skills:

```bash
node dist/index.js update --all
```

Force re-install even if already up to date:

```bash
node dist/index.js update my-skill --force
```

## Details

1. **Install** copies a skill directory into `~/.claude/skills/<skill-name>/`. The source directory must contain a `SKILL.md` file. A `.metadata.json` file is written alongside the skill to track where it came from and what commit it was installed from.

2. **Update** reads `.metadata.json` from installed skills and compares the stored git commit against the current commit at the source (local git HEAD or GitHub API). If a newer commit is found, the skill is re-copied.

### GitHub installs

GitHub sources are specified as `https://github.com/owner/repo/tree/branch/path/to/skill`. The tool downloads the branch tarball and extracts only the target subdirectory.

Set the `GITHUB_TOKEN` environment variable to authenticate API requests and avoid rate limits:

```bash
export GITHUB_TOKEN=ghp_...
```

### Metadata tracking

Each installed skill gets a `.metadata.json` file containing:

- **Source type** — `github` or `local`
- **Source location** — URL or filesystem path
- **Git commit SHA** — used for change detection during updates
- **Timestamps** — `installed_at` and `updated_at`

## Options reference

| Flag | Description |
|------|-------------|
| `--force` | Overwrite an existing skill or force re-install even if up to date |
| `--dry-run` | Show what would happen without making changes |
| `--all` | Update all installed skills (update command only) |
| `--help` | Show help message |
