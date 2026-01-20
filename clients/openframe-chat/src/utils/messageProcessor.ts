import {
  MESSAGE_TYPE,
  OWNER_TYPE,
  CHAT_TYPE,
} from '@flamingo-stack/openframe-frontend-core'
import type { Message as GraphQLMessage, MessageData } from '../services/dialogGraphQLService'
import type { Message as ChatMessage, MessageSegment } from '../types/chat.types'
import faeAvatar from '../assets/fae-avatar.png'

export function processHistoricalMessages(
  messages: GraphQLMessage[],
  onApprove?: (requestId?: string) => Promise<void>,
  onReject?: (requestId?: string) => Promise<void>
): ChatMessage[] {
  const processedMessages: ChatMessage[] = []
  const pendingApprovals = new Map<string, {
    command: string
    approvalType: string
    explanation?: string
  }>()
  
  let currentAssistantSegments: MessageSegment[] = []
  let currentAssistantId: string | null = null
  let currentAssistantTimestamp: Date | null = null

  // Helper to flush current assistant message
  const flushAssistantMessage = () => {
    if (currentAssistantId && currentAssistantSegments.length > 0) {
      processedMessages.push({
        id: currentAssistantId,
        role: 'assistant',
        name: 'Fae',
        content: currentAssistantSegments,
        timestamp: currentAssistantTimestamp || new Date(),
        avatar: faeAvatar
      })
      currentAssistantSegments = []
      currentAssistantId = null
      currentAssistantTimestamp = null
    }
  }

  messages.forEach((msg, index) => {
    // Only process CLIENT_CHAT messages for now
    if (msg.chatType !== CHAT_TYPE.CLIENT) return
    
    const messageDataArray = Array.isArray(msg.messageData) ? msg.messageData : [msg.messageData]
    const isUserMessage = msg.owner?.type === OWNER_TYPE.CLIENT
    
    if (isUserMessage) {
      // Flush any pending assistant message
      flushAssistantMessage()
      
      // Process user message
      messageDataArray.forEach((data: MessageData) => {
        if (data.type === MESSAGE_TYPE.TEXT && data.text) {
          processedMessages.push({
            id: msg.id,
            role: 'user',
            name: 'You',
            content: data.text,
            timestamp: new Date(msg.createdAt)
          })
        }
      })
    } else {
      // Assistant message - accumulate segments
      if (!currentAssistantId) {
        currentAssistantId = msg.id
        currentAssistantTimestamp = new Date(msg.createdAt)
      }
      
      messageDataArray.forEach((data: MessageData) => {
        if (data.type === MESSAGE_TYPE.TEXT && data.text) {
          currentAssistantSegments.push({
            type: 'text',
            text: data.text
          })
        } else if (data.type === MESSAGE_TYPE.EXECUTING_TOOL) {
          currentAssistantSegments.push({
            type: 'tool_execution',
            data: {
              type: 'EXECUTING_TOOL',
              integratedToolType: data.integratedToolType || '',
              toolFunction: data.toolFunction || '',
              parameters: data.parameters
            }
          })
        } else if (data.type === MESSAGE_TYPE.EXECUTED_TOOL) {
          // Try to find and replace the executing tool segment
          const existingIndex = currentAssistantSegments.findIndex(
            s => s.type === 'tool_execution' &&
                 s.data.type === 'EXECUTING_TOOL' &&
                 s.data.integratedToolType === data.integratedToolType &&
                 s.data.toolFunction === data.toolFunction
          )
          
          const executedSegment: MessageSegment = {
            type: 'tool_execution',
            data: {
              type: 'EXECUTED_TOOL',
              integratedToolType: data.integratedToolType || '',
              toolFunction: data.toolFunction || '',
              parameters: data.parameters,
              result: data.result,
              success: data.success
            }
          }
          
          if (existingIndex !== -1) {
            currentAssistantSegments[existingIndex] = executedSegment
          } else {
            currentAssistantSegments.push(executedSegment)
          }
        } else if (data.type === MESSAGE_TYPE.APPROVAL_REQUEST) {
          if (data.approvalRequestId) {
            pendingApprovals.set(data.approvalRequestId, {
              command: data.command || '',
              approvalType: data.approvalType || 'USER',
              explanation: data.explanation
            })
          }
        } else if (data.type === MESSAGE_TYPE.APPROVAL_RESULT) {
          const pendingApproval = pendingApprovals.get(data.approvalRequestId || '')
          if (pendingApproval) {
            currentAssistantSegments.push({
              type: 'approval_request',
              data: {
                command: pendingApproval.command,
                explanation: pendingApproval.explanation,
                requestId: data.approvalRequestId || '',
                approvalType: pendingApproval.approvalType
              },
              status: data.approved ? 'approved' : 'rejected',
              onApprove,
              onReject
            })
            pendingApprovals.delete(data.approvalRequestId || '')
          }
        } else if (data.type === MESSAGE_TYPE.ERROR) {
          // Flush current assistant message and add error
          flushAssistantMessage()
          processedMessages.push({
            id: `${msg.id}-error`,
            role: 'error',
            name: 'Fae',
            content: data.error || 'An error occurred',
            timestamp: new Date(msg.createdAt),
            avatar: faeAvatar
          })
        }
      })
      
      // Check if we should flush (next message is from user or last message)
      const nextMsg = messages[index + 1]
      const isLastMessage = index === messages.length - 1
      const nextIsFromUser = nextMsg && nextMsg.owner?.type === OWNER_TYPE.CLIENT
      
      if (isLastMessage || nextIsFromUser) {
        flushAssistantMessage()
      }
    }
  })
  
  // Flush any remaining assistant message
  flushAssistantMessage()
  
  // Add any remaining pending approvals
  pendingApprovals.forEach((approval, requestId) => {
    const approvalSegment: MessageSegment = {
      type: 'approval_request',
      data: {
        command: approval.command,
        explanation: approval.explanation,
        requestId: requestId,
        approvalType: approval.approvalType
      },
      status: 'pending',
      onApprove,
      onReject
    }
    
    // Add as a new assistant message
    processedMessages.push({
      id: `pending-approval-${requestId}`,
      role: 'assistant',
      name: 'Fae',
      content: [approvalSegment],
      timestamp: new Date(),
      avatar: faeAvatar
    })
  })
  
  return processedMessages
}