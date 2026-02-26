import './styles/globals.css';
import { useEffect } from 'react';
import { DebugModeProvider } from './contexts/DebugModeContext';
import { useConnectionStatus } from './hooks/useConnectionStatus';
import { ChatView } from './views/ChatView';

function App() {
  useConnectionStatus();

  useEffect(() => {
    const appType = (import.meta.env.NEXT_PUBLIC_APP_TYPE as string) || 'flamingo';
    document.documentElement.setAttribute('data-app-type', appType);
  }, []);

  return (
    <DebugModeProvider>
      <ChatView />
    </DebugModeProvider>
  );
}

export default App;
