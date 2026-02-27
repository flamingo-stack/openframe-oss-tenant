'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useDevTicketExchange } from '@/app/auth/hooks/use-dev-ticket-exchange';
import { runtimeEnv } from '@/lib/runtime-config';

/**
 * Global DevTicket Observer Component
 *
 * Monitors the URL for devTicket search parameter across the entire application.
 * When detected, it triggers the exchange process via dedicated hooks.
 *
 * Enable/disable via NEXT_PUBLIC_ENABLE_DEV_TICKET_OBSERVER environment variable
 */
export function DevTicketObserver() {
  const searchParams = useSearchParams();
  const lastTicket = useRef<string | null>(null);
  const { exchangeTicket } = useDevTicketExchange();

  const isEnabled = runtimeEnv.enableDevTicketObserver();

  useEffect(() => {
    if (!isEnabled) return;

    const devTicket = searchParams?.get('devTicket');

    if (!devTicket) {
      if (lastTicket.current) {
        lastTicket.current = null;
      }
      return;
    }

    if (devTicket !== lastTicket.current) {
      lastTicket.current = devTicket;
      exchangeTicket(devTicket);
    }
  }, [searchParams, exchangeTicket, isEnabled]);

  return null;
}
