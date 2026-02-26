/**
 * Utility functions for the OpenFrame frontend
 */

/**
 * Get the base URL for the application based on environment
 * In production, uses the deployment URL
 * In development, uses localhost:4000
 */
import { runtimeEnv } from './runtime-config';

export function getBaseUrl(): string {
  // In browser, use relative URLs
  if (typeof window !== 'undefined') {
    return '';
  }

  // For non-browser contexts, prefer configured URLs
  const appUrl = runtimeEnv.appUrl();
  const devUrl = runtimeEnv.devUrl();

  return appUrl || devUrl || 'http://localhost:4000';
}

/**
 * Generate absolute URL for assets
 */
export function getAssetUrl(path: string): string {
  const baseUrl = getBaseUrl();
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}
