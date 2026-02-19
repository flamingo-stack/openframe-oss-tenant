'use client'

import { OrganizationIcon } from '@flamingo-stack/openframe-frontend-core/components/features'
import { PlusCircleIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2'
import {
  ListPageLayout,
  Table,
  type TableColumn
} from '@flamingo-stack/openframe-frontend-core/components/ui'
import { useApiParams, useCursorPaginationState, useTablePagination } from '@flamingo-stack/openframe-frontend-core/hooks'
import { formatRelativeTime } from '@flamingo-stack/openframe-frontend-core/utils'
import { featureFlags } from '@lib/feature-flags'
import { getFullImageUrl } from '@lib/image-url'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useOrganizations } from '../hooks/use-organizations'

interface UIOrganizationEntry {
  id: string
  name: string
  contact: string
  websiteUrl: string
  tier: string
  industry: string
  mrrDisplay: string
  lastActivityDisplay: string
  imageUrl?: string | null
}

function OrganizationNameCell({ org }: {
  org: UIOrganizationEntry;
}) {
  const fullImageUrl = getFullImageUrl(org.imageUrl)

  return (
    <div className="flex items-center gap-3">
      {featureFlags.organizationImages.displayEnabled() && (
        <OrganizationIcon
          imageUrl={fullImageUrl}
          organizationName={org.name}
          size="md"
        />
      )}
      <div className="flex flex-col justify-center shrink-0 min-w-0">
        <span className="font-['DM_Sans'] font-medium text-[18px] leading-[24px] text-ods-text-primary truncate">{org.name}</span>
        <span className="font-['DM_Sans'] font-medium text-[14px] leading-[20px] text-ods-text-secondary truncate">{org.websiteUrl}</span>
      </div>
    </div>
  )
}

export function OrganizationsTable() {
  const router = useRouter()

  // Extra URL params for filters (not search/cursor which are handled by pagination hook)
  const { params: filterParams, setParams: setFilterParams } = useApiParams({
    tier: { type: 'array', default: [] },
    industry: { type: 'array', default: [] }
  })

  const prevFiltersKeyRef = useRef<string | null>(null)

  // Backend filters from URL params
  const backendFilters = useMemo(() => ({
    tiers: filterParams.tier,
    industries: filterParams.industry
  }), [filterParams.tier, filterParams.industry])

  // Stable filter key for detecting changes
  const filtersKey = useMemo(() => JSON.stringify({
    tiers: filterParams.tier?.sort() || [],
    industries: filterParams.industry?.sort() || []
  }), [filterParams.tier, filterParams.industry])

  const {
    organizations,
    isLoading,
    error,
    pageInfo,
    hasLoadedBeyondFirst,
    setHasLoadedBeyondFirst,
    fetchOrganizations,
    fetchNextPage,
    fetchFirstPage,
    searchOrganizations,
    markInitialLoadDone
  } = useOrganizations(backendFilters)

  // Unified cursor pagination state management (no prefix, uses 'search' and 'cursor')
  const {
    searchInput,
    setSearchInput,
    hasLoadedBeyondFirst: hookHasLoadedBeyondFirst,
    handleNextPage,
    handleResetToFirstPage,
    params: paginationParams,
    setParams: setPaginationParams
  } = useCursorPaginationState({
    onInitialLoad: (search, cursor) => {
      if (cursor) {
        fetchOrganizations(search || '', cursor, backendFilters)
        setHasLoadedBeyondFirst(true)
      } else {
        fetchOrganizations(search || '', null, backendFilters)
      }
      markInitialLoadDone()
    },
    onSearchChange: (search) => searchOrganizations(search)
  })


  const transformed: UIOrganizationEntry[] = useMemo(() => {
    const toMoney = (n: number) => `$${n.toLocaleString()}`

    return organizations.map(org => ({
      id: org.id,
      name: org.name,
      contact: `${org.contact.email}`,
      websiteUrl: org.websiteUrl,
      tier: org.tier,
      industry: org.industry,
      mrrDisplay: toMoney(org.mrrUsd),
      lastActivityDisplay: `${new Date(org.lastActivity).toLocaleString()}\n${formatRelativeTime(org.lastActivity)}`,
      imageUrl: org.imageUrl,
    }))
  }, [organizations])

  // Client-side filtering for tier/industry (after fetching from server)
  const filteredOrganizations = useMemo(() => {
    let filtered = transformed

    // Apply tier filter from URL params
    if (filterParams.tier && filterParams.tier.length > 0) {
      filtered = filtered.filter(org =>
        filterParams.tier.includes(org.tier)
      )
    }

    // Apply industry filter from URL params
    if (filterParams.industry && filterParams.industry.length > 0) {
      filtered = filtered.filter(org =>
        filterParams.industry.includes(org.industry)
      )
    }

    return filtered
  }, [transformed, filterParams.tier, filterParams.industry])

  const columns: TableColumn<UIOrganizationEntry>[] = useMemo(() => [
    {
      key: 'name',
      label: 'Name',
      width: 'w-2/5',
      renderCell: (org) => <OrganizationNameCell org={org} />
    },
    {
      key: 'tier',
      label: 'Tier',
      width: 'w-1/6',
      renderCell: (org) => (
        <div className="flex flex-col justify-center shrink-0">
          <span className="font-['DM_Sans'] font-medium text-[18px] leading-[24px] text-ods-text-primary truncate">{org.tier}</span>
          <span className="font-['DM_Sans'] font-medium text-[14px] leading-[20px] text-ods-text-secondary truncate">{org.industry}</span>
        </div>
      )
    },
    {
      key: 'mrrDisplay',
      label: 'MRR',
      width: 'w-1/6',
      renderCell: (org) => (
        <span className="font-['DM_Sans'] font-medium text-[18px] leading-[24px] text-ods-text-primary">{org.mrrDisplay}</span>
      )
    },
    {
      key: 'lastActivityDisplay',
      label: 'Last Activity',
      width: 'w-[200px]',
      hideAt: 'md',
      renderCell: (org) => {
        const [first, second] = org.lastActivityDisplay.split('\n')
        return (
          <div className="flex flex-col justify-center shrink-0">
            <span className="font-['DM_Sans'] font-medium text-[18px] leading-[24px] text-ods-text-primary truncate">{first}</span>
            <span className="font-['DM_Sans'] font-medium text-[14px] leading-[20px] text-ods-text-secondary truncate">{second}</span>
          </div>
        )
      }
    }
  ], [])

  // Refetch when filters change
  const initialFilterLoadDone = useRef(false)
  useEffect(() => {
    if (initialFilterLoadDone.current) {
      // Only refetch if filters actually changed (not on mount)
      if (prevFiltersKeyRef.current !== null && prevFiltersKeyRef.current !== filtersKey) {
        const refetch = async () => {
          await searchOrganizations(paginationParams.search)
        }
        refetch()
        setHasLoadedBeyondFirst(false)
      }
    } else {
      initialFilterLoadDone.current = true
    }
    prevFiltersKeyRef.current = filtersKey
  }, [filtersKey, paginationParams.search, searchOrganizations, setHasLoadedBeyondFirst])

  const handleFilterChange = useCallback((columnFilters: Record<string, any[]>) => {
    // Reset cursor and update filter params
    setPaginationParams({ cursor: '' })
    setFilterParams({
      tier: columnFilters.tier || [],
      industry: columnFilters.industry || []
    })
    setHasLoadedBeyondFirst(false)
  }, [setFilterParams, setPaginationParams, setHasLoadedBeyondFirst])

  const onNext = useCallback(async () => {
    if (pageInfo?.hasNextPage && pageInfo?.endCursor) {
      await handleNextPage(pageInfo.endCursor, () => fetchNextPage(paginationParams.search))
    }
  }, [pageInfo, handleNextPage, fetchNextPage, paginationParams.search])

  const onReset = useCallback(async () => {
    await handleResetToFirstPage(() => fetchFirstPage(paginationParams.search))
  }, [handleResetToFirstPage, fetchFirstPage, paginationParams.search])

  const cursorPagination = useTablePagination(
    pageInfo ? {
      type: 'server',
      hasNextPage: pageInfo.hasNextPage,
      hasLoadedBeyondFirst: hasLoadedBeyondFirst || hookHasLoadedBeyondFirst,
      startCursor: pageInfo.startCursor ?? undefined,
      endCursor: pageInfo.endCursor ?? undefined,
      itemCount: organizations.length,
      itemName: 'organizations',
      onNext,
      onReset,
      showInfo: true
    } : null
  )

  const handleAddOrganization = () => {
    router.push('/organizations/edit/new')
  }

  // Convert URL params to table filters format
  const tableFilters = useMemo(() => ({
    tier: filterParams.tier,
    industry: filterParams.industry
  }), [filterParams.tier, filterParams.industry])

  const actions = useMemo(() => [
    {
      label: 'Add Organization',
      icon: <PlusCircleIcon size={24} className="text-ods-text-secondary" />,
      onClick: handleAddOrganization
    }
  ], [handleAddOrganization])

  return (
    <ListPageLayout
      title="Organizations"
      actions={actions}
      searchPlaceholder="Search for Organization"
      searchValue={searchInput}
      onSearch={setSearchInput}
      error={error}
      background="default"
      padding="none"
    >
      <Table
        data={filteredOrganizations}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        skeletonRows={10}
        emptyMessage="No organizations found. Try adjusting your search or filters."
        filters={tableFilters}
        onFilterChange={handleFilterChange}
        showFilters={false}
        rowClassName="mb-1"
        onRowClick={(row) => router.push(`/organizations/details/${row.id}`)}
        cursorPagination={cursorPagination}
      />
    </ListPageLayout>
  )
}
