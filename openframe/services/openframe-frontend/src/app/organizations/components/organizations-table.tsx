'use client'

import React, { useCallback, useMemo, useRef, useEffect } from 'react'
import {
  Table,
  Button,
  ListPageLayout,
  type TableColumn,
} from '@flamingo/ui-kit/components/ui'
import { PlusCircleIcon } from '@flamingo/ui-kit/components/icons'
import { OrganizationIcon } from '@flamingo/ui-kit/components/features'
import { useBatchImages, useTablePagination, useApiParams, useCursorPaginationState } from '@flamingo/ui-kit/hooks'
import { useOrganizations } from '../hooks/use-organizations'
import { useRouter } from 'next/navigation'
import { featureFlags } from '@lib/feature-flags'

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

function OrganizationNameCell({ org, fetchedImageUrls }: {
  org: UIOrganizationEntry;
  fetchedImageUrls: Record<string, string | undefined>;
}) {
  const fetchedImageUrl = org.imageUrl ? fetchedImageUrls[org.imageUrl] : undefined

  return (
    <div className="flex items-center gap-3">
      {featureFlags.organizationImages.displayEnabled() && (
        <OrganizationIcon
          imageUrl={fetchedImageUrl}
          organizationName={org.name}
          size="md"
          preFetched={true}
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

  const imageUrls = useMemo(() =>
    featureFlags.organizationImages.displayEnabled()
      ? organizations.map(org => org.imageUrl).filter(Boolean)
      : [],
    [organizations]
  )
  const fetchedImageUrls = useBatchImages(imageUrls)

  const transformed: UIOrganizationEntry[] = useMemo(() => {
    const toMoney = (n: number) => `$${n.toLocaleString()}`
    const timeAgo = (iso: string) => {
      const now = new Date().getTime()
      const then = new Date(iso).getTime()
      const diff = Math.max(0, now - then)
      const days = Math.floor(diff / (24 * 60 * 60 * 1000))
      if (days === 0) return 'today'
      if (days === 1) return '1 day ago'
      if (days < 7) return `${days} days ago`
      const weeks = Math.floor(days / 7)
      return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`
    }

    return organizations.map(org => ({
      id: org.id,
      name: org.name,
      contact: `${org.contact.email}`,
      websiteUrl: org.websiteUrl,
      tier: org.tier,
      industry: org.industry,
      mrrDisplay: toMoney(org.mrrUsd),
      lastActivityDisplay: `${new Date(org.lastActivity).toLocaleString()}\n${timeAgo(org.lastActivity)}`,
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
      renderCell: (org) => <OrganizationNameCell org={org} fetchedImageUrls={fetchedImageUrls} />
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
      width: 'w-1/4',
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
  ], [fetchedImageUrls])

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

  const headerActions = (
    <Button
      onClick={handleAddOrganization}
      leftIcon={<PlusCircleIcon className="w-5 h-5" whiteOverlay />}
      className="bg-ods-card border border-ods-border hover:bg-ods-bg-hover text-ods-text-primary px-4 py-2.5 rounded-[6px] font-['DM_Sans'] font-bold text-[16px] h-12"
    >
      Add Organization
    </Button>
  )

  // Convert URL params to table filters format
  const tableFilters = useMemo(() => ({
    tier: filterParams.tier,
    industry: filterParams.industry
  }), [filterParams.tier, filterParams.industry])

  return (
    <ListPageLayout
      title="Organizations"
      headerActions={headerActions}
      searchPlaceholder="Search for Organization"
      searchValue={searchInput}
      onSearch={setSearchInput}
      error={error}
      background="default"
      padding="none"
      className="pt-6"
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
        mobileColumns={['name', 'tier', 'mrrDisplay']}
        rowClassName="mb-1"
        onRowClick={(row) => router.push(`/organizations/details/${row.id}`)}
        cursorPagination={cursorPagination}
      />
    </ListPageLayout>
  )
}
