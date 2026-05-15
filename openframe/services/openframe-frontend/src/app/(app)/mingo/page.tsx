'use client';

export const dynamic = 'force-dynamic';

import type { ChatInputRef } from '@flamingo-stack/openframe-frontend-core';
import {
  ChatInput,
  ChatMessageList,
  ChatSidebar,
  ContentPageContainer,
  ModelDisplay,
  Skeleton,
} from '@flamingo-stack/openframe-frontend-core';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAiModelStatus } from '@/app/hooks/use-ai-model';
import { isSaasTenantMode } from '@/lib/app-mode';
import { useMingoChat } from './hooks/use-mingo-chat';
import { useMingoDialog } from './hooks/use-mingo-dialog';
import { useMingoDialogSelection } from './hooks/use-mingo-dialog-selection';
import { useMingoDialogs } from './hooks/use-mingo-dialogs';
import { DialogSubscription, useMingoRealtimeSubscription } from './hooks/use-mingo-realtime-subscription';
import { useMingoMessagesStore } from './stores/mingo-messages-store';

export default function Mingo() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { aiModel: initialAiModel, isLoading: isAiModelLoading } = useAiModelStatus();

  const [isDraftChat, setIsDraftChat] = useState(false);
  const [currentModel, setCurrentModel] = useState<{
    displayName: string;
    provider: string;
  } | null>(null);

  const chatInputRef = useRef<ChatInputRef>(null);

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
    dialogData,
    hasNextPage: hasNextMessagePage,
    fetchNextPage: fetchNextMessagePage,
    isFetchingNextPage: isFetchingNextMessagePage,
  } = useMingoDialogSelection();

  const setTokenUsage = useMingoMessagesStore(state => state.setTokenUsage);
  const tokenUsageByDialog = useMingoMessagesStore(state => state.tokenUsageByDialog);

  const {
    messages: processedMessages,
    createDialog,
    sendMessage,
    stopGeneration,
    approvals: pendingApprovals,
    isCreatingDialog,
    isTyping,
    isCompacting,
    assistantType,
  } = useMingoChat(activeDialogId);

  const { subscribeToDialog, subscribedDialogs, isDevTicketEnabled, onConnectionChange } =
    useMingoRealtimeSubscription(activeDialogId);

  useEffect(() => {
    if (activeDialogId && dialogData?.tokenUsage) {
      const u = dialogData.tokenUsage.find(t => t.chatType === 'ADMIN_AI_CHAT');
      if (u) {
        setTokenUsage(activeDialogId, {
          inputTokensSize: u.inputTokensSize ?? 0,
          outputTokensSize: u.outputTokensSize ?? 0,
          totalTokensSize: u.totalTokensSize ?? 0,
          contextSize: u.contextSize ?? 0,
        });
      }
    }
  }, [activeDialogId, dialogData?.tokenUsage, setTokenUsage]);

  // Resolve token usage synchronously: the store (kept live by realtime
  // `onTokenUsage` frames) is the source of truth, but on the first frame
  // after switching to a freshly fetched dialog the store hasn't been seeded
  // yet (the effect above runs post-paint), so fall back to the dialog query
  // result. Both hold identical numbers, so the store→query handoff is
  // invisible — this is what stops the "X/Y tokens used" tail from blinking
  // in and out on every dialog switch.
  const tokenUsage = useMemo(() => {
    if (!activeDialogId) return null;
    const cached = tokenUsageByDialog.get(activeDialogId);
    if (cached) return cached;
    const u = dialogData?.tokenUsage?.find(t => t.chatType === 'ADMIN_AI_CHAT');
    if (!u) return null;
    return {
      inputTokensSize: u.inputTokensSize ?? 0,
      outputTokensSize: u.outputTokensSize ?? 0,
      totalTokensSize: u.totalTokensSize ?? 0,
      contextSize: u.contextSize ?? 0,
    };
  }, [activeDialogId, tokenUsageByDialog, dialogData?.tokenUsage]);

  // Clear any unsent text when the active dialog changes. `activeDialogId`
  // only changes on a real switch (both selection paths guard against
  // re-selecting the same id), so a typed-but-unsent draft doesn't leak from
  // one conversation into another. Imperative `clear()` instead of a `key`
  // remount so we don't reintroduce the input flicker.
  // biome-ignore lint/correctness/useExhaustiveDependencies: activeDialogId is the trigger, not used in the body — clearing must run precisely when it changes.
  useEffect(() => {
    chatInputRef.current?.clear();
  }, [activeDialogId]);

  useEffect(() => {
    if (initialAiModel && !currentModel) {
      setCurrentModel(initialAiModel);
    }
  }, [initialAiModel, currentModel]);

  // The model is global config; per-dialog metadata only refines it. Falling
  // back to `initialAiModel` means we never have to null `currentModel` on
  // switch (which previously caused a 1-frame skeleton/empty flash).
  const displayModel = currentModel ?? initialAiModel;

  const handleMetadataUpdate = useCallback(
    (metadata: { modelDisplayName: string; modelName: string; providerName: string; contextWindow: number }) => {
      setCurrentModel({
        displayName: metadata.modelDisplayName,
        provider: metadata.providerName,
      });
    },
    [],
  );

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

  // Drives the composer's `sending` (which disables the textarea). It tracks
  // the message lifecycle only. `isSelectingDialog` is intentionally excluded:
  // it flips true→false for one tick on every dialog switch, and feeding that
  // into the textarea's `disabled` made the placeholder visibly jerk on each
  // switch. The message list still shows its own loader via `isAnyLoading`.
  const isComposerBusy = isTyping || isCompacting || isCreatingDialog || pendingApprovals.length > 0;

  // The store's `activeDialogId` is only populated by an effect after the first
  // render. Reading the dialog id from the URL synchronously during render lets
  // us decide what to show without waiting a frame, which is what previously
  // caused the empty-state logo to flash on navigation.
  const urlDialogId = searchParams.get('dialogId');

  // A dialog id is in the URL but the store hasn't caught up yet — show the
  // message list in its loading state instead of anything else.
  const isResolvingDialog = !activeDialogId && !isDraftChat && Boolean(urlDialogId);

  // There is no empty state anymore: with no dialog selected and none resolving
  // from the URL, `/mingo` defaults to a fresh "new chat" draft (welcome message
  // + focused input) instead of the standalone logo screen.
  const effectiveDraft = isDraftChat || (!activeDialogId && !urlDialogId);

  // Show the size-matched skeleton for the whole model/token row until the
  // active dialog's data has settled, so the row appears exactly once with the
  // correct model + token numbers instead of stepping through skeleton →
  // default model → tokens-pop-in on every switch. Gated on the react-query
  // `isLoading` (false for cached dialogs → instant, no flash), not the
  // one-tick `isSelectingDialog`.
  const isModelRowLoading =
    isResolvingDialog || (Boolean(activeDialogId) && isLoadingDialog) || (!displayModel && isAiModelLoading);

  const displayMessages = useMemo(() => {
    if (effectiveDraft) return draftWelcomeMessages;

    if (activeDialogId && processedMessages.length === 0 && !isAnyLoading) {
      return draftWelcomeMessages;
    }

    return processedMessages;
  }, [effectiveDraft, activeDialogId, processedMessages, isAnyLoading, draftWelcomeMessages]);

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
    if (isDraftChat) return;

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
  }, [searchParams, activeDialogId, isDraftChat, resetUnread, selectDialog, setActiveDialogId, subscribeToDialog]);

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

      if (effectiveDraft) {
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
      effectiveDraft,
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
    <ContentPageContainer padding="none" showHeader={false} className="h-full" contentClassName="h-full flex flex-col">
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
          isDevTicketEnabled={isDevTicketEnabled}
          onConnectionChange={onConnectionChange}
          onMetadata={dialogId === activeDialogId ? handleMetadataUpdate : undefined}
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
            <ChatMessageList
              messages={displayMessages}
              dialogId={activeDialogId || urlDialogId || 'draft'}
              isTyping={effectiveDraft ? false : isTyping}
              isLoading={isResolvingDialog || (!effectiveDraft && isAnyLoading && processedMessages.length === 0)}
              assistantType={assistantType}
              pendingApprovals={effectiveDraft ? [] : pendingApprovals}
              showAvatars={false}
              autoScroll={true}
              hasNextPage={effectiveDraft ? false : hasNextMessagePage}
              isFetchingNextPage={effectiveDraft ? false : isFetchingNextMessagePage}
              onLoadMore={effectiveDraft ? undefined : fetchNextMessagePage}
            />
          </div>

          {/* Message Input */}
          <div className="flex-shrink-0 px-6 pb-4">
            <ChatInput
              ref={chatInputRef}
              reserveAvatarOffset={false}
              placeholder="Enter your Request..."
              onSend={handleSendMessage}
              onStop={isTyping && !isCompacting && pendingApprovals.length === 0 ? stopGeneration : undefined}
              sending={isComposerBusy}
              autoFocus={effectiveDraft}
              className="bg-ods-card rounded-lg"
            />
            {(displayModel || isModelRowLoading) && (
              <div className="mx-auto w-full max-w-3xl mt-3">
                {displayModel && !isModelRowLoading ? (
                  <ModelDisplay
                    provider={displayModel.provider}
                    modelName={displayModel.displayName}
                    usedTokens={tokenUsage?.totalTokensSize}
                    contextWindow={tokenUsage?.contextSize}
                  />
                ) : (
                  // Mirrors ModelDisplay's inline row at the exact same height
                  // (h-5 == text-sm line box) so there is zero layout shift
                  // when the real row pops in: icon + model name on the left,
                  // and — only when a dialog is in play (so it matches the
                  // final "X/Y tokens used" tail) — a right-aligned token bar.
                  <div className="flex items-center gap-1 h-5" aria-hidden="true">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-3.5 w-36" />
                    {(activeDialogId || urlDialogId) && <Skeleton className="h-3 w-32 ml-auto" />}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </ContentPageContainer>
  );
}
