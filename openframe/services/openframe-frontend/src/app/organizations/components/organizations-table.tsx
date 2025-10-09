'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
  Table,
  StatusTag,
  Button,
  ListPageLayout,
  type TableColumn,
} from '@flamingo/ui-kit/components/ui'
import { PlusCircleIcon } from '@flamingo/ui-kit/components/icons'
import { useDebounce } from '@flamingo/ui-kit/hooks'
import { useOrganizations } from '../hooks/use-organizations'
import { useRouter } from 'next/navigation'

interface UIOrganizationEntry {
  id: string
  name: string
  contact: string
  websiteUrl: string
  tier: string
  industry: string
  mrrDisplay: string
  contractDueDisplay: string
  lastActivityDisplay: string
}

export function OrganizationsTable() {
  const [searchTerm, setSearchTerm] = useState('')
  const [tableFilters, setTableFilters] = useState<Record<string, any[]>>({})
  const [isInitialized, setIsInitialized] = useState(false)
  const router = useRouter()

  const stableFilters = useMemo(() => ({}), [])
  const { organizations, isLoading, error, searchOrganizations } = useOrganizations(stableFilters)
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

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
      contractDueDisplay: dateFmt(org.contractDue),
      lastActivityDisplay: `${new Date(org.lastActivity).toLocaleString()}\n${timeAgo(org.lastActivity)}`,
    }))
  }, [organizations])

  const columns: TableColumn<UIOrganizationEntry>[] = useMemo(() => [
    {
      key: 'name',
      label: 'Name',
      width: 'w-2/5',
      renderCell: (org) => (
        <div className="flex flex-col justify-center shrink-0">
          <span className="font-['DM_Sans'] font-medium text-[18px] leading-[24px] text-ods-text-primary truncate">{org.name}</span>
          <span className="font-['DM_Sans'] font-medium text-[14px] leading-[20px] text-ods-text-secondary truncate">{org.websiteUrl}</span>
        </div>
      )
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
      key: 'contractDueDisplay',
      label: 'Contract Due',
      width: 'w-1/6',
      renderCell: (org) => (
        <span className="font-['DM_Sans'] font-medium text-[18px] leading-[24px] text-ods-text-primary">{org.contractDueDisplay}</span>
      )
    },
    {
      key: 'lastActivityDisplay',
      label: 'Last Activity',
      width: 'w-1/5',
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

  useEffect(() => {
    if (!isInitialized) {
      searchOrganizations('')
      setIsInitialized(true)
    }
  }, [isInitialized, searchOrganizations])

  useEffect(() => {
    if (isInitialized) {
      searchOrganizations(debouncedSearchTerm)
    }
  }, [debouncedSearchTerm, isInitialized, searchOrganizations])

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
        data={transformed}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        emptyMessage="No organizations found. Try adjusting your search or filters."
        filters={tableFilters}
        onFilterChange={setTableFilters}
        showFilters={false}
        mobileColumns={['name', 'tier', 'mrrDisplay']}
        rowClassName="mb-1"
        onRowClick={(row) => router.push(`/organizations/details/${row.id}`)}
      />
    </ListPageLayout>
  )
}
