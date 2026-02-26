import { existsSync, mkdirSync, rmSync, cpSync, mkdtempSync } from "fs";
import { join, basename } from "path";
import { tmpdir } from "os";
import { SKILLS_DIR, validateSkillDir, log, info, error, success } from "../utils.js";
import { writeMetadata, type GitHubMetadata, type LocalMetadata } from "../metadata.js";
import { parseGitHubUrl, downloadSkill, fetchLatestCommit } from "../sources/github.js";
import { resolveLocalPath, getGitCommit } from "../sources/local.js";

interface InstallOptions {
  source: string;
  force: boolean;
  dryRun: boolean;
}

export async function install(options: InstallOptions): Promise<void> {
  const { source, force, dryRun } = options;
  const isGitHub = source.startsWith("https://github.com/");

  if (isGitHub) {
    await installFromGitHub(source, force, dryRun);
  } else {
    await installFromLocal(source, force, dryRun);
  }
}

async function installFromGitHub(
  url: string,
  force: boolean,
  dryRun: boolean
): Promise<void> {
  const parsed = parseGitHubUrl(url);
  const skillName = basename(parsed.path);
  const dest = join(SKILLS_DIR, skillName);

  info(`Fetching skill '${skillName}' from GitHub...`);
  log(`  Repo:   ${parsed.owner}/${parsed.repo}`);
  log(`  Branch: ${parsed.branch}`);
  log(`  Path:   ${parsed.path}`);
  log("");

  if (existsSync(dest)) {
    if (!force) {
      error(`Skill '${skillName}' already exists at ${dest}`);
      log("Use --force to overwrite");
      process.exit(1);
    }
    if (dryRun) {
      log(`Would replace existing skill: ${skillName}`);
    }
  }

  if (dryRun) {
    log(`Would install skill '${skillName}' to ${dest}`);
    log("");
    log("Dry run complete. No changes made.");
    return;
  }

  // Download to a temp directory first, then move
  const tmpDir = mkdtempSync(join(tmpdir(), "skillmanager-install-"));

  try {
    await downloadSkill(parsed, tmpDir);
    validateSkillDir(tmpDir);

    // Fetch commit SHA
    let commitSha: string;
    try {
      commitSha = await fetchLatestCommit(parsed);
    } catch {
      commitSha = "unknown";
    }

    // Ensure skills directory exists
    if (!existsSync(SKILLS_DIR)) {
      mkdirSync(SKILLS_DIR, { recursive: true });
    }

    // Remove existing if force
    if (existsSync(dest)) {
      rmSync(dest, { recursive: true });
    }

    // Copy to destination
    cpSync(tmpDir, dest, { recursive: true });

    // Write metadata
    const now = new Date().toISOString();
    const metadata: GitHubMetadata = {
      source_type: "github",
      source_url: url,
      github_commit: commitSha,
      installed_at: now,
      updated_at: now,
    };
    writeMetadata(dest, metadata);

    success(`Installed skill '${skillName}' to ${dest}`);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

async function installFromLocal(
  source: string,
  force: boolean,
  dryRun: boolean
): Promise<void> {
  const resolvedPath = resolveLocalPath(source);
  const skillName = basename(resolvedPath);
  const dest = join(SKILLS_DIR, skillName);

  validateSkillDir(resolvedPath);

  info(`Installing skill '${skillName}' from local path...`);
  log(`  Source: ${resolvedPath}`);
  log("");

  if (existsSync(dest)) {
    if (!force) {
      error(`Skill '${skillName}' already exists at ${dest}`);
      log("Use --force to overwrite");
      process.exit(1);
    }
    if (dryRun) {
      log(`Would replace existing skill: ${skillName}`);
    }
  }

  if (dryRun) {
    log(`Would install skill '${skillName}' to ${dest}`);
    log("");
    log("Dry run complete. No changes made.");
    return;
  }

  // Detect git commit
  const gitCommit = await getGitCommit(resolvedPath);

  // Ensure skills directory exists
  if (!existsSync(SKILLS_DIR)) {
    mkdirSync(SKILLS_DIR, { recursive: true });
  }

  // Remove existing if force
  if (existsSync(dest)) {
    rmSync(dest, { recursive: true });
  }

  // Copy to destination
  cpSync(resolvedPath, dest, { recursive: true });

  // Write metadata
  const now = new Date().toISOString();
  const metadata: LocalMetadata = {
    source_type: "local",
    source_path: resolvedPath,
    installed_at: now,
    updated_at: now,
    ...(gitCommit ? { local_git_commit: gitCommit } : {}),
  };
  writeMetadata(dest, metadata);

  success(`Installed skill '${skillName}' to ${dest}`);
}
