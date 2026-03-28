import type { JsonRpcRequest, JsonRpcResponse } from './jsonrpc.js';
import type { MCPServerInfo } from './server.js';
import type { TransportMetadata } from './transport.js';

export type ProtocolStep =
  | 'initialize'
  | 'initialized'
  | 'tools/list'
  | 'resources/list'
  | 'resources/read'
  | 'prompts/list'
  | 'error-probe-unknown'
  | 'error-probe-malformed';

export interface StepResult {
  status: 'completed' | 'timeout' | 'error' | 'skipped';
  durationMs: number;
  error?: string;
}

export interface ProtocolError {
  step: ProtocolStep;
  message: string;
  code?: string;
}

export interface ProtocolExchangeRecord {
  initializeRequest: JsonRpcRequest;
  initializeResponse: JsonRpcResponse | null;
  initializedSent: boolean;
  serverInfo: MCPServerInfo | null;
  toolsListResponses: JsonRpcResponse[];
  tools: unknown[];
  resourcesListResponse: JsonRpcResponse | null;
  resources: unknown[];
  resourceReadResponse: JsonRpcResponse | null;
  promptsListResponse: JsonRpcResponse | null;
  prompts: unknown[];
  unknownMethodProbeResponse: JsonRpcResponse | null;
  malformedJsonProbeResponse: JsonRpcResponse | null;
  transportMetadata: TransportMetadata;
  errors: ProtocolError[];
  stepResults: Record<ProtocolStep, StepResult>;
}
