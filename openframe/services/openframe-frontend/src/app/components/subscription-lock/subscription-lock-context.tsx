'use client';

import { createContext, type ReactNode, useContext, useMemo } from 'react';
import { getLockCopy, type SubscriptionLockCopy, type SubscriptionStatus } from './subscription-status';

interface SubscriptionLockState {
  status: SubscriptionStatus;
  lockCopy: SubscriptionLockCopy | null;
  isLocked: boolean;
}

const SubscriptionLockContext = createContext<SubscriptionLockState | null>(null);

interface SubscriptionLockProviderProps {
  status: SubscriptionStatus;
  children: ReactNode;
}

export function SubscriptionLockProvider({ status, children }: SubscriptionLockProviderProps) {
  const value = useMemo<SubscriptionLockState>(() => {
    const lockCopy = getLockCopy(status);
    return { status, lockCopy, isLocked: lockCopy !== null };
  }, [status]);

  return <SubscriptionLockContext.Provider value={value}>{children}</SubscriptionLockContext.Provider>;
}

export function useSubscriptionLock(): SubscriptionLockState {
  const ctx = useContext(SubscriptionLockContext);
  if (!ctx) {
    return { status: 'ACTIVE', lockCopy: null, isLocked: false };
  }
  return ctx;
}
