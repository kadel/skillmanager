import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

export interface GitHubMetadata {
  source_type: "github";
  source_url: string;
  github_commit: string;
  installed_at: string;
  updated_at: string;
}

export interface LocalMetadata {
  source_type: "local";
  source_path: string;
  local_git_commit?: string;
  installed_at: string;
  updated_at: string;
}

export type SkillMetadata = GitHubMetadata | LocalMetadata;

const METADATA_FILE = ".metadata.json";

export function writeMetadata(
  skillDir: string,
  metadata: SkillMetadata
): void {
  const filePath = join(skillDir, METADATA_FILE);
  writeFileSync(filePath, JSON.stringify(metadata, null, 2) + "\n");
}

export function readMetadata(skillDir: string): SkillMetadata | null {
  const filePath = join(skillDir, METADATA_FILE);
  if (!existsSync(filePath)) {
    return null;
  }
  const content = readFileSync(filePath, "utf-8");
  return JSON.parse(content) as SkillMetadata;
}
