/**
 * Central export for all Zustand stores
 * 
 * Usage:
 * import { useAuthStore, useDevicesStore, useSSOStore } from '@/stores'
 */

export { useAuthStore } from '../app/auth/stores/auth-store'
export type { AuthState } from '../app/auth/stores/auth-store'

export { useDevicesStore } from './devices-store'
export type { DevicesState, Device, DeviceFilter } from './devices-store'

// Export selectors for performance optimization
export {
  selectUser,
  selectIsAuthenticated,
  selectIsLoading as selectAuthLoading,
  selectError as selectAuthError,
} from '../app/auth/stores/auth-store'

export {
  selectDevices,
  selectSelectedDevice,
  selectFilter,
  selectIsLoading as selectDevicesLoading,
  selectError as selectDevicesError,
  selectFilteredDevices,
  selectDeviceStats,
} from './devices-store'
