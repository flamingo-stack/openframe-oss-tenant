'use client'

import React, { useState, useCallback, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Table,
  Button,
  ListPageLayout,
  type CursorPaginationProps
} from "@flamingo/ui-kit/components/ui"
import { useDebounce, useToast, useApiParams, useTablePagination } from "@flamingo/ui-kit/hooks"
import { useDialogsStore } from '../../stores/dialogs-store'
import { Dialog } from '../../types/dialog.types'
import { getDialogTableColumns, getDialogTableRowActions } from '../dialog-table-columns'

export function ArchivedChats() {
  const router = useRouter()
  const { toast } = useToast()

  // URL state management for search
  const { params, setParam } = useApiParams({
    search: { type: 'string', default: '' },
    cursor: { type: 'string', default: '' }
  })

  // Debounce search input for smoother UX
  const [searchInput, setSearchInput] = useState(params.search)
  const debouncedSearchInput = useDebounce(searchInput, 300)

  // Update URL when debounced input changes
  useEffect(() => {
    setParam('search', debouncedSearchInput)
  }, [debouncedSearchInput])

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

  const columns = useMemo(() => getDialogTableColumns(), [])

  const handleDialogDetails = useCallback((dialog: Dialog) => {
    router.push(`/mingo/dialog?id=${dialog.id}`)
  }, [router])

  const rowActions = useMemo(
    () => getDialogTableRowActions(handleDialogDetails),
    [handleDialogDetails]
  )

  React.useEffect(() => {
    fetchDialogs(true, undefined, true) 
  }, [])

  React.useEffect(() => {
    if (params.search !== undefined) {
      fetchDialogs(true, params.search)
    }
  }, [params.search])
  
  const handleFilterChange = useCallback((columnFilters: Record<string, any[]>) => {
    // Mingo doesn't use filters yet, but keep handler for future
  }, [])

  const handleNextPage = useCallback(() => {
    if (archivedPageInfo?.endCursor) {
      setParam('cursor', archivedPageInfo.endCursor)
    }
    goToNextPage(true)
  }, [goToNextPage, archivedPageInfo, setParam])

  const handleResetToFirstPage = useCallback(() => {
    setParam('cursor', '')
    goToFirstPage(true)
  }, [goToFirstPage, setParam])

  const cursorPagination = useTablePagination(
    archivedPageInfo ? {
      type: 'server',
      hasNextPage: archivedPageInfo.hasNextPage,
      hasLoadedBeyondFirst: archivedHasLoadedBeyondFirst,
      startCursor: archivedPageInfo.startCursor,
      endCursor: archivedPageInfo.endCursor,
      itemCount: dialogs.length,
      itemName: 'chats',
      onNext: handleNextPage,
      onReset: handleResetToFirstPage,
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