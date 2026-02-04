'use client'

import { useCallback, useEffect, useState, useMemo, useRef } from 'react'
import {
  useNatsDialogSubscription,
  buildNatsWsUrl,
  type NatsMessageType,
  type ChunkData,
} from '@flamingo-stack/openframe-frontend-core'
import { useMingoChunkCatchup } from './use-mingo-chunk-catchup'
import { runtimeEnv } from '@/src/lib/runtime-config'
import { STORAGE_KEYS } from '../../tickets/constants'
import { useMingoMessagesStore } from '../stores/mingo-messages-store'

const MINGO_TOPICS: NatsMessageType[] = ['admin-message'] as const

interface UseMingoRealtimeSubscriptionOptions {
  onChunkReceived?: (dialogId: string, chunk: ChunkData, messageType: NatsMessageType) => void
}

interface DialogSubscriptionState {
  isSubscribed: boolean
  isConnected: boolean
  hasCaughtUp: boolean
}

interface UseMingoRealtimeSubscription {
  subscribeToDialog: (dialogId: string) => void
  unsubscribeFromDialog: (dialogId: string) => void
  getSubscriptionState: (dialogId: string) => DialogSubscriptionState
  subscribedDialogs: Set<string>
  connectionState: 'connected' | 'disconnected' | 'connecting'
}

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

/**
 * Unified realtime subscription hook for Mingo chat
 * Manages NATS subscriptions for multiple dialogs with multi-topic support
 */
export function useMingoRealtimeSubscription(
  activeDialogId: string | null,
  options: UseMingoRealtimeSubscriptionOptions = {}
): UseMingoRealtimeSubscription {
  const { onChunkReceived } = options
  
  const [subscribedDialogs, setSubscribedDialogs] = useState<Set<string>>(new Set())
  const [dialogStates, setDialogStates] = useState<Map<string, DialogSubscriptionState>>(new Map())
  const [connectionState, setConnectionState] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected')
  
  const onChunkReceivedRef = useRef(onChunkReceived)
  const catchupRefs = useRef<Map<string, any>>(new Map())
  
  const isDevTicketEnabled = runtimeEnv.enableDevTicketObserver()
  const [token, setToken] = useState<string | null>(
    isDevTicketEnabled ? getAccessToken() : null
  )
  
  const { 
    activeDialogId: storeActiveDialogId,
    resetUnread 
  } = useMingoMessagesStore()
  
  useEffect(() => {
    onChunkReceivedRef.current = onChunkReceived
  }, [onChunkReceived])
  
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
  
  // NATS client configuration
  const clientConfig = useMemo(() => ({
    name: 'openframe-frontend-mingo',
    user: 'machine',
    pass: '',
  }), [])
  
  const getSubscriptionState = useCallback((dialogId: string): DialogSubscriptionState => {
    return dialogStates.get(dialogId) || {
      isSubscribed: false,
      isConnected: false,
      hasCaughtUp: false
    }
  }, [dialogStates])
  
  const subscribeToDialog = useCallback((dialogId: string) => {
    if (subscribedDialogs.has(dialogId)) return
    
    setSubscribedDialogs(prev => new Set(prev).add(dialogId))
    setDialogStates(prev => {
      const newMap = new Map(prev)
      newMap.set(dialogId, {
        isSubscribed: true,
        isConnected: false,
        hasCaughtUp: false
      })
      return newMap
    })
    
    if (dialogId === activeDialogId) {
      resetUnread(dialogId)
    }
  }, [subscribedDialogs, activeDialogId, resetUnread])
  
  const unsubscribeFromDialog = useCallback((dialogId: string) => {
    setSubscribedDialogs(prev => {
      const newSet = new Set(prev)
      newSet.delete(dialogId)
      return newSet
    })
    
    setDialogStates(prev => {
      const newMap = new Map(prev)
      newMap.delete(dialogId)
      return newMap
    })
    
    catchupRefs.current.delete(dialogId)
  }, [])
  
  useEffect(() => {
    if (activeDialogId && !subscribedDialogs.has(activeDialogId)) {
      subscribeToDialog(activeDialogId)
    }
  }, [activeDialogId, subscribedDialogs, subscribeToDialog])
  
  return {
    subscribeToDialog,
    unsubscribeFromDialog,
    getSubscriptionState,
    subscribedDialogs,
    connectionState
  }
}

/**
 * Individual dialog subscription component
 * This should be rendered for each subscribed dialog
 */
interface DialogSubscriptionProps {
  dialogId: string
  isActive: boolean
  processChunk: (targetDialogId: string, chunk: ChunkData, messageType: NatsMessageType) => void
}

export function DialogSubscription({
  dialogId,
  processChunk
}: DialogSubscriptionProps) {
  const [apiBaseUrl] = useState<string | null>(getApiBaseUrl)
  const [hasCaughtUp, setHasCaughtUp] = useState(false)
  const isDevTicketEnabled = runtimeEnv.enableDevTicketObserver()
  const [token] = useState<string | null>(
    isDevTicketEnabled ? getAccessToken() : null
  )
  
  const { 
    catchUpChunks, 
    resetChunkTracking,
    startInitialBuffering,
    processChunk: coreProcessChunk
  } = useMingoChunkCatchup({
    dialogId,
    onChunkReceived: (chunk, messageType) => {
      processChunk(dialogId, chunk, messageType)
    }
  })
  
  // NATS WebSocket URL
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
  
  const clientConfig = useMemo(() => ({
    name: `openframe-frontend-mingo-${dialogId}`,
    user: 'machine',
    pass: '',
  }), [dialogId])
  
  useEffect(() => {
    resetChunkTracking()
    startInitialBuffering()
    setHasCaughtUp(false)
    
    return () => {
      resetChunkTracking()
    }
  }, [dialogId, resetChunkTracking, startInitialBuffering])

  const handleNatsEvent = useCallback((payload: unknown, messageType: NatsMessageType) => {
    coreProcessChunk(payload as ChunkData, messageType)
  }, [coreProcessChunk])
  
  const handleSubscribed = useCallback(async () => {
    if (!hasCaughtUp) {
      setHasCaughtUp(true)
      await catchUpChunks()
    }
  }, [hasCaughtUp, catchUpChunks])
  
  useNatsDialogSubscription({
    enabled: true,
    dialogId,
    topics: MINGO_TOPICS,
    onEvent: handleNatsEvent,
    onConnect: () => {},
    onDisconnect: () => {},
    onSubscribed: handleSubscribed,
    getNatsWsUrl,
    clientConfig,
  })
  
  return null
}