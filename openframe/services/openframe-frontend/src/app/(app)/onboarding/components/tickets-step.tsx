'use client';

import { Video } from '@flamingo-stack/openframe-frontend-core/components/features';
import { CheckCircleIcon, DotsLoaderIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { Button } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { isSaasTenantMode } from '@/lib/app-mode';
import { useTicketStatistics } from '../../tickets/hooks/use-ticket-statistics';
import { onboardingHintUrl } from '../onboarding-coach-marks';

// Placeholder demo clip until the real onboarding videos are ready.
const DEMO_VIDEO_ID = 'Ch984JTweV8';

/** Uppercase section label + content, e.g. "INSIDE A TICKET". */
function LabeledBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex w-full flex-col gap-[var(--spacing-system-xxs)]">
      <p className="text-h5 text-ods-text-secondary">{label}</p>
      {children}
    </div>
  );
}

const INSIDE_TICKET_POINTS = [
  'Set a title and description to document the issue clearly.',
  'Assign it to a specific technician on your team.',
  'Attach files, add tags to categorize by issue type or client.',
  'Leave internal notes visible only to your team - not the client.',
  'Take over the chat directly. Assistant goes silent and you talk to the client one-on-one.',
];

/**
 * Inner body of the "Tickets" onboarding step — an informational walkthrough: an intro
 * with a demo-video placeholder, the "Inside a ticket" capabilities list, and the footer.
 * The footer shows a passive "waiting" state until the first ticket exists, then a primary
 * "Go to Tickets" action ({@link ../../tickets/hooks/use-ticket-statistics}).
 */
export function TicketsStep({
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
  const router = useRouter();
  const pathname = usePathname();

  // Once at least one ticket exists, the "waiting" pending state gives way to a
  // primary "Go to Tickets" action. Tickets are a saas-tenant feature, so skip
  // the (chat-graphql) fetch elsewhere — no tickets → keep the pending state.
  const { totalCount: ticketCount } = useTicketStatistics({ enabled: isSaasTenantMode() });
  const hasTickets = ticketCount > 0;

  return (
    <div className="flex w-full flex-col gap-[var(--spacing-system-l)]">
      {/* Intro (left) / demo video (right) */}
      <div className="flex w-full flex-col items-start gap-[var(--spacing-system-l)] md:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-[var(--spacing-system-l)]">
          <p className="text-h4 text-ods-text-primary">
            Every conversation AI Assistant handles is logged as a ticket. Your team can review what happened, add
            context, and step in whenever needed.
          </p>
          <p className="text-h4 text-ods-text-primary">
            {
              'Deploy the agent on your own device, open Fae, and send a message like "Check for software updates." Then head to the Tickets section and watch your conversation show up as a fresh ticket, with the full chat history and every detail captured.'
            }
          </p>
        </div>
        <div className="w-full flex-1">
          <Video kind="youtube" url={DEMO_VIDEO_ID} title="Tickets demo video" priority />
        </div>
      </div>

      {/* Inside a ticket */}
      <LabeledBlock label="Inside a ticket">
        <div className="flex w-full flex-col gap-[var(--spacing-system-xs)] rounded-md border border-ods-border bg-ods-card p-[var(--spacing-system-m)]">
          <p className="text-h4 text-ods-text-primary">
            Once a ticket is open, your team can add context and take action:
          </p>
          <ul className="flex w-full flex-col">
            {INSIDE_TICKET_POINTS.map(point => (
              <li key={point} className="flex items-start gap-[var(--spacing-system-xs)]">
                <span className="flex size-6 shrink-0 items-center justify-center">
                  <span className="size-1.5 rounded-full bg-ods-accent" />
                </span>
                <span className="flex-1 text-h4 text-ods-text-primary">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </LabeledBlock>

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
          {/* No tickets yet → passive "waiting" state; once one arrives → primary action. */}
          {hasTickets ? (
            <Button
              variant="accent"
              onClick={() => {
                // Reaching Tickets from onboarding completes the step in the background
                // (if not already done) — no spinner, navigation is the feedback.
                if (!completed) onCompleteBackground?.();
                router.push(onboardingHintUrl('/tickets', 'tickets', pathname));
              }}
              className="w-full md:flex-1"
            >
              Go to Tickets
            </Button>
          ) : (
            <div className="flex w-full items-center justify-center gap-[var(--spacing-system-xs)] px-[var(--spacing-system-m)] py-[var(--spacing-system-sf)] text-ods-text-secondary md:flex-1">
              <DotsLoaderIcon size={24} />
              <span className="whitespace-nowrap text-h4">Waiting for first ticket</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
