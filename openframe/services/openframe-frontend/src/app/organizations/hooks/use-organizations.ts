'use client'

import { useCallback } from 'react'
import { useToast } from '@flamingo/ui-kit/hooks'
import { apiClient } from '../../../lib/api-client'
import { useOrganizationsStore, OrganizationEntry } from '../stores/organizations-store'

interface OrganizationsFilterInput {
  tiers?: Array<OrganizationEntry['tier']>
  industries?: string[]
  slaLevels?: Array<OrganizationEntry['sla']>
}

// Toggle this flag to switch between mock data and real API
const USE_MOCK = true

const mockOrganizations: OrganizationEntry[] = [
  {
    id: '1',
    name: 'TechFlow Solutions',
    contact: { name: 'Mike Johnson', email: 'mike.johnson@techflow.com' },
    tier: 'Enterprise',
    industry: 'Technology',
    mrrUsd: 4250,
    contractDue: '2025-03-15',
    sla: 'Critical',
    lastActivity: '2025-08-10T14:15:00Z'
  },
  {
    id: '2',
    name: 'MedCare Clinic',
    contact: { name: 'Sarah Davis', email: 'sarah.davis@medcare.net' },
    tier: 'Premium',
    industry: 'Professional Services',
    mrrUsd: 2800,
    contractDue: '2025-06-22',
    sla: 'High',
    lastActivity: '2025-08-07T11:30:00Z'
  },
  {
    id: '3',
    name: 'Green Valley Manufacturing',
    contact: { name: 'Robert Kim', email: 'robert.kim@greenvalley.com' },
    tier: 'Basic',
    industry: 'Healthcare',
    mrrUsd: 890,
    contractDue: '2025-01-08',
    sla: 'Medium',
    lastActivity: '2025-08-05T09:45:00Z'
  }
]

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
      if (USE_MOCK) {
        const filtered = mockOrganizations.filter((org) => {
          const matchesSearch = !searchTerm || org.name.toLowerCase().includes(searchTerm.toLowerCase()) || org.contact.email.toLowerCase().includes(searchTerm.toLowerCase())
          const matchesTier = !filters.tiers || filters.tiers.length === 0 || filters.tiers.includes(org.tier)
          const matchesIndustry = !filters.industries || filters.industries.length === 0 || filters.industries.includes(org.industry)
          const matchesSla = !filters.slaLevels || filters.slaLevels.length === 0 || filters.slaLevels.includes(org.sla)
          return matchesSearch && matchesTier && matchesIndustry && matchesSla
        })
        setOrganizations(filtered)
        return filtered
      }

      // Real API example (GraphQL placeholder) - keep signature compatible
      const response = await apiClient.post<any>('/api/graphql', {
        query: `query Organizations($search: String) { organizations(search: $search) { id name tier industry mrrUsd contractDue sla lastActivity contact { name email } } }`,
        variables: { search: searchTerm }
      })

      if (!response.ok) {
        throw new Error(response.error || `Request failed with status ${response.status}`)
      }

      const data = (response.data as any)?.data?.organizations ?? []
      setOrganizations(data)
      return data
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
  }, [setSearch, fetchOrganizations, activeFilters])

  const refreshOrganizations = useCallback(async () => {
    return fetchOrganizations(search, activeFilters)
  }, [fetchOrganizations, search, activeFilters])

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


