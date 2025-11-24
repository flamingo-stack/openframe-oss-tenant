import { useState, useEffect, useRef } from 'react'
import { tokenService } from '../services/tokenService'

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
}

const RETRY_DELAYS = [1000, 3000, 5000, 10000, 20000, 30000]
const REGULAR_CHECK_INTERVAL = 300000

export function useConnectionStatus(): UseConnectionStatusReturn {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const [serverUrl, setServerUrl] = useState<string | null>(null)
  const [aiConfiguration, setAiConfiguration] = useState<AIConfiguration | null>(null)
  const retryCountRef = useRef(0)
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isCheckingRef = useRef(false)
  const currentStatusRef = useRef<ConnectionStatus>('disconnected')
  const isInitializedRef = useRef(false)

  useEffect(() => {
    currentStatusRef.current = status
  }, [status])

  useEffect(() => {
    const checkConnection = async (isRegularCheck: boolean = false): Promise<boolean> => {
      if (isCheckingRef.current) {
        return currentStatusRef.current === 'connected'
      }
      
      isCheckingRef.current = true
      
      if (!isRegularCheck && currentStatusRef.current === 'disconnected') {
        setStatus('connecting')
      }
      
      try {
        const apiUrl =  tokenService.getCurrentApiBaseUrl()
        const token = tokenService.getCurrentToken()
        
        if (!apiUrl || !token) {
          if (currentStatusRef.current !== 'disconnected') {
            setStatus('disconnected')
          }
          return false
        }
        
        setServerUrl(apiUrl)
        
        const response = await fetch(`${apiUrl}/chat/api/v1/ai-configuration`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          signal: AbortSignal.timeout(5000)
        })
        
        if (response && response.ok) {
          const config = await response.json()
          setAiConfiguration(config)
          
          if (currentStatusRef.current !== 'connected') {
            setStatus('connected')
          }
          retryCountRef.current = 0
          return true
        } else {
          if (currentStatusRef.current !== 'disconnected') {
            setStatus('disconnected')
          }
          setAiConfiguration(null)
          return false
        }
      } catch (error) {
        if (currentStatusRef.current !== 'disconnected') {
          setStatus('disconnected')
        }
        setAiConfiguration(null)
        return false
      } finally {
        isCheckingRef.current = false
      }
    }
    
    const scheduleRetry = () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
      
      const delay = RETRY_DELAYS[Math.min(retryCountRef.current, RETRY_DELAYS.length - 1)]
      
      
      retryTimeoutRef.current = setTimeout(async () => {
        retryCountRef.current++
        const isConnected = await checkConnection()
        
        if (!isConnected) {
          scheduleRetry()
        } else {
          scheduleRegularCheck()
        }
      }, delay)
    }
    
    const scheduleRegularCheck = () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
        retryTimeoutRef.current = null
      }
      
      retryTimeoutRef.current = setTimeout(async () => {
        const isConnected = await checkConnection(true)
        
        if (isConnected) {
          scheduleRegularCheck()
        } else {
          retryCountRef.current = 0
          scheduleRetry()
        }
      }, REGULAR_CHECK_INTERVAL)
    }
    
    let mounted = true
    
    checkConnection().then(isConnected => {
      if (!mounted) return
      
      isInitializedRef.current = true
      
      if (isConnected) {
        scheduleRegularCheck()
      } else {
        scheduleRetry()
      }
    })
    
    const unsubscribeToken = tokenService.onTokenUpdate(() => {
      if (!mounted) return
      
      if (!isInitializedRef.current) {
        return
      }

      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
        retryTimeoutRef.current = null
      }
      
      checkConnection().then(isConnected => {
        if (!mounted) return
        
        if (isConnected) {
          scheduleRegularCheck()
        } else {
          retryCountRef.current = 0
          scheduleRetry()
        }
      })
    })
    
    const unsubscribeApiUrl = tokenService.onApiUrlUpdate((apiUrl) => {
      if (!mounted) return
      
      if (!isInitializedRef.current) {
        setServerUrl(apiUrl)
        return
      }
      
      setServerUrl(apiUrl)
      
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
        retryTimeoutRef.current = null
      }

      checkConnection().then(isConnected => {
        if (!mounted) return
        
        if (isConnected) {
          scheduleRegularCheck()
        } else {
          retryCountRef.current = 0
          scheduleRetry()
        }
      })
    })
    
    return () => {
      mounted = false
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
        retryTimeoutRef.current = null
      }
      unsubscribeToken()
      unsubscribeApiUrl()
    }
  }, [])
  
  const displayUrl = serverUrl?.replace(/^https?:\/\//, '') || null
  
  return { status, serverUrl: displayUrl, aiConfiguration }
}