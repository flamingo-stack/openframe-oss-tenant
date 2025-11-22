'use client'

import React, { useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Table,
  Button,
  ListPageLayout,
  type CursorPaginationProps
} from "@flamingo/ui-kit/components/ui"
import { useDebounce, useToast } from "@flamingo/ui-kit/hooks"
import { useDialogsStore } from '../../stores/dialogs-store'
import { useArchiveResolved } from '../../hooks/use-archive-resolved'
import { Dialog } from '../../types/dialog.types'
import { getDialogTableColumns, getDialogTableRowActions } from '../dialog-table-columns'
import { ArchiveIcon } from '@flamingo/ui-kit'

export function CurrentChats() {
  const router = useRouter()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [tableFilters, setTableFilters] = useState<Record<string, any[]>>({})
  
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
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

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
    if (debouncedSearchTerm !== undefined) {
      fetchDialogs(false, debouncedSearchTerm)
    }
  }, [debouncedSearchTerm])
  
  const handleArchiveResolved = useCallback(async () => {
    const success = await archiveResolvedDialogs(dialogs)
    if (success) {
      await fetchDialogs(false, searchTerm, true)
    }
  }, [archiveResolvedDialogs, dialogs, fetchDialogs, searchTerm])
  
  const handleFilterChange = useCallback((columnFilters: Record<string, any[]>) => {
    setTableFilters(columnFilters)
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
  
  const cursorPagination: CursorPaginationProps | undefined = currentPageInfo ? {
    hasNextPage: currentPageInfo.hasNextPage,
    isFirstPage: !currentHasLoadedBeyondFirst,
    startCursor: currentPageInfo.startCursor,
    endCursor: currentPageInfo.endCursor,
    currentCount: dialogs.length,
    itemName: 'chats',
    onNext: () => handleNextPage(),
    onReset: handleResetToFirstPage,
    showInfo: true,
    resetButtonLabel: 'First',
    resetButtonIcon: 'home'
  } : undefined

  return (
    <ListPageLayout
      title="Current Chats"
      searchPlaceholder="Search for Chat"
      searchValue={searchTerm}
      onSearch={setSearchTerm}
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