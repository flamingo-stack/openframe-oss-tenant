/**
 * Utility functions for device and icon-related operations
 */

/**
 * Returns the appropriate icon class based on device platform
 * @param platform The device platform (windows, darwin, linux)
 * @returns The PrimeIcon class for the platform
 */
export const getDeviceIcon = (platform: string): string => {
  const iconMap: Record<string, string> = {
    windows: 'pi pi-microsoft',
    darwin: 'pi pi-apple',
    linux: 'pi pi-server'
  };
  return iconMap[platform] || 'pi pi-desktop';
};

/**
 * Returns the appropriate icon class based on integrated tool type
 * @param toolType The integrated tool type
 * @returns The PrimeIcon class for the integrated tool
 */
export const getIntegratedToolIcon = (toolType: string): string => {
  const iconMap: Record<string, string> = {
    AUTHENTIK: 'pi pi-shield',
    FLEET: 'pi pi-mobile',
    RUSTDESK: 'pi pi-desktop',
    GRAFANA: 'pi pi-chart-line',
    LOKI: 'pi pi-database',
    PROMETHEUS: 'pi pi-chart-bar',
    KAFKA: 'pi pi-bolt',
    MONGO_EXPRESS: 'pi pi-server',
    MONGODB: 'pi pi-database',
    NIFI: 'pi pi-sitemap',
    PINOT: 'pi pi-chart-pie',
    KIBANA: 'pi pi-search',
    REDIS: 'pi pi-bolt',
    CASSANDRA: 'pi pi-database',
    ZOOKEEPER: 'pi pi-cog',
    MESHCENTRAL: 'pi pi-globe',
    TACTICAL_RMM: 'pi pi-desktop',
    MYSQL: 'pi pi-database',
    POSTGRESQL: 'pi pi-database'
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
 * Returns the formatted platform name
 * @param platform The device platform (windows, darwin, linux, ios, ipados, chrome)
 * @returns The formatted platform name
 */
export const formatPlatform = (platform: string): string => {
  const platformMap: Record<string, string> = {
    darwin: 'macOS',
    windows: 'Windows',
    linux: 'Linux',
    ios: 'iOS',
    ipados: 'iPadOS',
    chrome: 'Chrome OS'
  };
  return platformMap[platform] || platform;
};

/**
 * Returns the severity class for a platform tag
 * @param platform The device platform (windows, darwin, linux, ios, ipados, chrome)
 * @returns The severity class for the platform
 */
export const getPlatformSeverity = (platform: string): string => {
  const severityMap: Record<string, string> = {
    darwin: 'info',
    windows: 'warning',
    linux: 'success',
    ios: 'info',
    ipados: 'info',
    chrome: 'warning'
  };
  return severityMap[platform] || 'info';
};
