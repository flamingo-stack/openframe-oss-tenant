'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useCallback, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AppLayout } from '../components/app-layout'
import { 
  ChatMessageList, 
  ContentPageContainer,
  MingoIcon,
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
  const searchParams = useSearchParams()
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
    isLoading: isLoadingDialogs,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage
  } = useMingoDialogs()

  const {
    selectDialog,
    isLoadingDialog,
    isLoadingMessages,
    isSelectingDialog,
    rawMessagesCount
  } = useMingoDialogSelection()

  const {
    currentDialogId,
    addRealtimeMessage,
    setDialogTyping,
    getDialogTyping,
    clearCurrent,
    removeWelcomeMessages
  } = useMingoDialogDetailsStore()

  const {
    setActiveDialogId,
    incrementUnreadCount,
    resetUnreadCount,
    setBackgroundTyping,
    initializeDialog,
    preserveStreamingMessage
  } = useMingoBackgroundMessagesStore()

  const {
    messages: processedMessages,
    pendingApprovals,
    assistantType
  } = useProcessedMessages()

  const isCurrentDialogTyping = currentDialogId ? getDialogTyping(currentDialogId) : false

  const { processChunk, getDialogStreamingMessage } = useMingoRealtimeProcessor({
    activeDialogId: currentDialogId,
    onActiveStreamStart: () => {
      if (currentDialogId) {
        setDialogTyping(currentDialogId, true)
      }
    },
    onActiveStreamEnd: () => {
      if (currentDialogId) {
        setDialogTyping(currentDialogId, false)
      }
    },
    onActiveError: (error: string) => {
      if (currentDialogId) {
        setDialogTyping(currentDialogId, false)
      }
      console.error('[Mingo] Active dialog error:', error)
    },
    onBackgroundStreamStart: (dialogId: string) => {
      setBackgroundTyping(dialogId, true)
      setDialogTyping(dialogId, true)
    },
    onBackgroundStreamEnd: (dialogId: string) => {
      setBackgroundTyping(dialogId, false)
      setDialogTyping(dialogId, false)
    },
    onBackgroundUnreadIncrement: (dialogId: string) => {
      incrementUnreadCount(dialogId)
    },
  })

  const handleChunkReceived = useCallback((dialogId: string, chunk: ChunkData, messageType: NatsMessageType) => {
    processChunk(chunk, messageType, dialogId)
  }, [processChunk])

  const createWelcomeMessage = useCallback((): Message => {
    if (!currentDialogId) throw new Error('No dialog ID')
    
    return {
      id: `welcome-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      dialogId: currentDialogId,
      chatType: 'ADMIN_AI_CHAT',
      dialogMode: 'DEFAULT',
      createdAt: new Date().toISOString(),
      owner: {
        type: 'ASSISTANT',
        model: 'mingo'
      },
      messageData: {
        type: 'TEXT',
        text: "Hi! I'm Mingo AI, ready to help with your technical tasks. What can I do for you?"
      }
    }
  }, [currentDialogId])

  const addWelcomeMessageIfNeeded = useCallback(() => {
    if (currentDialogId) {
      const welcomeMessage = createWelcomeMessage()
      addRealtimeMessage(welcomeMessage)
    }
  }, [currentDialogId, createWelcomeMessage, addRealtimeMessage])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && currentDialogId) {
        const currentUrl = new URL(window.location.href)
        currentUrl.searchParams.delete('dialogId')
        router.replace(currentUrl.pathname + currentUrl.search, { scroll: false })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentDialogId, router])

  useEffect(() => {
    if (!isSaasTenantMode()) {
      router.replace('/dashboard')
      return
    }
  }, [router])

  const selectDialogInternal = useCallback((dialogId: string) => {
    if (currentDialogId && currentDialogId !== dialogId) {
      const streamingMessage = getDialogStreamingMessage(currentDialogId)
      if (streamingMessage) {
        preserveStreamingMessage(currentDialogId, streamingMessage)
      }
    }

    initializeDialog(dialogId)
    resetUnreadCount(dialogId)
    setActiveDialogId(dialogId)
    
    setSubscribedDialogIds(prev => {
      if (prev.includes(dialogId)) {
        return prev
      }
      return [...prev, dialogId]
    })
    
    selectDialog(dialogId)
  }, [
    currentDialogId,
    getDialogStreamingMessage,
    preserveStreamingMessage,
    initializeDialog,
    resetUnreadCount,
    setActiveDialogId,
    selectDialog
  ])

  const handleDialogSelect = useCallback(async (dialogId: string) => {
    if (dialogId === currentDialogId) return

    const currentUrl = new URL(window.location.href)
    currentUrl.searchParams.set('dialogId', dialogId)
    router.replace(currentUrl.pathname + currentUrl.search, { scroll: false })

    selectDialogInternal(dialogId)
  }, [
    currentDialogId,
    router,
    selectDialogInternal
  ])

  useEffect(() => {
    const urlDialogId = searchParams.get('dialogId')
    if (urlDialogId && urlDialogId !== currentDialogId) {
      selectDialogInternal(urlDialogId)
    } else if (!urlDialogId && currentDialogId) {
      clearCurrent()
      setActiveDialogId(null)
    }
  }, [searchParams, currentDialogId, selectDialogInternal, clearCurrent, setActiveDialogId])

  useEffect(() => {
    if (currentDialogId && 
        !isLoadingDialog && 
        !isLoadingMessages && 
        !isSelectingDialog &&
        rawMessagesCount === 0) {
      addWelcomeMessageIfNeeded()
    }
  }, [currentDialogId, isLoadingDialog, isLoadingMessages, isSelectingDialog, rawMessagesCount, addWelcomeMessageIfNeeded])

  const handleNewChat = useCallback(async () => {
    resetDialog()
    const newDialogId = await createDialog()
    if (newDialogId) {
      handleDialogSelect(newDialogId)
    }
  }, [resetDialog, createDialog, handleDialogSelect])

  const handleSendMessage = useCallback(async (message: string) => {
    if (!currentDialogId || !message.trim()) return

    removeWelcomeMessages()

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
    
    const emptyAssistantMessage: Message = {
      id: `assistant-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      dialogId: currentDialogId,
      chatType: 'ADMIN_AI_CHAT',
      dialogMode: 'DEFAULT',
      createdAt: new Date().toISOString(),
      owner: {
        type: 'ASSISTANT',
        model: 'mingo'
      },
      messageData: {
        type: 'TEXT',
        text: ''
      }
    }
    
    addRealtimeMessage(emptyAssistantMessage)
    
    setDialogTyping(currentDialogId, true)
    
    const success = await sendMessage(message, currentDialogId)
    
    if (!success) {
      console.warn('[Mingo] Failed to send message')
      setDialogTyping(currentDialogId, false)
    }
  }, [sendMessage, currentDialogId, addRealtimeMessage, removeWelcomeMessages, setDialogTyping])

  if (!isSaasTenantMode()) {
    return null
  }

  return (
    <AppLayout mainClassName="p-0 sm:p-0">
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
            isCreatingDialog={isCreatingDialog}
            onDialogSelect={handleDialogSelect}
            dialogs={dialogs}
            activeDialogId={currentDialogId || undefined}
            isLoading={isLoadingDialogs}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            onLoadMore={fetchNextPage}
            className="flex-shrink-0"
          />

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 m-4 mb-2 flex flex-col min-h-0">
              {currentDialogId ? (
                <ChatMessageList
                  messages={processedMessages}
                  dialogId={currentDialogId}
                  isTyping={isCurrentDialogTyping}
                  isLoading={isLoadingDialog || isLoadingMessages || isSelectingDialog}
                  assistantType={assistantType}
                  pendingApprovals={pendingApprovals}
                  showAvatars={false}
                  autoScroll={true}
                />
              ) : (
                /* Welcome message when no dialog is selected */
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                  <div className="text-center space-y-6">
                    <div className="space-y-4">
                      <div className="flex justify-center">
                        <MingoIcon className="w-10 h-10" eyesColor='var(--ods-flamingo-cyan-base)' cornerColor='var(--ods-flamingo-cyan-base)'/>
                      </div>
                      <h1 className="font-['DM_Sans'] font-bold text-2xl text-ods-text-primary">
                        Hi! I'm Mingo AI
                      </h1>
                      <p className="font-['DM_Sans'] font-medium text-base text-ods-text-secondary leading-relaxed">
                        Ready to help with your technical tasks. Start a new conversation to get started.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Message Input - Only show when dialog is selected */}
            {currentDialogId && (
              <div className="flex-shrink-0 px-6 pb-4">
                <ChatInput
                  reserveAvatarOffset={false}
                  placeholder="Enter your Request..."
                  onSend={handleSendMessage}
                  sending={isSendingMessage || isCurrentDialogTyping}
                  disabled={isCreatingDialog || isSelectingDialog}
                  autoFocus={false}
                  className="bg-ods-card rounded-lg"
                />
              </div>
            )}
          </div>
        </div>
      </ContentPageContainer>
    </AppLayout>
  )
}
