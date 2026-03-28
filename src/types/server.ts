export interface MCPServerInfo {
  name: string;
  version?: string;
  protocolVersion?: string;
}

export interface MCPCapabilities {
  tools?: Record<string, unknown>;
  resources?: Record<string, unknown>;
  prompts?: Record<string, unknown>;
  logging?: Record<string, unknown>;
  [key: string]: unknown;
}
