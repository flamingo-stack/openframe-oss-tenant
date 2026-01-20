import { useState, useCallback, useEffect, useRef } from 'react'
import { useChatConfig } from './useChatConfig'
import { Message, MessageSegment, ToolExecutionData } from '../types/chat.types'
import faeAvatar from '../assets/fae-avatar.png'
import { useDebugMode } from '../contexts/DebugModeContext'
import { useNatsChatSubscription } from './useNatsChatSubscription'
import { useChunkCatchup } from './useChunkCatchup'
import { tokenService } from '../services/tokenService'
import { ChatApiService } from '../services/chatApiService'
import { dialogGraphQLService } from '../services/dialogGraphQLService'
import { processHistoricalMessages } from '../utils/messageProcessor'

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
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [isResumedDialog, setIsResumedDialog] = useState(false)
  const currentAssistantSegmentsRef = useRef<MessageSegment[]>([])
  const currentTextSegmentRef = useRef('')
  const natsDoneResolverRef = useRef<null | (() => void)>(null)
  const natsSubscribedRef = useRef(false)
  const natsDialogIdRef = useRef<string | null>(null)
  const hasCaughtUp = useRef(false)
  const hasCreatedStreamingMessage = useRef(false)
  // Promise resolver for waiting on NATS subscription
  const natsSubscriptionPromiseRef = useRef<{
    resolve: () => void
    reject: (error: Error) => void
  } | null>(null)
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
  
  const handleNatsChunk = useCallback((chunk: any, messageType: 'message' | 'admin-message' = 'message') => {
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
      // MESSAGE_START is just a signal that streaming is starting
      // Don't create any messages here - let the actual content chunks handle that
      setNatsStreaming(true)
      setIsTyping(true)
      // Reset segment accumulators for new streaming message
      currentTextSegmentRef.current = ''
      currentAssistantSegmentsRef.current = []
      return
    }

    if (type === 'MESSAGE_END') {
      setNatsStreaming(false)
      setIsTyping(false)
      const resolve = natsDoneResolverRef.current
      natsDoneResolverRef.current = null
      if (resolve) resolve()
      return
    }

    if (type === 'TEXT' && typeof chunk.text === 'string') {
      // // For resumed dialogs on first content chunk, we need a new assistant message
      // // because historical messages are complete and this is new streaming content
      // if (isResumedDialog && !hasCreatedStreamingMessage.current) {
      //   // Create a new assistant message for the streaming content
      //   const newAssistantMessage: Message = {
      //     id: `assistant-streaming-${Date.now()}`,
      //     role: 'assistant',
      //     name: 'Fae',
      //     content: [],
      //     timestamp: new Date(),
      //     avatar: faeAvatar
      //   }
      //   addMessage(newAssistantMessage)
      //   hasCreatedStreamingMessage.current = true
      // } else if (!isResumedDialog) {
      //   // For regular dialogs, ensure assistant message exists
      //   ensureAssistantMessage()
      // }
      
      ensureAssistantMessage()
      setNatsStreaming(true)
      setIsTyping(false) // Clear typing since we have actual content
      applyTextDelta(chunk.text)
      return
    }

    if (type === 'EXECUTING_TOOL' || type === 'EXECUTED_TOOL') {
      // Similar handling as TEXT chunks for resumed dialogs
      // if (isResumedDialog && !hasCreatedStreamingMessage.current) {
      //   const newAssistantMessage: Message = {
      //     id: `assistant-streaming-${Date.now()}`,
      //     role: 'assistant',
      //     name: 'Fae',
      //     content: [],
      //     timestamp: new Date(),
      //     avatar: faeAvatar
      //   }
      //   addMessage(newAssistantMessage)
      //   hasCreatedStreamingMessage.current = true
      // } else {
      //   ensureAssistantMessage()
      // }
      
      ensureAssistantMessage()
      setNatsStreaming(true)
      setIsTyping(false)
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
      } else {
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
  }, [addMessage, applyTextDelta, applyToolSegment, ensureAssistantMessage, updateLastAssistantMessage, approvalStatuses, handleApproveRequest, handleRejectRequest, updateApprovalStatus, onMetadataUpdate, pendingApprovalRequests, isResumedDialog])

  // Chunk catchup for resumed dialogs
  const { 
    catchUpChunks, 
    processChunk, 
    resetChunkTracking, 
    startInitialBuffering
  } = useChunkCatchup({
    dialogId: natsDialogId,
    onChunkReceived: handleNatsChunk  // This will be called after buffering is complete
  })

  const handleNatsSubscribed = useCallback(async () => {
    // Resolve any pending subscription promise
    if (natsSubscriptionPromiseRef.current) {
      natsSubscriptionPromiseRef.current.resolve()
      natsSubscriptionPromiseRef.current = null
    }

    if (!hasCaughtUp.current && natsDialogId && isResumedDialog) {
      hasCaughtUp.current = true
      await catchUpChunks()
    }
  }, [natsDialogId, catchUpChunks, isResumedDialog])

  const handleNatsChunkWithBuffer = useCallback(
    (chunk: any) => {
      if (isResumedDialog) {
        // For resumed dialogs, always use processChunk which handles buffering
        const processed = processChunk(chunk, 'message')
        if (!processed) return  // Skip if already processed (duplicate)
      } else {
        // For new dialogs, handle directly
        handleNatsChunk(chunk)
      }
    },
    [handleNatsChunk, processChunk, isResumedDialog]
  )

  const { isSubscribed: natsSubscribed } = useNatsChatSubscription({
    enabled: useNats,
    dialogId: natsDialogId,
    onChunk: handleNatsChunkWithBuffer,
    onSubscribed: handleNatsSubscribed,
  } as any)

  useEffect(() => {
    natsSubscribedRef.current = natsSubscribed
  }, [natsSubscribed])

  // Cleanup subscription promise on unmount
  useEffect(() => {
    return () => {
      if (natsSubscriptionPromiseRef.current) {
        natsSubscriptionPromiseRef.current.reject(new Error('Component unmounted'))
        natsSubscriptionPromiseRef.current = null
      }
    }
  }, [])

  const waitForNatsSubscription = useCallback(async (expectedDialogId: string) => {
    // If already subscribed to the expected dialog, return immediately
    if (natsSubscribedRef.current && natsDialogIdRef.current === expectedDialogId) {
      return
    }

    // Create a promise that will be resolved by the onSubscribed callback
    return new Promise<void>((resolve, reject) => {
      natsSubscriptionPromiseRef.current = { resolve, reject }
    })
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
    
    // Reset streaming message flag for new messages
    hasCreatedStreamingMessage.current = false
    
    setIsTyping(true)
    setNatsStreaming(true)
    currentAssistantSegmentsRef.current = []
    currentTextSegmentRef.current = ''
    
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
    setApprovalStatuses({})
    setIsResumedDialog(false)  // Reset resumed dialog state
    hasCaughtUp.current = false
    hasCreatedStreamingMessage.current = false
    resetChunkTracking()
    apiServiceRef.current?.reset()
    // Clear any pending subscription promise
    if (natsSubscriptionPromiseRef.current) {
      natsSubscriptionPromiseRef.current.reject(new Error('Chat cleared'))
      natsSubscriptionPromiseRef.current = null
    }
  }, [resetChunkTracking])

  const resumeDialog = useCallback(async (dialogId: string): Promise<boolean> => {
    try {
      setIsLoadingHistory(true)
      setError(null)
      
      // Clear current state completely
      setMessages([])
      setIsTyping(false)
      setNatsStreaming(false)
      currentAssistantSegmentsRef.current = []
      currentTextSegmentRef.current = ''
      setApprovalStatuses({})
      setPendingApprovalRequests({})
      setAwaitingTechnicianResponse(false)
      
      // Mark as resumed dialog BEFORE setting up buffering
      setIsResumedDialog(true)
      hasCaughtUp.current = false
      hasCreatedStreamingMessage.current = false
      
      // Reset and start buffering for chunk catchup
      resetChunkTracking()
      startInitialBuffering()
      
      // Load message history
      const messagesConnection = await dialogGraphQLService.getDialogMessages(dialogId, null, 100)
      
      if (!messagesConnection || !messagesConnection.edges) {
        throw new Error('Failed to load dialog history')
      }
      
      // Process historical messages
      const historicalMessages = processHistoricalMessages(
        messagesConnection.edges.map(edge => edge.node),
        handleApproveRequest,
        handleRejectRequest
      )
      
      // Set the messages
      setMessages(historicalMessages)
      
      // Update dialog ID for NATS subscription (this will trigger subscription)
      setNatsDialogId(dialogId)
      
      // Also update the API service's dialog ID for resumed dialog
      if (apiServiceRef.current) {
        apiServiceRef.current.setDialogId(dialogId)
      }
      
      // Wait for NATS subscription to be ready
      await waitForNatsSubscription(dialogId)
      
      // Note: Chunk catchup will be triggered by handleNatsSubscribed callback
      
      setIsLoadingHistory(false)
      return true
    } catch (error) {
      console.error('Failed to resume dialog:', error)
      setError(error instanceof Error ? error.message : 'Failed to resume dialog')
      setIsLoadingHistory(false)
      setIsResumedDialog(false)
      hasCaughtUp.current = false
      return false
    }
  }, [handleApproveRequest, handleRejectRequest, resetChunkTracking, startInitialBuffering, waitForNatsSubscription])
  
  return {
    messages,
    isTyping,
    isStreaming: natsStreaming,
    error,
    dialogId: natsDialogId,
    sendMessage,
    handleQuickAction,
    clearMessages,
    resumeDialog,
    quickActions,
    hasMessages: messages.length > 0,
    awaitingTechnicianResponse,
    isLoadingHistory,
    isResumedDialog
  }
}