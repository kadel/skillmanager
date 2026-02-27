import { existsSync, rmSync } from "fs";
import { join } from "path";
import { SKILLS_DIR, log, info, error, success } from "../utils.js";
import { readMetadata } from "../metadata.js";

interface UninstallOptions {
  skillName: string;
  dryRun: boolean;
}

export function uninstall(options: UninstallOptions): void {
  const { skillName, dryRun } = options;
  const skillDir = join(SKILLS_DIR, skillName);

  if (!existsSync(skillDir)) {
    error(`Skill '${skillName}' is not installed`);
    process.exit(1);
  }

  info(`Removing skill '${skillName}'...`);
  log(`  Path: ${skillDir}`);

  const metadata = readMetadata(skillDir);
  if (metadata) {
    if (metadata.source_type === "github") {
      log(`  Source: ${metadata.source_url}`);
    } else {
      log(`  Source: ${metadata.source_path}`);
    }
  }

  log("");

  if (dryRun) {
    log(`Would remove skill '${skillName}' from ${skillDir}`);
    log("");
    log("Dry run complete. No changes made.");
    return;
  }

  rmSync(skillDir, { recursive: true });
  success(`Removed skill '${skillName}'`);
}
