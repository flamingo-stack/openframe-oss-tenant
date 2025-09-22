'use client'

import React, { useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { 
  Table, 
  SearchBar, 
  Button
} from "@flamingo/ui-kit/components/ui"
import { useDebounce } from "@flamingo/ui-kit/hooks"
import { PageError } from '@flamingo/ui-kit/components/ui'
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

  if (error) {
    return <PageError message={error} />
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header for Current Chats */}
      <div className="flex items-center justify-between">
        <h1 className="font-['Azeret_Mono'] font-semibold text-[24px] leading-[32px] tracking-[-0.48px] text-ods-text-primary">
          Current Chats
        </h1>
        <div className="flex items-center gap-2">
          <Button
            className="bg-ods-card border border-ods-border hover:bg-ods-bg-hover text-ods-text-primary px-4 py-2.5 rounded-[6px] font-['DM_Sans'] font-bold text-[16px]"
          >
            Archive Resolved
          </Button>
          <Button
            className="bg-ods-accent hover:bg-ods-accent-hover text-text-on-accent px-4 py-2.5 rounded-[6px] font-['DM_Sans'] font-bold text-[16px]"
            disabled
          >
            New Chat
          </Button>
        </div>
      </div>

      {/* Search for Current Chats */}
      <SearchBar
        placeholder="Search for Chat"
        onSubmit={setSearchTerm}
        value={searchTerm}
        className="w-full"
      />

      {/* Current Chats Table */}
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
      />
    </div>
  )
}