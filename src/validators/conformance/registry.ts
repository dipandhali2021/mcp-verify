/**
 * Registry of all conformance validators.
 *
 * Each entry in this array is a ConformanceValidator function.  The runner
 * iterates this list in declaration order and concatenates all results.
 */
import type { ConformanceValidator } from './runner.js';
import { validateJsonRpcEnvelope } from './json-rpc-envelope.js';
import { validateInitialization } from './initialization.js';
import { validateToolSchema } from './tool-schema.js';
import { validateResourceProtocol } from './resource-protocol.js';
import { validatePromptProtocol } from './prompt-protocol.js';
import { validateStdioTransport } from './stdio-transport.js';
import { validateHttpSseTransport } from './http-sse-transport.js';
import { validateErrorHandling } from './error-handling.js';

export const CONFORMANCE_VALIDATORS: ConformanceValidator[] = [
  validateJsonRpcEnvelope,
  validateInitialization,
  validateToolSchema,
  validateResourceProtocol,
  validatePromptProtocol,
  validateStdioTransport,
  validateHttpSseTransport,
  validateErrorHandling,
];
