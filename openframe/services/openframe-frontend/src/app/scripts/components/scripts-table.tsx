'use client'

import React, { useState, useCallback, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { 
  Table,
  SearchBar, 
  Button,
  type TableColumn,
  type RowAction
} from "@flamingo/ui-kit/components/ui"
import { RefreshIcon } from "@flamingo/ui-kit/components/icons"
import { MoreHorizontal, Plus } from "lucide-react"
import { useDebounce } from "@flamingo/ui-kit/hooks"
import { useScripts } from "../hooks/use-scripts"
// import { EditScriptModal } from "./edit-script-modal"

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
  const [selectedScript, setSelectedScript] = useState<UIScriptEntry | null>(null)
  // const [isNewScriptModalOpen, setIsNewScriptModalOpen] = useState(false)
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
      width: 'w-80',
      renderCell: (script) => (
        <div className="flex flex-col justify-center w-80 shrink-0">
          <span className="font-['DM_Sans'] font-medium text-[18px] leading-[24px] text-[#fafafa] truncate">
            {script.name}
          </span>
          <span className="font-['DM_Sans'] font-medium text-[14px] leading-[20px] text-[#888888] truncate">
            {script.description}
          </span>
        </div>
      )
    },
    {
      key: 'shellType',
      label: 'Shell Type',
      width: 'w-32',
      filterable: true,
      filterOptions: [
        { id: 'BASH', label: 'bash', value: 'BASH' },
        { id: 'POWERSHELL', label: 'powershell', value: 'POWERSHELL' },
        { id: 'PYTHON', label: 'python', value: 'PYTHON' },
      ],
      renderCell: (script) => (
        <div className="flex flex-col justify-center w-40 shrink-0">
          <span className="font-['DM_Sans'] font-medium text-[18px] leading-[24px] text-[#fafafa] truncate">
            {script.shellType}
          </span>
        </div>
      )
    },
    {
      key: 'addedBy',
      label: 'Added By',
      width: 'w-40',
      filterable: true,
      filterOptions: [
        { id: 'TACTICAL', label: 'Tactical RMM', value: 'TACTICAL' },
        { id: 'FLEET', label: 'Fleet MDM', value: 'FLEET' },
      ],
      renderCell: (script) => (
        <div className="flex flex-col justify-center w-40 shrink-0">
          <span className="font-['DM_Sans'] font-medium text-[18px] leading-[24px] text-[#fafafa] truncate">
            {script.addedBy}
          </span>
        </div>
      )
    },
    {
      key: 'category',
      label: 'Category',
      width: 'w-40',
      renderCell: (script) => (
        <div className="flex flex-col justify-center w-40 shrink-0">
          <span className="font-['DM_Sans'] font-medium text-[18px] leading-[24px] text-[#fafafa] truncate">
            {script.category}
          </span>
        </div>
      )
    },
    {
      key: 'timeout',
      label: 'Timeout',
      width: 'flex-1 min-w-0',
      renderCell: (script) => (
        <div className="flex flex-col justify-center w-40 shrink-0">
          <span className="font-['DM_Sans'] font-medium text-[18px] leading-[24px] text-[#fafafa] truncate">
            {script.timeout}
          </span>
        </div>
      )
    }
  ], [])

  const rowActions: RowAction<UIScriptEntry>[] = useMemo(() => [
    {
      label: '',
      icon: <MoreHorizontal className="h-6 w-6 text-[#fafafa]" />,
      onClick: (script) => {
        console.log('More clicked for script:', script.id)
      },
      variant: 'outline',
      className: 'bg-[#212121] border-[#3a3a3a] hover:bg-[#2a2a2a] h-12 w-12'
    },
    {
      label: 'Details',
      onClick: (script) => {
        router.push(`/scripts/details?id=${script.id}`)
      },
      variant: 'outline',
      className: "bg-[#212121] border-[#3a3a3a] hover:bg-[#2a2a2a] text-[#fafafa] font-['DM_Sans'] font-bold text-[18px] px-4 py-3 h-12"
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

  const handleRowClick = useCallback((script: UIScriptEntry) => {
    setSelectedScript(script)
  }, [])

  const handleCloseModal = useCallback(() => {
    setSelectedScript(null)
  }, [])

  const handleRefresh = useCallback(() => {
    refreshScripts()
  }, [refreshScripts])

  const handleNewScript = () => {
    router.push('/scripts/edit')
  }

  // const handleSaveScript = () => {
  //   refreshScripts() // Refresh the scripts list after saving
  // }
  
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

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-4">
        <p className="text-red-400">Error: {error}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 bg-[#161616] p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-['Azeret_Mono'] font-semibold text-[24px] leading-[32px] tracking-[-0.48px] text-[#fafafa]">
          Scripts
        </h1>
        <div className="flex gap-3">
          <button
            onClick={handleNewScript}
            className="flex items-center gap-2 bg-[#ffc008] text-[#212121] hover:bg-[#ffd951] font-['DM_Sans'] font-bold px-4 py-2.5 rounded-[6px] text-[16px] transition-colors"
          >
            <Plus size={20} />
            New Script
          </button>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 bg-[#212121] border border-[#3a3a3a] hover:bg-[#2a2a2a] text-[#fafafa] px-4 py-2.5 rounded-[6px] font-['DM_Sans'] font-bold text-[16px] transition-colors"
          >
            <RefreshIcon size={20} />
            Refresh
          </button>
        </div>
      </div>

      {/* Search */}
      <SearchBar
        placeholder="Search for Scripts"
        onSubmit={setSearchTerm}
        value={searchTerm}
        className="w-full"
      />

      {/* Table */}
      <Table
        data={transformedScripts}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        emptyMessage="No scripts found. Try adjusting your search or filters."
        onRowClick={handleRowClick}
        rowActions={rowActions}
        filters={tableFilters}
        onFilterChange={handleFilterChange}
        showFilters={true}
        mobileColumns={['logId', 'status', 'device']}
        rowClassName="mb-1"
      />

      {/* New Script Modal - Now handled by routing */}
      {/* <EditScriptModal
        isOpen={isNewScriptModalOpen}
        onClose={() => setIsNewScriptModalOpen(false)}
        onSave={handleSaveScript}
        scriptData={null}
        isEditMode={false}
      /> */}
    </div>
  )
}