'use client';

export const dynamic = 'force-dynamic';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect } from 'react';
import { isSaasTenantMode } from '@/lib/app-mode';
import { ArchivedTickets } from '../components/tickets-table';

export default function TicketsArchive() {
  const router = useRouter();

  useEffect(() => {
    if (!isSaasTenantMode()) {
      router.replace('/dashboard');
      return;
    }
  }, [router]);

  const handleBack = useCallback(() => router.push('/tickets'), [router]);

  if (!isSaasTenantMode()) {
    return null;
  }

  return <ArchivedTickets backButton={{ label: 'Back to Tickets', onClick: handleBack }} />;
}
