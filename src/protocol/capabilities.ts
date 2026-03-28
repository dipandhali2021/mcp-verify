import type { JsonRpcResponse } from '../types/jsonrpc.js';
import type { MCPCapabilities } from '../types/server.js';

/**
 * Extract the `capabilities` object from a successful `initialize` response.
 *
 * The MCP spec places capabilities inside `result.capabilities`.
 * If the field is absent or the response carries an error we return an empty
 * capabilities map so the rest of the pipeline degrades gracefully.
 */
export function extractCapabilities(initResponse: JsonRpcResponse): MCPCapabilities {
  if (initResponse.error !== undefined) {
    return {};
  }

  const result = initResponse.result;
  if (typeof result !== 'object' || result === null) {
    return {};
  }

  const resultObj = result as Record<string, unknown>;
  const caps = resultObj['capabilities'];

  if (typeof caps !== 'object' || caps === null) {
    return {};
  }

  return caps as MCPCapabilities;
}

/**
 * Return true when the capabilities map declares the named capability.
 *
 * A capability is considered declared when its key exists in the map and its
 * value is not `null` (it may be an empty object `{}`).
 *
 * Example capability names: 'tools', 'resources', 'prompts', 'logging'
 */
export function hasCapability(caps: MCPCapabilities, name: string): boolean {
  return (
    Object.prototype.hasOwnProperty.call(caps, name) &&
    caps[name] !== null &&
    caps[name] !== undefined
  );
}
