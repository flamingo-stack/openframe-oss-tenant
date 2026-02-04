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
import { useMingoChat } from './hooks/use-mingo-chat'
import { useMingoRealtimeSubscription, DialogSubscription } from './hooks/use-mingo-realtime-subscription'
import { useMingoMessagesStore } from './stores/mingo-messages-store'

export default function Mingo() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const {
    activeDialogId,
    setActiveDialogId,
    resetUnread,
    incrementUnread,
  } = useMingoMessagesStore()

  const {
    isCreatingDialog: legacyCreatingDialog,
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
    rawMessagesCount,
    handleApprove,
    handleReject,
    approvalStatuses
  } = useMingoDialogSelection()

  const {
    messages: processedMessages,
    createDialog,
    sendMessage,
    approvals: pendingApprovals,
    processChunk,
    isCreatingDialog,
    isTyping,
    assistantType
  } = useMingoChat(activeDialogId, {
    handleApprove,
    handleReject,
    approvalStatuses
  })

  const {
    subscribeToDialog,
    subscribedDialogs
  } = useMingoRealtimeSubscription(activeDialogId)

  const createDialogChunkProcessor = useCallback((targetDialogId: string, chunk: ChunkData, messageType: NatsMessageType) => {
    if (targetDialogId !== activeDialogId) {
      incrementUnread(targetDialogId)
    }
    
    processChunk(targetDialogId, chunk, messageType)
  }, [activeDialogId, incrementUnread, processChunk])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && activeDialogId) {
        const currentUrl = new URL(window.location.href)
        currentUrl.searchParams.delete('dialogId')
        router.replace(currentUrl.pathname + currentUrl.search, { scroll: false })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeDialogId, router])

  useEffect(() => {
    if (!isSaasTenantMode()) {
      router.replace('/dashboard')
      return
    }
  }, [router])

  const handleDialogSelect = useCallback(async (dialogId: string) => {
    if (dialogId === activeDialogId) return

    const currentUrl = new URL(window.location.href)
    currentUrl.searchParams.set('dialogId', dialogId)
    router.replace(currentUrl.pathname + currentUrl.search, { scroll: false })
    
    setActiveDialogId(dialogId)
    resetUnread(dialogId)
    subscribeToDialog(dialogId)
    
    selectDialog(dialogId)
  }, [activeDialogId, router, setActiveDialogId, resetUnread, subscribeToDialog, selectDialog])

  useEffect(() => {
    const urlDialogId = searchParams.get('dialogId')
    
    if (urlDialogId !== activeDialogId) {
      if (urlDialogId) {
        setActiveDialogId(urlDialogId)
        resetUnread(urlDialogId)
        subscribeToDialog(urlDialogId)
        selectDialog(urlDialogId)
      } else {
        setActiveDialogId(null)
      }
    }
  }, [searchParams])

  const handleNewChat = useCallback(async () => {
    resetDialog()
    const newDialogId = await createDialog()
    if (newDialogId) {
      handleDialogSelect(newDialogId)
    }
  }, [resetDialog, createDialog, handleDialogSelect])

  const handleSendMessage = useCallback(async (message: string) => {
    if (!activeDialogId || !message.trim()) return
    
    const success = await sendMessage(message.trim())
    if (!success) {
      console.warn('[Mingo] Failed to send message')
    }
  }, [activeDialogId, sendMessage])

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
          Simplified NATS Subscriptions with multi-topic support
          
          Key improvements:
          1. Single DialogSubscription component per subscribed dialog
          2. Multi-topic support (message + admin-message)
          3. Automatic connection sharing via core hooks
          4. Proper background dialog handling with unread counts
        */}
        {Array.from(subscribedDialogs).map(dialogId => (
          <DialogSubscription
            key={dialogId}
            dialogId={dialogId}
            isActive={dialogId === activeDialogId}
            processChunk={createDialogChunkProcessor}
          />
        ))}

        <div className="flex h-full w-full">
          {/* Sidebar with dialog list */}
          <ChatSidebar
            onNewChat={handleNewChat}
            isCreatingDialog={isCreatingDialog}
            onDialogSelect={handleDialogSelect}
            dialogs={dialogs}
            activeDialogId={activeDialogId || undefined}
            isLoading={isLoadingDialogs}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            onLoadMore={fetchNextPage}
            className="flex-shrink-0"
          />

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 m-4 mb-2 flex flex-col min-h-0">
              {activeDialogId ? (
                <ChatMessageList
                  messages={processedMessages}
                  dialogId={activeDialogId}
                  isTyping={isTyping}
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
            {activeDialogId && (
              <div className="flex-shrink-0 px-6 pb-4">
                <ChatInput
                  reserveAvatarOffset={false}
                  placeholder="Enter your Request..."
                  onSend={handleSendMessage}
                  sending={isTyping}
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
