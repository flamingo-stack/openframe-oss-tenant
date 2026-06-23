'use client';

import { FaqSection } from '@flamingo-stack/openframe-frontend-core/components/faq';
import { PageHeading, PageLayout, PageShell } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { HelpCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { CONTENT_API_BASE, HELP_CENTER_BASE } from '../endpoints';

export const dynamic = 'force-dynamic';

/** Hero icon sizing — same token the lib's `DevSectionPage` hero uses. */
const SECTION_HERO_ICON_CLASS = 'h-10 w-10 text-ods-accent';

/**
 * FAQs — composed in the host (NOT via the lib's `FaqDocumentPage`) so the header
 * matches the multi-platform hub's `/faqs`: `PageShell` → `PageLayout` (back button
 * only) → a `PageHeading` hero with a leading icon + accent dot → the bare
 * `<FaqSection heading={null}>`. This is the SAME composition the hub's
 * `PageWithHeader` produces; `FaqDocumentPage` routes its title through the frozen
 * `PageLayout`/`TitleBlock` (text-h2, no icon, no accent dot), which is the look we
 * are intentionally moving away from here to align with the hub + the sibling
 * `DevSectionPage` / `LegalDocumentPage` heroes.
 */
export default function FaqsPage() {
  const router = useRouter();

  return (
    <PageShell>
      <PageLayout backButton={{ label: 'Back to Help Center', onClick: () => router.push(HELP_CENTER_BASE) }}>
        <div className="flex flex-col gap-4">
          <PageHeading className="flex items-center gap-3">
            <HelpCircle className={SECTION_HERO_ICON_CLASS} />
            <span>
              Frequently Asked Questions
              <span className="text-ods-accent">.</span>
            </span>
          </PageHeading>
          <p className="font-['DM_Sans'] font-medium text-[18px] leading-[28px] text-ods-text-secondary max-w-3xl">
            Answers to the most common questions about OpenFrame.
          </p>
        </div>

        <FaqSection heading={null} apiBaseUrl={CONTENT_API_BASE} />
      </PageLayout>
    </PageShell>
  );
}
