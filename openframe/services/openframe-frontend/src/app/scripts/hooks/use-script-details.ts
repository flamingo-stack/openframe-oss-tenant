import { useQuery } from '@tanstack/react-query'
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

// ============ Query Keys ============

export const scriptDetailsQueryKeys = {
  all: ['script-details'] as const,
  detail: (scriptId: string) => [...scriptDetailsQueryKeys.all, scriptId] as const,
}

// ============ API Functions ============

async function fetchScriptDetails(scriptId: string): Promise<ScriptDetails> {
  const response = await tacticalApiClient.getScript(scriptId)

  if (!response.ok || !response.data) {
    throw new Error(response.error || 'Failed to fetch script details')
  }

  return response.data
}

// ============ Hook ============

export function useScriptDetails(scriptId: string) {
  const query = useQuery({
    queryKey: scriptDetailsQueryKeys.detail(scriptId),
    queryFn: () => fetchScriptDetails(scriptId),
    enabled: !!scriptId,
  })

  return {
    scriptDetails: query.data ?? null,
    isLoading: query.isFetching,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  }
}
