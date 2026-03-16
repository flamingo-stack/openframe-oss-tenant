'use client';

import { BoxArchiveIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { ListPageLayout, Table } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useDebounce } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOrganizationLookup } from '../../../organizations/hooks/use-organization-lookup';
import { useArchiveResolvedMutation } from '../../hooks/use-archive-resolved-mutation';
import { useDialogsQuery } from '../../hooks/use-dialogs-query';
import type { ClientDialogOwner, Dialog } from '../../types/dialog.types';
import { getDialogTableColumns } from '../dialog-table-columns';

interface ChatsTableProps {
  isArchived: boolean;
  statusFilters?: string[];
  onStatusFilterChange?: (status: string[]) => void;
}

export function ChatsTable({ isArchived, statusFilters, onStatusFilterChange }: ChatsTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  // Lazy organization lookup - doesn't block initial render
  const { lookup: organizationLookup, fetchOrganizationNames } = useOrganizationLookup();
  const archiveResolvedMutation = useArchiveResolvedMutation();

  const { dialogs, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error } = useDialogsQuery({
    archived: isArchived,
    search: debouncedSearch,
    statusFilters,
  });

  useEffect(() => {
    if (dialogs.length === 0) return;

    // Extract unique organization IDs from loaded dialogs
    const organizationIds = dialogs
      .map((dialog: Dialog) => {
        const isClientOwner = 'machine' in (dialog.owner || {});
        if (isClientOwner) {
          const clientOwner = dialog.owner as ClientDialogOwner;
          return clientOwner.machine?.organizationId;
        }
        return undefined;
      })
      .filter((id: string | undefined): id is string => !!id);

    // Dedupe
    const uniqueIds = Array.from(new Set(organizationIds));

    if (uniqueIds.length > 0) {
      fetchOrganizationNames(uniqueIds as string[]);
    }
  }, [dialogs, fetchOrganizationNames]);

  const columns = useMemo(
    () => getDialogTableColumns({ organizationLookup, isArchived }),
    [organizationLookup, isArchived],
  );

  const handleRowClick = useCallback(
    (dialog: Dialog) => {
      router.push(`/tickets/dialog?id=${dialog.id}`);
    },
    [router],
  );

  const handleArchiveResolved = useCallback(async () => {
    await archiveResolvedMutation.mutateAsync(dialogs);
  }, [archiveResolvedMutation, dialogs]);

  const handleFilterChange = useCallback(
    (columnFilters: Record<string, string[]>) => {
      if (isArchived) return;

      const newStatusFilters = columnFilters.status || [];

      if (onStatusFilterChange) {
        onStatusFilterChange(newStatusFilters);
      }

      // Scroll to top on filter change
      document.querySelector('main')?.scrollTo({ top: 0, behavior: 'instant' });
    },
    [isArchived, onStatusFilterChange],
  );

  const hasResolvedDialogs = useMemo(() => {
    return !isArchived && dialogs.some((d: Dialog) => d.status === 'RESOLVED');
  }, [dialogs, isArchived]);

  const title = isArchived ? 'Archived Chats' : 'Current Chats';
  const emptyMessage = isArchived
    ? 'No archived chats found. Try adjusting your search or filters.'
    : 'No current chats found. Try adjusting your search or filters.';

  const actions = useMemo(
    () => [
      {
        label: 'Archive Resolved',
        icon: <BoxArchiveIcon size={24} className="text-ods-text-secondary" />,
        onClick: handleArchiveResolved,
        disabled: archiveResolvedMutation.isPending || isLoading,
      },
    ],
    [handleArchiveResolved, archiveResolvedMutation.isPending, isLoading],
  );

  const filterGroups = columns
    .filter(column => column.filterable)
    .map(column => ({
      id: column.key,
      title: column.label,
      options: column.filterOptions || [],
    }));

  return (
    <ListPageLayout
      title={title}
      searchPlaceholder="Search for Chat"
      searchValue={search}
      onSearch={setSearch}
      error={error}
      padding="none"
      className="pt-6"
      actions={hasResolvedDialogs ? actions : undefined}
      onMobileFilterChange={handleFilterChange}
      mobileFilterGroups={filterGroups}
      // TODO: This is a hack to get the filters to work, replace in future
      currentMobileFilters={{ status: statusFilters || [] }}
      stickyHeader
    >
      <Table
        data={dialogs}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        skeletonRows={10}
        emptyMessage={emptyMessage}
        onRowClick={handleRowClick}
        // TODO: This is a hack to get the filters to work, replace in future
        filters={{ status: statusFilters || [] }}
        onFilterChange={handleFilterChange}
        showFilters={!isArchived}
        rowClassName="mb-1"
        infiniteScroll={{
          hasNextPage,
          isFetchingNextPage,
          onLoadMore: () => fetchNextPage(),
          skeletonRows: 2,
        }}
        stickyHeader
        stickyHeaderOffset="top-[56px]"
      />
    </ListPageLayout>
  );
}

// Wrapper components for tab navigation
export function CurrentChats(props: Omit<ChatsTableProps, 'isArchived'>) {
  return <ChatsTable isArchived={false} {...props} />;
}

export function ArchivedChats(props: Omit<ChatsTableProps, 'isArchived'>) {
  return <ChatsTable isArchived={true} {...props} />;
}
