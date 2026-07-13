'use client';

import { OnboardingGuidesCatalogPage } from '@flamingo-stack/openframe-frontend-core/components/help-center-pages';
import { EP, HELP_CENTER_BASE } from '../endpoints';

/**
 * Onboarding catalog — one-line mount of the lib's ready-made
 * `<OnboardingGuidesCatalogPage>` (chrome + the self-fetching catalog view with
 * its own RAG search + section pills). Card hrefs flow through the section's
 * `composeContentUrl` (see help-center-runtime-provider) to the in-app detail
 * route; `basePath` is the fallback prefix.
 */
export default function OnboardingGuidesCatalogRoute() {
  return (
    <OnboardingGuidesCatalogPage
      shell={false}
      guidesEndpoint={EP.onboarding}
      sectionsEndpoint={EP.onboardingSections}
      basePath={`${HELP_CENTER_BASE}/onboarding-guides`}
      backButton={{ label: 'Back to Help Center', href: HELP_CENTER_BASE }}
    />
  );
}
