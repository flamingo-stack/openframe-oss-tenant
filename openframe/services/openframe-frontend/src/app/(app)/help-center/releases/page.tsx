'use client';

import { DevSectionPage, ProductReleasesView } from '@flamingo-stack/openframe-frontend-core/components';
import { EP, HELP_CENTER_BASE } from '../endpoints';

export const dynamic = 'force-dynamic';

/**
 * Releases LIST — config-only. `<DevSectionPage sectionKey="releases">` supplies
 * the chrome; `<ProductReleasesView>` reads the search/status/page URL params,
 * fetches, paginates, and renders. Card → detail navigation flows through the
 * section's `composeContentUrl` (product_release is a hosted type) into the
 * in-app `/help-center/releases/<slug>` route.
 */
export default function ReleasesPage() {
  return (
    <DevSectionPage sectionKey="releases" backButton={{ label: 'Back to Help Center', href: HELP_CENTER_BASE }}>
      <ProductReleasesView endpoint={EP.productReleases} />
    </DevSectionPage>
  );
}
