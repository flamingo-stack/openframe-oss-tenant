'use client'

import { useRouter } from 'next/navigation'
import { useState, useMemo, useEffect } from 'react'
import {
  Clock,
  CheckCircle,
  Monitor,
  Check
} from 'lucide-react'
import { MessageCircleIcon, ChatMessageList, ChatInput, DetailPageContainer, StatusTag } from '@flamingo/ui-kit'
import { Button } from '@flamingo/ui-kit'
import { DetailLoader } from '@flamingo/ui-kit/components/ui'
import { useDialogDetailsStore } from '../stores/dialog-details-store'
import { useDialogStatus } from '../hooks/use-dialog-status'
import type { Message, TextData } from '../types/dialog.types'

export function DialogDetailsView({ dialogId }: { dialogId: string }) {
  const router = useRouter()
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
    updateDialogStatus
  } = useDialogDetailsStore()
  const { putOnHold, resolve, isUpdating } = useDialogStatus()
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    if (dialogId) {
      fetchDialog(dialogId)
      fetchMessages(dialogId)
    }
    
    return () => {
      clearCurrent()
    }
  }, [dialogId])

  const handleSendMessage = (text: string) => {
    if (!isPaused) return
    const message = text.trim()
    if (!message) return
    console.log('Sending message:', message)
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

  const chatMessages = useMemo(() => {
    const reversedMessages = [...messages].reverse()
    
    return reversedMessages.filter((msg: Message) => {
      const messageDataArray = msg.messageData as any
      if (Array.isArray(messageDataArray) && messageDataArray.length > 0) {
        return messageDataArray[0].type === 'TEXT'
      }
      return (msg.messageData as any)?.type === 'TEXT'
    }).map((msg: Message) => {
      let content = ''
      
      const messageDataArray = msg.messageData as any
      if (Array.isArray(messageDataArray) && messageDataArray.length > 0) {
        const firstData = messageDataArray[0]
        if (firstData.type === 'TEXT') {
          content = firstData.text || ''
        }
      } else if ((msg.messageData as any)?.type === 'TEXT') {
        content = (msg.messageData as TextData).text || ''
      }

      return {
        id: msg.id,
        content,
        role: msg.owner?.type === 'CLIENT' ? 'user' as const : 
              msg.owner?.type === 'ASSISTANT' ? 'assistant' as const : 
              'assistant' as const,
        timestamp: new Date(msg.createdAt)
      }
    })
  }, [messages])

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
      {/* Info Bar */}
      <div className="mt-6 bg-ods-card border border-ods-border rounded-md p-4 flex items-center gap-4">
        {/* Organization */}
        <div className="flex items-center gap-4 flex-1">
          <div className="w-8 h-8 bg-ods-bg-surface rounded flex items-center justify-center">
            <span className="text-ods-text-secondary text-sm">P</span>
          </div>
          <div className="flex flex-col">
            <span className="font-['DM_Sans'] font-medium text-[18px] text-ods-text-primary">
              {/* Organization name not in schema; placeholder */}
              {'Organization'}
            </span>
            <span className="font-['DM_Sans'] font-medium text-[14px] text-ods-text-secondary">
              {'Type'}
            </span>
          </div>
        </div>

        {/* Device */}
        <div className="flex items-center gap-4 flex-1">
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="font-['DM_Sans'] font-medium text-[18px] text-ods-text-primary">
                {/* Device name not in schema; show owner machineId if present */}
                {'device'}
              </span>
              <Monitor className="h-4 w-4 text-ods-text-secondary" />
            </div>
            <span className="font-['DM_Sans'] font-medium text-[14px] text-ods-text-secondary">
              Device
            </span>
          </div>
        </div>

        {/* SLA Countdown */}
        <div className="flex flex-col flex-1">
          <span className="font-['DM_Sans'] font-medium text-[18px] text-error">
            {/* SLA countdown not in schema; placeholder */}
            {'--:--:--'}
          </span>
          <span className="font-['DM_Sans'] font-medium text-[14px] text-ods-text-secondary">
            SLA Countdown
          </span>
        </div>

        {/* Status */}
        <div className="flex items-center">
          {dialog.status === 'RESOLVED' ? (
            <StatusTag
              label="RESOLVED"
            />
          ) : (
            <StatusTag
              label={dialog.status.replace('_', ' ')}
              variant={
                dialog.status === 'ACTIVE' ? 'success' :
                dialog.status === 'ACTION_REQUIRED' ? 'warning' :
                dialog.status === 'ON_HOLD' ? 'error' : 'info'
              }
            />
          )}
        </div>
      </div>

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
              autoScroll
              showAvatars={false}
              isTyping={messagesLoading}
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

          {/* Input */}
          <div className="mt-3">
            <ChatInput
              placeholder={isPaused ? 'Type your message...' : 'You should pause Fae to Start Direct Chat'}
              sending={!isPaused}
              onSend={handleSendMessage}
              reserveAvatarOffset={false}
              className="!mx-0 max-w-none"
            />
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