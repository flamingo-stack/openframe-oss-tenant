import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import { DEFAULT_FEATURE_FLAGS, type FeatureFlags } from '../config/features';
import { useFeatureFlagsQuery } from '../hooks/useFeatureFlagsQuery';
import { tokenService } from '../services/tokenService';

const FALLBACK_TIMEOUT_MS = 10_000;

interface FeatureFlagsContextType {
  flags: FeatureFlags;
  isLoaded: boolean;
  isError: boolean;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextType | undefined>(undefined);

export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [flags, setFlags] = useState<FeatureFlags>(DEFAULT_FEATURE_FLAGS);
  const [isError, setIsError] = useState(false);

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

  const query = useFeatureFlagsQuery({ enabled: isReady });

  useEffect(() => {
    if (query.data) {
      setFlags(query.data);
      setIsLoaded(true);
    }
  }, [query.data]);

  useEffect(() => {
    if (query.isError) {
      console.error('[FeatureFlags] Failed to fetch feature flags, using defaults:', query.error);
      setFlags(DEFAULT_FEATURE_FLAGS);
      setIsError(true);
      setIsLoaded(true);
    }
  }, [query.isError, query.error]);

  // Safety timeout: fall back to defaults if flags haven't loaded in time
  useEffect(() => {
    if (isLoaded) return;

    const timeout = setTimeout(() => {
      if (!isLoaded) {
        console.warn('[FeatureFlags] Timeout waiting for feature flags, using defaults');
        setFlags(DEFAULT_FEATURE_FLAGS);
        setIsError(true);
        setIsLoaded(true);
      }
    }, FALLBACK_TIMEOUT_MS);

    return () => clearTimeout(timeout);
  }, [isLoaded]);

  return <FeatureFlagsContext.Provider value={{ flags, isLoaded, isError }}>{children}</FeatureFlagsContext.Provider>;
}

export function FeatureFlagsGate({ children }: { children: ReactNode }) {
  const { isLoaded } = useFeatureFlags();
  if (!isLoaded) return null;
  return <>{children}</>;
}

export function useFeatureFlags(): FeatureFlagsContextType {
  const context = useContext(FeatureFlagsContext);
  if (context === undefined) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagsProvider');
  }
  return context;
}
