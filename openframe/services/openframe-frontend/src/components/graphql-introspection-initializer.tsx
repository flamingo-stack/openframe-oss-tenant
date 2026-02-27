'use client';

import { useEffect, useRef } from 'react';
import { useAuthSession } from '@/app/auth/hooks/use-auth-session';
import { initializeGraphQlIntrospection } from '@/lib/graphql-client';

/**
 * GraphQL Introspection Initializer
 *
 * Initializes GraphQL schema introspection after authentication is
 * server-verified via useAuthSession (not stale localStorage).
 */
export function GraphQlIntrospectionInitializer() {
  const { isAuthenticated, isReady } = useAuthSession();
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (isReady && isAuthenticated && !hasInitialized.current) {
      hasInitialized.current = true;

      initializeGraphQlIntrospection().catch(error => {
        console.error('[GraphQL] Introspection initialization failed:', error);
      });
    }

    if (!isAuthenticated && hasInitialized.current) {
      hasInitialized.current = false;
    }
  }, [isAuthenticated, isReady]);

  return null;
}
