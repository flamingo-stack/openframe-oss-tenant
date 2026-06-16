'use client';

import { FaqDocumentPage } from '@flamingo-stack/openframe-frontend-core/components/faq';
import { CONTENT_API_BASE, HELP_CENTER_BASE } from '../endpoints';

export const dynamic = 'force-dynamic';

/**
 * FAQs — the page chrome (PageShell + PageLayout + back button) now lives in the
 * lib's `<FaqDocumentPage>` (same as `LegalDocumentPage` / `DevSectionPage`); this
 * route is config-only.
 */
export default function FaqsPage() {
  return (
    <FaqDocumentPage
      title="FAQs"
      subtitle="Quick answers about OpenFrame, the open-source stack, and how we work."
      backButton={{ label: 'Back to Help Center', href: HELP_CENTER_BASE }}
      apiBaseUrl={CONTENT_API_BASE}
    />
  );
}
