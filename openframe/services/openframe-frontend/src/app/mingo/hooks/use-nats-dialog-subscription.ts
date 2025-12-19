'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { runtimeEnv } from '@/src/lib/runtime-config'
import { createNatsClient, type NatsClient, type NatsSubscriptionHandle } from '@flamingo-stack/openframe-frontend-core/nats'

const ACCESS_TOKEN_KEY = 'of_access_token'

type SharedConnection = {
  wsUrl: string
  client: NatsClient
  connectPromise: Promise<void> | null
  refCount: number
  closeTimer: ReturnType<typeof setTimeout> | null
}

let shared: SharedConnection | null = null
const SHARED_CLOSE_DELAY_MS = 750

function getApiBaseUrl(): string | null {
  const envBase = runtimeEnv.tenantHostUrl()
  if (envBase) return envBase
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin
  return null
}

function getAccessToken(): string | null {
  try {
    return typeof window !== 'undefined' ? (localStorage.getItem(ACCESS_TOKEN_KEY) || null) : null
  } catch {
    return null
  }
}

function buildNatsWsUrl(apiBaseUrl: string): string {
  const u = new URL('/ws/nats', apiBaseUrl)
  u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:'

  const isDevTicketEnabled = runtimeEnv.enableDevTicketObserver()
  if (isDevTicketEnabled) {
    const token = getAccessToken()
    if (token) {
      u.searchParams.set('authorization', token)
    }
  }
  
  return u.toString()
}

interface UseNatsDialogSubscriptionArgs {
  enabled: boolean
  dialogId: string | null
  onEvent?: (payload: unknown) => void
}

/**
 * Connects to NATS over WebSocket and subscribes to `chat.${dialogId}.message`.
 */
export function useNatsDialogSubscription({ enabled, dialogId, onEvent }: UseNatsDialogSubscriptionArgs) {
  const [apiBaseUrl, setApiBaseUrl] = useState<string | null>(getApiBaseUrl())
  const [isConnected, setIsConnected] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  
  const isDevTicketEnabled = runtimeEnv.enableDevTicketObserver()
  const [token, setToken] = useState<string | null>(() => 
    isDevTicketEnabled ? getAccessToken() : null
  )

  const clientRef = useRef<NatsClient | null>(null)
  const subRef = useRef<NatsSubscriptionHandle | null>(null)

  useEffect(() => {
    if (!isDevTicketEnabled) return
    
    const handler = (e: StorageEvent) => {
      if (e.key === ACCESS_TOKEN_KEY) {
        setToken(getAccessToken())
      }
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [isDevTicketEnabled])

  useEffect(() => {
    setApiBaseUrl(getApiBaseUrl())
  }, [])

  const wsUrl = useMemo(() => {
    if (!apiBaseUrl) return null
    
    if (isDevTicketEnabled && !token) return null
    
    return buildNatsWsUrl(apiBaseUrl)
  }, [apiBaseUrl, token, isDevTicketEnabled])

  const acquireClient = useCallback((url: string): SharedConnection => {
    if (shared && shared.wsUrl !== url) {
      try {
        shared.closeTimer && clearTimeout(shared.closeTimer)
      } catch {
        // ignore
      }
      const old = shared
      shared = null
      void old.client.close().catch(() => {})
    }

    if (!shared) {
      const client = createNatsClient({
        servers: url,
        name: 'openframe-frontend-mingo',
        user: 'machine',
        pass: '',
        connectTimeoutMs: 5_000,
        reconnect: true,
        maxReconnectAttempts: 10,
        pingIntervalMs: 20_000,
        maxPingOut: 2,
      })
      shared = { wsUrl: url, client, connectPromise: null, refCount: 0, closeTimer: null }
    }

    shared.refCount += 1
    if (shared.closeTimer) {
      clearTimeout(shared.closeTimer)
      shared.closeTimer = null
    }
    return shared
  }, [])

  const releaseClient = useCallback((url: string) => {
    if (!shared || shared.wsUrl !== url) return
    shared.refCount = Math.max(0, shared.refCount - 1)
    if (shared.refCount > 0) return

    shared.closeTimer = setTimeout(() => {
      const s = shared
      shared = null
      if (!s) return
      void s.client.close().catch(() => {})
    }, SHARED_CLOSE_DELAY_MS)
  }, [])

  useEffect(() => {
    if (!enabled || !wsUrl) return

    const sharedConn = acquireClient(wsUrl)
    const client = sharedConn.client

    clientRef.current = client
    setIsConnected(false)

    const unsubscribeStatus = client.onStatus((event) => {
      if (event.status === 'connected') setIsConnected(true)
      if (event.status === 'closed' || event.status === 'disconnected' || event.status === 'error') setIsConnected(false)
    })

    let closed = false
    ;(async () => {
      try {
        if (!sharedConn.connectPromise) {
          sharedConn.connectPromise = client.connect()
        }
        await sharedConn.connectPromise
        if (closed) return
        setIsConnected(true)
      } catch (e) {
        sharedConn.connectPromise = null
        
        setIsConnected(false)
        try {
          await client.close()
        } catch {
          // ignore
        }
      }
    })().catch(() => {
      // ignore
    })

    return () => {
      closed = true
      setIsConnected(false)
      try {
        unsubscribeStatus()
      } catch {
        // ignore
      }

      try {
        subRef.current?.unsubscribe()
      } catch {
        // ignore
      } finally {
        subRef.current = null
      }

      const c = clientRef.current
      clientRef.current = null
      if (c) {
        releaseClient(wsUrl)
      }
    }
  }, [enabled, wsUrl, acquireClient, releaseClient])

  useEffect(() => {
    if (!enabled || !isConnected || !dialogId) return
    const client = clientRef.current
    if (!client) return

    setIsSubscribed(false)

    try {
      subRef.current?.unsubscribe()
    } catch {
      // ignore
    } finally {
      subRef.current = null
    }

    const abort = new AbortController()
    subRef.current = client.subscribeBytes(
      `chat.${dialogId}.message`,
      async (msg) => {
        if (!onEvent) return
        try {
          const dataStr = new TextDecoder().decode(msg.data)
          const parsed = JSON.parse(dataStr)
          onEvent(parsed)
        } catch {
          // ignore
        }
      },
      { signal: abort.signal },
    )
    setIsSubscribed(true)

    return () => {
      setIsSubscribed(false)
      try {
        abort.abort()
      } catch {
        // ignore
      }
      try {
        subRef.current?.unsubscribe()
      } catch {
        // ignore
      } finally {
        subRef.current = null
      }
    }
  }, [enabled, isConnected, dialogId, onEvent])

  return { isConnected, isSubscribed }
}
