'use client'

import { useCallback, useState, useRef, useMemo, useEffect } from 'react'
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks'
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
    error,
    setScripts,
    setSearch,
    setError,
    clearScripts,
    reset
  } = useScriptsStore()

  // Use LOCAL state for isLoading with initial=true to show skeleton immediately on mount
  // (before useEffect triggers fetch). This prevents the flash of empty state.
  const [isLoading, setIsLoading] = useState(false)

  // Track if first fetch has been done (set by view component)
  const initialLoadDone = useRef(false)

  // Stabilize filters to prevent infinite loops while still detecting changes
  const filtersKey = JSON.stringify(activeFilters)
  const stableFilters = useMemo(() => activeFilters, [filtersKey])
  const filtersRef = useRef(stableFilters)
  filtersRef.current = stableFilters

  // Track previous filters to detect actual changes vs initial render
  const prevFiltersKey = useRef<string | null>(null)

  const fetchScripts = useCallback(async (
    searchTerm: string,
    filters: ScriptsFilterInput = {},
  ) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await tacticalApiClient.getScripts()

      if (!response.ok) {
        throw new Error(response.error || `Request failed with status ${response.status}`)
      }

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
      setIsLoading(false)
    }
  }, [toast, setScripts, setError])

  // Function to mark initial load as done (called by view component after first fetch)
  const markInitialLoadDone = useCallback(() => {
    initialLoadDone.current = true
    // Also set the initial filters key so we don't refetch on first render
    prevFiltersKey.current = filtersKey
  }, [filtersKey])

  const searchScripts = useCallback(async (searchTerm: string) => {
    setSearch(searchTerm)
    return fetchScripts(searchTerm, filtersRef.current)
  }, [setSearch, fetchScripts])

  const refreshScripts = useCallback(async () => {
    return fetchScripts(search, filtersRef.current)
  }, [fetchScripts, search])

  // Refetch when filters change (after initial load, and only when filters ACTUALLY changed)
  useEffect(() => {
    // Only refetch if:
    // 1. Initial load is done
    // 2. Previous filters key was set (not first render after initial load)
    // 3. Filters actually changed
    if (initialLoadDone.current && prevFiltersKey.current !== null && prevFiltersKey.current !== filtersKey) {
      const refetch = async () => {
        await fetchScripts(search, filtersRef.current)
      }
      refetch()
    }
    // Update previous filters key (but only after initial load)
    if (initialLoadDone.current) {
      prevFiltersKey.current = filtersKey
    }
  }, [filtersKey, fetchScripts, search])

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
    reset,
    markInitialLoadDone
  }
}