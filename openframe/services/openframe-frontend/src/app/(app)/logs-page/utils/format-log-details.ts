import type { LogEntry } from '../types/log.types';

/**
 * Canonical plain-text representation of a log used by every "Copy Log Details"
 * affordance (the log-details page action and the logs table row button), so the
 * copied payload stays identical wherever it is triggered.
 */
export function formatLogDetailsForCopy(log: LogEntry): string {
  return [
    `Log ID: ${log.toolEventId}`,
    `Status: ${log.severity}`,
    `Timestamp: ${log.timestamp}`,
    `Tool Type: ${log.toolType}`,
    `Event Type: ${log.eventType}`,
    `Message: ${log.message || 'No message available'}`,
    `Details: ${log.details || 'No details available'}`,
  ].join('\n');
}
