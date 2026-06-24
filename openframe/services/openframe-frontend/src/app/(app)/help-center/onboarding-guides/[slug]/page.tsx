'use client';

import { OnboardingGuideDetailView } from '@flamingo-stack/openframe-frontend-core/components/onboarding-guides';
import { useParams } from 'next/navigation';
import { EP, HELP_CENTER_BASE } from '../../endpoints';

export const dynamic = 'force-dynamic';

/**
 * Onboarding guide detail — config-only. The lib view self-fetches the guide
 * from `EP.onboardingBySlug`; this page supplies only the route slug + base path.
 */
export default function OnboardingGuideDetailRoute() {
  const { slug = '' } = useParams<{ slug: string }>();
  return (
    <OnboardingGuideDetailView
      shell={false}
      slug={slug}
      guideEndpoint={EP.onboardingBySlug}
      basePath={`${HELP_CENTER_BASE}/onboarding-guides`}
    />
  );
}
