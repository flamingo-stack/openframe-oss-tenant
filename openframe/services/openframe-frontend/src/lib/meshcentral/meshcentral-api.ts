/**
 * MeshCentral REST API helpers.
 * Device info: GET tools/meshcentral-server/api/deviceinfo?id={nodeId}
 */

import { apiClient } from '../api-client';

/**
 * MeshCentral deviceinfo response (partial).
 * API returns nested "Mesh Agent": { "Agent status", "Last agent connection", ... }.
 */
export interface MeshCentralDeviceInfo {
  /** Nested block from API: { "Agent status": "Offline"|"Connected now", "Last agent connection": date string, ... } */
  'Mesh Agent'?: Record<string, unknown>;
  /** Flattened / alternative keys */
  agentStatus?: string;
  status?: string;
  lastAgentConnection?: string;
  conn?: number;
  connected?: boolean;
  [key: string]: unknown;
}

function getMeshAgentBlock(info: MeshCentralDeviceInfo | null): Record<string, unknown> | null {
  if (info == null) return null;
  const block = info['Mesh Agent'];
  return block && typeof block === 'object' && !Array.isArray(block) ? block : null;
}

const DEVICEINFO_PATH = 'tools/meshcentral-server/api/deviceinfo';

/**
 * Fetch device info for a MeshCentral node.
 * @param nodeId - MeshCentral node/device ID (agentToolId from toolConnections)
 * @returns Device info object or null on failure
 */
/**
 * Returns null on request failure (network, 4xx/5xx, gateway error) or invalid response.
 * Callers should treat null as offline and no lastSeen.
 */
export async function getMeshCentralDeviceInfo(nodeId: string): Promise<MeshCentralDeviceInfo | null> {
  const path = `${DEVICEINFO_PATH}?id=${encodeURIComponent(nodeId)}`;
  const response = await apiClient.get<MeshCentralDeviceInfo>(path);
  if (!response.ok || response.data == null) {
    return null;
  }
  return typeof response.data === 'object' && !Array.isArray(response.data) ? response.data : null;
}

/**
 * Derive online/offline status from MeshCentral deviceinfo.
 * Returns 'offline' on null, malformed data, or unknown status string.
 * Prefers "Agent status" / agentStatus: "Connected now" = online, "Offline" = offline.
 * Fallback: conn (odd = connected), connected (boolean).
 */
export function parseMeshCentralDeviceStatus(info: MeshCentralDeviceInfo | null): 'online' | 'offline' {
  if (info == null || typeof info !== 'object') return 'offline';
  const mesh = getMeshAgentBlock(info);
  const statusStr = (
    (mesh?.['Agent status'] as string) ??
    info.agentStatus ??
    info.status ??
    (info as Record<string, unknown>)['Agent status'] ??
    ''
  )
    .toString()
    .trim();
  if (statusStr) {
    if (/connected\s+now/i.test(statusStr)) return 'online';
    if (/offline/i.test(statusStr)) return 'offline';
  }
  if (typeof info.connected === 'boolean') {
    return info.connected ? 'online' : 'offline';
  }
  const conn = info.conn;
  if (typeof conn === 'number' && conn % 2 === 1) {
    return 'online';
  }
  return 'offline';
}

/**
 * Extract last seen string for display from MeshCentral deviceinfo.
 * Returns null on null, malformed data, or when value is "Connected now".
 */
export function parseMeshCentralLastSeen(info: MeshCentralDeviceInfo | null): string | null {
  if (info == null || typeof info !== 'object') return null;
  const mesh = getMeshAgentBlock(info);
  const raw = (
    (mesh?.['Last agent connection'] as string) ??
    info.lastAgentConnection ??
    (info as Record<string, unknown>)['Last agent connection'] ??
    ''
  )
    .toString()
    .trim();
  if (!raw || /connected\s+now/i.test(raw)) return null;
  return raw;
}
