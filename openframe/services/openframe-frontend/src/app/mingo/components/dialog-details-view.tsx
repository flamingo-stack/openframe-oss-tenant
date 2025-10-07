'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  Clock,
  CheckCircle,
  Monitor
} from 'lucide-react'
import { MessageCircleIcon, ChatMessageList, ChatInput, DetailPageContainer } from '@flamingo/ui-kit'
import { Button } from '@flamingo/ui-kit'
import { DetailLoader } from '@flamingo/ui-kit/components/ui'
import { mockDialogDetails, type DialogDetails } from '../data/mock-dialog-details'

export function DialogDetailsView({ dialogId }: { dialogId: string }) {
  const router = useRouter()
  const [dialog, setDialog] = useState<DialogDetails | null>(null)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    setDialog(mockDialogDetails)
    setIsPaused(mockDialogDetails.isFaePaused)
  }, [dialogId])

  const handleSendMessage = (text: string) => {
    if (!isPaused) return
    const message = text.trim()
    if (!message) return
    console.log('Sending message:', message)
  }

  const headerActions = (
    <div className="flex gap-4 items-center">
      <Button
        variant="ghost"
        className="bg-ods-card border border-ods-border rounded-md px-4 py-3 hover:bg-ods-bg-hover transition-colors"
        leftIcon={<Clock className="h-6 w-6 text-ods-text-primary" />}
      >
        <span className="font-['DM_Sans'] font-bold text-[18px] text-ods-text-primary tracking-[-0.36px]">
          Put On Hold
        </span>
      </Button>
      <Button
        variant="ghost"
        className="bg-ods-card border border-ods-border rounded-md px-4 py-3 hover:bg-ods-bg-hover transition-colors"
        leftIcon={<CheckCircle className="h-6 w-6 text-ods-text-primary" />}
      >
        <span className="font-['DM_Sans'] font-bold text-[18px] text-ods-text-primary tracking-[-0.36px]">
          Resolve
        </span>
      </Button>
    </div>
  )

  if (!dialog) {
    return <DetailLoader />
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-success text-success'
      case 'ON_HOLD':
        return 'bg-warning/20 text-warning'
      case 'TECH_REQUIRED':
        return 'bg-error/20 text-error'
      case 'RESOLVED':
        return 'bg-success/20 text-success'
      default:
        return 'bg-ods-bg-surface/20 text-ods-text-muted'
    }
  }

  return (
    <DetailPageContainer
      title={dialog.topic}
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
              {dialog.organization.name}
            </span>
            <span className="font-['DM_Sans'] font-medium text-[14px] text-ods-text-secondary">
              {dialog.organization.type}
            </span>
          </div>
        </div>

        {/* Device */}
        <div className="flex items-center gap-4 flex-1">
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="font-['DM_Sans'] font-medium text-[18px] text-ods-text-primary">
                {dialog.device.name}
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
            {dialog.slaCountdown}
          </span>
          <span className="font-['DM_Sans'] font-medium text-[14px] text-ods-text-secondary">
            SLA Countdown
          </span>
        </div>

        {/* Status */}
        <div className="flex items-center">
          <div className={`px-2 py-2 rounded-md ${getStatusColor(dialog.status)}`}>
            <span className="font-['Azeret_Mono'] font-medium text-[14px] uppercase tracking-[-0.28px]">
              {dialog.status.replace('_', ' ')}
            </span>
          </div>
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
              messages={dialog.clientMessages.map(m => ({
                id: m.id,
                role: m.sender === 'user' ? 'user' : 'assistant',
                name: m.senderName,
                content: m.content,
                timestamp: new Date()
              }))}
              autoScroll
              showAvatars={false}
            />
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