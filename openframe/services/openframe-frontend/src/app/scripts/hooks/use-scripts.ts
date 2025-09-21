'use client'

import { useCallback } from 'react'
import { useToast } from '@flamingo/ui-kit/hooks'
import { tacticalApiClient } from '../../../lib/tactical-api-client'
import { useScriptsStore, ScriptEntry } from '../stores/scripts-store'

interface ScriptsFilterInput {
  shellType?: string[]
  addedBy?: string[]
  category?: string[]
}

export function useScripts(activeFilters: ScriptsFilterInput = {}) {
  const { toast } = useToast()
  const {
    scripts,
    search,
    isLoading,
    error,
    setScripts,
    setSearch,
    setLoading,
    setError,
    clearScripts,
    reset
  } = useScriptsStore()

  const fetchScripts = useCallback(async (
    searchTerm: string,
    filters: ScriptsFilterInput = {},
  ) => {
    setLoading(true)
    setError(null)

    try {
      const response = await tacticalApiClient.getScripts()

      if (!response.ok) {
        throw new Error(response.error || `Request failed with status ${response.status}`)
      }

      console.log({response});

      const data = response.data;

      data && setScripts(data)
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch scripts'
      console.error('Failed to fetch scripts:', error)
      setError(errorMessage)
      
      toast({
        title: 'Error fetching scripts',
        description: errorMessage,
        variant: 'destructive'
      })
      
      throw error
    } finally {
      setLoading(false)
    }
  }, [toast])

  const searchScripts = useCallback(async (searchTerm: string) => {
    setSearch(searchTerm)
    return fetchScripts(searchTerm, activeFilters)
  }, [setSearch, fetchScripts, activeFilters])

  const refreshScripts = useCallback(async () => {
    return fetchScripts(search, activeFilters)
  }, [fetchScripts, search, activeFilters])

  return {
    // State
    scripts,
    search,
    isLoading,
    error,

    // Actions
    fetchScripts,
    searchScripts,
    refreshScripts,
    clearScripts,
    reset
  }
}