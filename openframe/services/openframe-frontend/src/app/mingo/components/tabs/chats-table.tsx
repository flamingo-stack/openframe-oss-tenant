'use client'

import React, { useCallback, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Table,
  Button,
  ListPageLayout
} from "@flamingo/ui-kit/components/ui"
import { useTablePagination, useCursorPaginationState } from "@flamingo/ui-kit/hooks"
import { useDialogsStore } from '../../stores/dialogs-store'
import { useArchiveResolved } from '../../hooks/use-archive-resolved'
import { useOrganizationLookup } from '../../../organizations/hooks/use-organization-lookup'
import { Dialog, ClientDialogOwner } from '../../types/dialog.types'
import { getDialogTableColumns } from '../dialog-table-columns'
import { ArchiveIcon } from '@flamingo/ui-kit'

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
    fetchDialogs,
    goToNextPage,
    goToFirstPage
  } = useDialogsStore()

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
    paramPrefix: isArchived ? 'archived' : 'current',
    onInitialLoad: (search, cursor) => fetchDialogs(isArchived, search, true, cursor),
    onSearchChange: (search) => fetchDialogs(isArchived, search)
  })

  // Archive resolved only available for current chats
  const { archiveResolvedDialogs, isArchiving } = useArchiveResolved()

  const columns = useMemo(() => getDialogTableColumns({ organizationLookup }), [organizationLookup])

  const handleRowClick = useCallback((dialog: Dialog) => {
    router.push(`/mingo/dialog?id=${dialog.id}`)
  }, [router])

  const handleArchiveResolved = useCallback(async () => {
    const success = await archiveResolvedDialogs(dialogs)
    if (success) {
      const searchKey = isArchived ? 'archivedSearch' : 'currentSearch'
      await fetchDialogs(isArchived, params[searchKey] || '', true)
    }
  }, [archiveResolvedDialogs, dialogs, fetchDialogs, isArchived, params])

  const handleFilterChange = useCallback((columnFilters: Record<string, any[]>) => {
    // Mingo doesn't use filters yet, but keep handler for future
  }, [])

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

  // Table filters (empty for now, but ready for future use)
  const tableFilters = useMemo(() => ({}), [])

  const title = isArchived ? "Archived Chats" : "Current Chats"
  const emptyMessage = isArchived
    ? "No archived chats found. Try adjusting your search or filters."
    : "No current chats found. Try adjusting your search or filters."

  return (
    <ListPageLayout
      title={title}
      searchPlaceholder="Search for Chat"
      searchValue={searchInput}
      onSearch={setSearchInput}
      error={error}
      padding="none"
      className="pt-6"
      headerActions={
        hasResolvedDialogs && (
          <Button
            onClick={handleArchiveResolved}
            leftIcon={<ArchiveIcon className="w-5 h-5" />}
            className="bg-ods-card border border-ods-border hover:bg-ods-bg-hover text-ods-text-primary px-4 py-2.5 rounded-[6px] font-['DM_Sans'] font-bold text-[16px] h-12"
            disabled={isArchiving || isLoading}
          >
            {isArchiving ? 'Archiving...' : 'Archive Resolved'}
          </Button>
        )
      }
    >
      <Table
        data={dialogs}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        skeletonRows={10}
        emptyMessage={emptyMessage}
        onRowClick={handleRowClick}
        filters={tableFilters}
        onFilterChange={handleFilterChange}
        showFilters={false}
        mobileColumns={['title', 'status', 'createdAt']}
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
