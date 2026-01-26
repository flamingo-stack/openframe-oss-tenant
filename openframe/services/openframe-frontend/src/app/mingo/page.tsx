'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useCallback, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '../components/app-layout'
import { 
  ChatMessageList, 
  ContentPageContainer,
  type ChunkData,
  type NatsMessageType,
} from '@flamingo-stack/openframe-frontend-core'
import {
  ChatSidebar,
  ChatInput
} from '@flamingo-stack/openframe-frontend-core'
import { isSaasTenantMode } from '@lib/app-mode'
import { useMingoDialog } from './hooks/use-mingo-dialog'
import { useMingoDialogs } from './hooks/use-mingo-dialogs'
import { useMingoDialogSelection } from './hooks/use-mingo-dialog-selection'
import { useProcessedMessages } from './hooks/use-processed-messages'
import { useMingoRealtimeProcessor } from './hooks/use-mingo-realtime-processor'
import { useMingoDialogDetailsStore } from './stores/mingo-dialog-details-store'
import { useMingoBackgroundMessagesStore } from './stores/mingo-background-messages-store'
import { DialogNatsSubscription } from './components/dialog-nats-subscription'
import type { Message } from './types'

export default function Mingo() {
  const router = useRouter()
  const [subscribedDialogIds, setSubscribedDialogIds] = useState<string[]>([])
  
  const {
    isCreatingDialog,
    isSendingMessage,
    createDialog,
    sendMessage,
    resetDialog
  } = useMingoDialog()

  const {
    dialogs,
    isLoading: isLoadingDialogs
  } = useMingoDialogs()

  const {
    selectDialog,
    isLoadingDialog,
    isLoadingMessages
  } = useMingoDialogSelection()

  const {
    currentDialogId,
    isAdminChatTyping,
    addRealtimeMessage,
    setTypingIndicator,
    clearCurrent,
    addAdminMessages
  } = useMingoDialogDetailsStore()

  const {
    setActiveDialogId,
    incrementUnreadCount,
    resetUnreadCount,
    setBackgroundTyping,
    initializeDialog,
    moveBackgroundToActive,
  } = useMingoBackgroundMessagesStore()

  const {
    messages: processedMessages,
    pendingApprovals,
    assistantType: mingoAssistantType
  } = useProcessedMessages()

  const { processChunk } = useMingoRealtimeProcessor({
    activeDialogId: currentDialogId,
    onActiveStreamStart: () => {
      setTypingIndicator(true)
    },
    onActiveStreamEnd: () => {
      setTypingIndicator(false)
    },
    onActiveError: (error: string) => {
      setTypingIndicator(false)
      console.error('[Mingo] Active dialog error:', error)
    },
    onBackgroundStreamStart: (dialogId: string) => {
      setBackgroundTyping(dialogId, true)
    },
    onBackgroundStreamEnd: (dialogId: string) => {
      setBackgroundTyping(dialogId, false)
    },
    onBackgroundUnreadIncrement: (dialogId: string) => {
      incrementUnreadCount(dialogId)
    },
  })

  const handleChunkReceived = useCallback((dialogId: string, chunk: ChunkData, messageType: NatsMessageType) => {
    processChunk(chunk, messageType, dialogId)
  }, [processChunk])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && currentDialogId) {
        clearCurrent()
        setActiveDialogId(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentDialogId, clearCurrent, setActiveDialogId])

  useEffect(() => {
    if (!isSaasTenantMode()) {
      router.replace('/dashboard')
      return
    }
  }, [router])

  const handleDialogSelect = useCallback(async (dialogId: string) => {
    if (dialogId === currentDialogId) return

    initializeDialog(dialogId)
    resetUnreadCount(dialogId)
    clearCurrent()
    setActiveDialogId(dialogId)
    setSubscribedDialogIds(prev => {
      if (prev.includes(dialogId)) {
        return prev
      }
      return [...prev, dialogId]
    })
    selectDialog(dialogId)
    
    const backgroundMessages = moveBackgroundToActive(dialogId)
    if (backgroundMessages.length > 0) {
      addAdminMessages(backgroundMessages)
    }
  }, [
    currentDialogId,
    initializeDialog,
    resetUnreadCount,
    clearCurrent,
    setActiveDialogId,
    selectDialog,
    moveBackgroundToActive,
    addAdminMessages
  ])

  const handleNewChat = useCallback(async () => {
    resetDialog()
    const newDialogId = await createDialog()
    if (newDialogId) {
      handleDialogSelect(newDialogId)
    }
  }, [resetDialog, createDialog, handleDialogSelect])

  const handleSendMessage = useCallback(async (message: string) => {
    if (!currentDialogId || !message.trim()) return

    const optimisticMessage: Message = {
      id: `optimistic-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      dialogId: currentDialogId,
      chatType: 'ADMIN_AI_CHAT',
      dialogMode: 'DEFAULT',
      createdAt: new Date().toISOString(),
      owner: {
        type: 'ADMIN'
      },
      messageData: {
        type: 'TEXT',
        text: message.trim()
      }
    }

    addRealtimeMessage(optimisticMessage)
    const success = await sendMessage(message, currentDialogId)
    
    if (!success) {
      console.warn('[Mingo] Failed to send message')
    }
  }, [sendMessage, currentDialogId, addRealtimeMessage])

  if (!isSaasTenantMode()) {
    return null
  }

  return (
    <AppLayout mainClassName="p-0">
      <ContentPageContainer
        padding="none"
        showHeader={false}
        className="h-full"
        contentClassName="h-full flex flex-col"
      >
        {/* 
          NATS Subscriptions - one component per subscribed dialog
          
          Key behaviors:
          1. Each dialog gets its own subscription component
          2. Subscriptions PERSIST when switching dialogs (component stays mounted)
          3. All subscriptions share the same NATS websocket connection URL
             (connection sharing is handled by the core NATS library)
          4. Chunks from background dialogs update unread counts
        */}
        {subscribedDialogIds.map(dialogId => (
          <DialogNatsSubscription
            key={dialogId}
            dialogId={dialogId}
            isActive={dialogId === currentDialogId}
            onChunkReceived={handleChunkReceived}
          />
        ))}

        <div className="flex h-full w-full">
          {/* Sidebar with dialog list */}
          <ChatSidebar
            onNewChat={handleNewChat}
            onDialogSelect={handleDialogSelect}
            dialogs={dialogs}
            activeDialogId={currentDialogId || undefined}
            isLoading={isLoadingDialogs}
            className="flex-shrink-0"
          />

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 m-4 mb-2 flex flex-col min-h-0">
              <ChatMessageList
                messages={processedMessages}
                dialogId={currentDialogId || undefined}
                isTyping={isAdminChatTyping}
                isLoading={isLoadingDialog || isLoadingMessages}
                assistantType={mingoAssistantType}
                pendingApprovals={pendingApprovals}
                showAvatars={false}
                autoScroll={true}
              />
            </div>

            {/* Message Input */}
            <div className="flex-shrink-0 px-6 pb-4">
              {currentDialogId ? (<ChatInput
                reserveAvatarOffset={false}
                placeholder="Enter your Request..."
                onSend={handleSendMessage}
                sending={isSendingMessage || isAdminChatTyping}
                disabled={isCreatingDialog}
                autoFocus={false}
                className="bg-ods-card rounded-lg"
              />) : <></>}
            </div>
          </div>
        </div>
      </ContentPageContainer>
    </AppLayout>
  )
}
