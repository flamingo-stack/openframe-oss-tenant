'use client';

import { getApprovalMeta, isApprovalNotification } from '@flamingo-stack/openframe-frontend-core';
import { BellCheckIcon, SearchIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  DataTable,
  Input,
  type NoDataProps,
  type PageActionButton,
  PageLayout,
  useDataTable,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { type PreloadedQuery, usePaginationFragment, usePreloadedQuery } from 'react-relay';
import type { notificationsSectionRelay_query$key as NotificationsSectionFragmentKey } from '@/__generated__/notificationsSectionRelay_query.graphql';
import type { notificationsSectionRelayPaginationQuery as NotificationsSectionPaginationQueryType } from '@/__generated__/notificationsSectionRelayPaginationQuery.graphql';
import type { notificationsSectionRelayQuery as NotificationsSectionRelayQueryType } from '@/__generated__/notificationsSectionRelayQuery.graphql';
import { EmptyState } from '@/app/components/shared';
import { useStickyToolbar } from '@/app/hooks/use-sticky-toolbar';
import { mapNotificationNode, parseCreatedAt } from '@/graphql/notifications/notifications-helpers';
import {
  notificationsSectionRelayFragment,
  notificationsSectionRelayQuery,
} from '@/graphql/notifications/notifications-section-relay';
import { NotificationApprovalSubRow } from './notification-approval-subrow';
import { buildNotificationColumns, type NotificationRow } from './notifications-columns';

export const NOTIFICATIONS_SECTION_PAGE_SIZE = 50;
const EMPTY_ROWS: NotificationRow[] = [];
const HISTORY_RETENTION_NOTE = 'Notification history is retained for 30 days, then permanently deleted.';

interface NotificationsSectionProps {
  title: string;
  queryRef: PreloadedQuery<NotificationsSectionRelayQueryType> | null | undefined;
  searchValue: string;
  onSearchChange: (value: string) => void;
  actions?: PageActionButton[];
  rowVariant: 'unread' | 'read';
  onMarkRead?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function NotificationsSection({
  title,
  queryRef,
  searchValue,
  onSearchChange,
  actions,
  rowVariant,
  onMarkRead,
  onDelete,
}: NotificationsSectionProps) {
  const [isEmpty, setIsEmpty] = useState(true);
  const { toolbarRef, containerStyle, stickyHeaderOffset } = useStickyToolbar();

  return (
    <PageLayout
      title={title}
      actions={isEmpty ? undefined : actions}
      className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]"
    >
      <div className="flex flex-col" style={containerStyle}>
        <div
          ref={toolbarRef}
          className="sticky top-0 z-20 flex items-center bg-ods-bg -mx-[var(--spacing-system-l)] p-[var(--spacing-system-l)] -mt-[var(--spacing-system-l)]"
        >
          <Input
            placeholder="Search for Notification"
            value={searchValue}
            onChange={e => onSearchChange(e.target.value)}
            className="flex-1"
            startAdornment={<SearchIcon />}
          />
        </div>

        <Suspense fallback={<SectionTableSkeleton rowVariant={rowVariant} stickyHeaderOffset={stickyHeaderOffset} />}>
          {queryRef ? (
            <SectionTable
              queryRef={queryRef}
              rowVariant={rowVariant}
              searchValue={searchValue}
              onMarkRead={onMarkRead}
              onDelete={onDelete}
              onEmptyChange={setIsEmpty}
              stickyHeaderOffset={stickyHeaderOffset}
            />
          ) : (
            <SectionTableSkeleton rowVariant={rowVariant} stickyHeaderOffset={stickyHeaderOffset} />
          )}
        </Suspense>
      </div>
    </PageLayout>
  );
}

interface SectionTableProps {
  queryRef: PreloadedQuery<NotificationsSectionRelayQueryType>;
  rowVariant: 'unread' | 'read';
  searchValue: string;
  onMarkRead?: (id: string) => void;
  onDelete?: (id: string) => void;
  onEmptyChange: (isEmpty: boolean) => void;
  stickyHeaderOffset: string;
}

function SectionTable({
  queryRef,
  rowVariant,
  searchValue,
  onMarkRead,
  onDelete,
  onEmptyChange,
  stickyHeaderOffset,
}: SectionTableProps) {
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
        notification: mapNotificationNode(edge.node),
      })),
    [data.notifications.edges],
  );

  const columns = useMemo(
    () => buildNotificationColumns({ rowVariant, onMarkRead, onDelete }),
    [rowVariant, onMarkRead, onDelete],
  );

  const renderSubRow = useCallback(
    (item: NotificationRow) => {
      if (!isApprovalNotification(item.notification) || !getApprovalMeta(item.notification)) return null;
      return (
        <NotificationApprovalSubRow
          notification={item.notification}
          onResolved={rowVariant === 'unread' ? onMarkRead : undefined}
        />
      );
    },
    [rowVariant, onMarkRead],
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
  useEffect(() => {
    onEmptyChange(isEmpty);
  }, [isEmpty, onEmptyChange]);

  const trimmedSearch = searchValue.trim();
  const emptyState: NoDataProps = trimmedSearch
    ? {
        title: `No notifications found matching "${trimmedSearch}".`,
        description: 'Try adjusting your search.',
      }
    : {
        icon: <BellCheckIcon size={24} className="text-ods-text-secondary" />,
        title: rowVariant === 'unread' ? 'No new notifications' : 'No notifications history',
        description:
          rowVariant === 'read' ? HISTORY_RETENTION_NOTE : "You're all up to date with system alerts and messages.",
      };

  if (isEmpty) {
    return <EmptyState {...emptyState} />;
  }

  return (
    <>
      <DataTable table={table}>
        <DataTable.Header
          stickyHeader
          stickyHeaderOffset={stickyHeaderOffset}
          rightSlot={<DataTable.RowCount itemName="result" />}
        />
        <DataTable.Body rowClassName="mb-1" renderSubRow={renderSubRow} autoHeight />
        <DataTable.InfiniteFooter
          hasNextPage={hasNext}
          isFetchingNextPage={isLoadingNext}
          onLoadMore={onLoadMore}
          skeletonRows={2}
        />
      </DataTable>
      {rowVariant === 'read' && (
        <p className="mt-[var(--spacing-system-l)] text-center text-h6 text-ods-text-secondary">
          {HISTORY_RETENTION_NOTE}
        </p>
      )}
    </>
  );
}

function SectionTableSkeleton({
  rowVariant,
  stickyHeaderOffset,
}: {
  rowVariant: 'unread' | 'read';
  stickyHeaderOffset: string;
}) {
  const columns = useMemo(() => buildNotificationColumns({ rowVariant }), [rowVariant]);
  const table = useDataTable<NotificationRow>({
    data: EMPTY_ROWS,
    columns,
    getRowId: row => row.id,
  });

  return (
    <DataTable table={table}>
      <DataTable.Header
        stickyHeader
        stickyHeaderOffset={stickyHeaderOffset}
        rightSlot={<DataTable.RowCount itemName="result" />}
      />
      <DataTable.Body loading skeletonRows={4} />
    </DataTable>
  );
}
