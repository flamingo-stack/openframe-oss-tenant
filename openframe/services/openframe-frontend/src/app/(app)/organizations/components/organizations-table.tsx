'use client';

import { PlusCircleIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { DataTable, PageLayout } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useApiParams, useDebounce } from '@flamingo-stack/openframe-frontend-core/hooks';
import { cn } from '@flamingo-stack/openframe-frontend-core/utils';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useOrganizations } from '../hooks/use-organizations';
import { OrganizationsSearchInput, OrganizationsTableBody } from './organizations-table-columns';

interface OrganizationsTableProps {
  status?: string;
}

export function OrganizationsTable({ status }: OrganizationsTableProps) {
  const router = useRouter();

  const { params, setParam } = useApiParams({
    search: { type: 'string', default: '' },
  });

  const [localSearch, setLocalSearch] = useState(params.search);
  const debouncedSearch = useDebounce(localSearch, 500);

  const setParamRef = useRef(setParam);
  setParamRef.current = setParam;

  useEffect(() => {
    setParamRef.current('search', debouncedSearch);
  }, [debouncedSearch]);

  const { organizations, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error } = useOrganizations(
    debouncedSearch,
    status,
  );

  const isInitialMountRef = useRef(true);
  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }
    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const handleLoadMore = useCallback(() => fetchNextPage(), [fetchNextPage]);

  const handleAddOrganization = useCallback(() => {
    router.push('/organizations/edit/new');
  }, [router]);

  const actions = useMemo(
    () => [
      {
        label: 'Add Organization',
        icon: <PlusCircleIcon size={24} className="text-ods-text-secondary" />,
        onClick: handleAddOrganization,
        variant: 'outline' as const,
      },
    ],
    [handleAddOrganization],
  );

  return (
    <PageLayout
      title="Organizations"
      actions={actions}
      actionsVariant="icon-buttons"
      className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]"
      contentClassName="flex flex-col"
    >
      <div>
        <div
          className={cn(
            'sticky top-0 z-20 flex gap-[var(--spacing-system-m)] items-center',
            'bg-ods-bg -mx-[var(--spacing-system-l)] p-[var(--spacing-system-l)] -mt-[var(--spacing-system-l)]',
          )}
        >
          <div className="flex-1 min-w-0">
            <OrganizationsSearchInput value={localSearch} onChange={setLocalSearch} />
          </div>
        </div>

        {error ? (
          <div className="text-ods-attention-red-error">{error}</div>
        ) : (
          <OrganizationsTableBody
            organizations={organizations}
            isLoading={isLoading}
            emptyMessage="No organizations found. Try adjusting your search."
            skeletonRows={10}
            stickyHeaderOffset="top-[96px]"
            footerSlot={
              hasNextPage && (
                <DataTable.InfiniteFooter
                  hasNextPage={hasNextPage}
                  isFetchingNextPage={isFetchingNextPage}
                  onLoadMore={handleLoadMore}
                  skeletonRows={2}
                />
              )
            }
          />
        )}
      </div>
    </PageLayout>
  );
}
