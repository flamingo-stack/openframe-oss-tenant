'use client';

import { CheckCircleIcon, FastForwardIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { PageLayout } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useRouter } from 'next/navigation';
import { type ComponentType, useEffect, useState } from 'react';
import { ConfirmDialog } from '@/app/components/shared/confirm-dialog';
import { UserOnboardingStep } from '@/generated/schema-enums';
import { useOnboardingMutations } from '@/graphql/onboarding/use-onboarding-mutations';
import { EVENT_SUBTYPE, trackDashboardActivity } from '@/lib/analytics';
import { routes } from '@/lib/routes';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { countCompleted, isStepDone, USER_ONBOARDING_STEPS } from '../onboarding-steps';
import { USER_ONBOARDING_GROUPS } from '../user-onboarding-groups';
import { CustomerSetupStep } from './customer-setup-step';
import { DeviceSetupStep } from './device-setup-step';
import { KnowledgeBaseStep } from './knowledge-base-step';
import { LoggingStep } from './logging-step';
import { MingoStep } from './mingo-step';
import { MonitoringStep } from './monitoring-step';
import { OnboardingAccordionGroup, OnboardingAccordionItem, type OnboardingStepStatus } from './onboarding-accordion';
import { OnboardingSkeleton } from './onboarding-skeleton';
import { ScriptingStep } from './scripting-step';
import { TicketsStep } from './tickets-step';

/**
 * Props every step body accepts — completion status + the commit handlers.
 * - `onComplete`: tracked completion (shows a spinner on "Mark as Complete").
 * - `onCompleteBackground`: fire-and-forget completion for "open"/navigate actions,
 *   with no loading state anywhere (see `completeUserStepInBackground`).
 */
type StepBodyProps = {
  completed?: boolean;
  completing?: boolean;
  onComplete?: () => void;
  onCompleteBackground?: () => void;
};

/**
 * Step → body component. The static presentation (group, icon, title, description)
 * lives in {@link ../user-onboarding-groups}; this maps each step to the interactive
 * form rendered when its row is expanded.
 */
const STEP_BODY: Record<UserOnboardingStep, ComponentType<StepBodyProps>> = {
  [UserOnboardingStep.CUSTOMERS_SETUP]: CustomerSetupStep,
  [UserOnboardingStep.DEVICE_MANAGEMENT]: DeviceSetupStep,
  [UserOnboardingStep.TICKETS]: TicketsStep,
  [UserOnboardingStep.SCRIPTING]: ScriptingStep,
  [UserOnboardingStep.MONITORING]: MonitoringStep,
  [UserOnboardingStep.LOGGING]: LoggingStep,
  [UserOnboardingStep.KNOWLEDGE_MANAGEMENT]: KnowledgeBaseStep,
  [UserOnboardingStep.MEET_MINGO]: MingoStep,
};

/**
 * User "Get Started" onboarding. Step statuses, the header counter and the
 * Skip/Finish actions are driven by `userOnboardingProgress` (via the onboarding
 * store); each step's "Mark as Complete" commits `completeUserOnboardingStep`.
 */
export function OnboardingContent() {
  const router = useRouter();
  const [skipConfirmOpen, setSkipConfirmOpen] = useState(false);
  // Which step's "Mark as Complete" is committing — drives that button's spinner.
  const [completingStep, setCompletingStep] = useState<UserOnboardingStep | null>(null);

  const tenant = useOnboardingStore(state => state.tenant);
  const user = useOnboardingStore(state => state.user);
  const isLoaded = useOnboardingStore(state => state.isLoaded);
  const { completeUserStep, completeUserStepInBackground, completeUser, skipUser, isMutating } =
    useOnboardingMutations();

  const leaveOnboarding = () => router.push(routes.dashboard);

  // The personal Get Started tour is only available after the tenant Initial Setup
  // is complete. If the user lands here (deep link, stale tab) beforehand, send them
  // back to the dashboard where the Initial Setup card lives.
  const initialSetupComplete = tenant?.completed ?? false;
  useEffect(() => {
    if (isLoaded && !initialSetupComplete) {
      router.replace(routes.dashboard);
    }
  }, [isLoaded, initialSetupComplete, router]);

  if (!isLoaded || !initialSetupComplete) {
    return <OnboardingSkeleton />;
  }

  const completedSteps = user?.completedSteps ?? [];
  const total = USER_ONBOARDING_STEPS.length;
  const done = countCompleted(USER_ONBOARDING_STEPS, completedSteps);
  const allDone = done >= total;

  const statusOf = (step: UserOnboardingStep): OnboardingStepStatus =>
    isStepDone(step, completedSteps) ? 'completed' : 'active';
  const doneOf = (step: UserOnboardingStep) => isStepDone(step, completedSteps);
  const completeOf = (step: UserOnboardingStep) => () => {
    setCompletingStep(step);
    completeUserStep(step, () => setCompletingStep(null));
  };
  const completingOf = (step: UserOnboardingStep) => completingStep === step;
  // Fire-and-forget completion for "open"/navigate primary actions — no loading anywhere.
  const completeBackgroundOf = (step: UserOnboardingStep) => () => completeUserStepInBackground(step);

  // A single header action, per design: once every step is done it becomes the accent
  // "Complete Onboarding" finisher; until then it's just "Skip Onboarding" (no Finish
  // alongside it — one button only).
  const actions =
    allDone && !user?.completed
      ? [
          {
            label: 'Complete Onboarding',
            variant: 'accent' as const,
            icon: <CheckCircleIcon className="size-5" />,
            disabled: isMutating,
            loading: isMutating,
            onClick: () => completeUser(leaveOnboarding),
          },
        ]
      : [
          {
            label: 'Skip Onboarding',
            variant: 'outline' as const,
            icon: <FastForwardIcon className="size-5" />,
            disabled: isMutating,
            onClick: () => setSkipConfirmOpen(true),
          },
        ];

  return (
    <PageLayout
      title="Get Started"
      subtitle={`${total} steps to complete · ${done}/${total} done`}
      actions={actions}
      actionsVariant="icon-buttons"
      className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]"
      contentClassName="flex flex-col gap-[var(--spacing-system-l)]"
    >
      {USER_ONBOARDING_GROUPS.map(group => (
        <OnboardingAccordionGroup key={group.label} label={group.label}>
          {group.items.map(item => {
            const StepBody = STEP_BODY[item.step];
            return (
              <OnboardingAccordionItem
                key={item.step}
                icon={item.icon}
                status={statusOf(item.step)}
                title={item.title}
                description={item.description}
              >
                <StepBody
                  completed={doneOf(item.step)}
                  completing={completingOf(item.step)}
                  onComplete={completeOf(item.step)}
                  onCompleteBackground={completeBackgroundOf(item.step)}
                />
              </OnboardingAccordionItem>
            );
          })}
        </OnboardingAccordionGroup>
      ))}

      <ConfirmDialog
        open={skipConfirmOpen}
        onOpenChange={setSkipConfirmOpen}
        title="Skip onboarding"
        description="You can finish setup later from Settings."
        confirmLabel="Skip Onboarding"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={() => {
          trackDashboardActivity(EVENT_SUBTYPE.SKIP_ONBOARDING);
          skipUser(leaveOnboarding);
        }}
      />
    </PageLayout>
  );
}
