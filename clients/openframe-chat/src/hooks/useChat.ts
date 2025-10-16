import { useState, useCallback, useRef } from 'react'
import { useSSE } from './useSSE'
import { useChatConfig } from './useChatConfig'
import { Message, MessageSegment, ToolExecutionData } from '../types/chat.types'
import faeAvatar from '../assets/fae-avatar.png'

export type { Message } from '../types/chat.types'

interface UseChatOptions {
  sseUrl?: string
  useMock?: boolean
  useApi?: boolean
  apiToken?: string
  apiBaseUrl?: string
  debugMode?: boolean
}

function isToolSegment(segment: MessageSegment): segment is { type: 'tool_execution'; data: ToolExecutionData } {
  return segment.type === 'tool_execution'
}

export function useChat({ sseUrl, useMock = false, useApi = true, apiToken, apiBaseUrl, debugMode = false }: UseChatOptions = {}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const currentAssistantSegmentsRef = useRef<MessageSegment[]>([])
  
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
  
  const updateLastAssistantMessage = useCallback((segments: MessageSegment[]) => {
    setMessages(prev => {
      const newMessages = [...prev]
      const lastMessage = newMessages[newMessages.length - 1]
      if (lastMessage && lastMessage.role === 'assistant') {
        newMessages[newMessages.length - 1] = {
          ...lastMessage,
          content: segments.length > 0 ? segments : ''
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
    currentAssistantSegmentsRef.current = []

    const assistantMessage: Message = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      name: 'Fae',
      content: [],
      timestamp: new Date(),
      avatar: faeAvatar
    }
    addMessage(assistantMessage)
    
    try {
      let receivedFirstChunk = false
      let currentTextSegment = ''
      
      for await (const segment of streamMessage(text)) {
        if (!receivedFirstChunk) {
          setIsTyping(false)
          receivedFirstChunk = true
        }
        
        if (segment.type === 'text') {
          currentTextSegment += segment.text
          const updatedSegments = [...currentAssistantSegmentsRef.current]
          
          if (updatedSegments.length > 0 && updatedSegments[updatedSegments.length - 1].type === 'text') {
            updatedSegments[updatedSegments.length - 1] = { type: 'text', text: currentTextSegment }
          } else {
            updatedSegments.push({ type: 'text', text: currentTextSegment })
          }
          
          currentAssistantSegmentsRef.current = updatedSegments
          updateLastAssistantMessage(updatedSegments)
        } else if (segment.type === 'tool_execution') {
          if (currentTextSegment) {
            const updatedSegments = [...currentAssistantSegmentsRef.current]
            
            if (updatedSegments.length > 0 && updatedSegments[updatedSegments.length - 1].type === 'text') {
              updatedSegments[updatedSegments.length - 1] = { type: 'text', text: currentTextSegment }
            } else {
              updatedSegments.push({ type: 'text', text: currentTextSegment })
            }
            
            currentAssistantSegmentsRef.current = updatedSegments
            currentTextSegment = ''
          }
          
          const existingToolIndex = currentAssistantSegmentsRef.current.findIndex(
            (s): s is { type: 'tool_execution'; data: ToolExecutionData } =>
              isToolSegment(s) &&
              s.data.type === 'EXECUTING_TOOL' &&
              s.data.integratedToolType === segment.data.integratedToolType &&
              s.data.toolFunction === segment.data.toolFunction
          )
          
          if (existingToolIndex !== -1 && segment.data.type === 'EXECUTED_TOOL') {
            const existingTool = currentAssistantSegmentsRef.current[existingToolIndex] as { type: 'tool_execution'; data: ToolExecutionData }
            currentAssistantSegmentsRef.current[existingToolIndex] = {
              ...segment,
              data: {
                ...segment.data,
                parameters: segment.data.parameters || existingTool.data.parameters
              }
            }
          } else {
            currentAssistantSegmentsRef.current.push(segment)
          }
          
          updateLastAssistantMessage([...currentAssistantSegmentsRef.current])
        }
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
      currentAssistantSegmentsRef.current = []
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