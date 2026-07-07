import { useQuery } from '@tanstack/react-query';
import { rejectScriptsMigrationPending } from '../lib/scripts-migration';

export interface ScriptDetails {
  id: number;
  name: string;
  description: string;
  shell: string;
  args: string[];
  category: string;
  favorite: boolean;
  script_body: string;
  script_hash: string | null;
  default_timeout: number;
  syntax: string;
  filename: string;
  hidden: boolean;
  supported_platforms: string[];
  run_as_user: boolean;
  env_vars: string[];
}

// ============ Query Keys ============

export const scriptDetailsQueryKeys = {
  all: ['script-details'] as const,
  detail: (scriptId: string) => [...scriptDetailsQueryKeys.all, scriptId] as const,
};

// ============ API Functions ============

// TODO(openframe-rmm): Tactical RMM removed — no script-details backend until the
// OpenFrame RMM scripts API is wired up. Rejects so detail/edit/run pages show their
// not-found state. See scripts-migration.ts.
async function fetchScriptDetails(_scriptId: string): Promise<ScriptDetails> {
  return rejectScriptsMigrationPending();
}

// ============ Hook ============

export function useScriptDetails(scriptId: string) {
  const query = useQuery({
    queryKey: scriptDetailsQueryKeys.detail(scriptId),
    queryFn: () => fetchScriptDetails(scriptId),
    enabled: !!scriptId,
  });

  return {
    scriptDetails: query.data ?? null,
    isLoading: query.isFetching,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
}
