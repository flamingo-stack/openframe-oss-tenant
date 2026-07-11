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
import type { ReactNode } from 'react';
import { UserOnboardingStep } from '@/generated/schema-enums';

/**
 * Static presentation metadata for the user "Get Started" onboarding steps —
 * everything that is known WITHOUT the backend: the group a step belongs to, its
 * icon, title and description. Only a step's completion status comes from the
 * request.
 *
 * Single source of truth shared by {@link ./components/onboarding-content} (the
 * live page) and {@link ./components/onboarding-skeleton} (the loading state), so
 * the two never drift and the skeleton can show every static label.
 */
export interface UserStepMeta {
  step: UserOnboardingStep;
  icon: ReactNode;
  title: string;
  description: string;
}

export interface UserGroupMeta {
  label: string;
  items: UserStepMeta[];
}

export const USER_ONBOARDING_GROUPS: UserGroupMeta[] = [
  {
    label: 'Get set up',
    items: [
      {
        step: UserOnboardingStep.CUSTOMERS_SETUP,
        icon: <IdCardIcon size={24} />,
        title: 'Customers Setup',
        description: 'Add your first client - Customer name, service tier, and SLA. Devices need an org to belong to.',
      },
      {
        step: UserOnboardingStep.DEVICE_MANAGEMENT,
        icon: <MonitorIcon size={24} />,
        title: 'Device Management',
        description: 'Deploy one command to connect a machine, then monitor and control it from OpenFrame.',
      },
    ],
  },
  {
    label: 'Run your operations',
    items: [
      {
        step: UserOnboardingStep.TICKETS,
        icon: <TagIcon size={24} />,
        title: 'Tickets',
        description:
          'Every client chat is a ticket. AI Assistant resolves them automatically - or your team steps in when needed.',
      },
      {
        step: UserOnboardingStep.SCRIPTING,
        icon: <BracketCurlyIcon size={24} />,
        title: 'Scripting',
        description: 'Automate routine tasks with scripts you run across devices on demand or on schedule.',
      },
      {
        step: UserOnboardingStep.MONITORING,
        icon: <RadarIcon size={24} />,
        title: 'Monitoring',
        description: 'Track device health, alerts, and performance across every client in real time.',
      },
      {
        step: UserOnboardingStep.LOGGING,
        icon: <ClipboardListIcon size={24} />,
        title: 'Logging',
        description: 'See a full activity trail of what happened, when, and who did it.',
      },
    ],
  },
  {
    label: 'Work smarter with AI',
    items: [
      {
        step: UserOnboardingStep.KNOWLEDGE_MANAGEMENT,
        icon: <BookBookmarkIcon size={24} />,
        title: 'Knowledge Management',
        description: 'Build a knowledge base your AI agents use to answer clients and resolve tickets.',
      },
      {
        step: UserOnboardingStep.MEET_MINGO,
        icon: (
          <MingoIcon
            className="size-6"
            color="var(--color-text-secondary)"
            eyesColor="var(--ods-flamingo-cyan-base)"
            cornerColor="var(--ods-flamingo-cyan-base)"
          />
        ),
        title: 'Meet Mingo',
        description: 'Your AI co-pilot for the OpenFrame workspace. Ask questions, get summaries, or delegate tasks.',
      },
    ],
  },
];
