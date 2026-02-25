'use client';

export const dynamic = 'force-dynamic';

import {
  ChatInput,
  ChatMessageList,
  ChatSidebar,
  ContentPageContainer,
  MingoIcon,
} from '@flamingo-stack/openframe-frontend-core';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { isSaasTenantMode } from '@/lib/app-mode';
import { AppLayout } from '../components/app-layout';
import { useMingoChat } from './hooks/use-mingo-chat';
import { useMingoDialog } from './hooks/use-mingo-dialog';
import { useMingoDialogSelection } from './hooks/use-mingo-dialog-selection';
import { useMingoDialogs } from './hooks/use-mingo-dialogs';
import { DialogSubscription, useMingoRealtimeSubscription } from './hooks/use-mingo-realtime-subscription';
import { useMingoMessagesStore } from './stores/mingo-messages-store';

export default function Mingo() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isDraftChat, setIsDraftChat] = useState(false);

  const { activeDialogId, setActiveDialogId, resetUnread, addMessage } = useMingoMessagesStore();

  const { resetDialog } = useMingoDialog();

  const { dialogs, isLoading: isLoadingDialogs, hasNextPage, fetchNextPage, isFetchingNextPage } = useMingoDialogs();

  const {
    selectDialog,
    isLoadingDialog,
    isLoadingMessages,
    isSelectingDialog,
    handleApprove,
    handleReject,
    approvalStatuses,
  } = useMingoDialogSelection();

  const {
    messages: processedMessages,
    createDialog,
    sendMessage,
    approvals: pendingApprovals,
    isCreatingDialog,
    isTyping,
    assistantType,
  } = useMingoChat(activeDialogId);

  const { subscribeToDialog, subscribedDialogs } = useMingoRealtimeSubscription(activeDialogId);

  const draftWelcomeMessages = useMemo(
    () => [
      {
        id: 'welcome-draft',
        role: 'assistant' as const,
        name: 'Mingo',
        content: "Hi! I'm Mingo AI, ready to help with your technical tasks. What can I do for you?",
        assistantType: 'mingo' as const,
        timestamp: new Date(),
      },
    ],
    [],
  );

  const isAnyLoading = isLoadingDialog || isLoadingMessages || isSelectingDialog;

  const displayMessages = useMemo(() => {
    if (isDraftChat) return draftWelcomeMessages;

    if (activeDialogId && processedMessages.length === 0 && !isAnyLoading) {
      return draftWelcomeMessages;
    }

    return processedMessages;
  }, [isDraftChat, activeDialogId, processedMessages, isAnyLoading, draftWelcomeMessages]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isDraftChat) {
          setIsDraftChat(false);
        } else if (activeDialogId) {
          const currentUrl = new URL(window.location.href);
          currentUrl.searchParams.delete('dialogId');
          router.replace(currentUrl.pathname + currentUrl.search, { scroll: false });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDialogId, isDraftChat, router]);

  useEffect(() => {
    if (!isSaasTenantMode()) {
      router.replace('/dashboard');
      return;
    }
  }, [router]);

  const handleDialogSelect = useCallback(
    async (dialogId: string) => {
      if (dialogId === activeDialogId) return;

      setIsDraftChat(false);

      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('dialogId', dialogId);
      router.replace(currentUrl.pathname + currentUrl.search, { scroll: false });

      setActiveDialogId(dialogId);
      resetUnread(dialogId);
      subscribeToDialog(dialogId);

      selectDialog(dialogId);
    },
    [activeDialogId, router, setActiveDialogId, resetUnread, subscribeToDialog, selectDialog],
  );

  useEffect(() => {
    const urlDialogId = searchParams.get('dialogId');

    if (urlDialogId !== activeDialogId) {
      if (urlDialogId) {
        setIsDraftChat(false);
        setActiveDialogId(urlDialogId);
        resetUnread(urlDialogId);
        subscribeToDialog(urlDialogId);
        selectDialog(urlDialogId);
      } else {
        setActiveDialogId(null);
      }
    }
  }, [searchParams, activeDialogId, resetUnread, selectDialog, setActiveDialogId, subscribeToDialog]);

  const handleNewChat = useCallback(() => {
    resetDialog();
    setActiveDialogId(null);
    setIsDraftChat(true);

    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.delete('dialogId');
    router.replace(currentUrl.pathname + currentUrl.search, { scroll: false });
  }, [resetDialog, setActiveDialogId, router]);

  const handleSendMessage = useCallback(
    async (message: string) => {
      if (!message.trim()) return;

      if (isDraftChat) {
        const newDialogId = await createDialog();
        if (!newDialogId) return;

        addMessage(newDialogId, {
          id: `welcome-${newDialogId}`,
          role: 'assistant',
          name: 'Mingo',
          timestamp: new Date(),
          content: "Hi! I'm Mingo AI, ready to help with your technical tasks. What can I do for you?",
          assistantType: 'mingo',
        });

        setIsDraftChat(false);
        setActiveDialogId(newDialogId);
        resetUnread(newDialogId);
        subscribeToDialog(newDialogId);

        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('dialogId', newDialogId);
        router.replace(currentUrl.pathname + currentUrl.search, { scroll: false });

        const success = await sendMessage(message.trim(), newDialogId);
        if (!success) {
          console.warn('[Mingo] Failed to send message');
        }
        return;
      }

      if (!activeDialogId) return;

      const success = await sendMessage(message.trim());
      if (!success) {
        console.warn('[Mingo] Failed to send message');
      }
    },
    [
      isDraftChat,
      activeDialogId,
      createDialog,
      sendMessage,
      setActiveDialogId,
      resetUnread,
      subscribeToDialog,
      router,
      addMessage,
    ],
  );

  if (!isSaasTenantMode()) {
    return null;
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
          NATS Subscriptions and per-dialog message processor
        */}
        {Array.from(subscribedDialogs).map(dialogId => (
          <DialogSubscription
            key={dialogId}
            dialogId={dialogId}
            isActive={dialogId === activeDialogId}
            onApprove={handleApprove}
            onReject={handleReject}
            approvalStatuses={approvalStatuses}
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
              {activeDialogId || isDraftChat ? (
                <ChatMessageList
                  messages={displayMessages}
                  dialogId={activeDialogId || 'draft'}
                  isTyping={isDraftChat ? false : isTyping}
                  isLoading={!isDraftChat && isAnyLoading && processedMessages.length === 0}
                  assistantType={assistantType}
                  pendingApprovals={isDraftChat ? [] : pendingApprovals}
                  showAvatars={false}
                  autoScroll={true}
                />
              ) : (
                /* Empty state when no dialog is selected */
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                  <div className="text-center space-y-6">
                    <div className="space-y-4">
                      <div className="flex justify-center">
                        <MingoIcon
                          className="w-10 h-10"
                          eyesColor="var(--ods-flamingo-cyan-base)"
                          cornerColor="var(--ods-flamingo-cyan-base)"
                        />
                      </div>
                      <h1 className="font-['DM_Sans'] font-bold text-2xl text-ods-text-primary">Hi! I'm Mingo AI</h1>
                      <p className="font-['DM_Sans'] font-medium text-base text-ods-text-secondary leading-relaxed">
                        Ready to help with your technical tasks. Start a new conversation to get started.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Message Input */}
            {(activeDialogId || isDraftChat) && (
              <div className="flex-shrink-0 px-6 pb-4">
                <ChatInput
                  reserveAvatarOffset={false}
                  placeholder="Enter your Request..."
                  onSend={handleSendMessage}
                  sending={isTyping || isCreatingDialog || isSelectingDialog}
                  autoFocus={isDraftChat}
                  className="bg-ods-card rounded-lg"
                />
              </div>
            )}
          </div>
        </div>
      </ContentPageContainer>
    </AppLayout>
  );
}
