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
import { Dialog } from '../../types/dialog.types'
import { getDialogTableColumns, getDialogTableRowActions } from '../dialog-table-columns'

export function ArchivedChats() {
  const router = useRouter()
  const { toast } = useToast()

  const {
    archivedDialogs: dialogs,
    archivedPageInfo,
    archivedHasLoadedBeyondFirst,
    isLoadingArchived: isLoading,
    archivedError: error,
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
    handleResetToFirstPage
  } = useCursorPaginationState({
    paramPrefix: 'archived',
    onInitialLoad: (search, cursor) => fetchDialogs(true, search, true, cursor),
    onSearchChange: (search) => fetchDialogs(true, search)
  })

  const columns = useMemo(() => getDialogTableColumns(), [])

  const handleDialogDetails = useCallback((dialog: Dialog) => {
    router.push(`/mingo/dialog?id=${dialog.id}`)
  }, [router])

  const rowActions = useMemo(
    () => getDialogTableRowActions(handleDialogDetails),
    [handleDialogDetails]
  )

  const handleFilterChange = useCallback((columnFilters: Record<string, any[]>) => {
    // Mingo doesn't use filters yet, but keep handler for future
  }, [])

  const onNext = useCallback(() => {
    if (archivedPageInfo?.endCursor) {
      handleNextPage(archivedPageInfo.endCursor, () => goToNextPage(true))
    }
  }, [archivedPageInfo, handleNextPage, goToNextPage])

  const onReset = useCallback(() => {
    handleResetToFirstPage(() => goToFirstPage(true))
  }, [handleResetToFirstPage, goToFirstPage])

  // Use store's hasLoadedBeyondFirst OR hook's (both track the same thing, store is source of truth for dialogs)
  const cursorPagination = useTablePagination(
    archivedPageInfo ? {
      type: 'server',
      hasNextPage: archivedPageInfo.hasNextPage,
      hasLoadedBeyondFirst: archivedHasLoadedBeyondFirst || hasLoadedBeyondFirst,
      startCursor: archivedPageInfo.startCursor,
      endCursor: archivedPageInfo.endCursor,
      itemCount: dialogs.length,
      itemName: 'chats',
      onNext,
      onReset,
      showInfo: true
    } : null
  )

  // Table filters (empty for now)
  const tableFilters = useMemo(() => ({}), [])

  return (
    <ListPageLayout
      title="Archived Chats"
      searchPlaceholder="Search for Chat"
      searchValue={searchInput}
      onSearch={setSearchInput}
      error={error}
      padding="none"
      className="pt-6"
    >
      <Table
        data={dialogs}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        emptyMessage="No archived chats found. Try adjusting your search or filters."
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