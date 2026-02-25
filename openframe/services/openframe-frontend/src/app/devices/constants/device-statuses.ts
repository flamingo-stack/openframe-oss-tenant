/**
 * Default visible device statuses (excludes ARCHIVED and DELETED)
 * Use this constant for all device queries that should show "active" devices only.
 *
 * NOTE: If new statuses are added to the backend, they must be added here
 * to appear in default views.
 */

export const DEVICE_STATUS = {
  ONLINE: 'ONLINE',
  OFFLINE: 'OFFLINE',
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  MAINTENANCE: 'MAINTENANCE',
  DECOMMISSIONED: 'DECOMMISSIONED',
  PENDING: 'PENDING',
  ARCHIVED: 'ARCHIVED',
  DELETED: 'DELETED',
} as const;

export type DeviceStatus = (typeof DEVICE_STATUS)[keyof typeof DEVICE_STATUS];

export const DEFAULT_VISIBLE_STATUSES = [
  DEVICE_STATUS.ONLINE,
  DEVICE_STATUS.OFFLINE,
  DEVICE_STATUS.ACTIVE,
  DEVICE_STATUS.INACTIVE,
  DEVICE_STATUS.MAINTENANCE,
  DEVICE_STATUS.DECOMMISSIONED,
  DEVICE_STATUS.PENDING,
] as const satisfies string[];

export const DEFAULT_DASHBOARD_STATUSES = [DEVICE_STATUS.ONLINE, DEVICE_STATUS.OFFLINE] as const satisfies string[];

export type DefaultVisibleStatus = (typeof DEFAULT_VISIBLE_STATUSES)[number];

/**
 * Statuses that are hidden by default (for documentation/reference)
 */
export const HIDDEN_DEVICE_STATUSES = [DEVICE_STATUS.ARCHIVED, DEVICE_STATUS.DELETED] as const;

export type HiddenDeviceStatus = (typeof HIDDEN_DEVICE_STATUSES)[number];
