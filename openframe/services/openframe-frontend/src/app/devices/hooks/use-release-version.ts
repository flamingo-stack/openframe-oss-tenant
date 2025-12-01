'use client'

import { useCallback, useEffect, useState } from 'react'
import { useToast } from '@flamingo/ui-kit/hooks'
import { apiClient } from '@lib/api-client'

type ReleaseVersionResponse = {
  releaseVersion?: string
}

const DEFAULT_RELEASE_VERSION = 'latest'

export function useReleaseVersion() {
  const { toast } = useToast()
  const [releaseVersion, setReleaseVersion] = useState<string>(DEFAULT_RELEASE_VERSION)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const fetchReleaseVersion = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await apiClient.get<ReleaseVersionResponse>('/api/release-version')

      if (!response.ok) {
        throw new Error(response.error || `Request failed with status ${response.status}`)
      }

      const version = response.data?.releaseVersion?.trim()
      setReleaseVersion(version || DEFAULT_RELEASE_VERSION)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch release version'
      setError(message)
      setReleaseVersion(DEFAULT_RELEASE_VERSION)
      toast({
        title: 'Failed to load release version',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchReleaseVersion()
  }, [fetchReleaseVersion])

  return {
    releaseVersion,
    isLoading,
    error,
    refetch: fetchReleaseVersion,
  }
}
