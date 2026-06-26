'use client';

import { Skeleton } from '@flamingo-stack/openframe-frontend-core';
import { PenEditIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { SquareAvatar } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { ResponsiveActionButton } from '@/app/components/shared/responsive-action-button';

interface MspOrganizationCardProps {
  name: string;
  website: string;
  logoUrl?: string;
  isLoading?: boolean;
  onEditOrganization: () => void;
}

export function MspOrganizationCard({
  name,
  website,
  logoUrl,
  isLoading,
  onEditOrganization,
}: MspOrganizationCardProps) {
  const displayName = name || 'Your Organization';

  return (
    <div className="flex items-center gap-[var(--spacing-system-m)] p-[var(--spacing-system-m)]">
      <SquareAvatar src={logoUrl} fallback={displayName} size="lg" variant="square" />

      <div className="flex-1 min-w-0 overflow-hidden">
        {isLoading ? (
          <Skeleton className="h-5 w-40 rounded-md" />
        ) : (
          <>
            <p className="text-h4 text-ods-text-primary truncate" title={displayName}>
              {displayName}
            </p>
            {website && (
              <p className="text-h6 text-ods-text-secondary truncate" title={website}>
                {website}
              </p>
            )}
          </>
        )}
      </div>

      <div className="shrink-0 flex items-center gap-3">
        <ResponsiveActionButton
          label="Edit Organization"
          icon={<PenEditIcon className="w-5 h-5 text-ods-text-secondary" />}
          onClick={onEditOrganization}
        />
      </div>
    </div>
  );
}
