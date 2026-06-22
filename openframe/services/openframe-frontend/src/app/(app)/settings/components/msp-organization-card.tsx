'use client';

import { Button } from '@flamingo-stack/openframe-frontend-core';
import { PenEditIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { SquareAvatar } from '@flamingo-stack/openframe-frontend-core/components/ui';
import type { OrganizationProfile } from './edit-organization-modal';

interface MspOrganizationCardProps {
  organization: OrganizationProfile;
  onEditOrganization: () => void;
}

export function MspOrganizationCard({ organization, onEditOrganization }: MspOrganizationCardProps) {
  const displayName = organization.name || 'Your Organization';

  return (
    <div className="flex items-center gap-[var(--spacing-system-m)] p-[var(--spacing-system-m)]">
      <SquareAvatar src={organization.logoUrl} fallback={displayName} size="lg" variant="square" />

      <div className="flex-1 min-w-0 overflow-hidden">
        <p className="text-h4 text-ods-text-primary truncate" title={displayName}>
          {displayName}
        </p>
        {organization.website && (
          <p className="text-h6 text-ods-text-secondary truncate" title={organization.website}>
            {organization.website}
          </p>
        )}
      </div>

      <div className="shrink-0 flex items-center gap-3">
        <Button
          variant="outline"
          onClick={onEditOrganization}
          leftIcon={<PenEditIcon className="w-5 h-5 text-ods-text-secondary" />}
        >
          Edit Organization
        </Button>
      </div>
    </div>
  );
}
