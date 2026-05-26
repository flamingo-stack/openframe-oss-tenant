'use client';

import { NatsProvider } from '@flamingo-stack/openframe-frontend-core/nats';
import type { ReactNode } from 'react';
import { NatsAppConfigProvider, useNatsAppConfig } from './nats-app-config';

const RECONNECTION_BACKOFF = {
  fastRetries: 3,
  fastRetryDelayMs: 200,
} as const;

const CLIENT_CONFIG = {
  name: 'openframe-frontend-app',
  user: 'machine',
  pass: '',
} as const;

export function NatsAppProvider({ children }: { children: ReactNode }) {
  return (
    <NatsAppConfigProvider>
      <NatsProviderWiring>{children}</NatsProviderWiring>
    </NatsAppConfigProvider>
  );
}

function NatsProviderWiring({ children }: { children: ReactNode }) {
  const { getWsUrl, onBeforeReconnect, urlRevision } = useNatsAppConfig();
  return (
    <NatsProvider
      getWsUrl={getWsUrl}
      onBeforeReconnect={onBeforeReconnect}
      clientConfig={CLIENT_CONFIG}
      reconnectionBackoff={RECONNECTION_BACKOFF}
      urlRevision={urlRevision}
    >
      {children}
    </NatsProvider>
  );
}
