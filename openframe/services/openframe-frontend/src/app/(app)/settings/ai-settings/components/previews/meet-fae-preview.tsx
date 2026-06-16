'use client';

import { FlamingoLogo } from '@flamingo-stack/openframe-frontend-core/components/icons';
import {
  ClockCheckIcon,
  ExternalLinkIcon,
  SignalBroadcast02Icon,
  WrenchScrewdiverIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { Button, SquareAvatar } from '@flamingo-stack/openframe-frontend-core/components/ui';
import type { ComponentType } from 'react';
import { ChatPreviewLogo } from './chat-preview-logo';

interface MeetFaePreviewProps {
  assistantName: string;
  /** Short name woven into the copy (e.g. "Fae"). */
  shortName?: string;
  avatarUrl?: string;
  accentColor: string;
  mspName?: string;
  mspWebsite?: string;
}

interface FeatureRow {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

export function MeetFaePreview({
  assistantName,
  shortName = 'Fae',
  avatarUrl,
  accentColor,
  mspName = 'TechFlow Solutions',
  mspWebsite = 'www.techflow.com',
}: MeetFaePreviewProps) {
  const features: FeatureRow[] = [
    {
      icon: WrenchScrewdiverIcon,
      title: 'Try to Fix It Instantly',
      description: `${shortName} diagnoses common issues like email problems, password resets, slow performance, or connectivity — and resolves them on the spot.`,
    },
    {
      icon: SignalBroadcast02Icon,
      title: 'Escalate When Needed',
      description: `If the issue needs hands-on attention, ${shortName} automatically creates a detailed support ticket so your technician knows exactly what's going on.`,
    },
    {
      icon: ClockCheckIcon,
      title: '24/7 — No Waiting',
      description:
        'Ask anything, anytime. No hold music, no queue — just immediate help or a fast handoff to the right person.',
    },
  ];

  return (
    <div className="grid h-[250px] w-full place-items-center overflow-hidden rounded-md border border-ods-border bg-ods-bg md:h-[296px] lg:h-[380px]">
      {/* 1:1 content in a 945px slot, zoom-scaled to the per-breakpoint card height. */}
      <div className="flex h-[945px] w-[600px] max-w-none flex-col p-[var(--spacing-system-l)] [zoom:0.264] md:[zoom:0.313] lg:[zoom:0.402]">
        <div className="flex flex-1 flex-col items-center justify-center gap-[var(--spacing-system-l)]">
          <SquareAvatar src={avatarUrl} alt={assistantName} fallback={shortName.charAt(0)} size="xl" variant="round" />

          <p className="max-w-[504px] text-center text-h3 text-ods-text-primary">
            Meet {shortName}, your AI IT assistant. She fixes what she can right away — and hands off the rest to your
            technicians.
          </p>

          <div className="w-full overflow-hidden rounded-md border border-ods-border bg-ods-bg">
            {features.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="flex items-start gap-[var(--spacing-system-m)] border-b border-ods-border bg-ods-card p-[var(--spacing-system-m)] last:border-b-0"
              >
                <span
                  className="flex size-[72px] shrink-0 items-center justify-center rounded-md border border-ods-border bg-ods-bg"
                  style={{ color: accentColor }}
                >
                  <Icon className="size-6" />
                </span>
                <div className="flex min-w-0 flex-col gap-[var(--spacing-system-xxs)]">
                  <span className="text-h3 text-ods-text-primary">{title}</span>
                  <span className="line-clamp-2 text-h6 text-ods-text-secondary">{description}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex w-full items-center gap-[var(--spacing-system-m)] rounded-md border border-ods-border bg-ods-bg p-[var(--spacing-system-m)]">
            <ChatPreviewLogo className="size-12 shrink-0" />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-h3 text-ods-text-primary">Your IT is managed by {mspName}</span>
              <span className="truncate text-h6 text-ods-text-secondary">{mspWebsite}</span>
            </div>
            <Button variant="outline" size="icon" aria-label={`Open ${mspWebsite}`}>
              <ExternalLinkIcon className="size-6" />
            </Button>
          </div>

          <Button type="button" variant="accent" style={{ backgroundColor: accentColor }}>
            Get Started
          </Button>
        </div>

        <div className="flex shrink-0 items-center justify-center gap-[var(--spacing-system-xs)] text-ods-text-secondary">
          <span className="text-h6">Powered by</span>
          <FlamingoLogo className="h-5 w-auto" fill="currentColor" />
          <span className="font-heading text-h6 font-semibold">Flamingo</span>
        </div>
      </div>
    </div>
  );
}
