'use client'

import React, { useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { 
  Table, 
  SearchBar, 
  Button
} from "@flamingo/ui-kit/components/ui"
import { RefreshIcon } from "@flamingo/ui-kit/components/icons"
import { useDebounce } from "@flamingo/ui-kit/hooks"
import { PageError } from '@flamingo/ui-kit/components/ui'
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

  if (error) {
    return <PageError message={error} />
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header for Archived Chats */}
      <div className="flex items-center justify-between">
        <h1 className="font-['Azeret_Mono'] font-semibold text-[24px] leading-[32px] tracking-[-0.48px] text-ods-text-primary">
          Archived Chats
        </h1>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleRefresh}
            leftIcon={<RefreshIcon size={20} />}
            className="bg-ods-card border border-ods-border hover:bg-ods-bg-hover text-ods-text-primary px-4 py-2.5 rounded-[6px] font-['DM_Sans'] font-bold text-[16px]"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Search for Archived Chats */}
      <SearchBar
        placeholder="Search for Chat"
        onSubmit={setSearchTerm}
        value={searchTerm}
        className="w-full"
      />

      {/* Archived Chats Table */}
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
    </div>
  )
}