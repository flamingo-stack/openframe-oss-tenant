/**
 * Default visible device statuses (excludes ARCHIVED and DELETED)
 * Use this constant for all device queries that should show "active" devices only.
 *
 * NOTE: If new statuses are added to the backend, they must be added here
 * to appear in default views.
 */
export const DEFAULT_VISIBLE_STATUSES = [
  'ONLINE',
  'OFFLINE',
  'ACTIVE',
  'INACTIVE',
  'MAINTENANCE',
  'DECOMMISSIONED',
  'PENDING'
] as const

export type DefaultVisibleStatus = typeof DEFAULT_VISIBLE_STATUSES[number]

/**
 * Statuses that are hidden by default (for documentation/reference)
 */
export const HIDDEN_DEVICE_STATUSES = ['ARCHIVED', 'DELETED'] as const

export type HiddenDeviceStatus = typeof HIDDEN_DEVICE_STATUSES[number]
