'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { tacticalApiClient } from '../../../lib/tactical-api-client';
import { ScriptEntry } from '../stores/scripts-store';

// ============ Query Keys ============

export const scriptsQueryKeys = {
  all: ['scripts'] as const,
};

// ============ API Functions ============

async function fetchAllScripts(): Promise<ScriptEntry[]> {
  const response = await tacticalApiClient.getScripts();

  if (!response.ok) {
    throw new Error(response.error || `Request failed with status ${response.status}`);
  }

  return response.data ?? [];
}

// ============ Hook ============

export function useScripts() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: scriptsQueryKeys.all,
    queryFn: fetchAllScripts,
  });

  return {
    scripts: query.data ?? [],
    isLoading: query.isFetching,
    error: query.error?.message ?? null,
    refetch: query.refetch,
    invalidate: () => queryClient.invalidateQueries({ queryKey: scriptsQueryKeys.all }),
  };
}
