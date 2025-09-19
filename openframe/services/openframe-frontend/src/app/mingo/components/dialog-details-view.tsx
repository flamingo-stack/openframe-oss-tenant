'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { 
  ChevronLeft, 
  MoreHorizontal, 
  Clock, 
  CheckCircle, 
  Pause,
  MessageCircle,
  Send,
  Monitor
} from 'lucide-react'
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
    return <div className="flex items-center justify-center h-full text-[#888888]">Loading...</div>
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-[#2e461f] text-[#5ea62e]'
      case 'ON_HOLD':
        return 'bg-yellow-900/20 text-yellow-400'
      case 'TECH_REQUIRED':
        return 'bg-red-900/20 text-red-400'
      case 'RESOLVED':
        return 'bg-green-900/20 text-green-400'
      default:
        return 'bg-gray-900/20 text-gray-400'
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#161616]">
      {/* Header */}
      <div className="bg-[#161616] px-6 pt-6 pb-0">
        <div className="flex gap-4 items-end justify-between">
          {/* Title Block */}
          <div className="flex-1 flex flex-col gap-2">
            <button
              onClick={() => router.push('/mingo')}
              className="inline-flex items-center gap-2 text-[#888888] hover:text-[#fafafa] transition-colors py-3"
            >
              <ChevronLeft className="h-6 w-6" />
              <span className="font-['DM_Sans'] font-medium text-[18px] leading-[24px]">
                Back to Chats
              </span>
            </button>
            <h1 className="font-['Azeret_Mono'] font-semibold text-[32px] leading-[40px] text-[#fafafa] tracking-[-0.64px]">
              {dialog.topic}
            </h1>
            <p className="font-['DM_Sans'] font-medium text-[18px] leading-[24px] text-[#888888]">
              2 hours left
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 items-center">
            <button className="bg-[#212121] border border-[#3a3a3a] rounded-md p-3 hover:bg-[#2a2a2a] transition-colors">
              <MoreHorizontal className="h-6 w-6 text-[#fafafa]" />
            </button>
            <button className="bg-[#212121] border border-[#3a3a3a] rounded-md px-4 py-3 flex items-center gap-2 hover:bg-[#2a2a2a] transition-colors">
              <Clock className="h-6 w-6 text-[#fafafa]" />
              <span className="font-['DM_Sans'] font-bold text-[18px] text-[#fafafa] tracking-[-0.36px]">
                Put On Hold
              </span>
            </button>
            <button className="bg-[#212121] border border-[#3a3a3a] rounded-md px-4 py-3 flex items-center gap-2 hover:bg-[#2a2a2a] transition-colors">
              <CheckCircle className="h-6 w-6 text-[#fafafa]" />
              <span className="font-['DM_Sans'] font-bold text-[18px] text-[#fafafa] tracking-[-0.36px]">
                Resolve
              </span>
            </button>
          </div>
        </div>

        {/* Info Bar */}
        <div className="mt-6 bg-[#212121] border border-[#3a3a3a] rounded-md p-4 flex items-center gap-4">
          {/* Organization */}
          <div className="flex items-center gap-4 flex-1">
            <div className="w-8 h-8 bg-[#3a3a3a] rounded flex items-center justify-center">
              <span className="text-[#888888] text-sm">P</span>
            </div>
            <div className="flex flex-col">
              <span className="font-['DM_Sans'] font-medium text-[18px] text-[#fafafa]">
                {dialog.organization.name}
              </span>
              <span className="font-['DM_Sans'] font-medium text-[14px] text-[#888888]">
                {dialog.organization.type}
              </span>
            </div>
          </div>

          {/* Device */}
          <div className="flex items-center gap-4 flex-1">
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <span className="font-['DM_Sans'] font-medium text-[18px] text-[#fafafa]">
                  {dialog.device.name}
                </span>
                <Monitor className="h-4 w-4 text-[#888888]" />
              </div>
              <span className="font-['DM_Sans'] font-medium text-[14px] text-[#888888]">
                Device
              </span>
            </div>
          </div>

          {/* SLA Countdown */}
          <div className="flex flex-col flex-1">
            <span className="font-['DM_Sans'] font-medium text-[18px] text-[#f36666]">
              {dialog.slaCountdown}
            </span>
            <span className="font-['DM_Sans'] font-medium text-[14px] text-[#888888]">
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
          <h2 className="font-['Azeret_Mono'] font-medium text-[14px] text-[#888888] uppercase tracking-[-0.28px] mb-2">
            Client Chat
          </h2>
          <div className="flex-1 bg-[#161616] border border-[#3a3a3a] rounded-md flex flex-col">
            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {dialog.clientMessages.map((message) => (
                <div key={message.id} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className={`font-['Azeret_Mono'] font-medium text-[18px] ${
                      message.sender === 'fae' ? 'text-[#f357bb]' : 'text-[#888888]'
                    }`}>
                      {message.senderName}:
                    </span>
                    <span className="font-['DM_Sans'] font-medium text-[14px] text-[#888888]">
                      {message.timestamp}
                    </span>
                  </div>
                  <p className="font-['DM_Sans'] font-medium text-[18px] text-[#fafafa]">
                    {message.content}
                  </p>
                </div>
              ))}
            </div>

            {/* Pause Fae Button */}
            {!isPaused && (
              <div className="absolute top-4 right-4">
                <button
                  onClick={handlePauseFae}
                  className="bg-[#212121] border border-[#3a3a3a] rounded-md px-4 py-3 flex items-center gap-2 hover:bg-[#2a2a2a] transition-colors"
                >
                  <Pause className="h-6 w-6 text-[#fafafa]" />
                  <span className="font-['DM_Sans'] font-bold text-[18px] text-[#fafafa] tracking-[-0.36px]">
                    Pause Fae
                  </span>
                </button>
              </div>
            )}

            {/* Input */}
            <div className="p-3">
              <div className="bg-[#161616] border border-[#3a3a3a] rounded-md flex items-center px-3 py-3 gap-2">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder={isPaused ? "Type your message..." : "You should pause Fae to Start Direct Chat"}
                  disabled={!isPaused}
                  className="flex-1 bg-transparent font-['DM_Sans'] font-medium text-[18px] text-[#fafafa] placeholder:text-[#3a3a3a] focus:outline-none disabled:cursor-not-allowed"
                />
                <button 
                  onClick={handleSendMessage}
                  disabled={!isPaused || !messageInput.trim()}
                  className="text-[#888888] hover:text-[#fafafa] disabled:text-[#3a3a3a] disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="h-6 w-6" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Technician Chat */}
        <div className="flex-1 flex flex-col gap-1">
          <h2 className="font-['Azeret_Mono'] font-medium text-[14px] text-[#888888] uppercase tracking-[-0.28px] mb-2">
            Technician Chat
          </h2>
          <div className="flex-1 bg-[#212121] border border-[#3a3a3a] rounded-md flex flex-col items-center justify-center p-8">
            {/* Empty State */}
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 flex items-center justify-center">
                  <MessageCircle className="h-8 w-8 text-[#888888]" />
                </div>
              </div>
              <p className="font-['DM_Sans'] font-medium text-[14px] text-[#888888] max-w-xs">
                This chat has not yet required technician involved.
                <br />
                You can still pause Fae and start a direct chat with the user.
              </p>
              <button
                onClick={handlePauseFae}
                className="bg-[#212121] border border-[#3a3a3a] rounded-md px-4 py-3 flex items-center gap-2 hover:bg-[#2a2a2a] transition-colors"
              >
                <MessageCircle className="h-6 w-6 text-[#fafafa]" />
                <span className="font-['DM_Sans'] font-bold text-[18px] text-[#fafafa] tracking-[-0.36px]">
                  Pause Fae and Start Direct Chat
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}