'use client'

import { useRouter } from 'next/navigation'
import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import {
  Clock,
  CheckCircle,
} from 'lucide-react'
import { 
  MessageCircleIcon, 
  ChatMessageList,
  ChatInput,
  DetailPageContainer,
  type MessageSegment 
} from '@flamingo-stack/openframe-frontend-core'
import { Button } from '@flamingo-stack/openframe-frontend-core'
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks'
import { DetailLoader } from '@flamingo-stack/openframe-frontend-core/components/ui'
import { useDialogDetailsStore } from '../stores/dialog-details-store'
import { useDialogStatus } from '../hooks/use-dialog-status'
import { useNatsDialogSubscription } from '../hooks/use-nats-dialog-subscription'
import { apiClient } from '@lib/api-client'
import { DeviceInfoSection } from '../../components/shared'
import type { Message, ClientDialogOwner, DialogOwner } from '../types/dialog.types'
import {
  DIALOG_STATUS,
  CHAT_TYPE,
  MESSAGE_TYPE,
  OWNER_TYPE,
  APPROVAL_STATUS,
  ASSISTANT_CONFIG,
  API_ENDPOINTS,
  type ApprovalStatus,
  type NatsMessageType
} from '../constants'

interface DialogDetailsViewProps {
  dialogId: string
}

export function DialogDetailsView({ dialogId }: DialogDetailsViewProps) {
  const router = useRouter()
  const { toast } = useToast()
  
  const isClientOwner = (owner: ClientDialogOwner | DialogOwner): owner is ClientDialogOwner => {
    return owner != null && typeof owner === 'object' && 'machineId' in owner
  }
  
  const {
    currentDialog: dialog,
    currentMessages: messages,
    adminMessages,
    isLoadingDialog: isLoading,
    isLoadingMessages: messagesLoading,
    hasMoreMessages: hasMore,
    isClientChatTyping,
    isAdminChatTyping,
    fetchDialog,
    fetchMessages,
    loadMore,
    clearCurrent,
    updateDialogStatus,
    ingestRealtimeEvent
  } = useDialogDetailsStore()
  const { putOnHold, resolve, isUpdating } = useDialogStatus()
  const [approvalStatuses, setApprovalStatuses] = useState<Record<string, ApprovalStatus>>({})
  const [isSendingAdminMessage, setIsSendingAdminMessage] = useState(false)
  const prevMessageLength = useRef<number>(0)

  // Fetch dialog and messages on mount
  useEffect(() => {
    if (!dialogId) return
    
    const loadData = async () => {
      await Promise.all([
        fetchDialog(dialogId),
        fetchMessages(dialogId)
      ])
    }
    
    loadData()
    
    return () => clearCurrent()
  }, [dialogId])

  // Extract approval statuses from messages
  useEffect(() => {
    const extractedStatuses = messages.reduce<Record<string, ApprovalStatus>>((acc, msg) => {
      const messageDataArray = Array.isArray(msg.messageData) ? msg.messageData : [msg.messageData]
      
      messageDataArray.forEach((data: any) => {
        if (data?.type === MESSAGE_TYPE.APPROVAL_RESULT && data.approvalRequestId) {
          acc[data.approvalRequestId] = data.approved ? APPROVAL_STATUS.APPROVED : APPROVAL_STATUS.REJECTED
        }
      })
      
      return acc
    }, {})
    
    if (Object.keys(extractedStatuses).length > 0) {
      setApprovalStatuses(prev => ({ ...prev, ...extractedStatuses }))
    }
  }, [messages])

  // NATS subscription
  const handleNatsEvent = useCallback(
    (payload: unknown, messageType: NatsMessageType) => {
      ingestRealtimeEvent(payload, messageType as 'message' | 'admin-message')
    },
    [ingestRealtimeEvent]
  )
  
  useNatsDialogSubscription({
    enabled: !!dialogId,
    dialogId,
    onEvent: handleNatsEvent,
  })

  const handlePutOnHold = useCallback(async () => {
    if (!dialog || isUpdating) return
    
    const success = await putOnHold(dialogId)
    if (success) {
      updateDialogStatus(DIALOG_STATUS.ON_HOLD)
    }
  }, [dialog, isUpdating, putOnHold, dialogId, updateDialogStatus])

  const handleResolve = useCallback(async () => {
    if (!dialog || isUpdating) return
    
    const success = await resolve(dialogId)
    if (success) {
      updateDialogStatus(DIALOG_STATUS.RESOLVED)
    }
  }, [dialog, isUpdating, resolve, dialogId, updateDialogStatus])

  const handleApproveRequest = useCallback(async (requestId?: string) => {
    if (!requestId) return
    
    try {
      await apiClient.post(`${API_ENDPOINTS.APPROVAL_REQUEST}/${requestId}/approve`, {
        approve: true
      })
      
      setApprovalStatuses(prev => ({
        ...prev,
        [requestId]: APPROVAL_STATUS.APPROVED
      }))
    } catch (error) {
      toast({
        title: "Approval Failed",
        description: error instanceof Error ? error.message : "Unable to approve request",
        variant: "destructive",
        duration: 5000
      })
    }
  }, [toast])

  const handleRejectRequest = useCallback(async (requestId?: string) => {
    if (!requestId) return
    
    try {
      await apiClient.post(`${API_ENDPOINTS.APPROVAL_REQUEST}/${requestId}/approve`, {
        approve: false
      })
      
      setApprovalStatuses(prev => ({
        ...prev,
        [requestId]: APPROVAL_STATUS.REJECTED
      }))
    } catch (error) {
      toast({
        title: "Rejection Failed",
        description: error instanceof Error ? error.message : "Unable to reject request",
        variant: "destructive",
        duration: 5000
      })
    }
  }, [toast])

  const handleSendAdminMessage = useCallback(async (message: string) => {
    const trimmedMessage = message.trim()
    if (!trimmedMessage || isSendingAdminMessage) return

    setIsSendingAdminMessage(true)
    try {
      await apiClient.post(API_ENDPOINTS.SEND_MESSAGE, {
        dialogId,
        content: trimmedMessage,
        chatType: CHAT_TYPE.ADMIN
      })
    } catch (error) {
      toast({
        title: "Send Failed",
        description: error instanceof Error ? error.message : "Unable to send message",
        variant: "destructive",
        duration: 5000
      })
    } finally {
      setIsSendingAdminMessage(false)
    }
  }, [dialogId, isSendingAdminMessage, toast])

  const processMessages = useCallback((messages: Message[], expectedChatType?: typeof CHAT_TYPE[keyof typeof CHAT_TYPE]) => {
    const assistantConfig = expectedChatType === CHAT_TYPE.ADMIN ? ASSISTANT_CONFIG.MINGO : ASSISTANT_CONFIG.FAE
    const { type: assistantType, name: assistantName } = assistantConfig

    const processedMessages: Array<{
      id: string
      content: string | MessageSegment[]
      role: 'user' | 'assistant'
      name?: string
      assistantType?: 'fae' | 'mingo'
      timestamp: Date
    }> = []
    
    const pendingApprovalSegments: MessageSegment[] = []

    const executingTools = new Map<string, {
      integratedToolType: string
      toolFunction: string
      parameters?: Record<string, any>
    }>()

    const pendingApprovals = new Map<string, {
      command: string
      approvalType: string
      description?: string
      risk?: string
      details?: any
      explanation?: string
    }>()

    let currentAssistantMessage: {
      id: string
      segments: MessageSegment[]
      name?: string
      assistantType?: 'fae' | 'mingo'
      timestamp: Date
    } | null = null

    messages.forEach((msg: Message, index: number) => {
      // Skip messages that don't match the expected chat type
      if (expectedChatType && msg.chatType !== expectedChatType) return
      
      const messageDataArray = Array.isArray(msg.messageData) ? msg.messageData : [msg.messageData]
      const isUserMessage = msg.owner?.type === OWNER_TYPE.CLIENT || msg.owner?.type === OWNER_TYPE.ADMIN
      const role: 'user' | 'assistant' = isUserMessage ? 'user' : 'assistant'
      
      messageDataArray.forEach((data: any) => {
        if (role === 'user' && data.type === MESSAGE_TYPE.TEXT) {
          if (currentAssistantMessage && currentAssistantMessage.segments.length > 0) {
            processedMessages.push({
              id: currentAssistantMessage.id,
              content: currentAssistantMessage.segments,
              role: 'assistant',
              name: currentAssistantMessage.name,
              assistantType: currentAssistantMessage.assistantType,
              timestamp: currentAssistantMessage.timestamp
            })
            currentAssistantMessage = null
          }
          
          processedMessages.push({
            id: msg.id,
            content: [{
              type: 'text',
              text: data.text || ''
            } as MessageSegment],
            role: 'user',
            timestamp: new Date(msg.createdAt)
          })
        } else if (role === 'assistant') {
          if (data.type === MESSAGE_TYPE.EXECUTING_TOOL) {
            const toolKey = `${data.integratedToolType}-${data.toolFunction}`
            executingTools.set(toolKey, {
              integratedToolType: data.integratedToolType,
              toolFunction: data.toolFunction,
              parameters: data.parameters
            })
         } else if (data.type === MESSAGE_TYPE.EXECUTED_TOOL) {
            const toolKey = `${data.integratedToolType}-${data.toolFunction}`
            const executingTool = executingTools.get(toolKey)
            
            if (!currentAssistantMessage) {
              currentAssistantMessage = {
                id: msg.id,
                segments: [],
                name: assistantName,
                assistantType: assistantType,
                timestamp: new Date(msg.createdAt)
              }
            }
            
            currentAssistantMessage.segments.push({
              type: 'tool_execution',
              data: {
                type: MESSAGE_TYPE.EXECUTED_TOOL,
                integratedToolType: data.integratedToolType,
                toolFunction: data.toolFunction,
                parameters: executingTool?.parameters || data.parameters,
                result: data.result,
                success: data.success
              }
            })
            
            executingTools.delete(toolKey)
          } else if (data.type === MESSAGE_TYPE.TEXT) {
            if (!currentAssistantMessage) {
              currentAssistantMessage = {
                id: msg.id,
                segments: [],
                name: assistantName,
                assistantType: assistantType,
                timestamp: new Date(msg.createdAt)
              }
            }
            
            currentAssistantMessage.segments.push({
              type: 'text',
              text: data.text || ''
            })
          } else if (data.type === MESSAGE_TYPE.APPROVAL_REQUEST) {
            const requestId = data.approvalRequestId
            if (requestId) {
              pendingApprovals.set(requestId, {
                command: data.command,
                approvalType: data.approvalType,
                explanation: data.explanation
              })
            }
          } else if (data.type === MESSAGE_TYPE.APPROVAL_RESULT) {
            const requestId = data.approvalRequestId
            const pendingApproval = pendingApprovals.get(requestId)
            
            if (!currentAssistantMessage) {
              currentAssistantMessage = {
                id: msg.id,
                segments: [],
                name: assistantName,
                assistantType: assistantType,
                timestamp: new Date(msg.createdAt)
              }
            }
            
            const status: ApprovalStatus = data.approved ? APPROVAL_STATUS.APPROVED : APPROVAL_STATUS.REJECTED
            
            const approvalSegment = {
              type: 'approval_request' as const,
              data: {
                command: pendingApproval?.command || data.command || '',
                explanation: pendingApproval?.explanation || data.explanation || '',
                requestId: requestId,
                approvalType: pendingApproval?.approvalType || data.approvalType
              },
              status: status,
              onApprove: handleApproveRequest,
              onReject: handleRejectRequest
            }
            
            currentAssistantMessage.segments.push(approvalSegment as MessageSegment)
            
            if (pendingApproval) {
              pendingApprovals.delete(requestId)
            }
          }
        }
      })

      const nextMsg = messages[index + 1]
      const isLastMessage = index === messages.length - 1
      const nextIsFromDifferentOwner = nextMsg && nextMsg.owner?.type !== msg.owner?.type
      
      if (currentAssistantMessage && role === 'assistant' && (isLastMessage || nextIsFromDifferentOwner)) {
        if (currentAssistantMessage.segments.length > 0) {
          processedMessages.push({
            id: currentAssistantMessage.id,
            content: currentAssistantMessage.segments,
            role: 'assistant',
            name: currentAssistantMessage.name,
            assistantType: currentAssistantMessage.assistantType,
            timestamp: currentAssistantMessage.timestamp
          })
        }
        currentAssistantMessage = null
      }
    })

    // Collect pending approvals
    pendingApprovals.forEach((approval, requestId) => {
      const status = approvalStatuses[requestId] || APPROVAL_STATUS.PENDING
      
      if (status === APPROVAL_STATUS.PENDING) {
        pendingApprovalSegments.push({
          type: 'approval_request' as const,
          data: {
            command: approval.command || '',
            explanation: approval.explanation || '',
            requestId: requestId,
            approvalType: approval.approvalType
          },
          status: APPROVAL_STATUS.PENDING,
          onApprove: handleApproveRequest,
          onReject: handleRejectRequest
        } as MessageSegment)
      }
    })

    return { 
      messages: processedMessages, 
      pendingApprovals: pendingApprovalSegments,
      assistantType,
      assistantName
    }
  }, [approvalStatuses, handleApproveRequest, handleRejectRequest])

  const chatData = useMemo(() => processMessages(messages, CHAT_TYPE.CLIENT), [messages, processMessages])
  const adminChatData = useMemo(() => processMessages(adminMessages, CHAT_TYPE.ADMIN), [adminMessages, processMessages])

  // Auto-scroll logic
  const shouldAutoScroll = useMemo(() => {
    const shouldScroll = messages.length > prevMessageLength.current
    prevMessageLength.current = messages.length
    return shouldScroll
  }, [messages.length])

  const headerActions = useMemo(() => {
    if (!dialog) return null
    
    const isHoldOrResolved = dialog.status === DIALOG_STATUS.ON_HOLD || dialog.status === DIALOG_STATUS.RESOLVED
    const isResolved = dialog.status === DIALOG_STATUS.RESOLVED
    
    return (
      <div className="flex gap-4 items-center">
        {!isHoldOrResolved && (
          <Button
          variant="ghost"
          className="bg-ods-card border border-ods-border rounded-md px-4 py-3 hover:bg-ods-bg-hover transition-colors"
          leftIcon={<Clock className="h-6 w-6 text-ods-text-primary" />}
          onClick={handlePutOnHold}
          disabled={isUpdating}
        >
          <span className="font-['DM_Sans'] font-bold text-[18px] text-ods-text-primary tracking-[-0.36px]">
            {isUpdating ? 'Updating...' : 'Put On Hold'}
          </span>
        </Button>
        )}
        {!isResolved && (
          <Button
          variant="ghost"
          className="bg-ods-card border border-ods-border rounded-md px-4 py-3 hover:bg-ods-bg-hover transition-colors"
          leftIcon={<CheckCircle className="h-6 w-6 text-ods-text-primary" />}
          onClick={handleResolve}
          disabled={isUpdating}
        >
          <span className="font-['DM_Sans'] font-bold text-[18px] text-ods-text-primary tracking-[-0.36px]">
            {isUpdating ? 'Updating...' : 'Resolve'}
          </span>
        </Button>
        )}
      </div>
    )
  }, [dialog, isUpdating, handlePutOnHold, handleResolve])

  if (isLoading || !dialog) {
    return <DetailLoader />
  }

  return (
    <DetailPageContainer
      title={dialog.title}
      backButton={{
        label: 'Back to Chats',
        onClick: () => router.push('/mingo')
      }}
      padding="none"
      className="h-full pt-6 gap-2"
      headerActions={headerActions}
      contentClassName="flex flex-col min-h-0"
    >
      {/* Device Info Section */}
      {isClientOwner(dialog.owner) && dialog.owner.machineId && (
        <DeviceInfoSection
          deviceId={dialog.owner.machineId}
          device={dialog.owner.machine ? {
            id: dialog.owner.machine.id,
            machineId: dialog.owner.machine.machineId,
            hostname: dialog.owner.machine.hostname,
            displayName: dialog.owner.machine.hostname,
          } : undefined}
        />
      )}

      {/* Chat Section */}
      <div className="flex-1 flex gap-6 min-h-0">
        {/* Client Chat */}
        <div className="flex-1 flex flex-col gap-1 min-h-0">
          <h2 className="font-['Azeret_Mono'] font-medium text-[14px] text-ods-text-secondary uppercase tracking-[-0.28px]">
            Client Chat
          </h2>
          {/* Messages card */}
          <div className="flex-1 bg-ods-bg border border-ods-border rounded-md flex flex-col relative min-h-0">
            <ChatMessageList
              messages={chatData.messages}
              autoScroll={shouldAutoScroll}
              showAvatars={false}
              isTyping={isClientChatTyping}
              pendingApprovals={chatData.pendingApprovals}
              assistantType={chatData.assistantType}
            />
            {hasMore && !messagesLoading && (
              <div className="p-2 text-center border-t border-ods-border">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => loadMore()}
                  className="text-ods-text-secondary hover:text-ods-text-primary"
                >
                  Load More Messages
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Technician Chat */}
        <div className="flex-1 flex flex-col gap-1 min-h-0">
          <h2 className="font-['Azeret_Mono'] font-medium text-[14px] text-ods-text-secondary uppercase tracking-[-0.28px]">
            Technician Chat
          </h2>
          <div className="flex-1 flex flex-col relative min-h-0">
            {adminMessages.length === 0 ? (
              /* Empty State */
              <div className="bg-ods-card border border-ods-border rounded-lg flex-1 flex flex-col items-center justify-center p-8">
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="relative w-12 h-12">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <MessageCircleIcon className="h-8 w-8 text-ods-text-secondary" />
                    </div>
                  </div>
                  <p className="font-['DM_Sans'] font-medium text-[14px] text-ods-text-secondary max-w-xs">
                    Start a technician conversation
                  </p>
                </div>
              </div>
            ) : (
              /* Messages */
              <ChatMessageList
                className="flex-1 bg-ods-card border border-ods-border rounded-lg"
                messages={adminChatData.messages}
                autoScroll={true}
                showAvatars={false}
                isTyping={isAdminChatTyping}
                pendingApprovals={adminChatData.pendingApprovals}
                assistantType={adminChatData.assistantType}
              />
            )}
            
            {/* Message Input */}
            <ChatInput
              reserveAvatarOffset={false}
              placeholder="Enter your Request..."
              onSend={handleSendAdminMessage}
              sending={isSendingAdminMessage}
              disabled={isSendingAdminMessage}
              autoFocus={false}
              className='mt-2 bg-ods-card rounded-lg'
            />
          </div>
        </div>
      </div>
    </DetailPageContainer>
  )
}