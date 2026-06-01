'use client';

export const dynamic = 'force-dynamic';

import { notFound, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { isSaasTenantMode } from '@/lib/app-mode';
import { featureFlags } from '@/lib/feature-flags';
import { TicketStatusesView } from './components/ticket-statuses-view';

export default function TicketStatusesPage() {
  const router = useRouter();

  useEffect(() => {
    if (!isSaasTenantMode()) {
      router.replace('/dashboard');
      return;
    }
  }, [router]);

  if (!featureFlags.ticketStatuses.enabled()) {
    notFound();
  }

  if (!isSaasTenantMode()) {
    return null;
  }

  return <TicketStatusesView />;
}
