'use client'

import React, { useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Table,
  Button,
  ListPageLayout
} from "@flamingo/ui-kit/components/ui"
import { RefreshIcon } from "@flamingo/ui-kit/components/icons"
import { useDebounce } from "@flamingo/ui-kit/hooks"
import { useDialogs } from '../../hooks/use-dialogs'
import { Dialog } from '../../types/dialog.types'
import { getDialogTableColumns, getDialogTableRowActions } from '../dialog-table-columns'

export function ArchivedChats() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [tableFilters, setTableFilters] = useState<Record<string, any[]>>({})
  
  const { dialogs, isLoading, error, searchDialogs, refreshDialogs } = useDialogs(true) // true for archived chats
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  const columns = useMemo(() => getDialogTableColumns(), [])

  const handleDialogMore = useCallback((dialog: Dialog) => {
    console.log('More clicked for dialog:', dialog.id)
  }, [])

  const handleDialogDetails = useCallback((dialog: Dialog) => {
    router.push(`/mingo/chat/${dialog.id}`)
  }, [router])

  const rowActions = useMemo(
    () => getDialogTableRowActions(handleDialogMore, handleDialogDetails),
    [handleDialogMore, handleDialogDetails]
  )

  React.useEffect(() => {
    if (debouncedSearchTerm !== undefined) {
      searchDialogs(debouncedSearchTerm)
    }
  }, [debouncedSearchTerm, searchDialogs])

  const handleRefresh = useCallback(() => {
    refreshDialogs()
  }, [refreshDialogs])
  
  const handleFilterChange = useCallback((columnFilters: Record<string, any[]>) => {
    setTableFilters(columnFilters)
  }, [])

  const headerActions = (
    <Button
      onClick={handleRefresh}
      leftIcon={<RefreshIcon size={20} />}
      className="bg-ods-card border border-ods-border hover:bg-ods-bg-hover text-ods-text-primary px-4 py-2.5 rounded-[6px] font-['DM_Sans'] font-bold text-[16px] h-12"
    >
      Refresh
    </Button>
  )

  return (
    <ListPageLayout
      title="Archived Chats"
      headerActions={headerActions}
      searchPlaceholder="Search for Chat"
      searchValue={searchTerm}
      onSearch={setSearchTerm}
      error={error}
      padding="sm"
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
        mobileColumns={['topic', 'status', 'countdown']}
        rowClassName="mb-1"
      />
    </ListPageLayout>
  )
}