'use client';

import type { ChatInputRef } from '@flamingo-stack/openframe-frontend-core';
import {
  Button,
  ChatInput,
  ChatMessageList,
  ChatSidebar,
  ModelDisplay,
  PageLayout,
  Skeleton,
} from '@flamingo-stack/openframe-frontend-core';
import { MingoIcon } from '@flamingo-stack/openframe-frontend-core/components/icons';
import { Menu01Icon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { cn } from '@flamingo-stack/openframe-frontend-core/utils';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAiModelStatus } from '@/app/hooks/use-ai-model';
import { EVENT_SUBTYPE, trackDashboardActivity } from '@/lib/analytics';
import { isSaasTenantMode } from '@/lib/app-mode';
import { featureFlags } from '@/lib/feature-flags';
import { routes } from '@/lib/routes';
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentModel, setCurrentModel] = useState<{
    displayName: string;
    provider: string;
  } | null>(null);

  const chatInputRef = useRef<ChatInputRef>(null);

  const { activeDialogId, setActiveDialogId, resetUnread, addMessage } = useMingoMessagesStore();

  const { resetDialog } = useMingoDialog();

  // Reset the active dialog on leave. `activeDialogId` is module-level store
  // state with no persistence, so without this it survives the SPA unmount and
  // a return via direct URL would short-circuit the
  // re-selection effect below — skipping the clean reselect the sidebar gets by
  // passing through `null`. The streaming pointer is deliberately left intact:
  // `ensureAssistantMessage`/`incompleteState` use it to resume an interrupted
  // stream in the same bubble on return.
  // biome-ignore lint/correctness/useExhaustiveDependencies: store action is stable; this must run only on unmount.
  useEffect(() => {
    return () => {
      setActiveDialogId(null);
    };
  }, []);

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
    initialOptStartSeq,
    isMessagesFetched,
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

  const { subscribeToDialog, subscribedDialogs, onConnectionChange } = useMingoRealtimeSubscription(activeDialogId);

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

  // Sync the displayed model to the global AI config. Runs on first load
  // (seeding `currentModel`) and again whenever the global config changes — e.g.
  // the user picks a new provider/model on /settings/ai-settings — so the model
  // row under the composer reflects the new selection immediately instead of
  // only after the next request refines it. React Query's structural sharing
  // keeps `initialAiModel` referentially stable while its value is unchanged, so
  // this only fires on a real config change and doesn't clobber per-dialog
  // metadata refinements (handleMetadataUpdate) in between.
  useEffect(() => {
    if (initialAiModel) {
      setCurrentModel(initialAiModel);
    }
  }, [initialAiModel]);

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
  const isComposerBusy = isTyping || isCompacting || isCreatingDialog;

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
        if (sidebarOpen) {
          setSidebarOpen(false);
        } else if (isDraftChat) {
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
  }, [activeDialogId, isDraftChat, sidebarOpen, router]);

  // The standalone `/mingo` page is the LEGACY surface. When `mingo-sidebar` is
  // on, Mingo lives in the in-layout sidebar drawer instead, so this route is
  // fully hidden — redirect any direct/bookmarked hit to the dashboard. (Flags
  // are guaranteed loaded here: `FeatureFlagsGate` blocks the app shell until
  // then, so the imperative read is stable.) Also covers the non-SaaS guard.
  useEffect(() => {
    if (!isSaasTenantMode() || featureFlags.mingoSidebar.enabled()) {
      router.replace(routes.dashboard);
      return;
    }
  }, [router]);

  const handleDialogSelect = useCallback(
    async (dialogId: string) => {
      setSidebarOpen(false);
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
    setSidebarOpen(false);
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
        if (success) {
          trackDashboardActivity(EVENT_SUBTYPE.SEND_MINGO_MESSAGE);
        } else {
          console.warn('[Mingo] Failed to send message');
        }
        return;
      }

      if (!activeDialogId) return;

      const success = await sendMessage(message.trim());
      if (success) {
        trackDashboardActivity(EVENT_SUBTYPE.SEND_MINGO_MESSAGE);
      } else {
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

  if (!isSaasTenantMode() || featureFlags.mingoSidebar.enabled()) {
    return null;
  }

  return (
    <PageLayout showHeader={false} className="h-full" contentClassName="h-full flex flex-col">
      {activeDialogId && subscribedDialogs.has(activeDialogId) && (
        <DialogSubscription
          key={activeDialogId}
          dialogId={activeDialogId}
          isActive
          onApprove={handleApprove}
          onReject={handleReject}
          approvalStatuses={approvalStatuses}
          onConnectionChange={onConnectionChange}
          onMetadata={handleMetadataUpdate}
          initialOptStartSeq={initialOptStartSeq}
          isInitialOptStartSeqReady={isMessagesFetched}
        />
      )}

      <div className="flex h-full w-full">
        {sidebarOpen && (
          <Button
            type="button"
            variant="transparent"
            aria-label="Close sidebar"
            onClick={() => setSidebarOpen(false)}
            className="md:hidden fixed inset-0 z-40 h-auto w-auto p-0 rounded-none bg-ods-overlay hover:bg-ods-overlay active:bg-ods-overlay"
          />
        )}

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
          className={cn(
            'flex-shrink-0 transition-transform duration-300',
            'fixed inset-y-0 left-0 z-50 md:z-auto',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full',
            'md:relative md:translate-x-0 md:transition-none',
          )}
        />

        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          <div className="md:hidden flex items-center px-[var(--spacing-system-s)] py-[var(--spacing-system-xs)] border-b border-ods-border">
            <Button onClick={() => setSidebarOpen(true)} variant="transparent" size="icon" aria-label="Open sidebar">
              <Menu01Icon className="w-5 h-5 text-ods-text-primary" />
            </Button>
          </div>
          <div className="flex-1 m-[var(--spacing-system-mf)] mb-[var(--spacing-system-xsf)] flex flex-col min-h-0">
            <ChatMessageList
              messages={displayMessages}
              dialogId={activeDialogId || urlDialogId || 'draft'}
              isTyping={effectiveDraft ? false : isTyping}
              isLoading={isResolvingDialog || (!effectiveDraft && isAnyLoading && processedMessages.length === 0)}
              assistantType={assistantType}
              pendingApprovals={effectiveDraft ? [] : pendingApprovals}
              showAvatars={true}
              assistantIcon={<MingoIcon className="h-6 w-6" cornerColor="var(--ods-flamingo-cyan-base)" />}
              autoScroll={true}
              hasNextPage={effectiveDraft ? false : hasNextMessagePage}
              isFetchingNextPage={effectiveDraft ? false : isFetchingNextMessagePage}
              onLoadMore={effectiveDraft ? undefined : fetchNextMessagePage}
              contentClassName="!max-w-3xl px-[var(--spacing-system-mf)]"
            />
          </div>

          {/* Message Input */}
          <div className="flex-shrink-0 px-[var(--spacing-system-lf)] pb-[var(--spacing-system-mf)]">
            <ChatInput
              ref={chatInputRef}
              placeholder="Enter your Request..."
              // `onSend`'s return type was widened in core 0.0.218 to
              // `void | boolean | Promise<boolean>` (return `false` to keep the
              // draft). Our async handler resolves to `Promise<void>`, which the
              // union's `void` arm doesn't cover; wrap so the arrow returns void
              // (clears the draft as before — unchanged behavior).
              onSend={message => {
                handleSendMessage(message);
              }}
              onStop={isTyping && !isCompacting ? stopGeneration : undefined}
              sending={isComposerBusy}
              autoFocus={effectiveDraft}
              className="bg-ods-card rounded-lg !max-w-3xl"
            />
            {(displayModel || isModelRowLoading) && (
              <div className="mx-auto w-full max-w-3xl mt-[var(--spacing-system-sf)]">
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
                  <div className="flex items-center gap-[var(--spacing-system-xxs)] h-5" aria-hidden="true">
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
    </PageLayout>
  );
}
