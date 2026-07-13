'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { isSaasTenantMode } from '@/lib/app-mode';
import { routes } from '@/lib/routes';
import { TicketStatusesView } from './components/ticket-statuses-view';

export default function TicketStatusesPage() {
  const router = useRouter();

  useEffect(() => {
    if (!isSaasTenantMode()) {
      router.replace(routes.dashboard);
      return;
    }
  }, [router]);

  if (!isSaasTenantMode()) {
    return null;
  }

  return <TicketStatusesView />;
}
