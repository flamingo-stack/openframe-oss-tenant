'use client';

import { useApiParams } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect } from 'react';
import { useSafeBack } from '@/app/hooks/use-safe-back';
import { useSearchParam } from '@/app/hooks/use-search-param';
import { isSaasTenantMode } from '@/lib/app-mode';
import { routes } from '@/lib/routes';
import { ArchivedTickets } from '../components/tickets-table';

export default function TicketsArchive() {
  const router = useRouter();
  const handleBack = useSafeBack(routes.tickets.list);
  const { params, setParam } = useApiParams({
    search: { type: 'string', default: '' },
    labelIds: { type: 'array', default: [] },
  });
  const { search, setSearch } = useSearchParam(params.search, value => setParam('search', value), 300);
  const handleLabelIdsChange = useCallback((ids: string[]) => setParam('labelIds', ids), [setParam]);

  useEffect(() => {
    if (!isSaasTenantMode()) {
      router.replace(routes.dashboard);
      return;
    }
  }, [router]);

  if (!isSaasTenantMode()) {
    return null;
  }

  return (
    <ArchivedTickets
      backButton={{ label: 'Back', onClick: handleBack }}
      search={search}
      onSearchChange={setSearch}
      labelIds={params.labelIds}
      onLabelIdsChange={handleLabelIdsChange}
    />
  );
}
