import { invoke } from '@tauri-apps/api/core';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

interface DebugModeContextType {
  debugMode: boolean;
  setDebugMode: (enabled: boolean) => void;
}

const DebugModeContext = createContext<DebugModeContextType | undefined>(undefined);

export function DebugModeProvider({ children }: { children: ReactNode }) {
  const [debugMode, setDebugMode] = useState(false);

  useEffect(() => {
    const fetchDebugMode = async () => {
      try {
        const enabled = await invoke<boolean>('get_debug_mode');
        setDebugMode(enabled);
        console.log('[DebugModeContext] Debug mode initialized:', enabled);
      } catch (error) {
        console.error('[DebugModeContext] Failed to fetch debug mode:', error);
        setDebugMode(false);
      }
    };

    fetchDebugMode();
  }, []);

  return <DebugModeContext.Provider value={{ debugMode, setDebugMode }}>{children}</DebugModeContext.Provider>;
}

export function useDebugMode() {
  const context = useContext(DebugModeContext);
  if (context === undefined) {
    throw new Error('useDebugMode must be used within a DebugModeProvider');
  }
  return context;
}
