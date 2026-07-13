'use client';

import { LegalDocumentPage } from '@flamingo-stack/openframe-frontend-core/components';
import { useParams } from 'next/navigation';
import { EP, HELP_CENTER_BASE } from '../../endpoints';

// LegalDocumentPage is one parameterized surface (it replaced the hub's separate
// Privacy/Terms pages), so the host supplies the per-doc copy strings.
const COPY: Record<
  string,
  {
    title: string;
    fallbackDescription: string;
    contactEmail: string;
    errorContactPrompt: string;
    errorTitle: string;
    emptyStateMessage: string;
  }
> = {
  privacy: {
    title: 'Privacy Policy',
    fallbackDescription: 'Our privacy policy and data protection practices.',
    contactEmail: 'privacy@openframe.io',
    errorContactPrompt: 'For privacy-related questions, please contact:',
    errorTitle: 'Unable to load privacy policy',
    emptyStateMessage: 'Privacy policy content is not available at this time.',
  },
  terms: {
    title: 'Terms of Service',
    fallbackDescription: 'The terms governing your use of OpenFrame.',
    contactEmail: 'legal@openframe.io',
    errorContactPrompt: 'For terms-related questions, please contact:',
    errorTitle: 'Unable to load terms of service',
    emptyStateMessage: 'Terms of service content is not available at this time.',
  },
};

export function LegalPageClient() {
  const { docType = 'privacy' } = useParams<{ docType: string }>();
  const copy = COPY[docType] ?? COPY.privacy;
  return (
    <LegalDocumentPage
      shell={false}
      docType={docType}
      apiEndpoint={EP.legal(docType)}
      backButton={{ label: 'Back to Help Center', href: HELP_CENTER_BASE }}
      {...copy}
    />
  );
}
