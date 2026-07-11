'use client';

import {
  accentFromIdentityIcon,
  ChatQuickActionRow,
  getAgentAccent,
  type QuickActionChip,
  useEmptyStateConfig,
} from '@flamingo-stack/openframe-frontend-core/components/chat';
import { Video } from '@flamingo-stack/openframe-frontend-core/components/features';
import { CheckCircleIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { Button } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useChatRuntime } from '@flamingo-stack/openframe-frontend-core/contexts';
import Link from 'next/link';
import { useCallback, useMemo } from 'react';
import { useMingoLauncherStore } from '@/app/(app)/mingo/stores/mingo-launcher-store';
import { useMingoMessagesStore } from '@/app/(app)/mingo/stores/mingo-messages-store';

const GUARDRAILS_HREF = '/settings/ai-settings?tab=guardrails';

// Placeholder demo clip until the real onboarding videos are ready.
const DEMO_VIDEO_ID = 'i4H_XqrI3RA';

/**
 * Inner body of the "Meet Mingo" onboarding step — an intro to the Mingo AI co-pilot.
 *
 * The "Try this quick actions" chips come from MPH — specifically the Mingo AGENT's
 * own published config, NOT the platform empty-state. Both endpoints share MPH's
 * `resolveChatSurfaceDisplay`, but the empty-state is keyed by the deployment platform
 * (so it returns the platform's "flamingo/openframe" chips) while the agent config is
 * keyed by `source = agent-mingo` — the "application type" we actually want. We select
 * it through the runtime's standard `aiAgentConfigUrl(slug)` seam (same `/content`
 * proxy, same flat wire shape), fetch it with the shared `useEmptyStateConfig`, and
 * render the first four through the SAME `ChatQuickActionRow` the chat empty state
 * (`GuideWelcome`) uses — with the identical icon-accent resolution, so the glyphs come
 * out turquoise (mingo → `cyan`) exactly like in the chat.
 *
 * The public agent SLUG is `mingo` (its chat-admin `source`/config is `agent-mingo`).
 *
 * "Start New Chat" opens the in-layout Mingo drawer on a fresh chat; the Guardrails
 * link goes to AI Settings.
 */
const MINGO_AGENT_SLUG = 'mingo';

export function MingoStep({
  onComplete,
  onCompleteBackground,
  completed,
  completing,
}: {
  onComplete?: () => void;
  onCompleteBackground?: () => void;
  completed?: boolean;
  completing?: boolean;
}) {
  // MPH-sourced quick actions — the `agent-mingo` agent config (source-keyed on
  // `agent-mingo`), selected via the runtime's standard agent-config URL builder.
  const runtime = useChatRuntime();
  const agentConfigUrl = runtime?.endpoints.aiAgentConfigUrl?.(MINGO_AGENT_SLUG);
  const { config } = useEmptyStateConfig(agentConfigUrl, { enabled: Boolean(agentConfigUrl) });

  const startNewChat = useCallback(() => {
    // Clear the active dialog so the drawer opens on a fresh Mingo chat, where the
    // same quick actions are wired to actually send.
    useMingoMessagesStore.getState().setActiveDialogId(null);
    useMingoLauncherStore.getState().setOpen(true);
  }, []);

  // Build the chip list exactly like the chat empty state (`GuideWelcome`): a
  // declarative EntityIcon spec per action with the accent resolved admin-first —
  // per-action color → the agent identity's `icon_props.color` → the `mingo`
  // fallback (`cyan`), so the glyphs render turquoise like in the chat. Clicking a
  // chip opens the Mingo drawer and immediately sends that action's prompt (agent
  // mode) via the launcher's one-shot `sendToMingo`.
  const chips = useMemo<QuickActionChip[]>(() => {
    const accent = accentFromIdentityIcon(config.icon) ?? getAgentAccent(MINGO_AGENT_SLUG);
    return config.quickActions.slice(0, 4).map(action => ({
      id: action.id,
      label: action.label,
      icon: {
        name: action.iconName ?? undefined,
        url: action.iconUrl ?? undefined,
        props: action.iconProps ?? undefined,
        accent,
      },
      onSelect: () => useMingoLauncherStore.getState().sendToMingo(action.prompt),
    }));
  }, [config.quickActions, config.icon]);

  return (
    <div className="flex w-full flex-col gap-[var(--spacing-system-l)]">
      {/* Intro + quick actions (left) / demo video (right) */}
      <div className="flex w-full flex-col items-start gap-[var(--spacing-system-l)] md:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-[var(--spacing-system-l)]">
          <p className="text-h4 text-ods-text-primary">
            Mingo knows your entire OpenFrame workspace - devices, tickets, Customers, team. Mingo can both answer and
            act. What it&apos;s allowed to do on its own is controlled by your{' '}
            <Link href={GUARDRAILS_HREF} className="text-ods-accent underline">
              Guardrail Settings
            </Link>
            .
          </p>

          {chips.length > 0 && (
            <div className="flex flex-col gap-[var(--spacing-system-xxs)]">
              <p className="text-h5 text-ods-text-secondary">Try this quick actions:</p>
              <ChatQuickActionRow wrap chips={chips} />
            </div>
          )}
        </div>

        <div className="w-full flex-1">
          <Video kind="youtube" url={DEMO_VIDEO_ID} title="Meet Mingo demo video" priority />
        </div>
      </div>

      {/* Footer actions — right column mirrors the intro/video split above so the
          buttons line up flush with the demo video block. */}
      <div className="flex w-full flex-col gap-[var(--spacing-system-l)] md:flex-row">
        <div className="hidden flex-1 md:block" />
        <div className="flex w-full flex-1 flex-col gap-[var(--spacing-system-m)] md:flex-row md:items-center">
          {!completed ? (
            <Button
              variant="outline"
              leftIcon={<CheckCircleIcon className="size-5" />}
              onClick={() => onComplete?.()}
              loading={completing}
              disabled={completing}
              className="w-full md:flex-1"
            >
              Mark as Complete
            </Button>
          ) : (
            // Keep the completed step's primary button its own width — don't let it
            // stretch into the removed "Mark as Complete" slot.
            <div className="hidden md:block md:flex-1" aria-hidden />
          )}
          <Button
            variant="accent"
            onClick={() => {
              // Opening a Mingo chat completes the step in the background (if not already
              // done) — no spinner; the drawer opening is the feedback.
              if (!completed) onCompleteBackground?.();
              startNewChat();
            }}
            className="w-full md:flex-1"
          >
            Start New Chat
          </Button>
        </div>
      </div>
    </div>
  );
}
