import './styles/globals.css';
import { Toaster } from '@flamingo-stack/openframe-frontend-core';
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useEffect } from 'react';
import { DebugModeProvider } from './contexts/DebugModeContext';
import { FeatureFlagsGate, FeatureFlagsProvider, useFeatureFlags } from './contexts/FeatureFlagsContext';
import { useConnectionStatus } from './hooks/useConnectionStatus';
import { useNatsNotificationsEnabled } from './services/natsTauri';
import { isTauri } from './utils/runtime';
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

// WebView2 (Windows) doesn't fire the DOM visibilitychange event react-query's
// default focus manager listens for when a hidden Tauri window is re-shown, so
// refetchOnWindowFocus never ran on reopen. Drive focus from the native window
// event instead — reliable on both platforms.
if (isTauri) {
  focusManager.setEventListener(handleFocus => {
    const unlisten = getCurrentWindow().onFocusChanged(({ payload: focused }) => {
      handleFocus(focused);
    });
    return () => {
      void unlisten.then(u => u());
    };
  });
}

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
