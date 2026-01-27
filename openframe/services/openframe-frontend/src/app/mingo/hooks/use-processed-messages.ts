'use client'

import { useMemo, useCallback, useState } from 'react'
import { useMingoDialogDetailsStore } from '../stores/mingo-dialog-details-store'
import { 
  processHistoricalMessagesWithErrors,
  type HistoricalMessage,
  type MessageSegment
} from '@flamingo-stack/openframe-frontend-core'
import { 
  CHAT_TYPE, 
  ASSISTANT_CONFIG,
  type ApprovalStatus
} from '../../tickets/constants'
import { ChatApprovalStatus } from '@flamingo-stack/openframe-frontend-core'
import { useApprovalRequests } from '../../tickets/hooks/use-approval-requests'
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks'

export function useProcessedMessages() {
  const { adminMessages } = useMingoDialogDetailsStore()
  const [approvalStatuses, setApprovalStatuses] = useState<Record<string, ApprovalStatus>>({})
  const { handleApproveRequest, handleRejectRequest } = useApprovalRequests()
  const { toast } = useToast()

  const handleApprove = useCallback((requestId?: string) => {
    if (!requestId) return
    
    handleApproveRequest(requestId, {
      onSuccess: (status) => {
        setApprovalStatuses(prev => ({
          ...prev,
          [requestId]: status
        }))
      },
      onError: (error) => {
        toast({
          title: "Approval Failed",
          description: error.message || "Unable to approve request",
          variant: "destructive",
          duration: 5000
        })
      }
    })
  }, [handleApproveRequest, toast])

  const handleReject = useCallback((requestId?: string) => {
    if (!requestId) return
    
    handleRejectRequest(requestId, {
      onSuccess: (status) => {
        setApprovalStatuses(prev => ({
          ...prev,
          [requestId]: status
        }))
      },
      onError: (error) => {
        toast({
          title: "Rejection Failed",
          description: error.message || "Unable to reject request",
          variant: "destructive",
          duration: 5000
        })
      }
    })
  }, [handleRejectRequest, toast])

  const processedData = useMemo(() => {
    const assistantConfig = ASSISTANT_CONFIG.MINGO
    const { type: assistantType, name: assistantName } = assistantConfig

    const historicalMessages: HistoricalMessage[] = adminMessages.map(msg => ({
      id: msg.id,
      dialogId: msg.dialogId,
      chatType: msg.chatType,
      createdAt: msg.createdAt,
      owner: msg.owner,
      messageData: msg.messageData,
    }))

    const processed = processHistoricalMessagesWithErrors(historicalMessages, {
      assistantName,
      assistantType,
      chatTypeFilter: CHAT_TYPE.ADMIN,
      onApprove: handleApprove,
      onReject: handleReject,
      approvalStatuses: Object.fromEntries(
        Object.entries(approvalStatuses).map(([k, v]) => [k, v as ChatApprovalStatus])
      ),
    })

    const pendingApprovalSegments: MessageSegment[] = []
    const filteredMessages = processed.filter(msg => {
      if (msg.id.startsWith('pending-approvals-') && Array.isArray(msg.content)) {
        msg.content.forEach(segment => {
          if (segment.type === 'approval_request' && segment.status === 'pending') {
            pendingApprovalSegments.push(segment as MessageSegment)
          }
        })
        return false
      }
      return true
    })

    const processedMessages = filteredMessages.map(msg => ({
      id: msg.id,
      content: msg.content as string | MessageSegment[],
      role: msg.role as 'user' | 'assistant' | 'error',
      name: msg.name,
      assistantType: msg.assistantType as 'fae' | 'mingo' | undefined,
      timestamp: msg.timestamp
    }))

    return { 
      messages: processedMessages, 
      pendingApprovals: pendingApprovalSegments,
      assistantType,
      assistantName
    }
  }, [adminMessages, approvalStatuses, handleApprove, handleReject])

  return {
    ...processedData,
    handleApprove,
    handleReject
  }
}