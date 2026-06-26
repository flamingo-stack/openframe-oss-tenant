'use client';

import { CheckCircleIcon, ExternalLinkIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { Button } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import Link from 'next/link';
import { useMingoLauncherStore } from '@/app/(app)/mingo/stores/mingo-launcher-store';
import { useMingoMessagesStore } from '@/app/(app)/mingo/stores/mingo-messages-store';

const GUARDRAILS_HREF = '/settings/ai-settings';

const TRY_ASKING = [
  'What actions can you take?',
  'Weekly Log Summary',
  'Device Online Status',
  'Tech Required Overview',
];

/**
 * Inner body of the "Meet Mingo" onboarding step — an informational intro to the Mingo
 * AI co-pilot. "Start New Chat" opens the in-layout Mingo drawer (same mechanism as
 * {@link ../../../components/notifications/open-mingo-dialog}); the Guardrails links go to
 * AI Settings.
 */
export function MingoStep() {
  const { toast } = useToast();

  const startNewChat = () => {
    // Clear the active dialog so the drawer opens on a fresh chat.
    useMingoMessagesStore.getState().setActiveDialogId(null);
    useMingoLauncherStore.getState().setOpen(true);
  };

  return (
    <div className="flex w-full flex-col gap-[var(--spacing-system-l)]">
      {/* Intro + suggestions (left) / demo video (right) */}
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

          <div className="flex flex-col gap-[var(--spacing-system-xxs)]">
            <p className="text-h5 text-ods-text-secondary">Try asking:</p>
            <div className="flex flex-wrap items-center gap-[var(--spacing-system-xxs)]">
              {TRY_ASKING.map(prompt => (
                <span
                  key={prompt}
                  className="flex h-8 items-center justify-center rounded-md border border-ods-border bg-ods-card px-[var(--spacing-system-xsf)] text-h5 text-ods-text-primary"
                >
                  {prompt}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex aspect-[976/558] w-full flex-1 items-center justify-center rounded-md border border-ods-text-secondary bg-ods-border">
          <span className="font-mono text-h2 text-ods-text-secondary">DEMO VIDEO</span>
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex w-full flex-col gap-[var(--spacing-system-m)] md:flex-row md:items-center">
        <Link
          href={GUARDRAILS_HREF}
          className="flex flex-1 items-center gap-[var(--spacing-system-xs)] text-ods-text-secondary transition-colors hover:text-ods-text-primary"
        >
          <ExternalLinkIcon size={24} className="shrink-0" />
          <span className="text-h4 underline">Configure Guardrails</span>
        </Link>
        <div className="hidden flex-1 md:block" />
        <Button
          variant="outline"
          leftIcon={<CheckCircleIcon className="size-5" />}
          onClick={() => toast({ title: 'Step marked complete', variant: 'success' })}
          className="w-full md:flex-1"
        >
          Mark as Complete
        </Button>
        <Button variant="accent" onClick={startNewChat} className="w-full md:flex-1">
          Start New Chat
        </Button>
      </div>
    </div>
  );
}
