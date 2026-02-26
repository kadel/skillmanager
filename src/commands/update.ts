import { existsSync, readdirSync, rmSync, cpSync, mkdtempSync } from "fs";
import { join, basename } from "path";
import { tmpdir } from "os";
import { SKILLS_DIR, validateSkillDir, log, info, error, success } from "../utils.js";
import {
  readMetadata,
  writeMetadata,
  type SkillMetadata,
  type GitHubMetadata,
  type LocalMetadata,
} from "../metadata.js";
import { parseGitHubUrl, downloadSkill, fetchLatestCommit } from "../sources/github.js";
import { getGitCommit } from "../sources/local.js";

interface UpdateOptions {
  skillName?: string;
  all: boolean;
  force: boolean;
  dryRun: boolean;
}

export async function update(options: UpdateOptions): Promise<void> {
  const { skillName, all, force, dryRun } = options;

  if (!skillName && !all) {
    error("Specify a skill name or use --all");
    process.exit(1);
  }

  if (!existsSync(SKILLS_DIR)) {
    error(`Skills directory not found: ${SKILLS_DIR}`);
    process.exit(1);
  }

  const skillNames = all ? getInstalledSkills() : [skillName!];

  if (skillNames.length === 0) {
    log("No installed skills with metadata found.");
    return;
  }

  for (const name of skillNames) {
    await updateSkill(name, force, dryRun);
  }
}

function getInstalledSkills(): string[] {
  if (!existsSync(SKILLS_DIR)) return [];

  return readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => {
      const metadata = readMetadata(join(SKILLS_DIR, entry.name));
      return metadata !== null;
    })
    .map((entry) => entry.name);
}

async function updateSkill(
  skillName: string,
  force: boolean,
  dryRun: boolean
): Promise<void> {
  const skillDir = join(SKILLS_DIR, skillName);

  if (!existsSync(skillDir)) {
    error(`Skill '${skillName}' is not installed`);
    return;
  }

  const metadata = readMetadata(skillDir);
  if (!metadata) {
    error(`Skill '${skillName}' has no metadata — cannot update. Reinstall it.`);
    return;
  }

  info(`Checking '${skillName}' for updates...`);

  if (metadata.source_type === "github") {
    await updateGitHubSkill(skillName, skillDir, metadata, force, dryRun);
  } else {
    await updateLocalSkill(skillName, skillDir, metadata, force, dryRun);
  }
}

async function updateGitHubSkill(
  skillName: string,
  skillDir: string,
  metadata: GitHubMetadata,
  force: boolean,
  dryRun: boolean
): Promise<void> {
  const parsed = parseGitHubUrl(metadata.source_url);

  let latestCommit: string;
  try {
    latestCommit = await fetchLatestCommit(parsed);
  } catch (err) {
    error(
      `Failed to check for updates: ${err instanceof Error ? err.message : err}`
    );
    return;
  }

  if (latestCommit === metadata.github_commit && !force) {
    log(`  Up to date (commit: ${latestCommit.slice(0, 12)})`);
    return;
  }

  if (latestCommit === metadata.github_commit && force) {
    log(`  Already at latest commit, but --force specified`);
  } else {
    log(
      `  Update available: ${metadata.github_commit.slice(0, 12)} -> ${latestCommit.slice(0, 12)}`
    );
  }

  if (dryRun) {
    log(`  Would update skill '${skillName}'`);
    return;
  }

  const tmpDir = mkdtempSync(join(tmpdir(), "skillmanager-update-"));

  try {
    await downloadSkill(parsed, tmpDir);
    validateSkillDir(tmpDir);

    // Replace skill contents
    rmSync(skillDir, { recursive: true });
    cpSync(tmpDir, skillDir, { recursive: true });

    // Update metadata
    const now = new Date().toISOString();
    const updatedMetadata: GitHubMetadata = {
      ...metadata,
      github_commit: latestCommit,
      updated_at: now,
    };
    writeMetadata(skillDir, updatedMetadata);

    success(`  Updated '${skillName}'`);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

async function updateLocalSkill(
  skillName: string,
  skillDir: string,
  metadata: LocalMetadata,
  force: boolean,
  dryRun: boolean
): Promise<void> {
  const sourcePath = metadata.source_path;

  if (!existsSync(sourcePath)) {
    error(`Source path no longer exists: ${sourcePath}`);
    return;
  }

  const currentCommit = await getGitCommit(sourcePath);
  const storedCommit = metadata.local_git_commit;

  // Determine if update is needed
  let needsUpdate = force;

  if (storedCommit && currentCommit) {
    if (storedCommit !== currentCommit) {
      log(
        `  Update available: ${storedCommit.slice(0, 12)} -> ${currentCommit.slice(0, 12)}`
      );
      needsUpdate = true;
    } else if (!force) {
      log(`  Up to date (commit: ${currentCommit.slice(0, 12)})`);
      return;
    } else {
      log(`  Already at latest commit, but --force specified`);
    }
  } else {
    // No git commits to compare — always update if force, otherwise note it
    if (!force) {
      log(`  No git commit info available. Use --force to re-copy.`);
      return;
    }
    log(`  --force specified, re-copying from source`);
    needsUpdate = true;
  }

  if (!needsUpdate) return;

  if (dryRun) {
    log(`  Would update skill '${skillName}'`);
    return;
  }

  validateSkillDir(sourcePath);

  // Replace skill contents
  rmSync(skillDir, { recursive: true });
  cpSync(sourcePath, skillDir, { recursive: true });

  // Update metadata
  const now = new Date().toISOString();
  const updatedMetadata: LocalMetadata = {
    ...metadata,
    updated_at: now,
    ...(currentCommit ? { local_git_commit: currentCommit } : {}),
  };
  writeMetadata(skillDir, updatedMetadata);

  success(`  Updated '${skillName}'`);
}
