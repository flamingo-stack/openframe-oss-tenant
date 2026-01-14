import { useState, useCallback, useEffect, useRef } from 'react'
import { useChatConfig } from './useChatConfig'
import { Message, MessageSegment, ToolExecutionData } from '../types/chat.types'
import faeAvatar from '../assets/fae-avatar.png'
import { useDebugMode } from '../contexts/DebugModeContext'
import { useNatsChatSubscription } from './useNatsChatSubscription'
import { tokenService } from '../services/tokenService'
import { ChatApiService } from '../services/chatApiService'

export type { Message } from '../types/chat.types'

interface UseChatOptions {
  useMock?: boolean
  useApi?: boolean
  apiToken?: string
  apiBaseUrl?: string
  useNats?: boolean
  onMetadataUpdate?: (metadata: { modelName: string; providerName: string; contextWindow: number }) => void
}

function isToolSegment(segment: MessageSegment): segment is { type: 'tool_execution'; data: ToolExecutionData } {
  return segment.type === 'tool_execution'
}

export function useChat({ useApi = true, useNats = false, onMetadataUpdate }: UseChatOptions = {}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [natsStreaming, setNatsStreaming] = useState(false)
  const [natsDialogId, setNatsDialogId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [approvalStatuses, setApprovalStatuses] = useState<Record<string, 'pending' | 'approved' | 'rejected'>>({})
  const [pendingApprovalRequests, setPendingApprovalRequests] = useState<Record<string, { command: string; explanation?: string; approvalType: string }>>({})
  const [awaitingTechnicianResponse, setAwaitingTechnicianResponse] = useState(false)
  const currentAssistantSegmentsRef = useRef<MessageSegment[]>([])
  const currentTextSegmentRef = useRef('')
  const natsDoneResolverRef = useRef<null | (() => void)>(null)
  const natsSubscribedRef = useRef(false)
  const natsDialogIdRef = useRef<string | null>(null)
  const { debugMode } = useDebugMode()

  const { quickActions } = useChatConfig()

  const apiServiceRef = useRef<ChatApiService | null>(null)
  if (!apiServiceRef.current) {
    apiServiceRef.current = new ChatApiService(debugMode)
    if (useApi) {
      Promise.all([tokenService.requestToken().catch(() => null), tokenService.initApiUrl().catch(() => null)]).catch(() => null)
    }
  }

  useEffect(() => {
    apiServiceRef.current?.setDebugMode(debugMode)
  }, [debugMode])

  useEffect(() => {
    natsDialogIdRef.current = natsDialogId
  }, [natsDialogId])
  
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

  const ensureAssistantMessage = useCallback(() => {
    setMessages(prev => {
      const last = prev[prev.length - 1]
      if (last && last.role === 'assistant') return prev

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        name: 'Fae',
        content: [],
        timestamp: new Date(),
        avatar: faeAvatar
      }
      return [...prev, assistantMessage]
    })
  }, [])

  const applyTextDelta = useCallback((text: string) => {
    setIsTyping(false)

    const updatedSegments = [...currentAssistantSegmentsRef.current]
    const lastSegment = updatedSegments[updatedSegments.length - 1]
    
    if (lastSegment && lastSegment.type === 'text') {
      currentTextSegmentRef.current += text
      updatedSegments[updatedSegments.length - 1] = { type: 'text', text: currentTextSegmentRef.current }
    } else {
      currentTextSegmentRef.current = text
      updatedSegments.push({ type: 'text', text: currentTextSegmentRef.current })
    }

    currentAssistantSegmentsRef.current = updatedSegments
    updateLastAssistantMessage(updatedSegments)
  }, [updateLastAssistantMessage])

  const applyToolSegment = useCallback((segment: MessageSegment) => {
    setIsTyping(false)
    const updatedSegments = [...currentAssistantSegmentsRef.current]

    // EXECUTING_TOOL -> EXECUTED_TOOL replacement
    if (segment.type === 'tool_execution') {
      const existingToolIndex = updatedSegments.findIndex(
        (s): s is { type: 'tool_execution'; data: ToolExecutionData } =>
          isToolSegment(s) &&
          s.data.type === 'EXECUTING_TOOL' &&
          s.data.integratedToolType === segment.data.integratedToolType &&
          s.data.toolFunction === segment.data.toolFunction
      )

      if (existingToolIndex !== -1 && segment.data.type === 'EXECUTED_TOOL') {
        const existingTool = updatedSegments[existingToolIndex] as { type: 'tool_execution'; data: ToolExecutionData }
        updatedSegments[existingToolIndex] = {
          ...segment,
          data: {
            ...segment.data,
            parameters: segment.data.parameters || existingTool.data.parameters
          }
        }
      } else {
        updatedSegments.push(segment)
      }
    }

    currentAssistantSegmentsRef.current = updatedSegments
    updateLastAssistantMessage(updatedSegments)
  }, [updateLastAssistantMessage])

  const handleApproveRequest = useCallback(async (requestId?: string) => {
    if (!requestId) return
    
    const serverUrl = tokenService.getCurrentApiBaseUrl()
    const token = tokenService.getCurrentToken()
    
    try {
      const response = await fetch(`${serverUrl}/chat/api/v1/approval-requests/${requestId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ approve: true })
      })
      
      if (response.ok) {
        setApprovalStatuses(prev => ({ ...prev, [requestId]: 'approved' }))
        updateApprovalStatus(requestId, 'approved')
      }
    } catch (error) {
      console.error('Error approving request:', error)
    }
  }, [])
  
  const handleRejectRequest = useCallback(async (requestId?: string) => {
    if (!requestId) return
    
    const serverUrl = tokenService.getCurrentApiBaseUrl()
    const token = tokenService.getCurrentToken()
    
    try {
      const response = await fetch(`${serverUrl}/chat/api/v1/approval-requests/${requestId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ approve: false })
      })
      
      if (response.ok) {
        setApprovalStatuses(prev => ({ ...prev, [requestId]: 'rejected' }))
        updateApprovalStatus(requestId, 'rejected')
      }
    } catch (error) {
      console.error('Error rejecting request:', error)
    }
  }, [])
  
  const updateApprovalStatus = useCallback((requestId: string, status: 'approved' | 'rejected') => {
    setMessages(prev => {
      return prev.map(message => {
        if (message.role === 'assistant' && Array.isArray(message.content)) {
          const updatedContent = message.content.map(segment => {
            if (segment.type === 'approval_request' && segment.data.requestId === requestId) {
              return { 
                ...segment, 
                status,
                onApprove: handleApproveRequest,
                onReject: handleRejectRequest
              }
            }
            return segment
          })
          return { ...message, content: updatedContent }
        }
        return message
      })
    })
    
    const updatedCurrentSegments = currentAssistantSegmentsRef.current.map(segment => {
      if (segment.type === 'approval_request' && segment.data.requestId === requestId) {
        return { 
          ...segment, 
          status,
          onApprove: handleApproveRequest,
          onReject: handleRejectRequest
        }
      }
      return segment
    })
    
    if (JSON.stringify(updatedCurrentSegments) !== JSON.stringify(currentAssistantSegmentsRef.current)) {
      currentAssistantSegmentsRef.current = updatedCurrentSegments
      updateLastAssistantMessage(updatedCurrentSegments)
    }
  }, [handleApproveRequest, handleRejectRequest, updateLastAssistantMessage])
  
  const handleNatsChunk = useCallback((chunk: any) => {
    if (!chunk || typeof chunk !== 'object') return
    const type = String(chunk.type || '')

    if ((type === 'AI_METADATA') && onMetadataUpdate) {
      const providerName = chunk.providerName || chunk.provider
      if (typeof chunk.modelName === 'string' && typeof providerName === 'string') {
        onMetadataUpdate({
          modelName: chunk.modelName,
          providerName,
          contextWindow: typeof chunk.contextWindow === 'number' ? chunk.contextWindow : 0,
        })
      }
      return
    }

    if (type === 'MESSAGE_START') {
      ensureAssistantMessage()
      currentTextSegmentRef.current = ''
      currentAssistantSegmentsRef.current = []
      updateLastAssistantMessage([])
      setNatsStreaming(true)
      return
    }

    if (type === 'MESSAGE_END') {
      setNatsStreaming(false)
      const resolve = natsDoneResolverRef.current
      natsDoneResolverRef.current = null
      if (resolve) resolve()
      return
    }

    if (type === 'TEXT' && typeof chunk.text === 'string') {
      ensureAssistantMessage()
      setNatsStreaming(true)
      applyTextDelta(chunk.text)
      return
    }

    if (type === 'EXECUTING_TOOL' || type === 'EXECUTED_TOOL') {
      ensureAssistantMessage()
      setNatsStreaming(true)
      applyToolSegment({
        type: 'tool_execution',
        data: {
          type,
          integratedToolType: chunk.integratedToolType || '',
          toolFunction: chunk.toolFunction || '',
          parameters: chunk.parameters,
          result: chunk.result,
          success: chunk.success
        }
      })
      return
    }

    if (type === 'APPROVAL_REQUEST') {
      ensureAssistantMessage()
      setNatsStreaming(true)
      
      const requestId = chunk.approvalRequestId || ''
      const approvalType = chunk.approvalType || 'USER'
      const command = chunk.command || ''
      const explanation = chunk.explanation || undefined
      
      // Only show CLIENT approval requests, others show as escalated
      if (approvalType === 'CLIENT') {
        const approvalSegment: MessageSegment = {
          type: 'approval_request',
          data: {
            command: command,
            explanation: explanation,
            requestId: requestId,
            approvalType: approvalType
          },
          status: (approvalStatuses[requestId] || 'pending') as 'pending' | 'approved' | 'rejected',
          onApprove: handleApproveRequest,
          onReject: handleRejectRequest
        }
        
        const updatedSegments = [...currentAssistantSegmentsRef.current, approvalSegment]
        currentAssistantSegmentsRef.current = updatedSegments
        updateLastAssistantMessage(updatedSegments)
      } else {
        setPendingApprovalRequests(prev => ({
          ...prev,
          [requestId]: { command, explanation, approvalType }
        }))
        setAwaitingTechnicianResponse(true)
      }
      return
    }

    if (type === 'APPROVAL_RESULT') {
      const requestId = chunk.approvalRequestId || ''
      const approved = chunk.approved === true
      const approvalType = chunk.approvalType || 'CLIENT'
      
      const newStatus = approved ? 'approved' : 'rejected'
      setApprovalStatuses(prev => ({ ...prev, [requestId]: newStatus }))
      
      const pendingRequest = pendingApprovalRequests[requestId]
      
      if (pendingRequest && pendingRequest.approvalType !== 'CLIENT') {
        setAwaitingTechnicianResponse(false)
        
        const approvalSegment: MessageSegment = {
          type: 'approval_request',
          data: {
            command: pendingRequest.command,
            explanation: pendingRequest.explanation,
            requestId: requestId,
            approvalType: pendingRequest.approvalType
          },
          status: newStatus,
          onApprove: handleApproveRequest,
          onReject: handleRejectRequest
        }
        
        const updatedSegments = [...currentAssistantSegmentsRef.current, approvalSegment]
        currentAssistantSegmentsRef.current = updatedSegments
        updateLastAssistantMessage(updatedSegments)

        setPendingApprovalRequests(prev => {
          const { [requestId]: _, ...rest } = prev;
          return rest
        })
      } else if (approvalType === 'CLIENT') {
        updateApprovalStatus(requestId, newStatus)
      }
      
      return
    }
    
    if (type === 'ERROR') {
      setNatsStreaming(false)
      setIsTyping(false)
      const resolve = natsDoneResolverRef.current
      natsDoneResolverRef.current = null
      if (resolve) resolve()

      const errorText = chunk.error || 'An error occurred'
      
      setMessages(prev => {
        const newMessages = [...prev]
        const lastMessage = newMessages[newMessages.length - 1]
        
        if (lastMessage && 
            lastMessage.role === 'assistant' && 
            (lastMessage.content === '' || 
             (Array.isArray(lastMessage.content) && lastMessage.content.length === 0))) {
          newMessages[newMessages.length - 1] = {
            id: `error-${Date.now()}`,
            role: 'error',
            name: 'Fae',
            timestamp: new Date(),
            avatar: faeAvatar,
            content: errorText
          }
        } else {
          newMessages.push({
            id: `error-${Date.now()}`,
            role: 'error',
            name: 'Fae',
            timestamp: new Date(),
            avatar: faeAvatar,
            content: errorText
          })
        }
        
        return newMessages
      })
      
      currentAssistantSegmentsRef.current = []
      currentTextSegmentRef.current = ''
      
      return
    }
  }, [addMessage, applyTextDelta, applyToolSegment, ensureAssistantMessage, updateLastAssistantMessage, approvalStatuses, handleApproveRequest, handleRejectRequest, updateApprovalStatus, onMetadataUpdate, pendingApprovalRequests])

  const { isSubscribed: natsSubscribed } = useNatsChatSubscription({
    enabled: useNats,
    dialogId: natsDialogId,
    onChunk: handleNatsChunk,
  })

  useEffect(() => {
    natsSubscribedRef.current = natsSubscribed
  }, [natsSubscribed])

  const waitForNatsSubscription = useCallback(async (expectedDialogId: string, timeoutMs: number = 8000) => {
    const started = Date.now()
    while (Date.now() - started < timeoutMs) {
      if (natsSubscribedRef.current && natsDialogIdRef.current === expectedDialogId) return
      await new Promise((r) => setTimeout(r, 50))
    }
    throw new Error('NATS subscription was not ready in time')
  }, [])
  
  const sendMessage = useCallback(async (text: string) => {
    setError(null)
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      name: 'You',
      content: text,
      timestamp: new Date()
    }
    addMessage(userMessage)
    
    setIsTyping(true)
    setNatsStreaming(true)
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
      if (!useNats) {
        throw new Error('NATS is required for incoming messages (SSE removed)')
      }

      const api = apiServiceRef.current
      if (!api) throw new Error('API service not initialized')

      const dialogId = natsDialogIdRef.current || (await api.createDialog())
      if (dialogId !== natsDialogIdRef.current) {
        setNatsDialogId(dialogId)
      }

      await waitForNatsSubscription(dialogId)

      const waitForNatsDone = new Promise<void>((resolve) => {
        natsDoneResolverRef.current = resolve
      })

      await api.sendMessage({ dialogId, content: text, chatType: 'CLIENT_CHAT' })

      await Promise.all([waitForNatsDone])
    } catch (err) {
      const errorText = err instanceof Error ? err.message : String(err)
      if (errorText.toLowerCase().includes('network error')) {
        return
      }
      setError(errorText)
      
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'error',
        name: 'Fae',
        timestamp: new Date(),
        avatar: faeAvatar,
        content: errorText,
      }
      
      setMessages(prev => {
        const lastMessage = prev[prev.length - 1]
        if (lastMessage && 
            lastMessage.role === 'assistant' && 
            (lastMessage.content === '' || 
             (Array.isArray(lastMessage.content) && lastMessage.content.length === 0))) {
          return [...prev.slice(0, -1), errorMessage]
        }
        return [...prev, errorMessage]
      })
    } finally {
      setIsTyping(false)
      setNatsStreaming(false)
      natsDoneResolverRef.current = null
    }
  }, [addMessage, waitForNatsSubscription, useNats])
  
  const handleQuickAction = useCallback((actionText: string) => {
    sendMessage(actionText)
  }, [sendMessage])
  
  const clearMessages = useCallback(() => {
    setMessages([])
    setIsTyping(false)
    setNatsStreaming(false)
    setError(null)
    currentAssistantSegmentsRef.current = []
    currentTextSegmentRef.current = ''
    setNatsDialogId(null)
    setAwaitingTechnicianResponse(false)
    setPendingApprovalRequests({})
    apiServiceRef.current?.reset()
  }, [])
  
  return {
    messages,
    isTyping,
    isStreaming: natsStreaming,
    error,
    dialogId: natsDialogId,
    sendMessage,
    handleQuickAction,
    clearMessages,
    quickActions,
    hasMessages: messages.length > 0,
    awaitingTechnicianResponse
  }
}