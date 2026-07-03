'use client';

import { ContentPageContainer } from '@flamingo-stack/openframe-frontend-core';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { isSaasTenantMode } from '@/lib/app-mode';
import { routes } from '@/lib/routes';
import { TicketsView } from './components/tickets-view';

export default function Tickets() {
  const router = useRouter();

  useEffect(() => {
    if (!isSaasTenantMode()) {
      router.replace(routes.dashboard);
      return;
    }
  }, [router]);

  // Don't render anything if not in saas-tenant mode
  if (!isSaasTenantMode()) {
    return null;
  }

  return <TicketsView />;
}
