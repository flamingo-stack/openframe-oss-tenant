'use client';

import { MingoIcon } from '@flamingo-stack/openframe-frontend-core/components/icons';
import {
  BuildingsIcon,
  Filter02Icon,
  GraphMixSquareIcon,
  IdCardIcon,
  PlusCircleIcon,
  ShieldCheckIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  Button,
  DataTable,
  type DateFilterResult,
  type DateRange,
  FilterModal,
  PageLayout,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useApiParams } from '@flamingo-stack/openframe-frontend-core/hooks';
import { cn } from '@flamingo-stack/openframe-frontend-core/utils';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAskMingo } from '@/app/(app)/mingo/hooks/use-ask-mingo';
import { EmptyState } from '@/app/components/shared';
import { useSearchParam } from '@/app/hooks/use-search-param';
import { useStickyToolbar } from '@/app/hooks/use-sticky-toolbar';
import { dateRangeFromParams, dateRangeToInstantBounds, toDayParam } from '@/lib/date-filter-params';
import { routes } from '@/lib/routes';
import { type CustomersDateQuery, useCustomers } from '../hooks/use-customers';
import { type CustomersDateFilter, CustomersSearchInput, CustomersTableBody } from './customers-table-columns';

const EMPTY_FILTER_GROUPS: never[] = [];
const noopFilterChange = () => {};

interface CustomersTableProps {
  status?: string;
}

export function CustomersTable({ status }: CustomersTableProps) {
  const router = useRouter();
  const askMingo = useAskMingo();

  const { params, setParam, setParams } = useApiParams({
    search: { type: 'string', default: '' },
    dateFrom: { type: 'string', default: '' },
    dateTo: { type: 'string', default: '' },
    sortDirection: { type: 'string', default: 'desc' },
  });

  // Local search keeps typing responsive; the shared hook debounces it to the
  // URL param and guards the back/forward sync-down against clobbering typing.
  const {
    search: localSearch,
    setSearch: setLocalSearch,
    debouncedSearch,
  } = useSearchParam(params.search, value => setParam('search', value), 500);
  const { toolbarRef, containerStyle, stickyHeaderOffset } = useStickyToolbar();
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Applied last-activity filter restored from the URL
  const dateRange: DateRange | undefined = useMemo(
    () => dateRangeFromParams(params.dateFrom, params.dateTo),
    [params.dateFrom, params.dateTo],
  );
  const sortDirection: CustomersDateQuery['sortDirection'] = params.sortDirection === 'asc' ? 'asc' : 'desc';

  const dateQuery: CustomersDateQuery = useMemo(() => {
    const bounds = dateRangeToInstantBounds(dateRange);
    return { lastActivityFrom: bounds.from, lastActivityTo: bounds.to, sortDirection };
  }, [dateRange, sortDirection]);

  const handleDateFilterApply = useCallback(
    (result: DateFilterResult) => {
      setParams({
        // Default direction stays out of the URL
        sortDirection: result.sort === 'desc' ? '' : result.sort,
        dateFrom: result.range?.from ? toDayParam(result.range.from) : '',
        dateTo: result.range?.to ? toDayParam(result.range.to) : '',
      });
      document.querySelector('main')?.scrollTo({ top: 0, behavior: 'instant' });
    },
    [setParams],
  );

  const dateFilter: CustomersDateFilter = useMemo(
    () => ({ sortDirection, range: dateRange, onApply: handleDateFilterApply }),
    [sortDirection, dateRange, handleDateFilterApply],
  );

  const { customers, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error } = useCustomers(
    debouncedSearch,
    status,
    dateQuery,
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
    router.push(routes.customers.new);
  }, [router]);

  const showEmptyState = !isLoading && !debouncedSearch && !dateRange && customers.length === 0;

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
            <Button
              variant="outline"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileFilterOpen(true)}
              aria-label="Open filters"
              leftIcon={<Filter02Icon />}
            />
          </div>

          <CustomersTableBody
            customers={customers}
            isLoading={isLoading}
            emptyMessage="No customers found. Try adjusting your search or filters."
            skeletonRows={10}
            stickyHeaderOffset={stickyHeaderOffset}
            dateFilter={dateFilter}
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

      <FilterModal
        isOpen={mobileFilterOpen}
        onClose={() => setMobileFilterOpen(false)}
        filterGroups={EMPTY_FILTER_GROUPS}
        onFilterChange={noopFilterChange}
        dateFilter={{
          title: 'Last Activity',
          sort: sortDirection,
          range: dateRange,
          onChange: handleDateFilterApply,
        }}
      />
    </PageLayout>
  );
}
