'use client';

import { ExternalLinkIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { InfoCell } from '@/app/components/shared/info-cell';
import type { CustomerDetails } from '../../hooks/use-customer-details';

const EMPTY_VALUE = '—';

const displayOrDash = (value: string): string => (value && value !== '-' ? value : EMPTY_VALUE);

interface CustomerDetailsTabProps {
  organization: CustomerDetails;
}

export function CustomerDetailsTab({ organization }: CustomerDetailsTabProps) {
  const hasWebsite = Boolean(organization.website && organization.website !== '-');
  const websiteHref = hasWebsite
    ? organization.website.startsWith('http')
      ? organization.website
      : `https://${organization.website}`
    : undefined;

  return (
    <div className="bg-ods-card border border-ods-border rounded-[6px] flex flex-col">
      <div className="flex gap-4 px-4 h-20 items-center border-b border-ods-border">
        <InfoCell
          value={displayOrDash(organization.website)}
          label="Website"
          icon={<ExternalLinkIcon className="w-6 h-6 text-ods-text-secondary shrink-0" />}
          href={websiteHref}
        />
      </div>
      <div className="flex flex-col md:flex-row md:gap-4 px-4 py-4 md:py-0 md:h-20 md:items-center">
        <InfoCell value={displayOrDash(organization.physicalAddress)} label="Physical Address" />
        <InfoCell value={displayOrDash(organization.mailingAddress)} label="Mailing Address" />
      </div>
    </div>
  );
}
