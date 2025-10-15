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
import { Dialog } from '../../types/dialog.types'
import { getDialogTableColumns, getDialogTableRowActions } from '../dialog-table-columns'

export function ArchivedChats() {
  const router = useRouter()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [tableFilters, setTableFilters] = useState<Record<string, any[]>>({})
  
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
    fetchDialogs(true, undefined, true) 
  }, [])

  React.useEffect(() => {
    if (debouncedSearchTerm !== undefined) {
      fetchDialogs(true, debouncedSearchTerm)
    }
  }, [debouncedSearchTerm])
  
  const handleFilterChange = useCallback((columnFilters: Record<string, any[]>) => {
    setTableFilters(columnFilters)
  }, [])
  
  const handleNextPage = useCallback(() => {
    goToNextPage(true)
  }, [goToNextPage])
  
  const handleResetToFirstPage = useCallback(() => {
    goToFirstPage(true)
  }, [goToFirstPage])
  
  const cursorPagination: CursorPaginationProps | undefined = archivedPageInfo ? {
    hasNextPage: archivedPageInfo.hasNextPage,
    isFirstPage: !archivedHasLoadedBeyondFirst,
    startCursor: archivedPageInfo.startCursor,
    endCursor: archivedPageInfo.endCursor,
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
      title="Archived Chats"
      searchPlaceholder="Search for Chat"
      searchValue={searchTerm}
      onSearch={setSearchTerm}
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