'use client';

/**
 * OpenframeEmbeddableChatEntry — the EmbeddableChat surface for
 * openframe-frontend. Hosted inside AppLayout's in-layout drawer
 * (`AppLayoutDrawer`) rather than as a body-level overlay, so the header
 * and sidebar stay visible and interactive while the chat is open. The
 * drawer owns the shell; this component runs the chat shell-less
 * (`shell="none"`) and is open/close-controlled by the host via the
 * `open` / `onOpenChange` props it shares with the drawer.
 *
 * Mingo-mode state is NOT owned by the lib's built-in NATS adapter. Instead
 * `useMingoUnifiedChatState()` builds it from the same react-query + Zustand
 * stack the `/mingo` page uses, and we inject it via `mingoState`. Because
 * that state lives OUTSIDE this component (store + query cache), the drawer
 * can unmount on close and rehydrate instantly on reopen — no `keepMounted`,
 * no refetch, and realtime catches up via JetStream replay on resubscribe.
 *
 * Realtime is a rendered component (`<DialogSubscription>`), so we render it
 * here alongside `<EmbeddableChat>`, wired from the hook's `subscription`
 * bundle — exactly as the `/mingo` page does.
 *
 * Guide mode (`modes.guide`) stays wired through the lib's SSE adapter, which
 * reads its endpoints from the runtime provider; the empty options object is
 * enough to flip the mode on and surface the in-panel Guide/Mingo toggle.
 *
 * Coexists with the old `/mingo` page route during migration.
 */

import type {
  ChatContextPickerConfig,
  MingoQuickAction,
} from '@flamingo-stack/openframe-frontend-core/components/chat';
import { EmbeddableChat } from '@flamingo-stack/openframe-frontend-core/components/chat';
import { useLocalStorage } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useEffect, useMemo } from 'react';
import { featureFlags } from '@/lib/feature-flags';
import { KNOWLEDGE_BASE_ROUTE } from '../(app)/help-center/endpoints';
import { MINGO_CONTEXT_ENTITY_TYPES } from '../(app)/mingo/context/context-sources';
import { CONTEXT_ITEMS_MAX } from '../(app)/mingo/context/context-types';
import { renderMingoContextItem, renderMingoMention } from '../(app)/mingo/context/mention-chips/render-mention';
import { MingoPageContextTag } from '../(app)/mingo/context/page-context-tag';
import { renderMingoContextItems } from '../(app)/mingo/context/render-context-items';
import { useMingoQuickActions } from '../(app)/mingo/hooks/use-mingo-quick-actions';
import { DialogSubscription } from '../(app)/mingo/hooks/use-mingo-realtime-subscription';
import { useMingoUnifiedChatState } from '../(app)/mingo/hooks/use-mingo-unified-chat-state';
import { useMingoLauncherStore } from '../(app)/mingo/stores/mingo-launcher-store';

/** The two transports the in-panel toggle switches between. Mirrors the lib's
 *  `ChatMode` (not re-exported from the chat barrel) — structurally identical,
 *  so it satisfies `EmbeddableChat`'s `activeMode` / `onActiveModeChange`. */
type ChatMode = 'guide' | 'mingo';

/** localStorage key persisting the last-open transport so the drawer reopens on
 *  the mode the user left — the drawer unmounts on close, so without this the
 *  chat always remounts on the `defaultActiveMode` ('mingo') and a Guide
 *  conversation silently drops the user back on the Mingo dialog list. */
const ACTIVE_MODE_KEY = 'openframe:mingo-chat-active-mode';

interface OpenframeEmbeddableChatEntryProps {
  /** Controlled open state, shared with the host `AppLayoutDrawer`. */
  open: boolean;
  /** Change handler, shared with the host `AppLayoutDrawer`. The chat's own
   *  in-header X button calls this with `false` to close the drawer. */
  onOpenChange: (open: boolean) => void;
}

export function OpenframeEmbeddableChatEntry({ open, onOpenChange }: OpenframeEmbeddableChatEntryProps) {
  const { state, subscription, sendInNewDialog, searchQuery, setSearchQuery, fetchArchivedDialogs, unarchiveDialog } =
    useMingoUnifiedChatState();

  // A queued launcher prompt (set by `askMingo(source)` from an EmptyState
  // "Ask Mingo about X" button) opens the drawer and asks Mingo's GUIDE mode for
  // contextual guidance about that section. The drawer unmounts this entry on
  // close and remounts on open, so these run on every open and re-fire if a new
  // prompt is queued while the drawer is already open.
  const pendingPrompt = useMingoLauncherStore(s => s.pendingPrompt);
  const pendingMode = useMingoLauncherStore(s => s.pendingMode);
  const consumePendingPrompt = useMingoLauncherStore(s => s.consumePendingPrompt);

  // Mingo agent-mode launch (`sendToMingo(prompt)` — e.g. the onboarding "Meet
  // Mingo" quick-action chips): drain straight into a fresh Mingo dialog.
  // `consumePendingPrompt` nulls the prompt as it reads it, so a header open (no
  // prompt) and StrictMode's double-invoke are both no-ops. The panel is forced
  // into Mingo mode by the mode-sync effect below (it needs `setActiveMode`,
  // declared further down).
  useEffect(() => {
    if (!pendingPrompt || pendingMode !== 'mingo') return;
    const text = consumePendingPrompt();
    if (!text) return;
    void sendInNewDialog(text);
  }, [pendingPrompt, pendingMode, consumePendingPrompt, sendInNewDialog]);

  // Controlled active mode persisted across drawer open/close (and reloads):
  // the drawer unmounts its content on close, so an uncontrolled mode would
  // reset to `defaultActiveMode` every reopen. `useLocalStorage` reads the
  // stored value synchronously on remount, so we reopen on the same transport.
  const [activeMode, setActiveMode] = useLocalStorage<ChatMode>(ACTIVE_MODE_KEY, 'mingo');

  // Mode-sync for a queued launch: force the panel into the queued transport so
  // the prompt is sent (and shown) on the right one. Guide ("Ask Mingo about X")
  // → Guide mode, where the lib's `guidePendingPrompt` one-shot (forwarded below)
  // sends via SSE and calls `onGuidePromptConsumed` to clear + re-arm. Mingo
  // (`sendToMingo`) → Mingo mode, so the fresh dialog the effect above opens is
  // the one on screen. `pendingMode` and `ChatMode` share the `'guide' | 'mingo'`
  // values, so it maps straight through.
  useEffect(() => {
    if (pendingPrompt && pendingMode) setActiveMode(pendingMode);
  }, [pendingPrompt, pendingMode, setActiveMode]);

  // Entity-context picker config (the `+` "Assign Item" menu + `@` trigger).
  // Stable so the lib's composer doesn't re-derive its icon map each render.
  // `renderMingoContextItems` maps each entity type to its data component
  // (Relay / TanStack hooks); the store-backed openView/recentViews are folded
  // in at send time by the unified hook.
  const contextPicker = useMemo<ChatContextPickerConfig>(
    () => ({
      entityTypes: MINGO_CONTEXT_ENTITY_TYPES,
      renderItems: renderMingoContextItems,
      maxItems: CONTEXT_ITEMS_MAX,
    }),
    [],
  );

  // Entity-context picker (the `+` / `@`-mention flow + selected chips) is
  // gated behind the `mingo-sidebar-context` flag. Passing `contextPicker`
  // undefined makes the lib's composer inert (no `+`, no `@`, no chips).
  const contextEnabled = featureFlags.mingoSidebarContext.enabled();

  // Admin-configured Mingo quick actions (AI Settings → "Mingo AI Chat" tab)
  // become starter chips in the empty state. Clicking one opens a new dialog
  // seeded with the action's instructions — same path the launcher prompt uses.
  const quickActions = useMingoQuickActions();
  const mingoQuickActions = useMemo<MingoQuickAction[]>(
    () =>
      quickActions.map(action => ({
        id: action.id,
        label: action.name,
        variant: 'outline',
        // Hover/focus previews the full instruction (what's actually sent) as
        // ghost text in the composer; the chip `label` is just the short name.
        prompt: action.instructions,
        onClick: () => {
          void sendInNewDialog(action.instructions);
        },
      })),
    [quickActions, sendInNewDialog],
  );

  return (
    <>
      {/* Realtime tail for the active dialog — writes chunks into the shared
          store, exactly like the /mingo page. Gated on active + subscribed; on
          reopen it resubscribes and replays missed chunks from the stored
          sequence offset. */}
      {subscription.activeDialogId && subscription.isSubscribed && (
        <DialogSubscription
          key={subscription.activeDialogId}
          dialogId={subscription.activeDialogId}
          isActive
          onApprove={subscription.onApprove}
          onReject={subscription.onReject}
          approvalStatuses={subscription.approvalStatuses}
          onConnectionChange={subscription.onConnectionChange}
          onMetadata={subscription.onMetadata}
          initialOptStartSeq={subscription.initialOptStartSeq}
          isInitialOptStartSeqReady={subscription.isInitialOptStartSeqReady}
        />
      )}

      <EmbeddableChat
        // Shell-less: the host `AppLayoutDrawer` owns the panel chrome,
        // open/close, and positioning. `open` / `onOpenChange` are the same
        // state the drawer is bound to, so the chat's in-header X button and
        // the drawer close in lockstep.
        shell="none"
        open={open}
        onOpenChange={onOpenChange}
        // Doc-source citations from the Guide RAG (over `openframe-docs`) are the
        // same knowledge base we host in-app at `/help-center/knowledge-base`. Point
        // doc chips at that `[...path]` route so a cited doc opens the in-app viewer
        // (relative → same-tab via the host router) instead of resolving Ask-only.
        // No `chipBasePlatform`: we DO host the viewer, so chips stay in-app.
        baseRoute={KNOWLEDGE_BASE_ROUTE}
        // Guide mode stays adapter-driven (SSE reads endpoints from the runtime
        // provider). Mingo mode is host-owned via `mingoState`, so we do NOT
        // pass `modes.mingo` — that keeps the lib's built-in NATS adapter idle.
        modes={{ guide: {} }}
        mingoState={state}
        // Dialog management for the host-injected Mingo state:
        //  - search: the chat-history search bar emits the debounced term into
        //    `setSearchQuery`, which rides the `useMingoDialogs` query key.
        //  - rename/archive: enable the row + header ⋯ menu (mutations live on
        //    `mingoState` via `useMingoDialogActions`).
        //  - archive page: `fetchArchivedDialogs` gates the clock-history button;
        //    `unarchiveDialog` enables restore.
        mingoDialogCapabilities={{
          searchQuery,
          onSearchChange: setSearchQuery,
          canRename: true,
          canArchive: true,
          fetchArchivedDialogs,
          unarchiveDialog,
        }}
        // Controlled + persisted so reopening the drawer restores the transport
        // the user left on instead of always snapping back to Mingo.
        activeMode={activeMode}
        onActiveModeChange={setActiveMode}
        // Admin-configured Mingo quick actions appended as chips after the
        // built-in "Start Guide Chat" in the Mingo empty state. Omitted when
        // none are configured so the lib keeps its default welcome content.
        mingoWelcome={mingoQuickActions.length > 0 ? { quickActions: mingoQuickActions } : undefined}
        // Greeting + try-asking quick-action chips are now per-platform,
        // admin-driven: the lib fetches them from `endpoints.emptyStateUrl`
        // (`/content/api/docs/empty-state`) configured in the runtime provider.
        // No hardcoded greeting here — a blank admin value falls back to the
        // lib's own default copy.
        contextPicker={contextEnabled ? contextPicker : undefined}
        // Renders inline AI mentions (`@device:<machineId>` in Mingo's replies)
        // as self-fetching chips — the `@marker:id` analogue of `renderEntityCard`
        // for `[card://]`. Stable module-level fn so the message memo holds.
        renderMention={contextEnabled ? renderMingoMention : undefined}
        // Renders a user's ATTACHED context chips (`contextItems`) as the SAME
        // self-fetching chips as inline mentions — so manually attached context
        // resolves its live name + link instead of the lib's label-only pill.
        renderContextItem={contextEnabled ? renderMingoContextItem : undefined}
        // One-shot Guide-mode prompt from an "Ask Mingo about X" launcher. The
        // `activeMode='guide'` flip above lands first; the lib then sends this
        // once via the Guide transport and calls `onGuidePromptConsumed` to clear
        // it (which re-arms the one-shot for the next launch).
        guidePendingPrompt={pendingMode === 'guide' ? pendingPrompt : null}
        onGuidePromptConsumed={consumePendingPrompt}
        // Mingo-mode "current page context" banner (Figma 192:51006): names the
        // entity detail page the user is on now (read from the navigation-context
        // store). The lib renders it under the header in Mingo mode only; the tag
        // self-hides when there's no open view.
        mingoContextBanner={<MingoPageContextTag />}
      />
    </>
  );
}
