'use client'

import React, { useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Table,
  Button,
  ListPageLayout,
  type CursorPaginationProps
} from "@flamingo/ui-kit/components/ui"
import { useToast, useTablePagination, useCursorPaginationState } from "@flamingo/ui-kit/hooks"
import { useDialogsStore } from '../../stores/dialogs-store'
import { useArchiveResolved } from '../../hooks/use-archive-resolved'
import { Dialog } from '../../types/dialog.types'
import { getDialogTableColumns, getDialogTableRowActions } from '../dialog-table-columns'
import { ArchiveIcon } from '@flamingo/ui-kit'

export function CurrentChats() {
  const router = useRouter()
  const { toast } = useToast()

  const {
    currentDialogs: dialogs,
    currentPageInfo,
    currentHasLoadedBeyondFirst,
    isLoadingCurrent: isLoading,
    currentError: error,
    fetchDialogs,
    goToNextPage,
    goToFirstPage
  } = useDialogsStore()

  // Unified cursor pagination state management
  const {
    searchInput,
    setSearchInput,
    hasLoadedBeyondFirst,
    handleNextPage,
    handleResetToFirstPage,
    params
  } = useCursorPaginationState({
    paramPrefix: 'current',
    onInitialLoad: (search, cursor) => fetchDialogs(false, search, true, cursor),
    onSearchChange: (search) => fetchDialogs(false, search)
  })

  const { archiveResolvedDialogs, isArchiving } = useArchiveResolved()

  const columns = useMemo(() => getDialogTableColumns(), [])

  const handleDialogDetails = useCallback((dialog: Dialog) => {
    router.push(`/mingo/dialog?id=${dialog.id}`)
  }, [router])

  const rowActions = useMemo(
    () => getDialogTableRowActions(handleDialogDetails),
    [handleDialogDetails]
  )

  const handleArchiveResolved = useCallback(async () => {
    const success = await archiveResolvedDialogs(dialogs)
    if (success) {
      await fetchDialogs(false, params.currentSearch, true)
    }
  }, [archiveResolvedDialogs, dialogs, fetchDialogs, params.currentSearch])

  const handleFilterChange = useCallback((columnFilters: Record<string, any[]>) => {
    // Mingo doesn't use filters yet, but keep handler for future
  }, [])

  const hasResolvedDialogs = useMemo(() => {
    return dialogs.some(d => d.status === 'RESOLVED')
  }, [dialogs])

  const onNext = useCallback(() => {
    if (currentPageInfo?.endCursor) {
      handleNextPage(currentPageInfo.endCursor, () => goToNextPage(false))
    }
  }, [currentPageInfo, handleNextPage, goToNextPage])

  const onReset = useCallback(() => {
    handleResetToFirstPage(() => goToFirstPage(false))
  }, [handleResetToFirstPage, goToFirstPage])

  // Use store's hasLoadedBeyondFirst OR hook's (both track the same thing, store is source of truth for dialogs)
  const cursorPagination = useTablePagination(
    currentPageInfo ? {
      type: 'server',
      hasNextPage: currentPageInfo.hasNextPage,
      hasLoadedBeyondFirst: currentHasLoadedBeyondFirst || hasLoadedBeyondFirst,
      startCursor: currentPageInfo.startCursor,
      endCursor: currentPageInfo.endCursor,
      itemCount: dialogs.length,
      itemName: 'chats',
      onNext,
      onReset,
      showInfo: true
    } : null
  )

  // Table filters (empty for now, but ready for future use)
  const tableFilters = useMemo(() => ({}), [])

  return (
    <ListPageLayout
      title="Current Chats"
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
        emptyMessage="No current chats found. Try adjusting your search or filters."
        rowActions={rowActions}
        filters={tableFilters}
        onFilterChange={handleFilterChange}
        showFilters={true}
        mobileColumns={['title', 'status', 'createdAt']}
        rowClassName="mb-1"
        cursorPagination={cursorPagination}
      />
    </ListPageLayout>
  )
}