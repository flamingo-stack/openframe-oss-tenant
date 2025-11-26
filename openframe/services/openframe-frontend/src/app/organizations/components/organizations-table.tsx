'use client'

import React, { useEffect, useMemo, useState, useCallback } from 'react'
import {
  Table,
  StatusTag,
  Button,
  ListPageLayout,
  type TableColumn,
} from '@flamingo/ui-kit/components/ui'
import { PlusCircleIcon } from '@flamingo/ui-kit/components/icons'
import { OrganizationIcon } from '@flamingo/ui-kit/components/features'
import { useDebounce, useBatchImages, useTablePagination, useApiParams } from '@flamingo/ui-kit/hooks'
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
  // URL state management - search, page, and filters persist in URL
  const { params, setParam, setParams } = useApiParams({
    search: { type: 'string', default: '' },
    page: { type: 'number', default: 1 },
    limit: { type: 'number', default: 20 },
    tier: { type: 'array', default: [] },
    industry: { type: 'array', default: [] }
  })

  const router = useRouter()

  // Debounce search input for smoother UX
  const [searchInput, setSearchInput] = useState(params.search)
  const debouncedSearchInput = useDebounce(searchInput, 300)

  // Update URL when debounced input changes (only when value actually changed)
  useEffect(() => {
    if (debouncedSearchInput !== params.search) {
      setParam('search', debouncedSearchInput)
    }
  }, [debouncedSearchInput, params.search, setParam])

  const stableFilters = useMemo(() => ({}), [])
  const { organizations, isLoading, error, searchOrganizations } = useOrganizations(stableFilters)

  const imageUrls = useMemo(() => 
    featureFlags.organizationImages.displayEnabled()
      ? organizations.map(org => org.imageUrl).filter(Boolean)
      : [], 
    [organizations]
  )
  const fetchedImageUrls = useBatchImages(imageUrls)

  const transformed: UIOrganizationEntry[] = useMemo(() => {
    const toMoney = (n: number) => `$${n.toLocaleString()}`
    const dateFmt = (iso: string) => new Date(iso).toLocaleDateString(undefined, {
      month: 'short', day: '2-digit', year: 'numeric'
    })
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

  const filteredOrganizations = useMemo(() => {
    let filtered = transformed

    // Apply tier filter from URL params
    if (params.tier && params.tier.length > 0) {
      filtered = filtered.filter(org =>
        params.tier.includes(org.tier)
      )
    }

    // Apply industry filter from URL params
    if (params.industry && params.industry.length > 0) {
      filtered = filtered.filter(org =>
        params.industry.includes(org.industry)
      )
    }

    return filtered
  }, [transformed, params.tier, params.industry])

  const paginatedOrganizations = useMemo(() => {
    const startIndex = (params.page - 1) * params.limit
    const endIndex = startIndex + params.limit
    return filteredOrganizations.slice(startIndex, endIndex)
  }, [filteredOrganizations, params.page, params.limit])

  const totalPages = useMemo(() => {
    return Math.ceil(filteredOrganizations.length / params.limit)
  }, [filteredOrganizations.length, params.limit])

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

  useEffect(() => {
    // Always search, even with empty string (to show all results)
    searchOrganizations(params.search || '')
  }, [params.search, searchOrganizations])

  // Reset to page 1 when search term changes
  useEffect(() => {
    if (params.search) {
      setParam('page', 1)
    }
  }, [params.search])

  const handleFilterChange = useCallback((columnFilters: Record<string, any[]>) => {
    // Update URL params with new filters and reset to page 1
    const updates: Record<string, any> = { page: 1 }

    if (columnFilters.tier) {
      updates.tier = columnFilters.tier
    }
    if (columnFilters.industry) {
      updates.industry = columnFilters.industry
    }

    setParam('page', 1)
    if (columnFilters.tier) setParam('tier', columnFilters.tier)
    if (columnFilters.industry) setParam('industry', columnFilters.industry)
  }, [setParam])

  const cursorPagination = useTablePagination(
    totalPages > 1 ? {
      type: 'client',
      currentPage: params.page,
      totalPages,
      itemCount: paginatedOrganizations.length,
      itemName: 'organizations',
      onNext: () => setParam('page', Math.min(params.page + 1, totalPages)),
      onPrevious: () => setParam('page', Math.max(params.page - 1, 1)),
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
    tier: params.tier,
    industry: params.industry
  }), [params.tier, params.industry])

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
        data={paginatedOrganizations}
        columns={columns}
        rowKey="id"
        loading={isLoading}
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
