import { existsSync, realpathSync } from "fs";
import { resolve } from "path";
import { execFileSync } from "child_process";

export function resolveLocalPath(source: string): string {
  // Expand ~ to home directory
  const expanded = source.replace(/^~/, process.env.HOME || "");
  const resolved = resolve(expanded);

  if (!existsSync(resolved)) {
    throw new Error(`Local path does not exist: ${source}`);
  }

  return realpathSync(resolved);
}

export function getGitCommit(dirPath: string): string | null {
  try {
    const output = execFileSync("git", ["-C", dirPath, "rev-parse", "HEAD"], {
      encoding: "utf-8",
    });
    return output.trim() || null;
  } catch {
    return null;
  }
}
