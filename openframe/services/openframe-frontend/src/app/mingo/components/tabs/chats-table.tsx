'use client'

import { BoxArchiveIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2'
import {
  ListPageLayout,
  Table
} from "@flamingo-stack/openframe-frontend-core/components/ui"
import { useCursorPaginationState, useTablePagination } from "@flamingo-stack/openframe-frontend-core/hooks"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo } from "react"
import { useOrganizationLookup } from '../../../organizations/hooks/use-organization-lookup'
import { useArchiveResolved } from '../../hooks/use-archive-resolved'
import { useDialogsStore } from '../../stores/dialogs-store'
import { ClientDialogOwner, Dialog } from '../../types/dialog.types'
import { getDialogTableColumns } from '../dialog-table-columns'

interface ChatsTableProps {
  isArchived: boolean
}

export function ChatsTable({ isArchived }: ChatsTableProps) {
  const router = useRouter()

  // Lazy organization lookup - doesn't block initial render
  const { lookup: organizationLookup, fetchOrganizationNames } = useOrganizationLookup()

  // Get the appropriate data from store based on isArchived
  const {
    currentDialogs,
    archivedDialogs,
    currentPageInfo,
    archivedPageInfo,
    currentHasLoadedBeyondFirst,
    archivedHasLoadedBeyondFirst,
    isLoadingCurrent,
    isLoadingArchived,
    currentError,
    archivedError,
    currentStatusFilters,
    archivedStatusFilters,
    fetchDialogs,
    goToNextPage,
    goToFirstPage
  } = useDialogsStore()

  const currentFilters = isArchived ? archivedStatusFilters : currentStatusFilters

  // Select the right data based on mode
  const dialogs = isArchived ? archivedDialogs : currentDialogs
  const pageInfo = isArchived ? archivedPageInfo : currentPageInfo
  const storeHasLoadedBeyondFirst = isArchived ? archivedHasLoadedBeyondFirst : currentHasLoadedBeyondFirst
  const isLoading = isArchived ? isLoadingArchived : isLoadingCurrent
  const error = isArchived ? archivedError : currentError

  // Lazily fetch organization names after dialogs are loaded (non-blocking)
  useEffect(() => {
    if (dialogs.length === 0) return

    // Extract unique organization IDs from loaded dialogs
    const organizationIds = dialogs
      .map(dialog => {
        const isClientOwner = 'machine' in (dialog.owner || {})
        if (isClientOwner) {
          const clientOwner = dialog.owner as ClientDialogOwner
          return clientOwner.machine?.organizationId
        }
        return undefined
      })
      .filter((id): id is string => !!id)

    // Dedupe
    const uniqueIds = [...new Set(organizationIds)]

    if (uniqueIds.length > 0) {
      fetchOrganizationNames(uniqueIds)
    }
  }, [dialogs, fetchOrganizationNames])

  // Unified cursor pagination state management
  const {
    searchInput,
    setSearchInput,
    hasLoadedBeyondFirst,
    handleNextPage,
    handleResetToFirstPage,
    params
  } = useCursorPaginationState({
    onInitialLoad: (search, cursor) => fetchDialogs(isArchived, search, true, cursor),
    onSearchChange: (search) => fetchDialogs(isArchived, search)
  })

  // Archive resolved only available for current chats
  const { archiveResolvedDialogs, isArchiving } = useArchiveResolved()

  const columns = useMemo(() => getDialogTableColumns({ organizationLookup, isArchived }), [organizationLookup, isArchived])

  const handleRowClick = useCallback((dialog: Dialog) => {
    router.push(`/mingo/dialog?id=${dialog.id}`)
  }, [router])

  const handleArchiveResolved = useCallback(async () => {
    const success = await archiveResolvedDialogs(dialogs)
    if (success) {
      await fetchDialogs(isArchived, params.search || '', true)
    }
  }, [archiveResolvedDialogs, dialogs, fetchDialogs, isArchived, params])

  const handleFilterChange = useCallback(async (columnFilters: Record<string, any[]>) => {
    if (isArchived) return
    
    const statusFilters = columnFilters.status || []
    await fetchDialogs(false, params.search || '', true, null, statusFilters)
  }, [fetchDialogs, isArchived, params])

  const hasResolvedDialogs = useMemo(() => {
    return !isArchived && dialogs.some(d => d.status === 'RESOLVED')
  }, [dialogs, isArchived])

  const onNext = useCallback(() => {
    if (pageInfo?.endCursor) {
      handleNextPage(pageInfo.endCursor, () => goToNextPage(isArchived))
    }
  }, [pageInfo, handleNextPage, goToNextPage, isArchived])

  const onReset = useCallback(() => {
    handleResetToFirstPage(() => goToFirstPage(isArchived))
  }, [handleResetToFirstPage, goToFirstPage, isArchived])

  // Use store's hasLoadedBeyondFirst OR hook's (both track the same thing, store is source of truth for dialogs)
  const cursorPagination = useTablePagination(
    pageInfo ? {
      type: 'server',
      hasNextPage: pageInfo.hasNextPage,
      hasLoadedBeyondFirst: storeHasLoadedBeyondFirst || hasLoadedBeyondFirst,
      startCursor: pageInfo.startCursor,
      endCursor: pageInfo.endCursor,
      itemCount: dialogs.length,
      itemName: 'chats',
      onNext,
      onReset,
      showInfo: true
    } : null
  )

  const title = isArchived ? "Archived Chats" : "Current Chats"
  const emptyMessage = isArchived
    ? "No archived chats found. Try adjusting your search or filters."
    : "No current chats found. Try adjusting your search or filters."

  const actions = useMemo(() => [
    {
      label: 'Archive Resolved',
      icon: <BoxArchiveIcon size={24} className="text-ods-text-secondary" />,
      onClick: handleArchiveResolved,
      disabled: isArchiving || isLoading
    }
  ], [handleArchiveResolved, isArchiving, isLoading])

  const filterGroups = columns.filter(column => column.filterable).map(column => ({
    id: column.key,
    title: column.label,
    options: column.filterOptions || []
  }))

  return (
    <ListPageLayout
      title={title}
      searchPlaceholder="Search for Chat"
      searchValue={searchInput}
      onSearch={setSearchInput}
      error={error}
      padding="none"
      className="pt-6"
      actions={hasResolvedDialogs ? actions : undefined}
      onMobileFilterChange={handleFilterChange}
      mobileFilterGroups={filterGroups}
      // TODO: This is a hack to get the filters to work, replace in future
      currentMobileFilters={{ status: currentFilters || [] }}
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
        filters={{ status: currentFilters || [] }}
        onFilterChange={handleFilterChange}
        showFilters={!isArchived}
        rowClassName="mb-1"
        cursorPagination={cursorPagination}
      />
    </ListPageLayout>
  )
}

// Wrapper components for tab navigation
export function CurrentChats() {
  return <ChatsTable isArchived={false} />
}

export function ArchivedChats() {
  return <ChatsTable isArchived={true} />
}
