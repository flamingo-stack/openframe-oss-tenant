import { useState, useCallback, useEffect, useRef } from 'react'
import { useSSE } from './useSSE'
import { useChatConfig } from './useChatConfig'
import { Message, MessageSegment, ToolExecutionData } from '../types/chat.types'
import faeAvatar from '../assets/fae-avatar.png'
import { useDebugMode } from '../contexts/DebugModeContext'
import { useNatsChatSubscription } from './useNatsChatSubscription'
import { tokenService } from '../services/tokenService'

export type { Message } from '../types/chat.types'

interface UseChatOptions {
  sseUrl?: string
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

export function useChat({ sseUrl, useMock = false, useApi = true, useNats = false, onMetadataUpdate }: UseChatOptions = {}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [natsStreaming, setNatsStreaming] = useState(false)
  const [natsDialogId, setNatsDialogId] = useState<string | null>(null)
  const [approvalStatuses, setApprovalStatuses] = useState<Record<string, 'pending' | 'approved' | 'rejected'>>({})
  const currentAssistantSegmentsRef = useRef<MessageSegment[]>([])
  const currentTextSegmentRef = useRef('')
  const natsDoneResolverRef = useRef<null | (() => void)>(null)
  const { debugMode } = useDebugMode()

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
    // stop typing as soon as we see any streamed content
    setIsTyping(false)
    currentTextSegmentRef.current += text

    const updatedSegments = [...currentAssistantSegmentsRef.current]
    if (updatedSegments.length > 0 && updatedSegments[updatedSegments.length - 1].type === 'text') {
      updatedSegments[updatedSegments.length - 1] = { type: 'text', text: currentTextSegmentRef.current }
    } else {
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
        // Update the message segments to reflect the new status
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
        // Update the message segments to reflect the new status
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
      
      // Only show CLIENT approval requests, others show as escalated
      if (approvalType === 'CLIENT') {
        const approvalSegment: MessageSegment = {
          type: 'approval_request',
          data: {
            command: chunk.command || '',
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
        // For non-CLIENT approvals, show escalation message with typing indicator
        const escalationSegment: MessageSegment = {
          type: 'text',
          text: 'Escalated to technician - awaiting response'
        }
        const updatedSegments = [...currentAssistantSegmentsRef.current, escalationSegment]
        currentAssistantSegmentsRef.current = updatedSegments
        updateLastAssistantMessage(updatedSegments)
        setIsTyping(true)
      }
      return
    }

    if (type === 'APPROVAL_RESULT') {
      const requestId = chunk.approvalRequestId || ''
      const approved = chunk.approved === true
      const approvalType = chunk.approvalType || 'CLIENT'
      
      const newStatus = approved ? 'approved' : 'rejected'
      setApprovalStatuses(prev => ({ ...prev, [requestId]: newStatus }))
      
      updateApprovalStatus(requestId, newStatus)
      
      if (approvalType !== 'CLIENT') {
        setIsTyping(false)
      }
      
      return
    }
    
    // if (type === 'ERROR') {
    //   setNatsStreaming(false)
    //   const resolve = natsDoneResolverRef.current
    //   natsDoneResolverRef.current = null
    //   if (resolve) resolve()

    //   const errorMessage: Message = {
    //     id: `error-${Date.now()}`,
    //     role: 'error',
    //     name: 'Fae',
    //     timestamp: new Date(),
    //     avatar: faeAvatar,
    //     content: chunk.error || 'An error occurred.',
    //   }
    //   addMessage(errorMessage)
    //   return
    // }
  }, [addMessage, applyTextDelta, applyToolSegment, ensureAssistantMessage, updateLastAssistantMessage, approvalStatuses, handleApproveRequest, handleRejectRequest, updateApprovalStatus])

  // NATS connect happens whenever feature flag is on.
  // Disable SSE message processing after we have an active subscription (natsSubscribed).
  const { isSubscribed: natsSubscribed } = useNatsChatSubscription({
    enabled: useNats,
    dialogId: natsDialogId,
    onChunk: handleNatsChunk,
  })

  const useNatsTransport = useNats && natsSubscribed

  const { streamMessage, isStreaming: sseStreaming, error: sseError, reset, dialogId: sseDialogId } = useSSE({ 
    url: sseUrl, 
    useMock, 
    useApi,
    useNats: useNatsTransport,
    debugMode,
    onMetadataUpdate
  })

  useEffect(() => {
    setNatsDialogId(sseDialogId)
  }, [sseDialogId])
  
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
      let waitForNatsDone: Promise<void> | null = null
      if (useNatsTransport) {
        waitForNatsDone = new Promise<void>((resolve) => {
          natsDoneResolverRef.current = resolve
        })
      }

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
        } else if ((segment as any).type === 'approval_request') {
          const approvalSegment = segment as any
          const requestId = approvalSegment.data.requestId || ''
          const approvalType = approvalSegment.data.approvalType || 'USER'
          
          if (approvalType === 'CLIENT') {
            const finalSegment: MessageSegment = {
              type: 'approval_request',
              data: {
                command: approvalSegment.data.command || '',
                requestId: requestId,
                approvalType: approvalType
              },
              status: (approvalStatuses[requestId] || 'pending') as 'pending' | 'approved' | 'rejected',
              onApprove: handleApproveRequest,
              onReject: handleRejectRequest
            }
            
            currentAssistantSegmentsRef.current.push(finalSegment)
            updateLastAssistantMessage([...currentAssistantSegmentsRef.current])
          } else {
            const escalationSegment: MessageSegment = {
              type: 'text',
              text: 'Escalated to technician - awaiting response'
            }
            currentAssistantSegmentsRef.current.push(escalationSegment)
            updateLastAssistantMessage([...currentAssistantSegmentsRef.current])
            setIsTyping(true)
          }
        }
      }

      if (waitForNatsDone) {
        await waitForNatsDone
      }
    } catch (err) {
      const errorText = err instanceof Error ? err.message : String(err)
      if (errorText.toLowerCase().includes('network error')) {
        return
      }
      
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
      if (!useNatsTransport) {
        setIsTyping(false)
        currentAssistantSegmentsRef.current = []
        currentTextSegmentRef.current = ''
      }
    }
  }, [streamMessage, addMessage, updateLastAssistantMessage, useNatsTransport, natsDialogId, natsStreaming])
  
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
    isStreaming: useNatsTransport ? natsStreaming : sseStreaming,
    error: sseError,
    dialogId: sseDialogId,
    sendMessage,
    handleQuickAction,
    clearMessages,
    quickActions,
    hasMessages: messages.length > 0
  }
}