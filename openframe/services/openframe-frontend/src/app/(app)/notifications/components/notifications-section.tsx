'use client';

import { BellOffIcon, ClockHistoryIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { DataTable, SearchInput, useDataTable } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { type ReactNode, Suspense, useCallback, useMemo } from 'react';
import { type PreloadedQuery, usePaginationFragment, usePreloadedQuery } from 'react-relay';
import type { notificationsSectionRelay_query$key as NotificationsSectionFragmentKey } from '@/__generated__/notificationsSectionRelay_query.graphql';
import type { notificationsSectionRelayPaginationQuery as NotificationsSectionPaginationQueryType } from '@/__generated__/notificationsSectionRelayPaginationQuery.graphql';
import type { notificationsSectionRelayQuery as NotificationsSectionRelayQueryType } from '@/__generated__/notificationsSectionRelayQuery.graphql';
import { parseCreatedAt } from '@/graphql/notifications/notifications-helpers';
import {
  notificationsSectionRelayFragment,
  notificationsSectionRelayQuery,
} from '@/graphql/notifications/notifications-section-relay';
import { buildNotificationColumns, type NotificationRow } from './notifications-columns';

export const NOTIFICATIONS_SECTION_PAGE_SIZE = 50;
const EMPTY_ROWS: NotificationRow[] = [];

interface NotificationsSectionProps {
  title: string;
  queryRef: PreloadedQuery<NotificationsSectionRelayQueryType> | null | undefined;
  searchValue: string;
  onSearchChange: (value: string) => void;
  rightAction?: ReactNode;
  rowVariant: 'unread' | 'read';
  onMarkRead?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function NotificationsSection({
  title,
  queryRef,
  searchValue,
  onSearchChange,
  rightAction,
  rowVariant,
  onMarkRead,
  onDelete,
}: NotificationsSectionProps) {
  return (
    <section className="flex min-h-0 flex-1 flex-col gap-[var(--spacing-system-m)]">
      <div className="flex flex-wrap items-baseline justify-between gap-[var(--spacing-system-m)]">
        <h2 className="text-h2 text-ods-text-primary">{title}</h2>
        {rightAction}
      </div>

      <SearchInput placeholder="Search for Notification" value={searchValue} onChange={onSearchChange} debounceMs={0} />

      <div className="flex min-h-0 flex-1 flex-col">
        <Suspense fallback={<SectionTableSkeleton rowVariant={rowVariant} />}>
          {queryRef ? (
            <SectionTable queryRef={queryRef} rowVariant={rowVariant} onMarkRead={onMarkRead} onDelete={onDelete} />
          ) : (
            <SectionTableSkeleton rowVariant={rowVariant} />
          )}
        </Suspense>
      </div>
    </section>
  );
}

interface SectionTableProps {
  queryRef: PreloadedQuery<NotificationsSectionRelayQueryType>;
  rowVariant: 'unread' | 'read';
  onMarkRead?: (id: string) => void;
  onDelete?: (id: string) => void;
}

function SectionTable({ queryRef, rowVariant, onMarkRead, onDelete }: SectionTableProps) {
  const { toast } = useToast();
  const queryData = usePreloadedQuery(notificationsSectionRelayQuery, queryRef);
  const { data, loadNext, hasNext, isLoadingNext } = usePaginationFragment<
    NotificationsSectionPaginationQueryType,
    NotificationsSectionFragmentKey
  >(notificationsSectionRelayFragment, queryData);

  const rows = useMemo<NotificationRow[]>(
    () =>
      data.notifications.edges.map(edge => ({
        id: edge.node.id,
        title: edge.node.title,
        description: edge.node.description ?? null,
        createdAt: parseCreatedAt(edge.node.createdAt),
        read: edge.node.read,
      })),
    [data.notifications.edges],
  );

  const columns = useMemo(
    () => buildNotificationColumns({ rowVariant, onMarkRead, onDelete }),
    [rowVariant, onMarkRead, onDelete],
  );

  const table = useDataTable<NotificationRow>({
    data: rows,
    columns,
    getRowId: row => row.id,
  });

  const onLoadMore = useCallback(() => {
    if (!hasNext || isLoadingNext) return;
    loadNext(NOTIFICATIONS_SECTION_PAGE_SIZE, {
      onComplete: err => {
        if (err) {
          toast({ title: 'Error loading more notifications', description: err.message, variant: 'destructive' });
        }
      },
    });
  }, [hasNext, isLoadingNext, loadNext, toast]);

  const isEmpty = rows.length === 0;
  const emptyIcon =
    rowVariant === 'unread' ? (
      <BellOffIcon size={24} className="text-ods-text-secondary" />
    ) : (
      <ClockHistoryIcon size={24} className="text-ods-text-secondary" />
    );
  const emptyMessage = rowVariant === 'unread' ? 'No new notifications' : 'No notification history';

  return (
    <DataTable table={table} className="flex min-h-0 flex-1 flex-col">
      <DataTable.Header rightSlot={<DataTable.RowCount itemName="result" />} />
      {isEmpty ? (
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <DataTable.Empty icon={emptyIcon} message={emptyMessage} className="w-full" />
        </div>
      ) : (
        <>
          <DataTable.Body rowClassName="mb-1" />
          <DataTable.InfiniteFooter
            hasNextPage={hasNext}
            isFetchingNextPage={isLoadingNext}
            onLoadMore={onLoadMore}
            skeletonRows={2}
          />
        </>
      )}
    </DataTable>
  );
}

function SectionTableSkeleton({ rowVariant }: { rowVariant: 'unread' | 'read' }) {
  const columns = useMemo(() => buildNotificationColumns({ rowVariant }), [rowVariant]);
  const table = useDataTable<NotificationRow>({
    data: EMPTY_ROWS,
    columns,
    getRowId: row => row.id,
  });

  return (
    <DataTable table={table} className="flex min-h-0 flex-1 flex-col">
      <DataTable.Header rightSlot={<DataTable.RowCount itemName="result" />} />
      <DataTable.Body loading skeletonRows={4} />
    </DataTable>
  );
}
