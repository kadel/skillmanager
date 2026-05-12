import { existsSync, readdirSync, rmSync } from "fs";
import { join } from "path";
import { getAllSkillsDirs } from "../agents.js";
import { log, info, error, success } from "../utils.js";
import { readMetadata } from "../metadata.js";

interface UninstallOptions {
  skillName: string;
  dryRun: boolean;
}

export function uninstall(options: UninstallOptions): void {
  const { skillName, dryRun } = options;

  const found: { dir: string; agent: string; scope: string }[] = [];

  for (const entry of getAllSkillsDirs()) {
    const skillDir = join(entry.dir, skillName);
    if (existsSync(skillDir)) {
      found.push({ dir: skillDir, agent: entry.agent, scope: entry.scope });
    }
  }

  if (found.length === 0) {
    error(`Skill '${skillName}' is not installed`);
    process.exit(1);
  }

  for (const { dir, agent, scope } of found) {
    info(`Removing skill '${skillName}' (${agent}, ${scope})...`);
    log(`  Path: ${dir}`);

    const metadata = readMetadata(dir);
    if (metadata) {
      if (metadata.source_type === "github") {
        log(`  Source: ${metadata.source_url}`);
      } else {
        log(`  Source: ${metadata.source_path}`);
      }
    }

    log("");

    if (dryRun) {
      log(`Would remove skill '${skillName}' from ${dir}`);
      continue;
    }

    rmSync(dir, { recursive: true });
    success(`Removed skill '${skillName}' (${agent})`);
  }

  if (dryRun) {
    log("");
    log("Dry run complete. No changes made.");
  }
}
