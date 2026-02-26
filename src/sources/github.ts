import { mkdtempSync, existsSync, readdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { execFileSync } from "child_process";

export interface GitHubParsed {
  owner: string;
  repo: string;
  branch: string;
  path: string;
}

export function parseGitHubUrl(url: string): GitHubParsed {
  const cleaned = url.replace(/\/+$/, "");
  const match = cleaned.match(
    /github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)\/(.+)/
  );
  if (!match) {
    throw new Error(
      `Invalid GitHub URL format. Expected: https://github.com/owner/repo/tree/branch/path/to/skill`
    );
  }
  return {
    owner: match[1],
    repo: match[2],
    branch: match[3],
    path: match[4],
  };
}

export async function downloadSkill(
  parsed: GitHubParsed,
  destDir: string
): Promise<void> {
  const tarballUrl = `https://github.com/${parsed.owner}/${parsed.repo}/archive/refs/heads/${parsed.branch}.tar.gz`;
  const tarballPrefix = `${parsed.repo}-${parsed.branch}`;
  const stripComponents = parsed.path.split("/").length + 1;

  const tmpDir = mkdtempSync(join(tmpdir(), "skillmanager-"));

  try {
    // Download tarball
    const response = await fetch(tarballUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to download tarball: ${response.status} ${response.statusText}`
      );
    }

    const tarballPath = join(tmpDir, "archive.tar.gz");
    writeFileSync(tarballPath, Buffer.from(await response.arrayBuffer()));

    // Extract the specific subdirectory
    try {
      execFileSync("tar", [
        "xzf",
        tarballPath,
        "-C",
        destDir,
        `--strip-components=${stripComponents}`,
        `${tarballPrefix}/${parsed.path}`,
      ]);
    } catch (err: any) {
      throw new Error(`Failed to extract tarball: ${err.stderr?.toString() ?? err.message}`);
    }

    // Verify something was extracted
    if (!existsSync(destDir) || readdirSync(destDir).length === 0) {
      throw new Error(
        "Extraction produced no files. Check that the URL, branch, and path are correct."
      );
    }
  } finally {
    // Clean up temp tarball
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

export async function fetchLatestCommit(
  parsed: GitHubParsed
): Promise<string> {
  const apiUrl = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/commits?sha=${parsed.branch}&path=${parsed.path}&per_page=1`;

  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "skillmanager",
  };

  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers["Authorization"] = `token ${token}`;
  }

  const response = await fetch(apiUrl, { headers });
  if (!response.ok) {
    throw new Error(
      `GitHub API request failed: ${response.status} ${response.statusText}`
    );
  }

  const commits = (await response.json()) as Array<{ sha: string }>;
  if (!commits.length) {
    throw new Error(`No commits found for path '${parsed.path}'`);
  }

  return commits[0].sha;
}
