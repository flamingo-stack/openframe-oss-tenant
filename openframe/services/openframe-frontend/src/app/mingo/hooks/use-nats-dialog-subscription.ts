'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { runtimeEnv } from '@/src/lib/runtime-config'
import { createNatsClient, type NatsClient, type NatsSubscriptionHandle } from '@flamingo-stack/openframe-frontend-core/nats'
import { STORAGE_KEYS, NETWORK_CONFIG, type NatsMessageType } from '../constants'

type SharedConnection = {
  wsUrl: string
  client: NatsClient
  connectPromise: Promise<void> | null
  refCount: number
  closeTimer: ReturnType<typeof setTimeout> | null
}

let shared: SharedConnection | null = null

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
  onEvent?: (payload: unknown, messageType: NatsMessageType) => void
  onConnect?: () => void
  onDisconnect?: () => void
}

/**
 * Connects to NATS over WebSocket and subscribes to `chat.${dialogId}.message` and `chat.${dialogId}.admin-message`.
 */
export function useNatsDialogSubscription({ enabled, dialogId, onEvent, onConnect, onDisconnect }: UseNatsDialogSubscriptionArgs) {
  const [apiBaseUrl, setApiBaseUrl] = useState<string | null>(getApiBaseUrl)
  const [isConnected, setIsConnected] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  
  const isDevTicketEnabled = runtimeEnv.enableDevTicketObserver()
  const [token, setToken] = useState<string | null>(
    isDevTicketEnabled ? getAccessToken : null
  )

  const clientRef = useRef<NatsClient | null>(null)
  const messageSubRef = useRef<NatsSubscriptionHandle | null>(null)
  const adminMessageSubRef = useRef<NatsSubscriptionHandle | null>(null)
  
  const onEventRef = useRef(onEvent)
  useEffect(() => {
    onEventRef.current = onEvent
  }, [onEvent])
  
  const onConnectRef = useRef(onConnect)
  useEffect(() => {
    onConnectRef.current = onConnect
  }, [onConnect])
  
  const onDisconnectRef = useRef(onDisconnect)
  useEffect(() => {
    onDisconnectRef.current = onDisconnect
  }, [onDisconnect])

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

  useEffect(() => {
    setApiBaseUrl(getApiBaseUrl())
  }, [])

  const wsUrl = useMemo(() => {
    if (!apiBaseUrl) return null
    
    if (isDevTicketEnabled && !token) return null
    
    return buildNatsWsUrl(apiBaseUrl)
  }, [apiBaseUrl, token, isDevTicketEnabled])

  const acquireClient = useCallback((url: string): SharedConnection => {
    if (shared?.wsUrl !== url) {
      // Close existing connection if URL changed
      if (shared) {
        shared.closeTimer && clearTimeout(shared.closeTimer)
        const old = shared
        shared = null
        void old.client.close().catch(() => {})
      }
      
      const client = createNatsClient({
        servers: url,
        name: 'openframe-frontend-mingo',
        user: 'machine',
        pass: '',
        connectTimeoutMs: NETWORK_CONFIG.CONNECT_TIMEOUT_MS,
        reconnect: true,
        maxReconnectAttempts: -1, // Unlimited reconnection attempts
        reconnectTimeWaitMs: NETWORK_CONFIG.RECONNECT_TIME_WAIT_MS,
        pingIntervalMs: NETWORK_CONFIG.PING_INTERVAL_MS,
        maxPingOut: NETWORK_CONFIG.MAX_PING_OUT,
      })
      shared = { wsUrl: url, client, connectPromise: null, refCount: 0, closeTimer: null }
    }

    shared.refCount += 1
    shared.closeTimer && clearTimeout(shared.closeTimer)
    shared.closeTimer = null
    return shared
  }, [])

  const releaseClient = useCallback((url: string) => {
    if (!shared || shared.wsUrl !== url) return
    
    shared.refCount = Math.max(0, shared.refCount - 1)
    if (shared.refCount > 0) return

    shared.closeTimer = setTimeout(() => {
      const s = shared
      shared = null
      s && void s.client.close().catch(() => {})
    }, NETWORK_CONFIG.SHARED_CLOSE_DELAY_MS)
  }, [])

  useEffect(() => {
    if (!enabled || !wsUrl) return

    const sharedConn = acquireClient(wsUrl)
    const client = sharedConn.client

    clientRef.current = client
    setIsConnected(false)
    
    let hasConnected = false

    const unsubscribeStatus = client.onStatus((event) => {
      const connected = event.status === 'connected'
      const disconnected = ['closed', 'disconnected', 'error'].includes(event.status)
      if (connected) {
        setIsConnected(true)
        if (!hasConnected) {
          hasConnected = true
          onConnectRef.current?.()
        }
      }
      if (disconnected) {
        setIsConnected(false)
        hasConnected = false
        onDisconnectRef.current?.()
      }
    })

    let closed = false
    ;(async () => {
      try {
        sharedConn.connectPromise ||= client.connect()
        await sharedConn.connectPromise
        if (!closed) {
          setIsConnected(true)
        }
      } catch (e) {
        sharedConn.connectPromise = null
        setIsConnected(false)
        onDisconnectRef.current?.()
        await client.close().catch(() => {})
      }
    })()

    return () => {
      closed = true
      setIsConnected(false)
      unsubscribeStatus()
      
      messageSubRef.current?.unsubscribe()
      adminMessageSubRef.current?.unsubscribe()
      messageSubRef.current = null
      adminMessageSubRef.current = null
      
      clientRef.current && releaseClient(wsUrl)
      clientRef.current = null
    }
  }, [enabled, wsUrl, acquireClient, releaseClient])

  useEffect(() => {
    if (!enabled || !isConnected || !dialogId) return
    const client = clientRef.current
    if (!client) return

    setIsSubscribed(false)

    messageSubRef.current?.unsubscribe()
    adminMessageSubRef.current?.unsubscribe()
    messageSubRef.current = null
    adminMessageSubRef.current = null

    const abort = new AbortController()
    const decoder = new TextDecoder()
    
    const handleMessage = (messageType: NatsMessageType) => async (msg: any) => {
      if (!onEventRef.current) return
      try {
        const dataStr = decoder.decode(msg.data)
        const parsed = JSON.parse(dataStr)
        onEventRef.current(parsed, messageType)
      } catch {
        // Ignore parse errors
      }
    }
    
    messageSubRef.current = client.subscribeBytes(
      `chat.${dialogId}.message`,
      handleMessage('message' as NatsMessageType),
      { signal: abort.signal }
    )
    
    adminMessageSubRef.current = client.subscribeBytes(
      `chat.${dialogId}.admin-message`,
      handleMessage('admin-message' as NatsMessageType),
      { signal: abort.signal }
    )
    
    setIsSubscribed(true)

    return () => {
      setIsSubscribed(false)
      abort.abort()
      messageSubRef.current?.unsubscribe()
      adminMessageSubRef.current?.unsubscribe()
      messageSubRef.current = null
      adminMessageSubRef.current = null
    }
  }, [enabled, isConnected, dialogId])

  return { isConnected, isSubscribed }
}
