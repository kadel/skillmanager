import { existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

export const SKILLS_DIR = join(homedir(), ".claude", "skills");

export function validateSkillDir(dir: string): void {
  const skillMd = join(dir, "SKILL.md");
  if (!existsSync(skillMd)) {
    throw new Error(
      `No SKILL.md found in '${dir}'. This does not appear to be a valid skill directory.`
    );
  }
}

export function log(message: string): void {
  console.log(message);
}

export function info(message: string): void {
  console.log(`\x1b[36m${message}\x1b[0m`);
}

export function error(message: string): void {
  console.error(`\x1b[31mError: ${message}\x1b[0m`);
}

export function success(message: string): void {
  console.log(`\x1b[32m${message}\x1b[0m`);
}
