'use client'

import { useCallback } from 'react'
import { useToast } from '@flamingo/ui-kit/hooks'
import { apiClient } from '@lib/api-client'
import { useOrganizationsStore, OrganizationEntry } from '../stores/organizations-store'
import { GET_ORGANIZATIONS_QUERY } from '../queries/organizations-queries'

interface OrganizationsFilterInput {
  tiers?: Array<OrganizationEntry['tier']>
  industries?: string[]
}

export function useOrganizations(activeFilters: OrganizationsFilterInput = {}) {
  const { toast } = useToast()
  const {
    organizations,
    search,
    isLoading,
    error,
    setOrganizations,
    setSearch,
    setLoading,
    setError,
    clearOrganizations,
    reset
  } = useOrganizationsStore()

  const fetchOrganizations = useCallback(async (
    searchTerm: string,
    filters: OrganizationsFilterInput = {},
  ) => {
    setLoading(true)
    setError(null)

    try {
      const response = await apiClient.post<any>('/api/graphql', {
        query: GET_ORGANIZATIONS_QUERY,
        variables: { search: searchTerm || '', category: undefined }
      })

      if (!response.ok) {
        throw new Error(response.error || `Request failed with status ${response.status}`)
      }

      const payload = (response.data as any)?.data?.organizations
      const items = Array.isArray(payload?.organizations) ? payload.organizations : []

      const mapped: OrganizationEntry[] = items.map((o: any): OrganizationEntry => ({
        id: o.id,
        organizationId: o.organizationId,
        name: o.name ?? '-',
        websiteUrl: o.websiteUrl ?? '-',
        contact: { name: '', email: '' },
        tier: 'Basic',
        industry: o.category ?? '-',
        mrrUsd: o.monthlyRevenue ?? 0,
        contractDue: o.contractEndDate ?? '',
        lastActivity: new Date().toISOString(),
        imageUrl: o.image?.imageUrl || null,
      }))

      setOrganizations(mapped)
      return mapped
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch organizations'
      console.error('Failed to fetch organizations:', error)
      setError(errorMessage)
      toast({
        title: 'Error fetching organizations',
        description: errorMessage,
        variant: 'destructive'
      })
      throw error
    } finally {
      setLoading(false)
    }
  }, [setOrganizations, setLoading, setError, toast])

  const searchOrganizations = useCallback(async (searchTerm: string) => {
    setSearch(searchTerm)
    return fetchOrganizations(searchTerm, activeFilters)
  }, [setSearch, fetchOrganizations])

  const refreshOrganizations = useCallback(async () => {
    return fetchOrganizations(search, activeFilters)
  }, [fetchOrganizations, search, activeFilters.tiers?.join(','), activeFilters.industries?.join(',')])

  return {
    organizations,
    search,
    isLoading,
    error,
    fetchOrganizations,
    searchOrganizations,
    refreshOrganizations,
    clearOrganizations,
    reset
  }
}


