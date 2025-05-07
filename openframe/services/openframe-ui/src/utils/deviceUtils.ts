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
