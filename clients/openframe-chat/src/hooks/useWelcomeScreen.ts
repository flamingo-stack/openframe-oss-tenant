import { useLocalStorage } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useCallback } from 'react';

const WELCOME_COMPLETED_KEY = 'openframe-chat-welcome-completed';

export function useWelcomeScreen() {
  const [completed, setCompleted] = useLocalStorage(WELCOME_COMPLETED_KEY, false);

  const completeWelcome = useCallback(() => {
    setCompleted(true);
  }, [setCompleted]);

  return {
    showWelcome: !completed,
    completeWelcome,
  };
}
