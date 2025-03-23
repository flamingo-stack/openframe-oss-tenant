/**
 * Utility functions for device-related operations
 */

/**
 * Returns the appropriate icon class based on platform
 * @param {string} platform - The platform identifier (windows, darwin, linux)
 * @returns {string} - The icon class to use
 */
export const getDeviceIcon = (platform) => {
  const iconMap = {
    windows: 'pi pi-microsoft',
    darwin: 'pi pi-apple',
    linux: 'pi pi-server'
  };
  return iconMap[platform] || 'pi pi-desktop';
};
