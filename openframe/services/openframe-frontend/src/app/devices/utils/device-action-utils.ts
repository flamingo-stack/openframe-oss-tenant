/**
 * Device Action Utilities
 * Unified logic for determining device action availability
 */

import type { Device, ToolConnection } from '../types/device.types';

/**
 * Check if a device is online (case-insensitive)
 */
export function isDeviceOnline(status: string | undefined): boolean {
  return status?.toUpperCase() === 'ONLINE';
}

/**
 * Check if a device can be archived
 */
export function canArchiveDevice(status: string | undefined): boolean {
  const upperStatus = status?.toUpperCase();
  return upperStatus !== 'ARCHIVED' && upperStatus !== 'DELETED';
}

/**
 * Check if a device can be deleted
 */
export function canDeleteDevice(status: string | undefined): boolean {
  return status?.toUpperCase() !== 'DELETED';
}

/**
 * Get tool connection by type
 */
export function getToolConnection(
  toolConnections: ToolConnection[] | undefined,
  toolType: 'MESHCENTRAL' | 'TACTICAL_RMM' | 'FLEET_MDM',
): ToolConnection | undefined {
  return toolConnections?.find(tc => tc.toolType === toolType);
}

/**
 * Get MeshCentral agent ID
 */
export function getMeshCentralAgentId(device: Device): string | undefined {
  return getToolConnection(device.toolConnections, 'MESHCENTRAL')?.agentToolId;
}

/**
 * Get Tactical RMM agent ID
 */
export function getTacticalAgentId(device: Device): string | undefined {
  return getToolConnection(device.toolConnections, 'TACTICAL_RMM')?.agentToolId;
}

/**
 * Device action availability result
 */
export interface DeviceActionAvailability {
  // Action enabled states
  remoteShellEnabled: boolean;
  remoteControlEnabled: boolean;
  manageFilesEnabled: boolean;
  runScriptEnabled: boolean;
  archiveEnabled: boolean;
  deleteEnabled: boolean;

  // Tool IDs (for handlers)
  meshcentralAgentId: string | undefined;
  tacticalAgentId: string | undefined;

  // Device state
  isOnline: boolean;
}

/**
 * Get unified device action availability
 * Single source of truth for all action enabled/disabled states
 */
export function getDeviceActionAvailability(device: Device): DeviceActionAvailability {
  const meshcentralAgentId = getMeshCentralAgentId(device);
  const tacticalAgentId = getTacticalAgentId(device);
  const isOnline = isDeviceOnline(device.status);

  return {
    // Remote Shell: requires MeshCentral agent AND device must be online
    remoteShellEnabled: Boolean(meshcentralAgentId) && isOnline,

    // Remote Control: requires MeshCentral agent AND device must be online
    remoteControlEnabled: Boolean(meshcentralAgentId) && isOnline,

    // Manage Files: requires MeshCentral agent AND device must be online
    // (Currently same as remoteControlEnabled, but separate for future flexibility)
    manageFilesEnabled: Boolean(meshcentralAgentId) && isOnline,

    // Run Script: requires Tactical RMM agent AND device must be online
    runScriptEnabled: Boolean(tacticalAgentId) && isOnline,

    // Archive: device must not be already archived or deleted
    archiveEnabled: canArchiveDevice(device.status),

    // Delete: device must not be already deleted
    deleteEnabled: canDeleteDevice(device.status),

    // Pass through tool IDs for handlers
    meshcentralAgentId,
    tacticalAgentId,

    // Device state
    isOnline,
  };
}
