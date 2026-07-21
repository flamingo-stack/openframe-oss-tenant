import './styles/globals.css';
import { Toaster } from '@flamingo-stack/openframe-frontend-core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { DebugModeProvider } from './contexts/DebugModeContext';
import { FeatureFlagsGate, FeatureFlagsProvider, useFeatureFlags } from './contexts/FeatureFlagsContext';
import { useConnectionStatus } from './hooks/useConnectionStatus';
import { useNatsNotificationsEnabled } from './services/natsTauri';
import { ChatView } from './views/ChatView';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Must render inside FeatureFlagsProvider; Rust keeps notifications off until
// the loaded flag value arrives.
function NatsNotificationsFlag() {
  const { flags, isLoaded } = useFeatureFlags();
  useNatsNotificationsEnabled(isLoaded && flags.notifications);
  return null;
}

function App() {
  useConnectionStatus();

  useEffect(() => {
    const appType = (import.meta.env.NEXT_PUBLIC_APP_TYPE as string) || 'flamingo';
    document.documentElement.setAttribute('data-app-type', appType);
  }, []);

  return (
    <>
      <QueryClientProvider client={queryClient}>
        <FeatureFlagsProvider>
          <NatsNotificationsFlag />
          <FeatureFlagsGate>
            <DebugModeProvider>
              <ChatView />
            </DebugModeProvider>
          </FeatureFlagsGate>
        </FeatureFlagsProvider>
      </QueryClientProvider>
      <Toaster />
    </>
  );
}

export default App;
