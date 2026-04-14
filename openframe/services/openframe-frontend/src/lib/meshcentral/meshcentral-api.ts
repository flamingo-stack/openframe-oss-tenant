/**
 * MeshCentral REST API helpers.
 * Device info: GET tools/meshcentral-server/api/deviceStatus?id={nodeId}
 */

import { apiClient } from '../api-client';

/**
 * MeshCentral deviceStatus response.
 */
export interface MeshCentralDeviceInfo {
  nodeId: string;
  online: boolean;
  /** Unix timestamp in milliseconds of the last agent connection. */
  lastConnectTime: number;
  lastConnectAddr: string;
}

const DEVICEINFO_PATH = 'tools/meshcentral-server/api/deviceStatus';

/**
 * Fetch device info for a MeshCentral node.
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
 * Derive online/offline status from MeshCentral deviceStatus.
 * Returns 'offline' on null or malformed data.
 */
export function parseMeshCentralDeviceStatus(info: MeshCentralDeviceInfo | null): 'online' | 'offline' {
  if (info == null || typeof info !== 'object') return 'offline';
  return info.online ? 'online' : 'offline';
}

/**
 * Extract last seen string for display from MeshCentral deviceStatus.
 * Returns null when the device is currently online or when data is unavailable.
 */
export function parseMeshCentralLastSeen(info: MeshCentralDeviceInfo | null): string | null {
  if (info == null || typeof info !== 'object') return null;
  if (info.online) return null;
  if (!info.lastConnectTime) return null;
  return new Date(info.lastConnectTime).toLocaleString();
}
