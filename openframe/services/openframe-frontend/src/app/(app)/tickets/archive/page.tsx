'use client';

export const dynamic = 'force-dynamic';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSafeBack } from '@/app/hooks/use-safe-back';
import { isSaasTenantMode } from '@/lib/app-mode';
import { ArchivedTickets } from '../components/tickets-table';

export default function TicketsArchive() {
  const router = useRouter();
  const handleBack = useSafeBack('/tickets');

  useEffect(() => {
    if (!isSaasTenantMode()) {
      router.replace('/dashboard');
      return;
    }
  }, [router]);

  if (!isSaasTenantMode()) {
    return null;
  }

  return <ArchivedTickets backButton={{ label: 'Back', onClick: handleBack }} />;
}
