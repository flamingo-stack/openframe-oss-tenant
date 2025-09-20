'use client'

import React, { useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { 
  Table, 
  SearchBar, 
  Button
} from "@flamingo/ui-kit/components/ui"
import { RefreshIcon } from "@flamingo/ui-kit/components/icons"
import { useDebounce } from "@flamingo/ui-kit/hooks"
import { PageError } from '@flamingo/ui-kit/components/ui'
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

  if (error) {
    return <PageError message={error} />
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header for Policies */}
      <div className="flex items-center justify-between">
        <h1 className="font-['Azeret_Mono'] font-semibold text-[24px] leading-[32px] tracking-[-0.48px] text-ods-text-primary">
          Policies
        </h1>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleRefresh}
            leftIcon={<RefreshIcon size={20} />}
            className="bg-ods-card border border-ods-border hover:bg-ods-bg-hover text-ods-text-primary px-4 py-2.5 rounded-[6px] font-['DM_Sans'] font-bold text-[16px]"
          >
            Refresh
          </Button>
          <Button
            onClick={handleCreatePolicy}
            className="bg-ods-accent hover:bg-ods-accent-hover text-text-on-accent px-4 py-2.5 rounded-[6px] font-['DM_Sans'] font-bold text-[16px]"
          >
            New Policy
          </Button>
        </div>
      </div>

      {/* Search for Policies */}
      <SearchBar
        placeholder="Search for Policy"
        onSubmit={setSearchTerm}
        value={searchTerm}
        className="w-full"
      />

      {/* Policies Table */}
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
    </div>
  )
}

export default Policies