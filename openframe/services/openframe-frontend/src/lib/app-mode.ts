/**
 * Application mode configuration and utilities
 * Controls whether the app runs in auth-only mode or full application mode
 */

export type AppMode = 'auth-only' | 'full-app'

/**
 * Get the current application mode from environment variable
 * @returns The current app mode, defaults to 'full-app'
 */
export function getAppMode(): AppMode {
  const mode = process.env.NEXT_PUBLIC_APP_MODE as AppMode
  return mode || 'full-app'
}

/**
 * Check if the app is running in auth-only mode
 * @returns True if in auth-only mode
 */
export function isAuthOnlyMode(): boolean {
  return getAppMode() === 'auth-only'
}

/**
 * Check if the app is running in full application mode
 * @returns True if in full application mode
 */
export function isFullAppMode(): boolean {
  return getAppMode() === 'full-app'
}

/**
 * Check if a route is allowed in the current app mode
 * @param pathname The route path to check
 * @returns True if the route is allowed in current mode
 */
export function isRouteAllowedInCurrentMode(pathname: string): boolean {
  const mode = getAppMode()
  
  if (mode === 'auth-only') {
    // In auth-only mode, only allow auth routes and the already-signed-in page
    return pathname.startsWith('/auth') || pathname === '/'
  }
  
  // In full-app mode, all routes are allowed (subject to auth checks)
  return true
}

/**
 * Get the default redirect path for the current app mode
 * @param isAuthenticated Whether the user is authenticated
 * @returns The path to redirect to
 */
export function getDefaultRedirectPath(isAuthenticated: boolean): string {
  const mode = getAppMode()
  
  if (mode === 'auth-only') {
    // In auth-only mode, always redirect to auth
    return '/auth'
  }
  
  // In full-app mode, redirect based on auth status
  return isAuthenticated ? '/dashboard' : '/auth'
}

/**
 * Check if the navigation sidebar should be shown
 * @returns True if sidebar should be shown
 */
export function shouldShowNavigationSidebar(): boolean {
  return isFullAppMode()
}

/**
 * Check if app-specific pages should be accessible
 * @returns True if app pages should be accessible
 */
export function shouldShowAppPages(): boolean {
  return isFullAppMode()
}
