import { useState, useCallback, useRef } from 'react'
import { useSSE } from './useSSE'
import { useChatConfig } from './useChatConfig'
import faeAvatar from '../assets/fae-avatar.png'

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'error'
  name?: string
  content: string
  timestamp: Date
  avatar?: string
}

interface UseChatOptions {
  sseUrl?: string
  useMock?: boolean
  useApi?: boolean
  apiToken?: string
  apiBaseUrl?: string
  debugMode?: boolean
}

export function useChat({ sseUrl, useMock = false, useApi = true, apiToken, apiBaseUrl, debugMode = false }: UseChatOptions = {}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const currentAssistantMessageRef = useRef<string>('')
  
  const { streamMessage, isStreaming, error: sseError, reset } = useSSE({ 
    url: sseUrl, 
    useMock, 
    useApi,
    apiToken,
    apiBaseUrl,
    debugMode
  })
  const { quickActions } = useChatConfig()
  
  const addMessage = useCallback((message: Message) => {
    setMessages(prev => [...prev, message])
  }, [])
  
  const updateLastAssistantMessage = useCallback((content: string) => {
    setMessages(prev => {
      const newMessages = [...prev]
      const lastMessage = newMessages[newMessages.length - 1]
      if (lastMessage && lastMessage.role === 'assistant') {
        newMessages[newMessages.length - 1] = {
          ...lastMessage,
          content
        }
      }
      return newMessages
    })
  }, [])
  
  const sendMessage = useCallback(async (text: string) => {
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      name: 'You',
      content: text,
      timestamp: new Date()
    }
    addMessage(userMessage)
    
    setIsTyping(true)
    currentAssistantMessageRef.current = ''

    const assistantMessage: Message = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      name: 'Fae',
      content: '',
      timestamp: new Date(),
      avatar: faeAvatar
    }
    addMessage(assistantMessage)
    
    try {
      let receivedFirstChunk = false
      for await (const chunk of streamMessage(text)) {
        if (!receivedFirstChunk) {
          setIsTyping(false)
          receivedFirstChunk = true
        }
        currentAssistantMessageRef.current += chunk
        updateLastAssistantMessage(`${currentAssistantMessageRef.current}`)
      }
    } catch (err) {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'error',
        content: err instanceof Error ? err.message : 'An error occurred while processing your request.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev.slice(0, -1), errorMessage])
    } finally {
      setIsTyping(false)
      currentAssistantMessageRef.current = ''
    }
  }, [streamMessage, addMessage, updateLastAssistantMessage])
  
  const handleQuickAction = useCallback((actionText: string) => {
    sendMessage(actionText)
  }, [sendMessage])
  
  const clearMessages = useCallback(() => {
    setMessages([])
    setIsTyping(false)
    reset()
  }, [reset])
  
  return {
    messages,
    isTyping,
    isStreaming,
    error: sseError,
    sendMessage,
    handleQuickAction,
    clearMessages,
    quickActions,
    hasMessages: messages.length > 0
  }
}