/**
 * MeshCentral REST API helpers.
 * Device info: GET tools/meshcentral-server/api/deviceinfo?id={nodeId}
 */

import { apiClient } from '../api-client';

/** MeshCentral deviceinfo response (partial; we only need connection state) */
export interface MeshCentralDeviceInfo {
  /** Connection state: odd = agent connected (e.g. 1 = agent, 2 = Intel AMT, ...) */
  conn?: number;
  /** Alternative: explicit connected flag */
  connected?: boolean;
  [key: string]: unknown;
}

const DEVICEINFO_PATH = '/ws/tools/meshcentral-server/api/deviceinfo';

/**
 * Fetch device info for a MeshCentral node.
 * @param nodeId - MeshCentral node/device ID (agentToolId from toolConnections)
 * @returns Device info object or null on failure
 */
export async function getMeshCentralDeviceInfo(nodeId: string): Promise<MeshCentralDeviceInfo | null> {
  const path = `${DEVICEINFO_PATH}?id=${encodeURIComponent(nodeId)}`;
  const response = await apiClient.get<MeshCentralDeviceInfo>(path);
  if (!response.ok || response.data == null) {
    return null;
  }
  return response.data;
}

/**
 * Derive online/offline status from MeshCentral deviceinfo.
 * conn: odd = connected (1=agent, 2=AMT, 4=CIRA, 16=MQTT).
 */
export function parseMeshCentralDeviceStatus(info: MeshCentralDeviceInfo | null): 'online' | 'offline' {
  if (info == null) return 'offline';
  if (typeof info.connected === 'boolean') {
    return info.connected ? 'online' : 'offline';
  }
  const conn = info.conn;
  if (typeof conn === 'number' && conn % 2 === 1) {
    return 'online';
  }
  return 'offline';
}
