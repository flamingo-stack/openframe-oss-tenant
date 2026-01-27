'use client'

import { useEffect, useCallback, useRef, useState, useMemo } from 'react'
import {
  useNatsDialogSubscription as useNatsDialogSubscriptionCore,
  buildNatsWsUrl,
  type NatsMessageType,
  type ChunkData,
} from '@flamingo-stack/openframe-frontend-core'
import { runtimeEnv } from '@/src/lib/runtime-config'
import { STORAGE_KEYS } from '../../tickets/constants'
import { useChunkCatchup } from '../hooks/use-chunk-catchup'

const ADMIN_TOPICS: NatsMessageType[] = ['admin-message'] as const

interface DialogNatsSubscriptionProps {
  dialogId: string
  isActive: boolean
  onChunkReceived: (dialogId: string, chunk: ChunkData, messageType: NatsMessageType) => void
  onSubscribed?: (dialogId: string) => void
  onConnected?: () => void
  onDisconnected?: () => void
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

export function DialogNatsSubscription({
  dialogId,
  onChunkReceived,
  onSubscribed,
  onConnected,
  onDisconnected,
}: DialogNatsSubscriptionProps) {
  const [apiBaseUrl, setApiBaseUrl] = useState<string | null>(getApiBaseUrl)
  const isDevTicketEnabled = runtimeEnv.enableDevTicketObserver()
  const [token, setToken] = useState<string | null>(
    isDevTicketEnabled ? getAccessToken() : null
  )
  const hasCaughtUpRef = useRef(false)

  const { 
    catchUpChunks, 
    processChunk, 
    resetChunkTracking,
    startInitialBuffering
  } = useChunkCatchup({
    dialogId,
    onChunkReceived: (chunk, messageType) => {
      onChunkReceived(dialogId, chunk, messageType)
    }
  })

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
    name: 'openframe-frontend-mingo',
    user: 'machine',
    pass: '',
  }), [])

  const handleNatsEvent = useCallback((payload: unknown, messageType: NatsMessageType) => {
    const processed = processChunk(payload as ChunkData, messageType as 'message' | 'admin-message')
    if (!processed) return
  }, [processChunk])

  const handleSubscribed = useCallback(async () => {
    if (!hasCaughtUpRef.current && dialogId) {
      hasCaughtUpRef.current = true
      await catchUpChunks()
    }
    
    if (onSubscribed) {
      onSubscribed(dialogId)
    }
  }, [dialogId, onSubscribed, catchUpChunks])

  useNatsDialogSubscriptionCore({
    enabled: true,
    dialogId,
    topics: ADMIN_TOPICS,
    onEvent: handleNatsEvent,
    onConnect: () => {
      if (onConnected) onConnected()
    },
    onDisconnect: () => {
      if (onDisconnected) onDisconnected()
    },
    onSubscribed: handleSubscribed,
    getNatsWsUrl,
    clientConfig,
  })

  useEffect(() => {
    if (!dialogId) return
    
    resetChunkTracking()
    startInitialBuffering()
    hasCaughtUpRef.current = false
    
    return () => {
      resetChunkTracking()
      hasCaughtUpRef.current = false
    }
  }, [dialogId, resetChunkTracking, startInitialBuffering])

  return null
}
