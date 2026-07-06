'use client';

import { ProductReleasesListPage } from '@flamingo-stack/openframe-frontend-core/components/help-center-pages';
import { EP, HELP_CENTER_BASE } from '../endpoints';

/**
 * Releases LIST — one-line mount of the lib's ready-made `<ProductReleasesListPage>`.
 * Card → detail navigation flows through the section's `composeContentUrl`
 * (product_release is a hosted type) into the in-app `/help-center/releases/<slug>`
 * route; `basePath` is the fallback prefix.
 */
export default function ReleasesRoute() {
  return (
    <ProductReleasesListPage
      shell={false}
      releasesEndpoint={EP.productReleases}
      basePath={`${HELP_CENTER_BASE}/releases`}
      backButton={{ label: 'Back to Help Center', href: HELP_CENTER_BASE }}
    />
  );
}
