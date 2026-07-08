'use client';

import { MingoIcon } from '@flamingo-stack/openframe-frontend-core/components/icons';
import {
  BookBookmarkIcon,
  BracketCurlyIcon,
  ClipboardListIcon,
  IdCardIcon,
  MonitorIcon,
  RadarIcon,
  TagIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { PageLayout } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ConfirmDialog } from '@/app/components/shared/confirm-dialog';
import { CustomerSetupStep } from './customer-setup-step';
import { DeviceSetupStep } from './device-setup-step';
import { KnowledgeBaseStep } from './knowledge-base-step';
import { LoggingStep } from './logging-step';
import { MingoStep } from './mingo-step';
import { MonitoringStep } from './monitoring-step';
import { OnboardingAccordionGroup, OnboardingAccordionItem } from './onboarding-accordion';
import { ScriptingStep } from './scripting-step';
import { TicketsStep } from './tickets-step';

/**
 * User "Get Started" onboarding — pure static (no backend). Step statuses below
 * are hardcoded; Skip just returns to the dashboard.
 */
export function OnboardingContent() {
  const router = useRouter();
  const [skipConfirmOpen, setSkipConfirmOpen] = useState(false);
  const leaveOnboarding = () => router.push('/dashboard');

  return (
    <PageLayout
      title="Get Started"
      subtitle="8 steps to complete · 2/8 done"
      actions={[{ label: 'Skip Onboarding', variant: 'outline' as const, onClick: () => setSkipConfirmOpen(true) }]}
      actionsVariant="menu-primary"
      className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]"
      contentClassName="flex flex-col gap-[var(--spacing-system-l)]"
    >
      {/* Get set up */}
      <OnboardingAccordionGroup label="Get set up">
        <OnboardingAccordionItem
          icon={<IdCardIcon size={24} />}
          status="completed"
          title="Customers Setup"
          description="Add your first client - Customer name, service tier, and SLA. Devices need an org to belong to."
        >
          <CustomerSetupStep />
        </OnboardingAccordionItem>
        <OnboardingAccordionItem
          icon={<MonitorIcon size={24} />}
          status="completed"
          title="Device Management"
          description="Deploy one command to connect a machine, then monitor and control it from OpenFrame."
        >
          <DeviceSetupStep />
        </OnboardingAccordionItem>
      </OnboardingAccordionGroup>

      {/* Run your operations */}
      <OnboardingAccordionGroup label="Run your operations">
        <OnboardingAccordionItem
          icon={<TagIcon size={24} />}
          title="Tickets"
          description="Every client chat is a ticket. AI Assistant resolves them automatically - or your team steps in when needed."
        >
          <TicketsStep />
        </OnboardingAccordionItem>
        <OnboardingAccordionItem
          icon={<BracketCurlyIcon size={24} />}
          title="Scripting"
          description="Automate routine tasks with scripts you run across devices on demand or on schedule."
        >
          <ScriptingStep />
        </OnboardingAccordionItem>
        <OnboardingAccordionItem
          icon={<RadarIcon size={24} />}
          title="Monitoring"
          description="Track device health, alerts, and performance across every client in real time."
        >
          <MonitoringStep />
        </OnboardingAccordionItem>
        <OnboardingAccordionItem
          icon={<ClipboardListIcon size={24} />}
          title="Logging"
          description="See a full activity trail of what happened, when, and who did it."
        >
          <LoggingStep />
        </OnboardingAccordionItem>
      </OnboardingAccordionGroup>

      {/* Work smarter with AI */}
      <OnboardingAccordionGroup label="Work smarter with AI">
        <OnboardingAccordionItem
          icon={<BookBookmarkIcon size={24} />}
          title="Knowledge Management"
          description="Build a knowledge base your AI agents use to answer clients and resolve tickets."
        >
          <KnowledgeBaseStep />
        </OnboardingAccordionItem>
        <OnboardingAccordionItem
          icon={
            <MingoIcon
              className="size-6"
              color="var(--color-text-secondary)"
              eyesColor="var(--ods-flamingo-cyan-base)"
              cornerColor="var(--ods-flamingo-cyan-base)"
            />
          }
          title="Meet Mingo"
          description="Your AI co-pilot for the OpenFrame workspace. Ask questions, get summaries, or delegate tasks."
        >
          <MingoStep />
        </OnboardingAccordionItem>
      </OnboardingAccordionGroup>

      <ConfirmDialog
        open={skipConfirmOpen}
        onOpenChange={setSkipConfirmOpen}
        title="Skip onboarding"
        description="You can finish setup later from Settings."
        confirmLabel="Skip Onboarding"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={leaveOnboarding}
      />
    </PageLayout>
  );
}
