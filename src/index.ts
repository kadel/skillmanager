#!/usr/bin/env node
import { install } from "./commands/install.js";
import { list } from "./commands/list.js";
import { uninstall } from "./commands/uninstall.js";
import { update } from "./commands/update.js";
import { error, log } from "./utils.js";

const HELP = `
skillmanager - Install and update Claude Code skills

Usage:
  skillmanager install <local-path-or-github-url> [--force] [--dry-run]
  skillmanager list
  skillmanager uninstall <skill-name> [--dry-run]
  skillmanager update [<skill-name>] [--all] [--force] [--dry-run]

Commands:
  install    Install a skill from a local path or GitHub URL
  list       List all installed skills
  uninstall  Remove an installed skill
  update     Check for updates and re-install changed skills

Options:
  --force    Overwrite existing skill / force re-install
  --dry-run  Show what would be done without making changes
  --all      Update all installed skills (update command only)
  --help     Show this help message

Examples:
  skillmanager install ~/Code/my-plugins/skills/my-skill
  skillmanager install https://github.com/owner/repo/tree/branch/path/to/skill
  skillmanager install ./plugins/jira-utils/skills/use-jira-cli --force
  skillmanager uninstall my-skill
  skillmanager update my-skill --dry-run
  skillmanager update --all
`.trim();

function parseArgs(argv: string[]) {
  // argv[0] = bun, argv[1] = script path
  const args = argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    log(HELP);
    process.exit(0);
  }

  const subcommand = args[0];
  const rest = args.slice(1);

  const flags = {
    force: false,
    dryRun: false,
    all: false,
  };

  const positional: string[] = [];

  for (const arg of rest) {
    switch (arg) {
      case "--force":
        flags.force = true;
        break;
      case "--dry-run":
        flags.dryRun = true;
        break;
      case "--all":
        flags.all = true;
        break;
      default:
        if (arg.startsWith("-")) {
          error(`Unknown option: ${arg}`);
          process.exit(1);
        }
        positional.push(arg);
        break;
    }
  }

  return { subcommand, positional, flags };
}

async function main() {
  const { subcommand, positional, flags } = parseArgs(process.argv);

  switch (subcommand) {
    case "install": {
      if (positional.length === 0) {
        error("Missing source argument for install");
        log("Usage: skillmanager install <local-path-or-github-url> [--force] [--dry-run]");
        process.exit(1);
      }
      if (positional.length > 1) {
        error("Only one source argument is allowed");
        process.exit(1);
      }
      await install({
        source: positional[0],
        force: flags.force,
        dryRun: flags.dryRun,
      });
      break;
    }
    case "list": {
      list();
      break;
    }
    case "uninstall": {
      if (positional.length === 0) {
        error("Missing skill name for uninstall");
        log("Usage: skillmanager uninstall <skill-name> [--dry-run]");
        process.exit(1);
      }
      if (positional.length > 1) {
        error("Only one skill name is allowed");
        process.exit(1);
      }
      uninstall({
        skillName: positional[0],
        dryRun: flags.dryRun,
      });
      break;
    }
    case "update": {
      await update({
        skillName: positional[0],
        all: flags.all,
        force: flags.force,
        dryRun: flags.dryRun,
      });
      break;
    }
    default:
      error(`Unknown command: ${subcommand}`);
      log(HELP);
      process.exit(1);
  }
}

main().catch((err) => {
  error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
