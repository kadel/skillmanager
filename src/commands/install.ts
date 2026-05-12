import { existsSync, mkdirSync, rmSync, cpSync, mkdtempSync } from "fs";
import { join, basename } from "path";
import { tmpdir } from "os";
import type { AgentName, Scope } from "../agents.js";
import { getSkillsDir } from "../agents.js";
import { validateSkillDir, log, info, error, success } from "../utils.js";
import { writeMetadata, type GitHubMetadata, type LocalMetadata } from "../metadata.js";
import { parseGitHubUrl, downloadSkill, fetchLatestCommit } from "../sources/github.js";
import { resolveLocalPath, getGitCommit } from "../sources/local.js";

export interface InstallOptions {
  source: string;
  agents: AgentName[];
  scope: Scope;
  force: boolean;
  dryRun: boolean;
}

export async function install(options: InstallOptions): Promise<void> {
  const { source, agents, scope, force, dryRun } = options;
  const isGitHub = source.startsWith("https://github.com/");

  if (isGitHub) {
    await installFromGitHub(source, agents, scope, force, dryRun);
  } else {
    await installFromLocal(source, agents, scope, force, dryRun);
  }
}

async function installFromGitHub(
  url: string,
  agents: AgentName[],
  scope: Scope,
  force: boolean,
  dryRun: boolean
): Promise<void> {
  const parsed = parseGitHubUrl(url);
  const skillName = basename(parsed.path);

  info(`Fetching skill '${skillName}' from GitHub...`);
  log(`  Repo:   ${parsed.owner}/${parsed.repo}`);
  log(`  Branch: ${parsed.branch}`);
  log(`  Path:   ${parsed.path}`);
  log("");

  const tmpDir = mkdtempSync(join(tmpdir(), "skillmanager-install-"));

  try {
    await downloadSkill(parsed, tmpDir);
    validateSkillDir(tmpDir);

    let commitSha: string;
    try {
      commitSha = await fetchLatestCommit(parsed);
    } catch {
      commitSha = "unknown";
    }

    for (const agent of agents) {
      const skillsDir = getSkillsDir(agent, scope);
      const dest = join(skillsDir, skillName);

      info(`Installing to ${agent} (${scope})...`);
      log(`  Target: ${dest}`);

      if (existsSync(dest)) {
        if (!force) {
          error(`Skill '${skillName}' already exists for ${agent} at ${dest}`);
          log("Use --force to overwrite");
          continue;
        }
        if (dryRun) {
          log(`Would replace existing skill: ${skillName}`);
        }
      }

      if (dryRun) {
        log(`Would install skill '${skillName}' to ${dest}`);
        log("");
        continue;
      }

      if (!existsSync(skillsDir)) {
        mkdirSync(skillsDir, { recursive: true });
      }

      if (existsSync(dest)) {
        rmSync(dest, { recursive: true });
      }

      cpSync(tmpDir, dest, { recursive: true });

      const now = new Date().toISOString();
      const metadata: GitHubMetadata = {
        source_type: "github",
        agent,
        source_url: url,
        github_commit: commitSha,
        installed_at: now,
        updated_at: now,
      };
      writeMetadata(dest, metadata);

      success(`Installed skill '${skillName}' for ${agent} at ${dest}`);
    }
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }

  if (dryRun) {
    log("Dry run complete. No changes made.");
  }
}

async function installFromLocal(
  source: string,
  agents: AgentName[],
  scope: Scope,
  force: boolean,
  dryRun: boolean
): Promise<void> {
  const resolvedPath = resolveLocalPath(source);
  const skillName = basename(resolvedPath);

  validateSkillDir(resolvedPath);

  info(`Installing skill '${skillName}' from local path...`);
  log(`  Source: ${resolvedPath}`);
  log("");

  const gitCommit = await getGitCommit(resolvedPath);

  for (const agent of agents) {
    const skillsDir = getSkillsDir(agent, scope);
    const dest = join(skillsDir, skillName);

    info(`Installing to ${agent} (${scope})...`);
    log(`  Target: ${dest}`);

    if (existsSync(dest)) {
      if (!force) {
        error(`Skill '${skillName}' already exists for ${agent} at ${dest}`);
        log("Use --force to overwrite");
        continue;
      }
      if (dryRun) {
        log(`Would replace existing skill: ${skillName}`);
      }
    }

    if (dryRun) {
      log(`Would install skill '${skillName}' to ${dest}`);
      log("");
      continue;
    }

    if (!existsSync(skillsDir)) {
      mkdirSync(skillsDir, { recursive: true });
    }

    if (existsSync(dest)) {
      rmSync(dest, { recursive: true });
    }

    cpSync(resolvedPath, dest, { recursive: true });

    const now = new Date().toISOString();
    const metadata: LocalMetadata = {
      source_type: "local",
      agent,
      source_path: resolvedPath,
      installed_at: now,
      updated_at: now,
      ...(gitCommit ? { local_git_commit: gitCommit } : {}),
    };
    writeMetadata(dest, metadata);

    success(`Installed skill '${skillName}' for ${agent} at ${dest}`);
  }

  if (dryRun) {
    log("Dry run complete. No changes made.");
  }
}
