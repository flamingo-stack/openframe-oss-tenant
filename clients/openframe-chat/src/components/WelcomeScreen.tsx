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
import { Button, FeatureList } from '@flamingo-stack/openframe-frontend-core/components/ui';
import faeAvatar from '../assets/fae-avatar.png';
import { useAuthenticatedImage } from '../hooks/useAuthenticatedImage';
import { useTenantInfoQuery } from '../hooks/useTenantInfoQuery';
import { getFullImageUrl } from '../utils/image-url';

const ICON_COLOR = 'var(--ods-flamingo-pink-base)';

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

/** Prefix a bare host (e.g. "www.techflow.com") with https so `window.open`
 *  treats it as an absolute URL rather than a path relative to the app. */
function toExternalHref(site: string): string {
  return /^https?:\/\//i.test(site) ? site : `https://${site}`;
}

interface WelcomeScreenProps {
  onGetStarted: () => void;
}

export function WelcomeScreen({ onGetStarted }: WelcomeScreenProps) {
  // Show which organization the user is signing into. Logo bytes sit behind a
  // Bearer-protected endpoint, so resolve them like the assistant avatar.
  const { data: tenantInfo, isLoading } = useTenantInfoQuery({ enabled: true });
  const rawLogoUrl = tenantInfo?.image ? getFullImageUrl(tenantInfo.image.imageUrl, tenantInfo.image.hash) : undefined;
  const { url: orgLogoUrl } = useAuthenticatedImage(rawLogoUrl);
  const orgName = tenantInfo?.name?.trim();
  const orgWebsite = tenantInfo?.website?.trim();

  return (
    <div className="h-screen flex flex-col items-center bg-ods-bg">
      <div className="flex flex-col gap-[var(--spacing-system-lf)] items-center justify-center flex-1 w-full max-w-ods-content-narrow px-[var(--spacing-system-mf)]">
        <img src={faeAvatar} alt="Fae" className="size-16 rounded-full object-cover" />

        <p className="text-h3 text-ods-text-primary text-center max-w-[504px]">
          Meet Fae, your AI IT assistant. She fixes what she can right away — and hands off the rest to your
          technicians.
        </p>

        <FeatureList items={features} className="w-full" />

        {isLoading ? (
          <MspOrganizationCardSkeleton className="w-full" />
        ) : orgName ? (
          <MspOrganizationCard
            name={orgName}
            website={orgWebsite || undefined}
            logoUrl={orgLogoUrl}
            onOpenWebsite={
              orgWebsite ? () => window.open(toExternalHref(orgWebsite), '_blank', 'noopener,noreferrer') : undefined
            }
            className="w-full"
          />
        ) : null}

        <Button variant="accent" size="default" onClick={onGetStarted}>
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
