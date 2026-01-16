import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  createNatsClient,
  type NatsClient,
  type NatsSubscriptionHandle,
} from '@flamingo-stack/openframe-frontend-core/nats'
import { tokenService } from '../services/tokenService'

type SharedConnection = {
  wsUrl: string
  client: NatsClient
  connectPromise: Promise<void> | null
  refCount: number
  closeTimer: ReturnType<typeof setTimeout> | null
}

let shared: SharedConnection | null = null
const SHARED_CLOSE_DELAY_MS = 750

function buildNatsWsUrl(apiBaseUrl: string, token: string): string {
  const u = new URL('/ws/nats', apiBaseUrl)
  u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:'
  u.searchParams.set('authorization', token)
  return u.toString()
}

interface UseNatsChatSubscriptionArgs {
  enabled: boolean
  dialogId: string | null
  onChunk?: (chunk: any) => void
}

/**
 * Connects to NATS over WebSocket and subscribes to `chat.${dialogId}.message`.
 */
export function useNatsChatSubscription({ enabled, dialogId, onChunk }: UseNatsChatSubscriptionArgs) {
  const [token, setToken] = useState<string | null>(tokenService.getCurrentToken())
  const [apiBaseUrl, setApiBaseUrl] = useState<string | null>(tokenService.getCurrentApiBaseUrl())
  const [isConnected, setIsConnected] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)

  const clientRef = useRef<NatsClient | null>(null)
  const subRef = useRef<NatsSubscriptionHandle | null>(null)

  useEffect(() => {
    return tokenService.onTokenUpdate((t) => setToken(t))
  }, [])

  useEffect(() => {
    return tokenService.onApiUrlUpdate((u) => setApiBaseUrl(u))
  }, [])

  const wsUrl = useMemo(() => {
    if (!apiBaseUrl || !token) return null
    return buildNatsWsUrl(apiBaseUrl, token)
  }, [apiBaseUrl, token])

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
        user: 'machine',
        pass: '',
        name: 'openframe-chat',
        connectTimeoutMs: 20000,
        reconnect: true,
        maxReconnectAttempts: -1,
        reconnectTimeWaitMs: 1000,
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
      if (event.status === 'closed' || event.status === 'disconnected' || event.status === 'error') {
        setIsConnected(false)
      }
    })

    let closed = false
    ;(async () => {
      try {
        if (!sharedConn.connectPromise) {
          sharedConn.connectPromise = client.connect()
        }
        await sharedConn.connectPromise
        if (closed) return
        setIsConnected(client.isConnected())
      } catch (e) {
        setIsConnected(false)
        sharedConn.connectPromise = null
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

    // resubscribe on dialog change
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
        if (!onChunk) return
        try {
          const dataStr = new TextDecoder().decode(msg.data)
          const parsed = JSON.parse(dataStr)
          onChunk(parsed)
        } catch {
          // ignore malformed messages
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
  }, [enabled, isConnected, dialogId, onChunk])

  const publishMessageRequest = useCallback((dialogId: string, text: string) => {
    const client = clientRef.current
    if (!client || !client.isConnected()) {
      throw new Error('NATS is not connected')
    }
    client.publishJson(`chat.${dialogId}.message`, { type: 'MESSAGE_REQUEST', text })
  }, [])

  return { isConnected, isSubscribed, publishMessageRequest }
}
