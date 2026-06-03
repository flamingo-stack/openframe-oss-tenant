'use client';

export const dynamic = 'force-dynamic';

import { useApiParams } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect } from 'react';
import { useSafeBack } from '@/app/hooks/use-safe-back';
import { isSaasTenantMode } from '@/lib/app-mode';
import { ArchivedTickets } from '../components/tickets-table';

export default function TicketsArchive() {
  const router = useRouter();
  const handleBack = useSafeBack('/tickets');
  const { params, setParam } = useApiParams({
    search: { type: 'string', default: '' },
  });
  const handleSearchChange = useCallback((value: string) => setParam('search', value), [setParam]);

  useEffect(() => {
    if (!isSaasTenantMode()) {
      router.replace('/dashboard');
      return;
    }
  }, [router]);

  if (!isSaasTenantMode()) {
    return null;
  }

  return (
    <ArchivedTickets
      backButton={{ label: 'Back', onClick: handleBack }}
      search={params.search}
      onSearchChange={handleSearchChange}
    />
  );
}
