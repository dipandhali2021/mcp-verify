export type TransportType = 'stdio' | 'http';

export interface TransportMetadata {
  type: TransportType;
  target: string;
  httpHeaders: Record<string, Record<string, string>>;
  sseObservations: SseObservation[];
  preProtocolOutput: string[];
  timing: MessageTiming[];
  resolvedAddress?: string;
  addressType?: 'loopback' | 'private' | 'public';
}

export interface SseObservation {
  hasDataPrefix: boolean;
  hasEventType: boolean;
  rawLine: string;
}

export interface MessageTiming {
  method: string;
  requestTimestamp: number;
  responseTimestamp: number;
  durationMs: number;
}
