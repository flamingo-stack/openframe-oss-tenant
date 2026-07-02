'use client';

import {
  MspOrganizationCard,
  MspOrganizationCardSkeleton,
} from '@flamingo-stack/openframe-frontend-core/components/chat';
import { FlamingoLogo } from '@flamingo-stack/openframe-frontend-core/components/icons';
import {
  ClockCheckIcon,
  SignalBroadcast02Icon,
  WrenchScrewdiverIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { Button, SquareAvatar } from '@flamingo-stack/openframe-frontend-core/components/ui';
import type { ComponentType } from 'react';
import { getFullImageUrl } from '@/lib/image-url';
import { useTenantInfo } from '../../../hooks/use-tenant-info';

interface MeetFaePreviewProps {
  /** Assistant name woven into the copy and avatar — updates live as the user types. */
  assistantName: string;
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
  avatarUrl,
  accentColor,
  mspName = 'TechFlow Solutions',
  mspWebsite = 'www.techflow.com',
}: MeetFaePreviewProps) {
  // Source the MSP org from the same tenant-info query the /settings card uses
  // (react-query-cached, so no extra request). Fall back to the sample copy/logo
  // so the preview still reads well before any org data is configured.
  const { data: tenantInfo, isLoading } = useTenantInfo();
  const orgName = tenantInfo?.name || mspName;
  const orgWebsite = tenantInfo?.website || mspWebsite;
  const orgLogoUrl =
    getFullImageUrl(tenantInfo?.image?.imageUrl, tenantInfo?.image?.hash) ??
    '/assets/ai-settings/chat-preview-logo.svg';

  const features: FeatureRow[] = [
    {
      icon: WrenchScrewdiverIcon,
      title: 'Try to Fix It Instantly',
      description: `${assistantName} diagnoses common issues like email problems, password resets, slow performance, or connectivity — and resolves them on the spot.`,
    },
    {
      icon: SignalBroadcast02Icon,
      title: 'Escalate When Needed',
      description: `If the issue needs hands-on attention, ${assistantName} automatically creates a detailed support ticket so your technician knows exactly what's going on.`,
    },
    {
      icon: ClockCheckIcon,
      title: '24/7 — No Waiting',
      description:
        'Ask anything, anytime. No hold music, no queue — just immediate help or a fast handoff to the right person.',
    },
  ];

  return (
    <div className="grid h-[250px] w-full place-items-center overflow-hidden rounded-md border border-ods-border bg-ods-bg md:h-[296px] lg:h-[380px] [--preview-scale:0.264] md:[--preview-scale:0.313] lg:[--preview-scale:0.402]">
      {/* 1:1 content in a 945px slot, transform-scaled (not zoom) to the per-breakpoint card
          height. zoom mis-renders text in Safari, so we scale via transform instead; the
          wrapper reserves the post-scale footprint so the card still centers the content. */}
      <div style={{ width: 'calc(600px * var(--preview-scale))', height: 'calc(945px * var(--preview-scale))' }}>
        <div
          className="flex h-[945px] w-[600px] max-w-none origin-top-left flex-col p-[var(--spacing-system-l)]"
          style={{ transform: 'scale(var(--preview-scale))' }}
        >
          <div className="flex flex-1 flex-col items-center justify-center gap-[var(--spacing-system-l)]">
            {/* Match the ChatHeader avatar, which fills its background with the
              accent (lib uses `bg-ods-flamingo-pink` = the re-pointed accent),
              so transparent areas of the avatar show the accent, not bg-ods-bg. */}
            <SquareAvatar
              src={avatarUrl}
              alt={assistantName}
              fallback={assistantName.charAt(0)}
              size="xl"
              variant="round"
              style={{ backgroundColor: accentColor }}
            />

            <p className="max-w-[504px] text-center text-h3 text-ods-text-primary">
              Meet {assistantName}, your AI IT assistant. She fixes what she can right away — and hands off the rest to
              your technicians.
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

            {isLoading ? (
              <MspOrganizationCardSkeleton className="w-full" />
            ) : (
              <MspOrganizationCard
                name={orgName}
                website={orgWebsite}
                logoUrl={orgLogoUrl}
                onOpenWebsite={() => undefined}
                className="w-full"
              />
            )}

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
    </div>
  );
}
