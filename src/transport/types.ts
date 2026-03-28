import type { JsonRpcRequest, JsonRpcNotification, JsonRpcResponse } from '../types/jsonrpc.js';
import type { TransportMetadata } from '../types/transport.js';

export interface Transport {
  send(message: JsonRpcRequest): Promise<JsonRpcResponse>;
  notify(message: JsonRpcNotification): Promise<void>;
  sendRaw(data: string): Promise<JsonRpcResponse | null>;
  getMetadata(): TransportMetadata;
  close(): Promise<void>;
}
