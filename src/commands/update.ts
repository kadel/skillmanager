import { existsSync, readdirSync, rmSync, cpSync, mkdtempSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { getAllSkillsDirs } from "../agents.js";
import { validateSkillDir, log, info, error, success } from "../utils.js";
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

interface InstalledSkill {
  name: string;
  dir: string;
  agent: string;
  scope: string;
}

export async function update(options: UpdateOptions): Promise<void> {
  const { skillName, all, force, dryRun } = options;

  if (!skillName && !all) {
    error("Specify a skill name or use --all");
    process.exit(1);
  }

  const installed = getInstalledSkills();

  if (installed.length === 0) {
    log("No installed skills with metadata found.");
    return;
  }

  const targets = all
    ? installed
    : installed.filter((s) => s.name === skillName);

  if (targets.length === 0) {
    error(`Skill '${skillName}' is not installed`);
    return;
  }

  for (const skill of targets) {
    await updateSkill(skill, force, dryRun);
  }
}

function getInstalledSkills(): InstalledSkill[] {
  const results: InstalledSkill[] = [];

  for (const entry of getAllSkillsDirs()) {
    if (!existsSync(entry.dir)) continue;

    const dirs = readdirSync(entry.dir, { withFileTypes: true }).filter((d) =>
      d.isDirectory()
    );

    for (const d of dirs) {
      const skillDir = join(entry.dir, d.name);
      const metadata = readMetadata(skillDir);
      if (!metadata) continue;
      results.push({
        name: d.name,
        dir: skillDir,
        agent: metadata.agent ?? entry.agent,
        scope: entry.scope,
      });
    }
  }

  return results;
}

async function updateSkill(
  skill: InstalledSkill,
  force: boolean,
  dryRun: boolean
): Promise<void> {
  const metadata = readMetadata(skill.dir);
  if (!metadata) {
    error(`Skill '${skill.name}' (${skill.agent}, ${skill.scope}) has no metadata — cannot update. Reinstall it.`);
    return;
  }

  info(`Checking '${skill.name}' (${skill.agent}, ${skill.scope}) for updates...`);

  if (metadata.source_type === "github") {
    await updateGitHubSkill(skill, metadata, force, dryRun);
  } else {
    await updateLocalSkill(skill, metadata, force, dryRun);
  }
}

async function updateGitHubSkill(
  skill: InstalledSkill,
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
    log(`  Would update skill '${skill.name}'`);
    return;
  }

  const tmpDir = mkdtempSync(join(tmpdir(), "skillmanager-update-"));

  try {
    await downloadSkill(parsed, tmpDir);
    validateSkillDir(tmpDir);

    rmSync(skill.dir, { recursive: true });
    cpSync(tmpDir, skill.dir, { recursive: true });

    const now = new Date().toISOString();
    const updatedMetadata: GitHubMetadata = {
      ...metadata,
      github_commit: latestCommit,
      updated_at: now,
    };
    writeMetadata(skill.dir, updatedMetadata);

    success(`  Updated '${skill.name}' (${skill.agent})`);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

async function updateLocalSkill(
  skill: InstalledSkill,
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
    if (!force) {
      log(`  No git commit info available. Use --force to re-copy.`);
      return;
    }
    log(`  --force specified, re-copying from source`);
    needsUpdate = true;
  }

  if (!needsUpdate) return;

  if (dryRun) {
    log(`  Would update skill '${skill.name}'`);
    return;
  }

  validateSkillDir(sourcePath);

  rmSync(skill.dir, { recursive: true });
  cpSync(sourcePath, skill.dir, { recursive: true });

  const now = new Date().toISOString();
  const updatedMetadata: LocalMetadata = {
    ...metadata,
    updated_at: now,
    ...(currentCommit ? { local_git_commit: currentCommit } : {}),
  };
  writeMetadata(skill.dir, updatedMetadata);

  success(`  Updated '${skill.name}' (${skill.agent})`);
}
