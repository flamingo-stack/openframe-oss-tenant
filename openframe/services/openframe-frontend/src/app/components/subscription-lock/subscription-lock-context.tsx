'use client';

import { createContext, type ReactNode, useContext, useMemo } from 'react';
import { getLockCopy, type SubscriptionLockCopy, type SubscriptionStatus } from './subscription-status';

interface SubscriptionLockState {
  status: SubscriptionStatus;
  copy: SubscriptionLockCopy | null;
  isLocked: boolean;
}

const SubscriptionLockContext = createContext<SubscriptionLockState | null>(null);

interface SubscriptionLockProviderProps {
  status: SubscriptionStatus;
  children: ReactNode;
}

export function SubscriptionLockProvider({ status, children }: SubscriptionLockProviderProps) {
  const value = useMemo<SubscriptionLockState>(() => {
    const copy = getLockCopy(status);
    return { status, copy, isLocked: copy !== null };
  }, [status]);

  return <SubscriptionLockContext.Provider value={value}>{children}</SubscriptionLockContext.Provider>;
}

export function useSubscriptionLock(): SubscriptionLockState {
  const ctx = useContext(SubscriptionLockContext);
  if (!ctx) {
    return { status: 'ACTIVE', copy: null, isLocked: false };
  }
  return ctx;
}
