'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  ChevronLeft,
  MoreHorizontal,
  Clock,
  CheckCircle,
  Pause,
  Send,
  Monitor
} from 'lucide-react'
import { MessageCircleIcon } from '@flamingo/ui-kit'
import { Button } from '@flamingo/ui-kit'
import { DetailLoader } from '@flamingo/ui-kit/components/ui'
import { mockDialogDetails, type DialogDetails, type DialogMessage } from '../data/mock-dialog-details'

export function DialogDetailsView({ dialogId }: { dialogId: string }) {
  const router = useRouter()
  const [dialog, setDialog] = useState<DialogDetails | null>(null)
  const [messageInput, setMessageInput] = useState('')
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    setDialog(mockDialogDetails)
    setIsPaused(mockDialogDetails.isFaePaused)
  }, [dialogId])

  const handleSendMessage = () => {
    if (messageInput.trim() && isPaused) {
      console.log('Sending message:', messageInput)
      setMessageInput('')
    }
  }

  const handlePauseFae = () => {
    setIsPaused(!isPaused)
  }

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
    <div className="flex flex-col h-full bg-ods-bg">
      {/* Header */}
      <div className="bg-ods-bg px-6 pt-6 pb-0">
        <div className="flex gap-4 items-end justify-between">
          {/* Title Block */}
          <div className="flex-1 flex flex-col gap-2">
            <Button variant="ghost"
              onClick={() => router.push('/mingo')}
              className="text-ods-text-secondary hover:text-ods-text-primary transition-colors py-3"
              leftIcon={<ChevronLeft className="h-6 w-6" />}
            >
              <span className="font-['DM_Sans'] font-medium text-[18px] leading-[24px]">
                Back to Chats
              </span>
            </Button>
            <h1 className="font-['Azeret_Mono'] font-semibold text-[32px] leading-[40px] text-ods-text-primary tracking-[-0.64px]">
              {dialog.topic}
            </h1>
            <p className="font-['DM_Sans'] font-medium text-[18px] leading-[24px] text-ods-text-secondary">
              2 hours left
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 items-center">
            <Button
              variant="ghost"
              className="bg-ods-card border border-ods-border rounded-md p-3 hover:bg-ods-bg-hover transition-colors"
              leftIcon={<MoreHorizontal className="h-6 w-6 text-ods-text-primary" />}
            />
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
        </div>

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
      </div>

      {/* Chat Section */}
      <div className="flex-1 flex gap-6 p-6 overflow-hidden">
        {/* Client Chat */}
        <div className="flex-1 flex flex-col gap-1">
          <h2 className="font-['Azeret_Mono'] font-medium text-[14px] text-ods-text-secondary uppercase tracking-[-0.28px] mb-2">
            Client Chat
          </h2>
          <div className="flex-1 bg-ods-bg border border-ods-border rounded-md flex flex-col">
            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {dialog.clientMessages.map((message) => (
                <div key={message.id} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className={`font-['Azeret_Mono'] font-medium text-[18px] ${
                      message.sender === 'fae' ? 'text-ods-flamingo-pink-base' : 'text-ods-text-secondary'
                    }`}>
                      {message.senderName}:
                    </span>
                    <span className="font-['DM_Sans'] font-medium text-[14px] text-ods-text-secondary">
                      {message.timestamp}
                    </span>
                  </div>
                  <p className="font-['DM_Sans'] font-medium text-[18px] text-ods-text-primary">
                    {message.content}
                  </p>
                </div>
              ))}
            </div>

            {/* Pause Fae Button */}
            {!isPaused && (
              <div className="absolute top-4 right-4">
                <Button variant="ghost"
                  onClick={handlePauseFae}
                  className="bg-ods-card border border-ods-border rounded-md px-4 py-3 flex items-center gap-2 hover:bg-ods-bg-hover transition-colors"
                >
                  <Pause className="h-6 w-6 text-ods-text-primary" />
                  <span className="font-['DM_Sans'] font-bold text-[18px] text-ods-text-primary tracking-[-0.36px]">
                    Pause Fae
                  </span>
                </Button>
              </div>
            )}

            {/* Input */}
            <div className="p-3">
              <div className="bg-ods-bg border border-ods-border rounded-md flex items-center px-3 py-3 gap-2">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder={isPaused ? "Type your message..." : "You should pause Fae to Start Direct Chat"}
                  disabled={!isPaused}
                  className="flex-1 bg-transparent font-['DM_Sans'] font-medium text-[18px] text-ods-text-primary placeholder:text-ods-text-disabled focus:outline-none disabled:cursor-not-allowed"
                />
                <Button variant="ghost" 
                  onClick={handleSendMessage}
                  disabled={!isPaused || !messageInput.trim()}
                  className="text-ods-text-secondary hover:text-ods-text-primary disabled:text-ods-text-disabled disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="h-6 w-6" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Technician Chat */}
        <div className="flex-1 flex flex-col gap-1">
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
                <br />
                You can still pause Fae and start a direct chat with the user.
              </p>
              <Button variant="ghost"
                onClick={handlePauseFae}
                className="bg-ods-card border border-ods-border rounded-md px-4 py-3 flex items-center gap-2 hover:bg-ods-bg-hover transition-colors"
              >
                <MessageCircleIcon className="h-6 w-6 text-ods-text-primary" />
                <span className="font-['DM_Sans'] font-bold text-[18px] text-ods-text-primary tracking-[-0.36px]">
                  Pause Fae and Start Direct Chat
                </span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}