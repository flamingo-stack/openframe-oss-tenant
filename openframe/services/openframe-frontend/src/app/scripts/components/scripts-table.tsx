'use client'

import React, { useState, useCallback, useEffect, useMemo, useRef } from "react"
import { toStandardToolLabel, toUiKitToolType } from '@lib/tool-labels'
import { useRouter } from "next/navigation"
import {
  Table,
  Button,
  ListPageLayout,
  TableDescriptionCell,
  type TableColumn
} from "@flamingo-stack/openframe-frontend-core/components/ui"
import { CirclePlusIcon } from "lucide-react"
import { useDebounce, useTablePagination, useApiParams } from "@flamingo-stack/openframe-frontend-core/hooks"
import { useScripts } from "../hooks/use-scripts"
import { ToolBadge, ShellTypeBadge } from "@flamingo-stack/openframe-frontend-core/components"
import { OSTypeBadgeGroup } from "@flamingo-stack/openframe-frontend-core/components/features"
import type { ShellType } from "@flamingo-stack/openframe-frontend-core"

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

  // URL state management - search, filters, and pagination persist in URL
  const { params, setParam, setParams } = useApiParams({
    search: { type: 'string', default: '' },
    shellType: { type: 'array', default: [] },
    addedBy: { type: 'array', default: [] },
    page: { type: 'number', default: 1 }
  })
  const pageSize = 10

  const [isInitialized, setIsInitialized] = useState(false)
  const prevFilterKeyRef = React.useRef<string | null>(null)

  // Track last search to detect actual changes (not mount)
  const lastSearchRef = React.useRef(params.search)

  // Local state for debounced input
  const [searchInput, setSearchInput] = useState(params.search)
  const debouncedSearchInput = useDebounce(searchInput, 300)

  // Sync debounced search to URL (only when value actually changed)
  useEffect(() => {
    if (debouncedSearchInput !== params.search) {
      setParam('search', debouncedSearchInput)
    }
  }, [debouncedSearchInput, params.search, setParam])

  // Backend filters from URL params (for useScripts hook)
  const filters = useMemo(() => ({
    shellType: params.shellType,
    addedBy: params.addedBy
  }), [params.shellType, params.addedBy])

  const { scripts, isLoading, error, searchScripts, refreshScripts } = useScripts(filters)

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

    if (params.search && params.search.trim() !== '') {
      const searchLower = params.search.toLowerCase().trim()
      filtered = filtered.filter(script =>
        script.name.toLowerCase().includes(searchLower) ||
        script.description.toLowerCase().includes(searchLower)
      )
    }

    if (params.shellType && params.shellType.length > 0) {
      filtered = filtered.filter(script =>
        params.shellType.includes(script.shellType)
      )
    }

    if (params.addedBy && params.addedBy.length > 0) {
      filtered = filtered.filter(script =>
        params.addedBy.includes(script.addedBy)
      )
    }

    return filtered
  }, [transformedScripts, params.search, params.shellType, params.addedBy])

  const paginatedScripts = useMemo(() => {
    const startIndex = (params.page - 1) * pageSize
    const endIndex = startIndex + pageSize
    return filteredScripts.slice(startIndex, endIndex)
  }, [filteredScripts, params.page, pageSize])

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

  useEffect(() => {
    if (!isInitialized) {
      searchScripts('')
      setIsInitialized(true)
    }
  }, [isInitialized, searchScripts])

  useEffect(() => {
    if (isInitialized && params.search !== lastSearchRef.current) {
      lastSearchRef.current = params.search
      setParam('page', 1)
    }
  }, [params.search, isInitialized, setParam])

  useEffect(() => {
    if (isInitialized) {
      const filterKey = JSON.stringify({
        shellType: params.shellType?.sort() || [],
        addedBy: params.addedBy?.sort() || [],
      })

      if (prevFilterKeyRef.current !== null && prevFilterKeyRef.current !== filterKey) {
        refreshScripts()
        setParam('page', 1)
      }
      prevFilterKeyRef.current = filterKey
    }
  }, [params.shellType, params.addedBy, refreshScripts, isInitialized])

  const handleRowClick = (script: UIScriptEntry) => {
    router.push(`/scripts/details/${script.id}`)
  }

  const handleNewScript = () => {
    router.push('/scripts/edit/new')
  }

  const handleFilterChange = useCallback((columnFilters: Record<string, any[]>) => {
    setParams({
      page: 1,
      shellType: columnFilters.shellType || [],
      addedBy: columnFilters.addedBy || []
    })
  }, [setParams])

  const cursorPagination = useTablePagination(
    totalPages > 1 ? {
      type: 'client',
      currentPage: params.page,
      totalPages,
      itemCount: paginatedScripts.length,
      itemName: 'scripts',
      onNext: () => setParam('page', Math.min(params.page + 1, totalPages)),
      onPrevious: () => setParam('page', Math.max(params.page - 1, 1)),
      showInfo: true
    } : null
  )

  // Convert URL params to table filters format
  const tableFilters = useMemo(() => ({
    shellType: params.shellType,
    addedBy: params.addedBy
  }), [params.shellType, params.addedBy])

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
      searchValue={searchInput}
      onSearch={setSearchInput}
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
        skeletonRows={pageSize}
        emptyMessage={
          params.search
            ? `No scripts found matching "${params.search}". Try adjusting your search.`
            : "No scripts found. Try adjusting your filters or add a new script."
        }
        filters={tableFilters}
        onFilterChange={handleFilterChange}
        showFilters={true}
        mobileColumns={['logId', 'status', 'device']}
        rowClassName="mb-1"
        onRowClick={handleRowClick}
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