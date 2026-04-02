'use client';

import { type ReactNode, useMemo } from 'react';
import { RelayEnvironmentProvider as ReactRelayProvider } from 'react-relay';
import { getRelayEnvironment } from './environment';

interface RelayProviderProps {
  children: ReactNode;
}

/**
 * Relay Environment Provider for the application.
 * Wraps the app with the singleton Relay environment.
 */
export function RelayProvider({ children }: RelayProviderProps) {
  const environment = useMemo(() => getRelayEnvironment(), []);

  return <ReactRelayProvider environment={environment}>{children}</ReactRelayProvider>;
}
