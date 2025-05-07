/**
 * Device Utility Functions
 * 
 * This file contains utility functions for working with devices
 * in a consistent way across RMM, MDM, and RAC modules.
 */

import { DevicePlatform, DeviceStatus } from '../types/device';
import Tag from 'primevue/tag';

/**
 * Get device icon based on platform
 */
export function getDeviceIcon(platform: string): string {
  const normalizedPlatform = determinePlatform(platform);
  
  switch(normalizedPlatform) {
    case 'windows': return 'pi pi-microsoft';
    case 'darwin': return 'pi pi-apple';
    case 'linux': return 'pi pi-server';
    case 'ios': return 'pi pi-mobile';
    case 'android': return 'pi pi-android';
    default: return 'pi pi-desktop';
  }
}

/**
 * Format platform name for display
 */
export function formatPlatform(platform: string): string {
  const normalizedPlatform = determinePlatform(platform);
  
  switch(normalizedPlatform) {
    case 'windows': return 'Windows';
    case 'darwin': return 'macOS';
    case 'linux': return 'Linux';
    case 'ios': return 'iOS';
    case 'android': return 'Android';
    default: return 'Unknown';
  }
}

/**
 * Get platform severity for PrimeVue Tag component
 */
export function getPlatformSeverity(platform: string): string {
  const normalizedPlatform = determinePlatform(platform);
  
  switch(normalizedPlatform) {
    case 'windows': return 'info';
    case 'darwin': return 'success';
    case 'linux': return 'warning';
    case 'ios': return 'primary';
    case 'android': return 'secondary';
    default: return 'help';
  }
}

/**
 * Map status to severity for PrimeVue Tag component
 */
export function getStatusSeverity(status: string): string {
  const normalizedStatus = mapStatus(status);
  
  switch(normalizedStatus) {
    case 'online': return 'success';
    case 'offline': return 'danger';
    case 'pending': return 'warning';
    case 'overdue': return 'warning';
    default: return 'info';
  }
}

/**
 * Format a timestamp consistently
 */
export function formatTimestamp(timestamp: string | number | undefined): string {
  if (!timestamp) return 'Never';
  return new Date(timestamp).toLocaleString();
}

/**
 * Format bytes to human-readable format
 */
export function formatBytes(bytes: number | undefined): string {
  if (bytes === undefined || bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Extract IPv4 addresses from a comma-separated string
 */
export function getIPv4Addresses(ips: string | undefined): string[] {
  if (!ips) return [];

  // Split the IPs string into an array
  const ipList = ips.split(',').map(ip => ip.trim());

  // Filter for IPv4 addresses
  return ipList.filter(ip => {
    const parts = ip.split('.');
    return parts.length === 4 && parts.every(part => {
      const num = parseInt(part, 10);
      return !isNaN(num) && num >= 0 && num <= 255;
    });
  });
}

/**
 * Determine the platform from various source formats
 */
export function determinePlatform(platform: string | undefined): DevicePlatform {
  if (!platform) return 'unknown';
  
  const normalizedPlatform = platform.toLowerCase();
  
  if (normalizedPlatform.includes('win')) return 'windows';
  if (normalizedPlatform.includes('darwin') || normalizedPlatform.includes('mac')) return 'darwin';
  if (normalizedPlatform.includes('linux')) return 'linux';
  if (normalizedPlatform.includes('ios')) return 'ios';
  if (normalizedPlatform.includes('android')) return 'android';
  
  return 'unknown';
}

/**
 * Infer platform from OS description
 */
export function inferPlatformFromOS(osDesc: string | undefined): DevicePlatform {
  if (!osDesc) return 'unknown';
  
  const normalizedDesc = osDesc.toLowerCase();
  
  if (normalizedDesc.includes('windows')) return 'windows';
  if (normalizedDesc.includes('mac') || normalizedDesc.includes('darwin') || normalizedDesc.includes('osx')) return 'darwin';
  if (normalizedDesc.includes('linux')) return 'linux';
  if (normalizedDesc.includes('ios')) return 'ios';
  if (normalizedDesc.includes('android')) return 'android';
  
  return 'unknown';
}

/**
 * Map various status values to a standard format
 */
export function mapStatus(status: string | number | undefined): DeviceStatus {
  if (status === undefined) return 'unknown';
  
  // Handle numeric status (typically from RAC module)
  if (typeof status === 'number') {
    return status === 1 ? 'online' : 'offline';
  }
  
  const normalizedStatus = status.toLowerCase();
  
  if (normalizedStatus.includes('online')) return 'online';
  if (normalizedStatus.includes('offline')) return 'offline';
  if (normalizedStatus.includes('pending')) return 'pending';
  if (normalizedStatus.includes('overdue')) return 'overdue';
  
  return 'unknown';
}

/**
 * Returns the appropriate icon class based on integrated tool type
 * @param toolType The integrated tool type
 * @returns The PrimeIcon class for the integrated tool
 */
export const getIntegratedToolIcon = (toolType: string): string => {
  const iconMap: Record<string, string> = {
    // Authentication & Identity
    AUTHENTIK: 'pi pi-id-card',
    KEYCLOAK: 'pi pi-shield',
    
    // Device Management
    FLEET: 'pi pi-mobile',
    RUSTDESK: 'pi pi-desktop',
    MESHCENTRAL: 'pi pi-sitemap',
    TACTICAL_RMM: 'pi pi-cog',
    
    // Monitoring & Observability
    GRAFANA: 'pi pi-chart-line',
    LOKI: 'pi pi-file',
    PROMETHEUS: 'pi pi-chart-bar',
    KIBANA: 'pi pi-search',
    
    // Messaging & Streaming
    KAFKA: 'pi pi-send',
    NIFI: 'pi pi-sort-alt',
    
    // Databases
    MONGO_EXPRESS: 'pi pi-database',
    MONGODB: 'pi pi-circle',
    REDIS: 'pi pi-bolt',
    CASSANDRA: 'pi pi-server',
    MYSQL: 'pi pi-table',
    POSTGRESQL: 'pi pi-database',
    PINOT: 'pi pi-filter',
    
    // Infrastructure
    ZOOKEEPER: 'pi pi-cog',
    KUBERNETES: 'pi pi-sitemap',
    DOCKER: 'pi pi-box',
    
    // Network
    TRAEFIK: 'pi pi-share-alt',
    NGINX: 'pi pi-globe',
    
    // Security
    VAULT: 'pi pi-lock',
    WAZUH: 'pi pi-shield'
  };
  return iconMap[toolType] || 'pi pi-cog';
};

/**
 * Returns the appropriate icon class based on monitor type
 * @param type The monitor type (cpu, memory, disk, network, service)
 * @returns The PrimeIcon class for the monitor type
 */
export const getMonitorIcon = (type: string): string => {
  const iconMap: Record<string, string> = {
    cpu: 'pi pi-microchip',
    memory: 'pi pi-server',
    disk: 'pi pi-hdd',
    network: 'pi pi-globe',
    service: 'pi pi-cog'
  };
  return iconMap[type] || 'pi pi-chart-line';
};

/**
 * Returns the appropriate icon class based on task type
 * @param type The task type (maintenance, backup, update, custom)
 * @returns The PrimeIcon class for the task type
 */
export const getTaskIcon = (type: string): string => {
  const iconMap: Record<string, string> = {
    maintenance: 'pi pi-wrench',
    backup: 'pi pi-database',
    update: 'pi pi-refresh',
    custom: 'pi pi-cog'
  };
  return iconMap[type] || 'pi pi-clock';
};

/**
 * Enhanced Device Model Utility Functions
 */

import { EnhancedUnifiedDevice } from '../types/device';

/**
 * Format disk usage in a user-friendly way
 */
export function formatDiskUsage(device: EnhancedUnifiedDevice): string {
  if (!device.hardware?.storage || device.hardware.storage.length === 0) {
    return 'N/A';
  }
  
  const mainDisk = device.hardware.storage[0];
  return `${formatBytes(mainDisk.used || 0)} / ${formatBytes(mainDisk.total || 0)}`;
}

/**
 * Get memory usage as a percentage
 */
export function getMemoryUsagePercentage(device: EnhancedUnifiedDevice): number {
  const total = device.hardware?.memory?.total;
  const used = device.hardware?.memory?.used;
  
  if (!total || !used || total === 0) {
    return 0;
  }
  
  return (used / total) * 100;
}

/**
 * Format CPU information
 */
export function formatCpuInfo(device: EnhancedUnifiedDevice): string {
  const cpuModel = device.hardware?.cpu?.model;
  const cpuCores = device.hardware?.cpu?.cores;
  
  if (!cpuModel && !cpuCores) {
    return 'N/A';
  }
  
  if (cpuModel && cpuCores) {
    return `${cpuModel} (${cpuCores} cores)`;
  }
  
  return cpuModel || `${cpuCores} cores` || 'N/A';
}

/**
 * Get CPU usage as a formatted string with percentage
 */
export function formatCpuUsage(device: EnhancedUnifiedDevice): string {
  const usage = device.hardware?.cpu?.usage;
  
  if (usage === undefined) {
    return 'N/A';
  }
  
  return `${Math.round(usage)}%`;
}

/**
 * Format the device operating system information
 */
export function formatOsInfo(device: EnhancedUnifiedDevice): string {
  const osName = device.os?.name || formatPlatform(device.platform);
  const osVersion = device.os?.version || device.osVersion;
  const osBuild = device.os?.build;
  
  if (osBuild) {
    return `${osName} ${osVersion} (${osBuild})`;
  }
  
  return `${osName} ${osVersion}`;
}

/**
 * Format device location information
 */
export function formatLocation(device: EnhancedUnifiedDevice): string {
  if (!device.asset?.location) {
    return 'Unknown';
  }
  
  return device.asset.location;
}

/**
 * Format device last boot time
 */
export function formatLastBoot(device: EnhancedUnifiedDevice): string {
  if (!device.os?.lastBoot) {
    return 'Unknown';
  }
  
  return formatTimestamp(device.os.lastBoot);
}

/**
 * Get security status summary
 */
export function getSecuritySummary(device: EnhancedUnifiedDevice): { status: string, severity: string } {
  const security = device.security;
  
  if (!security) {
    return { status: 'Unknown', severity: 'help' };
  }
  
  if (security.antivirusEnabled === false) {
    return { status: 'At Risk', severity: 'danger' };
  }
  
  if (security.firewallEnabled === false) {
    return { status: 'Warning', severity: 'warning' };
  }
  
  if (security.encryptionEnabled === true) {
    return { status: 'Protected', severity: 'success' };
  }
  
  return { status: 'Unknown', severity: 'info' };
}

/**
 * Get a list of network interfaces
 */
export function getNetworkInterfaces(device: EnhancedUnifiedDevice): Array<{ name: string, ip: string, mac: string }> {
  if (!device.network?.interfaces || device.network.interfaces.length === 0) {
    // If no detailed interfaces, create a basic one from available IP/MAC addresses
    const ips = device.network?.ipAddresses || device.ipAddresses || [];
    const macs = device.network?.macAddresses || [];
    
    // Ensure ips is an array before calling map
    if (!Array.isArray(ips)) {
      return [];
    }
    
    return ips.map((ip, idx) => ({
      name: `Interface ${idx + 1}`,
      ip,
      mac: idx < macs.length ? macs[idx] : '',
    }));
  }
  
  return device.network.interfaces.map(iface => ({
    name: iface.name || 'Unknown',
    ip: iface.ipAddress || '',
    mac: iface.macAddress || '',
  }));
}

/**
 * Format mobile device-specific information
 */
export function getMobileDeviceInfo(device: EnhancedUnifiedDevice): { 
  hasMobileInfo: boolean, 
  batteryLevel: string,
  enrollmentStatus: string,
  supervised: string,
} {
  const mobile = device.mobile;
  
  if (!mobile) {
    return { 
      hasMobileInfo: false, 
      batteryLevel: 'N/A', 
      enrollmentStatus: 'N/A',
      supervised: 'N/A',
    };
  }
  
  return {
    hasMobileInfo: true,
    batteryLevel: mobile.batteryLevel !== undefined ? `${mobile.batteryLevel}%` : 'N/A',
    enrollmentStatus: mobile.mdmEnrollmentStatus || 'N/A',
    supervised: mobile.isSupervised ? 'Yes' : 'No',
  };
}
