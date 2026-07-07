import {
  MspOrganizationCard,
  MspOrganizationCardSkeleton,
} from '@flamingo-stack/openframe-frontend-core/components/chat';
import { FlamingoLogo } from '@flamingo-stack/openframe-frontend-core/components/icons';
import {
  BrainAIIcon,
  ClockCheckIcon,
  WrenchScrewdiverIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { Button, FeatureList, Skeleton } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { getReadableTextColor } from '@flamingo-stack/openframe-frontend-core/utils';
import { useAssistantBranding } from '../hooks/useAssistantBranding';
import { useChatConfig } from '../hooks/useChatConfig';
import { useMspOrganization } from '../hooks/useMspOrganization';

const ICON_COLOR = 'var(--ods-flamingo-pink-base)';

// ODS default accent (flamingo app-type), used when AiSettings has no override.
const DEFAULT_ACCENT_COLOR = '#f357bb';

const features = [
  {
    icon: <WrenchScrewdiverIcon size={24} color={ICON_COLOR} />,
    title: 'Try to Fix It Instantly',
    description:
      'Fae diagnoses common issues like email problems, password resets, slow performance, or connectivity — and resolves them on the spot.',
  },
  {
    icon: <BrainAIIcon size={24} color={ICON_COLOR} />,
    title: 'Escalate When Needed',
    description:
      "If the issue needs hands-on attention, Fae automatically creates a detailed support ticket so your technician knows exactly what's going on.",
  },
  {
    icon: <ClockCheckIcon size={24} color={ICON_COLOR} />,
    title: '24/7 — No Waiting',
    description:
      'Ask anything, anytime. No hold music, no queue — just immediate help or a fast handoff to the right person.',
  },
];

interface WelcomeScreenProps {
  onGetStarted: () => void;
}

export function WelcomeScreen({ onGetStarted }: WelcomeScreenProps) {
  // Legible label color for the "Get Started" button on any accent.
  const { aiSettings } = useChatConfig();
  const getStartedTextColor = getReadableTextColor(aiSettings?.accentColor || DEFAULT_ACCENT_COLOR);

  // Assistant identity (name + avatar) from AiSettings. Both are undefined while
  // settings resolve, so gate the hero on `isBrandingLoading` to avoid a blank
  // name and a broken avatar on cold start.
  const { assistantName, assistantAvatar, isLoading: isBrandingLoading } = useAssistantBranding();

  // Show which organization the user is signing into.
  const { name: orgName, website: orgWebsite, logoUrl: orgLogoUrl, isLoading, openWebsite } = useMspOrganization();

  return (
    <div className="h-screen flex flex-col items-center bg-ods-bg">
      <div className="flex flex-col gap-[var(--spacing-system-lf)] items-center justify-center flex-1 w-full max-w-ods-content-narrow px-[var(--spacing-system-mf)]">
        {isBrandingLoading ? (
          <>
            <Skeleton className="size-16 rounded-full" />
            <div className="flex w-full max-w-[504px] flex-col items-center gap-[var(--spacing-system-xs)]">
              <Skeleton className="h-5 w-full rounded-md" />
              <Skeleton className="h-5 w-3/4 rounded-md" />
            </div>
          </>
        ) : (
          <>
            <img src={assistantAvatar} alt={assistantName} className="size-16 rounded-full object-cover" />

            <p className="text-h3 text-ods-text-primary text-center max-w-[504px]">
              Meet {assistantName}, your AI IT assistant. Fixes what it can right away, and hands off the rest to your
              technicians.
            </p>
          </>
        )}

        <FeatureList items={features} className="w-full" />

        {isLoading ? (
          <MspOrganizationCardSkeleton className="w-full" />
        ) : orgName ? (
          <MspOrganizationCard
            name={orgName}
            website={orgWebsite}
            logoUrl={orgLogoUrl}
            onOpenWebsite={openWebsite}
            className="w-full"
          />
        ) : null}

        <Button variant="accent" size="default" onClick={onGetStarted} style={{ color: getStartedTextColor }}>
          Get Started
        </Button>
      </div>

      <div className="flex gap-[var(--spacing-system-xsf)] items-center justify-center pb-[var(--spacing-system-lf)]">
        <span className="text-h6 text-ods-text-secondary normal-case tracking-normal">Powered by</span>
        <FlamingoLogo className="h-5 w-5" fill="var(--color-text-secondary)" />
        <span className="font-heading text-sm text-ods-text-secondary">Flamingo</span>
      </div>
    </div>
  );
}
