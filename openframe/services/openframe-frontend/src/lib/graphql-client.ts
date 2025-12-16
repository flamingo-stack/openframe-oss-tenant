/**
 * GraphQL Client Configuration with Introspection Support
 *
 * Initializes GraphQL schema introspection for URL state management hooks.
 * Must be called after authentication is complete.
 */

import { introspector } from '@flamingo-stack/openframe-frontend-core/hooks'
import { runtimeEnv } from './runtime-config'

// GraphQL endpoint configuration
export const GRAPHQL_ENDPOINT = typeof window !== 'undefined'
  ? `${window.location.origin}/api/graphql`
  : '/api/graphql'

/**
 * Initialize GraphQL introspection
 *
 * Should be called after user authentication is complete.
 * Fetches and caches GraphQL schema for URL state management.
 *
 * @param force - Force fresh fetch, ignore cache (default: false)
 * @returns Promise that resolves when introspection is complete
 *
 * @example
 * // In your auth provider or app initialization
 * useEffect(() => {
 *   if (isAuthenticated) {
 *     initializeGraphQLIntrospection()
 *   }
 * }, [isAuthenticated])
 */
export async function initializeGraphQLIntrospection(force = false): Promise<void> {
  try {
    // Skip if already loaded (unless forced)
    if (!force && introspector.isLoaded()) {
      console.log('[GraphQL] Schema already loaded from cache')
      return
    }

    console.log('[GraphQL] Initializing schema introspection...')

    // Get auth headers (for DevTicket mode)
    const headers: Record<string, string> = {}

    if (runtimeEnv.enableDevTicketObserver()) {
      try {
        const accessToken = localStorage.getItem('of_access_token')
        if (accessToken) {
          headers['Authorization'] = `Bearer ${accessToken}`
        }
      } catch (error) {
        console.warn('[GraphQL] Failed to get access token:', error)
      }
    }

    // Fetch schema via introspection
    await introspector.fetchSchema(GRAPHQL_ENDPOINT, headers, force)

    console.log('[GraphQL] Schema introspection complete')
  } catch (error) {
    console.error('[GraphQL] Introspection failed:', error)
    // Don't throw - URL state hooks can still work without introspection
    // (nested types just won't be automatically flattened)
  }
}

/**
 * Clear GraphQL schema cache
 *
 * Useful for debugging or when schema changes
 */
export function clearGraphQLCache(): void {
  introspector.clearCache()
  console.log('[GraphQL] Schema cache cleared')
}

/**
 * Check if GraphQL schema is loaded
 */
export function isGraphQLSchemaLoaded(): boolean {
  return introspector.isLoaded()
}
