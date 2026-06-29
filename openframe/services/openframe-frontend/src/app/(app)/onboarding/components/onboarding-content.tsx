'use client';

import { MingoIcon } from '@flamingo-stack/openframe-frontend-core/components/icons';
import {
  BookBookmarkIcon,
  BuildingsIcon,
  IdCardIcon,
  MonitorIcon,
  TagIcon,
  UsersGroupIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { PageLayout } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ConfirmDialog } from '@/app/components/shared/confirm-dialog';
import { CompanyTeamStep } from './company-team-step';
import { CustomerSetupStep } from './customer-setup-step';
import { DeviceSetupStep } from './device-setup-step';
import { KnowledgeBaseStep } from './knowledge-base-step';
import { MingoStep } from './mingo-step';
import { MspSetupStep } from './msp-setup-step';
import { OnboardingAccordionGroup, OnboardingAccordionItem } from './onboarding-accordion';
import { TicketsStep } from './tickets-step';

export function OnboardingContent() {
  const router = useRouter();

  // Step dependencies: a device can only be added once a customer exists, and
  // tickets only unlock once a device is connected. Wired to local state for now —
  // swap for real onboarding-completion data when the step bodies are implemented.
  // TODO: temporarily unlocked for development — revert to `false` (or real data) later.
  const hasCustomer = true;
  const hasDevice = true;

  // Once every step is finished, the header action turns into a primary "Close
  // Onboarding" button; until then it's the outline "Skip Onboarding" escape hatch.
  // TODO: wire to real onboarding-completion data when step tracking lands.
  const allStepsCompleted = false;

  // Skipping is destructive (leaves setup unfinished), so it asks for confirmation
  // first. Closing a fully-completed onboarding doesn't — there's nothing to lose.
  const [skipConfirmOpen, setSkipConfirmOpen] = useState(false);

  const leaveOnboarding = () => router.push('/dashboard');
  const headerAction = allStepsCompleted
    ? { label: 'Close Onboarding', variant: 'accent' as const, onClick: leaveOnboarding }
    : { label: 'Skip Onboarding', variant: 'outline' as const, onClick: () => setSkipConfirmOpen(true) };

  return (
    <PageLayout
      title="Get Started"
      subtitle="7 steps to complete"
      actions={[headerAction]}
      // Desktop: header action button. Mobile: collapses into a "…" menu.
      actionsVariant="menu-primary"
      className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]"
      contentClassName="flex flex-col gap-[var(--spacing-system-l)]"
    >
      {/* Complete MSP Setup — standalone step */}
      <div className="flex w-full flex-col overflow-hidden rounded-md border border-ods-border [&>*:last-child]:border-b-0">
        <OnboardingAccordionItem
          icon={<BuildingsIcon size={24} />}
          title="Complete MSP Setup"
          description="Set your company name, upload a logo, and add your website so clients recognize your brand across all touchpoints."
        >
          <MspSetupStep />
        </OnboardingAccordionItem>
      </div>

      {/* Device Management */}
      <OnboardingAccordionGroup label="Device Management">
        <OnboardingAccordionItem
          icon={<IdCardIcon size={24} />}
          title="Customers Setup"
          description="Add your first client - Customer name, service tier, and SLA. Devices need an org to belong to."
        >
          <CustomerSetupStep />
        </OnboardingAccordionItem>
        <OnboardingAccordionItem
          icon={<MonitorIcon size={24} />}
          status={hasCustomer ? 'active' : 'disabled'}
          title="Device Management"
          description="Run one command on a client machine to connect it to OpenFrame and start monitoring."
          requirementHint="Added Customer required"
        >
          <DeviceSetupStep />
        </OnboardingAccordionItem>
      </OnboardingAccordionGroup>

      {/* AI Experience */}
      <OnboardingAccordionGroup label="AI Experience">
        <OnboardingAccordionItem
          icon={<TagIcon size={24} />}
          status={hasDevice ? 'active' : 'disabled'}
          title="Tickets"
          description="Every client chat is a ticket. AI Assistant resolves them automatically - or your team steps in when needed."
          requirementHint="A connected device is required"
        >
          <TicketsStep />
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

      {/* Additional Setup */}
      <OnboardingAccordionGroup label="Additional Setup">
        <OnboardingAccordionItem
          icon={<UsersGroupIcon size={24} />}
          title="Company & Team"
          description="Invite your technicians and assign roles so everyone has the right access from day one."
        >
          <CompanyTeamStep />
        </OnboardingAccordionItem>
        <OnboardingAccordionItem
          icon={<BookBookmarkIcon size={24} />}
          title="Knowledge Base"
          description="Build your own docs that AI Assistant will use to answer client questions."
        >
          <KnowledgeBaseStep />
        </OnboardingAccordionItem>
      </OnboardingAccordionGroup>

      {/* Skip confirmation — leaving onboarding early is reversible from Settings. */}
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
