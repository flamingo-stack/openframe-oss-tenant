/**
 * Deployment Detection Utility
 * Determines if the application is running in self-hosted or cloud environment
 * Uses hostname patterns for consistent detection
 */

export type DeploymentType = 'self-hosted' | 'cloud' | 'development';

interface DeploymentInfo {
  type: DeploymentType;
  isCloud: boolean;
  isSelfHosted: boolean;
  isDevelopment: boolean;
  hostname: string;
}

/**
 * Detect deployment type based on hostname patterns
 */
export function detectDeployment(): DeploymentInfo {
  // Get current hostname (only available in browser)
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

  // Cloud deployment patterns
  const cloudPatterns = ['openframe.ai', 'auth.openframe.ai', 'app.openframe'];

  // Development patterns
  const devPatterns = ['localhost', '127.0.0.1', '0.0.0.0', '.local'];

  // Check if hostname matches cloud patterns
  const isCloud = cloudPatterns.some(pattern => hostname.includes(pattern));

  // Check if hostname matches development patterns
  const isDevelopment = devPatterns.some(pattern => hostname.includes(pattern));

  // Determine type
  let type: DeploymentType;
  if (isCloud) {
    type = 'cloud';
  } else if (isDevelopment) {
    type = 'development';
  } else {
    // Default to self-hosted for custom domains
    type = 'self-hosted';
  }

  return {
    type,
    isCloud,
    isSelfHosted: type === 'self-hosted',
    isDevelopment,
    hostname,
  };
}

/**
 * Quick check if running in cloud
 */
export function isCloud(): boolean {
  return detectDeployment().isCloud;
}

/**
 * Quick check if self-hosted
 */
export function isSelfHosted(): boolean {
  return detectDeployment().isSelfHosted;
}

/**
 * Quick check if development
 */
export function isDevelopment(): boolean {
  return detectDeployment().isDevelopment;
}

/**
 * Get deployment type
 */
export function getDeploymentType(): DeploymentType {
  return detectDeployment().type;
}

export type { DeploymentInfo };
