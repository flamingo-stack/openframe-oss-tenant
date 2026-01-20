'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  useNatsDialogSubscription as useNatsDialogSubscriptionCore,
  buildNatsWsUrl,
  type NatsMessageType,
  type UseNatsDialogSubscriptionReturn,
} from '@flamingo-stack/openframe-frontend-core'
import { runtimeEnv } from '@/src/lib/runtime-config'
import { STORAGE_KEYS } from '../constants'

// Stable topics arrays to prevent re-subscriptions
const ADMIN_TOPICS: NatsMessageType[] = ['message', 'admin-message'] as const

// Re-export types for backward compatibility
export type { NatsMessageType, UseNatsDialogSubscriptionReturn }

function getApiBaseUrl(): string | null {
  const envBase = runtimeEnv.tenantHostUrl()
  if (envBase) return envBase
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin
  return null
}

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) || null
  } catch {
    return null
  }
}

interface UseNatsDialogSubscriptionArgs {
  enabled: boolean
  dialogId: string | null
  onEvent?: (payload: unknown, messageType: NatsMessageType) => void
  onConnect?: () => void
  onDisconnect?: () => void
  onSubscribed?: () => void
}

/**
 * Application-specific wrapper around the core useNatsDialogSubscription hook.
 * Subscribes to both 'message' and 'admin-message' topics for admin functionality.
 */
export function useNatsDialogSubscription({
  enabled,
  dialogId,
  onEvent,
  onConnect,
  onDisconnect,
  onSubscribed,
}: UseNatsDialogSubscriptionArgs): UseNatsDialogSubscriptionReturn {
  const [apiBaseUrl, setApiBaseUrl] = useState<string | null>(getApiBaseUrl)
  const isDevTicketEnabled = runtimeEnv.enableDevTicketObserver()
  const [token, setToken] = useState<string | null>(
    isDevTicketEnabled ? getAccessToken() : null
  )

  // Listen for token changes in localStorage
  useEffect(() => {
    if (!isDevTicketEnabled) return
    
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.ACCESS_TOKEN) {
        setToken(getAccessToken())
      }
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [isDevTicketEnabled])

  // Set API base URL on mount
  useEffect(() => {
    setApiBaseUrl(getApiBaseUrl())
  }, [])

  /**
   * Get the NATS WebSocket URL - memoized to prevent unnecessary re-renders
   */
  const getNatsWsUrl = useMemo(() => {
    return (): string | null => {
      if (!apiBaseUrl) return null
      
      if (isDevTicketEnabled && !token) return null
      
      return buildNatsWsUrl(apiBaseUrl, {
        token: token || undefined,
        includeAuthParam: isDevTicketEnabled,
      })
    }
  }, [apiBaseUrl, token, isDevTicketEnabled])

  // Client configuration
  const clientConfig = useMemo(() => ({
    name: 'openframe-frontend-mingo',
    user: 'machine',
    pass: '',
  }), [])

  return useNatsDialogSubscriptionCore({
    enabled,
    dialogId,
    topics: ADMIN_TOPICS, // Use stable array reference
    onEvent,
    onConnect,
    onDisconnect,
    onSubscribed,
    getNatsWsUrl,
    clientConfig,
  })
}
