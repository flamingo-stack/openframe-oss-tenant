'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useDevTicketExchange } from '@/app/auth/hooks/use-dev-ticket-exchange';
import { useAuthStore } from '@/app/auth/stores/auth-store';
import { runtimeEnv } from '@/lib/runtime-config';

/**
 * Global DevTicket Observer Component
 *
 * Monitors the URL for devTicket search parameter across the entire application.
 * When detected, it triggers the exchange process via dedicated hooks.
 * This component does not directly perform API calls or localStorage access.
 *
 * Enable/disable via NEXT_PUBLIC_ENABLE_DEV_TICKET_OBSERVER environment variable
 */
export function DevTicketObserver() {
  // All hooks must be called unconditionally at the top
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTicket = useRef<string | null>(null);
  const { isAuthenticated } = useAuthStore();
  const { exchangeTicket } = useDevTicketExchange();

  // Check if DevTicketObserver should be enabled
  const isEnabled = runtimeEnv.enableDevTicketObserver();

  // Log initialization on mount
  useEffect(() => {
    if (isEnabled) {
      console.log('🎫 [DevTicket Observer] Initialized and monitoring for devTicket parameters');
    }
  }, [isEnabled]);

  useEffect(() => {
    // Return early if not enabled
    if (!isEnabled) {
      return;
    }
    // Check if devTicket exists in URL
    const devTicket = searchParams?.get('devTicket');

    if (!devTicket) {
      // Clear the last ticket reference when no ticket is present
      if (lastTicket.current) {
        console.log('🎫 [DevTicket Observer] DevTicket cleared from URL');
        lastTicket.current = null;
      }
      return;
    }

    // Only process if this is a new ticket (prevent duplicate processing)
    if (devTicket !== lastTicket.current) {
      console.log('🎫 [DevTicket Observer] DevTicket detected:', {
        ticket: devTicket,
        pathname: pathname,
        isAuthenticated: isAuthenticated,
        timestamp: new Date().toISOString(),
      });

      // Store the ticket to prevent duplicate processing
      lastTicket.current = devTicket;

      // Execute the exchange via the hook
      exchangeTicket(devTicket);
    }
  }, [pathname, searchParams, isAuthenticated, exchangeTicket, isEnabled]);

  // This component doesn't render anything
  return null;
}
