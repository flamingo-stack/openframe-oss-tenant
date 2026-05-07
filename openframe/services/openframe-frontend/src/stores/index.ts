/**
 * Central export for all Zustand stores
 *
 * Usage:
 * import { useAuthStore, useDevicesStore, useSSOStore } from '@/stores'
 */

export type { AuthState } from '@/app/(auth)/auth/stores/auth-store';
// Export selectors for performance optimization
export {
  selectError as selectAuthError,
  selectIsAuthenticated,
  selectIsLoading as selectAuthLoading,
  selectUser,
  useAuthStore,
} from '@/app/(auth)/auth/stores/auth-store';
export type { Device, DeviceFilter, DevicesState } from './devices-store';
export {
  selectDeviceStats,
  selectDevices,
  selectError as selectDevicesError,
  selectFilter,
  selectFilteredDevices,
  selectIsLoading as selectDevicesLoading,
  selectSelectedDevice,
  useDevicesStore,
} from './devices-store';
export type { FeatureFlag, FeatureFlagsState } from './feature-flags-store';
export { useFeatureFlagsStore } from './feature-flags-store';
