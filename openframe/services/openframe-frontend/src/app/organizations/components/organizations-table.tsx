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
import { useDebounce, useBatchImages, useTablePagination } from '@flamingo/ui-kit/hooks'
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
  const [searchTerm, setSearchTerm] = useState('')
  const [tableFilters, setTableFilters] = useState<Record<string, any[]>>({})
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(20)
  const router = useRouter()

  const stableFilters = useMemo(() => ({}), [])
  const { organizations, isLoading, error, searchOrganizations } = useOrganizations(stableFilters)
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

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

    if (tableFilters.tier && tableFilters.tier.length > 0) {
      filtered = filtered.filter(org =>
        tableFilters.tier.includes(org.tier)
      )
    }

    if (tableFilters.industry && tableFilters.industry.length > 0) {
      filtered = filtered.filter(org =>
        tableFilters.industry.includes(org.industry)
      )
    }

    return filtered
  }, [transformed, tableFilters])

  const paginatedOrganizations = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    return filteredOrganizations.slice(startIndex, endIndex)
  }, [filteredOrganizations, currentPage, pageSize])

  const totalPages = useMemo(() => {
    return Math.ceil(filteredOrganizations.length / pageSize)
  }, [filteredOrganizations.length, pageSize])

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
    searchOrganizations(debouncedSearchTerm)
  }, [debouncedSearchTerm])

  useEffect(() => {
    if (debouncedSearchTerm !== undefined) {
      setCurrentPage(1)
    }
  }, [debouncedSearchTerm])

  const handleFilterChange = useCallback((columnFilters: Record<string, any[]>) => {
    setTableFilters(columnFilters)
    setCurrentPage(1)
  }, [])

  const cursorPagination = useTablePagination(
    totalPages > 1 ? {
      type: 'client',
      currentPage,
      totalPages,
      itemCount: paginatedOrganizations.length,
      itemName: 'organizations',
      onNext: () => setCurrentPage(prev => Math.min(prev + 1, totalPages)),
      onPrevious: () => setCurrentPage(prev => Math.max(prev - 1, 1)),
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

  return (
    <ListPageLayout
      title="Organizations"
      headerActions={headerActions}
      searchPlaceholder="Search for Organization"
      searchValue={searchTerm}
      onSearch={setSearchTerm}
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
