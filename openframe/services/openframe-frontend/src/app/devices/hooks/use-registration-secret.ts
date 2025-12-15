'use client'

import { useCallback, useEffect, useState } from 'react'
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks'
import { apiClient } from '@lib/api-client'

export function useRegistrationSecret() {
  const { toast } = useToast()
  const [initialKey, setInitialKey] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const fetchActiveSecret = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await apiClient.get('/api/agent/registration-secret/active')
      if (!response.ok) {
        throw new Error(response.error || `Request failed with status ${response.status}`)
      }
      const { key } = response.data
      if (!key) {
        throw new Error('Active registration secret not found in response')
      }
      setInitialKey(key)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch registration secret'
      setError(message)
      toast({
        title: 'Failed to load registration secret',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    // Auto-fetch on mount
    fetchActiveSecret()
  }, [fetchActiveSecret])

  return {
    initialKey,
    isLoading,
    error,
    refetch: fetchActiveSecret,
  }
}


