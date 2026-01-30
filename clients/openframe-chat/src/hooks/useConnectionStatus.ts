import { useState, useEffect, useMemo } from 'react'
import { tokenService } from '../services/tokenService'
import { supportedModelsService } from '../services/supportedModelsService'
import { useNatsDialogSubscription, buildNatsWsUrl } from '@flamingo-stack/openframe-frontend-core'

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting'

export interface AIConfiguration {
  id: string
  provider: string
  modelName: string
  isActive: boolean
  hasApiKey: boolean
  createdAt: string
  updatedAt: string
}

interface UseConnectionStatusReturn {
  status: ConnectionStatus
  serverUrl: string | null
  aiConfiguration: AIConfiguration | null
  isFullyLoaded: boolean
}

export function useConnectionStatus(): UseConnectionStatusReturn {
  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  const [serverUrl, setServerUrl] = useState<string | null>(null)
  const [aiConfiguration, setAiConfiguration] = useState<AIConfiguration | null>(null)
  const [isFullyLoaded, setIsFullyLoaded] = useState(false)
  
  const [apiBaseUrl, setApiBaseUrl] = useState(tokenService.getCurrentApiBaseUrl())
  const [token, setToken] = useState(tokenService.getCurrentToken())
  
  useEffect(() => {
    const initializeCredentials = async () => {
      try {
        if (!apiBaseUrl) {
          await tokenService.initApiUrl()
          setApiBaseUrl(tokenService.getCurrentApiBaseUrl())
        }
        
        if (!token) {
          await tokenService.requestToken()
          setToken(tokenService.getCurrentToken())
        }
      } catch (error) {
        console.error('Failed to initialize credentials:', error)
      }
    }
    
    initializeCredentials()
  }, [apiBaseUrl, token])
  
  useEffect(() => {
    const unsubscribeToken = tokenService.onTokenUpdate(setToken)
    const unsubscribeApiUrl = tokenService.onApiUrlUpdate(setApiBaseUrl)
    
    return () => {
      unsubscribeToken()
      unsubscribeApiUrl()
    }
  }, [])
  
  useEffect(() => {
    if (apiBaseUrl) {
      setServerUrl(apiBaseUrl.replace(/^https?:\/\//, ''))
    }
  }, [apiBaseUrl])

  useEffect(() => {
    const loadAiConfiguration = async () => {
      try {
        const currentApiBaseUrl = tokenService.getCurrentApiBaseUrl()
        const currentToken = tokenService.getCurrentToken()
        
        if (!currentApiBaseUrl || !currentToken) {
          return
        }
        
        const response = await fetch(`${currentApiBaseUrl}/chat/api/v1/ai-configuration`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${currentToken}`
          },
          signal: AbortSignal.timeout(5000)
        })
        
        if (response && response.ok) {
          const config = await response.json()
          setAiConfiguration(config)
          
          await supportedModelsService.loadSupportedModels()
          setIsFullyLoaded(true)
        }
      } catch (error) {
        console.error('Failed to load AI configuration:', error)
      }
    }
    
    loadAiConfiguration()
  }, [apiBaseUrl, token])

  const getNatsWsUrl = useMemo(() => {
    return (): string => {
      if (!apiBaseUrl || !token) return ''
      return buildNatsWsUrl(apiBaseUrl, { token, includeAuthParam: true })
    }
  }, [apiBaseUrl, token])

  const clientConfig = useMemo(() => ({
    name: 'openframe-chat-status',
    user: 'machine',
    pass: ''
  }), [])

  const { isConnected } = useNatsDialogSubscription({
    enabled: !!apiBaseUrl && !!token,
    dialogId: null, // No dialog subscription, just connection monitoring
    topics: [],
    onConnect: () => {
      setStatus('connected')
    },
    onDisconnect: () => {
      setStatus('disconnected')
    },
    getNatsWsUrl,
    clientConfig
  })

  useEffect(() => {
    if (!apiBaseUrl || !token) {
      setStatus('connecting')
      return
    }
    
    if (isConnected) {
      setStatus('connected')
    } else {
      setStatus('disconnected')
    }
  }, [isConnected, apiBaseUrl, token])
  
  const displayUrl = serverUrl?.replace(/^https?:\/\//, '') || null
  
  return { status, serverUrl: displayUrl, aiConfiguration, isFullyLoaded }
}