/**
 * Default visible device statuses (excludes ARCHIVED and DELETED).
 * Archived devices live on the dedicated /devices/archive page.
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
  DEVICE_STATUS.PENDING,
] as const satisfies string[];

export const DEFAULT_DASHBOARD_STATUSES = [
  DEVICE_STATUS.ONLINE,
  DEVICE_STATUS.OFFLINE,
  DEVICE_STATUS.PENDING,
  DEVICE_STATUS.ARCHIVED,
] as const satisfies string[];

// PENDING is intentionally not part of the default list view — pending
// (still-enrolling) devices appear only when the user explicitly checks the
// PENDING status filter. The option itself stays in DEFAULT_VISIBLE_STATUSES.
export const DEFAULT_DEVICES_LIST_STATUSES = [DEVICE_STATUS.ONLINE, DEVICE_STATUS.OFFLINE] as const satisfies string[];

// Statuses fetched when the device list is used as an enrichment registry
// (e.g. monitoring query/policy tables mapping fleet hosts → device metadata).
// Includes ARCHIVED so archived-but-monitored hosts keep their org/OS/image
// instead of degrading to bare host rows.
export const DEVICE_ENRICHMENT_STATUSES = [
  DEVICE_STATUS.ONLINE,
  DEVICE_STATUS.OFFLINE,
  DEVICE_STATUS.ARCHIVED,
] as const satisfies string[];

export type DefaultVisibleStatus = (typeof DEFAULT_VISIBLE_STATUSES)[number];

/**
 * Statuses that are hidden by default (for documentation/reference)
 */
export const HIDDEN_DEVICE_STATUSES = [DEVICE_STATUS.ARCHIVED, DEVICE_STATUS.DELETED] as const;

export type HiddenDeviceStatus = (typeof HIDDEN_DEVICE_STATUSES)[number];
