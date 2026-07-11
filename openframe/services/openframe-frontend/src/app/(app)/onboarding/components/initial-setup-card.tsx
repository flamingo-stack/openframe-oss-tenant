'use client';

import {
  BuildingsIcon,
  CheckCircleIcon,
  IdCardIcon,
  MonitorIcon,
  UsersGroupIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { Button } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useState } from 'react';
import { TenantOnboardingStep } from '@/generated/schema-enums';
import { useOnboardingMutations } from '@/graphql/onboarding/use-onboarding-mutations';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { countCompleted, isStepDone, TENANT_ONBOARDING_STEPS } from '../onboarding-steps';
import { CompanyTeamStep } from './company-team-step';
import { CustomerSetupStep } from './customer-setup-step';
import { DeviceSetupStep } from './device-setup-step';
import { MspSetupStep } from './msp-setup-step';
import { OnboardingAccordionItem, type OnboardingStepStatus } from './onboarding-accordion';

/**
 * Tenant "Initial Setup" block on the Dashboard. Step statuses, the "X/Y done"
 * counter and the "Complete Setup" affordance are all driven by
 * `tenantOnboardingProgress` (see the onboarding store). The block sits on the
 * darker page background (`bg-ods-bg`, not the lighter `bg-ods-card`) so it doesn't
 * read as a card.
 */
export function InitialSetupCard() {
  const tenant = useOnboardingStore(state => state.tenant);
  const isLoaded = useOnboardingStore(state => state.isLoaded);
  const { completeTenantStep, completeTenantStepInBackground, completeTenant, isMutating } = useOnboardingMutations();

  // Which step's "Mark as Complete" is currently committing — drives that button's
  // loading spinner. Cleared when the mutation settles (success or error).
  const [completingStep, setCompletingStep] = useState<TenantOnboardingStep | null>(null);
  const completeStep = (step: TenantOnboardingStep) => {
    setCompletingStep(step);
    completeTenantStep(step, () => setCompletingStep(null));
  };

  const completedSteps = tenant?.completedSteps ?? [];
  const total = TENANT_ONBOARDING_STEPS.length;
  const done = countCompleted(TENANT_ONBOARDING_STEPS, completedSteps);
  const allDone = done >= total;

  const statusOf = (step: TenantOnboardingStep): OnboardingStepStatus =>
    isStepDone(step, completedSteps) ? 'completed' : 'active';

  // Render nothing until progress is loaded — no skeleton flash on the dashboard —
  // and hide the whole block once the tenant Initial Setup is complete: it's a
  // one-time setup surface, so there's nothing left to show after `completed`.
  if (!isLoaded || tenant?.completed) {
    return null;
  }

  return (
    <section className="flex w-full flex-col gap-[var(--spacing-system-m)] rounded-md border border-ods-border bg-ods-bg p-[var(--spacing-system-l)]">
      <div className="flex flex-col gap-[var(--spacing-system-s)] md:flex-row md:items-center">
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 className="text-h2 text-ods-text-primary">Initial Setup</h2>
          <p className="text-h6 text-ods-text-secondary">
            {total} steps to complete · {done}/{total} done
          </p>
        </div>
        {allDone && !tenant?.completed && (
          <Button
            variant="accent"
            leftIcon={<CheckCircleIcon className="size-5" />}
            onClick={() => completeTenant()}
            disabled={isMutating}
            loading={isMutating}
            className="w-full md:w-auto"
          >
            Complete Setup
          </Button>
        )}
      </div>

      <div className="flex w-full flex-col overflow-hidden rounded-md border border-ods-border [&>*:last-child]:border-b-0">
        <OnboardingAccordionItem
          icon={<BuildingsIcon size={24} />}
          status={statusOf(TenantOnboardingStep.MSP_SETUP)}
          title="Complete MSP Setup"
          description="Set your company name, upload a logo, and add your website so clients recognize your brand across all touchpoints."
        >
          <MspSetupStep
            completed={isStepDone(TenantOnboardingStep.MSP_SETUP, completedSteps)}
            completing={completingStep === TenantOnboardingStep.MSP_SETUP}
            onComplete={() => completeStep(TenantOnboardingStep.MSP_SETUP)}
          />
        </OnboardingAccordionItem>
        <OnboardingAccordionItem
          icon={<IdCardIcon size={24} />}
          status={statusOf(TenantOnboardingStep.CUSTOMERS_SETUP)}
          title="Customers Setup"
          description="Add your first client - Customer name, service tier, and SLA. Devices need an org to belong to."
        >
          <CustomerSetupStep
            completed={isStepDone(TenantOnboardingStep.CUSTOMERS_SETUP, completedSteps)}
            completing={completingStep === TenantOnboardingStep.CUSTOMERS_SETUP}
            onComplete={() => completeStep(TenantOnboardingStep.CUSTOMERS_SETUP)}
          />
        </OnboardingAccordionItem>
        <OnboardingAccordionItem
          icon={<MonitorIcon size={24} />}
          status={statusOf(TenantOnboardingStep.DEVICE_MANAGEMENT)}
          title="Device Management"
          description="Run one command on a client machine to connect it to OpenFrame and start monitoring."
        >
          <DeviceSetupStep
            completed={isStepDone(TenantOnboardingStep.DEVICE_MANAGEMENT, completedSteps)}
            completing={completingStep === TenantOnboardingStep.DEVICE_MANAGEMENT}
            onComplete={() => completeStep(TenantOnboardingStep.DEVICE_MANAGEMENT)}
            onCompleteBackground={() => completeTenantStepInBackground(TenantOnboardingStep.DEVICE_MANAGEMENT)}
          />
        </OnboardingAccordionItem>
        <OnboardingAccordionItem
          icon={<UsersGroupIcon size={24} />}
          status={statusOf(TenantOnboardingStep.COMPANY_TEAM)}
          title="Company & Team"
          description="Invite your technicians and assign roles so everyone has the right access from day one."
        >
          <CompanyTeamStep
            completed={isStepDone(TenantOnboardingStep.COMPANY_TEAM, completedSteps)}
            completing={completingStep === TenantOnboardingStep.COMPANY_TEAM}
            onComplete={() => completeStep(TenantOnboardingStep.COMPANY_TEAM)}
          />
        </OnboardingAccordionItem>
      </div>
    </section>
  );
}
