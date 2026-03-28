import type { JsonRpcResponse } from '../types/jsonrpc.js';
import type { SseObservation } from '../types/transport.js';

export interface SseParseResult {
  responses: JsonRpcResponse[];
  observations: SseObservation[];
}

/**
 * Parse a complete SSE stream body (string) into JSON-RPC responses and
 * raw SSE observations.
 *
 * SSE event boundaries are delimited by double newlines.  Within each event:
 *   - Lines starting with "data:" carry the JSON payload.
 *   - Lines starting with "event:", "id:", or ":" (comment) are recorded as
 *     observations but do not produce a JsonRpcResponse.
 *   - Blank lines (the boundary itself) are ignored.
 */
export function parseSseBody(body: string): SseParseResult {
  const responses: JsonRpcResponse[] = [];
  const observations: SseObservation[] = [];

  // Split into events on double newline sequences (handles \r\n too)
  const events = body.split(/\r?\n\r?\n/);

  for (const event of events) {
    if (!event.trim()) {
      continue;
    }

    const lines = event.split(/\r?\n/);
    let dataPayload: string | null = null;

    for (const line of lines) {
      if (!line) {
        // Blank line inside event block — skip
        continue;
      }

      if (line.startsWith('data:')) {
        const value = line.slice(5).trimStart();
        dataPayload = value;

        observations.push({
          hasDataPrefix: true,
          hasEventType: false,
          rawLine: line,
        });
      } else if (line.startsWith('event:')) {
        observations.push({
          hasDataPrefix: false,
          hasEventType: true,
          rawLine: line,
        });
      } else if (line.startsWith('id:') || line.startsWith(':')) {
        // id field or comment
        observations.push({
          hasDataPrefix: false,
          hasEventType: false,
          rawLine: line,
        });
      } else {
        // Unknown / unrecognised SSE field — still record
        observations.push({
          hasDataPrefix: false,
          hasEventType: false,
          rawLine: line,
        });
      }
    }

    if (dataPayload !== null) {
      try {
        const parsed: unknown = JSON.parse(dataPayload);
        if (isJsonRpcResponse(parsed)) {
          responses.push(parsed);
        }
      } catch {
        // Non-JSON data line — not a JSON-RPC message; ignore parse error
      }
    }
  }

  return { responses, observations };
}

/**
 * Parse an incremental SSE chunk (may be partial) from a streaming response.
 * Returns all complete SSE events found in the buffer along with any
 * leftover bytes that do not yet form a complete event.
 */
export function parseSseChunk(
  buffer: string,
  chunk: string,
): { buffer: string; result: SseParseResult } {
  const updated = buffer + chunk;
  const lastBoundary = updated.lastIndexOf('\n\n');

  if (lastBoundary === -1) {
    // No complete event yet
    return { buffer: updated, result: { responses: [], observations: [] } };
  }

  const complete = updated.slice(0, lastBoundary + 2);
  const remaining = updated.slice(lastBoundary + 2);

  return {
    buffer: remaining,
    result: parseSseBody(complete),
  };
}

function isJsonRpcResponse(value: unknown): value is JsonRpcResponse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const v = value as Record<string, unknown>;
  return (
    typeof v['jsonrpc'] === 'string' &&
    (v['id'] === null ||
      typeof v['id'] === 'string' ||
      typeof v['id'] === 'number')
  );
}
