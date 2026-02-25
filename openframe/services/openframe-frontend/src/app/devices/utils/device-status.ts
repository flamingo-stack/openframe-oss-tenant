/**
 * Device status configuration utilities
 * Provides consistent status mapping across the application
 */

import { getOSPlatformId, normalizeOSType, type OSPlatformId } from '@flamingo-stack/openframe-frontend-core';

export type DeviceStatusVariant = 'success' | 'error' | 'warning' | 'info' | 'critical';
export type DeviceCardStatus = 'active' | 'inactive' | 'offline' | 'warning' | 'error';

export interface DeviceStatusConfig {
  label: string;
  variant: DeviceStatusVariant;
  cardStatus: DeviceCardStatus;
}

/**
 * Get status configuration for display
 * Used by both table and grid views for consistent status representation
 */
export function getDeviceStatusConfig(status: string): DeviceStatusConfig {
  switch (status.toUpperCase()) {
    case 'ONLINE':
      return {
        label: 'ONLINE',
        variant: 'success',
        cardStatus: 'active',
      };
    case 'PENDING':
    case 'ACTIVE':
      return {
        label: 'PENDING',
        variant: 'warning',
        cardStatus: 'warning',
      };
    case 'OFFLINE':
      return {
        label: 'OFFLINE',
        variant: 'error',
        cardStatus: 'offline',
      };
    case 'DECOMMISSIONED':
      return {
        label: 'DECOMMISSIONED',
        variant: 'error',
        cardStatus: 'offline',
      };
    case 'IDLE':
    case 'INACTIVE':
      return {
        label: 'INACTIVE',
        variant: 'info',
        cardStatus: 'inactive',
      };
    case 'MAINTENANCE':
      return {
        label: 'MAINTENANCE',
        variant: 'warning',
        cardStatus: 'warning',
      };
    case 'ARCHIVED':
      return {
        label: 'ARCHIVED',
        variant: 'info',
        cardStatus: 'inactive',
      };
    case 'DELETED':
      return {
        label: 'DELETED',
        variant: 'error',
        cardStatus: 'offline',
      };
    default:
      return {
        label: status.toUpperCase(),
        variant: 'info',
        cardStatus: 'inactive',
      };
  }
}

/**
 * Get operating system type for DeviceCard component
 * Uses centralized OS type system from ui-kit
 */
export function getDeviceOperatingSystem(osType?: string): OSPlatformId | undefined {
  // Uses centralized getOSPlatformId from ui-kit
  // Returns: 'darwin' | 'windows' | 'linux' | undefined
  return getOSPlatformId(osType);
}
