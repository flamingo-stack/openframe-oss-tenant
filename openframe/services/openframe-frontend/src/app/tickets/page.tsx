'use client';

export const dynamic = 'force-dynamic';

import { ContentPageContainer } from '@flamingo-stack/openframe-frontend-core';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { isSaasTenantMode } from '@/lib/app-mode';
import { AppLayout } from '../components/app-layout';
import { TicketsView } from './components/tickets-view';

export default function Tickets() {
  const router = useRouter();

  useEffect(() => {
    if (!isSaasTenantMode()) {
      router.replace('/dashboard');
      return;
    }
  }, [router]);

  // Don't render anything if not in saas-tenant mode
  if (!isSaasTenantMode()) {
    return null;
  }

  return (
    <AppLayout>
      <ContentPageContainer padding="none" showHeader={false}>
        <TicketsView />
      </ContentPageContainer>
    </AppLayout>
  );
}
