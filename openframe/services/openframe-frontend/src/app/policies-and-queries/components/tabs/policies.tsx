'use client'

import React, { useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Table,
  Button,
  ListPageLayout
} from "@flamingo/ui-kit/components/ui"
import { RefreshIcon } from "@flamingo/ui-kit/components/icons"
import { useDebounce } from "@flamingo/ui-kit/hooks"
import { usePolicies } from '../../hooks/use-policies'
import { Policy } from '../../types/policies.types'
import { getPolicyTableColumns, getPolicyTableRowActions } from '../policies-table-columns'

export function Policies() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [tableFilters, setTableFilters] = useState<Record<string, any[]>>({})
  
  const { policies, isLoading, error, searchPolicies, refreshPolicies } = usePolicies()
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  const columns = useMemo(() => getPolicyTableColumns(), [])

  const handlePolicyMore = useCallback((policy: Policy) => {
    console.log('More clicked for policy:', policy.id)
  }, [])

  const handlePolicyDetails = useCallback((policy: Policy) => {
    router.push(`/policies-and-queries/policy/${policy.id}`)
  }, [router])

  const rowActions = useMemo(
    () => getPolicyTableRowActions(handlePolicyMore, handlePolicyDetails),
    [handlePolicyMore, handlePolicyDetails]
  )

  React.useEffect(() => {
    if (debouncedSearchTerm !== undefined) {
      searchPolicies(debouncedSearchTerm)
    }
  }, [debouncedSearchTerm, searchPolicies])
  
  const handleFilterChange = useCallback((columnFilters: Record<string, any[]>) => {
    setTableFilters(columnFilters)
  }, [])

  const handleRefresh = useCallback(() => {
    refreshPolicies()
  }, [refreshPolicies])

  const handleCreatePolicy = useCallback(() => {
    router.push('/policies-and-queries/new-policy')
  }, [router])

  const headerActions = (
    <>
      <Button
        onClick={handleRefresh}
        leftIcon={<RefreshIcon size={20} />}
        className="bg-ods-card border border-ods-border hover:bg-ods-bg-hover text-ods-text-primary px-4 py-2.5 rounded-[6px] font-['DM_Sans'] font-bold text-[16px] h-12"
      >
        Refresh
      </Button>
      <Button
        onClick={handleCreatePolicy}
        className="bg-ods-accent hover:bg-ods-accent-hover text-text-on-accent px-4 py-2.5 rounded-[6px] font-['DM_Sans'] font-bold text-[16px] h-12"
      >
        New Policy
      </Button>
    </>
  )

  return (
    <ListPageLayout
      title="Policies"
      headerActions={headerActions}
      searchPlaceholder="Search for Policy"
      searchValue={searchTerm}
      onSearch={setSearchTerm}
      error={error}
      padding="sm"
    >
      <Table
        data={policies}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        emptyMessage="No policies found. Try adjusting your search or filters."
        rowActions={rowActions}
        filters={tableFilters}
        onFilterChange={handleFilterChange}
        showFilters={true}
        mobileColumns={['name', 'status', 'critical']}
        rowClassName="mb-1"
      />
    </ListPageLayout>
  )
}

export default Policies