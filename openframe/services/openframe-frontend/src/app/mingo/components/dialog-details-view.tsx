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
  DetailPageContainer,
  type MessageSegment 
} from '@flamingo-stack/openframe-frontend-core'
import { Button } from '@flamingo-stack/openframe-frontend-core'
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks'
import { DetailLoader } from '@flamingo-stack/openframe-frontend-core/components/ui'
import { DeviceInfoSection } from '../../components/shared'
import { useDialogDetailsStore } from '../stores/dialog-details-store'
import { useDialogStatus } from '../hooks/use-dialog-status'
import { useNatsDialogSubscription } from '../hooks/use-nats-dialog-subscription'
import { apiClient } from '@lib/api-client'
import type { Message, ClientDialogOwner, DialogOwner } from '../types/dialog.types'

export function DialogDetailsView({ dialogId }: { dialogId: string }) {
  const router = useRouter()
  const { toast } = useToast()
  const isClientOwner = (owner: ClientDialogOwner | DialogOwner): owner is ClientDialogOwner => {
    return owner != null && typeof owner === 'object' && 'machineId' in owner
  }
  const {
    currentDialog: dialog,
    currentMessages: messages,
    isLoadingDialog: isLoading,
    isLoadingMessages: messagesLoading,
    hasMoreMessages: hasMore,
    fetchDialog,
    fetchMessages,
    loadMore,
    clearCurrent,
    updateDialogStatus,
    ingestRealtimeEvent
  } = useDialogDetailsStore()
  const { putOnHold, resolve, isUpdating } = useDialogStatus()
  const [isPaused, setIsPaused] = useState(false)
  const [approvalStatuses, setApprovalStatuses] = useState<Record<string, 'pending' | 'approved' | 'rejected'>>({})

  useEffect(() => {
    if (dialogId) {
      fetchDialog(dialogId)
      fetchMessages(dialogId)
    }
    
    return () => {
      clearCurrent()
    }
  }, [dialogId, fetchDialog, fetchMessages, clearCurrent])

  useEffect(() => {
    const newStatuses: Record<string, 'approved' | 'rejected'> = {}
    
    messages.forEach(msg => {
      const messageDataArray = Array.isArray(msg.messageData) ? msg.messageData : [msg.messageData]
      messageDataArray.forEach((data: any) => {
        if (data?.type === 'APPROVAL_RESULT' && data.approvalRequestId) {
          newStatuses[data.approvalRequestId] = data.approved ? 'approved' : 'rejected'
        }
      })
    })
    
    if (Object.keys(newStatuses).length > 0) {
      setApprovalStatuses(prev => ({ ...prev, ...newStatuses }))
    }
  }, [messages])

  // Subscribe to realtime events via NATS instead of polling GraphQL for new messages.
  useNatsDialogSubscription({
    enabled: Boolean(dialogId),
    dialogId,
    onEvent: ingestRealtimeEvent,
  })

  const handleSendMessage = (text: string) => {
    if (!isPaused) return
    const message = text.trim()
    if (!message) return
  }

  const handlePutOnHold = async () => {
    if (!dialog || isUpdating) return
    
    const success = await putOnHold(dialogId)
    if (success) {
      updateDialogStatus('ON_HOLD')
    }
  }

  const handleResolve = async () => {
    if (!dialog || isUpdating) return
    
    const success = await resolve(dialogId)
    if (success) {
      updateDialogStatus('RESOLVED')
    }
  }

  const handleApproveRequest = useCallback(async (requestId?: string) => {
    if (!requestId) return
    
    try {
      await apiClient.post(`/chat/api/v1/approval-requests/${requestId}/approve`, {
        approve: true
      })
      
      setApprovalStatuses(prev => ({
        ...prev,
        [requestId]: 'approved'
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
      await apiClient.post(`/chat/api/v1/approval-requests/${requestId}/approve`, {
        approve: false
      })
      
      setApprovalStatuses(prev => ({
        ...prev,
        [requestId]: 'rejected'
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

  const chatMessages = useMemo(() => {
    const processedMessages: Array<{
      id: string
      content: string | MessageSegment[]
      role: 'user' | 'assistant'
      timestamp: Date
    }> = []

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
    }>()

    let currentAssistantMessage: {
      id: string
      segments: MessageSegment[]
      timestamp: Date
    } | null = null

    messages.forEach((msg: Message, index: number) => {
      const messageDataArray = Array.isArray(msg.messageData) ? msg.messageData : [msg.messageData]
      const role = msg.owner?.type === 'CLIENT' ? 'user' as const : 'assistant' as const
      
      messageDataArray.forEach((data: any) => {
        if (role === 'user' && data.type === 'TEXT') {
          if (currentAssistantMessage && currentAssistantMessage.segments.length > 0) {
            processedMessages.push({
              id: currentAssistantMessage.id,
              content: currentAssistantMessage.segments,
              role: 'assistant',
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
          if (data.type === 'EXECUTING_TOOL') {
            const toolKey = `${data.integratedToolType}-${data.toolFunction}`
            executingTools.set(toolKey, {
              integratedToolType: data.integratedToolType,
              toolFunction: data.toolFunction,
              parameters: data.parameters
            })
          } else if (data.type === 'EXECUTED_TOOL') {
            const toolKey = `${data.integratedToolType}-${data.toolFunction}`
            const executingTool = executingTools.get(toolKey)
            
            if (!currentAssistantMessage) {
              currentAssistantMessage = {
                id: msg.id,
                segments: [],
                timestamp: new Date(msg.createdAt)
              }
            }
            
            currentAssistantMessage.segments.push({
              type: 'tool_execution',
              data: {
                type: 'EXECUTED_TOOL',
                integratedToolType: data.integratedToolType,
                toolFunction: data.toolFunction,
                parameters: executingTool?.parameters || data.parameters,
                result: data.result,
                success: data.success
              }
            })
            
            executingTools.delete(toolKey)
          } else if (data.type === 'TEXT') {
            if (!currentAssistantMessage) {
              currentAssistantMessage = {
                id: msg.id,
                segments: [],
                timestamp: new Date(msg.createdAt)
              }
            }
            
            currentAssistantMessage.segments.push({
              type: 'text',
              text: data.text || ''
            })
          } else if (data.type === 'APPROVAL_REQUEST') {
            const requestId = data.approvalRequestId
            if (requestId) {
              pendingApprovals.set(requestId, {
                command: data.command,
                approvalType: data.approvalType,
                description: data.description,
                risk: data.risk,
                details: data.details
              })
            }
          } else if (data.type === 'APPROVAL_RESULT') {
            const requestId = data.approvalRequestId
            const pendingApproval = pendingApprovals.get(requestId)
            
            if (!currentAssistantMessage) {
              currentAssistantMessage = {
                id: msg.id,
                segments: [],
                timestamp: new Date(msg.createdAt)
              }
            }
            
            const status: 'pending' | 'approved' | 'rejected' = data.approved ? 'approved' : 'rejected'
            
            const approvalSegment = {
              type: 'approval_request' as const,
              data: {
                command: pendingApproval?.command || data.command || '',
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
            timestamp: currentAssistantMessage.timestamp
          })
        }
        currentAssistantMessage = null
      }
    })

    if (pendingApprovals.size > 0) {
      const pendingSegments: MessageSegment[] = []
      
      pendingApprovals.forEach((approval, requestId) => {
        const status = approvalStatuses[requestId] || 'pending'
        
        pendingSegments.push({
          type: 'approval_request' as const,
          data: {
            command: approval.command || '',
            requestId: requestId,
            approvalType: approval.approvalType
          },
          status: status as 'pending' | 'approved' | 'rejected',
          onApprove: handleApproveRequest,
          onReject: handleRejectRequest
        } as MessageSegment)
      })
      
      if (pendingSegments.length > 0) {
        processedMessages.push({
          id: `pending-approvals-${Date.now()}`,
          content: pendingSegments,
          role: 'assistant',
          timestamp: new Date()
        })
      }
    }

    return processedMessages
  }, [messages, approvalStatuses, handleApproveRequest, handleRejectRequest])

  const prevLenRef = useRef<number>(messages.length)
  const shouldAutoScroll = messages.length > prevLenRef.current
  useEffect(() => {
    prevLenRef.current = messages.length
  }, [messages.length])

  const headerActions = dialog && (
    <div className="flex gap-4 items-center">
      {dialog.status !== 'ON_HOLD' && dialog.status !== 'RESOLVED' && (
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
      {dialog.status !== 'RESOLVED' && (
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
      className="h-full pt-6"
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
      <div className="flex-1 flex gap-6 pt-6 min-h-0">
        {/* Client Chat */}
        <div className="flex-1 flex flex-col gap-1 min-h-0">
          <h2 className="font-['Azeret_Mono'] font-medium text-[14px] text-ods-text-secondary uppercase tracking-[-0.28px] mb-2">
            Client Chat
          </h2>
          {/* Messages card */}
          <div className="flex-1 bg-ods-bg border border-ods-border rounded-md flex flex-col relative min-h-0">
            <ChatMessageList
              className=""
              messages={chatMessages}
              autoScroll={shouldAutoScroll}
              showAvatars={false}
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
          <h2 className="font-['Azeret_Mono'] font-medium text-[14px] text-ods-text-secondary uppercase tracking-[-0.28px] mb-2">
            Technician Chat
          </h2>
          <div className="flex-1 bg-ods-card border border-ods-border rounded-md flex flex-col items-center justify-center p-8">
            {/* Empty State */}
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 flex items-center justify-center">
                  <MessageCircleIcon className="h-8 w-8 text-ods-text-secondary" />
                </div>
              </div>
              <p className="font-['DM_Sans'] font-medium text-[14px] text-ods-text-secondary max-w-xs">
                This chat has not yet required technician involved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DetailPageContainer>
  )
}