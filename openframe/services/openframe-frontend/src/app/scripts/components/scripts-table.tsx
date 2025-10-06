'use client'

import React, { useState, useCallback, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Table,
  Button,
  ListPageLayout,
  type TableColumn,
  type RowAction
} from "@flamingo/ui-kit/components/ui"
import { CirclePlusIcon } from "lucide-react"
import { useDebounce } from "@flamingo/ui-kit/hooks"
import { useScripts } from "../hooks/use-scripts"

interface UIScriptEntry {
  id: number
  name: string
  description: string
  shellType: string
  addedBy: string
  category: string
  timeout: number
}

/**
 * Scripts table
 */
export function ScriptsTable() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<{ shellType?: string[], addedBy?: string[], category?: string[] }>({})
  const [tableFilters, setTableFilters] = useState<Record<string, any[]>>({})
  const [isInitialized, setIsInitialized] = useState(false)
  const prevFilterKeyRef = React.useRef<string | null>(null)
  
  const { scripts, isLoading, error, searchScripts, refreshScripts } = useScripts(filters)
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  const transformedScripts: UIScriptEntry[] = useMemo(() => {
    return scripts.map((script) => ({
      id: script.id,
      name: script.name,
      description: script.description,
      shellType: script.shell,
      addedBy: 'Tactical',
      category: script.category,
      timeout: script.default_timeout
    }))
  }, [scripts])

  const columns: TableColumn<UIScriptEntry>[] = useMemo(() => [
    {
      key: 'name',
      label: 'Name',
      width: 'w-1/3',
      renderCell: (script) => (
        <div className="flex flex-col justify-center shrink-0">
          <span className="font-['DM_Sans'] font-medium text-[18px] leading-[24px] text-ods-text-primary truncate">
            {script.name}
          </span>
          <span className="font-['DM_Sans'] font-medium text-[14px] leading-[20px] text-ods-text-secondary truncate">
            {script.description}
          </span>
        </div>
      )
    },
    {
      key: 'shellType',
      label: 'Shell Type',
      width: 'w-1/6',
      filterable: true,
      filterOptions: [
        { id: 'BASH', label: 'bash', value: 'BASH' },
        { id: 'POWERSHELL', label: 'powershell', value: 'POWERSHELL' },
        { id: 'PYTHON', label: 'python', value: 'PYTHON' },
        { id: 'CMD', label: 'cmd', value: 'CMD' },
      ],
      renderCell: (script) => (
        <span className="font-['DM_Sans'] font-medium text-[18px] leading-[24px] text-ods-text-primary truncate">
          {script.shellType}
        </span>
      )
    },
    {
      key: 'addedBy',
      label: 'Added By',
      width: 'w-1/6',
      filterable: true,
      filterOptions: [
        { id: 'TACTICAL', label: 'Tactical RMM', value: 'TACTICAL' },
        { id: 'FLEET', label: 'Fleet MDM', value: 'FLEET' },
      ],
      renderCell: (script) => (
        <span className="font-['DM_Sans'] font-medium text-[18px] leading-[24px] text-ods-text-primary truncate">
          {script.addedBy}
        </span>
      )
    },
    {
      key: 'category',
      label: 'Category',
      width: 'w-1/6',
      renderCell: (script) => (
        <span className="font-['DM_Sans'] font-medium text-[18px] leading-[24px] text-ods-text-primary truncate">
          {script.category}
        </span>
      )
    },
    {
      key: 'timeout',
      label: 'Timeout',
      width: 'w-1/6',
      renderCell: (script) => (
        <span className="font-['DM_Sans'] font-medium text-[18px] leading-[24px] text-ods-text-primary truncate">
          {script.timeout}
        </span>
      )
    }
  ], [])

  const rowActions: RowAction<UIScriptEntry>[] = useMemo(() => [
    {
      label: 'Details',
      onClick: (script) => {
        router.push(`/scripts/details/${script.id}`)
      },
      variant: 'outline',
      className: "bg-ods-card border-ods-border hover:bg-ods-bg-hover text-ods-text-primary font-['DM_Sans'] font-bold text-[18px] px-4 py-3 h-12"
    }
  ], [router])

  useEffect(() => {
    if (!isInitialized) {
      searchScripts('')
      setIsInitialized(true)
    }
  }, [isInitialized, searchScripts])

  useEffect(() => {
    if (isInitialized && debouncedSearchTerm !== undefined) {
      searchScripts(debouncedSearchTerm)
    }
  }, [debouncedSearchTerm, searchScripts, isInitialized])
  
  useEffect(() => {
    if (isInitialized) {
      const filterKey = JSON.stringify({
        shellType: filters.shellType?.sort() || [],
        addedBy: filters.addedBy?.sort() || [],
        category: filters.category?.sort() || [],
      })
      
      if (prevFilterKeyRef.current !== null && prevFilterKeyRef.current !== filterKey) {
        refreshScripts()
      }
      prevFilterKeyRef.current = filterKey
    }
  }, [filters, refreshScripts, isInitialized])

  const handleNewScript = () => {
    router.push('/scripts/edit/new')
  }

  const handleFilterChange = useCallback((columnFilters: Record<string, any[]>) => {
    setTableFilters(columnFilters)
    
    const newFilters: any = {}
    
    if (columnFilters.status?.length > 0) {
      newFilters.severities = columnFilters.status
    }
    
    if (columnFilters.tool?.length > 0) {
      newFilters.toolTypes = columnFilters.tool
    }
    
    setFilters(prev => {
      return prev;
    })
  }, [])


  const headerActions = (
    <>
      <Button
        onClick={handleNewScript}
        variant="primary"
        className="bg-ods-card border border-ods-border hover:bg-ods-bg-hover text-ods-text-primary px-4 py-2.5 rounded-[6px] font-['DM_Sans'] font-bold text-[16px] h-12"
        leftIcon={<CirclePlusIcon size={20} />}
      >
        Add Script
      </Button>
    </>
  )

  return (
    <ListPageLayout
      title="Scripts"
      headerActions={headerActions}
      searchPlaceholder="Search for Scripts"
      searchValue={searchTerm}
      onSearch={setSearchTerm}
      error={error}
      background="default"
      padding="none"
      className="pt-6"
    >
      {/* Table */}
      <Table
        data={transformedScripts}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        emptyMessage="No scripts found. Try adjusting your search or filters."
        rowActions={rowActions}
        filters={tableFilters}
        onFilterChange={handleFilterChange}
        showFilters={true}
        mobileColumns={['logId', 'status', 'device']}
        rowClassName="mb-1"
        actionsWidth={100}
      />

      {/* New Script Modal - Now handled by routing */}
      {/* <EditScriptModal
        isOpen={isNewScriptModalOpen}
        onClose={() => setIsNewScriptModalOpen(false)}
        onSave={handleSaveScript}
        scriptData={null}
        isEditMode={false}
      /> */}
    </ListPageLayout>
  )
}