'use client'

import { useState, useCallback, useEffect } from 'react'
import { Policy } from '../types/policies.types'
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks'
import { fleetApiClient } from '@lib/fleet-api-client'

export function usePolicies() {
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [policies, setPolicies] = useState<Policy[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPolicies = useCallback(async (searchParam?: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fleetApiClient.getPolicies({
        query: searchParam || searchTerm || undefined
      })

      if (!response.ok) {
        throw new Error(response.error || `Request failed with status ${response.status}`)
      }

      const policiesData = response.data?.policies || []
      setPolicies(policiesData)
      return { policies: policiesData }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch policies'
      console.error('Failed to fetch policies:', error)
      setError(errorMessage)
      
      toast({
        title: 'Error',
        description: `Failed to fetch policies: ${errorMessage}`,
        variant: 'destructive'
      })
      
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [searchTerm, toast])

  const searchPolicies = useCallback(async (term: string) => {
    setSearchTerm(term)
    return fetchPolicies(term)
  }, [fetchPolicies])

  const refreshPolicies = useCallback(async () => {
    try {
      await fetchPolicies()
      toast({
        title: 'Success',
        description: 'Policies refreshed successfully',
        variant: 'success'
      })
    } catch (error) {
      // Error already handled in fetchPolicies
    }
  }, [fetchPolicies, toast])

  useEffect(() => {
    fetchPolicies()
  }, [])

  return {
    policies,
    isLoading,
    error,
    searchPolicies,
    refreshPolicies,
    fetchPolicies
  }
}