import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { type FaeSettingsResponse, faeSettingsService } from '../services/faeSettingsService';
import { tokenService } from '../services/tokenService';

export const faeSettingsQueryKey = ['faeSettings'] as const;

/**
 * Loads FaeSettings (assistant customization incl. quickActions) from
 * /chat/graphql. `data` is `null` when no record exists yet. The query waits
 * for the token/API URL to be available
 */
export function useFaeSettingsQuery({ enabled }: { enabled: boolean }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const checkReady = () => {
      const token = tokenService.getCurrentToken();
      const apiUrl = tokenService.getCurrentApiBaseUrl();
      if (token && apiUrl) {
        setIsReady(true);
      }
    };

    checkReady();

    const unsubToken = tokenService.onTokenUpdate(() => checkReady());
    const unsubUrl = tokenService.onApiUrlUpdate(() => checkReady());

    return () => {
      unsubToken();
      unsubUrl();
    };
  }, []);

  return useQuery<FaeSettingsResponse | null>({
    queryKey: faeSettingsQueryKey,
    queryFn: () => faeSettingsService.fetchFaeSettings(),
    enabled: enabled && isReady,
    retry: 1,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
