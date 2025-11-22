'use client'

import React, { useState, useCallback, useEffect, useMemo } from "react"
import { toStandardToolLabel, toUiKitToolType } from '@lib/tool-labels'
import { useRouter } from "next/navigation"
import {
  Table,
  Button,
  ListPageLayout,
  TableDescriptionCell,
  type TableColumn,
  type RowAction
} from "@flamingo/ui-kit/components/ui"
import { CirclePlusIcon } from "lucide-react"
import { useDebounce, useTablePagination } from "@flamingo/ui-kit/hooks"
import { useScripts } from "../hooks/use-scripts"
import { ToolBadge, ShellTypeBadge } from "@flamingo/ui-kit/components/platform"
import { OSTypeBadgeGroup } from "@flamingo/ui-kit/components/features"
import type { ShellType } from "@flamingo/ui-kit"

interface UIScriptEntry {
  id: number
  name: string
  description: string
  shellType: string
  addedBy: string
  supportedPlatforms: string[]
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
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(20)
  const prevFilterKeyRef = React.useRef<string | null>(null)

  const { scripts, isLoading, error, searchScripts, refreshScripts } = useScripts(filters)
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  const transformedScripts: UIScriptEntry[] = useMemo(() => {
    return scripts.map((script) => ({
      id: script.id,
      name: script.name,
      description: script.description,
      shellType: script.shell,
      addedBy: toUiKitToolType('tactical'),
      supportedPlatforms: script.supported_platforms || []
    }))
  }, [scripts])

  const uniqueShellTypes = useMemo(() => {
    const shellTypesSet = new Set(transformedScripts.map(script => script.shellType))
    return Array.from(shellTypesSet).sort().map(shellType => ({
      id: shellType,
      label: shellType,
      value: shellType
    }))
  }, [transformedScripts])

  const uniqueAddedBy = useMemo(() => {
    const addedBySet = new Set(transformedScripts.map(script => script.addedBy))
    return Array.from(addedBySet).sort().map(toolType => ({
      id: toolType,
      label: toStandardToolLabel(toolType.toUpperCase()),
      value: toolType
    }))
  }, [transformedScripts])

  const filteredScripts = useMemo(() => {
    let filtered = transformedScripts

    if (debouncedSearchTerm && debouncedSearchTerm.trim() !== '') {
      const searchLower = debouncedSearchTerm.toLowerCase().trim()
      filtered = filtered.filter(script =>
        script.name.toLowerCase().includes(searchLower) ||
        script.description.toLowerCase().includes(searchLower)
      )
    }

    if (tableFilters.shellType && tableFilters.shellType.length > 0) {
      filtered = filtered.filter(script =>
        tableFilters.shellType.includes(script.shellType)
      )
    }

    if (tableFilters.addedBy && tableFilters.addedBy.length > 0) {
      filtered = filtered.filter(script =>
        tableFilters.addedBy.includes(script.addedBy)
      )
    }

    return filtered
  }, [transformedScripts, debouncedSearchTerm, tableFilters])

  const paginatedScripts = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    return filteredScripts.slice(startIndex, endIndex)
  }, [filteredScripts, currentPage, pageSize])

  const totalPages = useMemo(() => {
    return Math.ceil(filteredScripts.length / pageSize)
  }, [filteredScripts.length, pageSize])

  const columns: TableColumn<UIScriptEntry>[] = useMemo(() => [
    {
      key: 'name',
      label: 'Name',
      width: 'w-[25%]',
      renderCell: (script) => (
        <div className="flex flex-col justify-center shrink-0">
          <span className="font-['DM_Sans'] font-medium text-[18px] leading-[24px] text-ods-text-primary line-clamp-2 break-words">
            {script.name}
          </span>
        </div>
      )
    },
    {
      key: 'shellType',
      label: 'Shell Type',
      width: 'w-[12%]',
      filterable: true,
      filterOptions: uniqueShellTypes,
      renderCell: (script) => (
        <ShellTypeBadge shellType={script.shellType as ShellType} />
      )
    },
    {
      key: 'supportedPlatforms',
      label: 'OS',
      width: 'w-[12%]',
      renderCell: (script) => (
        <OSTypeBadgeGroup
          osTypes={script.supportedPlatforms}
        />
      )
    },
    {
      key: 'addedBy',
      label: 'Added By',
      width: 'w-[12%]',
      filterable: true,
      filterOptions: uniqueAddedBy,
      renderCell: (script) => (
        <ToolBadge toolType={script.addedBy as any} />
      )
    },
    {
      key: 'description',
      label: 'Description',
      width: 'w-[39%]',
      renderCell: (script) => (
        <span className="w-full pr-4 font-['DM_Sans'] font-medium text-[16px] leading-[20px] text-ods-text-secondary line-clamp-3 break-words">
          {script.description || 'No description provided.'}
        </span>
      )
    }
  ], [uniqueShellTypes, uniqueAddedBy])

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
      setCurrentPage(1)
    }
  }, [debouncedSearchTerm, isInitialized])

  useEffect(() => {
    if (isInitialized) {
      const filterKey = JSON.stringify({
        shellType: filters.shellType?.sort() || [],
        addedBy: filters.addedBy?.sort() || [],
        category: filters.category?.sort() || [],
      })

      if (prevFilterKeyRef.current !== null && prevFilterKeyRef.current !== filterKey) {
        refreshScripts()
        setCurrentPage(1)
      }
      prevFilterKeyRef.current = filterKey
    }
  }, [filters, refreshScripts, isInitialized])

  const handleNewScript = () => {
    router.push('/scripts/edit/new')
  }

  const handleFilterChange = useCallback((columnFilters: Record<string, any[]>) => {
    setTableFilters(columnFilters)
    setCurrentPage(1)
  }, [])

  const cursorPagination = useTablePagination(
    totalPages > 1 ? {
      type: 'client',
      currentPage,
      totalPages,
      itemCount: paginatedScripts.length,
      itemName: 'scripts',
      onNext: () => setCurrentPage(prev => Math.min(prev + 1, totalPages)),
      onPrevious: () => setCurrentPage(prev => Math.max(prev - 1, 1)),
      showInfo: true
    } : null
  )


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
        data={paginatedScripts}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        emptyMessage={
          debouncedSearchTerm
            ? `No scripts found matching "${debouncedSearchTerm}". Try adjusting your search.`
            : "No scripts found. Try adjusting your filters or add a new script."
        }
        rowActions={rowActions}
        filters={tableFilters}
        onFilterChange={handleFilterChange}
        showFilters={true}
        mobileColumns={['logId', 'status', 'device']}
        rowClassName="mb-1"
        cursorPagination={cursorPagination}
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