'use client';

import { MingoIcon } from '@flamingo-stack/openframe-frontend-core/components/icons';
import {
  BuildingsIcon,
  GraphMixSquareIcon,
  IdCardIcon,
  PlusCircleIcon,
  ShieldCheckIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { DataTable, PageLayout } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useApiParams } from '@flamingo-stack/openframe-frontend-core/hooks';
import { cn } from '@flamingo-stack/openframe-frontend-core/utils';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useAskMingo } from '@/app/(app)/mingo/hooks/use-ask-mingo';
import { EmptyState } from '@/app/components/shared';
import { useSearchParam } from '@/app/hooks/use-search-param';
import { useStickyToolbar } from '@/app/hooks/use-sticky-toolbar';
import { useCustomers } from '../hooks/use-customers';
import { CustomersSearchInput, CustomersTableBody } from './customers-table-columns';

interface CustomersTableProps {
  status?: string;
}

export function CustomersTable({ status }: CustomersTableProps) {
  const router = useRouter();
  const askMingo = useAskMingo();

  const { params, setParam } = useApiParams({
    search: { type: 'string', default: '' },
  });

  // Local search keeps typing responsive; the shared hook debounces it to the
  // URL param and guards the back/forward sync-down against clobbering typing.
  const {
    search: localSearch,
    setSearch: setLocalSearch,
    debouncedSearch,
  } = useSearchParam(params.search, value => setParam('search', value), 500);
  const { toolbarRef, containerStyle, stickyHeaderOffset } = useStickyToolbar();

  const { customers, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error } = useCustomers(
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

  const handleAddCustomer = useCallback(() => {
    router.push('/customers/new');
  }, [router]);

  const showEmptyState = !isLoading && !debouncedSearch && customers.length === 0;

  const actions = useMemo(
    () => [
      {
        label: 'Add Customer',
        icon: (
          <PlusCircleIcon
            size={24}
            className={showEmptyState ? 'text-ods-text-on-accent' : 'text-ods-text-secondary'}
          />
        ),
        onClick: handleAddCustomer,
        variant: (showEmptyState ? 'accent' : 'outline') as 'accent' | 'outline',
      },
    ],
    [handleAddCustomer, showEmptyState],
  );

  return (
    <PageLayout
      title="Customers"
      actions={actions}
      actionsVariant="icon-buttons"
      className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]"
      contentClassName="flex flex-col"
    >
      {error ? (
        <div className="text-ods-attention-red-error">{error}</div>
      ) : showEmptyState ? (
        <EmptyState
          icon={<IdCardIcon />}
          title="No Customers yet"
          description="Companies whose devices, tickets, and users you manage will be displayed here."
          actions={[
            { icon: <BuildingsIcon />, label: 'Group devices and users by client' },
            { icon: <GraphMixSquareIcon />, label: 'Track tickets, SLAs, and activity per Customer' },
            { icon: <ShieldCheckIcon />, label: 'Monitor security posture per Customer' },
          ]}
          buttonLabel="Ask Mingo about Customers"
          buttonIcon={
            <MingoIcon
              className="size-5"
              eyesColor="var(--ods-flamingo-cyan-base)"
              cornerColor="var(--ods-flamingo-cyan-base)"
            />
          }
          onButtonClick={() => askMingo('customers')}
        />
      ) : (
        <div style={containerStyle}>
          <div
            ref={toolbarRef}
            className={cn(
              'sticky top-0 z-20 flex gap-[var(--spacing-system-m)] items-center',
              'bg-ods-bg -mx-[var(--spacing-system-l)] p-[var(--spacing-system-l)] -mt-[var(--spacing-system-l)]',
            )}
          >
            <div className="flex-1 min-w-0">
              <CustomersSearchInput value={localSearch} onChange={setLocalSearch} />
            </div>
          </div>

          <CustomersTableBody
            customers={customers}
            isLoading={isLoading}
            emptyMessage="No customers found. Try adjusting your search."
            skeletonRows={10}
            stickyHeaderOffset={stickyHeaderOffset}
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
        </div>
      )}
    </PageLayout>
  );
}
