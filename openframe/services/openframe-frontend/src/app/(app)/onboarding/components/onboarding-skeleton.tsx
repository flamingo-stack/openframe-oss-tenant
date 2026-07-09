'use client';

import { FastForwardIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { PageLayout } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { USER_ONBOARDING_STEPS } from '../onboarding-steps';
import { USER_ONBOARDING_GROUPS } from '../user-onboarding-groups';
import { OnboardingAccordionGroup, OnboardingAccordionItem } from './onboarding-accordion';

/**
 * Loading skeleton for the onboarding page. Renders the REAL {@link ./onboarding-content}
 * chrome from the shared, static metadata ({@link ../user-onboarding-groups}): the
 * `PageLayout` header and every accordion group/row — real icons, titles, descriptions
 * and the step count — with only the per-step completion status (the trailing control)
 * shown as a placeholder (`OnboardingAccordionItem loading`). Because it reuses the same
 * components and data, there is no layout to keep in sync and nothing shifts when the
 * real content mounts.
 *
 * Used both as the `<Suspense>` fallback in {@link ../page} and as the pre-load state
 * inside `OnboardingContent`. Rows render with `loading`, so their bodies are NOT mounted
 * and the always-mounted `DeviceSetupStep` (a `useSuspenseQuery`) never suspends here.
 */
export function OnboardingSkeleton() {
  const total = USER_ONBOARDING_STEPS.length;

  return (
    <PageLayout
      title="Get Started"
      subtitle={`${total} steps to complete`}
      actions={[
        { label: 'Skip Onboarding', variant: 'outline', icon: <FastForwardIcon className="size-5" />, disabled: true },
      ]}
      actionsVariant="icon-buttons"
      className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]"
      contentClassName="flex flex-col gap-[var(--spacing-system-l)]"
    >
      {USER_ONBOARDING_GROUPS.map(group => (
        <OnboardingAccordionGroup key={group.label} label={group.label}>
          {group.items.map(item => (
            <OnboardingAccordionItem
              key={item.step}
              icon={item.icon}
              title={item.title}
              description={item.description}
              loading
            />
          ))}
        </OnboardingAccordionGroup>
      ))}
    </PageLayout>
  );
}
