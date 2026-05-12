import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { getAllSkillsDirs } from "../agents.js";
import { log, info } from "../utils.js";
import { readMetadata } from "../metadata.js";

interface ListEntry {
  name: string;
  agent: string;
  scope: string;
  source: string;
  commit: string;
  updatedAt: string;
}

export function list(): void {
  const entries: ListEntry[] = [];

  for (const dirEntry of getAllSkillsDirs()) {
    if (!existsSync(dirEntry.dir)) continue;

    const dirs = readdirSync(dirEntry.dir, { withFileTypes: true }).filter(
      (d) => d.isDirectory()
    );

    for (const d of dirs) {
      const skillDir = join(dirEntry.dir, d.name);
      const metadata = readMetadata(skillDir);
      if (!metadata) continue;

      const source =
        metadata.source_type === "github"
          ? metadata.source_url
          : metadata.source_path;
      const commit =
        metadata.source_type === "github"
          ? metadata.github_commit.slice(0, 12)
          : metadata.local_git_commit?.slice(0, 12) ?? "unknown";

      entries.push({
        name: d.name,
        agent: metadata.agent ?? dirEntry.agent,
        scope: dirEntry.scope,
        source,
        commit,
        updatedAt: metadata.updated_at,
      });
    }
  }

  if (entries.length === 0) {
    log("No skills installed.");
    return;
  }

  info(`Installed skills (${entries.length}):\n`);

  const grouped = new Map<string, ListEntry[]>();
  for (const entry of entries) {
    const key = `${entry.agent} (${entry.scope})`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(entry);
  }

  for (const [group, skills] of grouped) {
    info(`  ${group}:`);
    for (const skill of skills) {
      log(`    ${skill.name}`);
      log(`      source:  ${skill.source}`);
      log(`      commit:  ${skill.commit}`);
      log(`      updated: ${skill.updatedAt}`);
    }
    log("");
  }
}
