'use client';

import {
  BuildingsIcon,
  IdCardIcon,
  MonitorIcon,
  UsersGroupIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { CompanyTeamStep } from './company-team-step';
import { CustomerSetupStep } from './customer-setup-step';
import { DeviceSetupStep } from './device-setup-step';
import { MspSetupStep } from './msp-setup-step';
import { OnboardingAccordionItem } from './onboarding-accordion';

/**
 * Tenant "Initial Setup" block on the Dashboard — pure static (no backend). Step
 * statuses below are hardcoded. The block sits on the darker page background
 * (`bg-ods-bg`, not the lighter `bg-ods-card`) so it doesn't read as a card.
 */
export function InitialSetupCard() {
  return (
    <section className="flex w-full flex-col gap-[var(--spacing-system-m)] rounded-md border border-ods-border bg-ods-bg p-[var(--spacing-system-l)]">
      <div className="flex flex-col">
        <h2 className="text-h2 text-ods-text-primary">Initial Setup</h2>
        <p className="text-h6 text-ods-text-secondary">4 steps to complete · 3/4 done</p>
      </div>

      <div className="flex w-full flex-col overflow-hidden rounded-md border border-ods-border [&>*:last-child]:border-b-0">
        <OnboardingAccordionItem
          icon={<BuildingsIcon size={24} />}
          status="completed"
          title="Complete MSP Setup"
          description="Set your company name, upload a logo, and add your website so clients recognize your brand across all touchpoints."
        >
          <MspSetupStep completed />
        </OnboardingAccordionItem>
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
          description="Run one command on a client machine to connect it to OpenFrame and start monitoring."
        >
          <DeviceSetupStep />
        </OnboardingAccordionItem>
        <OnboardingAccordionItem
          icon={<UsersGroupIcon size={24} />}
          title="Company & Team"
          description="Invite your technicians and assign roles so everyone has the right access from day one."
        >
          <CompanyTeamStep />
        </OnboardingAccordionItem>
      </div>
    </section>
  );
}
