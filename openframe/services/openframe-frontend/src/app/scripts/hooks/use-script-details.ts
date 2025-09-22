import { useState, useEffect, useCallback } from 'react'
import { tacticalApiClient } from '../../../lib/tactical-api-client'

export interface ScriptDetails {
  id: number
  name: string
  description: string
  shell: string
  args: string[]
  category: string
  favorite: boolean
  script_body: string
  script_hash: string | null
  default_timeout: number
  syntax: string
  filename: string
  hidden: boolean
  supported_platforms: string[]
  run_as_user: boolean
  env_vars: string[]
}

export function useScriptDetails(scriptId: string) {
  const [scriptDetails, setScriptDetails] = useState<ScriptDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchScriptDetails = useCallback(async (id: string) => {
    if (!id) {
      setError('Script ID is required')
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const response = await tacticalApiClient.getScript(id)

      console.log('Response:', response)
      
      if (response.ok && response.data) {
        setScriptDetails(response.data)
      } else {
        setError(response.error || 'Failed to fetch script details')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred'
      setError(errorMessage)
      console.error('Error fetching script details:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchScriptDetails(scriptId)
  }, [scriptId, fetchScriptDetails])

  return {
    scriptDetails,
    isLoading,
    error,
    refetch: () => fetchScriptDetails(scriptId)
  }
}
