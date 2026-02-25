'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/app/auth/stores/auth-store';
import { initializeGraphQlIntrospection } from '@/lib/graphql-client';
import { runtimeEnv } from '@/lib/runtime-config';

/**
 * GraphQL Introspection Initializer
 *
 * Initializes GraphQL schema introspection after authentication.
 * This enables URL state management hooks to automatically flatten
 * nested GraphQL input types.
 *
 * The introspection happens once per session and caches the schema
 * in localStorage for 24 hours.
 */
export function GraphQlIntrospectionInitializer() {
  const { isAuthenticated, user } = useAuthStore();
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Only initialize if authenticated and not already done
    if (isAuthenticated && user && !hasInitialized.current) {
      console.log('[GraphQL] User authenticated, initializing introspection...');

      hasInitialized.current = true;

      // Initialize introspection (async, non-blocking)
      initializeGraphQlIntrospection().catch(error => {
        console.error('[GraphQL] Introspection initialization failed:', error);
        // Don't throw - URL state hooks can still work without it
      });
    }

    // Reset if user logs out
    if (!isAuthenticated && hasInitialized.current) {
      console.log('[GraphQL] User logged out, resetting introspection flag');
      hasInitialized.current = false;
    }
  }, [isAuthenticated, user]);

  // This component doesn't render anything
  return null;
}
