import './styles/globals.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { DebugModeProvider } from './contexts/DebugModeContext';
import { useConnectionStatus } from './hooks/useConnectionStatus';
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

function App() {
  useConnectionStatus();

  useEffect(() => {
    const appType = (import.meta.env.NEXT_PUBLIC_APP_TYPE as string) || 'flamingo';
    document.documentElement.setAttribute('data-app-type', appType);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <DebugModeProvider>
        <ChatView />
      </DebugModeProvider>
    </QueryClientProvider>
  );
}

export default App;
