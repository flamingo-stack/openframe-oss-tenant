import type { Device } from '../../devices/types/device.types';

export interface LogEntry {
  toolEventId: string;
  eventType: string;
  ingestDay: string;
  toolType: string;
  severity: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  userId?: string;
  deviceId?: string;
  summary: string;
  message?: string;
  timestamp: string;
  details?: string;
  metadata?: Record<string, any>;

  // Device-related fields from backend
  hostname?: string;
  organizationName?: string;
  organizationId?: string;

  // Transformed device object (follows Device type pattern)
  device?: Partial<Device>;
}

export interface LogEdge {
  node: LogEntry;
}

export interface LogFilters {
  toolTypes: string[];
  eventTypes: string[];
  severities: string[];
  organizations: { id: string; name: string }[];
}

export interface LogFilterInput {
  severities?: string[];
  toolTypes?: string[];
  organizationIds?: string[];
  deviceId?: string;
  userId?: string[];
}
