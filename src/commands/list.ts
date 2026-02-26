import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { SKILLS_DIR, log, info } from "../utils.js";
import { readMetadata } from "../metadata.js";

export function list(): void {
  if (!existsSync(SKILLS_DIR)) {
    log("No skills installed.");
    return;
  }

  const entries = readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      name: entry.name,
      metadata: readMetadata(join(SKILLS_DIR, entry.name)),
    }))
    .filter((entry) => entry.metadata !== null);

  if (entries.length === 0) {
    log("No skills installed.");
    return;
  }

  info(`Installed skills (${entries.length}):\n`);

  for (const { name, metadata } of entries) {
    const source =
      metadata!.source_type === "github"
        ? metadata!.source_url
        : metadata!.source_path;
    const commit =
      metadata!.source_type === "github"
        ? metadata!.github_commit.slice(0, 12)
        : metadata!.local_git_commit?.slice(0, 12) ?? "unknown";

    log(`  ${name}`);
    log(`    source: ${source}`);
    log(`    commit: ${commit}`);
    log(`    updated: ${metadata!.updated_at}`);
    log("");
  }
}
