'use client';

import { DevSectionPage } from '@flamingo-stack/openframe-frontend-core/components';
import { OnboardingGuidesCatalogView } from '@flamingo-stack/openframe-frontend-core/components/onboarding-guides';
import { EP, HELP_CENTER_BASE } from '../endpoints';

export const dynamic = 'force-dynamic';

/**
 * Onboarding catalog — config-only. `<DevSectionPage sectionKey="onboarding">`
 * supplies the page chrome; the lib `<OnboardingGuidesCatalogView>` renders its
 * own RAG search + section pills + the guide grid and self-fetches (reading
 * `?section=` from the URL). Card hrefs flow through the section's
 * `composeContentUrl` (see help-center-runtime-provider) to the in-app detail
 * route; `basePath` is the fallback prefix.
 */
export default function OnboardingGuidesCatalogPage() {
  return (
    <DevSectionPage sectionKey="onboarding" backButton={{ label: 'Back to Help Center', href: HELP_CENTER_BASE }}>
      <OnboardingGuidesCatalogView
        guidesEndpoint={EP.onboarding}
        sectionsEndpoint={EP.onboardingSections}
        basePath={`${HELP_CENTER_BASE}/onboarding-guides`}
      />
    </DevSectionPage>
  );
}
