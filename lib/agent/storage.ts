import * as fs from "node:fs";
import * as path from "node:path";
import type { AgentConnection, HostIdentity, ProviderConfig, Storage } from "@auth/agent";

const DATA_DIR = path.join(process.cwd(), ".agent-data");

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJSON<T>(filePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
  } catch {
    return null;
  }
}

function writeJSON(filePath: string, data: unknown) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), { mode: 0o600 });
}

function encodeKey(key: string): string {
  return encodeURIComponent(key).replace(/%/g, "_");
}

/**
 * File-based agent connection storage for the in-app shopping agent.
 * Persists host identity and agent connections under `.agent-data/`.
 */
export class FileStorage implements Storage {
  private readonly dir: string;

  constructor(dir: string = DATA_DIR) {
    this.dir = dir;
    ensureDir(path.join(this.dir, "agents"));
    ensureDir(path.join(this.dir, "providers"));
  }

  async getHostIdentity(): Promise<HostIdentity | null> {
    return readJSON<HostIdentity>(path.join(this.dir, "host.json"));
  }

  async setHostIdentity(identity: HostIdentity): Promise<void> {
    writeJSON(path.join(this.dir, "host.json"), identity);
  }

  async deleteHostIdentity(): Promise<void> {
    try {
      fs.unlinkSync(path.join(this.dir, "host.json"));
    } catch {
      // ignore
    }
  }

  async getAgentConnection(agentId: string): Promise<AgentConnection | null> {
    return readJSON<AgentConnection>(path.join(this.dir, "agents", `${agentId}.json`));
  }

  async setAgentConnection(agentId: string, connection: AgentConnection): Promise<void> {
    writeJSON(path.join(this.dir, "agents", `${agentId}.json`), connection);
  }

  async deleteAgentConnection(agentId: string): Promise<void> {
    try {
      fs.unlinkSync(path.join(this.dir, "agents", `${agentId}.json`));
    } catch {
      // ignore
    }
  }

  async listAgentConnections(): Promise<AgentConnection[]> {
    const agentsDir = path.join(this.dir, "agents");
    if (!fs.existsSync(agentsDir)) return [];
    return fs
      .readdirSync(agentsDir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => readJSON<AgentConnection>(path.join(agentsDir, f)))
      .filter((c): c is AgentConnection => c !== null);
  }

  async getProviderConfig(issuer: string): Promise<ProviderConfig | null> {
    return readJSON<ProviderConfig>(path.join(this.dir, "providers", `${encodeKey(issuer)}.json`));
  }

  async setProviderConfig(issuer: string, config: ProviderConfig): Promise<void> {
    writeJSON(path.join(this.dir, "providers", `${encodeKey(issuer)}.json`), config);
  }

  async listProviderConfigs(): Promise<ProviderConfig[]> {
    const providersDir = path.join(this.dir, "providers");
    if (!fs.existsSync(providersDir)) return [];
    return fs
      .readdirSync(providersDir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => readJSON<ProviderConfig>(path.join(providersDir, f)))
      .filter((c): c is ProviderConfig => c !== null);
  }
}

let storageInstance: FileStorage | null = null;

export function getAgentStorage(): FileStorage {
  if (!storageInstance) {
    storageInstance = new FileStorage();
  }
  return storageInstance;
}
