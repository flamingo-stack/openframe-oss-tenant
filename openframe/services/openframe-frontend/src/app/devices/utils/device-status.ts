/**
 * Device status configuration utilities
 * Provides consistent status mapping across the application
 */

export type DeviceStatusVariant = 'success' | 'error' | 'warning' | 'info' | 'critical'
export type DeviceCardStatus = 'active' | 'inactive' | 'offline' | 'warning' | 'error'

export interface DeviceStatusConfig {
  label: string
  variant: DeviceStatusVariant
  cardStatus: DeviceCardStatus
}

  /**
 * Get status configuration for display
 * Used by both table and grid views for consistent status representation
 */
export function getDeviceStatusConfig(status: string): DeviceStatusConfig {
  switch(status.toUpperCase()) {
    case 'ONLINE':
    case 'ACTIVE':
      return { 
        label: 'ACTIVE', 
        variant: 'success',
        cardStatus: 'active'
      }
    case 'OFFLINE':
    case 'DECOMMISSIONED':
      return { 
        label: status.toUpperCase(), 
        variant: 'error',
        cardStatus: 'offline'
      }
    case 'IDLE':
    case 'INACTIVE':
      return { 
        label: 'INACTIVE', 
        variant: 'info',
        cardStatus: 'inactive'
      }
    case 'MAINTENANCE':
      return { 
        label: 'MAINTENANCE', 
        variant: 'warning',
        cardStatus: 'warning'
      }
    default:
      return { 
        label: status.toUpperCase(), 
        variant: 'info',
        cardStatus: 'inactive'
      }
  }
}

/**
 * Get operating system type for DeviceCard component
 * Normalizes OS type strings to expected values
 */
export function getDeviceOperatingSystem(osType?: string): 'windows' | 'macos' | 'linux' | undefined {
  if (!osType) return undefined
  const os = osType.toLowerCase()
  if (os.includes('windows')) return 'windows'
  if (os.includes('mac') || os.includes('darwin')) return 'macos'
  if (os.includes('linux') || os.includes('ubuntu') || os.includes('pop')) return 'linux'
  return undefined
}