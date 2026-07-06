'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ScriptEntry } from '../stores/scripts-store';

// ============ Query Keys ============

export const scriptsQueryKeys = {
  all: ['scripts'] as const,
};

// ============ API Functions ============

// TODO(openframe-rmm): Tactical RMM removed — the scripts list has no backend until
// the OpenFrame RMM scripts API is wired up. Returns an empty list so the `/scripts`
// UI still renders (its "No scripts yet" empty state). See scripts-migration.ts.
async function fetchAllScripts(): Promise<ScriptEntry[]> {
  return [];
}

const EMPTY_SCRIPTS: ScriptEntry[] = [];

// ============ Hook ============

export function useScripts() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: scriptsQueryKeys.all,
    queryFn: fetchAllScripts,
  });

  return {
    scripts: query.data ?? EMPTY_SCRIPTS,
    isLoading: query.isFetching,
    error: query.error?.message ?? null,
    refetch: query.refetch,
    invalidate: () => queryClient.invalidateQueries({ queryKey: scriptsQueryKeys.all }),
  };
}
