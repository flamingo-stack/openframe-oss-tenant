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
import { useArchiveResolved } from '../../hooks/use-archive-resolved'
import { Dialog } from '../../types/dialog.types'
import { getDialogTableColumns, getDialogTableRowActions } from '../dialog-table-columns'
import { ArchiveIcon } from '@flamingo/ui-kit'

export function CurrentChats() {
  const router = useRouter()
  const { toast } = useToast()

  // URL state management for search and filters
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
    currentDialogs: dialogs,
    currentPageInfo,
    currentHasLoadedBeyondFirst,
    isLoadingCurrent: isLoading,
    currentError: error,
    fetchDialogs,
    goToNextPage,
    goToFirstPage
  } = useDialogsStore()

  const { archiveResolvedDialogs, isArchiving } = useArchiveResolved()

  const columns = useMemo(() => getDialogTableColumns(), [])

  const handleDialogDetails = useCallback((dialog: Dialog) => {
    router.push(`/mingo/dialog?id=${dialog.id}`)
  }, [router])

  const rowActions = useMemo(
    () => getDialogTableRowActions(handleDialogDetails),
    [handleDialogDetails]
  )

  React.useEffect(() => {
    fetchDialogs(false, undefined, true)
  }, [])

  React.useEffect(() => {
    if (params.search !== undefined) {
      fetchDialogs(false, params.search)
    }
  }, [params.search])
  
  const handleArchiveResolved = useCallback(async () => {
    const success = await archiveResolvedDialogs(dialogs)
    if (success) {
      await fetchDialogs(false, params.search, true)
    }
  }, [archiveResolvedDialogs, dialogs, fetchDialogs, params.search])

  const handleFilterChange = useCallback((columnFilters: Record<string, any[]>) => {
    // Mingo doesn't seem to use filters yet, but keep handler for future
  }, [])
  
  const hasResolvedDialogs = useMemo(() => {
    return dialogs.some(d => d.status === 'RESOLVED')
  }, [dialogs])
  
  const handleNextPage = useCallback(() => {
    goToNextPage(false)
  }, [goToNextPage])
  
  const handleResetToFirstPage = useCallback(() => {
    goToFirstPage(false)
  }, [goToFirstPage])
  
  const cursorPagination = useTablePagination(
    currentPageInfo ? {
      type: 'server',
      hasNextPage: currentPageInfo.hasNextPage,
      hasLoadedBeyondFirst: currentHasLoadedBeyondFirst,
      startCursor: currentPageInfo.startCursor,
      endCursor: currentPageInfo.endCursor,
      itemCount: dialogs.length,
      itemName: 'chats',
      onNext: handleNextPage,
      onReset: handleResetToFirstPage,
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