'use client'

import React, { useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Table,
  Button,
  ListPageLayout
} from "@flamingo/ui-kit/components/ui"
import { useDebounce } from "@flamingo/ui-kit/hooks"
import { useDialogs } from '../../hooks/use-dialogs'
import { Dialog } from '../../types/dialog.types'
import { getDialogTableColumns, getDialogTableRowActions } from '../dialog-table-columns'

export function CurrentChats() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [tableFilters, setTableFilters] = useState<Record<string, any[]>>({})
  
  const { dialogs, isLoading, error, searchDialogs, refreshDialogs } = useDialogs(false) // false for current chats
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  const columns = useMemo(() => getDialogTableColumns(), [])

  const handleDialogMore = useCallback((dialog: Dialog) => {
    console.log('More clicked for dialog:', dialog.id)
  }, [])

  const handleDialogDetails = useCallback((dialog: Dialog) => {
    router.push(`/mingo/dialog?id=${dialog.id}`)
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
  
  const handleFilterChange = useCallback((columnFilters: Record<string, any[]>) => {
    setTableFilters(columnFilters)
  }, [])

  return (
    <ListPageLayout
      title="Current Chats"
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
        emptyMessage="No current chats found. Try adjusting your search or filters."
        rowActions={rowActions}
        filters={tableFilters}
        onFilterChange={handleFilterChange}
        showFilters={true}
        mobileColumns={['topic', 'status', 'countdown']}
        rowClassName="mb-1"
        actionsWidth={100}
      />
    </ListPageLayout>
  )
}