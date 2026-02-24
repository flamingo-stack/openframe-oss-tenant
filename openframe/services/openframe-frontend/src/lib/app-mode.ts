/**
 * Application mode configuration and utilities
 * Controls whether the app runs in auth-only mode or full application mode
 */

import { featureFlags } from "./feature-flags"
import { runtimeEnv } from "./runtime-config"

export type AppMode = 'oss-tenant' | 'saas-tenant' | 'saas-shared'

/**
 * Get the current application mode from environment variable
 * @returns The current app mode, defaults to 'oss-tenant'
 */
export function getAppMode(): AppMode {
  const mode = runtimeEnv.appMode() as AppMode
  return (mode as AppMode) || 'oss-tenant'
}

/**
 * Check if the app is running in auth-only mode
 * @returns True if in auth-only mode
 */
export function isAuthOnlyMode(): boolean {
  // Backward-compatible alias for auth-only behavior
  return getAppMode() === 'saas-shared'
}

export function isOssTenantMode(): boolean {
  return getAppMode() === 'oss-tenant'
}

export function isSaasTenantMode(): boolean {
  return getAppMode() === 'saas-tenant'
}

export function isSaasSharedMode(): boolean {
  return getAppMode() === 'saas-shared'
}

/**
 * Check if the app is running in full application mode
 * @returns True if in full application mode
 */
export function isFullAppMode(): boolean {
  // Kept for compatibility: means app pages are enabled
  return isOssTenantMode() || isSaasTenantMode()
}

/**
 * Whether authentication features (auth pages/flows) are enabled in current mode
 */
export function isAuthEnabled(): boolean {
  return isOssTenantMode() || isSaasSharedMode()
}

/**
 * Whether application pages are enabled in current mode
 */
export function isAppEnabled(): boolean {
  return isOssTenantMode() || isSaasTenantMode()
}

/**
 * Check if a route is allowed in the current app mode
 * @param pathname The route path to check
 * @returns True if the route is allowed in current mode
 */
export function isRouteAllowedInCurrentMode(pathname: string): boolean {
  const mode = getAppMode()

  // Always allow Next.js internals and static assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/assets') ||
    pathname.startsWith('/icons')
  ) {
    return true
  }

  if (mode === 'saas-shared') {
    // Auth-only mode: only auth routes and root
    return pathname.startsWith('/auth') || pathname === '/'
  }

  if (mode === 'saas-tenant') {
    // App-only mode: block all auth routes
    return !pathname.startsWith('/auth')
  }

  if (mode === 'oss-tenant') {
    if (pathname.startsWith('/mingo')) {
      return false
    }
  }

  // Feature flag: monitoring pages
  if (pathname.startsWith('/monitoring') && !featureFlags.monitoring.enabled()) {
    return false
  }

  return true
}

/**
 * Get the default redirect path for the current app mode
 * @param isAuthenticated Whether the user is authenticated
 * @returns The path to redirect to
 */
export function getDefaultRedirectPath(isAuthenticated: boolean): string {
  const mode = getAppMode()

  if (mode === 'saas-shared') {
    return '/auth'
  }

  if (mode === 'saas-tenant') {
    // App-only: send users to the app landing (no auth pages)
    return '/dashboard'
  }

  // oss-tenant: auth + app
  return isAuthenticated ? '/dashboard' : '/auth'
}

/**
 * Check if the navigation sidebar should be shown
 * @returns True if sidebar should be shown
 */
export function shouldShowNavigationSidebar(): boolean {
  return isAppEnabled()
}

/**
 * Check if app-specific pages should be accessible
 * @returns True if app pages should be accessible
 */
export function shouldShowAppPages(): boolean {
  return isAppEnabled()
}
