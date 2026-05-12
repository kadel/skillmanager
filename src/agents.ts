import { join } from "path";
import { homedir } from "os";

export type AgentName = "claude" | "openclaw" | "codex" | "gemini";

export interface AgentConfig {
  name: AgentName;
  displayName: string;
  projectSkillsDir: string;
  globalSkillsDir: string;
}

const home = homedir();

export const agents: Record<AgentName, AgentConfig> = {
  claude: {
    name: "claude",
    displayName: "Claude Code",
    projectSkillsDir: ".claude/skills",
    globalSkillsDir: join(home, ".claude", "skills"),
  },
  openclaw: {
    name: "openclaw",
    displayName: "OpenClaw",
    projectSkillsDir: "skills",
    globalSkillsDir: join(home, ".openclaw", "skills"),
  },
  codex: {
    name: "codex",
    displayName: "Codex",
    projectSkillsDir: ".agents/skills",
    globalSkillsDir: join(home, ".codex", "skills"),
  },
  gemini: {
    name: "gemini",
    displayName: "Gemini CLI",
    projectSkillsDir: ".agents/skills",
    globalSkillsDir: join(home, ".gemini", "skills"),
  },
};

export const AGENT_NAMES: AgentName[] = Object.keys(agents) as AgentName[];

export type Scope = "global" | "project";

export function getSkillsDir(agent: AgentName, scope: Scope): string {
  const config = agents[agent];
  if (scope === "global") {
    return config.globalSkillsDir;
  }
  return join(process.cwd(), config.projectSkillsDir);
}

export interface SkillsDirEntry {
  agent: AgentName;
  scope: Scope;
  dir: string;
}

export function getAllSkillsDirs(): SkillsDirEntry[] {
  const entries: SkillsDirEntry[] = [];
  for (const agent of AGENT_NAMES) {
    entries.push({ agent, scope: "global", dir: getSkillsDir(agent, "global") });
    entries.push({ agent, scope: "project", dir: getSkillsDir(agent, "project") });
  }
  return entries;
}

export function isValidAgent(name: string): name is AgentName {
  return AGENT_NAMES.includes(name as AgentName);
}
